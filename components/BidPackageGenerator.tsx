import React, { useState } from 'react';
import { User, BidPackage } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface BidPackageGeneratorProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onBack: () => void;
}

export const BidPackageGenerator: React.FC<BidPackageGeneratorProps> = ({ user, addToast, onBack }) => {
    const [tenderUrl, setTenderUrl] = useState('');
    const [strengths, setStrengths] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [bidPackage, setBidPackage] = useState<BidPackage | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setBidPackage(null);
        try {
            const result = await api.generateBidPackage(tenderUrl, strengths);
            setBidPackage(result);
            addToast('Bid package generated successfully!', 'success');
        } catch (error) {
            addToast('Failed to generate bid package.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Bid Package Generator</h3>
            <p className="text-sm text-slate-500 mb-4">Assemble tender cover letter, checklist, and summaries.</p>

            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                 <div>
                    <label htmlFor="tender-url" className="block text-sm font-medium text-gray-700 mb-1">Tender URL (optional)</label>
                    <input
                        type="url"
                        id="tender-url"
                        value={tenderUrl}
                        onChange={e => setTenderUrl(e.target.value)}
                        placeholder="https://example.com/tender-document"
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label htmlFor="strengths" className="block text-sm font-medium text-gray-700 mb-1">Company strengths or requirements (optional)</label>
                    <textarea
                        id="strengths"
                        value={strengths}
                        onChange={e => setStrengths(e.target.value)}
                        rows={3}
                        placeholder="e.g., expertise in sustainable materials, 10+ years experience..."
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <Button onClick={handleGenerate} isLoading={isLoading}>Generate</Button>
            </div>

             <div className="mt-6">
                {bidPackage && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Generated Bid Package:</h4>
                        <div>
                            <h5 className="font-semibold mb-2">Cover Letter</h5>
                            <div className="p-3 border rounded-md bg-white whitespace-pre-wrap text-sm">{bidPackage.coverLetter}</div>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-2">Submission Checklist</h5>
                            <ul className="list-disc list-inside p-3 border rounded-md bg-white text-sm">
                                {bidPackage.checklist.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold mb-2">Executive Summary</h5>
                             <div className="p-3 border rounded-md bg-white whitespace-pre-wrap text-sm">{bidPackage.summary}</div>
                        </div>
                    </div>
                )}
             </div>

        </Card>
    );
};
