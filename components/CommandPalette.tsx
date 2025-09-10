import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, Project, View, Role } from '../types';
import { api } from '../services/mockApi';

interface CommandPaletteProps {
    user: User;
    onClose: () => void;
    setActiveView: (view: View) => void;
    onSelectProject: (project: Project) => void;
}

const getNavItems = (role: Role): { name: string; view: View }[] => {
    const baseItems = [
         { name: 'AI Business Advisor', view: 'tools' as const },
    ];
    switch (role) {
        case Role.ADMIN:
            return [
                ...baseItems,
                { name: 'Dashboard', view: 'dashboard' },
                { name: 'Invoices', view: 'invoices' },
                { name: 'Projects', view: 'projects' },
                { name: 'Clients', view: 'clients' },
                { name: 'Team', view: 'users' },
                { name: 'Documents', view: 'documents' },
                { name: 'Equipment', view: 'equipment' },
                { name: 'Tools', view: 'tools' },
            ];
        case Role.PM:
             return [
                ...baseItems,
                { name: 'Dashboard', view: 'dashboard' },
                { name: 'Invoices', view: 'invoices' },
                { name: 'Projects', view: 'projects' },
                { name: 'Clients', view: 'clients' },
                { name: 'Timesheets', view: 'timesheets' },
                { name: 'Documents', view: 'documents' },
                { name: 'Equipment', view: 'equipment' },
                { name: 'Tools', view: 'tools' },
            ];
        case Role.OPERATIVE:
             return [
                { name: 'Dashboard', view: 'dashboard' },
                { name: 'Timesheets', view: 'timesheets' },
                { name: 'Documents', view: 'documents' },
            ];
        default: // Foreman, Safety Officer etc. for simplicity
             return [
                ...baseItems,
                { name: 'Dashboard', view: 'dashboard' },
                { name: 'Projects', view: 'projects' },
            ];
    }
};


export const CommandPalette: React.FC<CommandPaletteProps> = ({ user, onClose, setActiveView, onSelectProject }) => {
    const [query, setQuery] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const handleSelect = useCallback((result: (typeof results)[number]) => {
        switch (result.type) {
            case 'view':
                setActiveView(result.data.view);
                break;
            case 'project':
                onSelectProject(result.data);
                break;
            case 'user':
                setActiveView('users');
                break;
        }
        onClose();
    }, [setActiveView, onSelectProject, onClose]);

    useEffect(() => {
        inputRef.current?.focus();

        const fetchData = async () => {
            setLoading(true);
            try {
                const [projectsData, usersData] = await Promise.all([
                    api.getProjectsByCompany(user.companyId),
                    api.getUsersByCompany(user.companyId),
                ]);
                setProjects(projectsData);
                setUsers(usersData);
            } catch (error) {
                console.error("Failed to load data for command palette", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user.companyId]);

    const lowerQuery = query.toLowerCase();

    const views = useMemo(() => getNavItems(user.role).filter(v => v.name.toLowerCase().includes(lowerQuery)), [user.role, lowerQuery]);
    const filteredProjects = useMemo(() => projects.filter(p => p.name.toLowerCase().includes(lowerQuery)), [projects, lowerQuery]);
    const filteredUsers = useMemo(() => users.filter(u => u.name.toLowerCase().includes(lowerQuery)), [users, lowerQuery]);

    const results = useMemo(() => [
        ...views.map(v => ({ type: 'view' as const, data: v })),
        ...filteredProjects.map(p => ({ type: 'project' as const, data: p })),
        ...filteredUsers.map(u => ({ type: 'user' as const, data: u })),
    ], [views, filteredProjects, filteredUsers]);

     useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + results.length) % results.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const activeResult = results[activeIndex];
                if (activeResult) {
                    handleSelect(activeResult);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, results, handleSelect]);

    useEffect(() => {
        resultsRef.current?.children[activeIndex]?.scrollIntoView({
            block: 'nearest',
        });
    }, [activeIndex]);

    const ResultItem = ({ item, isActive, onSelect }: { item: (typeof results)[number], isActive: boolean, onSelect: () => void }) => {
        const iconMap: Record<string, React.ReactNode> = {
            view: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            project: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
            user: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        };

        return (
            <div 
                onClick={onSelect}
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}
            >
                <span className={isActive ? 'text-white' : 'text-slate-500'}>{iconMap[item.type]}</span>
                <span className="flex-grow">{item.data.name}</span>
                <span className="text-xs uppercase text-slate-400">{item.type}</span>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center pt-20" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl h-fit max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveIndex(0);
                        }}
                        placeholder="Type a command or search..."
                        className="w-full bg-transparent text-lg placeholder-slate-400 focus:outline-none"
                    />
                </div>
                <div ref={resultsRef} className="flex-grow overflow-y-auto p-2">
                    {loading && <p className="p-4 text-center text-slate-500">Loading...</p>}
                    {!loading && results.length === 0 && <p className="p-4 text-center text-slate-500">No results found.</p>}
                    {!loading && results.map((item, index) => (
                         <ResultItem
                            key={(() => {
                                switch (item.type) {
                                    case 'view':
                                        return `${item.type}-${item.data.view}`;
                                    case 'project':
                                    case 'user':
                                        return `${item.type}-${item.data.id}`;
                                }
                            })()}
                            item={item}
                            isActive={index === activeIndex}
                            onSelect={() => handleSelect(item)}
                         />
                    ))}
                </div>
            </div>
        </div>
    );
};