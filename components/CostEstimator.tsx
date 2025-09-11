import React, { useState, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { User, Project, CompanySettings } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface CostEstimatorProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onBack: () => void;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export const CostEstimator: React.FC<CostEstimatorProps> = ({ user, addToast, onBack }) => {
    const [projectDescription, setProjectDescription] = useState('');
    const [location, setLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [estimation, setEstimation] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ai, setAi] = useState<GoogleGenAI | null>(null);
    const [settings, setSettings] = useState<CompanySettings | null>(null);

    useEffect(() => {
        try {
          const genAI = new GoogleGenAI({apiKey: process.env.API_KEY});
          setAi(genAI);
          if(user.companyId) {
            api.getCompanySettings(user.companyId).then(setSettings);
          }
        } catch(e) {
          console.error(e);
          setError("Failed to initialize AI. Please check your API key.");
        }
    }, [user.companyId]);
    
    const currency = 'GBP'; // Hardcoded for now based on request

    const handleGenerate = async () => {
        if (!projectDescription.trim() || !location.trim()) {
            addToast('Please provide a project description and location.', 'error');
            return;
        }
        if(!ai) {
            addToast('AI service is not available.', 'error');
            return;
        }

        setIsLoading(true);
        setError(null);
        setEstimation(null);

        const prompt = `
            Provide a high-level construction cost estimation for the following project.
            The final currency must be in ${currency}.
            Break down the costs into categories (e.g., Materials, Labor, Permits, Contingency).
            Provide a total estimated cost.
            Assume market rates for the specified location.
            
            Project Description: "${projectDescription}"
            Location: "${location}"
            
            Return the output in a JSON object with the following structure:
            {
              "total_cost": number,
              "breakdown": [
                {"category": string, "cost": number, "percentage": number},
                ...
              ],
              "summary": string
            }
        `;
        
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });

            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            setEstimation(parsed);
        } catch (err) {
            console.error(err);
            const message = "Failed to generate AI cost estimation.";
            setError(message);
            addToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">AI Project Cost Estimator</h3>
            <p className="text-sm text-slate-500 mb-4">Get high-level cost estimates for potential projects using AI analysis.</p>

            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <div>
                    <label htmlFor="proj-desc" className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                    <textarea
                        id="proj-desc"
                        value={projectDescription}
                        onChange={e => setProjectDescription(e.target.value)}
                        rows={4}
                        placeholder="e.g., A two-story, 2500 sq ft residential home with 3 bedrooms, 2 bathrooms, and a two-car garage."
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                 <div>
                    <label htmlFor="proj-loc" className="block text-sm font-medium text-gray-700 mb-1">Project Location</label>
                    <input
                        type="text"
                        id="proj-loc"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="e.g., London, UK or San Francisco, CA"
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <Button onClick={handleGenerate} isLoading={isLoading}>Estimate Costs</Button>
            </div>

            <div className="mt-6">
                {isLoading && (
                    <div className="text-center">
                        <p className="text-slate-600 animate-pulse">AI is calculating your estimate...</p>
                    </div>
                )}
                {error && <p className="text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                {estimation && (
                    <div className="space-y-4">
                        <div className="text-center p-6 bg-slate-100 rounded-lg">
                            <p className="text-sm font-medium text-slate-500">Total Estimated Cost</p>
                            <p className="text-4xl font-bold text-slate-800 my-1">{formatCurrency(estimation.total_cost, currency)}</p>
                        </div>
                        <div>
                             <h4 className="font-semibold text-lg mb-2">Cost Breakdown</h4>
                             <div className="space-y-2">
                                {estimation.breakdown.map((item: any) => (
                                    <div key={item.category}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{item.category}</span>
                                            <span>{formatCurrency(item.cost, currency)}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                                            <div
                                                className="bg-green-500 h-2.5 rounded-full text-white text-xs flex items-center justify-center"
                                                style={{ width: `${item.percentage}%` }}
                                            >
                                               {item.percentage > 10 ? `${item.percentage}%` : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                         <div className="p-4 bg-sky-50 border-l-4 border-sky-400 rounded-r-md">
                            <p className="font-semibold text-sky-800">AI Summary & Assumptions</p>
                            <p className="text-sm text-slate-700 mt-1">{estimation.summary}</p>
                        </div>
                    </div>
                )}
            </div>

        </Card>
    );
};