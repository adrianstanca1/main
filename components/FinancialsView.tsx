import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Invoice, Quote, Client, Project, InvoiceStatus, QuoteStatus, FinancialKPIs, Timesheet, InvoiceLineItem } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InvoiceStatusBadge, QuoteStatusBadge } from './ui/StatusBadge';

interface FinancialsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

// --- Invoice Editor (Moved to module scope to fix hook error) ---
const InvoiceEditor: React.FC<{
    user: User;
    projects: Project[];
    clients: Client[];
    unbilledTimesheets: Timesheet[];
    currency: string;
    onClose: () => void;
    onSaveSuccess: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, projects, clients, unbilledTimesheets, currency, onClose, onSaveSuccess, addToast }) => {
    
    const associatedProject = projects.find(p => p.id === unbilledTimesheets[0]?.projectId);
    const associatedClient = clients.find(c => c.id === 1); // Mock: assuming client 1 for project 1
    
    const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [taxRate, setTaxRate] = useState(20); // Default 20% VAT

    useEffect(() => {
        // Pre-populate with a summary of billable hours
        const totalHours = unbilledTimesheets.reduce((acc, ts) => {
            if (ts.clockOut) {
                const diff = new Date(ts.clockOut).getTime() - new Date(ts.clockIn).getTime();
                return acc + (diff / (1000 * 60 * 60));
            }
            return acc;
        }, 0);
        
        const initialItem: InvoiceLineItem = {
            id: `ts_${Date.now()}`,
            description: `Labor for project: ${associatedProject?.name || 'N/A'}`,
            quantity: parseFloat(totalHours.toFixed(2)),
            rate: 50, // Default rate
            total: parseFloat(totalHours.toFixed(2)) * 50,
        };
        setLineItems([initialItem]);
    }, [unbilledTimesheets, associatedProject]);

    const handleItemChange = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
        setLineItems(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'rate') {
                    updatedItem.total = updatedItem.quantity * updatedItem.rate;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleAddItem = () => {
        const newItem: InvoiceLineItem = {
            id: `custom_${Date.now()}`,
            description: '',
            quantity: 1,
            rate: 0,
            total: 0
        };
        setLineItems(prev => [...prev, newItem]);
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const subtotal = useMemo(() => lineItems.reduce((acc, item) => acc + item.total, 0), [lineItems]);
    const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
    const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);
    
    const handleSaveInvoice = async () => {
        if (!associatedProject || !associatedClient) {
            addToast('Project or client information is missing.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const invoiceData = {
                companyId: user.companyId!,
                clientId: associatedClient.id,
                projectId: associatedProject.id,
                total: grandTotal,
                dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Due in 30 days
                items: lineItems,
            };
            const timesheetIdsToBill = unbilledTimesheets.map(t => t.id);
            await api.createInvoice(invoiceData, timesheetIdsToBill, user.id);
            addToast('Invoice created successfully!', 'success');
            onSaveSuccess();
            onClose();
        } catch (error) {
            addToast('Failed to create invoice.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Invoice Editor</h2>
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><strong>To:</strong> {associatedClient?.name}</div>
                <div className="text-right"><strong>Project:</strong> {associatedProject?.name}</div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Rate</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                            <th className="w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {lineItems.map(item => (
                            <tr key={item.id}>
                                <td className="px-4 py-2"><input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full p-1 border rounded" /></td>
                                <td className="px-4 py-2"><input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} className="w-24 p-1 border rounded text-right" /></td>
                                <td className="px-4 py-2"><input type="number" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value))} className="w-24 p-1 border rounded text-right" /></td>
                                <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total, currency)}</td>
                                <td className="px-4 py-2 text-center"><Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>X</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Button variant="secondary" size="sm" onClick={handleAddItem} className="mt-4">Add Item</Button>
            
            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(subtotal, currency)}</span></div>
                    <div className="flex justify-between items-center">
                        <span>Tax (%):</span>
                        <input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value))} className="w-20 p-1 border rounded text-right" />
                    </div>
                    <div className="flex justify-between"><span>Tax Amount:</span> <span>{formatCurrency(taxAmount, currency)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total:</span> <span>{formatCurrency(grandTotal, currency)}</span></div>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveInvoice} isLoading={isSaving}>Create Invoice</Button>
            </div>
        </Card>
    );
};


type FinancialTab = 'overview' | 'invoices' | 'quotes' | 'clients';

