import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, ProjectPhoto, OperativeReport, Permission } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';

interface AISiteInspectorProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    onBack: () => void;
}

interface GalleryImage {
    id: string;
    url: string;
    description: string;
    base64?: string;
    mimeType?: string;
}

interface AiResult {
    text: string;
    imageUrl: string;
}

const imageToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const AISiteInspector: React.FC<AISiteInspectorProps> = ({ user, addToast, onBack }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [projectImages, setProjectImages] = useState<GalleryImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiResult, setAiResult] = useState<AiResult | null>(null);

    const canUseTool = hasPermission(user, Permission.ACCESS_SAFETY_TOOLS);

    const fetchProjects = useCallback(async () => {
        if (!user.companyId || !canUseTool) return;
        try {
            const userProjects = hasPermission(user, Permission.VIEW_ALL_PROJECTS)
                ? await api.getProjectsByCompany(user.companyId)
                : await api.getProjectsByUser(user.id);
            setProjects(userProjects);
            if (userProjects.length > 0) {
                setSelectedProjectId(userProjects[0].id.toString());
            }
        } catch (error) {
            addToast("Failed to load projects.", 'error');
        }
    }, [user, addToast, canUseTool]);

    useEffect(() => {
        fetchProjects();
        if (user.companyId) {
            api.getUsersByCompany(user.companyId).then(setUsers);
        }
    }, [fetchProjects, user.companyId]);

    useEffect(() => {
        const fetchImages = async () => {
            if (!selectedProjectId || !user.companyId) return;
            setIsLoading(true);
            setProjectImages([]);
            try {
                const projectId = parseInt(selectedProjectId, 10);
                const [photos, reports] = await Promise.all([
                    api.getPhotosForProject(projectId),
                    api.getOperativeReportsByProject(projectId)
                ]);
                const uploaderMap = new Map<number, string>();
                users.forEach(u => uploaderMap.set(u.id, u.name));

                const photoImages: GalleryImage[] = photos.map(p => ({
                    id: `photo-${p.id}`,
                    url: p.url,
                    description: p.caption,
                }));
                const reportImages: GalleryImage[] = reports
                    .filter(r => r.photoUrl)
                    .map(r => ({
                        id: `report-${r.id}`,
                        url: r.photoUrl!,
                        description: `Report: ${r.notes}`,
                    }));
                setProjectImages([...photoImages, ...reportImages]);
            } catch (error) {
                addToast("Failed to load project images.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchImages();
    }, [selectedProjectId, user.companyId, addToast, users]);
    
    const handleFileSelect = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
            const base64 = dataUrl.split(',')[1];
            setSelectedImage({
                id: `upload-${Date.now()}`,
                url: URL.createObjectURL(file),
                description: file.name,
                base64,
                mimeType,
            });
            setAiResult(null);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!selectedImage || !prompt.trim()) {
            addToast("Please select an image and enter a prompt.", "error");
            return;
        }
        setIsLoading(true);
        setAiResult(null);
        try {
            let { base64, mimeType } = selectedImage;

            if (!base64 || !mimeType) {
                 const data = await imageToBase64(selectedImage.url);
                 base64 = data.base64;
                 mimeType = data.mimeType;
            }

            if(!base64 || !mimeType) {
                throw new Error("Could not get image data.");
            }

            const result = await api.editImageWithAi(base64, mimeType, prompt, parseInt(selectedProjectId, 10), user.id);
            
            let textResponse = "No text response from AI.";
            let imagePartData: { data: string; mimeType: string; } | null = null;

            for (const part of result.parts) {
                if ('text' in part && part.text) {
                    textResponse = part.text;
                } else if ('inlineData' in part && part.inlineData && part.inlineData.data) {
                    imagePartData = { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
                }
            }

            if (imagePartData) {
                setAiResult({
                    text: textResponse,
                    imageUrl: `data:${imagePartData.mimeType};base64,${imagePartData.data}`,
                });
            } else {
                throw new Error("AI did not return an image.");
            }
            addToast("AI analysis complete.", "success");
        } catch (error) {
            addToast(`Error during AI analysis: ${error}`, "error");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!canUseTool) {
        return <Card><p>You do not have permission to use this tool.</p></Card>;
    }

    if (selectedImage) {
        return (
            <Card>
                <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)} className="mb-4">&larr; Back to Image Selection</Button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-2">Original Image</h4>
                        <img src={selectedImage.url} alt={selectedImage.description} className="rounded-lg w-full object-contain" />
                        <p className="text-xs text-slate-500 mt-1">{selectedImage.description}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">AI Analysis & Result</h4>
                         <div className="aspect-square w-full bg-slate-100 rounded-lg flex items-center justify-center">
                            {isLoading && (
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
                                    <p className="mt-4 text-slate-600">AI is processing the image...</p>
                                </div>
                            )}
                            {aiResult && <img src={aiResult.imageUrl} alt="AI generated result" className="rounded-lg w-full object-contain" />}
                            {!aiResult && !isLoading && <p className="text-slate-500">Result will appear here</p>}
                        </div>
                    </div>
                </div>
                {aiResult && (
                    <div className="mt-4 p-3 bg-sky-50 border-l-4 border-sky-400 rounded-r-md">
                        <p className="font-semibold text-sky-800">AI Response:</p>
                        <p className="text-slate-700">{aiResult.text}</p>
                    </div>
                )}
                <div className="mt-6 pt-6 border-t space-y-2">
                    <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-700">Your Prompt</label>
                    <textarea
                        id="prompt-input"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={3}
                        className="w-full p-2 border rounded-md"
                        placeholder="e.g., Circle any potential safety hazards in red. Are all workers wearing correct PPE?"
                    />
                    <Button onClick={handleGenerate} isLoading={isLoading}>Analyze with AI</Button>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">AI Site Inspector</h3>
            <p className="text-sm text-slate-500 mb-4">Select a project, then choose an image from the gallery or upload your own to analyze.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end p-4 border rounded-lg bg-slate-50 mb-6">
                <div>
                    <label htmlFor="project-select-inspector" className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                        id="project-select-inspector"
                        value={selectedProjectId}
                        onChange={e => setSelectedProjectId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={projects.length === 0}
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="photo-upload" className="block text-sm font-medium text-gray-700 mb-1">Or Upload New Image</label>
                     <input type="file" id="photo-upload" accept="image/*" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
                </div>
            </div>

            <div>
                <h4 className="font-semibold mb-4">Project Gallery</h4>
                {isLoading && <p>Loading images...</p>}
                {!isLoading && projectImages.length === 0 && <p className="text-center text-slate-500 py-8">No images found for this project. Try uploading one.</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {projectImages.map(image => (
                         <div
                            key={image.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select image: ${image.description}`}
                            className="group relative aspect-square cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-lg"
                            onClick={() => { setSelectedImage(image); setAiResult(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedImage(image); setAiResult(null); } }}
                        >
                            <img src={image.url} alt={image.description} className="w-full h-full object-cover rounded-lg shadow-sm" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 rounded-lg">
                                <p className="text-white text-xs text-center">Select</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};