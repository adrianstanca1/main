import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Todo, Project, Permission, TodoStatus, TodoPriority, SubTask, Comment } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { hasPermission } from '../services/auth';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { Button } from './ui/Button';

interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

const TaskDetailModal: React.FC<{
    task: Todo;
    user: User;
    projects: Project[];
    personnel: User[];
    onClose: () => void;
    onUpdateTask: (task: Todo, updates: Partial<Todo>) => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ task, user, projects, personnel, onClose, onUpdateTask, addToast }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableTask, setEditableTask] = useState<Todo>(task);

    useEffect(() => { setEditableTask(task); }, [task]);

    const canManage = hasPermission(user, Permission.MANAGE_TASKS);
    const isTaskDone = task.status === TodoStatus.DONE;
    
    const handleFieldChange = (field: keyof Todo, value: any) => setEditableTask(prev => ({ ...prev, [field]: value }));
    const handleSave = () => { onUpdateTask(task, editableTask); setIsEditing(false); };
    const handleCancel = () => { setEditableTask(task); setIsEditing(false); };
    
    const handleSubtaskChange = (id: number, field: 'text' | 'isCompleted', value: string | boolean) => {
        setEditableTask(prev => ({
            ...prev,
            subTasks: (prev.subTasks || []).map(st => {
                if (st.id === id) {
                    const updatedSubtask = { ...st };
                    if (field === 'text' && typeof value === 'string') {
                        updatedSubtask.text = value;
                    } else if (field === 'isCompleted' && typeof value === 'boolean') {
                        updatedSubtask.isCompleted = value;
                    }
                    return updatedSubtask;
                }
                return st;
            })
        }));
    };
    
    const handleAddSubtask = () => {
        const newSubtask: SubTask = { id: Date.now(), text: '', isCompleted: false };
        setEditableTask(prev => ({ ...prev, subTasks: [...(prev.subTasks || []), newSubtask] }));
    };
    
    const handleDeleteSubtask = (id: number) => {
        setEditableTask(prev => ({ ...prev, subTasks: (prev.subTasks || []).filter(st => st.id !== id) }));
    };

    const subtaskProgress = useMemo(() => {
        const subTasks = editableTask.subTasks || [];
        if (subTasks.length === 0) return 0;
        const completed = subTasks.filter(st => st.isCompleted).length;
        return (completed / subTasks.length) * 100;
    }, [editableTask.subTasks]);
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                 <div className="flex justify-between items-start mb-2">
                    {isEditing ? (
                        <input type="text" value={editableTask.text} onChange={(e) => handleFieldChange('text', e.target.value)} className="text-xl font-bold w-full -ml-1 p-1 rounded-md border" />
                    ) : (
                        <h3 className="text-xl font-bold">{task.text}</h3>
                    )}
                    
                    {!isEditing && canManage && !isTaskDone && (
                        <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>
                <p className="text-sm text-slate-500 mb-4">in project: {projects.find(p => p.id === task.projectId)?.name}</p>

                {/* Body */}
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {/* Details Section */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {/* Fields would be editable inputs in 'isEditing' mode */}
                        <div><span className="font-semibold">Assignee:</span> {personnel.find(p => p.id === task.assigneeId)?.name || 'Unassigned'}</div>
                        <div><span className="font-semibold">Priority:</span> <PriorityDisplay priority={task.priority} /></div>
                        <div><span className="font-semibold">Due Date:</span> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}</div>
                        <div><span className="font-semibold">Reporter:</span> {personnel.find(p => p.id === task.creatorId)?.name}</div>
                    </div>

                    {/* Subtasks Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="font-semibold">Sub-tasks ({editableTask.subTasks?.filter(s => s.isCompleted).length || 0} / {editableTask.subTasks?.length || 0})</h4>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${subtaskProgress}%` }}></div>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {(isEditing ? editableTask.subTasks : task.subTasks)?.map((subtask) => (
                                <div key={subtask.id} className="flex items-center gap-3 p-1 rounded-md group hover:bg-slate-50">
                                    <input 
                                        type="checkbox" 
                                        checked={subtask.isCompleted}
                                        disabled={!isEditing || isTaskDone}
                                        onChange={(e) => handleSubtaskChange(subtask.id, 'isCompleted', e.target.checked)}
                                        className="h-4 w-4 rounded text-green-600 focus:ring-green-500"
                                    />
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={subtask.text}
                                            onChange={(e) => handleSubtaskChange(subtask.id, 'text', e.target.value)}
                                            className="flex-grow p-1 border rounded text-sm bg-white"
                                        />
                                    ) : (
                                        <span className={`flex-grow text-sm ${subtask.isCompleted ? 'line-through text-slate-500' : ''}`}>
                                            {subtask.text}
                                        </span>
                                    )}
                                    {isEditing && (
                                        <button onClick={() => handleDeleteSubtask(subtask.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {isEditing && !isTaskDone && (
                            <Button size="sm" variant="secondary" onClick={handleAddSubtask} className="mt-2">Add Sub-task</Button>
                        )}
                    </div>

                    {/* Comments Section would go here */}
                </div>
                {/* Footer */}
                {isEditing ? (
                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                ) : (
                     <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button variant="secondary" onClick={onClose}>Close</Button>
                    </div>
                )}
            </Card>
        </div>
    );
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({ user, addToast, isOnline }) => {
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);

    const [projectFilter, setProjectFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('open'); // 'open' or 'all'
    const [selectedTasks, setSelectedTasks] = useState<Set<number | string>>(new Set());

    const [bulkStatus, setBulkStatus] = useState<TodoStatus | ''>('');
    const [bulkPriority, setBulkPriority] = useState<TodoPriority | ''>('');
    const [bulkAssignee, setBulkAssignee] = useState<string>('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const canManage = hasPermission(user, Permission.MANAGE_TASKS);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;

            const userProjects = hasPermission(user, Permission.VIEW_ALL_PROJECTS)
                ? await api.getProjectsByCompany(user.companyId)
                : await api.getProjectsByUser(user.id);
            
            const projectIds = userProjects.map(p => p.id);
            
            if (projectIds.length > 0) {
                const [tasksData, personnelData] = await Promise.all([
                    api.getTodosByProjectIds(projectIds),
                    api.getUsersByCompany(user.companyId)
                ]);
                setTasks(tasksData);
                setPersonnel(personnelData);
            }
            
            setProjects(userProjects);

        } catch (error) {
            addToast("Failed to load tasks.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleUpdateTask = async (task: Todo, updates: Partial<Todo>) => {
        const originalTasks = [...tasks];
        const updatedTask = { ...task, ...updates };

        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
        if (selectedTask?.id === task.id) setSelectedTask(updatedTask);

        try {
            await api.updateTodo(task.id, updates, user.id);
            addToast("Task updated.", 'success');
        } catch (error) {
            setTasks(originalTasks);
            if(selectedTask?.id === task.id) setSelectedTask(task);
            addToast("Failed to update task.", 'error');
        }
    };
    
    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
    const userMap = useMemo(() => new Map(personnel.map(u => [u.id, u.name])), [personnel]);
    
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const projectMatch = projectFilter === 'all' || task.projectId.toString() === projectFilter;
            const assigneeMatch = assigneeFilter === 'all' || task.assigneeId?.toString() === assigneeFilter;
            const statusMatch = statusFilter === 'all' || (statusFilter === 'open' && task.status !== TodoStatus.DONE);
            return projectMatch && assigneeMatch && statusMatch;
        });
    }, [tasks, projectFilter, assigneeFilter, statusFilter]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allVisibleIds = new Set(filteredTasks.map(t => t.id));
            setSelectedTasks(allVisibleIds);
        } else {
            setSelectedTasks(new Set());
        }
    };

    const handleSelectOne = (taskId: number | string, isSelected: boolean) => {
        const newSelection = new Set(selectedTasks);
        if (isSelected) {
            newSelection.add(taskId);
        } else {
            newSelection.delete(taskId);
        }
        setSelectedTasks(newSelection);
    };

    const handleApplyBulkActions = async () => {
        if (selectedTasks.size === 0) return;

        const updates: Partial<Todo> = {};
        if (bulkStatus) updates.status = bulkStatus;
        if (bulkPriority) updates.priority = bulkPriority;
        if (bulkAssignee) updates.assigneeId = bulkAssignee === 'unassigned' ? null : parseInt(bulkAssignee, 10);

        if (Object.keys(updates).length === 0) {
            addToast("No bulk action selected.", "error");
            return;
        }
        
        setIsBulkUpdating(true);
        addToast(`Applying updates to ${selectedTasks.size} tasks...`, 'success');

        const updatePromises = Array.from(selectedTasks).map(taskId => 
            api.updateTodo(taskId, updates, user.id)
        );

        try {
            const updatedTasks = await Promise.all(updatePromises);
            const updatedTasksMap = new Map(updatedTasks.map(t => [t.id, t]));
            setTasks(currentTasks => currentTasks.map(t => updatedTasksMap.get(t.id) || t));
            addToast("Bulk update successful!", "success");
        } catch (error) {
            addToast("Bulk update failed.", "error");
        } finally {
            setSelectedTasks(new Set());
            setBulkStatus('');
            setBulkPriority('');
            setBulkAssignee('');
            setIsBulkUpdating(false);
        }
    };

    if (loading) {
        return <Card><p>Loading all tasks...</p></Card>;
    }
    
    return (
        <div className="space-y-6">
            {selectedTask && <TaskDetailModal 
                task={selectedTask}
                user={user}
                projects={projects}
                personnel={personnel}
                onClose={() => setSelectedTask(null)}
                onUpdateTask={handleUpdateTask}
                addToast={addToast}
            />}

            <h2 className="text-3xl font-bold text-slate-800">All Tasks</h2>

            {selectedTasks.size > 0 && canManage && (
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-3 rounded-lg shadow-md border flex flex-wrap items-center gap-4 animate-card-enter">
                    <span className="font-semibold text-sm">{selectedTasks.size} selected</span>
                    <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as TodoStatus)} className="p-2 border rounded-md text-sm bg-white">
                        <option value="">Change Status...</option>
                        {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                     <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value as TodoPriority)} className="p-2 border rounded-md text-sm bg-white">
                        <option value="">Change Priority...</option>
                        {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                     <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)} className="p-2 border rounded-md text-sm bg-white">
                        <option value="">Assign to...</option>
                        <option value="unassigned">Unassigned</option>
                        {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Button onClick={handleApplyBulkActions} size="sm" isLoading={isBulkUpdating}>Apply</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTasks(new Set())}>Clear</Button>
                </div>
            )}

            <Card>
                <div className="flex flex-wrap gap-4 p-4 border-b">
                    <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="p-2 border rounded-md">
                        <option value="all">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="p-2 border rounded-md">
                        <option value="all">All Assignees</option>
                        {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md">
                        <option value="open">Open Tasks</option>
                        <option value="all">All Tasks</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input 
                                        type="checkbox"
                                        checked={selectedTasks.size > 0 && selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                                        onChange={handleSelectAll} 
                                        className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Task</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assignee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTasks.has(task.id)}
                                            onChange={e => handleSelectOne(task.id, e.target.checked)}
                                            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium cursor-pointer" onClick={() => setSelectedTask(task)}>{task.text}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{projectMap.get(task.projectId)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{task.assigneeId ? userMap.get(task.assigneeId) : 'Unassigned'}</td>
                                    <td className="px-6 py-4 text-sm"><PriorityDisplay priority={task.priority} /></td>
                                    <td className="px-6 py-4 text-sm">{task.status}</td>
                                    <td className="px-6 py-4 text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredTasks.length === 0 && <p className="text-center text-slate-500 py-10">No tasks match your filters.</p>}
            </Card>
        </div>
    );
};