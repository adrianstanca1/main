import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Todo, Project, Permission, TodoStatus, TodoPriority, Comment, SubTask } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { hasPermission } from '../services/auth';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { Button } from './ui/Button';
import { queueAction } from '../hooks/useOfflineSync';
import { ReminderControl } from './ReminderControl';

// --- Create Task Modal ---
const CreateTaskModal: React.FC<{
    user: User;
    projects: Project[];
    users: User[];
    onClose: () => void;
    onAddTask: (taskData: Omit<Todo, 'id' | 'createdAt' | 'creatorId' | 'status'>) => Promise<void>;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, projects, users, onClose, onAddTask, addToast }) => {
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState<string>(projects[0]?.id.toString() || '');
    const [priority, setPriority] = useState<TodoPriority>(TodoPriority.MEDIUM);
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !projectId) {
            addToast('Description and project are required.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await onAddTask({
                text: description,
                projectId: parseInt(projectId, 10),
                priority,
                assigneeId: assigneeId ? parseInt(assigneeId, 10) : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Create New Task</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="task-desc" className="block text-sm font-medium text-gray-700">Task Description</label>
                        <textarea
                            id="task-desc"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 w-full p-2 border rounded-md"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="project-select" className="block text-sm font-medium text-gray-700">Project</label>
                            <select id="project-select" value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="priority-select" className="block text-sm font-medium text-gray-700">Priority</label>
                            <select id="priority-select" value={priority} onChange={e => setPriority(e.target.value as TodoPriority)} className="mt-1 w-full p-2 border rounded-md bg-white">
                                {Object.values(TodoPriority).map(p => <option key={String(p)} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="assignee-select" className="block text-sm font-medium text-gray-700">Assignee (optional)</label>
                            <select id="assignee-select" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="due-date" className="block text-sm font-medium text-gray-700">Due Date (optional)</label>
                            <input type="date" id="due-date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>Create Task</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

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
            onUpdateTask(task.id, updates);
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
        onAddComment(task.id, newComment);
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
                    <div className="flex items-center gap-2">
                        {task.isOffline && (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <title>This task is saved locally and will sync when online.</title>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                        )}
                        {isEditing ? (
                            <textarea
                                value={editableTask.text}
                                onChange={(e) => handleFieldChange('text', e.target.value)}
                                className="text-xl font-bold w-full p-1 border rounded-md"
                            />
                        ) : (
                            <h3 className="text-xl font-bold">{task.text}</h3>
                        )}
                    </div>
                    {canManageTasks && !isEditing && task.status !== TodoStatus.DONE && (
                        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>
                <p className="text-sm text-slate-500 mb-4">in project: {projectName}</p>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {/* Task Details Section */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pb-4 border-b">
                         {isEditing && (
                             <>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                                    <select value={editableTask.status} onChange={(e) => handleFieldChange('status', e.target.value as TodoStatus)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                        {Object.values(TodoStatus).map(s => <option key={String(s)} value={s}>{s}</option>)}
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

                    {/* Sub-tasks */}
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
                    
                    {/* Comments */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Comments</h4>
                        <div className="space-y-3">
                            {task.comments?.map(comment => (
                                <div key={comment.id} className="flex flex-col items-start">
                                    <div className="flex items-center gap-2 text-sm mb-1">
                                        {comment.isOffline && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <title>This comment is saved locally and will sync when online.</title>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                            </svg>
                                        )}
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

interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({ user, addToast, isOnline }) => {
    const [allTodos, setAllTodos] = useState<Todo[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [companyUsers, setCompanyUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);

    const [filters, setFilters] = useState({
        projectId: 'all',
        assigneeId: 'all',
        status: 'all',
    });
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for bulk actions
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number | string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState<TodoStatus | ''>('');
    const [bulkPriority, setBulkPriority] = useState<TodoPriority | ''>('');
    const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('');
    const [isApplyingBulkActions, setIsApplyingBulkActions] = useState(false);


    const fetchData = useCallback(async () => {
        try {
            if (!user.companyId) return;

            let projectsPromise: Promise<Project[]>;
            if (hasPermission(user, Permission.VIEW_ALL_PROJECTS)) {
                projectsPromise = api.getProjectsByCompany(user.companyId);
            } else {
                projectsPromise = api.getProjectsByUser(user.id);
            }

            const [projects, users] = await Promise.all([
                projectsPromise,
                api.getUsersByCompany(user.companyId),
            ]);

            const projectIds = projects.map(p => p.id);
            const todos = await api.getTodosByProjectIds(projectIds);
            
            setAllProjects(projects);
            setCompanyUsers(users);
            setAllTodos(todos);

        } catch (error) {
            addToast("Failed to load task data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        setLoading(true);
        fetchData();
        
        window.addEventListener('datachanged', fetchData);
        return () => window.removeEventListener('datachanged', fetchData);

    }, [fetchData]);
    
    const onAddTask = async (taskData: Omit<Todo, 'id' | 'createdAt' | 'creatorId' | 'status'>) => {
        const fullTaskData = {
            ...taskData,
            creatorId: user.id,
            status: TodoStatus.TODO,
        };

        if (isOnline) {
            try {
                const newTodo = await api.addTodo(fullTaskData, user.id);
                setAllTodos(prev => [newTodo, ...prev]);
                addToast('Task created successfully!', 'success');
                setIsCreateModalOpen(false);
            } catch (error) {
                addToast('Failed to create task.', 'error');
                throw error;
            }
        } else {
            const offlineTodo: Todo = {
                ...fullTaskData,
                id: `offline_${Date.now()}`,
                createdAt: new Date(),
                isOffline: true,
            };
            setAllTodos(prev => [offlineTodo, ...prev]);
            queueAction({
                type: 'ADD_TODO',
                payload: { taskData: fullTaskData, tempId: offlineTodo.id },
                projectId: fullTaskData.projectId,
            });
            addToast('Task created offline. It will sync when you reconnect.', 'success');
            setIsCreateModalOpen(false);
        }
    };

    const handleUpdateTask = async (todoId: number | string, updates: Partial<Todo>) => {
        // Optimistic update
        const originalTodos = allTodos;
        const updatedTask = { ...allTodos.find(t => t.id === todoId)!, ...updates };
        setAllTodos(prev => prev.map(t => (t.id === todoId ? updatedTask : t)));
        if (selectedTask?.id === todoId) {
            setSelectedTask(updatedTask);
        }
        
        if (isOnline) {
            try {
                await api.updateTodo(todoId, updates, user.id);
                addToast('Task updated.', 'success');
            } catch (error) {
                setAllTodos(originalTodos); // Revert on error
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

        const updateState = (comment: Comment) => {
            const newTodos = allTodos.map(t => {
                if (t.id === todoId) {
                    return { ...t, comments: [...(t.comments || []), comment] };
                }
                return t;
            });
            setAllTodos(newTodos);
            if (selectedTask?.id === todoId) {
                setSelectedTask(prev => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null);
            }
        };

        updateState(optimisticComment);
        
        const currentTask = allTodos.find(t => t.id === todoId);
        if (!currentTask) return;

        if (isOnline) {
            try {
                await api.addComment(todoId, text, user.id);
            } catch(error) {
                 addToast('Failed to add comment.', 'error');
                 fetchData(); // Revert optimistic update
            }
        } else {
            queueAction({
                type: 'ADD_COMMENT',
                payload: { todoId, text, creatorId: user.id },
                projectId: currentTask.projectId,
            });
            addToast('Comment added offline. It will sync later.', 'success');
        }
    };

    const projectMap = useMemo(() => new Map(allProjects.map(p => [p.id, p])), [allProjects]);
    const userMap = useMemo(() => new Map(companyUsers.map(u => [u.id, u])), [companyUsers]);

    const filteredTodos = useMemo(() => {
        return allTodos
            .filter(todo => {
                const searchTxt = searchTerm.toLowerCase();
                const searchMatch = (
                    todo.text.toLowerCase().includes(searchTxt) ||
                    projectMap.get(todo.projectId)?.name.toLowerCase().includes(searchTxt) ||
                    (todo.assigneeId ? userMap.get(todo.assigneeId)?.name.toLowerCase().includes(searchTxt) : false) ||
                    String(todo.id).includes(searchTxt)
                );
                const projectMatch = filters.projectId === 'all' || todo.projectId === parseInt(filters.projectId, 10);
                const assigneeMatch = filters.assigneeId === 'all' || todo.assigneeId === parseInt(filters.assigneeId, 10);
                const statusMatch = filters.status === 'all' || todo.status === filters.status;
                return searchMatch && projectMatch && assigneeMatch && statusMatch;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allTodos, searchTerm, filters, projectMap, userMap]);

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedTaskIds(new Set(filteredTodos.map(t => t.id)));
        } else {
            setSelectedTaskIds(new Set());
        }
    };

    const handleSelectOne = (taskId: string | number, isChecked: boolean) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(taskId);
            } else {
                newSet.delete(taskId);
            }
            return newSet;
        });
    };
    
    const handleApplyBulkActions = async () => {
        const updates: Partial<Todo> = {};
        if (bulkStatus) updates.status = bulkStatus;
        if (bulkPriority) updates.priority = bulkPriority;
        if (bulkAssigneeId) {
            updates.assigneeId = bulkAssigneeId === 'unassigned' ? undefined : parseInt(bulkAssigneeId, 10);
        }
        
        if (Object.keys(updates).length === 0) {
            addToast("No bulk action selected.", "error");
            return;
        }

        setIsApplyingBulkActions(true);
        try {
            const promises = Array.from(selectedTaskIds).map(id => handleUpdateTask(id, updates));
            await Promise.all(promises);
            addToast(`${selectedTaskIds.size} tasks updated successfully.`, "success");
            setSelectedTaskIds(new Set());
            setBulkStatus('');
            setBulkPriority('');
            setBulkAssigneeId('');
        } catch(e) {
            addToast("Failed to apply bulk actions.", "error");
        } finally {
            setIsApplyingBulkActions(false);
            fetchData(); // Refresh all data
        }
    };

    if (loading) {
        return <Card><p>Loading all tasks...</p></Card>;
    }

    const isAllSelected = selectedTaskIds.size > 0 && selectedTaskIds.size === filteredTodos.length;

    return (
        <div className="space-y-6">
            {isCreateModalOpen && (
                <CreateTaskModal
                    user={user}
                    projects={allProjects}
                    users={companyUsers}
                    onClose={() => setIsCreateModalOpen(false)}
                    onAddTask={onAddTask}
                    addToast={addToast}
                />
            )}
            {selectedTask && (
                 <TaskDetailModal
                    task={selectedTask}
                    user={user}
                    projectName={projectMap.get(selectedTask.projectId)?.name || 'N/A'}
                    personnel={companyUsers}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                    onAddComment={handleAddComment}
                    onReminderUpdate={fetchData}
                    addToast={addToast}
                />
            )}
            <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-bold text-slate-800">All Tasks</h2>
                {canManageTasks && (
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Task
                    </Button>
                )}
            </div>

            {canManageTasks && selectedTaskIds.size > 0 && (
                 <div className="sticky top-6 lg:top-8 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg shadow-md border animate-fade-in flex flex-wrap items-center gap-4">
                    <span className="font-semibold text-sm">{selectedTaskIds.size} tasks selected</span>
                    <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as TodoStatus)} className="p-2 border bg-white rounded-md text-sm">
                        <option value="">Change Status...</option>
                        {Object.values(TodoStatus).map(s => <option key={String(s)} value={s}>{s}</option>)}
                    </select>
                     <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value as TodoPriority)} className="p-2 border bg-white rounded-md text-sm">
                        <option value="">Change Priority...</option>
                        {Object.values(TodoPriority).map(p => <option key={String(p)} value={p}>{p}</option>)}
                    </select>
                    <select value={bulkAssigneeId} onChange={e => setBulkAssigneeId(e.target.value)} className="p-2 border bg-white rounded-md text-sm">
                        <option value="">Assign to...</option>
                        <option value="unassigned">Unassigned</option>
                        {companyUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <div className="flex-grow flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedTaskIds(new Set())}>Clear Selection</Button>
                        <Button size="sm" onClick={handleApplyBulkActions} isLoading={isApplyingBulkActions}>Apply</Button>
                    </div>
                </div>
            )}
            
            <Card>
                <div className="flex flex-wrap items-end gap-4 mb-4 pb-4 border-b">
                    <div className="flex-grow min-w-[250px]">
                        <label htmlFor="task-search" className="block text-sm font-medium text-gray-700 mb-1">Search Tasks</label>
                        <input
                            id="task-search"
                            type="text"
                            placeholder="Search name, project, assignee, or ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                    </div>
                     <div className="flex-shrink-0">
                        <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select id="project-filter" value={filters.projectId} onChange={e => setFilters(f => ({...f, projectId: e.target.value}))} className="w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm">
                            <option value="all">All Projects</option>
                            {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                     <div className="flex-shrink-0">
                        <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                        <select id="assignee-filter" value={filters.assigneeId} onChange={e => setFilters(f => ({...f, assigneeId: e.target.value}))} className="w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm">
                            <option value="all">All Assignees</option>
                            {companyUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                     <div className="flex-shrink-0">
                        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select id="status-filter" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm">
                            <option value="all">All Statuses</option>
                            {Object.values(TodoStatus).map(s => <option key={String(s)} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {canManageTasks && (
                                    <th scope="col" className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300"
                                            checked={isAllSelected}
                                            onChange={e => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Task</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assignee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTodos.map(todo => {
                                 const isOverdue = todo.dueDate && new Date(new Date(todo.dueDate).setHours(0, 0, 0, 0)) < new Date(new Date().setHours(0, 0, 0, 0)) && todo.status !== TodoStatus.DONE;
                                 return(
                                    <tr key={todo.id} onClick={() => setSelectedTask(todo)} className="hover:bg-slate-50 cursor-pointer">
                                        {canManageTasks && (
                                            <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300"
                                                    checked={selectedTaskIds.has(todo.id)}
                                                    onChange={e => handleSelectOne(todo.id, e.target.checked)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                {todo.isOffline && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <title>This task is saved locally and will sync when online.</title>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                                    </svg>
                                                )}
                                                <span>{todo.text}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{projectMap.get(todo.projectId)?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{todo.assigneeId ? userMap.get(todo.assigneeId)?.name : 'Unassigned'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{todo.status}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><PriorityDisplay priority={todo.priority} /></td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {filteredTodos.length === 0 && <p className="text-center py-8 text-slate-500">No tasks match your filters.</p>}
                </div>
            </Card>
        </div>
    );
};