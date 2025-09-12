// full contents of components/Dashboard.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Permission, View, Timesheet, TimesheetStatus } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

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
    
    // Enhanced analytics
    const analytics = useMemo(() => {
        const totalBudget = activeProjects.reduce((sum, p) => sum + p.budget, 0);
        const totalActualCost = activeProjects.reduce((sum, p) => sum + p.actualCost, 0);
        const budgetUtilization = totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0;
        
        const todaysTasks = todos.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            const today = new Date();
            return dueDate.toDateString() === today.toDateString();
        });
        
        const completedTodaysTasks = todaysTasks.filter(t => t.status === 'Done');
        const taskCompletionRate = todaysTasks.length > 0 ? (completedTodaysTasks.length / todaysTasks.length) * 100 : 0;
        
        return {
            totalBudget,
            totalActualCost,
            budgetUtilization,
            todaysTasks: todaysTasks.length,
            taskCompletionRate
        };
    }, [projects, todos, activeProjects]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-lg border p-4 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}!</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <Card>
                    <h3 className="font-semibold text-slate-600">Active Projects</h3>
                    <p className="text-4xl font-bold text-slate-800">{activeProjects.length}</p>
                    <div className="mt-1">
                        <span className="text-xs text-slate-500">
                            Budget: £{analytics.totalBudget.toLocaleString()}
                        </span>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Overdue Tasks</h3>
                    <p className="text-4xl font-bold text-red-500">{overdueTasks.length}</p>
                    {overdueTasks.length > 0 && (
                        <div className="mt-1">
                            <span className="text-xs text-red-500">
                                Requires attention
                            </span>
                        </div>
                    )}
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Today's Tasks</h3>
                    <p className="text-4xl font-bold text-blue-600">{analytics.todaysTasks}</p>
                    <div className="mt-1">
                        <span className="text-xs text-slate-500">
                            {analytics.taskCompletionRate.toFixed(0)}% completed
                        </span>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Budget Usage</h3>
                    <p className="text-4xl font-bold text-orange-600">
                        {analytics.budgetUtilization.toFixed(0)}%
                    </p>
                    <div className="mt-1">
                        <span className="text-xs text-slate-500">
                            £{analytics.totalActualCost.toLocaleString()} spent
                        </span>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Pending Timesheets</h3>
                    <p className="text-4xl font-bold text-sky-600">{pendingTimesheets.length}</p>
                </Card>
                <Card>
                    <h3 className="font-semibold text-slate-600">Safety Record</h3>
                    <p className="text-4xl font-bold text-green-600">0</p>
                    <p className="text-xs text-slate-500">incidents this month</p>
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
