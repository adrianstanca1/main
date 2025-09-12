import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Corrected import paths to be relative.
import { User, Role, Permission, Project, Timesheet, AuditLog, TimesheetStatus } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { UserStatusBadge, TimesheetStatusBadge } from './ui/StatusBadge';
import { Tag } from './ui/Tag';

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

const UserProfileModal: React.FC<{
    selectedUser: User;
    currentUser: User;
    onClose: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    onStartChat: (user: User) => void;
}> = ({ selectedUser, currentUser, onClose, addToast, onStartChat }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [activity, setActivity] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [projData, tsData, activityData] = await Promise.all([
                    api.getProjectsByUser(selectedUser.id),
                    api.getTimesheetsByUser(selectedUser.id),
                    api.getAuditLogsByActorId(selectedUser.id),
                ]);
                setProjects(projData);
                setTimesheets(tsData.slice(0, 5)); // Get last 5
                setActivity(activityData.slice(0, 7)); // Get last 7 activities
            } catch (error) {
                addToast("Failed to load user profile data.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedUser, addToast]);
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-3xl h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <div className="flex-shrink-0 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Avatar name={selectedUser.name} className="w-20 h-20 text-3xl" />
                        <div>
                            <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                            <p className="text-slate-500">{selectedUser.role}</p>
                            <div className="flex items-center gap-4 text-sm mt-1">
                                <a href={`mailto:${selectedUser.email}`} className="text-sky-600 hover:underline">{selectedUser.email}</a>
                                {selectedUser.phone && <span>{selectedUser.phone}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => onStartChat(selectedUser)} disabled={selectedUser.id === currentUser.id}>Message</Button>
                         {hasPermission(currentUser, Permission.MANAGE_TEAM) && <Button>Edit Roles</Button>}
                    </div>
                 </div>
                 <div className="flex-grow overflow-y-auto mt-6 pt-6 border-t space-y-6 pr-2">
                    {loading ? <p>Loading profile...</p> : (
                        <>
                            <section>
                                <h3 className="font-semibold mb-2">Assigned Projects</h3>
                                <div className="space-y-2">
                                    {projects.map(p => (
                                        <div key={p.id} className="p-3 bg-slate-50 rounded-md text-sm">{p.name}</div>
                                    ))}
                                    {projects.length === 0 && <p className="text-sm text-slate-500">Not assigned to any projects.</p>}
                                </div>
                            </section>
                             <section>
                                <h3 className="font-semibold mb-2">Recent Activity</h3>
                                <div className="space-y-3">
                                    {activity.map(log => (
                                        <div key={log.id} className="text-sm text-slate-600">
                                            <span>{log.action.replace(/_/g, ' ')}</span>
                                            {log.target?.name && <span className="font-medium text-slate-800"> "{log.target.name}"</span>}
                                            <span className="text-xs text-slate-400 ml-2">{formatDistanceToNow(log.timestamp)}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                             <section>
                                <h3 className="font-semibold mb-2">Recent Timesheets</h3>
                                <div className="border rounded-lg overflow-hidden">
                                     <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="p-2 text-left font-medium">Date</th>
                                                <th className="p-2 text-left font-medium">Hours</th>
                                                <th className="p-2 text-left font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {timesheets.map(ts => {
                                                const hours = ts.clockOut ? ((new Date(ts.clockOut).getTime() - new Date(ts.clockIn).getTime()) / 3600000).toFixed(2) : 'Ongoing';
                                                return (
                                                    <tr key={ts.id} className="border-t">
                                                        <td className="p-2">{new Date(ts.clockIn).toLocaleDateString()}</td>
                                                        <td className="p-2">{hours}</td>
                                                        <td className="p-2"><TimesheetStatusBadge status={ts.status} /></td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                 </div>
            </Card>
        </div>
    );
};

export const TeamView: React.FC<TeamViewProps> = ({ user, addToast, onStartChat }) => {
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const canManageTeam = hasPermission(user, Permission.MANAGE_TEAM);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const users = await api.getUsersByCompany(user.companyId);
            setTeam(users);
        } catch (error) {
            addToast("Failed to load team data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTeam = useMemo(() => {
        return team.filter(member => {
            const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) || member.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'all' || member.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [team, searchTerm, roleFilter]);

    if (loading) {
        return <Card><p>Loading team members...</p></Card>;
    }

    return (
        <div className="space-y-6">
            {selectedUser && <UserProfileModal selectedUser={selectedUser} currentUser={user} onClose={() => setSelectedUser(null)} addToast={addToast} onStartChat={onStartChat} />}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Team Management</h2>
                {canManageTeam && <Button>Add Team Member</Button>}
            </div>
            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 p-2 border rounded-md"
                    />
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="w-full md:w-auto p-2 border bg-white rounded-md"
                    >
                        <option value="all">All Roles</option>
                        {/* FIX: Correctly map over string enum values for keys. */}
                        {Object.values(Role).map(role => (
                           role !== Role.PRINCIPAL_ADMIN && <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeam.map(member => (
                        <Card key={member.id} className="animate-card-enter cursor-pointer hover:shadow-lg hover:border-sky-500/50" onClick={() => setSelectedUser(member)}>
                            <div className="flex flex-col items-center text-center">
                                <Avatar name={member.name} className="w-20 h-20 text-3xl mb-4" />
                                <h3 className="font-bold text-lg text-slate-800">{member.name}</h3>
                                <p className="text-sm text-slate-500 mb-2">{member.email}</p>
                                <Tag label={member.role} color="blue" />
                                {member.status && <div className="mt-4"><UserStatusBadge status={member.status} /></div>}
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>
        </div>
    );
};