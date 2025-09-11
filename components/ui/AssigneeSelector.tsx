import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User } from '../../types';

interface AssigneeSelectorProps {
    personnel: User[];
    assignedIds: number[];
    onAssignmentChange: (newUserIds: number[]) => void;
}

const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
    };
    return <div className={`rounded-full bg-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>{getInitials(name)}</div>;
};

export const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({ personnel, assignedIds, onAssignmentChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const assignedUsers = useMemo(() => {
        const assignedSet = new Set(assignedIds);
        return personnel.filter(p => assignedSet.has(p.id));
    }, [personnel, assignedIds]);

    const filteredPersonnel = useMemo(() => {
        if (!searchTerm) return personnel;
        return personnel.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [personnel, searchTerm]);

    const handleToggleUser = (userId: number) => {
        const newIds = assignedIds.includes(userId)
            ? assignedIds.filter(id => id !== userId)
            : [...assignedIds, userId];
        onAssignmentChange(newIds);
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="flex items-center gap-2 p-2 border rounded-lg min-h-[44px]">
                <div className="flex items-center flex-grow">
                    {assignedUsers.length > 0 ? (
                        assignedUsers.map(user => (
                            <div key={user.id} className="group relative -mr-2">
                                <Avatar name={user.name} className="w-8 h-8 text-sm ring-2 ring-white" />
                                <span className="absolute bottom-full mb-1 w-max px-2 py-1 text-xs bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{user.name}</span>
                            </div>
                        ))
                    ) : (
                        <span className="text-sm text-slate-500 px-2">Unassigned</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen(prev => !prev)}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1 rounded-md hover:bg-slate-100"
                >
                    {isOpen ? 'Close' : 'Manage'}
                </button>
            </div>
            {isOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-md shadow-lg border max-h-60 flex flex-col">
                    <div className="p-2 border-b">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search team members..."
                            className="w-full p-1.5 border-gray-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                            autoFocus
                        />
                    </div>
                    <ul className="overflow-y-auto flex-grow">
                        {filteredPersonnel.map(user => (
                            <li
                                key={user.id}
                                onClick={() => handleToggleUser(user.id)}
                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3"
                            >
                                <input
                                    type="checkbox"
                                    checked={assignedIds.includes(user.id)}
                                    readOnly
                                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                                <Avatar name={user.name} className="w-7 h-7 text-xs" />
                                <span className="text-sm">{user.name}</span>
                            </li>
                        ))}
                         {filteredPersonnel.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No members found.</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};