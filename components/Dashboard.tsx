import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// FIX: Removed DailyLog as it is not defined in types.ts. Added Comment to resolve name collision with DOM type.
import { User, View, Project, Role, Timesheet, Todo, Permission, FinancialKPIs, PendingApproval, TimesheetStatus, Document, DocumentCategory, DocumentAcknowledgement, TodoStatus, Comment, SubTask, WorkType, AuditLog, AuditLogAction, Equipment, OperativeReport, WeatherForecast, Announcement, TodoPriority } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PrincipalAdminDashboard } from './PrincipalAdminDashboard';
import { hasPermission } from '../services/auth';
import { useGeolocation } from '../hooks/useGeolocation';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { TimesheetStatusBadge } from './ui/StatusBadge';
import { ReminderControl } from './ReminderControl';

// --- TASK DETAIL MODAL ---
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
                    {/* Task Details Section */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pb-4 border-b">
                         {isEditing && (
                             <>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                                    <select value={editableTask.status} onChange={(e) => handleFieldChange('status', e.target.value as TodoStatus)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                        {/* FIX: Use String() for enum keys in map to prevent potential type errors. */}
                                        {Object.values(TodoStatus).map(s => <option key={String(s)} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Priority</label>
                                    <select value={editableTask.priority} onChange={(e) => handleFieldChange('priority', e.target.value as TodoPriority)} className="w-full p-1.5 border rounded-md bg-white mt-1 text-sm">
                                        {/* FIX: Use String() for enum keys in map to prevent potential type errors. */}
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


// --- Submit Report Modal ---
const SubmitReportModal: React.FC<{
    user: User;
    projectId: number;
    onClose: () => void;
    onSubmit: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, projectId, onClose, onSubmit, addToast }) => {
    const [notes, setNotes] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notes.trim() && !photoFile) {
            addToast('Please add notes or a photo to your report.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await api.submitOperativeReport({
                projectId,
                userId: user.id,
                notes,
                photoFile: photoFile || undefined,
            });
            addToast('Report submitted successfully!', 'success');
            onSubmit();
            onClose();
        } catch (error) {
            addToast('Failed to submit report.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Submit Site Report</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="w-full p-2 border rounded-md" placeholder="e.g., Completed framing on floor 3. No incidents. Material delivery expected tomorrow." />
                    </div>
                     <div>
                        <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">Attach Photo</label>
                         <input type="file" id="photo" accept="image/*" capture onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>Submit Report</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

// --- Send Announcement Modal ---
const SendAnnouncementModal: React.FC<{
    user: User;
    onClose: () => void;
    onSent: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, onClose, onSent, addToast }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!title.trim() || !content.trim()) {
            addToast('Title and content are required.', 'error');
            return;
        }
        setIsSending(true);
        try {
            await api.sendAnnouncement({
                senderId: user.id,
                scope: 'company',
                companyId: user.companyId,
                title,
                content
            }, user.id);
            addToast('Company announcement sent!', 'success');
            onSent();
            onClose();
        } catch (error) {
            addToast('Failed to send announcement.', 'error');
        } finally {
            setIsSending(false);
        }
    };

     return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Send Company Announcement</h3>
                <form onSubmit={handleSend} className="space-y-4">
                     <div>
                        <label htmlFor="ann-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input id="ann-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md" required/>
                    </div>
                     <div>
                        <label htmlFor="ann-content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                        <textarea id="ann-content" value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full p-2 border rounded-md" required/>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSending}>Send Announcement</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


interface DashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; description: string; }> = ({ title, value, description }) => (
    <Card>
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
    </Card>
);

const ProjectCard: React.FC<{ project: Project; onSelect: () => void }> = ({ project, onSelect }) => {
    const progress = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0;
    return (
        <Card onClick={onSelect} className="cursor-pointer hover:shadow-lg hover:border-green-500/50 transition-all duration-300 flex flex-col">
            {project.imageUrl && <img src={project.imageUrl} alt={project.name} className="w-full h-40 object-cover rounded-t-lg -m-6 mb-4" />}
            <div className="flex-grow">
                <h3 className="font-bold text-lg text-slate-800">{project.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{project.location.address}</p>
            </div>
            
            <div className="text-xs text-slate-600">
                <div className="flex justify-between mb-1">
                    <span>Budget Progress</span>
                    <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${progress > 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
            </div>
        </Card>
    );
};

const formatDistanceToNow = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

const AuditLogIcon: React.FC<{ action: AuditLogAction }> = ({ action }) => {
    const iconMap: Record<string, JSX.Element> = {
        'Task': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        'Document': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        'Timesheet': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        'Safety': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
        'Project': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    };
    const key = Object.keys(iconMap).find(k => action.toLowerCase().includes(k.toLowerCase())) || 'Project';
    return iconMap[key];
};

const TenantDashboard: React.FC<DashboardProps> = ({ user, addToast, onSelectProject, setActiveView }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [companyUsers, setCompanyUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            
            let projectsPromise: Promise<Project[]>;
            if (hasPermission(user, Permission.VIEW_ALL_PROJECTS)) {
                projectsPromise = api.getProjectsByCompany(user.companyId);
            } else if (user.role === Role.PM) {
                projectsPromise = api.getProjectsByManager(user.id);
            } else {
                projectsPromise = api.getProjectsByUser(user.id);
            }

            const [fetchedProjects, usersData, logsData, announcementData] = await Promise.all([
                projectsPromise,
                api.getUsersByCompany(user.companyId),
                api.getAuditLogsForUserProjects(user.id),
                api.getAnnouncementsForCompany(user.companyId)
            ]);

            setProjects(fetchedProjects);
            setCompanyUsers(usersData);
            setAuditLogs(logsData);
            setAnnouncements(announcementData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        } catch (error) {
            addToast("Failed to load dashboard data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const userMap = useMemo(() => new Map(companyUsers.map(u => [u.id, u])), [companyUsers]);

    if (loading) {
        return <Card><p>Loading dashboard...</p></Card>;
    }

    return (
        <div className="space-y-6">
            {isAnnouncementModalOpen && <SendAnnouncementModal user={user} onClose={() => setIsAnnouncementModalOpen(false)} onSent={fetchData} addToast={addToast} />}
            <h2 className="text-3xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}!</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                 <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-4">My Projects</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {projects.slice(0, 4).map(project => (
                                <ProjectCard key={project.id} project={project} onSelect={() => onSelectProject(project)} />
                            ))}
                        </div>
                        {projects.length === 0 && <Card><p className="text-center text-slate-500">You are not assigned to any projects yet.</p></Card>}
                        {projects.length > 4 && <Button variant="secondary" className="w-full mt-4" onClick={() => setActiveView('projects')}>View All Projects</Button>}
                    </div>
                     <Card>
                        <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {auditLogs.slice(0, 10).map(log => (
                                <div key={log.id} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                                        <AuditLogIcon action={log.action} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-800">
                                            <span className="font-semibold">{userMap.get(log.actorId)?.name || 'Unknown User'}</span> {log.action.toLowerCase().replace(/_/g, ' ')} <span className="font-semibold">{log.target?.name}</span>
                                            {log.projectId && <span className="text-slate-500"> in {projects.find(p=>p.id === log.projectId)?.name}</span>}
                                        </p>
                                        <p className="text-xs text-slate-400">{formatDistanceToNow(log.timestamp)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                           {hasPermission(user, Permission.MANAGE_PROJECTS) && <Button className="w-full" variant="secondary" onClick={() => setActiveView('projects')}>Add New Project</Button>}
                           {hasPermission(user, Permission.MANAGE_TEAM) && <Button className="w-full" variant="secondary" onClick={() => setActiveView('users')}>Manage Team</Button>}
                           {hasPermission(user, Permission.SEND_ANNOUNCEMENT) && <Button className="w-full" variant="secondary" onClick={() => setIsAnnouncementModalOpen(true)}>Send Announcement</Button>}
                        </div>
                    </Card>
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">Company Announcements</h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {announcements.map(ann => (
                                <div key={ann.id} className="border-b pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-slate-700">{ann.title}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${ann.scope === 'platform' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100'}`}>{ann.scope}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">By {userMap.get(ann.senderId)?.name || 'System'}</p>
                                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{ann.content}</p>
                                </div>
                            ))}
                             {announcements.length === 0 && <p className="text-slate-500 text-center py-4">No recent announcements.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const OperativeDashboard: React.FC<DashboardProps> = ({ user, addToast, setActiveView }) => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [acks, setAcks] = useState<DocumentAcknowledgement[]>([]);
    const [activeTimesheet, setActiveTimesheet] = useState<Timesheet | null>(null);
    const [weather, setWeather] = useState<WeatherForecast | null>(null);
    const [shiftTimer, setShiftTimer] = useState<string>('00:00:00');
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [companyUsers, setCompanyUsers] = useState<User[]>([]);
    
    const activeProject = useMemo(() => {
        if (!activeTimesheet) return null;
        return projects.find(p => p.id === activeTimesheet.projectId);
    }, [activeTimesheet, projects]);

    const fetchData = useCallback(async () => {
        if (!user.companyId) return;
        try {
            const [userProjects, timesheetsData, usersData] = await Promise.all([
                api.getProjectsByUser(user.id),
                api.getTimesheetsByUser(user.id),
                api.getUsersByCompany(user.companyId),
            ]);

            setProjects(userProjects);
            setCompanyUsers(usersData);

            const currentActiveTimesheet = timesheetsData.find(t => t.clockOut === null) || null;
            setActiveTimesheet(currentActiveTimesheet);
            
            const activeProj = userProjects.find(p => p.id === currentActiveTimesheet?.projectId);
            if (activeProj) {
                const weatherData = await api.getWeatherForecast(activeProj.location.lat, activeProj.location.lng);
                setWeather(weatherData);
            } else {
                setWeather(null);
            }
            
            const projectIds = userProjects.map(p => p.id);
            if (projectIds.length > 0) {
                 const [tasksData, docsData, acksData] = await Promise.all([
                    api.getTodosByProjectIds(projectIds),
                    api.getDocumentsByProjectIds(projectIds),
                    api.getDocumentAcksForUser(user.id),
                ]);
                setTasks(tasksData);
                setDocuments(docsData);
                setAcks(acksData);
            }
        } catch (error) {
            addToast("Failed to load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.id, user.companyId, addToast]);


    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let timerId: number;
        if (activeTimesheet) {
            timerId = window.setInterval(() => {
                const now = new Date();
                const clockInTime = new Date(activeTimesheet.clockIn);
                const diff = now.getTime() - clockInTime.getTime();
                const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
                const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
                const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
                setShiftTimer(`${hours}:${minutes}:${seconds}`);
            }, 1000);
        }
        return () => window.clearInterval(timerId);
    }, [activeTimesheet]);
    
    const unacknowledgedDocs = useMemo(() => {
        return documents.filter(doc => doc.category === DocumentCategory.HS && !acks.some(ack => ack.documentId === doc.id));
    }, [documents, acks]);

    const openTasks = useMemo(() => {
        const userProjectIds = new Set(projects.map(p => p.id));
        return tasks.filter(t => t.status !== TodoStatus.DONE && userProjectIds.has(t.projectId)).sort((a, b) => {
            const priorityOrder = { [TodoStatus.IN_PROGRESS]: 1, [TodoStatus.TODO]: 2 };
            return (priorityOrder[a.status] || 3) - (priorityOrder[b.status] || 3);
        });
    }, [tasks, projects]);

    const handleUpdateTaskStatus = async (taskId: number | string, newStatus: TodoStatus) => {
        try {
            const updatedTask = await api.updateTodo(taskId, { status: newStatus }, user.id);
            setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
            if (selectedTask?.id === taskId) {
                setSelectedTask(updatedTask);
            }
            addToast('Task status updated.', 'success');
        } catch (error) {
            addToast('Failed to update task status.', 'error');
        }
    };

     const handleUpdateTask = async (updates: Partial<Todo>) => {
        if (!selectedTask) return;
        try {
            const updatedTask = await api.updateTodo(selectedTask.id, updates, user.id);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
            setSelectedTask(updatedTask); // Keep modal updated
            addToast('Task updated.', 'success');
        } catch (error) {
            addToast('Failed to update task.', 'error');
        }
    };
    
    const handleAcknowledgeDoc = async (docId: number) => {
        try {
            const ack = await api.acknowledgeDocument(user.id, docId);
            setAcks(prev => [...prev, ack]);
            addToast("Document acknowledged.", "success");
        } catch (error) {
            addToast("Failed to acknowledge document.", "error");
        }
    };

    const handleOpenTaskModal = (task: Todo) => setSelectedTask(task);
    
    const handleAddComment = async (text: string) => {
        if (!selectedTask) return;
        const newComment = await api.addComment(selectedTask.id, text, user.id);
        const updatedComments = [...(selectedTask.comments || []), newComment];
        // FIX: The `newComment` object from the API is now correctly typed, resolving this state update error.
        const updatedTask = { ...selectedTask, comments: updatedComments };
        setSelectedTask(updatedTask);
        // FIX: The updated task object is now correctly typed, resolving this state update error.
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    };

    if (loading) return <Card><p>Loading your dashboard...</p></Card>;

    return (
        <div className="space-y-6">
            {selectedTask && <TaskDetailModal 
                task={selectedTask} 
                user={user} 
                projectName={projects.find(p => p.id === selectedTask.projectId)?.name || ''} 
                personnel={companyUsers}
                onClose={() => setSelectedTask(null)} 
                onAddComment={handleAddComment} 
                onUpdateTask={handleUpdateTask}
                onReminderUpdate={fetchData}
                addToast={addToast}
            />}
            {isReportModalOpen && activeProject && <SubmitReportModal user={user} projectId={activeProject.id} onClose={() => setIsReportModalOpen(false)} onSubmit={fetchData} addToast={addToast} />}
            
            <h2 className="text-3xl font-bold text-slate-800">Operative Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {/* Column 1: Actions */}
                <div className="space-y-6">
                    {weather && activeProject && (
                        <Card className="flex items-center gap-4">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={weather.icon} /></svg>
                             <div>
                                <p className="text-3xl font-bold">{weather.temperature}°C</p>
                                <p className="text-slate-500">{weather.condition}</p>
                                <p className="text-xs text-slate-400">{activeProject.name}</p>
                             </div>
                        </Card>
                    )}
                    <Card>
                        <h3 className="text-lg font-semibold mb-2">Time Clock Status</h3>
                        {activeTimesheet ? (
                             <div className="space-y-4">
                                <p className="text-sm text-slate-500">
                                    Clocked into: <span className="font-medium text-slate-800">{activeProject?.name}</span>
                                </p>
                                <div className="text-center bg-slate-50 border border-slate-200 rounded-lg p-6">
                                    <p className="text-sm text-slate-500 uppercase tracking-wider">Current Shift Duration</p>
                                    <p className="text-5xl font-bold my-1 text-slate-800 tabular-nums">{shiftTimer}</p>
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-4 text-center p-6">
                                <p className="text-2xl font-semibold text-slate-800">Not Clocked In</p>
                                <p className="text-slate-500">Go to the Time section to start your shift.</p>
                             </div>
                        )}
                        <Button className="w-full mt-4" onClick={() => setActiveView('time')}>
                            Go to Time Clock
                        </Button>
                    </Card>
                    <Card>
                        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Button className="w-full" variant="secondary" onClick={() => setIsReportModalOpen(true)} disabled={!activeProject}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Submit Site Report
                            </Button>
                        </div>
                    </Card>
                </div>
                 {/* Column 2: Tasks */}
                <div className="space-y-6">
                     <Card>
                        <h3 className="text-lg font-semibold mb-4">My Open Tasks ({openTasks.length})</h3>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                             {openTasks.length > 0 ? openTasks.map(task => (
                                <div key={task.id} className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => handleOpenTaskModal(task)}>
                                    <div className="flex justify-between items-start gap-2"><p className="font-medium flex-grow">{task.text}</p>
                                        <select value={task.status} onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TodoStatus)} onClick={(e) => e.stopPropagation()} className="text-xs p-1 border rounded-md" aria-label={`Status for task ${task.text}`}><option value={TodoStatus.TODO}>To Do</option><option value={TodoStatus.IN_PROGRESS}>In Progress</option><option value={TodoStatus.DONE}>Done</option></select>
                                    </div><div className="mt-2 text-xs"><PriorityDisplay priority={task.priority} /></div>
                                </div>
                            )) : <p className="text-sm text-slate-500 text-center py-4">You have no open tasks. Great job!</p>}
                        </div>
                    </Card>
                </div>
                {/* Column 3: Information */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            Urgent Safety Briefings
                        </h3>
                        <div className="space-y-3">
                            {unacknowledgedDocs.length > 0 ? unacknowledgedDocs.map(doc => (
                                <div key={doc.id} className="p-3 border rounded-lg bg-yellow-50 flex justify-between items-center">
                                    <div><p className="font-semibold">{doc.name}</p><p className="text-xs text-slate-500">{projects.find(p => p.id === doc.projectId)?.name}</p></div>
                                    <Button size="sm" variant="secondary" onClick={() => handleAcknowledgeDoc(doc.id)}>Acknowledge</Button>
                                </div>
                            )) : <p className="text-sm text-slate-500">No outstanding safety documents to review.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = (props) => {
    if (props.user.role === Role.PRINCIPAL_ADMIN) {
        return <PrincipalAdminDashboard user={props.user} addToast={props.addToast} />;
    }
    if (props.user.role === Role.OPERATIVE) {
        return <OperativeDashboard {...props} />;
    }
    return <TenantDashboard {...props} />;
};