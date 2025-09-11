import React, { useState } from 'react';
import { User, Project, IncidentSeverity, IncidentType, IncidentStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ReportIncidentModalProps {
    user: User;
    projects: Project[];
    onClose: () => void;
    onReport: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({ user, projects, onClose, onReport, addToast }) => {
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
                                {Object.values(IncidentType).map(t => <option key={String(t)} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Severity</label>
                        <select value={severity} onChange={e => setSeverity(e.target.value as IncidentSeverity)} className="mt-1 w-full p-2 border rounded-md bg-white">
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