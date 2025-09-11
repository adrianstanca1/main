import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role, Timesheet, Project, TimesheetStatus, Permission } from '../types';
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

export const TimesheetsView: React.FC<TimesheetsViewProps> = ({ user, addToast }) => {
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectingTimesheetId, setRejectingTimesheetId] = useState<number | null>(null);

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
                                {canManage && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>}
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
                                    {canManage && (
                                        <td className="px-6 py-4 text-right">
                                            {ts.status === TimesheetStatus.PENDING && (
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="success" onClick={() => handleApprove(ts.id)}>Approve</Button>
                                                    <Button size="sm" variant="danger" onClick={() => setRejectingTimesheetId(ts.id)}>Reject</Button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>
        </div>
    );
};