import React, { useState, useEffect, useCallback } from 'react';
import { User, Role, Company, CompanySettings, LocationPreferences, NotificationPreferences, Permission } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { Tag } from './ui/Tag';
import { hasPermission } from '../services/auth';

interface SettingsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
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

const SettingsRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    description?: string;
    action: 'arrow' | React.ReactNode;
    onClick?: () => void;
}> = ({ icon, label, description, action, onClick }) => (
    <div
        onClick={onClick}
        className={`flex items-center p-3 rounded-lg ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
    >
        <div className="mr-4 text-slate-500">{icon}</div>
        <div className="flex-grow">
            <p className="font-medium">{label}</p>
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
        <div>
            {action === 'arrow' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            ) : action}
        </div>
    </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ user, addToast, theme, setTheme }) => {
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const canManageCompanySettings = hasPermission(user, Permission.MANAGE_TEAM);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!user.companyId) {
                setIsLoading(false);
                return;
            }
            const settingsData = await api.getCompanySettings(user.companyId);
            setSettings(settingsData);
        } catch (error) {
            addToast("Failed to load settings.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSettingsUpdate = async (updates: Partial<CompanySettings>) => {
        if (!user.companyId || !settings) return;
        
        const originalSettings = { ...settings };
        const newSettings = { ...settings, ...updates };
        if(updates.notificationPreferences) {
            newSettings.notificationPreferences = { ...settings.notificationPreferences, ...updates.notificationPreferences };
        }
        if(updates.locationPreferences) {
            newSettings.locationPreferences = { ...settings.locationPreferences, ...updates.locationPreferences };
        }
        setSettings(newSettings);

        try {
            await api.updateCompanySettings(user.companyId, newSettings, user.id);
            addToast("Settings updated.", "success");
        } catch (error) {
            setSettings(originalSettings);
            addToast("Failed to save settings.", "error");
        }
    };

    const handleThemeChange = async (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        await handleSettingsUpdate({ theme: newTheme });
    };

    const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
        const newPrefs = { ...settings?.notificationPreferences, [key]: value };
        handleSettingsUpdate({ notificationPreferences: newPrefs as NotificationPreferences });
    };

    const handleLocationChange = (key: keyof LocationPreferences, value: any) => {
        const newPrefs = { ...settings?.locationPreferences, [key]: value };
        handleSettingsUpdate({ locationPreferences: newPrefs as LocationPreferences });
    };

    if (isLoading) {
        return <Card><p>Loading settings...</p></Card>;
    }
    
    const notifPrefs = settings?.notificationPreferences;
    const locPrefs = settings?.locationPreferences;

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Settings</h2>
            <div className="space-y-8">
                {/* Profile Card */}
                <Card className="flex items-center gap-4">
                    <Avatar name={user.name} className="w-16 h-16 text-2xl"/>
                    <div className="flex-grow">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">{user.name}</h3>
                            <Tag label={user.role} color="blue" />
                        </div>
                        <p className="text-slate-500">{user.email}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                        Edit
                    </Button>
                </Card>

                {/* Personal Settings */}
                <Card>
                    <h4 className="text-lg font-semibold px-3 mb-2">Personal Settings</h4>
                    <SettingsRow icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} label="Change Password" description="Update your account password" action="arrow" onClick={() => {}} />
                    <SettingsRow 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>} 
                        label="Theme" 
                        description="Personalize your app appearance" 
                        action={
                             <div className="flex items-center gap-2">
                                <span className={theme === 'light' ? '' : 'text-slate-500'}>Light</span>
                                <ToggleSwitch checked={theme === 'dark'} onChange={(isDark) => handleThemeChange(isDark ? 'dark' : 'light')} />
                                <span className={theme === 'dark' ? '' : 'text-slate-500'}>Dark</span>
                           </div>
                        } 
                    />
                </Card>

                {/* Company Settings */}
                {canManageCompanySettings && settings && (
                    <div>
                        <h3 className="text-xl font-bold text-slate-700 mt-10 mb-2">Company Administration</h3>
                        <p className="text-sm text-slate-500 mb-4">These settings apply to all users in your company.</p>
                        
                        {locPrefs && (
                            <Card>
                                <h4 className="text-lg font-semibold px-3 mb-2">Company-Wide Location Settings</h4>
                                <SettingsRow icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="GPS Accuracy" description="High accuracy uses more battery" action={<ToggleSwitch checked={locPrefs.gpsAccuracy === 'high'} onChange={c => handleLocationChange('gpsAccuracy', c ? 'high' : 'standard')} />} />
                                <SettingsRow icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Background Tracking" description="Track location when app is closed" action={<ToggleSwitch checked={locPrefs.backgroundTracking} onChange={c => handleLocationChange('backgroundTracking', c)} />} />
                                <SettingsRow 
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
                                    label="Location History" 
                                    description="Set how long location data is retained" 
                                    action={
                                        <select
                                            value={locPrefs.locationHistoryDays}
                                            onChange={e => handleLocationChange('locationHistoryDays', parseInt(e.target.value, 10) as 30 | 60 | 90)}
                                            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <option value={30}>30 days</option>
                                            <option value={60}>60 days</option>
                                            <option value={90}>90 days</option>
                                        </select>
                                    } 
                                />
                            </Card>
                        )}

                        {notifPrefs && (
                            <Card className="mt-8">
                                <h4 className="text-lg font-semibold px-3 mb-2">Company-Wide Notification Settings</h4>
                                <SettingsRow icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} label="Project Updates" description="New projects and assignments" action={<ToggleSwitch checked={notifPrefs.projectUpdates} onChange={c => handleNotificationChange('projectUpdates', c)} />} />
                                <SettingsRow icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Time Reminders" description="Check-in and check-out reminders" action={<ToggleSwitch checked={notifPrefs.timeReminders} onChange={c => handleNotificationChange('timeReminders', c)} />} />
                                <SettingsRow icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="Photo Requirements" description="Photo capture notifications" action={<ToggleSwitch checked={notifPrefs.photoRequirements} onChange={c => handleNotificationChange('photoRequirements', c)} />} />
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};