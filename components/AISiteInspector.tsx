import React, { useState } from 'react';
import { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface AISiteInspectorProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onBack: () => void;
}

interface AnalysisResult {
    summary: string;
    safetyIssues: { description: string, severity: 'Low' | 'Medium' | 'High' }[];
    progressNotes: string[];
}

export const AISiteInspector: React.FC<AISiteInspectorProps> = ({ user, addToast, onBack }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('Analyze for safety hazards and work progress.');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setResult(null);
        }
    };

    const handleAnalyze = async () => {
        if (!imageFile) {
            addToast('Please select an image to analyze.', 'error');
            return;
        }
        setIsLoading(true);
        setResult(null);
        
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mockResult: AnalysisResult = {
            summary: "The image shows significant progress on the structural steel erection on the east wing. Three potential safety issues were identified.",
            safetyIssues: [
                { description: "Unsecured ladder leaning against a column.", severity: 'High' },
                { description: "Debris and trip hazards observed on the main walkway.", severity: 'Medium' },
                { description: "Operative in the background is not wearing a hard hat.", severity: 'High' },
            ],
            progressNotes: [
                "Steel beam installation appears to be approximately 75% complete for this section.",
                "Weather conditions appear clear.",
                "Scaffolding is erected and appears to be in use.",
            ]
        };
        
        setResult(mockResult);
        addToast('Analysis complete!', 'success');
        setIsLoading(false);
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">AI Site Inspector</h3>
            <p className="text-sm text-slate-500 mb-4">Upload a photo from the site to get an AI-powered analysis of progress and potential safety issues.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="site-photo" className="block text-sm font-medium text-gray-700 mb-1">1. Upload Site Photo</label>
                        <input
                            type="file"
                            id="site-photo"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                        />
                    </div>
                     {imagePreview && (
                        <div className="p-2 border rounded-lg">
                            <img src={imagePreview} alt="Site preview" className="w-full h-auto max-h-64 object-contain rounded-md" />
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="analysis-prompt" className="block text-sm font-medium text-gray-700 mb-1">2. Analysis Prompt</label>
                        <textarea
                            id="analysis-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                     <Button onClick={handleAnalyze} isLoading={isLoading} disabled={!imageFile} className="w-full">
                        Analyze Image
                    </Button>
                </div>
            </div>

             <div className="mt-6 pt-6 border-t">
                {isLoading && (
                    <div className="text-center py-10">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
                        <p className="mt-2 text-slate-600">AI is inspecting your image...</p>
                    </div>
                )}
                {result && (
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Analysis Summary</h4>
                            <p className="p-4 bg-slate-50 rounded-lg">{result.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-2 text-red-600">Potential Safety Issues</h4>
                             <ul className="list-disc list-inside space-y-2">
                                {result.safetyIssues.map((issue, index) => (
                                    <li key={index}><span className={`font-bold px-2 py-0.5 rounded-full text-xs ${issue.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{issue.severity}</span> {issue.description}</li>
                                ))}
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-semibold text-lg mb-2 text-green-600">Progress Notes</h4>
                             <ul className="list-disc list-inside space-y-2">
                                {result.progressNotes.map((note, index) => <li key={index}>{note}</li>)}
                            </ul>
                        </div>
                    </div>
                )}
             </div>
        </Card>
    );
};
