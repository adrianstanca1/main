import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, View, Project, Todo, Permission, Document, DocumentCategory, DocumentAcknowledgement, TodoStatus, Comment, SubTask, Timesheet, WeatherForecast, TodoPriority } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { ReminderControl } from './ReminderControl';

// --- Task Detail Modal (reused) ---
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

    useEffect(() => { setEditableTask(task); }, [task]);

    const canManageTasks = hasPermission(user, Permission.MANAGE_TASKS);
    
    const handleFieldChange = (field: keyof Todo, value: any) => setEditableTask(prev => ({ ...prev, [field]: value }));
    const handleSave = () => {
        onUpdateTask(editableTask);
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
    
    const creatorName = userMap.get(task.creatorId)?.name;
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold">{task.text}</h3>
                <p className="text-sm text-slate-500 mb-4">in project: {projectName}</p>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <p>Details and editing UI would go here...</p>
                    <div>
                        <h4 className="font-semibold">Comments</h4>
                         {task.comments?.map(comment => (
                            <div key={comment.id}><p>{userMap.get(comment.creatorId)?.name}: {comment.text}</p></div>
                        ))}
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

// --- Submit Report Modal (reused) ---
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
        setIsSaving(true);
        try {
            await api.submitOperativeReport({ projectId, userId: user.id, notes, photoFile: photoFile || undefined });
            addToast('Report submitted successfully!', 'success');
            onSubmit();
            onClose();
        } catch (error) { addToast('Failed to submit report.', 'error');
        } finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Submit Site Report</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="w-full p-2 border rounded-md" placeholder="e.g., Completed framing on floor 3. No incidents." />
                    </div>
                     <div>
                        <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">Attach Photo</label>
                         <input type="file" id="photo" accept="image/*" capture onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>Submit</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


// --- Main MyDayView Component ---
interface MyDayViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: View) => void;
}

export const MyDayView: React.FC<MyDayViewProps> = ({ user, addToast, setActiveView }) => {
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
            } else { setWeather(null); }
            
            const projectIds = userProjects.map(p => p.id);
            if (projectIds.length > 0) {
                 const [tasksData, docsData, acksData] = await Promise.all([
                    api.getTodosByProjectIds(projectIds),
                    api.getDocumentsByProjectIds(projectIds),
                    api.getDocumentAcksForUser(user.id),
                ]);
                setTasks(tasksData.filter(t => t.assigneeId === user.id));
                setDocuments(docsData);
                setAcks(acksData);
            }
        } catch (error) { addToast("Failed to load dashboard data.", "error");
        } finally { setLoading(false); }
    }, [user.id, user.companyId, addToast]);


    useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
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
        return tasks.filter(t => t.status !== TodoStatus.DONE).sort((a,b) => (a.priority === TodoPriority.HIGH ? -1 : 1) - (b.priority === TodoPriority.HIGH ? -1 : 1));
    }, [tasks]);

    const activeProject = useMemo(() => {
        if (!activeTimesheet) return null;
        return projects.find(p => p.id === activeTimesheet.projectId);
    }, [activeTimesheet, projects]);
    
    const handleUpdateTaskStatus = async (taskId: number | string, newStatus: TodoStatus) => {
        try {
            const updatedTask = await api.updateTodo(taskId, { status: newStatus }, user.id);
            setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
            addToast('Task status updated.', 'success');
        } catch (error) { addToast('Failed to update task status.', 'error'); }
    };
    
    const handleAcknowledgeDoc = async (docId: number) => {
        try {
            const ack = await api.acknowledgeDocument(user.id, docId);
            setAcks(prev => [...prev, ack]);
            addToast("Document acknowledged.", "success");
        } catch (error) { addToast("Failed to acknowledge document.", "error"); }
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
                onAddComment={() => {}} 
                onUpdateTask={() => {}}
                onReminderUpdate={fetchData}
                addToast={addToast}
            />}
            {isReportModalOpen && activeProject && <SubmitReportModal user={user} projectId={activeProject.id} onClose={() => setIsReportModalOpen(false)} onSubmit={fetchData} addToast={addToast} />}
            
            <h2 className="text-3xl font-bold text-slate-800">My Day</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold mb-2">Time Clock Status</h3>
                        {activeTimesheet ? (
                             <div className="text-center bg-slate-50 border border-slate-200 rounded-lg p-6">
                                <p className="text-sm text-slate-500 uppercase tracking-wider">Clocked into <span className="font-medium text-slate-800">{activeProject?.name}</span></p>
                                <p className="text-5xl font-bold my-1 text-slate-800 tabular-nums">{shiftTimer}</p>
                            </div>
                        ) : (
                             <div className="text-center p-6">
                                <p className="text-2xl font-semibold text-slate-800">Not Clocked In</p>
                             </div>
                        )}
                        <Button className="w-full mt-4" onClick={() => setActiveView('time')}>Go to Time Clock</Button>
                    </Card>
                     <Card>
                        <h3 className="text-lg font-semibold mb-4">My Tasks for Today ({openTasks.length})</h3>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                             {openTasks.length > 0 ? openTasks.map(task => (
                                <div key={task.id} className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTask(task)}>
                                    <div className="flex justify-between items-start gap-2"><p className="font-medium flex-grow">{task.text}</p>
                                        <select value={task.status} onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TodoStatus)} onClick={(e) => e.stopPropagation()} className="text-xs p-1 border rounded-md" aria-label={`Status for task ${task.text}`}><option value={TodoStatus.TODO}>To Do</option><option value={TodoStatus.IN_PROGRESS}>In Progress</option><option value={TodoStatus.DONE}>Done</option></select>
                                    </div><div className="mt-2 text-xs"><PriorityDisplay priority={task.priority} /></div>
                                </div>
                            )) : <p className="text-sm text-slate-500 text-center py-4">You have no open tasks. Great job!</p>}
                        </div>
                    </Card>
                </div>
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
                        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                        <Button className="w-full" variant="secondary" onClick={() => setIsReportModalOpen(true)} disabled={!activeProject}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Submit Site Report
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};