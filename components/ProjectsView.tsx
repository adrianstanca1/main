import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, ProjectAssignment, Permission, TodoStatus, Role } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';
import { CreateProjectModal } from './CreateProjectModal';

interface ProjectsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onSelectProject: (project: Project) => void;
}

const ProjectSummaryCard: React.FC<{
    project: Project;
    taskCount: number;
    memberCount: number;
    overdueTaskCount: number;
    upcomingMilestone: { name: string; date: Date } | null;
    onSelect: () => void;
}> = ({ project, taskCount, memberCount, overdueTaskCount, upcomingMilestone, onSelect }) => {
    const progress = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0;
    const statusStyles: Record<Project['status'], string> = {
        'Active': 'bg-green-100 text-green-800',
        'On Hold': 'bg-yellow-100 text-yellow-800',
        'Completed': 'bg-slate-200 text-slate-800'
    };

    return (
        <Card onClick={onSelect} className="cursor-pointer hover:shadow-lg hover:border-sky-500/50 transition-all duration-300 flex flex-col p-0 overflow-hidden animate-card-enter">
            <img src={project.imageUrl} alt={project.name} className="w-full h-40 object-cover" />
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-800 flex-grow pr-2">{project.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${statusStyles[project.status]}`}>{project.status}</span>
                </div>
                <p className="text-sm text-slate-500 mb-4 flex-grow">{project.location.address}</p>
                
                <div className="space-y-3 text-sm text-slate-600 border-t pt-4 mt-auto">
                    <div className="flex justify-between items-center">
                        <span>Team</span>
                        <span className="font-semibold">{memberCount} Members</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span>Open Tasks</span>
                        <span className="font-semibold">{taskCount}</span>
                    </div>
                     {overdueTaskCount > 0 && (
                        <div className="flex justify-between items-center text-red-600">
                            <span>Overdue Tasks</span>
                            <span className="font-bold flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {overdueTaskCount}
                            </span>
                        </div>
                    )}
                    {upcomingMilestone && (
                         <div className="flex justify-between items-center">
                            <span>Next Milestone</span>
                            <span className="font-semibold">{new Date(upcomingMilestone.date).toLocaleDateString()}</span>
                        </div>
                    )}
                    <div>
                        <div className="flex justify-between mb-1 text-xs">
                            <span>Budget</span>
                            <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${progress > 100 ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};


export const ProjectsView: React.FC<ProjectsViewProps> = ({ user, addToast, onSelectProject }) => {
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [allTodos, setAllTodos] = useState<Todo[]>([]);
    const [allAssignments, setAllAssignments] = useState<ProjectAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const canCreate = hasPermission(user, Permission.MANAGE_PROJECTS) && user.role !== Role.PM;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;

            let projectsPromise: Promise<Project[]>;
            if (hasPermission(user, Permission.VIEW_ALL_PROJECTS)) {
                projectsPromise = api.getProjectsByCompany(user.companyId);
            } else {
                projectsPromise = api.getProjectsByUser(user.id);
            }
            
            const [projects, assignments] = await Promise.all([
                projectsPromise,
                api.getProjectAssignmentsByCompany(user.companyId),
            ]);
            
            const projectIds = projects.map(p => p.id);
            const todos = await api.getTodosByProjectIds(projectIds);

            setAllProjects(projects);
            setAllTodos(todos);
            setAllAssignments(assignments);

        } catch (error) {
            addToast("Failed to load project data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const projectStats = useMemo(() => {
        const statsMap = new Map<number, { taskCount: number; memberCount: number; overdueTaskCount: number; upcomingMilestone: { name: string; date: Date } | null }>();
        const now = new Date();
        now.setHours(0, 0, 0, 0); // For date-only comparison

        allProjects.forEach(project => {
            const projectTodos = allTodos.filter(t => t.projectId === project.id);
            const taskCount = projectTodos.filter(t => t.status !== TodoStatus.DONE).length;
            const memberCount = allAssignments.filter(a => a.projectId === project.id).length;
            
            const overdueTaskCount = projectTodos.filter(
                t => t.dueDate && new Date(t.dueDate) < now && t.status !== TodoStatus.DONE
            ).length;

            const upcomingTasksWithDueDates = projectTodos
                .filter(t => t.dueDate && new Date(t.dueDate) >= now && t.status !== TodoStatus.DONE)
                .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
                
            const nextMilestoneTask = upcomingTasksWithDueDates[0];
            const upcomingMilestone = nextMilestoneTask 
                ? { name: nextMilestoneTask.text, date: new Date(nextMilestoneTask.dueDate!) } 
                : null;

            statsMap.set(project.id, { taskCount, memberCount, overdueTaskCount, upcomingMilestone });
        });
        return statsMap;
    }, [allProjects, allTodos, allAssignments]);

    const filteredProjects = useMemo(() => {
        return allProjects.filter(project => {
            const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [allProjects, searchTerm, statusFilter]);

    if (loading) {
        return <Card><p>Loading projects...</p></Card>;
    }

    return (
        <div className="space-y-6">
            {isCreateModalOpen && (
                <CreateProjectModal
                    user={user}
                    onClose={() => setIsCreateModalOpen(false)}
                    onProjectCreated={(newProject) => {
                        fetchData();
                        onSelectProject(newProject);
                    }}
                    addToast={addToast}
                />
            )}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Projects</h2>
                {canCreate && (
                    <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Project
                    </Button>
                )}
            </div>
            
            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b">
                    <input
                        type="text"
                        placeholder="Search projects by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 p-2 border rounded-md"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full md:w-auto p-2 border bg-white rounded-md"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProjects.map(project => {
                        const stats = projectStats.get(project.id) || { taskCount: 0, memberCount: 0, overdueTaskCount: 0, upcomingMilestone: null };
                        return (
                            <ProjectSummaryCard
                                key={project.id}
                                project={project}
                                taskCount={stats.taskCount}
                                memberCount={stats.memberCount}
                                overdueTaskCount={stats.overdueTaskCount}
                                upcomingMilestone={stats.upcomingMilestone}
                                onSelect={() => onSelectProject(project)}
                            />
                        );
                    })}
                </div>
                 {filteredProjects.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <h3 className="text-xl font-semibold">No Projects Found</h3>
                        <p>No projects match your current filters.</p>
                    </div>
                 )}
            </Card>
        </div>
    );
};
