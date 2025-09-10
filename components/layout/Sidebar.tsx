import React, { useState, useEffect } from 'react';
import { Role, User, View, Permission, DocumentCategory, TimesheetStatus } from '../../types';
import { hasPermission } from '../../services/auth';
import { api } from '../../services/mockApi';

interface SidebarProps {
  user: User;
  activeView: View;
  setActiveView: (view: View) => void;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badgeCount?: number;
}> = ({ icon, label, isActive, onClick, badgeCount }) => (
    <button onClick={onClick} className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 relative ${isActive ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
        <span className="mr-4 w-6 h-6">{icon}</span>
        <span className="font-medium flex-grow text-left">{label}</span>
        {badgeCount > 0 && (
            <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {badgeCount}
            </span>
        )}
    </button>
);

const getNavItems = (user: User): { name: string; icon: React.ReactNode; view: View, requiredPermission?: Permission, badgeKey?: 'timesheets' | 'documents' }[] => {
    const allPossibleItems = [
        { name: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>, view: 'dashboard' as const },
        { name: 'Invoices', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5h7.5m-7.5 3h7.5m3 3h3.375c.621 0 1.125-.504 1.125-1.125V4.125c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v15.75c0 .621.504 1.125 1.125 1.125h13.5c.621 0 1.125-.504 1.125-1.125v-3.375" /></svg>, view: 'invoices' as const, requiredPermission: Permission.VIEW_FINANCES },
        { name: 'Projects', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>, view: 'projects' as const, requiredPermission: Permission.VIEW_ASSIGNED_PROJECTS },
        { name: 'Clients', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.962c.57-1.023-.59-1.023-1.14 0m5.786 2.062a3 3 0 1 1-4.114 0l3.429-3.43a1.5 1.5 0 0 1 2.12 2.12l-1.484 1.485M12 18a4.5 4.5 0 0 1-8.77-2.121M12 18a4.5 4.5 0 0 0 7.737-3.626M6.25 6.25a2.25 2.25 0 0 1 3.84-1.423a2.25 2.25 0 0 1 3.84 1.423" /></svg>, view: 'clients' as const, requiredPermission: Permission.VIEW_FINANCES },
        { name: 'Team', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.962c.57-1.023-.59-1.023-1.14 0m5.786 2.062a3 3 0 1 1-4.114 0l3.429-3.43a1.5 1.5 0 0 1 2.12 2.12l-1.484 1.485M12 18a4.5 4.5 0 0 1-8.77-2.121M12 18a4.5 4.5 0 0 0 7.737-3.626M6.25 6.25a2.25 2.25 0 0 1 3.84-1.423a2.25 2.25 0 0 1 3.84 1.423" /></svg>, view: 'users' as const, requiredPermission: Permission.VIEW_TEAM },
        // FIX: Add `as const` to badgeKey properties to fix TypeScript type inference.
        { name: 'Documents', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>, view: 'documents' as const, requiredPermission: Permission.VIEW_DOCUMENTS, badgeKey: 'documents' as const },
        { name: 'Timesheets', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>, view: 'timesheets' as const, requiredPermission: Permission.VIEW_OWN_TIMESHEETS, badgeKey: 'timesheets' as const },
        { name: 'Equipment', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>, view: 'equipment' as const, requiredPermission: Permission.ACCESS_PROJECT_TOOLS },
        { name: 'Tools', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l.354-.354a3.75 3.75 0 0 0-5.303-5.303l-.354.353M3 21l3.75-3.75m.75-7.5 3-3L11.25 3" /></svg>, view: 'tools' as const }, // Tools are filtered inside the view itself
    ];

    const canShowNavItem = (item: (typeof allPossibleItems)[0]): boolean => {
        if (!item.requiredPermission) return true;
        if (hasPermission(user, item.requiredPermission)) return true;
        if (item.requiredPermission === Permission.VIEW_ASSIGNED_PROJECTS && hasPermission(user, Permission.VIEW_ALL_PROJECTS)) return true;
        if (item.requiredPermission === Permission.VIEW_OWN_TIMESHEETS && hasPermission(user, Permission.VIEW_ALL_TIMESHEETS)) return true;
        return false;
    };

    return allPossibleItems.filter(canShowNavItem);
};

export const Sidebar: React.FC<SidebarProps> = ({ user, activeView, setActiveView }) => {
    const [badgeCounts, setBadgeCounts] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        const fetchBadgeData = async () => {
            if (!user.companyId) return;

            const newBadgeCounts: { [key: string]: number } = {};

            // Fetch pending timesheets for Admins/PMs
            if (hasPermission(user, Permission.MANAGE_TIMESHEETS)) {
                try {
                    const approvals = await api.getPendingApprovalsForCompany(user.companyId, user.id);
                    const timesheetApprovals = approvals.filter(a => a.type === 'Timesheet').length;
                    newBadgeCounts['timesheets'] = timesheetApprovals;
                } catch (e) { console.error("Failed to fetch approvals for badge"); }
            }

            // Fetch unacknowledged documents for operatives
            if (hasPermission(user, Permission.ACKNOWLEDGE_DOCUMENTS)) {
                 try {
                    const projects = await api.getProjectsByUser(user.id);
                    const projectIds = projects.map(p => p.id);
                    if (projectIds.length > 0) {
                        const [docs, acks] = await Promise.all([
                            api.getDocumentsByProjectIds(projectIds),
                            api.getDocumentAcksForUser(user.id)
                        ]);
                        const unacked = docs.filter(d => d.category === DocumentCategory.HS && !acks.some(a => a.documentId === d.id)).length;
                        newBadgeCounts['documents'] = unacked;
                    }
                } catch (e) { console.error("Failed to fetch documents for badge"); }
            }
            
            setBadgeCounts(newBadgeCounts);
        };

        fetchBadgeData();
    }, [user]);
  
    if (user.role === Role.PRINCIPAL_ADMIN) {
      return null;
    }
  
    const navItems = getNavItems(user);
    const settingsIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.554-.225a2.25 2.25 0 0 1 2.162 0l.554.225c.55.219 1.02.684 1.11 1.226l.09.542a2.25 2.25 0 0 0 3.352 2.122l.53-.306c.547-.318 1.21-.19 1.584.323l.37.558a2.25 2.25 0 0 1 0 2.454l-.37.558c-.374.513-.937.641-1.584.323l-.53-.306a2.25 2.25 0 0 0-3.352 2.122l-.09.542c-.09.542-.56 1.007-1.11 1.226l-.554.225a2.25 2.25 0 0 1-2.162 0l-.554-.225a1.125 1.125 0 0 1-1.11-1.226l-.09-.542a2.25 2.25 0 0 0-3.352-2.122l-.53.306c-.547-.318-1.21.19-1.584-.323l-.37-.558a2.25 2.25 0 0 1 0-2.454l.37-.558c.374.513.937.641 1.584.323l.53.306a2.25 2.25 0 0 0 3.352-2.122l.09-.542Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-screen p-4 flex-shrink-0">
      <div className="py-4 mb-4">
        <button onClick={() => setActiveView('dashboard')} className="w-full text-2xl font-bold text-center flex items-center justify-center gap-2 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-7 h-7 text-green-500">
                <path fill="currentColor" d="M12 2L2 22h20L12 2z"/>
            </svg>
            AS Agents
        </button>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.name}>
              <NavLink 
                icon={item.icon} 
                label={item.name} 
                isActive={activeView === item.view}
                onClick={() => setActiveView(item.view)}
                badgeCount={item.badgeKey ? badgeCounts[item.badgeKey] : 0}
              />
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-shrink-0 pt-4 border-t border-slate-700">
         {hasPermission(user, Permission.VIEW_COMPANY_SETTINGS) && (
            <NavLink 
                icon={settingsIcon} 
                label="Settings" 
                isActive={activeView === 'settings'}
                onClick={() => setActiveView('settings')}
            />
         )}
      </div>
    </div>
  );
};
