// full contents of components/Dashboard.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Permission, View, Timesheet, TimesheetStatus } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, addToast, setActiveView, onSelectProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingTimesheets, setPendingTimesheets] = useState<Timesheet[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;

            const projectsPromise = hasPermission(user, Permission.VIEW_ALL_PROJECTS)
                ? api.getProjectsByCompany(user.companyId)
                : api.getProjectsByUser(user.id);
            
            const fetchedProjects = await projectsPromise;
            setProjects(fetchedProjects);

            if (fetchedProjects.length > 0) {
                const projectIds = fetchedProjects.map(p => p.id);
                const todosPromise = api.getTodosByProjectIds(projectIds);
                const timesheetsPromise = hasPermission(user, Permission.MANAGE_TIMESHEETS) ? api.getTimesheetsForManager(user.id) : Promise.resolve([]);
                
                const [fetchedTodos, fetchedTimesheets] = await Promise.all([todosPromise, timesheetsPromise]);
                setTodos(fetchedTodos);
                setPendingTimesheets(fetchedTimesheets.filter(ts => ts.status === TimesheetStatus.PENDING));
            }

        } catch (error) {
            addToast("Failed to load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeProjects = useMemo(() => projects.filter(p => p.status === 'Active'), [projects]);
    const overdueTasks = useMemo(() => todos.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done'), [todos]);

    if (loading) {
        return <Card><p>Loading dashboard...</p></Card>;
    }

    // Prepare data for overdue tasks by project
    const overdueByProject = useMemo(() => {
        const map: { [projectId: number]: number } = {};
        overdueTasks.forEach(t => {
            map[t.projectId] = (map[t.projectId] || 0) + 1;
        });
        return activeProjects.map(p => ({
            name: p.name,
            count: map[p.id] || 0
        }));
    }, [overdueTasks, activeProjects]);

    // Example recent activity (could be replaced with real data)
    const recentActivity = [
        ...overdueTasks.slice(0, 3).map(t => ({
            type: 'Task',
            message: `Task "${t.text}" is overdue`,
            date: t.dueDate
        })),
        ...pendingTimesheets.slice(0, 2).map(ts => ({
            type: 'Timesheet',
            message: `Timesheet pending approval`,
            date: ts.clockIn
        }))
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}!</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <h3 className="font-semibold text-slate-600">Active Projects</h3>
                    <p className="text-4xl font-bold text-slate-800">{activeProjects.length}</p>
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Overdue Tasks</h3>
                    <p className="text-4xl font-bold text-red-500">{overdueTasks.length}</p>
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Pending Timesheets</h3>
                    <p className="text-4xl font-bold text-sky-600">{pendingTimesheets.length}</p>
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Safety Incidents</h3>
                    <p className="text-4xl font-bold text-slate-800">0</p>
                    <p className="text-xs text-slate-500">in last 30 days</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Overdue Tasks by Project</h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={overdueByProject} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                    <div className="space-y-2">
                        {recentActivity.length === 0 && <p className="text-slate-500">No recent activity.</p>}
                        {recentActivity.map((a, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded flex flex-col">
                                <span className="text-xs text-slate-400">{a.type}</span>
                                <span className="text-sm">{a.message}</span>
                                <span className="text-xs text-slate-400">{a.date ? new Date(a.date).toLocaleDateString() : ''}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Active Projects</h2>
                        <Button variant="secondary" onClick={() => setActiveView('projects')}>View All</Button>
                    </div>
                    <div className="space-y-2">
                        {activeProjects.slice(0, 5).map(project => (
                            <div key={project.id} className="p-3 bg-slate-50 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{project.name}</p>
                                    <p className="text-sm text-slate-500">{project.location.address}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => onSelectProject(project)}>Details</Button>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="space-y-2">
                         <Button className="w-full justify-start" variant="ghost" onClick={() => setActiveView('projects')}>Manage Projects</Button>
                         <Button className="w-full justify-start" variant="ghost" onClick={() => setActiveView('timesheets')}>Review Timesheets</Button>
                         <Button className="w-full justify-start" variant="ghost" onClick={() => setActiveView('safety')}>View Safety Reports</Button>
                         <Button className="w-full justify-start" variant="ghost" onClick={() => setActiveView('users')}>Manage Team</Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
