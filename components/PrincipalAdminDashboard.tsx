import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Company, SystemHealth, UsageMetric, PlatformSettings, PendingApproval, AuditLog, AuditLogAction, Announcement } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InviteCompanyModal } from './InviteCompanyModal';
import { ToggleSwitch } from './ui/ToggleSwitch';

interface PrincipalAdminDashboardProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const HealthStat: React.FC<{ title: string; value: string | number; unit?: string }> = ({ title, value, unit }) => (
    <div>
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-lg font-bold text-slate-800">
            {value} <span className="text-sm font-normal text-slate-600">{unit}</span>
        </p>
    </div>
);

const SystemStatus: React.FC<{ service: string; isOk: boolean }> = ({ service, isOk }) => (
    <div className="flex justify-between items-center text-sm p-3 border-b last:border-0">
        <p>{service}</p>
        <div className={`flex items-center gap-1.5 font-semibold ${isOk ? 'text-green-600' : 'text-red-600'}`}>
            {isOk ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <span>{isOk ? 'Operational' : 'Issues Detected'}</span>
        </div>
    </div>
);

type AdminTab = 'overview' | 'companies' | 'analytics' | 'settings' | 'status' | 'audit' | 'communications';

export const PrincipalAdminDashboard: React.FC<PrincipalAdminDashboardProps> = ({ user, addToast }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [stats, setStats] = useState<{ totalCompanies: number, totalUsers: number, activeProjects: number } | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([]);
    const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [healthData, companiesData, usageData, platformStats, settingsData, approvalsData, auditData, announcementData] = await Promise.all([
                api.getSystemHealth(user.id),
                api.getAllCompaniesForAdmin(user.id),
                api.getUsageMetrics(user.id),
                api.getPlatformStats(user.id),
                api.getPlatformSettings(user.id),
                api.getPendingApprovalsForPlatform(user.id),
                api.getPlatformAuditLogs(user.id),
                api.getPlatformAnnouncements(user.id),
            ]);
            setSystemHealth(healthData);
            setCompanies(companiesData);
            setUsageMetrics(usageData);
            setStats(platformStats);
            setPlatformSettings(settingsData);
            setPendingApprovals(approvalsData);
            setAuditLogs(auditData);
            setAnnouncements(announcementData.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
        } catch (error) {
            addToast("Failed to load platform data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [user.id, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateStatus = async (companyId: number, status: Company['status']) => {
        try {
            await api.updateCompanyStatus(companyId, status, user.id);
            addToast(`Company status updated to ${status}.`, 'success');
            fetchData(); // Refresh data
        } catch (error) {
             addToast(`Failed to update status: ${error}`, 'error');
        }
    };
    
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!platformSettings) return;

        try {
            await api.updatePlatformSettings(platformSettings, user.id);
            addToast('System settings saved successfully!', 'success');
        } catch (error) {
            addToast('Failed to save settings.', 'error');
        }
    };

    const renderOverview = () => (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card><h4 className="text-sm font-medium text-slate-500">Total Companies</h4><p className="text-3xl font-bold">{stats.totalCompanies}</p></Card>
                        <Card><h4 className="text-sm font-medium text-slate-500">Total Users</h4><p className="text-3xl font-bold">{stats.totalUsers}</p></Card>
                        <Card><h4 className="text-sm font-medium text-slate-500">Active Projects</h4><p className="text-3xl font-bold">{stats.activeProjects}</p></Card>
                    </div>
                )}
                 {pendingApprovals.length > 0 && (
                    <Card>
                        <h3 className="font-semibold text-lg mb-2">Platform-Wide Pending Approvals</h3>
                        <ul className="divide-y divide-slate-200">
                            {pendingApprovals.map(item => (
                                <li key={item.id} className="py-2 flex justify-between items-center">
                                    <div>
                                        <span className="font-medium">{item.type}: {item.description}</span>
                                        <span className="text-sm text-slate-500 ml-2">from {companies.find(c=>c.id === item.companyId)?.name}</span>
                                    </div>
                                    <Button size="sm">Review</Button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                        <Button className="w-full" onClick={() => setIsInviteModalOpen(true)}>Invite New Company</Button>
                        <Button className="w-full" variant="secondary" onClick={() => setActiveTab('communications')}>Send Platform Announcement</Button>
                    </div>
                 </Card>
                 {systemHealth && (
                    <Card>
                        <h3 className="font-semibold text-lg mb-4">System Status</h3>
                        <div className="space-y-2">
                            <SystemStatus service="API" isOk={systemHealth.apiHealth.errorRate < 1} />
                            <SystemStatus service="Database" isOk={systemHealth.databaseHealth.latency < 100} />
                            <SystemStatus service="Storage" isOk={systemHealth.storageHealth.status === 'Operational'} />
                        </div>
                    </Card>
                 )}
            </div>
        </div>
    );
    
    const renderCompanies = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-800">Tenant Management</h3>
                <Button variant="primary" onClick={() => setIsInviteModalOpen(true)}>Invite New Company</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Storage Used</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {companies.map(company => (
                            <tr key={company.id}>
                                <td className="px-6 py-4 font-medium">{company.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        company.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        company.status === 'Suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                    }`}>{company.status}</span>
                                </td>
                                <td className="px-6 py-4 text-sm">{company.subscriptionPlan || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm">{company.storageUsageGB?.toFixed(2) || '0.00'} GB</td>
                                <td className="px-6 py-4 text-right">
                                    {company.status === 'Active' && <Button size="sm" variant="danger" onClick={() => handleUpdateStatus(company.id, 'Suspended')}>Suspend</Button>}
                                    {company.status === 'Suspended' && <Button size="sm" variant="success" onClick={() => handleUpdateStatus(company.id, 'Active')}>Reactivate</Button>}
                                    {company.status !== 'Archived' && <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(company.id, 'Archived')}>Archive</Button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderAnalytics = () => {
        const maxApiCalls = useMemo(() => Math.max(...usageMetrics.map(m => m.apiCalls), 0), [usageMetrics]);
        return(
            <Card>
                 <h3 className="text-xl font-semibold text-slate-800 mb-4">Usage Analytics (by API Calls)</h3>
                 <div className="space-y-4">
                     {usageMetrics.map(metric => {
                        const company = companies.find(c => c.id === metric.companyId);
                        const widthPercent = maxApiCalls > 0 ? (metric.apiCalls / maxApiCalls) * 100 : 0;
                        return (
                            <div key={metric.companyId}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">{company?.name}</span>
                                    <span className="text-slate-500">{metric.apiCalls.toLocaleString()} API Calls</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${widthPercent}%`}}></div>
                                </div>
                            </div>
                        )
                     })}
                 </div>
            </Card>
        );
    }
    
    const renderSettings = () => {
        if (!platformSettings) return <p>Loading settings...</p>;

        const handleSettingsChange = (field: keyof PlatformSettings, value: any) => {
            setPlatformSettings(prev => prev ? { ...prev, [field]: value } : null);
        };

        return (
            <Card>
                <h3 className="text-xl font-semibold text-slate-800 mb-6">System Settings</h3>
                <form onSubmit={handleSaveSettings} className="space-y-8 max-w-2xl">
                    {/* Provisioning Section */}
                    <div>
                        <h4 className="text-lg font-medium text-slate-700 mb-4 border-b pb-2">Tenant Provisioning Defaults</h4>
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="onboarding-workflow" className="block text-sm font-medium text-gray-700 mb-1">New Tenant Onboarding</label>
                                <select
                                    id="onboarding-workflow"
                                    value={platformSettings.newTenantOnboardingWorkflow}
                                    onChange={e => handleSettingsChange('newTenantOnboardingWorkflow', e.target.value)}
                                    className="w-full max-w-xs p-2 border border-gray-300 bg-white rounded-md shadow-sm"
                                >
                                    <option value="manual">Manual Approval</option>
                                    <option value="auto">Automatic Provisioning</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="storage-quota" className="block text-sm font-medium text-gray-700 mb-1">Default Storage Quota (GB)</label>
                                <input
                                    type="number"
                                    id="storage-quota"
                                    value={platformSettings.defaultStorageQuotaGB}
                                    onChange={e => handleSettingsChange('defaultStorageQuotaGB', parseInt(e.target.value, 10))}
                                    className="w-full max-w-xs p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Security Section */}
                    <div>
                        <h4 className="text-lg font-medium text-slate-700 mb-4 border-b pb-2">Security Settings</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-gray-700">Enforce MFA for All Tenants</label>
                                    <p className="text-sm text-slate-500">New and existing users will be required to set up Multi-Factor Authentication.</p>
                                </div>
                                <ToggleSwitch
                                    checked={platformSettings.mfaRequired}
                                    onChange={checked => handleSettingsChange('mfaRequired', checked)}
                                />
                            </div>
                            <div>
                                <label htmlFor="log-retention" className="block text-sm font-medium text-gray-700 mb-1">Audit Log Retention (Days)</label>
                                <input
                                    type="number"
                                    id="log-retention"
                                    value={platformSettings.logRetentionDays}
                                    onChange={e => handleSettingsChange('logRetentionDays', parseInt(e.target.value, 10))}
                                    className="w-full max-w-xs p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <Button type="submit">Save System Settings</Button>
                    </div>
                </form>
            </Card>
        );
    };

     const renderStatus = () => {
        if (!systemHealth) return <Card><p>Loading system status...</p></Card>;
        return (
            <Card>
                <h3 className="font-semibold text-lg mb-4">System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <SystemStatus service="API" isOk={systemHealth.apiHealth.errorRate < 1} />
                        <SystemStatus service="Database" isOk={systemHealth.databaseHealth.latency < 100} />
                        <SystemStatus service="Storage" isOk={systemHealth.storageHealth.status === 'Operational'} />
                    </div>
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                         <HealthStat title="Uptime" value={systemHealth.uptime} />
                         <HealthStat title="API Throughput" value={systemHealth.apiHealth.throughput} unit="req/min" />
                         <HealthStat title="DB Latency" value={systemHealth.databaseHealth.latency} unit="ms" />
                    </div>
                </div>
            </Card>
        )
     }

     const SendAnnouncement: React.FC = () => {
        const [title, setTitle] = useState('');
        const [content, setContent] = useState('');
        const [isSending, setIsSending] = useState(false);

        const handleSend = async (e: React.FormEvent) => {
            e.preventDefault();
            if(!title.trim() || !content.trim()) {
                addToast('Title and content are required.', 'error');
                return;
            }
            setIsSending(true);
            try {
                await api.sendAnnouncement({
                    senderId: user.id,
                    scope: 'platform',
                    title,
                    content
                }, user.id);
                addToast('Platform announcement sent!', 'success');
                setTitle('');
                setContent('');
                fetchData();
            } catch (error) {
                addToast('Failed to send announcement.', 'error');
            } finally {
                setIsSending(false);
            }
        }

        return (
            <Card className="mb-6">
                 <h4 className="text-lg font-semibold text-slate-800 mb-4">Send New Platform Announcement</h4>
                 <form onSubmit={handleSend} className="space-y-4">
                     <div>
                        <label htmlFor="ann-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input id="ann-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md" required/>
                    </div>
                     <div>
                        <label htmlFor="ann-content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                        <textarea id="ann-content" value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full p-2 border rounded-md" required/>
                    </div>
                    <Button type="submit" isLoading={isSending}>Send to All Companies</Button>
                 </form>
            </Card>
        )
     }
     
     const renderCommunications = () => (
        <div>
            <SendAnnouncement />
            <Card>
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Sent Announcements</h3>
                <div className="space-y-4">
                    {announcements.map(ann => (
                        <div key={ann.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-slate-700">{ann.title}</h4>
                                <p className="text-xs text-slate-400">{new Date(ann.createdAt).toLocaleString()}</p>
                            </div>
                            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{ann.content}</p>
                        </div>
                    ))}
                    {announcements.length === 0 && <p className="text-slate-500 text-center py-4">No announcements sent yet.</p>}
                </div>
            </Card>
        </div>
     );
     
    const renderAuditLog = () => (
        <Card>
             <h3 className="text-xl font-semibold text-slate-800 mb-4">Platform Audit Log</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Target</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {auditLogs.map(log => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm font-medium">{log.action}</td>
                                <td className="px-6 py-4 text-sm">{log.target?.name || 'N/A'} ({log.target?.type})</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return renderOverview();
            case 'companies': return renderCompanies();
            case 'analytics': return renderAnalytics();
            case 'settings': return renderSettings();
            case 'status': return renderStatus();
            case 'audit': return renderAuditLog();
            case 'communications': return renderCommunications();
            default: return null;
        }
    }

    if (loading) return <Card><p>Loading Platform Dashboard...</p></Card>;

    return (
        <div className="space-y-6">
             {isInviteModalOpen && (
                <InviteCompanyModal 
                    onClose={() => setIsInviteModalOpen(false)}
                    onInvite={async (companyName, adminEmail) => {
                        await api.inviteCompany(companyName, adminEmail, user.id);
                        addToast(`Invitation sent to ${adminEmail} for ${companyName}.`, 'success');
                    }}
                />
             )}
            <h2 className="text-3xl font-bold text-slate-800">Platform Administration</h2>
             <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {(['overview', 'companies', 'analytics', 'status', 'communications', 'audit', 'settings'] as AdminTab[]).map(tab => (
                         <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.replace('-', ' ')}
                        </button>
                    ))}
                </nav>
            </div>
            {renderContent()}
        </div>
    );
};