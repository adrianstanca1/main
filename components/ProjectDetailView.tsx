import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Role, Permission, TodoStatus, SubTask, Comment, ProjectAssignment, ProjectRole } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { queueAction } from '../hooks/useOfflineSync';
import { MapView, MapMarker } from './MapView';

// --- Task Detail Modal (re-used from Dashboard) ---
const TaskDetailModal: React.FC<{
    task: Todo;
    user: User;
    projectName: string;
    personnel: User[];
    onClose: () => void;
    onAddComment: (todoId: number | string, text: string) => void;
    onUpdateTask: (todoId: number | string, updates: Partial<Todo>) => void;
    onReminderUpdate: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ task, user, projectName, personnel, onClose, onAddComment, onUpdateTask, onReminderUpdate, addToast }) => {
    // This modal is a simplified version for project context. A real app might share this component.
    const [newComment, setNewComment] = useState('');
    const userMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        onAddComment(task.id, newComment);
        setNewComment('');
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold">{task.text}</h3>
                <p className="text-sm text-slate-500 mb-4">in project: {projectName}</p>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Comments</h4>
                        <div className="space-y-3">
                            {task.comments?.map(comment => (
                                <div key={comment.id} className="flex flex-col items-start">
                                    <div className="flex items-center gap-2 text-sm mb-1">
                                        <span className="font-semibold">{userMap.get(comment.creatorId)?.name || '...'}</span>
                                        <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="bg-slate-100 p-2 rounded-lg text-slate-800">{comment.text}</p>
                                </div>
                            ))}
                             {(!task.comments || task.comments.length === 0) && <p className="text-sm text-slate-400">No comments yet.</p>}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleCommentSubmit} className="mt-4 pt-4 border-t flex gap-2">
                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="w-full p-2 border rounded-md" />
                    <Button type="submit" disabled={!newComment.trim()}>Send</Button>
                </form>
            </Card>
        </div>
    );
};

