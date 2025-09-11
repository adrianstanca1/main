
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role, Permission } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';
import { Tag } from './ui/Tag';

interface TeamViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onStartChat: (user: User) => void;
}

const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };
    return (
        <div className={`rounded-full bg-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
            {getInitials(name)}
        </div>
    );
};

export const TeamView: React.FC<TeamViewProps> = ({ user, addToast, onStartChat }) => {
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const canManage = hasPermission(user, Permission.MANAGE_TEAM);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (user.companyId) {
                const teamData = await api.getUsersByCompany(user.companyId);
                setTeam(teamData);
            }
        } catch (error) {
            addToast("Failed to load team data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const roleOrder = useMemo(() => [
        Role.ADMIN,
        Role.PM,
        Role.SAFETY_OFFICER,
        Role.FOREMAN,
        Role.OPERATIVE,
    ], []);

    const sortedTeam = useMemo(() => {
        return [...team].sort((a, b) => {
            const roleA = roleOrder.indexOf(a.role);
            const roleB = roleOrder.indexOf(b.role);
            if (roleA !== roleB) return roleA - roleB;
            return a.name.localeCompare(b.name);
        });
    }, [team, roleOrder]);
    
    if (loading) {
        return <Card>Loading team members...</Card>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Team</h2>
                {canManage && (
                    <Button>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Invite Member
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedTeam.map(member => (
                    <Card key={member.id} className="animate-card-enter">
                        <div className="flex flex-col items-center text-center">
                            <Avatar name={member.name} className="w-20 h-20 text-3xl mb-4" />
                            <h3 className="font-bold text-lg text-slate-800">{member.name}</h3>
                            <Tag label={member.role} color="blue" />
                            <p className="text-sm text-slate-500 mt-2">{member.email}</p>
                            <div className="mt-4 pt-4 border-t w-full flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => onStartChat(member)}
                                    disabled={member.id === user.id}
                                >
                                    Chat
                                </Button>
                                {canManage && (
                                    <Button variant="ghost" className="w-full">
                                        Manage
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
