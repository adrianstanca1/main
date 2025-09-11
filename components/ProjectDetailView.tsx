import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, User, Todo, Document as Doc, SafetyIncident, Permission, TodoStatus, TodoPriority, SubTask, Comment } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { MapView, MapMarker } from './MapView';
import { queueAction } from '../hooks/useOfflineSync';
import { DocumentStatusBadge, IncidentSeverityBadge, IncidentStatusBadge } from './ui/StatusBadge';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { ReminderControl } from './ReminderControl';

// TaskDetailModal component copied from Dashboard.tsx to be self-contained
const TaskDetailModal: React.FC<{
    task: Todo;
    user: User;
    projectName: string;
    personnel: User[];
    onClose: () => void;
    onAddComment: (text: string) => void;
    onUpdateTask: (updates: Partial<Todo>) => void;
    onReminderUpdate: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ task, user, projectName, personnel, onClose, onAddComment, onUpdateTask, onReminderUpdate, addToast }) => {
    const [newComment, setNewComment] = useState('');
    const userMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editableTask, setEditableTask] = useState<Todo>(task);

    useEffect(() => {
        setEditableTask(task);
    }, [task]);

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);
    
    const handleFieldChange = (field: keyof Todo, value: any) => {
        setEditableTask(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSubtaskChange = (id: number, field: 'text' | 'completed', value: string | boolean) => {
        setEditableTask(prev => ({
            ...prev,
            subTasks: prev.subTasks?.map(st => st.id === id ? { ...st, [field]: value } : st)
        }));
    };

    const handleAddSubtask = () => {
        const newSubtask: SubTask = { id: Date.now(), text: '', completed: false };
        setEditableTask(prev => ({
            ...prev,
            subTasks: [...(prev.subTasks || []), newSubtask]
        }));
    };

    const handleDeleteSubtask = (id: number) => {
        setEditableTask(prev => ({
            ...prev,
            subTasks: prev.subTasks?.filter(st => st.id !== id)
        }));
    };
    
    const handleSave = () => {
        const updates: Partial<Todo> = {};
        (Object.keys(editableTask) as Array<keyof Todo>).forEach(key => {
            if (JSON.stringify(editableTask[key]) !== JSON.stringify(task[key])) {
                (updates as any)[key] = editableTask[key];
            }
        });

        if (Object.keys(updates).length > 0) {
            onUpdateTask(updates);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableTask(task);
        setIsEditing(false);
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        onAddComment(newComment);
        setNewComment('');
    };

    const subtaskProgress = useMemo(() => {
        if (!editableTask.subTasks || editableTask.subTasks.length === 0) return 0;
        const completed = editableTask.subTasks.filter(st => st.completed).length;
        return (completed / editableTask.subTasks.length) * 100;
    }, [editableTask.subTasks]);

    const creatorName = userMap.get(task.creatorId)?.name;
    const dueDateForInput = editableTask.dueDate ? new Date(editableTask.dueDate).toISOString().split('T')[0] : '';
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-2">
                    {isEditing ? (
                        <textarea
                            value={editableTask.text}
                            onChange={(e) => handleFieldChange('text', e.target.value)}
                            className="text-xl font-bold w-full p-1 border rounded-md"
                        />
                    ) : (
                        <h3 className="text-xl font-bold">{task.text}</h3>
                    )}
                    {canManageTasks && !isEditing && task.status !== TodoStatus.DONE && (
                        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>
                <p className="text-sm text-slate-500 mb-4">in project: {projectName}</p>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pb-4 border-b">
                         {isEditing && (
                             <>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                                    <select value={editableTask.status} onChange={(e) => handleFieldChange('status', e.target.value as TodoStatus)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                        {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Priority</label>
                                    <select value={editableTask.priority} onChange={(e) => handleFieldChange('priority', e.target.value as TodoPriority)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                        {Object.values(TodoPriority).map(p => <option key={String(p)} value={p}>{p}</option>)}
                                    </select>
                                </div>
                             </>
                         )}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Assignee</label>
                            {isEditing ? (
                                <select 
                                    value={editableTask.assigneeId || ''} 
                                    onChange={(e) => handleFieldChange('assigneeId', e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm"
                                >
                                    <option value="">Unassigned</option>
                                    {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            ) : (
                                <p className="font-medium mt-1">{userMap.get(task.assigneeId)?.name || 'Unassigned'}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Due Date</label>
                             {isEditing ? (
                                <input
                                    type="date"
                                    value={dueDateForInput}
                                    onChange={(e) => handleFieldChange('dueDate', e.target.value ? new Date(e.target.value) : undefined)}
                                    className="w-full p-1 border rounded-md mt-1 text-sm"
                                />
                            ) : (
                                <p className="font-medium mt-1">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p>
                            )}
                        </div>
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Reporter</label>
                            <p className="font-medium mt-1">{creatorName || 'Unknown'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Reminder</label>
                            <div className="mt-1">
                                <ReminderControl 
                                    todo={task} 
                                    user={user} 
                                    onReminderUpdate={onReminderUpdate} 
                                    addToast={addToast}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Sub-tasks</h4>
                        {editableTask.subTasks && editableTask.subTasks.length > 0 && (
                            <div className="mb-2">
                                <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round(subtaskProgress)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${subtaskProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {editableTask.subTasks?.map(st => (
                                <div key={st.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-md">
                                    <input
                                        type="checkbox"
                                        id={`subtask-${st.id}`}
                                        checked={st.completed}
                                        onChange={(e) => handleSubtaskChange(st.id, 'completed', e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-70"
                                        aria-label={st.text}
                                        disabled={!isEditing}
                                    />
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={st.text}
                                                onChange={(e) => handleSubtaskChange(st.id, 'text', e.target.value)}
                                                className="flex-grow p-1 border rounded-md text-sm"
                                            />
                                            <button onClick={() => handleDeleteSubtask(st.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete subtask">
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </>
                                    ) : (
                                        <label htmlFor={`subtask-${st.id}`} className={`flex-grow ${st.completed ? 'line-through text-slate-500' : ''}`}>{st.text}</label>
                                    )}
                                </div>
                            ))}
                        </div>
                         {isEditing && <Button size="sm" variant="secondary" onClick={handleAddSubtask} className="mt-2">+ Add Sub-task</Button>}
                    </div>
                    
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

                {isEditing ? (
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                ) : (
                    <form onSubmit={handleCommentSubmit} className="mt-4 pt-4 border-t flex gap-2">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="w-full p-2 border rounded-md" />
                        <Button type="submit" disabled={!newComment.trim()}>Send</Button>
                    </form>
                )}
            </Card>
        </div>
    );
};


interface ProjectDetailViewProps {
  project: Project;
  user: User;
  onBack: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
  onStartChat: (user: User) => void;
}

type Tab = 'tasks' | 'team' | 'documents' | 'safety';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, user, onBack, addToast, isOnline, onStartChat }) => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [documents, setDocuments] = useState<Doc[]>([]);
    const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('tasks');
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [todosData, usersData, docsData, incidentsData] = await Promise.all([
                api.getTodosByProject(project.id),
                api.getUsersByProject(project.id, user.companyId!),
                api.getDocumentsByProjectIds([project.id]),
                api.getIncidentsByProject(project.id),
            ]);
            setTodos(todosData);
            setPersonnel(usersData);
            setDocuments(docsData);
            setIncidents(incidentsData);
        } catch (error) {
            addToast("Failed to load project details.", "error");
        } finally {
            setLoading(false);
        }
    }, [project.id, user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);

    const handleUpdateTaskStatus = useCallback(async (todoId: number | string, newStatus: TodoStatus) => {
        try {
            const updatedTask = await api.updateTodo(todoId, { status: newStatus }, user.id);
            setTodos(prev => prev.map(t => t.id === todoId ? updatedTask : t));
            if (selectedTask?.id === todoId) {
                setSelectedTask(updatedTask);
            }
        } catch (error) {
            addToast("Failed to update task status.", "error");
        }
    }, [user.id, addToast, selectedTask]);

    const handleUpdateTask = async (updates: Partial<Todo>) => {
        if (!selectedTask) return;
        try {
            const updatedTask = await api.updateTodo(selectedTask.id, updates, user.id);
            setTodos(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
            setSelectedTask(updatedTask);
            addToast('Task updated.', 'success');
        } catch (error) {
            addToast('Failed to update task.', 'error');
        }
    };

    const handleAddComment = async (text: string) => {
        if (!selectedTask) return;
        const newComment = await api.addComment(selectedTask.id, text, user.id);
        const updatedComments = [...(selectedTask.comments || []), newComment];
        const updatedTask = { ...selectedTask, comments: updatedComments };
        setSelectedTask(updatedTask);
        setTodos(todos.map(t => t.id === selectedTask.id ? updatedTask : t));
    };


    const renderContent = () => {
        if (loading) return <Card><p>Loading project data...</p></Card>;
        switch (activeTab) {
            case 'tasks':
                return <KanbanBoard
                    todos={todos}
                    allTodos={todos}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onSelectTask={(task) => setSelectedTask(task)}
                    onAddTask={async (taskData) => {}}
                    canManageTasks={canManageTasks}
                    user={user}
                    addToast={addToast}
                    onReminderUpdate={fetchData}
                    personnel={personnel}
                />;
            // Other tabs can be implemented here
            default:
                return <Card><p>Content for {activeTab} not implemented yet.</p></Card>;
        }
    };

    const mapMarker: MapMarker[] = [{
        lat: project.location.lat,
        lng: project.location.lng,
        radius: project.geofenceRadius,
        popupContent: project.name,
    }];

    return (
        <div className="space-y-6">
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    user={user}
                    projectName={project.name}
                    personnel={personnel}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                    onAddComment={handleAddComment}
                    onReminderUpdate={fetchData}
                    addToast={addToast}
                />
            )}
            <div>
                <Button variant="ghost" onClick={onBack} className="mb-4">
                    &larr; Back to Projects
                </Button>
                <h2 className="text-3xl font-bold text-slate-800">{project.name}</h2>
                <p className="text-slate-500">{project.location.address}</p>
            </div>
            
            <MapView markers={mapMarker} />

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                    {(['tasks', 'team', 'documents', 'safety'] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {renderContent()}
        </div>
    );
};