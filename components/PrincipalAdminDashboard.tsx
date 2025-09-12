
import React, { useState, useEffect, useCallback } from 'react';
import { User, Company, PendingApproval, SystemHealth, UsageMetric, PlatformSettings } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InviteCompanyModal } from './InviteCompanyModal';

interface PrincipalAdminDashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const PrincipalAdminDashboard: React.FC<PrincipalAdminDashboardProps> = ({ user, addToast }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const companiesData = await api.getCompanies();
            // Filter out the internal platform admin "company"
            setCompanies(companiesData.filter(c => c.id !== 0));
        } catch (error) {
            addToast("Failed to load platform data.", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInvite = async (companyName: string, adminEmail: string) => {
        addToast(`Invitation sent to ${adminEmail} for ${companyName}.`, 'success');
        // In a real app, this would trigger a backend process
    };

    if (loading) {
        return <Card><p>Loading Platform Dashboard...</p></Card>;
    }

    return (
        <div className="space-y-6">
            {isInviteModalOpen && <InviteCompanyModal onClose={() => setIsInviteModalOpen(false)} onInvite={handleInvite} />}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Platform Administration</h2>
                <Button onClick={() => setIsInviteModalOpen(true)}>Invite New Company</Button>
            </div>
            
            <Card>
                <h3 className="font-semibold text-lg mb-4">Tenant Companies</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Storage</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {companies.map(company => (
                                <tr key={company.id}>
                                    <td className="px-6 py-4 font-medium">{company.name}</td>
                                    <td className="px-6 py-4">{company.status}</td>
                                    <td className="px-6 py-4">{company.subscriptionPlan}</td>
                                    <td className="px-6 py-4">{company.storageUsageGB.toFixed(1)} GB</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
