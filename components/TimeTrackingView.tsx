


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// FIX: Add View and Location to imports to fix type mismatches.
import { User, Project, Timesheet, WorkType, View, Location } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useGeolocation } from '../hooks/useGeolocation';

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

    const { data: geoData, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
    
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
        getLocation();
        fetchData();
    }, [getLocation, fetchData]);

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
    
    const isOnBreak = activeTimesheet?.breaks.some(b => b.endTime === null);
    const totalBreakMillis = activeTimesheet?.breaks
        .reduce((total, b) => total + ((b.endTime ? new Date(b.endTime).getTime() : new Date().getTime()) - new Date(b.startTime).getTime()), 0) || 0;


    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">Time Tracking</h2>
            
            <Card className="mb-6 text-center">
                <p className={`text-sm font-bold uppercase tracking-wider ${activeTimesheet ? 'text-green-600' : 'text-slate-500'}`}>
                    {activeTimesheet ? 'Clocked In' : 'Not Clocked In'}
                </p>
                <p className="text-6xl font-bold my-2 text-slate-800 tabular-nums">{shiftTimer}</p>
                <p className="text-sm text-slate-500">Current Time: {new Date().toLocaleTimeString()}</p>
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