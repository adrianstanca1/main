import React, { useState, useEffect, useCallback } from 'react';
import { User, Project, SafetyIncident } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SafetyAnalysisProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    onBack: () => void;
}

export const SafetyAnalysis: React.FC<SafetyAnalysisProps> = ({ user, addToast, onBack }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        if (user.role === 'Company Admin') {
            const companyProjects = await api.getProjectsByCompany(user.companyId);
            setProjects(companyProjects);
        } else if (user.role === 'Project Manager') {
            const managedProjects = await api.getProjectsByManager(user.id);
            setProjects(managedProjects);
        }
    }, [user.id, user.role, user.companyId]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (selectedProjectId) {
            setReport(null);
            setError(null);
            api.getIncidentsByProject(parseInt(selectedProjectId, 10)).then(setIncidents);
        } else {
            setIncidents([]);
        }
    }, [selectedProjectId]);

    const handleGenerate = async () => {
        if (!selectedProjectId) {
             addToast("Please select a project.", 'error');
            return;
        }
         if (incidents.length === 0) {
            addToast("This project has no safety incidents to analyze.", 'error');
            return;
        }

        setIsLoading(true);
        setError(null);
        setReport(null);

        try {
            const result = await api.generateSafetyAnalysis(incidents, parseInt(selectedProjectId, 10), user.id);
            setReport(result.report);
            addToast("Safety analysis generated successfully!", 'success');
        } catch (err) {
            const errorMessage = "Failed to generate AI safety analysis.";
            setError(errorMessage);
            addToast(errorMessage, 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">AI Safety Analysis</h3>
            <p className="text-sm text-slate-500 mb-4">Analyze reported incidents for a project to identify trends and get actionable recommendations from AI.</p>
            
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div>
                    <label htmlFor="project-select-safety" className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                    <select
                        id="project-select-safety"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="" disabled>-- Choose a project --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <Button onClick={handleGenerate} isLoading={isLoading} disabled={!selectedProjectId}>
                    Generate Safety Analysis
                </Button>
                {selectedProjectId && incidents.length === 0 && !isLoading && (
                    <p className="text-sm text-slate-500 mt-2">No safety incidents have been reported for this project.</p>
                )}
            </div>
            
            {isLoading && (
                <div className="mt-6 text-center">
                    <p className="text-slate-600 animate-pulse">AI is analyzing safety data... this may take a moment.</p>
                </div>
            )}
            
            {error && <p className="mt-6 text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
            
            {report && (
                <div className="mt-6 pt-6 border-t">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4">AI Safety Analysis Report</h4>
                    <div className="bg-slate-50 p-4 rounded-md text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {report}
                    </div>
                </div>
            )}
        </Card>
    );
};
