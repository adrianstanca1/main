import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Todo, Project, Permission, TodoStatus, TodoPriority, Comment, SubTask } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { queueAction } from '../hooks/useOfflineSync';

// --- Task Detail Modal ---
const TaskDetailModal: React.FC<{
    task: Todo;
    user: User;
    projectName: string;
    personnel: User[];
    onClose: () => void;
    onUpdateTask: (updates: Partial<Todo>) => void;
    onAddComment: (text: string) => Promise<void>;
}> = ({ task, user, projectName, personnel, onClose, onUpdateTask, onAddComment }) => {
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const userMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);

    const [isEditing, setIsEditing] = useState(false);
    const [editableTask, setEditableTask] = useState<Todo>(task);

    useEffect(() => {
        setEditableTask(task);
    }, [task]);

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);
    const canEdit = canManageTasks && task.status !== TodoStatus.DONE;

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
    
    const onUpdateSubtaskCheckbox = (subtaskId: number, completed: boolean) => {
        const updatedSubtasks = editableTask.subTasks?.map(st => 
            st.id === subtaskId ? { ...st, completed } : st
        );
        onUpdateTask({ subTasks: updatedSubtasks });
    };

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
                    {canEdit && !isEditing && (
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
                                        {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Priority</label>
                                    <select value={editableTask.priority} onChange={(e) => handleFieldChange('priority', e.target.value as TodoPriority)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                        {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
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
                    </div>

                    {/* Sub-tasks */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Sub-tasks</h4>
                        <div className="space-y-2">
                            {editableTask.subTasks?.map(st => (
                                <div key={st.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-md">
                                    <input
                                        type="checkbox"
                                        id={`subtask-${st.id}`}
                                        checked={st.completed}
                                        onChange={(e) => isEditing ? handleSubtaskChange(st.id, 'completed', e.target.checked) : onUpdateSubtaskCheckbox(st.id, e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        aria-label={st.text}
                                        disabled={task.status === TodoStatus.DONE}
                                    />
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={st.text}
                                                onChange={(e) => handleSubtaskChange(st.id, 'text', e.target.value)}
                                                className="flex-grow p-1 border rounded-md text-sm"
                                            />
                                            <button onClick={() => handleDeleteSubtask(st.id)} className="text-red-500 text-xs font-bold">X</button>
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
                                        <span className="font-semibold">{userMap.get(comment.creatorId)?.name || '...'}</span>
                                        <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                         {comment.isOffline && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <title>This comment is saved locally and will sync when online.</title>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                            </svg>
                                        )}
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
                        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="w-full p-2 border rounded-md" disabled={isCommenting} />
                        <Button type="submit" isLoading={isCommenting} disabled={!newComment.trim()}>Send</Button>
                    </form>
                )}
            </Card>
        </div>
    );
};


// --- Create Task Modal Component ---
const CreateTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (taskData: Omit<Todo, 'id' | 'createdAt'>) => Promise<void>;
  projects: Project[];
  users: User[];
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ isOpen, onClose, onAddTask, projects, users, user, addToast }) => {
    const [text, setText] = useState('');
    const [projectId, setProjectId] = useState<string>(projects[0]?.id.toString() || '');
    const [priority, setPriority] = useState<TodoPriority>(TodoPriority.MEDIUM);
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (projects.length > 0 && !projectId) {
            setProjectId(projects[0].id.toString());
        }
    }, [projects, projectId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !projectId) {
            addToast('Task description and project are required.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await onAddTask({
                text,
                projectId: parseInt(projectId, 10),
                priority,
                assigneeId: assigneeId ? parseInt(assigneeId, 10) : undefined,
                dueDate: dueDate ? new Date(new Date(dueDate).setHours(23, 59, 59)) : undefined, // Set to end of day
                status: TodoStatus.TODO,
                creatorId: user.id,
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Create New Task</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="task-text" className="block text-sm font-medium text-gray-700">Task Description</label>
                        <textarea id="task-text" value={text} onChange={e => setText(e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md" required autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="task-project" className="block text-sm font-medium text-gray-700">Project</label>
                            <select id="task-project" value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1 w-full p-2 border bg-white rounded-md" required>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700">Priority</label>
                            <select id="task-priority" value={priority} onChange={e => setPriority(e.target.value as TodoPriority)} className="mt-1 w-full p-2 border bg-white rounded-md">
                                {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700">Assignee</label>
                            <select id="task-assignee" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="mt-1 w-full p-2 border bg-white rounded-md">
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700">Due Date</label>
                            <input type="date" id="task-due-date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
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


// Props for the component
interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

// A simple status badge for this view
const TodoStatusBadge: React.FC<{ status: TodoStatus }> = ({ status }) => {
    const styles = {
        [TodoStatus.TODO]: 'bg-slate-200 text-slate-700',
        [TodoStatus.IN_PROGRESS]: 'bg-sky-200 text-sky-700',
        [TodoStatus.DONE]: 'bg-green-200 text-green-700',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

// Main component
export const AllTasksView: React.FC<AllTasksViewProps> = ({ user, addToast, isOnline }) => {
    const [allTasks, setAllTasks] = useState<Todo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        projectId: 'all',
        assigneeId: 'all',
        status: 'open', // Default to open tasks
    });
    
    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'desc' });

    // Bulk Actions State
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number | string>>(new Set());
    const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<TodoStatus | ''>('');
    const [bulkPriority, setBulkPriority] = useState<TodoPriority | ''>('');
    const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;

            if (!hasPermission(user, Permission.VIEW_ALL_TASKS)) {
                addToast("You don't have permission to view all tasks.", "error");
                setLoading(false);
                return;
            }

            const companyProjects = await api.getProjectsByCompany(user.companyId);
            setProjects(companyProjects);

            const projectIds = companyProjects.map(p => p.id);
            const [tasksData, usersData] = await Promise.all([
                api.getTodosByProjectIds(projectIds),
                api.getUsersByCompany(user.companyId),
            ]);

            setAllTasks(tasksData);
            setUsers(usersData);

        } catch (error) {
            addToast("Failed to load task data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const SortIcon: React.FC<{ sortKey: string; sortConfig: { key: string; direction: string; } }> = ({ sortKey, sortConfig }) => {
        if (sortConfig.key !== sortKey) {
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 opacity-40 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
        }
        if (sortConfig.direction === 'asc') {
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
        }
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
    }


    const handleAddTask = async (taskData: Omit<Todo, 'id' | 'createdAt'>) => {
        const optimisticTodo: Todo = {
            ...taskData,
            id: `offline_${Date.now()}`,
            createdAt: new Date(),
            isOffline: true,
        };

        setAllTasks(prev => [optimisticTodo, ...prev]);

        try {
            if (isOnline) {
                const newTodo = await api.addTodo(taskData, taskData.creatorId);
                setAllTasks(prev => prev.map(t => t.id === optimisticTodo.id ? newTodo : t));
            } else {
                queueAction({
                    type: 'ADD_TODO',
                    payload: taskData,
                    projectId: taskData.projectId
                });
            }
            addToast("Task created successfully.", "success");
        } catch (error) {
            addToast("Failed to create task.", "error");
            setAllTasks(prev => prev.filter(t => t.id !== optimisticTodo.id));
        }
    };
    
    const handleUpdateTask = async (updates: Partial<Todo>) => {
        if (!selectedTask) return;

        const originalTasks = [...allTasks];
        const updatedTask = { ...selectedTask, ...updates };

        setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);

        try {
            if (isOnline) {
                await api.updateTodo(selectedTask.id, updates, user.id);
            } else {
                queueAction({
                    type: 'UPDATE_TODO',
                    payload: { id: selectedTask.id, updates, actorId: user.id },
                    projectId: selectedTask.projectId,
                });
            }
            addToast("Task updated successfully.", "success");
        } catch (error) {
            addToast("Failed to update task.", "error");
            setAllTasks(originalTasks);
            setSelectedTask(originalTasks.find(t => t.id === selectedTask.id) || null);
        }
    };

    const handleAddComment = async (text: string) => {
        if (!selectedTask) return;

        const optimisticComment: Comment = {
            id: `offline_comment_${Date.now()}`,
            creatorId: user.id,
            text,
            createdAt: new Date(),
            isOffline: true,
        };
        
        const updatedTask = {
            ...selectedTask,
            comments: [...(selectedTask.comments || []), optimisticComment],
        };

        setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);

        try {
            if (isOnline) {
                const newComment = await api.addComment(selectedTask.id, text, user.id);
                const finalTask = { ...updatedTask, comments: updatedTask.comments?.map(c => c.id === optimisticComment.id ? newComment : c) };
                setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? finalTask : t));
                setSelectedTask(finalTask);
            } else {
                queueAction({
                    type: 'ADD_COMMENT',
                    payload: { todoId: selectedTask.id, text, creatorId: user.id },
                    projectId: selectedTask.projectId
                });
            }
            addToast("Comment added.", "success");
        } catch (error) {
            addToast("Failed to add comment.", "error");
            const revertedTask = { ...selectedTask, comments: selectedTask.comments?.filter(c => c.id !== optimisticComment.id) };
            setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? revertedTask : t));
            setSelectedTask(revertedTask);
        }
    };

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const projectsMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);

    const filteredAndSortedTasks = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase().trim();

        const filtered = allTasks
            .filter(task => {
                if (filters.status === 'open' && task.status === TodoStatus.DONE) return false;
                if (filters.status === 'done' && task.status !== TodoStatus.DONE) return false;
                return true;
            })
            .filter(task => filters.projectId === 'all' || task.projectId === parseInt(filters.projectId, 10))
            .filter(task => filters.assigneeId === 'all' || task.assigneeId === parseInt(filters.assigneeId, 10))
            .filter(task => {
                if (!lowerCaseSearch) return true;

                const assigneeName = task.assigneeId ? usersMap.get(task.assigneeId) : '';
                const projectName = projectsMap.get(task.projectId) || '';

                return (
                    task.text.toLowerCase().includes(lowerCaseSearch) ||
                    (projectName && projectName.toLowerCase().includes(lowerCaseSearch)) ||
                    (assigneeName && assigneeName.toLowerCase().includes(lowerCaseSearch)) ||
                    task.id.toString().toLowerCase().includes(lowerCaseSearch)
                );
            });

        const sorted = [...filtered];
        const priorityOrder = { [TodoPriority.HIGH]: 1, [TodoPriority.MEDIUM]: 2, [TodoPriority.LOW]: 3 };

        sorted.sort((a, b) => {
            let valA: any;
            let valB: any;
            const key = sortConfig.key;
            
            if (key === 'project') {
                valA = projectsMap.get(a.projectId) || '';
                valB = projectsMap.get(b.projectId) || '';
            } else if (key === 'assignee') {
                valA = usersMap.get(a.assigneeId || -1) || 'zzzz';
                valB = usersMap.get(b.assigneeId || -1) || 'zzzz';
            } else if (key === 'dueDate') {
                const infinity = sortConfig.direction === 'asc' ? Infinity : -Infinity;
                valA = a.dueDate ? new Date(a.dueDate).getTime() : infinity;
                valB = b.dueDate ? new Date(b.dueDate).getTime() : infinity;
            } else if (key === 'priority') {
                valA = priorityOrder[a.priority];
                valB = priorityOrder[b.priority];
            } else {
                valA = a[key as keyof Todo] || '';
                valB = b[key as keyof Todo] || '';
            }

            let result = 0;
            if (valA < valB) result = -1;
            else if (valA > valB) result = 1;

            return sortConfig.direction === 'asc' ? result : -result;
        });

        return sorted;

    }, [allTasks, filters, searchTerm, projectsMap, usersMap, sortConfig]);

    const handleSelectTask = (taskId: number | string) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allVisibleIds = new Set(filteredAndSortedTasks.map(t => t.id));
            setSelectedTaskIds(allVisibleIds);
        } else {
            setSelectedTaskIds(new Set());
        }
    };

    const handleApplyBulkActions = async () => {
        if (selectedTaskIds.size === 0) return;
        
        const updates: Partial<Todo> = {};
        if (bulkStatus) updates.status = bulkStatus;
        if (bulkPriority) updates.priority = bulkPriority;
        if (bulkAssigneeId) {
            updates.assigneeId = bulkAssigneeId === 'unassigned' ? undefined : parseInt(bulkAssigneeId, 10);
        }

        if (Object.keys(updates).length === 0) {
            addToast('Please select an action to apply.', 'error');
            return;
        }

        setIsApplyingBulkAction(true);
        try {
            const updatePromises = Array.from(selectedTaskIds).map(taskId => 
                api.updateTodo(taskId, updates, user.id)
            );
            await Promise.all(updatePromises);
            addToast(`Successfully updated ${selectedTaskIds.size} tasks.`, 'success');
            setSelectedTaskIds(new Set());
            setBulkStatus('');
            setBulkPriority('');
            setBulkAssigneeId('');
            fetchData();
        } catch (error) {
            addToast('Failed to apply bulk actions.', 'error');
        } finally {
            setIsApplyingBulkAction(false);
        }
    };

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);

    const isAllVisibleSelected = useMemo(() => {
        if (filteredAndSortedTasks.length === 0) return false;
        return filteredAndSortedTasks.every(task => selectedTaskIds.has(task.id));
    }, [filteredAndSortedTasks, selectedTaskIds]);


    if (loading) {
        return <Card><p>Loading all tasks...</p></Card>;
    }

    return (
        <div className="space-y-6">
             <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onAddTask={handleAddTask}
                projects={projects}
                users={users}
                user={user}
                addToast={addToast}
            />
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    user={user}
                    projectName={projectsMap.get(selectedTask.projectId) || ''}
                    personnel={users}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                    onAddComment={handleAddComment}
                />
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">All Company Tasks</h2>
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
                <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm p-3 rounded-b-lg flex flex-wrap items-center gap-4 animate-card-enter shadow-lg">
                    <span className="font-semibold text-sm">{selectedTaskIds.size} selected</span>
                    <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as TodoStatus)} className="p-1.5 border rounded-md text-sm bg-white">
                        <option value="">Change Status...</option>
                        {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value as TodoPriority)} className="p-1.5 border rounded-md text-sm bg-white">
                        <option value="">Change Priority...</option>
                         {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                     <select value={bulkAssigneeId} onChange={e => setBulkAssigneeId(e.target.value)} className="p-1.5 border rounded-md text-sm bg-white">
                        <option value="">Assign to...</option>
                        <option value="unassigned">Unassigned</option>
                         {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <div className="flex-grow flex justify-end gap-2">
                         <Button size="sm" variant="secondary" onClick={() => setSelectedTaskIds(new Set())}>Clear</Button>
                         <Button size="sm" isLoading={isApplyingBulkAction} onClick={handleApplyBulkActions}>Apply</Button>
                    </div>
                </div>
            )}
            <Card>
                <div className="flex flex-wrap items-end gap-4 mb-4 pb-4 border-b">
                     <div className="flex-grow min-w-[250px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Tasks</label>
                        <input
                            type="text"
                            placeholder="Search name, project, assignee, or ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select
                            value={filters.projectId}
                            onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}
                            className="w-full p-2 border border-gray-300 bg-white rounded-md"
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                        <select
                             value={filters.assigneeId}
                             onChange={e => setFilters(f => ({ ...f, assigneeId: e.target.value }))}
                             className="w-full p-2 border border-gray-300 bg-white rounded-md"
                        >
                            <option value="all">All Assignees</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                     <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                             value={filters.status}
                             onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                             className="w-full p-2 border border-gray-300 bg-white rounded-md"
                        >
                            <option value="open">Open</option>
                            <option value="done">Done</option>
                            <option value="all">All Statuses</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {canManageTasks && (
                                    <th className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                            checked={isAllVisibleSelected}
                                            onChange={handleSelectAll}
                                            aria-label="Select all visible tasks"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                     <button onClick={() => handleSort('text')} className="flex items-center gap-1 group">
                                        Task <SortIcon sortKey="text" sortConfig={sortConfig} />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                     <button onClick={() => handleSort('project')} className="flex items-center gap-1 group">
                                        Project <SortIcon sortKey="project" sortConfig={sortConfig} />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                     <button onClick={() => handleSort('assignee')} className="flex items-center gap-1 group">
                                        Assignee <SortIcon sortKey="assignee" sortConfig={sortConfig} />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                     <button onClick={() => handleSort('dueDate')} className="flex items-center gap-1 group">
                                        Due Date <SortIcon sortKey="dueDate" sortConfig={sortConfig} />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                     <button onClick={() => handleSort('priority')} className="flex items-center gap-1 group">
                                        Priority <SortIcon sortKey="priority" sortConfig={sortConfig} />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                     <button onClick={() => handleSort('status')} className="flex items-center gap-1 group">
                                        Status <SortIcon sortKey="status" sortConfig={sortConfig} />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSortedTasks.map(task => {
                                const isOverdue = task.dueDate && new Date(new Date(task.dueDate).setHours(0,0,0,0)) < new Date(new Date().setHours(0,0,0,0)) && task.status !== TodoStatus.DONE;
                                return (
                                <tr key={task.id} className={`hover:bg-slate-50 ${selectedTaskIds.has(task.id) ? 'bg-sky-50' : ''}`}>
                                    {canManageTasks && (
                                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                                checked={selectedTaskIds.has(task.id)}
                                                onChange={() => handleSelectTask(task.id)}
                                                aria-label={`Select task: ${task.text}`}
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4 font-medium text-slate-900 cursor-pointer" onClick={() => setSelectedTask(task)}>{task.text}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{projectsMap.get(task.projectId) || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{usersMap.get(task.assigneeId || -1) || 'Unassigned'}</td>
                                    <td className={`px-6 py-4 text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm"><PriorityDisplay priority={task.priority} /></td>
                                    <td className="px-6 py-4 text-sm"><TodoStatusBadge status={task.status} /></td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {filteredAndSortedTasks.length === 0 && (
                        <p className="text-center py-8 text-slate-500">No tasks match the current filters.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};