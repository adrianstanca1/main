import React, { useState } from 'react';
// FIX: Corrected import path
import { User, View } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AIAdvisor } from './AIAdvisor';
import { FundingBot } from './FundingBot';
import { RiskBot } from './RiskBot';
import { BidPackageGenerator } from './BidPackageGenerator';
import { CostEstimator } from './CostEstimator';
import { DailySummaryGenerator } from './DailySummaryGenerator';
import { SafetyAnalysis } from './SafetyAnalysis';
import { WorkforcePlanner } from './WorkforcePlanner';
import { AISiteInspector } from './AISiteInspector';

interface ToolsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: View) => void;
}

type ToolId = 'advisor' | 'funding' | 'risk' | 'bid' | 'cost' | 'summary' | 'safety' | 'planner' | 'inspector';

const tools: { id: ToolId; name: string; description: string; icon: JSX.Element; }[] = [
    { id: 'advisor', name: 'AI Business Advisor', description: 'Get strategic advice on cash flow, risks, and operations.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'summary', name: 'Daily Summary AI', description: 'Generate EOD summaries from project activity.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
    { id: 'cost', name: 'AI Cost Estimator', description: 'Get high-level cost estimates for new projects.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 0v6m0-6L9 13" /></svg> },
    { id: 'safety', name: 'AI Safety Analysis', description: 'Analyze incident reports to find trends and risks.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
    { id: 'planner', name: 'Workforce Planner', description: 'Visually assign operatives to projects by week.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'risk', name: 'RiskBot', description: 'Analyze text for compliance and financial risks.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
    { id: 'funding', name: 'FundingBot', description: 'Discover grants and funding opportunities.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: 'bid', name: 'Bid Package Generator', description: 'Assemble tender cover letters and checklists.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'inspector', name: 'AI Site Inspector', description: 'Analyze site photos for progress and safety.', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
];

export const ToolsView: React.FC<ToolsViewProps> = ({ user, addToast, setActiveView }) => {
    const [activeTool, setActiveTool] = useState<ToolId | null>(null);

    const renderActiveTool = () => {
        const onBack = () => setActiveTool(null);
        switch (activeTool) {
            case 'advisor': return <AIAdvisor />;
            case 'funding': return <FundingBot user={user} addToast={addToast} onBack={onBack} />;
            case 'risk': return <RiskBot user={user} addToast={addToast} onBack={onBack} />;
            case 'bid': return <BidPackageGenerator user={user} addToast={addToast} onBack={onBack} />;
            case 'cost': return <CostEstimator user={user} addToast={addToast} onBack={onBack} />;
            case 'summary': return <DailySummaryGenerator user={user} addToast={addToast} onBack={onBack} />;
            case 'safety': return <SafetyAnalysis user={user} addToast={addToast} onBack={onBack} />;
            case 'planner': return <WorkforcePlanner user={user} addToast={addToast} onBack={onBack} />;
            case 'inspector': return <AISiteInspector user={user} addToast={addToast} onBack={onBack} />;
            default: return null;
        }
    };

    if (activeTool) {
        return (
            <div>
                <Button onClick={() => setActiveTool(null)} variant="secondary" className="mb-4">&larr; Back to All Tools</Button>
                {renderActiveTool()}
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => (
                    <Card key={tool.id} onClick={() => setActiveTool(tool.id)} className="cursor-pointer hover:shadow-lg hover:border-sky-500/50 transition-all duration-300 flex flex-col items-start">
                        <div className="text-sky-600 mb-4">{tool.icon}</div>
                        <h3 className="text-lg font-bold text-slate-800">{tool.name}</h3>
                        <p className="text-sm text-slate-500 flex-grow">{tool.description}</p>
                        <span className="text-sm font-semibold text-sky-600 mt-4">Launch Tool &rarr;</span>
                    </Card>
                ))}
            </div>
        </div>
    );
};
