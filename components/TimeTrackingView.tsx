import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// FIX: Add View, Location, and CompanySettings to imports to fix type mismatches and use settings.
import { User, Project, Timesheet, WorkType, View, Location, CompanySettings } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useGeolocation, Geofence, GeofenceEvent } from '../hooks/useGeolocation';

interface TimeTrackingViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  // FIX: Changed setActiveView prop to accept View type instead of string.
  setActiveView: (view: View) => void;
}

const formatTimer = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

export const TimeTrackingView: React.FC<TimeTrackingViewProps> = ({ user, addToast, setActiveView }) => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeTimesheet, setActiveTimesheet] = useState<Timesheet | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedWorkType, setSelectedWorkType] = useState<WorkType>(WorkType.GENERAL_LABOR);

    const [shiftTimer, setShiftTimer] = useState<string>('00:00:00');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [checkInPhoto, setCheckInPhoto] = useState<File | null>(null);
    const [checkOutPhoto, setCheckOutPhoto] = useState<File | null>(null);
    const checkInPhotoRef = useRef<HTMLInputElement>(null);
    const checkOutPhotoRef = useRef<HTMLInputElement>(null);
    const [settings, setSettings] = useState<CompanySettings | null>(null);

    useEffect(() => {
        if (user.companyId) {
            api.getCompanySettings(user.companyId).then(setSettings);
        }
    }, [user.companyId]);

    const geofences = useMemo((): Geofence[] => {
        return projects
            .filter(p => p.geofenceRadius && p.location)
            .map(p => ({
                id: p.id,
                name: p.name,
                lat: p.location.lat,
                lng: p.location.lng,
                radius: p.geofenceRadius!,
            }));
    }, [projects]);
    
    const handleGeofenceEvent = useCallback((event: GeofenceEvent, geofence: Geofence) => {
        const title = `Geofence: ${geofence.name}`;
        const body = event === 'enter' 
            ? `You have entered the project site. Ready to clock in?`
            : `You have left the project site. Don't forget to clock out!`;
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.svg' });
        }
        addToast(body, 'success');
    }, [addToast]);

    const enableHighAccuracy = useMemo(() => settings?.locationPreferences.gpsAccuracy === 'high', [settings]);

    const { data: geoData, error: geoError, loading: geoLoading, getLocation, watchLocation, stopWatching, insideGeofenceIds } = useGeolocation({
        geofences,
        onGeofenceEvent: handleGeofenceEvent,
        enableHighAccuracy,
    });
    
    const fetchData = useCallback(async () => {
        try {
            const [userProjects, timesheetsData] = await Promise.all([
                api.getProjectsByUser(user.id),
                api.getTimesheetsByUser(user.id)
            ]);
            
            setProjects(userProjects);
            if (userProjects.length > 0 && !selectedProjectId) {
                setSelectedProjectId(userProjects[0].id.toString());
            }

            const currentActive = timesheetsData.find(t => t.clockOut === null) || null;
            setActiveTimesheet(currentActive);

        } catch (error) {
            addToast("Failed to load time tracking data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.id, addToast, selectedProjectId]);
    
    useEffect(() => {
        getLocation(); // Get initial location
        fetchData(); // Fetch projects, etc.
    }, [getLocation, fetchData]);

    useEffect(() => {
        const requestPermissionAndWatch = async () => {
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
            watchLocation();
        };

        requestPermissionAndWatch();
        
        return () => {
            stopWatching();
        }
    }, [watchLocation, stopWatching]);

    useEffect(() => {
        let timerId: number;
        if (activeTimesheet) {
            timerId = window.setInterval(() => {
                const now = new Date();
                const clockInTime = new Date(activeTimesheet.clockIn);
                const diff = now.getTime() - clockInTime.getTime();
                setShiftTimer(formatTimer(diff));
            }, 1000);
        } else {
            setShiftTimer('00:00:00');
        }
        return () => window.clearInterval(timerId);
    }, [activeTimesheet]);

    const handleClockIn = async () => {
        if (!selectedProjectId || !geoData) {
            addToast('Cannot determine your location or selected project.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.clockIn(user.id, parseInt(selectedProjectId, 10), {
                lat: geoData.coords.latitude,
                lng: geoData.coords.longitude,
                accuracy: geoData.coords.accuracy,
            }, selectedWorkType, checkInPhoto || undefined);
            addToast('Successfully clocked in!', 'success');
            setCheckInPhoto(null);
            await fetchData();
        } catch (error) {
            addToast(String(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClockOut = async () => {
        if (!activeTimesheet || !geoData) return;
        setIsSubmitting(true);
        try {
            await api.clockOut(activeTimesheet.id, { lat: geoData.coords.latitude, lng: geoData.coords.longitude, accuracy: geoData.coords.accuracy }, checkOutPhoto || undefined);
            addToast('Successfully clocked out!', 'success');
            setCheckOutPhoto(null);
            await fetchData();
        } catch (error) {
            addToast(String(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleBreak = async () => {
        if (!activeTimesheet) return;
        setIsSubmitting(true);
        const isOnBreak = activeTimesheet.breaks.some(b => b.endTime === null);
        try {
            const updatedTimesheet = isOnBreak
                ? await api.endBreak(activeTimesheet.id, user.id)
                : await api.startBreak(activeTimesheet.id, user.id);
            setActiveTimesheet(updatedTimesheet);
            addToast(isOnBreak ? "Break ended." : "Break started.", "success");
        } catch(error) {
            addToast(String(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const activeProject = useMemo(() => {
        if (!activeTimesheet) return null;
        return projects.find(p => p.id === activeTimesheet.projectId);
    }, [activeTimesheet, projects]);
    
    const isClockedInAndOutsideGeofence = useMemo(() => {
        if (!activeTimesheet || !activeTimesheet.projectId || !activeProject?.geofenceRadius) {
            return false;
        }
        // Check if the set of inside geofences DOES NOT include the active project's ID
        return !insideGeofenceIds.has(activeTimesheet.projectId);
    }, [activeTimesheet, insideGeofenceIds, activeProject]);

    const isOnBreak = activeTimesheet?.breaks.some(b => b.endTime === null);
    const totalBreakMillis = activeTimesheet?.breaks
        .reduce((total, b) => total + ((b.endTime ? new Date(b.endTime).getTime() : new Date().getTime()) - new Date(b.startTime).getTime()), 0) || 0;
    
    const GeofenceWarningBanner: React.FC = () => {
        if (!isClockedInAndOutsideGeofence) {
            return null;
        }
        return (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-md" role="alert">
                <div className="flex">
                    <div className="py-1">
                        <svg className="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/></svg>
                    </div>
                    <div>
                        <p className="font-bold">Geofence Alert</p>
                        <p className="text-sm">You appear to be outside the project site for '{activeProject?.name}'. Your timesheet may be flagged for review.</p>
                    </div>
                </div>
            </div>
        );
    };

    const GeofenceStatusIndicator: React.FC = () => {
        if (!activeTimesheet || !activeProject?.geofenceRadius) {
            return null;
        }
        const isInside = insideGeofenceIds.has(activeProject.id);
        return (
            <div className={`mt-2 text-xs flex items-center justify-center gap-1.5 ${isInside ? 'text-green-600' : 'text-yellow-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isInside ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                {isInside ? 'Inside project geofence' : 'Outside project geofence'}
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">Time Tracking</h2>
            
            <GeofenceWarningBanner />

            <Card className="mb-6 text-center">
                <p className={`text-sm font-bold uppercase tracking-wider ${activeTimesheet ? 'text-green-600' : 'text-slate-500'}`}>
                    {activeTimesheet ? `Clocked In to ${activeProject?.name}` : 'Not Clocked In'}
                </p>
                <p className="text-6xl font-bold my-2 text-slate-800 tabular-nums">{shiftTimer}</p>
                 <GeofenceStatusIndicator />
            </Card>

            {activeTimesheet ? (
                // --- CLOCKED IN VIEW ---
                <div className="space-y-6">
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">Break Tracking</h3>
                         <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total today</p>
                                <p className="text-2xl font-bold">{formatTimer(totalBreakMillis)}</p>
                            </div>
                            <Button variant={isOnBreak ? 'danger' : 'secondary'} onClick={handleBreak} isLoading={isSubmitting}>
                                {isOnBreak ? 'End Break' : 'Start Break'}
                            </Button>
                        </div>
                    </Card>
                    <Card>
                         <h3 className="font-semibold text-lg mb-4">Photo Documentation</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 border-2 border-dashed rounded-lg">
                                <p className="font-medium mb-2">Check-in Photo</p>
                                {activeTimesheet.checkInPhotoUrl ? <img src={activeTimesheet.checkInPhotoUrl} alt="Check-in" className="w-24 h-24 object-cover mx-auto rounded-md" /> : <p className="text-xs text-slate-400">Not taken</p>}
                            </div>
                            <div className="text-center p-4 border-2 border-dashed rounded-lg">
                                <p className="font-medium mb-2">Check-out Photo</p>
                                {checkOutPhoto ? <img src={URL.createObjectURL(checkOutPhoto)} alt="Check-out preview" className="w-24 h-24 object-cover mx-auto rounded-md" /> : <p className="text-xs text-slate-400">Not taken</p>}
                                <input type="file" ref={checkOutPhotoRef} accept="image/*" capture onChange={e => setCheckOutPhoto(e.target.files?.[0] || null)} className="hidden"/>
                                <Button variant="ghost" size="sm" className="mt-2" onClick={() => checkOutPhotoRef.current?.click()}>
                                    {checkOutPhoto ? 'Retake Photo' : 'Take Photo'}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 text-center mt-4">Photo may be required before clocking out.</p>
                    </Card>
                    <Button size="lg" className="w-full" onClick={handleClockOut} isLoading={isSubmitting}>
                        Stop Work
                    </Button>
                </div>
            ) : (
                // --- NOT CLOCKED IN VIEW ---
                <div className="space-y-6">
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">Select Project</h3>
                         <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full p-3 border rounded-md">
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </Card>
                     <Card>
                        <h3 className="font-semibold text-lg mb-4">Work Type</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setSelectedWorkType(WorkType.GENERAL_LABOR)} className={`p-4 rounded-lg border-2 text-center ${selectedWorkType === WorkType.GENERAL_LABOR ? 'border-slate-800 bg-slate-100' : 'border-slate-200'}`}>
                                <p className="font-semibold">{WorkType.GENERAL_LABOR}</p>
                                <p className="text-xs text-slate-500">Regular hourly work</p>
                            </button>
                             <button onClick={() => setSelectedWorkType(WorkType.EQUIPMENT_OPERATION)} className={`p-4 rounded-lg border-2 text-center ${selectedWorkType === WorkType.EQUIPMENT_OPERATION ? 'border-slate-800 bg-slate-100' : 'border-slate-200'}`}>
                                <p className="font-semibold">{WorkType.EQUIPMENT_OPERATION}</p>
                                <p className="text-xs text-slate-500">Project-based work</p>
                            </button>
                        </div>
                    </Card>
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">Photo Documentation</h3>
                        <div className="text-center p-4 border-2 border-dashed rounded-lg">
                            <p className="font-medium mb-2">Check-in Photo</p>
                            {checkInPhoto ? <img src={URL.createObjectURL(checkInPhoto)} alt="Check-in preview" className="w-24 h-24 object-cover mx-auto rounded-md" /> : <p className="text-xs text-slate-400">Not taken</p>}
                            <input type="file" ref={checkInPhotoRef} accept="image/*" capture onChange={e => setCheckInPhoto(e.target.files?.[0] || null)} className="hidden"/>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => checkInPhotoRef.current?.click()}>
                                {checkInPhoto ? 'Retake Photo' : 'Take Photo'}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400 text-center mt-4">Photo may be required before starting work.</p>
                    </Card>
                    <Button size="lg" className="w-full" onClick={handleClockIn} isLoading={isSubmitting}>
                        Start Work
                    </Button>
                </div>
            )}
        </div>
    );
};