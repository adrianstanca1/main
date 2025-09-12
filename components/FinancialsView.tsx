
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { saveAs } from 'file-saver';
import { User, FinancialKPIs, MonthlyFinancials, CostBreakdown, Invoice, Quote, Client, Project, InvoiceStatus, QuoteStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InvoiceStatusBadge, QuoteStatusBadge } from './ui/StatusBadge';

interface FinancialsViewProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

// Simple bar chart component
const BarChart: React.FC<{ data: { label: string, value: number }[], barColor: string }> = ({ data, barColor }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    return (
        <div className="w-full h-64 flex items-end justify-around p-4 border rounded-lg bg-slate-50">
            {data.map((item, index) => (
                <div key={index} className="flex flex-col items-center justify-end h-full w-full">
                    <div
                        className={`w-3/4 rounded-t-md ${barColor}`}
                        style={{ height: `${(item.value / maxValue) * 100}%` }}
                        title={formatCurrency(item.value)}
                    ></div>
                    <span className="text-xs mt-2 text-slate-600">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export const FinancialsView: React.FC<FinancialsViewProps> = ({ user, addToast }) => {
    const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
    const [monthly, setMonthly] = useState<MonthlyFinancials[]>([]);
    const [costs, setCosts] = useState<CostBreakdown[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user.companyId) return;
        setLoading(true);
        try {
            const [kpiData, monthlyData, costsData, invoiceData, clientData, projectData] = await Promise.all([
                api.getFinancialKPIsForCompany(user.companyId),
                api.getMonthlyFinancials(user.companyId),
                api.getCostBreakdown(user.companyId),
                api.getInvoicesByCompany(user.companyId),
                api.getClientsByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
            ]);
            setKpis(kpiData);
            setMonthly(monthlyData);
            setCosts(costsData);
            setInvoices(invoiceData);
            setClients(clientData);
            setProjects(projectData);
        } catch (error) {
            addToast("Failed to load financial data", 'error');
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const findClientName = (id: number) => clients.find(c => c.id === id)?.name || 'Unknown Client';
    const findProjectName = (id: number) => projects.find(p => p.id === id)?.name || 'Unknown Project';

    // Filter invoices by search
    const filteredInvoices = invoices.filter(inv => {
        const client = findClientName(inv.clientId).toLowerCase();
        const project = findProjectName(inv.projectId).toLowerCase();
        return (
            client.includes(search.toLowerCase()) ||
            project.includes(search.toLowerCase()) ||
            inv.amountDue.toString().includes(search)
        );
    });

    if (loading) return <Card><p>Loading financials...</p></Card>

    // Export invoices to CSV
    const exportCSV = () => {
        const header = ['Client', 'Project', 'Status', 'Amount Due'];
        const rows = filteredInvoices.map(inv => [
            findClientName(inv.clientId),
            findProjectName(inv.projectId),
            inv.status,
            inv.amountDue
        ]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'invoices.csv');
    };

    // Invoice actions (view, edit, delete)
    const handleView = (invoice: Invoice) => setSelectedInvoice(invoice);
    const handleEdit = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setShowEditModal(true);
    };
    const handleDelete = async (invoice: Invoice) => {
        if (!window.confirm('Delete this invoice?')) return;
        try {
            await api.deleteInvoice(invoice.id);
            setInvoices(invoices.filter(i => i.id !== invoice.id));
            addToast('Invoice deleted', 'success');
        } catch {
            addToast('Failed to delete invoice', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Financials</h2>

            {kpis && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card><p className="text-sm text-slate-500">Profitability</p><p className="text-3xl font-bold">{kpis.profitability}%</p></Card>
                <Card><p className="text-sm text-slate-500">Project Margin</p><p className="text-3xl font-bold">{kpis.projectMargin}%</p></Card>
                <Card><p className="text-sm text-slate-500">Cash Flow</p><p className="text-3xl font-bold">{formatCurrency(kpis.cashFlow, kpis.currency)}</p></Card>
            </div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-semibold mb-4">Monthly Performance</h3>
                    <BarChart data={monthly.map(m => ({ label: m.month, value: m.profit }))} barColor="bg-green-500" />
                </Card>
                <Card>
                    <h3 className="font-semibold mb-4">Cost Breakdown</h3>
                    <BarChart data={costs.map(c => ({ label: c.category, value: c.amount }))} barColor="bg-sky-500" />
                </Card>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">Invoices</h3>
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            className="border rounded px-2 py-1 text-sm"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={exportCSV}>Export CSV</Button>
                        <Button>Create Invoice</Button>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount Due</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInvoices.map(invoice => (
                            <tr key={invoice.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-600">{findClientName(invoice.clientId)}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{findProjectName(invoice.projectId)}</td>
                                <td className="px-6 py-4 text-sm"><InvoiceStatusBadge status={invoice.status} /></td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-slate-800">{formatCurrency(invoice.amountDue, 'GBP')}</td>
                                <td className="px-6 py-4 text-sm text-right">
                                    <Button onClick={() => handleView(invoice)} size="sm">View</Button>
                                    <Button onClick={() => handleEdit(invoice)} size="sm" variant="secondary">Edit</Button>
                                    <Button onClick={() => handleDelete(invoice)} size="sm" variant="danger">Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Invoice view/edit modals would go here */}
            </Card>
        </div>
    );
}
