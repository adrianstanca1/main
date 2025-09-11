import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Invoice, Quote, Client, Project, InvoiceStatus, QuoteStatus, FinancialKPIs, Timesheet, InvoiceLineItem, MonthlyFinancials, CostBreakdown } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InvoiceStatusBadge, QuoteStatusBadge } from './ui/StatusBadge';

const formatCurrency = (amount: number, currency: string, compact = false) => {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
        style: 'currency',
        currency: currency,
        notation: compact ? 'compact' : 'standard',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// --- Custom Chart Components (Moved to module scope) ---

const BarChart: React.FC<{
    data: MonthlyFinancials[];
    currency: string;
}> = ({ data, currency }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, data: MonthlyFinancials } | null>(null);
    const chartHeight = 300;
    const chartWidth = 500;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotAreaWidth = chartWidth - padding.left - padding.right;
    const plotAreaHeight = chartHeight - padding.top - padding.bottom;

    const maxValue = useMemo(() => Math.max(...data.flatMap(d => [d.revenue, d.costs])) * 1.1, [data]);
    const xScale = plotAreaWidth / data.length;
    const yScale = plotAreaHeight / maxValue;

    const yAxisLabels = useMemo(() => {
        const labels = [];
        for (let i = 0; i <= 4; i++) {
            const value = (maxValue / 4) * i;
            labels.push({ value, y: chartHeight - padding.bottom - (value * yScale) });
        }
        return labels;
    }, [maxValue, yScale, chartHeight, padding.bottom]);

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                {/* Y-Axis */}
                {yAxisLabels.map(label => (
                    <g key={label.value}>
                        <text x={padding.left - 8} y={label.y} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-current text-slate-500">
                            {formatCurrency(label.value, currency, true)}
                        </text>
                        <line x1={padding.left} x2={chartWidth - padding.right} y1={label.y} y2={label.y} className="stroke-current text-slate-200" strokeWidth="1" strokeDasharray="2,2"/>
                    </g>
                ))}

                {/* Bars and X-Axis Labels */}
                {data.map((d, i) => {
                    const barWidth = xScale * 0.35;
                    const revenueHeight = d.revenue * yScale;
                    const costHeight = d.costs * yScale;
                    return (
                        <g key={d.month}>
                            <rect
                                x={padding.left + (i * xScale) + (xScale * 0.1)}
                                y={chartHeight - padding.bottom - revenueHeight}
                                width={barWidth}
                                height={revenueHeight}
                                className="fill-current text-sky-500 transition-opacity"
                                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: d })}
                                onMouseLeave={() => setTooltip(null)}
                            />
                             <rect
                                x={padding.left + (i * xScale) + (xScale * 0.1) + barWidth}
                                y={chartHeight - padding.bottom - costHeight}
                                width={barWidth}
                                height={costHeight}
                                className="fill-current text-red-400 transition-opacity"
                                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: d })}
                                onMouseLeave={() => setTooltip(null)}
                            />
                             <text x={padding.left + (i * xScale) + (xScale / 2)} y={chartHeight - padding.bottom + 15} textAnchor="middle" className="text-xs fill-current text-slate-500">{d.month}</text>
                        </g>
                    )
                })}
            </svg>
            {tooltip && (
                 <div className="absolute p-2 text-xs bg-slate-800 text-white rounded-md shadow-lg pointer-events-none" style={{ left: tooltip.x, top: tooltip.y - 80 }}>
                    <p className="font-bold mb-1">{tooltip.data.month}</p>
                    <p><span className="w-2 h-2 inline-block bg-sky-500 rounded-full mr-1"></span>Revenue: {formatCurrency(tooltip.data.revenue, currency)}</p>
                    <p><span className="w-2 h-2 inline-block bg-red-400 rounded-full mr-1"></span>Costs: {formatCurrency(tooltip.data.costs, currency)}</p>
                    <p><span className="w-2 h-2 inline-block bg-green-400 rounded-full mr-1"></span>Profit: {formatCurrency(tooltip.data.profit, currency)}</p>
                </div>
            )}
        </div>
    );
};

