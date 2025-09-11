import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Import Tool and ToolStatus types.
import { User, View, Tool, ToolStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ResourceScheduler } from './ResourceScheduler';
import { AIAdvisor } from './AIAdvisor';
import { CostEstimator } from './CostEstimator';
import { SafetyAnalysis } from './SafetyAnalysis';
import { FundingBot } from './FundingBot';
import { RiskBot } from './RiskBot';
import { BidPackageGenerator } from './BidPackageGenerator';
import { DailySummaryGenerator } from './DailySummaryGenerator';
import { Tag } from './ui/Tag';
import { AISiteInspector } from './AISiteInspector';
import { WorkforcePlanner } from './WorkforcePlanner';


interface ToolsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: View) => void;
}

const ToolCard: React.FC<{ tool: Tool; onLaunch: () => void }> = ({ tool, onLaunch }) => {
    const isDisabled = tool.status === ToolStatus.MAINTENANCE || tool.status === ToolStatus.COMING_SOON || tool.status === ToolStatus.DEV_PHASE;
    
    return (
        <Card className="flex flex-col animate-card-enter">
            <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} /></svg>
                    </div>
                    <Tag label={tool.status} color={
                        tool.status === ToolStatus.ACTIVE ? 'green' : 
                        tool.status === ToolStatus.NEW ? 'blue' :
                        tool.status === ToolStatus.MAINTENANCE ? 'red' : 'gray'
                    } />
                </div>
                <h4 className="font-semibold text-slate-800 text-lg">{tool.name}</h4>
                <p className="text-sm text-slate-500 mt-1">{tool.description}</p>
            </div>
            <div className="mt-4">
                 <Button onClick={onLaunch} disabled={isDisabled} className="w-full mt-4">
                    {tool.status === ToolStatus.MAINTENANCE ? 'Under Maintenance' : 'Launch Tool'}
                </Button>
            </div>
        </Card>
    );
};

export const ToolsView: React.FC<ToolsViewProps> = ({ user, addToast }) => {
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeToolId, setActiveToolId] = useState<string | null>(null);

    useEffect(() => {
        api.getTools(user.id)
            .then(setTools)
            .catch(() => addToast('Failed to load tools.', 'error'))
            .finally(() => setLoading(false));
    }, [user.id, addToast]);

    const activeTool = tools.find(t => t.id === activeToolId);

    const categorizedTools = useMemo(() => {
        const categories = new Map<string, Tool[]>();
        tools.forEach(tool => {
            // Give AI tools their own category
            if (tool.tags.includes('AI')) {
                if (!categories.has('AI Powered')) categories.set('AI Powered', []);
                categories.get('AI Powered')!.push(tool);
            } else if (tool.tags.includes('Finance')) {
                if (!categories.has('Financial Tools')) categories.set('Financial Tools', []);
                categories.get('Financial Tools')!.push(tool);
            } else if (tool.tags.includes('Project')) {
                 if (!categories.has('Project Management')) categories.set('Project Management', []);
                categories.get('Project Management')!.push(tool);
            } else {
                 if (!categories.has('General')) categories.set('General', []);
                categories.get('General')!.push(tool);
            }
        });
        return Array.from(categories.entries());
    }, [tools]);

    const renderActiveTool = () => {
        if (!activeTool) return null;

        const handleBack = () => setActiveToolId(null);
        
        switch (activeTool.id) {
            case 'advisor': return <AIAdvisor />;
            case 'project-estimator': return <CostEstimator user={user} addToast={addToast} onBack={handleBack} />;
            case 'schedule-optimizer': return <ResourceScheduler user={user} />;
            case 'safety-analysis': return <SafetyAnalysis user={user} addToast={addToast} onBack={handleBack} />;
            case 'funding-bot': return <FundingBot user={user} addToast={addToast} onBack={handleBack} />;
            case 'risk-bot': return <RiskBot user={user} addToast={addToast} onBack={handleBack} />;
            case 'bid-generator': return <BidPackageGenerator user={user} addToast={addToast} onBack={handleBack} />;
            case 'daily-summary': return <DailySummaryGenerator user={user} addToast={addToast} onBack={handleBack} />;
            case 'site-inspector': return <AISiteInspector user={user} addToast={addToast} onBack={handleBack} />;
            case 'workforce-planner': return <WorkforcePlanner user={user} addToast={addToast} onBack={handleBack} />;
            default:
                return (
                    <Card>
                        <h3 className="font-semibold text-xl mb-2">{activeTool.name}</h3>
                        <p>This tool is not yet fully implemented.</p>
                        <Button onClick={handleBack} className="mt-4">Back</Button>
                    </Card>
                );
        }
    };
    
    if (loading) {
        return <p>Loading tools...</p>;
    }
    
    if (activeToolId) {
        return (
             <div>
                <Button onClick={() => setActiveToolId(null)} variant="ghost" className="mb-4">
                    &larr; Back to All Tools
                </Button>
                {renderActiveTool()}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-slate-800">AI & Business Tools</h2>
            
            {categorizedTools.map(([category, categoryTools]) => (
                <div key={category}>
                    <h3 className="text-xl font-semibold text-slate-700 mb-4 pb-2 border-b">{category}</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoryTools.map(tool => (
                            <ToolCard key={tool.id} tool={tool} onLaunch={() => setActiveToolId(tool.id)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};