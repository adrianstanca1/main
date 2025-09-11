import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role, Project, ProjectAssignment, ProjectRole, Permission } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';

interface TeamViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onStartChat: (user: User) => void;
}

const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    return (
        <div className={`rounded-full bg-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
            {getInitials(name)}
        </div>
    );
};

const EditRolesModal: React.FC<{
    userToEdit: User;
    projects: Project[];
    assignments: ProjectAssignment[];
    onClose: () => void;
    onUpdateSuccess: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    actor: User;
}> = ({ userToEdit, projects, assignments, onClose, onUpdateSuccess, addToast, actor }) => {
    const [currentRoles, setCurrentRoles] = useState<Record<number, ProjectRole>>({});
    const [isSaving, setIsSaving] = useState(false);

    const userProjects = useMemo(() => {
        const userAssignments = assignments.filter(a => a.userId === userToEdit.id);
        return userAssignments.map(ua => projects.find(p => p.id === ua.projectId)).filter(Boolean) as Project[];
    }, [userToEdit.id, assignments, projects]);

    useEffect(() => {
        const initialRoles: Record<number, ProjectRole> = {};
        const userAssignments = assignments.filter(a => a.userId === userToEdit.id);
        userAssignments.forEach(a => {
            initialRoles[a.projectId] = a.projectRole;
        });
        setCurrentRoles(initialRoles);
    }, [userToEdit, assignments]);

    const handleRoleChange = (projectId: number, newRole: ProjectRole) => {
        setCurrentRoles(prev => ({ ...prev, [projectId]: newRole }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const promises = Object.entries(currentRoles).map(([projectIdStr, role]) => {
                const projectId = parseInt(projectIdStr, 10);
                const originalAssignment = assignments.find(a => a.userId === userToEdit.id && a.projectId === projectId);
                if (originalAssignment && originalAssignment.projectRole !== role) {
                    return api.updateUserProjectRole(userToEdit.id, projectId, role, actor.id);
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
            addToast(`Project roles for ${userToEdit.name} updated successfully!`, 'success');
            onUpdateSuccess();
            onClose();
        } catch (error) {
            addToast('Failed to update one or more roles.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2">Edit Project Roles</h3>
                <p className="text-slate-500 mb-4">for {userToEdit.name}</p>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {userProjects.map(project => (
                        <div key={project.id} className="flex justify-between items-center p-3 border rounded-md">
                            <span className="font-medium">{project.name}</span>
                            <select
                                value={currentRoles[project.id] || ''}
                                onChange={(e) => handleRoleChange(project.id, e.target.value as ProjectRole)}
                                className="p-1 border border-gray-300 bg-white rounded-md text-sm"
                            >
                                {/* FIX: Explicitly convert enum value to string for key prop to satisfy TypeScript. */}
                                {Object.values(ProjectRole).map(role => (
                                    <option key={String(role)} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                    {userProjects.length === 0 && <p className="text-slate-500 text-center py-4">This user is not assigned to any projects.</p>}
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
                </div>
            </Card>
        </div>
    );
};

export const TeamView: React.FC<TeamViewProps> = ({ user, addToast, onStartChat }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const isAdmin = hasPermission(user, Permission.MANAGE_TEAM);

    const fetchData = useCallback(async () => {
        // setLoading(true); // Prevent full screen loader on refetch
        try {
            if (!user.companyId) return;
            const [userData, projectData, assignmentData] = await Promise.all([
                api.getUsersByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
                api.getProjectAssignmentsByCompany(user.companyId)
            ]);
            setUsers(userData);
            setProjects(projectData);
            setAssignments(assignmentData);
        } catch (error) {
            addToast("Failed to load team data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const userProjectsMap = useMemo(() => {
        const map = new Map<number, { project: Project, assignment: ProjectAssignment }[]>();
        users.forEach(u => {
            const userAssignments = assignments.filter(a => a.userId === u.id);
            const userProjectDetails = userAssignments.map(ua => {
                const project = projects.find(p => p.id === ua.projectId);
                return project ? { project, assignment: ua } : null;
            }).filter(Boolean) as { project: Project, assignment: ProjectAssignment }[];
            map.set(u.id, userProjectDetails);
        });
        return map;
    }, [users, assignments, projects]);

    if (loading) {
        return <Card><p>Loading team members...</p></Card>;
    }

    return (
        <div>
            {editingUser && (
                <EditRolesModal
                    userToEdit={editingUser}
                    projects={projects}
                    assignments={assignments}
                    onClose={() => setEditingUser(null)}
                    onUpdateSuccess={fetchData}
                    addToast={addToast}
                    actor={user}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Team Management</h2>
                {isAdmin && (
                    <Button variant="primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Team Member
                    </Button>
                )}
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigned Projects & Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                                <th className="relative px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(member => (
                                <tr key={member.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={member.name} className="w-10 h-10 text-sm" />
                                            <span className="font-medium text-slate-900">{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        <div className="flex flex-wrap gap-1">
                                            {(userProjectsMap.get(member.id) || []).map(({ project, assignment }) => (
                                                <span key={project.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                                                    {project.name} <span className="font-semibold">({assignment.projectRole})</span>
                                                </span>
                                            ))}
                                            {(userProjectsMap.get(member.id) || []).length === 0 && '—'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-1">
                                            {user.id !== member.id && hasPermission(user, Permission.SEND_DIRECT_MESSAGE) && (
                                                <Button variant="ghost" size="sm" onClick={() => onStartChat(member)} title={`Chat with ${member.name}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" size="sm" onClick={() => setEditingUser(member)}>Edit Roles</Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};