import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Role, Permission, TodoStatus, TodoPriority, Document, SafetyIncident, Equipment } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { hasPermission } from '../services/auth';
import { MapView, MapMarker } from './MapView';
import { queueAction } from '../hooks/useOfflineSync';

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
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);

    const canManageTasks = useMemo(() => hasPermission(user, Permission.MANAGE_TASKS), [user]);
    
    const fetchData = useCallback(async () => {
        try {
            const [todosData, assignmentsData] = await Promise.all([
                api.getTodosByProject(project.id),
                api.getProjectAssignmentsByCompany(project.companyId) // simplified
            ]);

            const projectAssignments = assignmentsData.filter(a => a.projectId === project.id);
            const userIds = projectAssignments.map(a => a.userId);
            const allCompanyUsers = await api.getUsersByCompany(project.companyId);
            const projectUsers = allCompanyUsers.filter(u => userIds.includes(u.id));

            setTodos(todosData.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
            setPersonnel(projectUsers);
        } catch (error) {
            addToast("Failed to load project details.", "error");
        } finally {
            setLoading(false);
        }
    }, [project.id, project.companyId, addToast]);

    useEffect(() => {
        setLoading(true);
        fetchData();
        
        const handleDataChange = () => fetchData();
        window.addEventListener('datachanged', handleDataChange);
        return () => window.removeEventListener('datachanged', handleDataChange);
    }, [fetchData]);

    const handleUpdateTaskStatus = async (todoId: number | string, newStatus: TodoStatus) => {
        const originalTodos = [...todos];
        const updatedTodos = todos.map(t => t.id === todoId ? { ...t, status: newStatus } : t);
        setTodos(updatedTodos);
        
        if (isOnline) {
            try {
                await api.updateTodo(todoId, { status: newStatus }, user.id);
                addToast('Task status updated.', 'success');
            } catch (error) {
                setTodos(originalTodos);
                addToast('Failed to update task status.', 'error');
            }
        } else {
            const task = updatedTodos.find(t => t.id === todoId);
            if (task) {
                queueAction({
                    type: 'UPDATE_TODO',
                    payload: { id: todoId, updates: { status: newStatus }, actorId: user.id },
                    projectId: task.projectId
                });
                addToast('Task update queued.', 'success');
            }
        }
    };
    
    const handleAddTask = async (taskData: { text: string; priority: TodoPriority; status: TodoStatus }) => {
        const fullTaskData = {
            ...taskData,
            projectId: project.id,
            creatorId: user.id,
        };
        
        if (isOnline) {
             const newTodo = await api.addTodo(fullTaskData, user.id);
             setTodos(prev => [...prev, newTodo]);
        } else {
            const offlineTodo: Todo = {
                ...fullTaskData,
                id: `offline_${Date.now()}`,
                createdAt: new Date(),
                isOffline: true,
            };
            setTodos(prev => [...prev, offlineTodo]);
            queueAction({
                type: 'ADD_TODO',
                payload: { taskData: fullTaskData, tempId: offlineTodo.id },
                projectId: project.id,
            });
            addToast('Task created offline.', 'success');
        }
    };

    const mapMarkers: MapMarker[] = useMemo(() => {
        if (!project.location?.lat) return [];
        return [{
            lat: project.location.lat,
            lng: project.location.lng,
            radius: project.geofenceRadius,
            popupContent: project.name,
        }];
    }, [project]);

    if (loading) {
        return <Card>Loading project details...</Card>;
    }

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                &larr; Back to all projects
            </button>
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-4xl font-bold text-slate-800">{project.name}</h2>
                    <p className="text-slate-500">{project.location.address}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{project.status}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="font-semibold text-lg mb-4">Project Location</h3>
                    <MapView markers={mapMarkers} height="h-64" />
                </Card>
                 <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4">Project Team</h3>
                    <div className="space-y-3">
                        {personnel.map(p => (
                            <div key={p.id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{p.name}</p>
                                    <p className="text-xs text-slate-500">{p.role}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => onStartChat(p)} disabled={p.id === user.id}>Chat</Button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            
            <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Task Board</h3>
                <KanbanBoard
                    todos={todos}
                    allTodos={todos}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onSelectTask={(task) => setSelectedTask(task)}
                    onAddTask={handleAddTask}
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