export const FinancialsView: React.FC<FinancialsViewProps> = ({ user, addToast }) => {
    const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
    const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [unbilledTimesheets, setUnbilledTimesheets] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(true);

    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const [timesheetsForInvoice, setTimesheetsForInvoice] = useState<Timesheet[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiData, invoiceData, quoteData, clientData, projectData, unbilledData] = await Promise.all([
                api.getFinancialKPIsForCompany(user.companyId),
                api.getInvoicesByCompany(user.companyId),
                api.getQuotesByCompany(user.companyId),
                api.getClientsByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
                api.getUnbilledTimesheets(user.companyId),
            ]);
            setKpis(kpiData);
            setInvoices(invoiceData);
            setQuotes(quoteData);
            setClients(clientData);
            setProjects(projectData);
            setUnbilledTimesheets(unbilledData);
        } catch (error) {
            addToast("Failed to load financial data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerateInvoice = useCallback((projectId: number) => {
        const sheets = unbilledTimesheets.filter(ts => ts.projectId === projectId);
        setTimesheetsForInvoice(sheets);
        setIsGeneratingInvoice(true);
    }, [unbilledTimesheets]);

    const currency = kpis?.currency || 'USD';
    
    const findClientName = useCallback((id: number) => clients.find(c => c.id === id)?.name || 'Unknown Client', [clients]);
    const findProjectName = useCallback((id: number) => projects.find(p => p.id === id)?.name || 'Unknown Project', [projects]);

    const unbilledByProject = useMemo(() => {
        const map = new Map<number, { count: number, totalHours: number }>();
        unbilledTimesheets.forEach(ts => {
            if (!map.has(ts.projectId)) {
                map.set(ts.projectId, { count: 0, totalHours: 0 });
            }
            const data = map.get(ts.projectId)!;
            data.count++;
            if (ts.clockOut) {
                const diff = new Date(ts.clockOut).getTime() - new Date(ts.clockIn).getTime();
                data.totalHours += diff / (1000 * 60 * 60);
            }
        });
        return Array.from(map.entries());
    }, [unbilledTimesheets]);
    
    if (loading) {
        return <Card><p>Loading financial data...</p></Card>;
    }

    if (isGeneratingInvoice) {
        return <InvoiceEditor
            user={user}
            projects={projects}
            clients={clients}
            unbilledTimesheets={timesheetsForInvoice}
            currency={currency}
            onClose={() => setIsGeneratingInvoice(false)}
            onSaveSuccess={fetchData}
            addToast={addToast}
        />
    }

    const renderOverview = useCallback(() => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Financial KPIs</h3>
                {kpis ? (
                    <div className="grid grid-cols-2 gap-4">
                        <Card><p className="text-sm text-slate-500">Profitability</p><p className="text-2xl font-bold">{kpis.profitability}%</p></Card>
                        <Card><p className="text-sm text-slate-500">Project Margin</p><p className="text-2xl font-bold">{kpis.projectMargin}%</p></Card>
                        <Card className="col-span-2"><p className="text-sm text-slate-500">Cash Flow</p><p className="text-2xl font-bold">{formatCurrency(kpis.cashFlow, currency)}</p></Card>
                    </div>
                ) : <p>No KPI data available.</p>}
            </div>
             <div>
                <h3 className="text-lg font-semibold mb-4">Unbilled Work</h3>
                <div className="space-y-3">
                    {unbilledByProject.map(([projectId, data]) => {
                        const project = projects.find(p => p.id === projectId);
                        return (
                            <div key={projectId} className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
                                <div>
                                    <p className="font-medium">{project?.name}</p>
                                    <p className="text-sm text-slate-500">{data.count} timesheets ({data.totalHours.toFixed(2)} hrs)</p>
                                </div>
                                <Button size="sm" onClick={() => handleGenerateInvoice(projectId)}>Create Invoice</Button>
                            </div>
                        )
                    })}
                     {unbilledByProject.length === 0 && <p className="text-slate-500 text-center py-4">No unbilled timesheets.</p>}
                </div>
            </div>
        </div>
    ), [kpis, currency, unbilledByProject, projects, handleGenerateInvoice]);

    const renderInvoicesTable = useCallback(() => (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">INV-{String(invoice.id).padStart(4, '0')}</td>
                            <td className="px-6 py-4 text-sm">{findClientName(invoice.clientId)}</td>
                            <td className="px-6 py-4 text-sm"><InvoiceStatusBadge status={invoice.status} /></td>
                            <td className="px-6 py-4 text-sm">{new Date(invoice.dueAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(invoice.total, currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {invoices.length === 0 && <p className="text-center py-8 text-slate-500">No invoices found.</p>}
        </div>
    ), [invoices, currency, findClientName]);
    
    const renderQuotesTable = useCallback(() => (
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quote #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Valid Until</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {quotes.map(quote => (
                        <tr key={quote.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">Q-{String(quote.id).padStart(4, '0')}</td>
                            <td className="px-6 py-4 text-sm">{findClientName(quote.clientId)}</td>
                            <td className="px-6 py-4 text-sm"><QuoteStatusBadge status={quote.status} /></td>
                            <td className="px-6 py-4 text-sm">{new Date(quote.validUntil).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(quote.total, currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {quotes.length === 0 && <p className="text-center py-8 text-slate-500">No quotes found.</p>}
        </div>
    ), [quotes, currency, findClientName]);
    
    const renderClients = useCallback(() => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => (
                <Card key={client.id}>
                    <h3 className="text-lg font-semibold">{client.name}</h3>
                    <p className="text-sm text-slate-500">{client.contactEmail}</p>
                </Card>
            ))}
            {clients.length === 0 && <p className="text-center py-8 text-slate-500 col-span-full">No clients found.</p>}
        </div>
    ), [clients]);

    const renderContent = useCallback(() => {
        switch (activeTab) {
            case 'overview': return renderOverview();
            case 'invoices': return renderInvoicesTable();
            case 'quotes': return renderQuotesTable();
            case 'clients': return renderClients();
            default: return null;
        }
    }, [activeTab, renderOverview, renderInvoicesTable, renderQuotesTable, renderClients]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Financials</h2>
             <Card>
                <div className="border-b border-gray-200 mb-4">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {(['overview', 'invoices', 'quotes', 'clients'] as FinancialTab[]).map(tab => (
                             <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
                {renderContent()}
            </Card>
        </div>
    );
};