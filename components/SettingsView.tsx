import React, { useState, useEffect, useCallback } from 'react';
// FIX: Corrected import path
import { User, Role, Company, CompanySettings, LocationPreferences, NotificationPreferences, Permission } from '../types';
// FIX: Corrected import path
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