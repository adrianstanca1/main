import React, { useState, useEffect, useCallback } from 'react';
import { User, ProjectTemplate } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
// import { TemplateEditorModal } from './TemplateEditorModal';

interface TemplatesViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const TemplateCard: React.FC<{
    template: ProjectTemplate,
    onEdit: () => void,
    onDelete: () => void,
}> = ({ template, onEdit, onDelete }) => (
    <Card className="flex flex-col">
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
        // setIsEditorOpen(true);
        addToast("Create/Edit modal not implemented yet.", "error");
    };
    
    const handleEdit = (template: ProjectTemplate) => {
        setEditingTemplate(template);
        // setIsEditorOpen(true);
        addToast("Create/Edit modal not implemented yet.", "error");
    };

    const handleDelete = async (templateId: number) => {
        if (window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
            try {
                await api.deleteProjectTemplate(templateId, user.id);
                addToast("Template deleted successfully.", "success");
                fetchData();
            } catch (error) {
                addToast("Failed to delete template.", "error");
            }
        }
    };
    
    if (loading) {
        return <Card><p>Loading templates...</p></Card>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Project Templates</h2>
                <Button variant="primary" onClick={handleCreate}>
                    Create New Template
                </Button>
            </div>

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

            {templates.length === 0 && (
                <Card className="text-center py-16 text-slate-500">
                    <h3 className="text-xl font-semibold">No Templates Found</h3>
                    <p>Create your first project template to standardize your workflow.</p>
                </Card>
            )}
        </div>
    );
};
