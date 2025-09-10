import React, { useState, useEffect, useCallback } from 'react';
import { User, Role, Company, CompanySettings, NotificationPreferences } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';

interface SettingsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

type SettingsSection = 'profile' | 'company' | 'notifications' | 'appearance';

export const SettingsView: React.FC<SettingsViewProps> = ({ user, addToast, theme, setTheme }) => {
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
    const [company, setCompany] = useState<Company | null>(null);
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isDirty = settings?.theme !== theme; // Example dirty check

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!user.companyId) {
                // If user has no company, they might be a Principal Admin or have a different setup.
                // For now, we just stop loading and show a limited view.
                setIsLoading(false);
                return;
            }
            const [companyData, settingsData] = await Promise.all([
                api.getCompanies().then(companies => companies.find(c => c.id === user.companyId) || null),
                api.getCompanySettings(user.companyId)
            ]);
            setCompany(companyData);
            setSettings(settingsData || null);
        } catch (error) {
            addToast("Failed to load settings.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleThemeChange = async (newTheme: 'light' | 'dark') => {
        if (!user.companyId) return;
        setTheme(newTheme);
        try {
            await api.updateCompanySettings(user.companyId, { theme: newTheme }, user.id);
            addToast("Theme updated!", "success");
        } catch (error) {
             addToast("Failed to save theme setting.", "error");
        }
    };
    
    const handleNotificationChange = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!settings || !user.companyId) return;
        
        const newPrefs = { ...(settings.notificationPreferences || {}), [key]: value };
        setSettings({ ...settings, notificationPreferences: newPrefs as NotificationPreferences });
        
        try {
            await api.updateCompanySettings(user.companyId, { notificationPreferences: newPrefs as NotificationPreferences }, user.id);
             addToast("Notification settings saved.", "success");
        } catch (error) {
             addToast("Failed to save notification settings.", "error");
        }
    };
    
    const handleSaveCompanySettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings || !user.companyId) return;
        try {
            const { timesheetRetentionDays, country, currency } = settings;
            await api.updateCompanySettings(user.companyId, { timesheetRetentionDays, country, currency }, user.id);
            addToast("Company settings saved.", "success");
        } catch (error) {
            addToast("Failed to save company settings.", "error");
        }
    };

    const isAdmin = user.role === Role.ADMIN;

    const navItems = [
        { id: 'profile', label: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        ...(isAdmin && user.companyId ? [{ id: 'company', label: 'Company', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> }] : []),
        ...(user.companyId ? [{ id: 'notifications', label: 'Notifications', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> }] : []),
        ...(user.companyId ? [{ id: 'appearance', label: 'Appearance', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> }] : []),
    ];

    const renderSection = () => {
        if (isLoading) return <p>Loading settings...</p>;

        switch(activeSection) {
            case 'profile':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Your Profile</h3>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-500">Name</label>
                                <p>{user.name}</p>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-500">Email</label>
                                <p>{user.email}</p>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-500">Role</label>
                                <p>{user.role}</p>
                            </div>
                        </div>
                    </div>
                );
            case 'company':
                 if (!isAdmin || !settings || !company) return null;
                 return (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Company Settings</h3>
                        <form onSubmit={handleSaveCompanySettings} className="space-y-6">
                            <div>
                                <label htmlFor="company-name" className="block text-sm font-medium text-slate-500 mb-1">Company Name</label>
                                <input type="text" id="company-name" value={company.name} disabled className="w-full max-w-sm p-2 border border-gray-300 rounded-md bg-slate-100 cursor-not-allowed"/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label htmlFor="company-country" className="block text-sm font-medium text-slate-500 mb-1">Country</label>
                                    <input type="text" id="company-country" value={settings.country} onChange={e => setSettings({...settings, country: e.target.value })} required className="w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="company-currency" className="block text-sm font-medium text-slate-500 mb-1">Currency</label>
                                     <select id="company-currency" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value as CompanySettings['currency'] })} className="w-full p-2 border border-gray-300 bg-white rounded-md">
                                        <option value="USD">USD ($)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="retention-policy" className="block text-sm font-medium text-slate-500 mb-1">Timesheet Retention Policy (Days)</label>
                                <input type="number" id="retention-policy" value={settings.timesheetRetentionDays} onChange={e => setSettings({...settings, timesheetRetentionDays: parseInt(e.target.value) })} required className="w-full max-w-sm p-2 border border-gray-300 rounded-md" />
                                <p className="text-xs text-slate-500 mt-1">How long to keep timesheet records before automatic deletion.</p>
                            </div>
                             <div className="text-left">
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </div>
                 );
            case 'notifications':
                if (!settings) return null;
                const prefs = settings.notificationPreferences || { taskDueDate: false, newDocumentAssigned: false, timesheetFlagged: false };
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Notification Preferences</h3>
                        <div className="space-y-4 max-w-lg">
                           <div className="flex justify-between items-center p-3 border rounded-md">
                               <div>
                                   <label className="font-medium">Task Due Soon</label>
                                   <p className="text-sm text-slate-500">Get a notification when a task you are assigned to is approaching its due date.</p>
                               </div>
                               <ToggleSwitch checked={!!prefs.taskDueDate} onChange={(val) => handleNotificationChange('taskDueDate', val)} />
                           </div>
                           <div className="flex justify-between items-center p-3 border rounded-md">
                               <div>
                                   <label className="font-medium">New Document Assigned</label>
                                   <p className="text-sm text-slate-500">Receive an alert when a new document requires your acknowledgement.</p>
                               </div>
                               <ToggleSwitch checked={!!prefs.newDocumentAssigned} onChange={(val) => handleNotificationChange('newDocumentAssigned', val)} />
                           </div>
                           <div className="flex justify-between items-center p-3 border rounded-md">
                               <div>
                                   <label className="font-medium">Timesheet Flagged</label>
                                   <p className="text-sm text-slate-500">(Managers) Be notified when an operative's timesheet is flagged for review.</p>
                               </div>
                               <ToggleSwitch checked={!!prefs.timesheetFlagged} onChange={(val) => handleNotificationChange('timesheetFlagged', val)} disabled={!isAdmin && user.role !== Role.PM} />
                           </div>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Appearance</h3>
                        <p className="text-sm text-slate-500 mb-4">Customize the look and feel of the application.</p>
                        <div className="p-3 border rounded-md max-w-lg">
                           <div className="flex justify-between items-center">
                               <label className="font-medium">Theme</label>
                               <div className="flex items-center gap-2">
                                    <span className={theme === 'light' ? '' : 'text-slate-500'}>Light</span>
                                    <ToggleSwitch checked={theme === 'dark'} onChange={(isDark) => handleThemeChange(isDark ? 'dark' : 'light')} />
                                    <span className={theme === 'dark' ? '' : 'text-slate-500'}>Dark</span>
                               </div>
                           </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Settings</h2>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4 lg:w-1/5">
                    <nav className="flex flex-col space-y-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id as SettingsSection)}
                                className={`flex items-center gap-3 p-2 rounded-md text-left transition-colors ${activeSection === item.id ? 'bg-slate-200 dark:bg-slate-700 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 md:w-3/4 lg:w-4/5">
                    <Card>
                        {renderSection()}
                    </Card>
                </main>
            </div>
        </div>
    );
};