const DoughnutChart: React.FC<{
    data: CostBreakdown[];
    currency: string;
}> = ({ data, currency }) => {
    const size = 150;
    const strokeWidth = 15;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = useMemo(() => data.reduce((sum, item) => sum + item.amount, 0), [data]);
    const colors = ['#38bdf8', '#fb7185', '#34d399', '#facc15', '#a78bfa'];

    let accumulatedPercentage = 0;

    return (
        <div className="flex items-center gap-6">
            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-current text-slate-200" strokeWidth={strokeWidth} />
                    {data.map((item, index) => {
                        const percentage = (item.amount / total) * 100;
                        const offset = circumference - (accumulatedPercentage / 100) * circumference;
                        accumulatedPercentage += percentage;
                        return (
                            <circle
                                key={item.category}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={colors[index % colors.length]}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                transform={`rotate(-90 ${size/2} ${size/2})`}
                            />
                        )
                    })}
                </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500">Total Costs</span>
                    <span className="text-xl font-bold">{formatCurrency(total, currency, true)}</span>
                </div>
            </div>
            <div className="text-sm space-y-2">
                {data.map((item, index) => (
                    <div key={item.category} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></span>
                        <span className="flex-grow">{item.category}</span>
                        <span className="font-semibold">{formatCurrency(item.amount, currency, true)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
// FIX: Added the required 'status' property to satisfy the Invoice type.
                status: InvoiceStatus.SENT,
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

interface FinancialsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const FinancialsView: React.FC<FinancialsViewProps> = ({ user, addToast }) => {
    const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
    const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [unbilledTimesheets, setUnbilledTimesheets] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(true);
    
    // State for new charts
    const [monthlyData, setMonthlyData] = useState<MonthlyFinancials[]>([]);
    const [costData, setCostData] = useState<CostBreakdown[]>([]);

    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const [timesheetsForInvoice, setTimesheetsForInvoice] = useState<Timesheet[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiData, invoiceData, quoteData, clientData, projectData, unbilledData, monthlyChartData, costChartData] = await Promise.all([
                api.getFinancialKPIsForCompany(user.companyId),
                api.getInvoicesByCompany(user.companyId),
                api.getQuotesByCompany(user.companyId),
                api.getClientsByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
                api.getUnbilledTimesheets(user.companyId),
                api.getMonthlyFinancials(user.companyId),
                api.getCostBreakdown(user.companyId),
            ]);
            setKpis(kpiData);
            setInvoices(invoiceData);
            setQuotes(quoteData);
            setClients(clientData);
            setProjects(projectData);
            setUnbilledTimesheets(unbilledData);
            setMonthlyData(monthlyChartData);
            setCostData(costChartData);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-3">
                <h3 className="text-lg font-semibold mb-1">Last 6 Months Performance</h3>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-sky-500 rounded-sm"></span> Revenue</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-400 rounded-sm"></span> Costs</div>
                </div>
                {monthlyData.length > 0 ? <BarChart data={monthlyData} currency={currency} /> : <p>Not enough data for chart.</p>}
            </Card>
            
            <Card className="lg:col-span-1">
                <h3 className="text-lg font-semibold mb-4">Financial KPIs</h3>
                {kpis ? (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-slate-500">Profitability</p>
                            <p className="text-2xl font-bold">{kpis.profitability}%</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Project Margin</p>
                            <p className="text-2xl font-bold">{kpis.projectMargin}%</p>
                        </div>
                        <div>
                             <p className="text-sm text-slate-500">Cash Flow</p>
                            <p className="text-2xl font-bold">{formatCurrency(kpis.cashFlow, currency)}</p>
                        </div>
                    </div>
                ) : <p>No KPI data available.</p>}
            </Card>
            
             <Card className="lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown (YTD)</h3>
                {costData.length > 0 ? <DoughnutChart data={costData} currency={currency} /> : <p>Not enough data.</p>}
            </Card>

            <Card className="lg:col-span-3">
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
            </Card>
        </div>
    ), [kpis, currency, unbilledByProject, projects, handleGenerateInvoice, monthlyData, costData]);

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