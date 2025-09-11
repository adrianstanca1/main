import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, Todo, User, Permission, TodoStatus, TodoPriority, Comment, SubTask } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { hasPermission } from '../services/auth';
import { queueAction, cacheTasks, getCachedTasks } from '../hooks/useOfflineSync';
import { MapView, MapMarker } from './MapView';

// --- Reusable Components for ProjectDetailView ---

const AddTaskModal: React.FC<{
    onClose: () => void;
    onAdd: (taskData: { text: string; priority: TodoPriority; status: TodoStatus; }) => Promise<void>;
}> = ({ onClose, onAdd }) => {
    const [text, setText] = useState('');
    const [priority, setPriority] = useState<TodoPriority>(TodoPriority.MEDIUM);
    const [status, setStatus] = useState<TodoStatus>(TodoStatus.TODO);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        
        setIsSaving(true);
        try {
            await onAdd({ text, priority, status });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Add New Task</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="task-text" className="block text-sm font-medium text-gray-700">Task Name</label>
                        <input type="text" id="task-text" value={text} onChange={e => setText(e.target.value)} autoFocus className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700">Priority</label>
                            <select id="task-priority" value={priority} onChange={e => setPriority(e.target.value as TodoPriority)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                                {Object.values(TodoPriority).map(p => <option key={String(p)} value={p}>{p}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="task-status" className="block text-sm font-medium text-gray-700">Status (Column)</label>
                            <select id="task-status" value={status} onChange={e => setStatus(e.target.value as TodoStatus)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                                {Object.values(TodoStatus).map(s => <option key={String(s)} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>Add Task</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const TodoStatusBadge: React.FC<{ status: TodoStatus }> = ({ status }) => {
    const styles = {
        [TodoStatus.TODO]: 'bg-slate-200 text-slate-700',
        [TodoStatus.IN_PROGRESS]: 'bg-sky-200 text-sky-700',
        [TodoStatus.DONE]: 'bg-green-200 text-green-700',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const TaskDetailModal: React.FC<{
    task: Todo;
    user: User;
    projectName: string;
    personnel: User[];
    allTodos: Todo[];
    onClose: () => void;
    onAddComment: (text: string) => Promise<void>;
    onUpdateTask: (updates: Partial<Todo>) => void;
}> = ({ task, user, projectName, personnel, allTodos, onClose, onAddComment, onUpdateTask }) => {
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const userMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editableTask, setEditableTask] = useState<Todo>(task);
    const [editingComment, setEditingComment] = useState<{ id: number | string; text: string } | null>(null);

    useEffect(() => {
        setEditableTask(task);
    }, [task]);

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };
    
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

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsCommenting(true);
        try {
            await onAddComment(newComment);
            setNewComment('');
        } finally {
            setIsCommenting(false);
        }
    };

    const handleStartEditComment = (comment: Comment) => {
        setEditingComment({ id: comment.id, text: comment.text });
    };

    const handleCancelEditComment = () => {
        setEditingComment(null);
    };

    const handleSaveComment = () => {
        if (!editingComment) return;
        const updatedComments = task.comments?.map(c => 
            c.id === editingComment.id ? { ...c, text: editingComment.text } : c
        );
        onUpdateTask({ comments: updatedComments });
        setEditingComment(null);
    };

    const handleDeleteComment = (commentId: number | string) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            const updatedComments = task.comments?.filter(c => c.id !== commentId);
            onUpdateTask({ comments: updatedComments });
        }
    };

    const onUpdateSubtaskCheckbox = (subtaskId: number, completed: boolean) => {
        const updatedSubtasks = editableTask.subTasks?.map(st => 
            st.id === subtaskId ? { ...st, completed } : st
        );
        onUpdateTask({ subTasks: updatedSubtasks });
    };

    const isUpstream = (startTask: Todo, targetTask: Todo, todos: Todo[]): boolean => {
        let current: Todo | undefined = startTask;
        const visited = new Set<string|number>();
        while(current?.dependsOn) {
            if (visited.has(current.id)) return true; // Cycle detected
            visited.add(current.id);
            if (current.dependsOn === targetTask.id) return true;
            current = todos.find(t => t.id === current.dependsOn);
        }
        return false;
    };

    const possibleParents = allTodos.filter(p => p.id !== task.id && !isUpstream(p, task, allTodos));
    const currentParent = allTodos.find(t => t.id === task.dependsOn);
    const completedSubtasks = useMemo(() => editableTask.subTasks?.filter(st => st.completed).length || 0, [editableTask.subTasks]);
    const totalSubtasks = useMemo(() => editableTask.subTasks?.length || 0, [editableTask.subTasks]);
    const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    const dueDateForInput = editableTask.dueDate ? new Date(editableTask.dueDate).toISOString().split('T')[0] : '';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-start mb-2">
                    {isEditing ? (
                        <textarea value={editableTask.text} onChange={(e) => handleFieldChange('text', e.target.value)} className="text-xl font-bold w-full p-1 border rounded-md" rows={2}/>
                    ) : (
                        <h3 className="text-xl font-bold">{task.text}</h3>
                    )}
                    {canManageTasks && !isEditing && (
                        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>
                <p className="text-sm text-slate-500 mb-4">in project: {projectName}</p>
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pb-4 border-b">
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                            {isEditing ? (
                                <select value={editableTask.status} onChange={(e) => handleFieldChange('status', e.target.value as TodoStatus)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                    {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            ) : (<div className="mt-1"><TodoStatusBadge status={task.status} /></div>)}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Priority</label>
                            {isEditing ? (
                                <select value={editableTask.priority} onChange={(e) => handleFieldChange('priority', e.target.value as TodoPriority)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                    {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            ) : (<p className="font-medium mt-1">{task.priority}</p>)}
                        </div>
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Assignee</label>
                            {isEditing ? (
                                <select value={editableTask.assigneeId || ''} onChange={(e) => handleFieldChange('assigneeId', e.target.value ? parseInt(e.target.value) : undefined)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                    <option value="">Unassigned</option>
                                    {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            ) : (<p className="font-medium mt-1">{userMap.get(task.assigneeId)?.name || 'Unassigned'}</p>)}
                        </div>
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Due Date</label>
                            {isEditing ? (
                                <input type="date" value={dueDateForInput} onChange={(e) => handleFieldChange('dueDate', e.target.value ? new Date(e.target.value) : undefined)} className="w-full p-1 border rounded-md mt-1 text-sm"/>
                            ) : (<p className="font-medium mt-1">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p>)}
                        </div>
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Dependency</label>
                            {isEditing ? (
                                 <select onChange={e => handleFieldChange('dependsOn', e.target.value ? (typeof e.target.value === 'string' && e.target.value.startsWith('offline_') ? e.target.value : parseInt(e.target.value, 10)) : undefined)} value={editableTask.dependsOn || ''} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                    <option value="">None</option>
                                    {possibleParents.map(p => (
                                        <option key={p.id as string} value={p.id as string}>Task #{typeof p.id === 'number' ? p.id.toString().slice(-4) : '...'}: {p.text}</option>
                                    ))}
                                </select>
                            ) : (<p className="font-medium mt-1">{currentParent?.text || 'None'}</p>)}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-slate-700">Sub-tasks</h4>
                            {totalSubtasks > 0 && <span className="text-sm text-slate-500">{completedSubtasks} / {totalSubtasks}</span>}
                        </div>
                        {totalSubtasks > 0 && (
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                                <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${subtaskProgress}%` }}></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {editableTask.subTasks?.map(st => (
                                <div key={st.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-md">
                                    <input type="checkbox" id={`subtask-${st.id}`} checked={st.completed} onChange={(e) => isEditing ? handleSubtaskChange(st.id, 'completed', e.target.checked) : onUpdateSubtaskCheckbox(st.id, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" aria-label={st.text}/>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={st.text} onChange={(e) => handleSubtaskChange(st.id, 'text', e.target.value)} className="flex-grow p-1 border rounded-md text-sm"/>
                                            <button onClick={() => handleDeleteSubtask(st.id)} className="text-red-500 text-xs font-bold hover:text-red-700 p-1">X</button>
                                        </>
                                    ) : (<label htmlFor={`subtask-${st.id}`} className={`flex-grow ${st.completed ? 'line-through text-slate-500' : ''}`}>{st.text}</label>)}
                                </div>
                            ))}
                        </div>
                        {isEditing && <Button size="sm" variant="secondary" onClick={handleAddSubtask} className="mt-2">+ Add Sub-task</Button>}
                    </div>

                    {!isEditing && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Comments</h4>
                            <div className="space-y-3">
                                {task.comments?.map(comment => {
                                    const canEditComment = canManageTasks || comment.creatorId === user.id;
                                    return (
                                        <div key={comment.id} className="flex items-start gap-3 group">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
                                                {getInitials(userMap.get(comment.creatorId)?.name || '?')}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2 text-sm mb-1">
                                                        <span className="font-semibold">{userMap.get(comment.creatorId)?.name || '...'}</span>
                                                        <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    {canEditComment && !editingComment && (
                                                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                            <button onClick={() => handleStartEditComment(comment)} title="Edit comment" className="p-1 rounded hover:bg-slate-200">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteComment(comment.id)} title="Delete comment" className="p-1 rounded hover:bg-slate-200">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                {editingComment?.id === comment.id ? (
                                                    <div>
                                                        <textarea value={editingComment.text} onChange={e => setEditingComment(c => c ? { ...c, text: e.target.value } : null)} className="w-full p-2 border rounded-md text-sm" />
                                                        <div className="flex gap-2 mt-1">
                                                            <Button size="sm" variant="secondary" onClick={handleCancelEditComment}>Cancel</Button>
                                                            <Button size="sm" onClick={handleSaveComment}>Save</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="bg-slate-100 p-2 rounded-lg text-slate-800">{comment.text}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                                {(!task.comments || task.comments.length === 0) && <p className="text-sm text-slate-400">No comments yet.</p>}
                            </div>
                        </div>
                    )}
                </div>
                 {isEditing ? (
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                ) : (
                    <form onSubmit={handleCommentSubmit} className="mt-4 pt-4 border-t flex gap-2">
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="w-full p-2 border rounded-md" disabled={isCommenting} />
                        <Button type="submit" isLoading={isCommenting} disabled={!newComment.trim()}>Send</Button>
                    </form>
                )}
            </Card>
        </div>
    );
};

// --- Main Component ---
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
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    
    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);

    const fetchData = useCallback(async () => {
        try {
            if (isOnline) {
                const [todosData, personnelData] = await Promise.all([
                    api.getTodosByProject(project.id),
                    api.getUsersByProject(project.id, user.companyId!)
                ]);
                setTodos(todosData);
                setPersonnel(personnelData);
                cacheTasks(project.id, todosData);
            } else {
                const cached = getCachedTasks(project.id);
                if (cached) setTodos(cached);
                // Can't fetch personnel offline, might need a cache for that too
                addToast("Showing cached task data.", "success");
            }
        } catch (error) {
            addToast("Failed to load project details.", "error");
        } finally {
            setLoading(false);
        }
    }, [project.id, user.companyId, addToast, isOnline]);

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);
    
    const handleUpdateTask = async (taskId: number | string, updates: Partial<Todo>) => {
        const originalTasks = [...todos];
        const updatedTask = { ...todos.find(t => t.id === taskId)!, ...updates };
        setTodos(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        if (selectedTask?.id === taskId) setSelectedTask(updatedTask);

        try {
            if (isOnline) {
                await api.updateTodo(taskId, updates, user.id);
            } else {
                queueAction({
                    type: 'UPDATE_TODO',
                    payload: { id: taskId, updates, actorId: user.id },
                    projectId: project.id
                });
            }
            addToast("Task updated.", "success");
        } catch (error) {
            addToast("Failed to update task.", "error");
            setTodos(originalTasks); // Revert on failure
            if (selectedTask?.id === taskId) setSelectedTask(originalTasks.find(t => t.id === taskId) || null);
        }
    };
    
    const handleAddTask = async (taskData: { text: string; priority: TodoPriority; status: TodoStatus; }) => {
        const optimisticTodo: Todo = {
            ...taskData,
            id: `offline_${Date.now()}`,
            projectId: project.id,
            creatorId: user.id,
            createdAt: new Date(),
            isOffline: true,
        };
        setTodos(prev => [optimisticTodo, ...prev]);

        try {
            if (isOnline) {
                const newTodo = await api.addTodo({ ...taskData, projectId: project.id, creatorId: user.id }, user.id);
                setTodos(prev => prev.map(t => t.id === optimisticTodo.id ? newTodo : t));
            } else {
                queueAction({
                    type: 'ADD_TODO',
                    payload: { ...taskData, projectId: project.id, creatorId: user.id },
                    projectId: project.id,
                });
            }
            addToast("Task added successfully.", "success");
        } catch (error) {
            addToast("Failed to add task.", "error");
            setTodos(prev => prev.filter(t => t.id !== optimisticTodo.id));
        }
    };
    
    const handleAddComment = async (text: string) => {
        if (!selectedTask) return;
        const optimisticComment: Comment = { id: `offline_comment_${Date.now()}`, creatorId: user.id, text, createdAt: new Date(), isOffline: true };
        const updatedComments = [...(selectedTask.comments || []), optimisticComment];
        handleUpdateTask(selectedTask.id, { comments: updatedComments }); // Optimistic update
    };

    const taskStats = useMemo(() => {
        const total = todos.length;
        const done = todos.filter(t => t.status === TodoStatus.DONE).length;
        const progress = total > 0 ? (done / total) * 100 : 0;
        return { total, done, progress };
    }, [todos]);
    
    const mapMarkers = useMemo((): MapMarker[] => {
        return [{
            lat: project.location.lat,
            lng: project.location.lng,
            radius: project.geofenceRadius,
            popupContent: project.name,
        }]
    }, [project]);

    if (loading) return <Card><p>Loading project details...</p></Card>;

    return (
        <div className="space-y-6">
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    user={user}
                    projectName={project.name}
                    personnel={personnel}
                    allTodos={todos}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={(updates) => handleUpdateTask(selectedTask.id, updates)}
                    onAddComment={handleAddComment}
                />
            )}
            {isAddTaskModalOpen && <AddTaskModal onClose={() => setIsAddTaskModalOpen(false)} onAdd={handleAddTask} />}
            
            <div className="flex justify-between items-center">
                <div>
                    <Button onClick={onBack} variant="ghost" className="mb-2 -ml-4">&larr; All Projects</Button>
                    <h2 className="text-3xl font-bold text-slate-800">{project.name}</h2>
                    <p className="text-slate-500">{project.location.address}</p>
                </div>
                {canManageTasks && <Button onClick={() => setIsAddTaskModalOpen(true)}>+ Add Task</Button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Card>
                    <h4 className="text-sm font-medium text-slate-500">Status</h4>
                    <p className={`text-2xl font-bold ${project.status === 'Active' ? 'text-green-600' : 'text-slate-800'}`}>{project.status}</p>
                </Card>
                <Card>
                    <h4 className="text-sm font-medium text-slate-500">Task Progress</h4>
                    <p className="text-2xl font-bold">{taskStats.done} / {taskStats.total}</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${taskStats.progress}%` }}></div>
                    </div>
                </Card>
                <Card>
                    <h4 className="text-sm font-medium text-slate-500">Budget</h4>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(project.budget)}</p>
                </Card>
                <Card>
                    <h4 className="text-sm font-medium text-slate-500">Team Size</h4>
                    <p className="text-2xl font-bold">{personnel.length} Members</p>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h3 className="font-semibold text-lg mb-2">Location</h3>
                        <MapView markers={mapMarkers} height="h-60" />
                    </Card>
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">Project Personnel</h3>
                        <div className="space-y-3">
                            {personnel.map(p => (
                                <div key={p.id} className="flex justify-between items-center">
                                    <span>{p.name}</span>
                                    {user.id !== p.id && (
                                        <Button size="sm" variant="ghost" onClick={() => onStartChat(p)}>
                                            Chat
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                     <KanbanBoard
                        todos={todos}
                        allTodos={todos}
                        onUpdateTaskStatus={(id, status) => handleUpdateTask(id, { status })}
                        onSelectTask={setSelectedTask}
                        onAddTask={handleAddTask}
                        canManageTasks={canManageTasks}
                        user={user}
                        addToast={addToast}
                        onReminderUpdate={fetchData}
                        personnel={personnel}
                    />
                </div>
            </div>
        </div>
    );
};
