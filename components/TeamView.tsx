import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role, Project, ProjectAssignment } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface TeamViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
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

export const TeamView: React.FC<TeamViewProps> = ({ user, addToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = user.role === Role.ADMIN;

    const fetchData = useCallback(async () => {
        setLoading(true);
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
        const map = new Map<number, Project[]>();
        users.forEach(u => {
            const userAssignments = assignments.filter(a => a.userId === u.id);
            const userProjects = userAssignments.map(ua => projects.find(p => p.id === ua.projectId)).filter(Boolean) as Project[];
            map.set(u.id, userProjects);
        });
        return map;
    }, [users, assignments, projects]);

    if (loading) {
        return <Card><p>Loading team members...</p></Card>;
    }

    return (
        <div>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigned Projects</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                                {isAdmin && <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
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
                                            {(userProjectsMap.get(member.id) || []).map(p => (
                                                <span key={p.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">{p.name}</span>
                                            ))}
                                            {(userProjectsMap.get(member.id) || []).length === 0 && '—'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.email}</td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button variant="ghost" size="sm">Edit</Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};