// --- Main Project Detail View ---
interface ProjectDetailViewProps {
  project: Project;
  user: User;
  onBack: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
  onStartChat: (user: User) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, user, onBack, addToast, isOnline, onStartChat }) => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);

    const fetchData = useCallback(async () => {
        try {
            const [projectTodos, companyUsers, projectAssignments] = await Promise.all([
                api.getTodosByProject(project.id),
                api.getUsersByCompany(user.companyId),
                api.getProjectAssignmentsByCompany(user.companyId),
            ]);
            setTodos(projectTodos);
            setPersonnel(companyUsers);
            setAssignments(projectAssignments.filter(a => a.projectId === project.id));
        } catch (error) {
            addToast('Failed to load project details.', 'error');
        } finally {
            setLoading(false);
        }
    }, [project.id, user.companyId, addToast]);
    
    useEffect(() => {
        setLoading(true);
        fetchData();
        window.addEventListener('datachanged', fetchData);
        return () => window.removeEventListener('datachanged', fetchData);
    }, [fetchData]);

    const handleUpdateTaskStatus = async (todoId: number | string, newStatus: TodoStatus) => {
        const originalTodos = [...todos];
        const updatedTodos = todos.map(t => t.id === todoId ? { ...t, status: newStatus } : t);
        setTodos(updatedTodos);

        if (isOnline) {
            try {
                await api.updateTodo(todoId, { status: newStatus }, user.id);
            } catch (error) {
                addToast('Failed to update task status.', 'error');
                setTodos(originalTodos); // Revert on failure
            }
        } else {
            addToast('Task update queued offline.', 'success');
            const task = todos.find(t => t.id === todoId);
            if(task) {
                 queueAction({
                    type: 'UPDATE_TODO',
                    payload: { id: todoId, updates: { status: newStatus }, actorId: user.id },
                    projectId: task.projectId
                });
            }
        }
    };
    
    const onAddTask = async (taskData: { text: string; priority: any; status: TodoStatus; }) => {
        const fullTaskData = {
            ...taskData,
            projectId: project.id,
            creatorId: user.id,
        };
        const newTodo = await api.addTodo(fullTaskData, user.id);
        setTodos(prev => [newTodo, ...prev]);
        addToast("Task added successfully!", "success");
    }

     const handleUpdateTask = async (todoId: number | string, updates: Partial<Todo>) => {
        const originalTodos = allTodos;
        const updatedTask = { ...allTodos.find(t => t.id === todoId)!, ...updates };
        setTodos(prev => prev.map(t => (t.id === todoId ? updatedTask : t)));
        if (selectedTask?.id === todoId) {
            setSelectedTask(updatedTask);
        }
        
        if (isOnline) {
            try {
                await api.updateTodo(todoId, updates, user.id);
                addToast('Task updated.', 'success');
                await fetchData();
            } catch (error) {
                setTodos(originalTodos); 
                addToast('Failed to update task.', 'error');
            }
        } else {
             queueAction({
                type: 'UPDATE_TODO',
                payload: { id: todoId, updates, actorId: user.id },
                projectId: updatedTask.projectId,
            });
            addToast('Task update queued.', 'success');
        }
    };
    
    const handleAddComment = async (todoId: number | string, text: string) => {
        const optimisticComment: Comment = {
            id: `offline_comment_${Date.now()}`,
            creatorId: user.id,
            text,
            createdAt: new Date(),
            isOffline: !isOnline,
        };

        setTodos(prevTodos => prevTodos.map(t => {
            if (t.id === todoId) {
                return { ...t, comments: [...(t.comments || []), optimisticComment] };
            }
            return t;
        }));
        if(selectedTask?.id === todoId) {
             setSelectedTask(prev => prev ? { ...prev, comments: [...(prev.comments || []), optimisticComment] } : null);
        }

        if (isOnline) {
            await api.addComment(todoId, text, user.id);
            await fetchData();
        } else {
             queueAction({
                type: 'ADD_COMMENT',
                payload: { todoId, text, creatorId: user.id },
                projectId: project.id,
            });
        }
    };

    const projectTeam = useMemo(() => {
        return assignments.map(a => {
            const member = personnel.find(p => p.id === a.userId);
            return member ? { ...member, projectRole: a.projectRole } : null;
        }).filter(Boolean) as (User & { projectRole: ProjectRole })[];
    }, [assignments, personnel]);

    const mapMarkers: MapMarker[] = useMemo(() => ([{
        lat: project.location.lat,
        lng: project.location.lng,
        radius: project.geofenceRadius,
        popupContent: project.name,
    }]), [project]);
    
    const allTodos = todos; // For Kanban board context

    if (loading) return <Card>Loading project details...</Card>;

    return (
        <div className="space-y-6">
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    user={user} 
                    projectName={project.name} 
                    personnel={personnel}
                    onClose={() => setSelectedTask(null)}
                    onAddComment={handleAddComment}
                    onUpdateTask={handleUpdateTask}
                    onReminderUpdate={fetchData}
                    addToast={addToast}
                />
            )}
            <Button onClick={onBack} variant="secondary">&larr; Back to All Projects</Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <h2 className="text-3xl font-bold text-slate-800">{project.name}</h2>
                        <p className="text-slate-500">{project.location.address}</p>
                    </Card>
                </div>
                <Card>
                    <h3 className="font-semibold mb-2">Project Team</h3>
                    <div className="space-y-2">
                        {projectTeam.map(member => (
                            <div key={member.id} className="flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-xs text-slate-500">{member.projectRole}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => onStartChat(member)}>Chat</Button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <Card>
                <MapView markers={mapMarkers} height="h-64" />
            </Card>

            <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Task Board</h3>
                <KanbanBoard
                    todos={todos}
                    allTodos={allTodos}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onSelectTask={setSelectedTask}
                    onAddTask={onAddTask}
                    canManageTasks={canManageTasks}
                    user={user}
                    addToast={addToast}
                    onReminderUpdate={fetchData}
                    personnel={personnel}
                />
            </div>
        </div>
    );
};
