import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, View, Project, Role, Timesheet, Todo, Permission, FinancialKPIs, PendingApproval, TimesheetStatus, Document, DocumentCategory, DocumentAcknowledgement, TodoStatus, Comment, SubTask, WorkType, AuditLog, AuditLogAction, DailyLog, Equipment, OperativeReport, WeatherForecast, Announcement } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PrincipalAdminDashboard } from './PrincipalAdminDashboard';
import { hasPermission } from '../services/auth';
import { useGeolocation } from '../hooks/useGeolocation';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { TimesheetStatusBadge } from './ui/StatusBadge';

// --- TASK DETAIL MODAL ---
const TaskDetailModal: React.FC<{
    task: Todo;
    user: User;
    projectName: string;
    onClose: () => void;
    onUpdateSubtask: (subtaskId: number, completed: boolean) => void;
    onAddComment: (text: string) => void;
}> = ({ task, user, projectName, onClose, onUpdateSubtask, onAddComment }) => {
    const [newComment, setNewComment] = useState('');
    const [users, setUsers] = useState<Map<number, User>>(new Map());

    useEffect(() => {
        // Fetch users for comment author names
        if (user.companyId) {
            api.getUsersByCompany(user.companyId).then(userList => {
                const userMap = new Map();
                userList.forEach(u => userMap.set(u.id, u));
                setUsers(userMap);
            });
        }
    }, [user.companyId]);

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        onAddComment(newComment);
        setNewComment('');
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg h-auto max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2">{task.text}</h3>
                <p className="text-sm text-slate-500 mb-4">in project: {projectName}</p>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {/* Sub-tasks */}
                    {task.subTasks && task.subTasks.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Sub-tasks</h4>
                            <div className="space-y-2">
                                {task.subTasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-md">
                                        <input
                                            type="checkbox"
                                            id={`subtask-${st.id}`}
                                            checked={st.completed}
                                            onChange={() => onUpdateSubtask(st.id, !st.completed)}
                                            className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            aria-label={st.text}
                                        />
                                        <label htmlFor={`subtask-${st.id}`} className={`flex-grow ${st.completed ? 'line-through text-slate-500' : ''}`}>{st.text}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Comments */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Comments</h4>
                        <div className="space-y-3">
                            {task.comments?.map(comment => (
                                <div key={comment.id} className="flex flex-col items-start">
                                    <div className="flex items-center gap-2 text-sm mb-1">
                                        <span className="font-semibold">{users.get(comment.creatorId)?.name || '...'}</span>
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

const TenantDashboard: React.FC<DashboardProps> = ({ user, addToast, onSelectProject, setActiveView }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [companyUsers, setCompanyUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

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

            const [fetchedProjects, usersData, equipData, announcementData] = await Promise.all([
                projectsPromise,
                api.getUsersByCompany(user.companyId),
                api.getEquipmentByCompany(user.companyId),
                api.getAnnouncementsForCompany(user.companyId)
            ]);

            const projectIds = fetchedProjects.map(p => p.id);
            const tasksData = await api.getTodosByProjectIds(projectIds);

            setProjects(fetchedProjects);
            setCompanyUsers(usersData);
            setEquipment(equipData);
            setTasks(tasksData);
            setAnnouncements(announcementData.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));

        } catch (error) {
            addToast("Failed to load dashboard data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const equipmentInUse = equipment.filter(e => e.status === 'In Use').length;
    const totalEquipment = equipment.length;
    const utilizationRate = totalEquipment > 0 ? (equipmentInUse / totalEquipment) * 100 : 0;
    const canSendAnnouncement = hasPermission(user, Permission.SEND_ANNOUNCEMENT);

    if (loading) {
        return <Card><p>Loading dashboard...</p></Card>;
    }

    return (
        <div className="space-y-6">
            {isAnnouncementModalOpen && <SendAnnouncementModal user={user} onClose={() => setIsAnnouncementModalOpen(false)} onSent={fetchData} addToast={addToast} />}
            <h2 className="text-3xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}!</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-4">My Projects</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {projects.map(project => (
                                <ProjectCard key={project.id} project={project} onSelect={() => onSelectProject(project)} />
                            ))}
                        </div>
                        {projects.length === 0 && <Card><p className="text-center text-slate-500">You are not assigned to any projects yet.</p></Card>}
                    </div>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                           {hasPermission(user, Permission.MANAGE_PROJECTS) && <Button className="w-full" variant="secondary" onClick={() => setActiveView('projects')}>Add New Project</Button>}
                           {hasPermission(user, Permission.MANAGE_TEAM) && <Button className="w-full" variant="secondary" onClick={() => setActiveView('users')}>Manage Team</Button>}
                           {canSendAnnouncement && <Button className="w-full" variant="secondary" onClick={() => setIsAnnouncementModalOpen(true)}>Send Announcement</Button>}
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
                                    <p className="text-xs text-slate-500">By {companyUsers.find(u => u.id === ann.senderId)?.name || 'System'}</p>
                                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{ann.content}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const OperativeDashboard: React.FC<DashboardProps> = ({ user, addToast }) => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [acks, setAcks] = useState<DocumentAcknowledgement[]>([]);
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [activeTimesheet, setActiveTimesheet] = useState<Timesheet | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [shiftTimer, setShiftTimer] = useState<string>('00:00:00');
    const [isClockingIn, setIsClockingIn] = useState(false);
    const [isClockingOut, setIsClockingOut] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [weather, setWeather] = useState<WeatherForecast | null>(null);

    const { data: geoData, error: geoError, loading: geoLoading, getLocation } = useGeolocation();

    const fetchData = useCallback(async () => {
        if (!user.companyId) return;
        try {
            const userProjects = await api.getProjectsByUser(user.id);
            setProjects(userProjects);

            const timesheetsData = await api.getTimesheetsByUser(user.id);
            setTimesheets(timesheetsData);
            const currentActiveTimesheet = timesheetsData.find(t => t.clockOut === null) || null;
            setActiveTimesheet(currentActiveTimesheet);
            
            const activeProjectId = currentActiveTimesheet?.projectId;
            let projectToLoadId: number | null = activeProjectId || (userProjects.length > 0 ? userProjects[0].id : null);
            
            if (!selectedProjectId && projectToLoadId) {
                setSelectedProjectId(projectToLoadId.toString());
            } else if (selectedProjectId) {
                projectToLoadId = parseInt(selectedProjectId, 10);
            }
            
            if (projectToLoadId) {
                const [tasksData, docsData, acksData, weatherData] = await Promise.all([
                    api.getTodosByProjectIds([projectToLoadId]),
                    api.getDocumentsByProjectIds([projectToLoadId]),
                    api.getDocumentAcksForUser(user.id),
                    api.getWeatherForProject(projectToLoadId),
                ]);
                setTasks(tasksData);
                setDocuments(docsData);
                setAcks(acksData);
                setWeather(weatherData);
            } else {
                 setTasks([]);
                 setDocuments([]);
                 setAcks([]);
                 setWeather(null);
            }

        } catch (error) {
            addToast("Failed to load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.id, user.companyId, addToast, selectedProjectId]);


    useEffect(() => {
        setLoading(true);
        fetchData();
        getLocation();
    }, [fetchData, getLocation]);

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

    const { distance, isInsideGeofence } = useMemo(() => {
        const project = projects.find(p => p.id === parseInt(selectedProjectId, 10));
        if (!project || !geoData) return { distance: null, isInsideGeofence: false };
        const R = 6371e3;
        const φ1 = project.location.lat * Math.PI / 180;
        const φ2 = geoData.coords.latitude * Math.PI / 180;
        const Δφ = (geoData.coords.latitude - project.location.lat) * Math.PI / 180;
        const Δλ = (geoData.coords.longitude - project.location.lng) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return { distance: Math.round(d), isInsideGeofence: d <= project.radius };
    }, [projects, selectedProjectId, geoData]);
    
    const unacknowledgedDocs = useMemo(() => {
        return documents.filter(doc => doc.category === DocumentCategory.HS && !acks.some(ack => ack.documentId === doc.id));
    }, [documents, acks]);

    const openTasks = useMemo(() => {
        return tasks.filter(t => t.status !== TodoStatus.DONE).sort((a, b) => {
            const priorityOrder = { [TodoStatus.IN_PROGRESS]: 1, [TodoStatus.TODO]: 2 };
            return (priorityOrder[a.status] || 3) - (priorityOrder[b.status] || 3);
        });
    }, [tasks]);

    const recentTimesheets = useMemo(() => {
        return timesheets.slice(0, 4);
    }, [timesheets]);

    const handleClockIn = async () => {
        if (!selectedProjectId || !geoData) {
            addToast('Cannot determine your location or selected project.', 'error');
            return;
        }
        setIsClockingIn(true);
        try {
            await api.clockIn(user.id, parseInt(selectedProjectId, 10), {
                lat: geoData.coords.latitude,
                lng: geoData.coords.longitude,
                accuracy: geoData.coords.accuracy,
            }, WorkType.GENERAL_LABOR);
            addToast('Successfully clocked in!', 'success');
            await fetchData();
        } catch (error) {
            addToast(String(error), 'error');
        } finally {
            setIsClockingIn(false);
        }
    };

    const handleClockOut = async () => {
        if (!activeTimesheet || !geoData) return;
        setIsClockingOut(true);
        try {
            await api.clockOut(activeTimesheet.id, { lat: geoData.coords.latitude, lng: geoData.coords.longitude });
            addToast('Successfully clocked out!', 'success');
            await fetchData();
        } catch (error) {
            addToast(String(error), 'error');
        } finally {
            setIsClockingOut(false);
        }
    };
    
    const handleUpdateTaskStatus = async (taskId: number | string, newStatus: TodoStatus) => {
        try {
            await api.updateTodo(taskId, { status: newStatus }, user.id);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            addToast('Task status updated.', 'success');
        } catch (error) {
            addToast('Failed to update task status.', 'error');
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
    
    const handleUpdateSubtask = async (subtaskId: number, completed: boolean) => {
        if (!selectedTask) return;
        const updatedSubtasks = selectedTask.subTasks?.map(st => st.id === subtaskId ? { ...st, completed } : st);
        const updatedTask = await api.updateTodo(selectedTask.id, { subTasks: updatedSubtasks }, user.id);
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    };

    const handleAddComment = async (text: string) => {
        if (!selectedTask) return;
        const newComment = await api.addComment(selectedTask.id, text, user.id);
        const updatedComments = [...(selectedTask.comments || []), newComment];
        const updatedTask = { ...selectedTask, comments: updatedComments };
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    };

    const renderGeofenceStatus = () => {
        if (geoLoading) return <div className="p-3 rounded-md text-sm bg-slate-100 text-slate-600 text-center animate-pulse">Getting your location...</div>;
        if (geoError) return (
            <div className="p-3 rounded-md border bg-red-50 border-red-200 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                <div className="flex-grow"><p className="font-semibold text-red-800">Location Error</p><p className="text-xs text-red-700">{geoError.message}</p></div>
                <Button variant="ghost" size="sm" onClick={getLocation} className="flex-shrink-0">Retry</Button>
            </div>
        );
        if (distance !== null) {
            const isInside = isInsideGeofence;
            const config = {
                bgColor: isInside ? 'bg-green-50' : 'bg-yellow-50',
                borderColor: isInside ? 'border-green-200' : 'border-yellow-300',
                textColor: isInside ? 'text-green-800' : 'text-yellow-800',
                iconColor: isInside ? 'text-green-500' : 'text-yellow-500',
                title: isInside ? 'Inside Geofence' : 'Outside Geofence',
                Icon: isInside
                    ? (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    : (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
            };
            const formattedDistance = distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`;
    
            return (
                <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} flex items-center gap-4`}>
                    <config.Icon className={`h-10 w-10 flex-shrink-0 ${config.iconColor}`} />
                    <div className="flex-grow">
                        <p className={`font-bold text-lg ${config.textColor}`}>{config.title}</p>
                        <p className="text-sm text-slate-600">You are <span className="font-semibold">{formattedDistance}</span> from the site.</p>
                    </div>
                </div>
            );
        }
        return null;
    };


    if (loading) return <Card><p>Loading your dashboard...</p></Card>;
    const activeProject = projects.find(p => p.id.toString() === selectedProjectId);

    return (
        <div className="space-y-6">
            {selectedTask && <TaskDetailModal task={selectedTask} user={user} projectName={projects.find(p => p.id === selectedTask.projectId)?.name || ''} onClose={() => setSelectedTask(null)} onUpdateSubtask={handleUpdateSubtask} onAddComment={handleAddComment} />}
            {isReportModalOpen && activeProject && <SubmitReportModal user={user} projectId={activeProject.id} onClose={() => setIsReportModalOpen(false)} onSubmit={fetchData} addToast={addToast} />}
            
            <h2 className="text-3xl font-bold text-slate-800">Operative Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {/* Column 1: Actions */}
                <div className="space-y-6">
                    <Card>
                        {activeTimesheet ? (
                             <div>
                                <h3 className="text-lg font-semibold mb-2">Active Shift</h3>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">
                                        Clocked into: <span className="font-medium text-slate-800">{projects.find(p => p.id === activeTimesheet.projectId)?.name}</span>
                                    </p>
                                    <div className="text-center bg-slate-50 border border-slate-200 rounded-lg p-6">
                                        <p className="text-sm text-slate-500 uppercase tracking-wider">Current Shift Duration</p>
                                        <p className="text-5xl font-bold my-1 text-slate-800 tabular-nums">{shiftTimer}</p>
                                    </div>
                                    <Button className="w-full" variant="danger" onClick={handleClockOut} isLoading={isClockingOut}>Clock Out</Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Time Clock</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="flex-grow">
                                            <label htmlFor="project-select" className="text-sm font-medium text-gray-700">Project</label>
                                            <select id="project-select" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full p-2 mt-1 border rounded-md">
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        {weather && (
                                            <div className="flex items-center gap-2 p-2 ml-2 border rounded-md bg-slate-50">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d={weather.icon} />
                                                </svg>
                                                <span className="font-semibold text-lg">{weather.temperature}°</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {renderGeofenceStatus()}

                                    <Button className="w-full" onClick={handleClockIn} disabled={!isInsideGeofence || !!geoError || projects.length === 0} isLoading={isClockingIn}>Clock In</Button>
                                </div>
                            </div>
                        )}
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
                    <Card>
                        <h3 className="text-lg font-semibold mb-4">My Recent Timesheets</h3>
                        <ul className="divide-y divide-slate-200">
                            {recentTimesheets.length > 0 ? recentTimesheets.map(ts => (
                                <li key={ts.id} className="py-2.5">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-sm">{new Date(ts.clockIn).toLocaleDateString()}</p>
                                            <p className="text-xs text-slate-500">{projects.find(p => p.id === ts.projectId)?.name}</p>
                                        </div>
                                        <div className="text-right">
                                             <TimesheetStatusBadge status={ts.status} />
                                             <p className="text-sm font-semibold mt-1">{ts.clockOut ? `${((new Date(ts.clockOut).getTime() - new Date(ts.clockIn).getTime()) / 3600000).toFixed(2)} hrs` : 'Active'}</p>
                                        </div>
                                    </div>
                                </li>
                            )) : <p className="text-sm text-slate-500 text-center py-4">No timesheets submitted yet.</p>}
                        </ul>
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