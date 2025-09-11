
import React, { useState, useEffect, useCallback } from 'react';
import { User, ProjectTemplate, TemplateTask, TodoPriority, DocumentCategory } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface TemplateEditorModalProps {
    user: User;
    template: ProjectTemplate | null;
    onClose: () => void;
    onSave: (template: Omit<ProjectTemplate, 'id'> | ProjectTemplate) => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ user, template, onClose, onSave, addToast }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
    const [documentCategories, setDocumentCategories] = useState<Set<DocumentCategory>>(new Set());
    const [safetyProtocols, setSafetyProtocols] = useState<string[]>(['']);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description);
            setTemplateTasks(template.templateTasks);
            setDocumentCategories(new Set(template.documentCategories));
            setSafetyProtocols(template.safetyProtocols.length > 0 ? template.safetyProtocols : ['']);
        } else {
            // Reset for new template
            setName('');
            setDescription('');
            setTemplateTasks([]);
            setDocumentCategories(new Set());
            setSafetyProtocols(['']);
        }
    }, [template]);

    const handleTaskChange = (id: string, field: 'text' | 'priority', value: string) => {
        setTemplateTasks(prev => prev.map(task => 
            task.id === id ? { ...task, [field]: value } : task
        ));
    };

    const handleAddTask = () => {
        const newTask: TemplateTask = { id: `new-${Date.now()}`, text: '', priority: TodoPriority.MEDIUM };
        setTemplateTasks(prev => [...prev, newTask]);
    };
    
    const handleRemoveTask = (id: string) => {
        setTemplateTasks(prev => prev.filter(task => task.id !== id));
    };
    
    const handleProtocolChange = (index: number, value: string) => {
        setSafetyProtocols(prev => prev.map((p, i) => i === index ? value : p));
    };

    const handleAddProtocol = () => {
        setSafetyProtocols(prev => [...prev, '']);
    };
    
    const handleRemoveProtocol = (index: number) => {
        setSafetyProtocols(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleCategoryToggle = (category: DocumentCategory) => {
        setDocumentCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!name.trim()) {
            addToast("Template name is required.", "error");
            return;
        }
        setIsSaving(true);
        const templateData = {
            companyId: user.companyId!,
            name,
            description,
            templateTasks: templateTasks.filter(t => t.text.trim()),
            documentCategories: Array.from(documentCategories),
            safetyProtocols: safetyProtocols.filter(p => p.trim()),
        };
        
        try {
            if (template?.id) {
                await onSave({ ...templateData, id: template.id });
            } else {
                await onSave(templateData);
            }
        } catch (error) {
            // Error toast is handled by parent
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex-shrink-0">
                    {template ? 'Edit Project Template' : 'Create New Project Template'}
                </h2>
                <div className="flex-grow overflow-y-auto pr-4 space-y-6">
                    {/* Basic Details */}
                    <div className="space-y-4">
                        <div>
                            <label className="font-medium text-gray-700">Template Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="font-medium text-gray-700">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full p-2 border rounded-md mt-1" />
                        </div>
                    </div>
                    {/* Template Tasks */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2 border-t pt-4">Template Tasks</h3>
                        <div className="space-y-2">
                            {templateTasks.map(task => (
                                <div key={task.id} className="flex gap-2 items-center">
                                    <input value={task.text} onChange={e => handleTaskChange(task.id, 'text', e.target.value)} placeholder="Task description..." className="flex-grow p-2 border rounded-md" />
                                    <select value={task.priority} onChange={e => handleTaskChange(task.id, 'priority', e.target.value)} className="p-2 border rounded-md bg-white">
                                        {Object.values(TodoPriority).map(p => <option key={String(p)} value={p}>{p}</option>)}
                                    </select>
                                    <Button variant="ghost" onClick={() => handleRemoveTask(task.id)}>Remove</Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleAddTask} className="mt-2">+ Add Task</Button>
                    </div>
                    {/* Document Categories */}
                    <div>
                         <h3 className="text-lg font-semibold text-slate-700 mb-2 border-t pt-4">Required Document Categories</h3>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.values(DocumentCategory).map(cat => (
                                <label key={String(cat)} className="flex items-center gap-2 p-2 border rounded-md has-[:checked]:bg-sky-50 has-[:checked]:border-sky-500">
                                    <input type="checkbox" checked={documentCategories.has(cat)} onChange={() => handleCategoryToggle(cat)} className="h-4 w-4 rounded" />
                                    <span>{cat}</span>
                                </label>
                            ))}
                         </div>
                    </div>
                    {/* Safety Protocols */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2 border-t pt-4">Safety Protocols</h3>
                         <div className="space-y-2">
                            {safetyProtocols.map((protocol, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <input value={protocol} onChange={e => handleProtocolChange(index, e.target.value)} placeholder="e.g., Hard hats required..." className="flex-grow p-2 border rounded-md" />
                                    <Button variant="ghost" onClick={() => handleRemoveProtocol(index)}>Remove</Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleAddProtocol} className="mt-2">+ Add Protocol</Button>
                    </div>
                </div>
                 <div className="flex justify-end gap-2 mt-6 pt-4 border-t flex-shrink-0">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving}>Save Template</Button>
                </div>
            </Card>
        </div>
    );
};


interface TemplatesViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const TemplateCard: React.FC<{
    template: ProjectTemplate,
    onEdit: () => void,
    onDelete: () => void,
}> = ({ template, onEdit, onDelete }) => (
    <Card className="flex flex-col animate-card-enter">
        <div className="flex-grow">
            <h3 className="text-lg font-bold text-slate-800">{template.name}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">{template.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <span className="font-semibold">{template.templateTasks.length} Tasks</span>
                <span className="font-semibold">{template.documentCategories.length} Document Categories</span>
                <span className="font-semibold">{template.safetyProtocols.length} Safety Protocols</span>
            </div>
        </div>
        <div className="mt-6 pt-4 border-t flex gap-2">
            <Button variant="secondary" onClick={onEdit} className="w-full">Edit</Button>
            <Button variant="danger" onClick={onDelete} className="w-full">Delete</Button>
        </div>
    </Card>
);

export const TemplatesView: React.FC<TemplatesViewProps> = ({ user, addToast }) => {
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const data = await api.getProjectTemplates(user.companyId);
            setTemplates(data);
        } catch (error) {
            addToast("Failed to load project templates.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setEditingTemplate(null);
        setIsEditorOpen(true);
    };
    
    const handleEdit = (template: ProjectTemplate) => {
        setEditingTemplate(template);
        setIsEditorOpen(true);
    };

    const handleDelete = async (templateId: number) => {
        if (window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
            try {
                await api.deleteProjectTemplate(templateId, user.id);
                addToast("Template deleted.", "success");
                fetchData();
            } catch (error) {
                addToast("Failed to delete template.", "error");
            }
        }
    };
    
    const handleSave = async (templateData: Omit<ProjectTemplate, 'id'> | ProjectTemplate) => {
        try {
            await api.saveProjectTemplate(templateData, user.id);
            addToast("Template saved successfully!", "success");
            setIsEditorOpen(false);
            fetchData();
        } catch (error) {
            addToast("Failed to save template.", "error");
        }
    };

    return (
        <div className="space-y-6">
            {isEditorOpen && (
                <TemplateEditorModal
                    user={user}
                    template={editingTemplate}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleSave}
                    addToast={addToast}
                />
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Project Templates</h2>
                <Button onClick={handleCreate}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Template
                </Button>
            </div>

            {loading ? (
                <Card><p>Loading templates...</p></Card>
            ) : templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={() => handleEdit(template)}
                            onDelete={() => handleDelete(template.id)}
                        />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-12">
                     <h3 className="text-lg font-medium">No templates found.</h3>
                    <p className="text-slate-500 mt-1">Get started by creating your first project template.</p>
                </Card>
            )}
        </div>
    );
};