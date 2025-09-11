import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// FIX: Corrected import path
import { User, View, Project, Role, Timesheet, Todo, Permission, FinancialKPIs, PendingApproval, TimesheetStatus, Document, DocumentCategory, DocumentAcknowledgement, TodoStatus, Comment, SubTask, WorkType, AuditLog, AuditLogAction, Equipment, OperativeReport, WeatherForecast, Announcement, TodoPriority } from '../types';
// FIX: Corrected import path
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PrincipalAdminDashboard } from './PrincipalAdminDashboard';
import { hasPermission } from '../services/auth';
import { useGeolocation } from '../hooks/useGeolocation';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { TimesheetStatusBadge } from './ui/StatusBadge';
import { ReminderControl } from './ReminderControl';

interface DashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

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

const AuditLogIcon: React.FC<{ action: AuditLogAction | string }> = ({ action }) => {
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

export const Dashboard: React.FC<DashboardProps> = (props) => {
    if (props.user.role === Role.PRINCIPAL_ADMIN) {
        return <PrincipalAdminDashboard user={props.user} addToast={props.addToast} />;
    }
    // Operatives and Foremen are now directed to MyDayView from App.tsx
    // This dashboard is for Admins and PMs.
    return <TenantDashboard {...props} />;
};
