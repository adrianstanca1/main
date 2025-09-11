import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, Todo, User, Permission, TodoStatus, TodoPriority, Comment, SubTask, Role } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { hasPermission } from '../services/auth';
import { queueAction, cacheTasks, getCachedTasks } from '../hooks/useOfflineSync';
import { TodoStatusBadge } from './ui/StatusBadge';
import { AssigneeSelector } from './ui/AssigneeSelector';


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

const TaskDetailModal: React.FC<{
    task: Todo;
    user: User;
    projectName: string;
    personnel: User[];
    allTodos: Todo[];
    onClose: () => void;
    onUpdateSubtask: (subtaskId: number, completed: boolean) => void;
    onAddComment: (text: string) => Promise<void>;
    onUpdateTask: (updates: Partial<Todo>) => void;
}> = ({ task, user, projectName, personnel, allTodos, onClose, onUpdateSubtask, onAddComment, onUpdateTask }) => {
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const userMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);

    const canApprove = hasPermission(user, Permission.APPROVE_TASKS);
    const canManage = hasPermission(user, Permission.MANAGE_TASKS);

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
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

    const completedSubtasks = useMemo(() => task.subTasks?.filter(st => st.completed).length || 0, [task.subTasks]);
    const totalSubtasks = useMemo(() => task.subTasks?.length || 0, [task.subTasks]);
    const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold mb-2">{task.text}</h3>
                        <p className="text-sm text-slate-500 mb-4">in project: {projectName}</p>
                    </div>
                    <TodoStatusBadge status={task.status} />
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {canManage && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Assignees</h4>
                            <AssigneeSelector
                                personnel={personnel}
                                assignedIds={task.assigneeIds || []}
                                onAssignmentChange={(newIds) => onUpdateTask({ assigneeIds: newIds })}
                            />
                        </div>
                    )}
                    {canManage && (
                         <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Dependency</h4>
                            {currentParent ? (
                                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-md text-sm">
                                    <div className="flex items-center gap-2">
                                        <span>Blocks: <span className="font-medium">{currentParent.text}</span></span>
                                        <TodoStatusBadge status={currentParent.status} />
                                    </div>
                                    <button onClick={() => onUpdateTask({ dependsOn: undefined })} className="text-red-500 text-xs font-semibold hover:underline">Remove</button>
                                </div>
                            ) : (
                                <select onChange={e => onUpdateTask({ dependsOn: e.target.value ? (typeof e.target.value === 'string' && e.target.value.startsWith('offline_') ? e.target.value : parseInt(e.target.value, 10)) : undefined })} value={task.dependsOn || ''} className="w-full p-2 border rounded-md bg-white">
                                    <option value="">None</option>
                                    {possibleParents.map(p => (
                                        <option key={p.id as string} value={p.id as string}>Task #{typeof p.id === 'number' ? p.id.toString().slice(-4) : '...'}: {p.text}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                    {task.subTasks && task.subTasks.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-slate-700">Sub-tasks</h4>
                                <span className="text-sm text-slate-500">{completedSubtasks} / {totalSubtasks}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                                <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${subtaskProgress}%` }}></div>
                            </div>
                            <div className="space-y-2">
                                {task.subTasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-md">
                                        <input type="checkbox" id={`subtask-${st.id}`} checked={st.completed} onChange={() => onUpdateSubtask(st.id, !st.completed)} className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" aria-label={st.text} />
                                        <label htmlFor={`subtask-${st.id}`} className={`flex-grow ${st.completed ? 'line-through text-slate-500' : ''}`}>{st.text}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Comments</h4>
                        <div className="space-y-3">
                            {task.comments?.map(comment => (
                                <div key={comment.id} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
                                        {getInitials(userMap.get(comment.creatorId)?.name || '?')}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 text-sm mb-1">
                                            <span className="font-semibold">{userMap.get(comment.creatorId)?.name || '...'}</span>
                                            <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="bg-slate-100 p-2 rounded-lg text-slate-800 whitespace-pre-wrap">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                             {(!task.comments || task.comments.length === 0) && <p className="text-sm text-slate-400">No comments yet.</p>}
                        </div>
                    </div>
                </div>
                 {task.status === TodoStatus.PENDING_APPROVAL && canApprove && (
                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                        <Button variant="danger" onClick={() => onUpdateTask({ status: TodoStatus.IN_PROGRESS })}>Needs Revision</Button>
                        <Button variant="success" onClick={() => onUpdateTask({ status: TodoStatus.DONE })}>Approve Task</Button>
                    </div>
                )}
                <form onSubmit={handleCommentSubmit} className="mt-4 pt-4 border-t flex gap-2">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="w-full p-2 border rounded-md resize-none" rows={2} disabled={isCommenting} />
                    <Button type="submit" isLoading={isCommenting} disabled={!newComment.trim()}>Send</Button>
                </form>
            </Card>
        </div>
    );
};

const ProjectInformationCard: React.FC<{ project: Project }> = ({ project }) => {
    const infoItems = [
        { icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, label: 'Project Name', value: project.name },
        { icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Address', value: project.location.address },
        { icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, label: 'Start Date', value: new Date(project.startDate).toLocaleDateString() },
        { icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>, label: 'Project Type', value: project.projectType },
        { icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, label: 'Work Classification', value: project.workClassification },
    ];
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Project Information</h3>
                <Button variant="ghost" size="sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                    Edit
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {infoItems.map(item => (
                    <div key={item.label} className="flex items-start gap-4">
                        <div className="flex-shrink-0 text-slate-500">{item.icon}</div>
                        <div>
                            <p className="text-sm text-slate-500">{item.label}</p>
                            <p className="font-medium text-slate-800">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const ProjectHeader: React.FC<{
    project: Project;
    personnelCount: number;
    canInvite: boolean;
    onBack: () => void;
}> = ({ project, personnelCount, canInvite, onBack }) => {
    const statusStyles: Record<Project['status'], string> = { 
        'Active': 'bg-green-500/90', 
        'On Hold': 'bg-yellow-500/90', 
        'Completed': 'bg-slate-500/90' 
    };

    return (
        <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-lg -mx-6 lg:-mx-8 mt-[-1.5rem] lg:mt-[-2rem]">
            <img src={project.imageUrl} alt={project.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute top-4 left-4 z-10">
                <Button variant="secondary" onClick={onBack} className="bg-white/20 text-white hover:bg-white/30 border-white/30">
                    &larr; Back to Projects
                </Button>
            </div>
             {canInvite && (
                 <div className="absolute top-4 right-4 z-10">
                    <Button variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-white/30">
                        Invite to Project
                    </Button>
                 </div>
            )}
            <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                <div className="flex justify-between items-end">
                    <div>
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full uppercase mb-2 ${statusStyles[project.status]}`}>{project.status}</span>
                        <h2 className="text-3xl md:text-4xl font-bold" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.7)'}}>{project.name}</h2>
                        <div className="flex items-center gap-2 mt-1 text-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            <span>{project.location.address}</span>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6.07 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 017 16v1H.93z" /></svg>
                            <span className="font-semibold">{personnelCount} Workers</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main View Component ---

interface ProjectDetailProps {
    project: Project;
    user: User;
    onBack: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    isOnline: boolean;
    onStartChat: (user: User) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailProps> = ({ project, user, onBack, addToast, isOnline, onStartChat }) => {
    const [loading, setLoading] = useState(true);
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
    
    const canManageTasks = useMemo(() => hasPermission(user, Permission.MANAGE_TASKS), [user]);
    const canInvite = useMemo(() => hasPermission(user, Permission.INVITE_PROJECT_MEMBERS), [user]);


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (isOnline) {
                if (!user.companyId) return;
                const [personnelData, todosData] = await Promise.all([
                    api.getUsersByProject(project.id, user.companyId),
                    api.getTodosByProject(project.id),
                ]);
                setPersonnel(personnelData);
                setTodos(todosData);
                cacheTasks(project.id, todosData);
            } else {
                addToast("Offline: Displaying cached task data.", 'success');
                const cachedTodos = getCachedTasks(project.id) || [];
                setTodos(cachedTodos);
                setPersonnel([]);
            }
        } catch (error) {
            addToast('Failed to load project details.', 'error');
        } finally {
            setLoading(false);
        }
    }, [project.id, user.companyId, addToast, isOnline]);

    useEffect(() => {
        fetchData();
        const handleDataChanged = () => fetchData();
        window.addEventListener('datachanged', handleDataChanged);
        return () => window.removeEventListener('datachanged', handleDataChanged);
    }, [fetchData]);
    
    const handleAddTask = async (taskData: { text: string; priority: TodoPriority; status: TodoStatus; }) => {
       const taskPayload = { ...taskData, projectId: project.id, creatorId: user.id };
        if (isOnline) {
            const newTask = await api.addTodo(taskPayload, user.id);
            setTodos(prev => [newTask, ...prev]);
            addToast('Task added!', 'success');
        } else {
            const tempId = `offline_${Date.now()}`;
            const optimisticTask: Todo = { ...taskData, id: tempId, createdAt: new Date(), isOffline: true, projectId: project.id, creatorId: user.id };
            setTodos(prev => [optimisticTask, ...prev]);
            queueAction({ type: 'ADD_TODO', payload: taskPayload, projectId: project.id });
            addToast('Task saved locally.', 'success');
        }
    };
    
    const handleUpdateTodo = async (todoId: number | string, updates: Partial<Todo>) => {
        if (updates.status === TodoStatus.DONE && user.role === Role.OPERATIVE) {
            updates.status = TodoStatus.PENDING_APPROVAL;
        }

        const originalTodos = todos;
        setTodos(prev => prev.map(t => t.id === todoId ? { ...t, ...updates, isOffline: !isOnline } : t));
        if (isOnline) {
            try {
                const updatedTodo = await api.updateTodo(todoId, updates, user.id);
                // sync back with the server state in case the API modified it (e.g. status change)
                setTodos(prev => prev.map(t => t.id === todoId ? updatedTodo : t));
            } catch (error) {
                addToast(String(error), 'error');
                setTodos(originalTodos);
            }
        } else {
            queueAction({ type: 'UPDATE_TODO', payload: { id: todoId, updates, actorId: user.id }, projectId: project.id });
             addToast('Task update saved locally.', 'success');
        }
    };
    
    const handleUpdateTaskDetails = async (updates: Partial<Todo>) => {
        if (!selectedTask) return;
        const updatedTask = { ...selectedTask, ...updates };
        setSelectedTask(updatedTask);
        await handleUpdateTodo(selectedTask.id, updates);
    };

    const handleUpdateSubtask = async (subtaskId: number, completed: boolean) => {
        if (!selectedTask) return;
        const originalTask = { ...selectedTask };
        const updatedSubtasks = originalTask.subTasks?.map(st => st.id === subtaskId ? { ...st, completed } : st) || [];
        const allSubtasksDone = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
        const updates: Partial<Todo> = { subTasks: updatedSubtasks };
        if (allSubtasksDone && originalTask.status !== TodoStatus.DONE) {
            updates.status = TodoStatus.DONE;
        } else if (!allSubtasksDone && originalTask.status === TodoStatus.DONE) {
            updates.status = TodoStatus.IN_PROGRESS;
        }
        const updatedTaskState = { ...originalTask, ...updates };
        setSelectedTask(updatedTaskState);
        setTodos(prev => prev.map(t => t.id === originalTask.id ? updatedTaskState : t));
        try {
            await api.updateTodo(originalTask.id, updates, user.id);
            addToast('Sub-task updated.', 'success');
        } catch (error) {
            addToast('Failed to update sub-task.', 'error');
            setSelectedTask(originalTask);
            setTodos(prev => prev.map(t => t.id === originalTask.id ? originalTask : t));
        }
    };

    const handleAddComment = async (text: string) => {
        if (!selectedTask) return;
        const newComment = await api.addComment(selectedTask.id, text, user.id);
        const updatedTask = { ...selectedTask, comments: [...(selectedTask.comments || []), newComment] };
        setSelectedTask(updatedTask);
        setTodos(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        addToast('Comment added.', 'success');
    };
    
    return (
        <div className="relative pb-24">
            {isAddTaskModalOpen && <AddTaskModal onClose={() => setIsAddTaskModalOpen(false)} onAdd={handleAddTask} />}
            {selectedTask && <TaskDetailModal task={selectedTask} user={user} projectName={project.name} personnel={personnel} allTodos={todos} onClose={() => setSelectedTask(null)} onUpdateSubtask={handleUpdateSubtask} onAddComment={handleAddComment} onUpdateTask={handleUpdateTaskDetails} />}
            
            <ProjectHeader project={project} personnelCount={personnel.length} canInvite={canInvite} onBack={onBack} />
            
            <div className="space-y-8 mt-8">
                <ProjectInformationCard project={project} />
                <div>
                     <h3 className="text-2xl font-bold mb-4">Task Board</h3>
                     {loading ? (
                        <Card><p>Loading tasks...</p></Card>
                    ) : (
                        <KanbanBoard todos={todos} allTodos={todos} personnel={personnel} onUpdateTaskStatus={(id, status) => handleUpdateTodo(id, { status })} onSelectTask={setSelectedTask} onAddTask={async () => {}} canManageTasks={canManageTasks} />
                    )}
                </div>
            </div>

            {canManageTasks && (
                <div className="fixed bottom-8 right-8 z-40">
                    <Button size="lg" onClick={() => setIsAddTaskModalOpen(true)} className="rounded-full h-16 w-16 shadow-lg" aria-label="Add new task">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </Button>
                </div>
            )}
        </div>
    );
};