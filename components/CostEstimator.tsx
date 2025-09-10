import React, { useState, useEffect, useCallback } from 'react';
import { User, Project, CostEstimate } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface CostEstimatorProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    onBack: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const CostEstimator: React.FC<CostEstimatorProps> = ({ user, addToast, onBack }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [scope, setScope] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [estimates, setEstimates] = useState<CostEstimate[] | null>(null);
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

    const handleEstimate = async () => {
        const selectedProject = projects.find(p => p.id === parseInt(selectedProjectId, 10));
        if (!selectedProject || !scope.trim()) {
            addToast("Please select a project and provide a scope of work.", 'error');
            return;
        }

        setIsLoading(true);
        setError(null);
        setEstimates(null);

        try {
            const result = await api.estimateProjectCostsWithAi(selectedProject, scope, user.id);
            setEstimates(result);
            addToast("Cost estimation completed successfully!", 'success');
        } catch (err) {
            const errorMessage = "Failed to generate AI cost estimate.";
            setError(errorMessage);
            addToast(errorMessage, 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const totalCost = estimates ? estimates.reduce((sum, item) => sum + item.totalCost, 0) : 0;

    return (
        <Card>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">AI Cost Estimator</h3>
            <p className="text-sm text-slate-500 mb-4">Leverage AI to generate a preliminary cost breakdown for a scope of work within a project.</p>
            
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div>
                    <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                    <select
                        id="project-select"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="" disabled>-- Choose a project --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="scope-input" className="block text-sm font-medium text-gray-700 mb-1">
                        Scope of Work
                    </label>
                    <textarea
                        id="scope-input"
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        rows={6}
                        placeholder="Describe the work to be estimated. e.g., 'Excavate and pour a 2000 sq ft concrete foundation...'"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={!selectedProjectId}
                    />
                </div>
                
                <Button onClick={handleEstimate} isLoading={isLoading} disabled={!selectedProjectId || !scope.trim()}>
                    Generate Estimate
                </Button>
            </div>
            
            {isLoading && (
                <div className="mt-6 text-center">
                    <p className="text-slate-600 animate-pulse">AI is analyzing the scope and preparing your estimate...</p>
                </div>
            )}
            
            {error && <p className="mt-6 text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
            
            {estimates && (
                <div className="mt-6 pt-6 border-t">
                    <div className="flex justify-between items-center mb-4">
                         <h4 className="text-lg font-semibold text-slate-800">Generated Cost Estimate</h4>
                         <div className="text-right">
                            <p className="text-sm text-slate-500">Total Estimated Cost</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalCost)}</p>
                         </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {estimates.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800">{item.category}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-slate-700">{item.item}</p>
                                            <p className="text-xs text-slate-500">{item.justification}</p>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-slate-700">{formatCurrency(item.totalCost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Card>
    );
}