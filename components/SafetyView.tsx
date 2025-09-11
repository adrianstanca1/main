


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, SafetyIncident, Project, IncidentSeverity, IncidentType, IncidentStatus, Permission, Role } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { IncidentSeverityBadge, IncidentStatusBadge } from './ui/StatusBadge';
import { hasPermission } from '../services/auth';

interface SafetyViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const ReportIncidentModal: React.FC<{
    user: User;
    projects: Project[];
    onClose: () => void;
    onReport: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, projects, onClose, onReport, addToast }) => {
    const [projectId, setProjectId] = useState<string>(projects[0]?.id.toString() || '');
    const [type, setType] = useState<IncidentType>(IncidentType.HAZARD_OBSERVATION);
    const [severity, setSeverity] = useState<IncidentSeverity>(IncidentSeverity.LOW);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !description.trim() || !location.trim()) {
            addToast('Please fill out all required fields.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await api.reportSafetyIncident({
                projectId: parseInt(projectId, 10),
                reporterId: user.id,
                timestamp: new Date(),
                severity,
                type,
                description,
                locationOnSite: location,
                status: IncidentStatus.REPORTED,
            }, user.id);
            addToast('Incident reported successfully!', 'success');
            onReport();
            onClose();
        } catch (error) {
            addToast('Failed to report incident.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Report Safety Incident</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Project</label>
                            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select value={type} onChange={e => setType(e.target.value as IncidentType)} className="mt-1 w-full p-2 border rounded-md bg-white">
                                {/* FIX: Explicitly convert enum value to string for key prop to satisfy TypeScript. */}
                                {Object.values(IncidentType).map(t => <option key={String(t)} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Severity</label>
                        <select value={severity} onChange={e => setSeverity(e.target.value as IncidentSeverity)} className="mt-1 w-full p-2 border rounded-md bg-white">
                             {/* FIX: Explicitly convert enum value to string for key prop to satisfy TypeScript. */}
                             {Object.values(IncidentSeverity).map(s => <option key={String(s)} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Location on Site</label>
                        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Level 3, East Wing" className="mt-1 w-full p-2 border rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe the incident or hazard in detail..." className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>Submit Report</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export const SafetyView: React.FC<SafetyViewProps> = ({ user, addToast }) => {
    const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const canReport = hasPermission(user, Permission.SUBMIT_SAFETY_REPORT);
    const canManage = hasPermission(user, Permission.MANAGE_SAFETY_REPORTS);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            let projectData: Project[];
            if (hasPermission(user, Permission.VIEW_ALL_PROJECTS)) {
                projectData = await api.getProjectsByCompany(user.companyId);
            } else {
                projectData = await api.getProjectsByUser(user.id);
            }
            setProjects(projectData);

            const incidentData = await api.getSafetyIncidentsByCompany(user.companyId);
            setIncidents(incidentData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (error) {
            addToast("Failed to load safety data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const getProjectName = (projectId: number) => projects.find(p => p.id === projectId)?.name || 'Unknown Project';

    if (loading) {
        return <Card><p>Loading safety data...</p></Card>;
    }

    return (
        <div>
            {isReportModalOpen && <ReportIncidentModal user={user} projects={projects} onClose={() => setIsReportModalOpen(false)} onReport={fetchData} addToast={addToast} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Safety Incidents</h2>
                {canReport && (
                    <Button variant="primary" onClick={() => setIsReportModalOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Report Incident
                    </Button>
                )}
            </div>
            <Card>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Severity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                {canManage && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {incidents.map(incident => (
                                <tr key={incident.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(incident.timestamp).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getProjectName(incident.projectId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{incident.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><IncidentSeverityBadge severity={incident.severity} /></td>
                                    <td className="px-6 py-4 max-w-sm truncate" title={incident.description}>{incident.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><IncidentStatusBadge status={incident.status} /></td>
                                    {canManage && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <Button variant="ghost" size="sm">View Details</Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {incidents.length === 0 && <p className="text-center py-8 text-slate-500">No safety incidents reported.</p>}
                 </div>
            </Card>
        </div>
    );
};