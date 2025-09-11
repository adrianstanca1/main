

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role, Timesheet, Project, TimesheetStatus, Permission, WorkType } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { TimesheetStatusBadge } from './ui/StatusBadge';
import { hasPermission } from '../services/auth';

interface TimesheetsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const RejectModal: React.FC<{ onReject: (reason: string) => void; onClose: () => void; }> = ({ onReject, onClose }) => {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2">Reject Timesheet</h3>
                <p className="text-sm text-slate-500 mb-4">Please provide a reason for rejection. This will be visible to the operative.</p>
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Incorrect work type selected, hours seem inaccurate..."
                    autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="danger" onClick={() => onReject(reason)} disabled={!reason.trim()}>Reject</Button>
                </div>
            </Card>
        </div>
    );
};

const EditTimesheetModal: React.FC<{
    timesheet: Timesheet;
    projects: Project[];
    onClose: () => void;
    onSave: (id: number, updates: Partial<Timesheet>) => Promise<void>;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ timesheet, projects, onClose, onSave, addToast }) => {
    const [formData, setFormData] = useState({ ...timesheet });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const formatDateForInput = (date: Date | null): string => {
        if (!date) return '';
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    const handleInputChange = (field: keyof Timesheet, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // FIX: Cast field to string to handle potential symbol keys which cannot be used as an index.
        if (errors[field as string]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                // FIX: Cast field to string to handle potential symbol keys which cannot be used as an index.
                delete newErrors[field as string];
                return newErrors;
            });
        }
    };

    const handleBreakChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const newBreaks = [...formData.breaks];
        newBreaks[index] = { ...newBreaks[index], [field]: value ? new Date(value) : null };
        handleInputChange('breaks', newBreaks);
        const errorKey = `break_${index}`;
        if(errors[errorKey]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[errorKey];
                return newErrors;
            })
        }
    };

    const addBreak = () => {
        const newBreaks = [...formData.breaks, { startTime: new Date(), endTime: null }];
        handleInputChange('breaks', newBreaks);
    };

    const removeBreak = (index: number) => {
        const newBreaks = formData.breaks.filter((_, i) => i !== index);
        handleInputChange('breaks', newBreaks);
    };
    
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        const clockInTime = new Date(formData.clockIn).getTime();
        
        if (!formData.clockOut) {
            newErrors.clockOut = 'Clock-out time is required.';
        } else {
            const clockOutTime = new Date(formData.clockOut).getTime();
            if (clockOutTime <= clockInTime) {
                newErrors.clockOut = 'Clock-out must be after clock-in.';
            }

            if (!newErrors.clockOut) {
                // Individual break validation
                formData.breaks.forEach((breakItem, index) => {
                    const errorKey = `break_${index}`;
                    if (!breakItem.startTime || !breakItem.endTime) {
                        newErrors[errorKey] = 'Both start and end times are required for breaks.';
                        return; // continue
                    }
                    const breakStart = new Date(breakItem.startTime).getTime();
                    const breakEnd = new Date(breakItem.endTime).getTime();
    
                    if (breakEnd <= breakStart) {
                        newErrors[errorKey] = 'End time must be after start time.';
                    } else if (breakStart < clockInTime || breakEnd > clockOutTime) {
                        newErrors[errorKey] = 'Break must be within the shift duration.';
                    }
                });
    
                // Overlap validation (only if no other break errors)
                if (formData.breaks.length > 1 && !Object.keys(newErrors).some(k => k.startsWith('break_'))) {
                    const sortedBreaks = [...formData.breaks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    for (let i = 1; i < sortedBreaks.length; i++) {
                        const prevBreak = sortedBreaks[i-1];
                        const currentBreak = sortedBreaks[i];
    
                        if (new Date(currentBreak.startTime).getTime() < new Date(prevBreak.endTime!).getTime()) {
                            // Find original indices by reference
                            const prevIndex = formData.breaks.findIndex(b => b === prevBreak);
                            const currentIndex = formData.breaks.findIndex(b => b === currentBreak);
                            
                            const errorMsg = 'Breaks cannot overlap.';
                            if (prevIndex > -1) newErrors[`break_${prevIndex}`] = errorMsg;
                            if (currentIndex > -1) newErrors[`break_${currentIndex}`] = errorMsg;
                            break;
                        }
                    }
                }
            }
        }
    
        if (formData.comment && formData.comment.trim().length > 0 && formData.comment.trim().length < 10) {
            newErrors.comment = 'Comment must be at least 10 characters long.';
        }
    
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSave = async () => {
        if (!validate()) {
            addToast('Please fix the errors before saving.', 'error');
            return;
        }
        
        setIsSaving(true);
        const updates: Partial<Timesheet> = {};
        
        if (formData.projectId !== timesheet.projectId) updates.projectId = formData.projectId;
        if (new Date(formData.clockIn).getTime() !== new Date(timesheet.clockIn).getTime()) updates.clockIn = formData.clockIn;
        if (formData.clockOut && new Date(formData.clockOut).getTime() !== new Date(timesheet.clockOut || 0).getTime()) updates.clockOut = formData.clockOut;
        if (formData.workType !== timesheet.workType) updates.workType = formData.workType;
        if (formData.comment !== timesheet.comment) updates.comment = formData.comment;
        
        const breaksChanged = JSON.stringify(formData.breaks.map(b => ({ s: new Date(b.startTime).getTime(), e: b.endTime ? new Date(b.endTime).getTime() : null }))) 
            !== JSON.stringify(timesheet.breaks.map(b => ({ s: new Date(b.startTime).getTime(), e: b.endTime ? new Date(b.endTime).getTime() : null })));
        
        if (breaksChanged) {
            updates.breaks = formData.breaks;
        }

        if (Object.keys(updates).length === 0) {
            addToast('No changes were made.', 'success');
            onClose();
            return;
        }

        await onSave(timesheet.id, updates);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 flex-shrink-0">Edit Timesheet</h3>
                <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Project</label>
                            <select value={formData.projectId} onChange={(e) => handleInputChange('projectId', parseInt(e.target.value, 10))} className="w-full p-2 border rounded-md bg-white mt-1">
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="text-sm font-medium text-gray-700">Work Type</label>
                            <select value={formData.workType} onChange={(e) => handleInputChange('workType', e.target.value as WorkType)} className="w-full p-2 border rounded-md bg-white mt-1">
                                {/* FIX: Use String() for enum keys in map to prevent potential type errors. */}
                                {Object.values(WorkType).map(wt => <option key={String(wt)} value={wt}>{wt}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Clock In</label>
                            <input type="datetime-local" value={formatDateForInput(formData.clockIn)} onChange={(e) => handleInputChange('clockIn', new Date(e.target.value))} className={`w-full p-2 border rounded-md mt-1 ${errors.clockIn ? 'border-red-500' : 'border-gray-300'}`}/>
                            {errors.clockIn && <p className="text-xs text-red-500 mt-1">{errors.clockIn}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Clock Out</label>
                            <input type="datetime-local" value={formatDateForInput(formData.clockOut)} onChange={(e) => handleInputChange('clockOut', e.target.value ? new Date(e.target.value) : null)} className={`w-full p-2 border rounded-md mt-1 ${errors.clockOut ? 'border-red-500' : 'border-gray-300'}`}/>
                             {errors.clockOut && <p className="text-xs text-red-500 mt-1">{errors.clockOut}</p>}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mt-4 mb-2">Breaks</h4>
                        <div className="space-y-2">
                            {formData.breaks.map((breakItem, index) => (
                                <div key={index} className="p-2 bg-slate-50 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-grow grid grid-cols-2 gap-2">
                                            <input type="datetime-local" value={formatDateForInput(breakItem.startTime)} onChange={e => handleBreakChange(index, 'startTime', e.target.value)} className={`w-full p-1 border rounded-md text-sm ${errors[`break_${index}`] ? 'border-red-500' : 'border-gray-300'}`} />
                                            <input type="datetime-local" value={formatDateForInput(breakItem.endTime)} onChange={e => handleBreakChange(index, 'endTime', e.target.value)} className={`w-full p-1 border rounded-md text-sm ${errors[`break_${index}`] ? 'border-red-500' : 'border-gray-300'}`} />
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => removeBreak(index)}>X</Button>
                                    </div>
                                    {errors[`break_${index}`] && <p className="text-xs text-red-500 mt-1 px-1">{errors[`break_${index}`]}</p>}
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" size="sm" onClick={addBreak} className="mt-2">Add Break</Button>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Comment</label>
                        <textarea value={formData.comment || ''} onChange={(e) => handleInputChange('comment', e.target.value)} className={`w-full p-2 border rounded-md mt-1 ${errors.comment ? 'border-red-500' : 'border-gray-300'}`} />
                         {errors.comment && <p className="text-xs text-red-500 mt-1">{errors.comment}</p>}
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t flex-shrink-0">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
                </div>
            </Card>
        </div>
    );
};


export const TimesheetsView: React.FC<TimesheetsViewProps> = ({ user, addToast }) => {
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectingTimesheetId, setRejectingTimesheetId] = useState<number | null>(null);
    const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);

    const canManage = useMemo(() => hasPermission(user, Permission.MANAGE_TIMESHEETS), [user]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) {
                setLoading(false);
                return;
            }
            let tsData: Timesheet[];
            if (user.role === Role.ADMIN) {
                tsData = await api.getTimesheetsByCompany(user.companyId, user.id);
            } else if (user.role === Role.PM) {
                tsData = await api.getTimesheetsForManager(user.id);
            } else {
                tsData = await api.getTimesheetsByUser(user.id);
            }
            
            const [usersData, projectsData] = await Promise.all([
                api.getUsersByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId)
            ]);
            
            setTimesheets(tsData);
            setUsers(usersData);
            setProjects(projectsData);
        } catch (error) {
            addToast("Failed to load timesheets.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (id: number) => {
        try {
            await api.updateTimesheetStatus(id, TimesheetStatus.APPROVED, undefined, user.id);
            addToast("Timesheet approved!", "success");
            fetchData();
        } catch (error) {
            addToast("Failed to approve timesheet.", "error");
        }
    };
    
    const handleReject = async (reason: string) => {
        if (!rejectingTimesheetId) return;
        try {
            await api.updateTimesheetStatus(rejectingTimesheetId, TimesheetStatus.REJECTED, reason, user.id);
            addToast("Timesheet rejected.", "success");
            setRejectingTimesheetId(null);
            fetchData();
        } catch (error) {
            addToast("Failed to reject timesheet.", "error");
        }
    };

    const handleSaveTimesheet = async (id: number, updates: Partial<Timesheet>) => {
        try {
            await api.updateTimesheet(id, updates, user.id);
            addToast("Timesheet updated successfully!", "success");
            setEditingTimesheet(null);
            fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update timesheet.";
            addToast(message, "error");
        }
    };

    const formatHours = (clockIn: Date, clockOut: Date | null): string => {
        if (!clockOut) return 'Active';
        const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
        const hours = diffMs / (1000 * 60 * 60);
        return `${hours.toFixed(2)} hrs`;
    };

    const getUserName = (id: number) => users.find(u => u.id === id)?.name || 'Unknown';
    const getProjectName = (id: number) => projects.find(p => p.id === id)?.name || 'Unknown';
    
    if (loading) return <Card><p>Loading timesheets...</p></Card>;

    return (
        <div>
            {rejectingTimesheetId && <RejectModal onClose={() => setRejectingTimesheetId(null)} onReject={handleReject} />}
            {editingTimesheet && (
                <EditTimesheetModal
                    timesheet={editingTimesheet}
                    projects={projects}
                    onClose={() => setEditingTimesheet(null)}
                    onSave={handleSaveTimesheet}
                    addToast={addToast}
                />
            )}
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Timesheets</h2>
            <Card>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {canManage && <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>}
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Hours</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Comment/Reason</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {timesheets.map(ts => (
                                <tr key={ts.id} className="hover:bg-slate-50">
                                    {canManage && <td className="px-6 py-4 font-medium">{getUserName(ts.userId)}</td>}
                                    <td className="px-6 py-4">{new Date(ts.clockIn).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{getProjectName(ts.projectId)}</td>
                                    <td className="px-6 py-4">{formatHours(ts.clockIn, ts.clockOut)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        <div className="flex flex-col space-y-1">
                                            {ts.clockInLocation ? (
                                                <div className="flex items-center gap-2">
                                                    <a href={`https://www.google.com/maps?q=${ts.clockInLocation.lat},${ts.clockInLocation.lng}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        Clock-in
                                                    </a>
                                                    {ts.trustScore && ts.trustScore < 0.8 && (
                                                        <div title={Object.values(ts.trustReasons || {}).join('; ')} aria-label="Warning for this entry">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}
                                            {ts.clockOutLocation ? (
                                                <a href={`https://www.google.com/maps?q=${ts.clockOutLocation.lat},${ts.clockOutLocation.lng}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    Clock-out
                                                </a>
                                            ) : null}
                                            {!ts.clockInLocation && !ts.clockOutLocation && '—'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><TimesheetStatusBadge status={ts.status} /></td>
                                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={ts.comment}>{ts.comment || '—'}</td>
                                    <td className="px-6 py-4 text-right">
                                        {ts.status === TimesheetStatus.PENDING && (
                                            <div className="flex gap-2 justify-end">
                                                {(canManage || ts.userId === user.id) && (
                                                    <Button size="sm" variant="secondary" onClick={() => setEditingTimesheet(ts)}>Edit</Button>
                                                )}
                                                {canManage && (
                                                    <>
                                                        <Button size="sm" variant="success" onClick={() => handleApprove(ts.id)}>Approve</Button>
                                                        <Button size="sm" variant="danger" onClick={() => setRejectingTimesheetId(ts.id)}>Reject</Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>
        </div>
    );
};
