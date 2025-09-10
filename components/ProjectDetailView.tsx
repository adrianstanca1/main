import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Project, Todo, Document as Doc, User, Role, DocumentAcknowledgement, DocumentStatus, DocumentCategory, AuditLog, AuditLogAction, TodoPriority, SafetyIncident, IncidentSeverity, IncidentType, IncidentStatus, SubTask, Comment, ProjectHealth, TodoStatus, DailyLog, Equipment, EquipmentStatus, RFI, RFIStatus, CostEstimate, Permission, ProjectPhoto, OperativeReport } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { MapView } from './MapView';
import { KanbanBoard } from './KanbanBoard';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { ReminderControl } from './ReminderControl';
import { DocumentStatusBadge, IncidentSeverityBadge, IncidentStatusBadge, EquipmentStatusBadge } from './ui/StatusBadge';
import { getCachedTasks, cacheTasks, queueAction } from '../hooks/useOfflineSync';
import { hasPermission } from '../services/auth';

// --- Add Task Modal ---
const AddTaskModal: React.FC<{
    projectId: number;
    user: User;
    onClose: () => void;
    onTaskAdded: (newTask: Todo) => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ projectId, user, onClose, onTaskAdded, addToast }) => {
    const [text, setText] = useState('');
    const [priority, setPriority] = useState<TodoPriority>(TodoPriority.MEDIUM);
    const [status, setStatus] = useState<TodoStatus>(TodoStatus.TODO);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) {
            addToast("Task name cannot be empty.", "error");
            return;
        }
        setIsSaving(true);
        try {
            const newTaskData = {
                text,
                projectId,
                priority,
                status,
                creatorId: user.id,
            };
            const newTask = await api.addTodo(newTaskData, user.id);
            addToast("Task added successfully!", "success");
            onTaskAdded(newTask);
            onClose();
        } catch (error) {
            addToast("Failed to add task.", "error");
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Add New Task</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="task-text" className="block text-sm font-medium text-gray-700">Task Name</label>
                        <input type="text" id="task-text" value={text} onChange={e => setText(e.target.value)} autoFocus className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700">Priority</label>
                            <select id="task-priority" value={priority} onChange={e => setPriority(e.target.value as TodoPriority)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                                {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="task-status" className="block text-sm font-medium text-gray-700">Status (Column)</label>
                            <select id="task-status" value={status} onChange={e => setStatus(e.target.value as TodoStatus)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                                {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>Add Task</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


// --- Report Incident Modal ---
const ReportIncidentModal: React.FC<{
    projectId: number;
    user: User;
    onClose: () => void;
    onIncidentReported: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ projectId, user, onClose, onIncidentReported, addToast }) => {
    const [type, setType] = useState<IncidentType>(IncidentType.NEAR_MISS);
    const [severity, setSeverity] = useState<IncidentSeverity>(IncidentSeverity.LOW);
    const [description, setDescription] = useState('');
    const [locationOnSite, setLocationOnSite] = useState('');
    const [isReporting, setIsReporting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !locationOnSite.trim()) {
            addToast("Please fill out all fields.", "error");
            return;
        }
        setIsReporting(true);
        try {
            await api.reportSafetyIncident({
                projectId,
                reporterId: user.id,
                timestamp: new Date(),
                type,
                severity,
                description,
                locationOnSite,
                status: IncidentStatus.REPORTED,
            });
            addToast("Safety incident reported successfully.", "success");
            onIncidentReported();
            onClose();
        } catch (error) {
            addToast("Failed to report incident.", "error");
            setIsReporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Report Safety Incident</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="incident-type" className="block text-sm font-medium text-gray-700">Type</label>
                            <select id="incident-type" value={type} onChange={e => setType(e.target.value as IncidentType)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                                {Object.values(IncidentType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="incident-severity" className="block text-sm font-medium text-gray-700">Severity</label>
                            <select id="incident-severity" value={severity} onChange={e => setSeverity(e.target.value as IncidentSeverity)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                                {Object.values(IncidentSeverity).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="incident-location" className="block text-sm font-medium text-gray-700">Location on Site</label>
                        <input type="text" id="incident-location" value={locationOnSite} onChange={e => setLocationOnSite(e.target.value)} placeholder="e.g., Level 3, East Wing" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="incident-desc" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="incident-desc" rows={4} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isReporting} variant="danger">Report Incident</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


// --- Task Detail Modal (New) ---
const TaskDetailModal: React.FC<{
    task: Todo;
    allTodos: Todo[];
    user: User;
    onClose: () => void;
    onUpdateTodo: (todoId: number | string, updates: Partial<Todo>) => void;
    onUpdateSubTask: (todoId: number | string, subTaskId: number, updates: Partial<SubTask>) => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ task, allTodos, user, onClose, onUpdateTodo, onUpdateSubTask, addToast }) => {
    const [isLinking, setIsLinking] = useState(false);
    
    const dependency = useMemo(() => {
        if (!task.dependsOn) return null;
        return allTodos.find(t => t.id === task.dependsOn);
    }, [task.dependsOn, allTodos]);

    const potentialDependencies = useMemo(() => {
        // Prevent a task from depending on itself or a task that already depends on it.
        const tasksThatDependOnMe = new Set(allTodos.filter(t => t.dependsOn === task.id).map(t => t.id));
        return allTodos.filter(t => t.id !== task.id && !tasksThatDependOnMe.has(t.id));
    }, [task.id, allTodos]);

    const handleDependencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDepId = e.target.value ? parseInt(e.target.value, 10) : undefined;
        onUpdateTodo(task.id, { dependsOn: newDepId });
        setIsLinking(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg h-auto max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">{task.text}</h3>

                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {/* Details section */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-semibold text-slate-500">Status</p>
                            <p>{task.status}</p>
                        </div>
                         <div>
                            <p className="font-semibold text-slate-500">Priority</p>
                            <PriorityDisplay priority={task.priority} />
                        </div>
                         <div>
                            <p className="font-semibold text-slate-500">Due Date</p>
                            <p>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p>
                        </div>
                    </div>

                    {/* Dependencies Section */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Dependencies</h4>
                        {isLinking ? (
                            <div className="flex items-center gap-2">
                                <select 
                                    onChange={handleDependencyChange} 
                                    defaultValue="" 
                                    className="w-full p-2 border rounded-md"
                                >
                                    <option value="">Select a task to depend on...</option>
                                    {potentialDependencies.map(p => (
                                        <option key={p.id} value={p.id}>{p.text}</option>
                                    ))}
                                </select>
                                <Button variant="ghost" size="sm" onClick={() => setIsLinking(false)}>Cancel</Button>
                            </div>
                        ) : dependency ? (
                            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    <p>Depends on: <span className="font-semibold">{dependency.text}</span></p>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${dependency.status === TodoStatus.DONE ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{dependency.status}</span>
                                </div>
                                <Button variant="danger" size="sm" onClick={() => onUpdateTodo(task.id, { dependsOn: undefined })}>Remove</Button>
                            </div>
                        ) : (
                            <Button variant="secondary" size="sm" onClick={() => setIsLinking(true)}>Add Dependency</Button>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};


// --- Gallery Components ---

interface GalleryImage {
  id: string | number;
  url: string;
  description: string;
  uploaderName: string;
  uploadedAt: Date;
  uploaderId: number;
}

const LightboxModal: React.FC<{
    images: GalleryImage[];
    startIndex: number;
    onClose: () => void;
}> = ({ images, startIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const image = images[currentIndex];

    const goToNext = useCallback(() => setCurrentIndex((prev) => (prev + 1) % images.length), [images.length]);
    const goToPrev = useCallback(() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length), [images.length]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'ArrowLeft') goToPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrev, onClose]);

    if (!image) return null;

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="lightbox-title" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
            <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300">&times;</button>
            {images.length > 1 && <>
                <button aria-label="Previous image" onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-4 text-white text-4xl p-4 hover:bg-black/20 rounded-full">&#8249;</button>
                <button aria-label="Next image" onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-4 text-white text-4xl p-4 hover:bg-black/20 rounded-full">&#8250;</button>
            </>}
            
            <div className="flex flex-col items-center p-4" onClick={e => e.stopPropagation()}>
                <img src={image.url} alt={image.description} className="max-w-[80vw] max-h-[75vh] object-contain rounded-lg" />
                <div className="text-white text-center mt-4 bg-black/30 p-3 rounded-lg max-w-2xl">
                    <h2 id="lightbox-title" className="sr-only">Image: {image.description}</h2>
                    <p>{image.description}</p>
                    <p className="text-sm text-gray-300 mt-1">By {image.uploaderName} on {new Date(image.uploadedAt).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

const UploadPhotoModal: React.FC<{
    projectId: number;
    user: User;
    onClose: () => void;
    onUploadSuccess: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ projectId, user, onClose, onUploadSuccess, addToast }) => {
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            addToast('Please select a file to upload.', 'error');
            return;
        }
        setIsUploading(true);
        try {
            // In a real app, you would upload the file and get a URL.
            // Here, we create a temporary local URL for display.
            const newPhotoData = {
                projectId,
                url: URL.createObjectURL(file), 
                caption,
                uploaderId: user.id,
            };
            await api.addProjectPhoto(newPhotoData, user.id);
            addToast('Photo uploaded successfully!', 'success');
            onUploadSuccess(); // This will trigger a refetch and close the modal
        } catch (error) {
            addToast(`Failed to upload photo: ${error}`, 'error');
            setIsUploading(false); // Only keep modal open on error
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Add Photo to Gallery</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="photo-file" className="block text-sm font-medium text-gray-700">Photo</label>
                        <input type="file" id="photo-file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} required className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
                    </div>
                     <div>
                        <label htmlFor="photo-caption" className="block text-sm font-medium text-gray-700">Caption</label>
                        <textarea id="photo-caption" rows={3} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a short description..." className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>Cancel</Button>
                        <Button type="submit" isLoading={isUploading} disabled={!file || !caption.trim()}>Upload Photo</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

const ProjectGallery: React.FC<{
    images: GalleryImage[];
    user: User;
    canAddPhotos: boolean;
    onAddPhoto: () => void;
    onImageSelect: (index: number) => void;
}> = ({ images, user, canAddPhotos, onAddPhoto, onImageSelect }) => {
    const [filter, setFilter] = useState<'all' | 'mine'>('all');

    const filteredImages = useMemo(() => {
        if (filter === 'mine') {
            return images.filter(img => img.uploaderId === user.id);
        }
        return images;
    }, [images, filter, user.id]);

    const showFilter = user.role === Role.OPERATIVE;

    return (
        <Card>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h3 className="text-xl font-semibold text-slate-700">Project Gallery</h3>
                <div className="flex items-center gap-4">
                     {showFilter && (
                        <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                            <Button size="sm" variant={filter === 'all' ? 'secondary' : 'ghost'} onClick={() => setFilter('all')} className={filter === 'all' ? 'bg-white shadow-sm' : ''}>All Project Photos</Button>
                            <Button size="sm" variant={filter === 'mine' ? 'secondary' : 'ghost'} onClick={() => setFilter('mine')} className={filter === 'mine' ? 'bg-white shadow-sm' : ''}>My Photos</Button>
                        </div>
                     )}
                    {canAddPhotos && (
                        <Button onClick={onAddPhoto} variant="primary">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Add Photo
                        </Button>
                    )}
                </div>
            </div>
            {filteredImages.length === 0 ? (
                 <p className="text-center text-slate-500 py-8">
                    {filter === 'mine' ? "You have not uploaded any photos for this project yet." : "No photos have been added to this project yet."}
                </p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredImages.map((image, index) => (
                        <div 
                            key={image.id} 
                            role="button"
                            tabIndex={0}
                            aria-label={`View image: ${image.description}`}
                            className="group relative aspect-square cursor-pointer animate-card-enter focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-lg" 
                            onClick={() => onImageSelect(index)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onImageSelect(index); }}
                            style={{animationDelay: `${index * 30}ms`}}
                        >
                            <img src={image.url} alt={image.description} className="w-full h-full object-cover rounded-lg shadow-sm" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 rounded-lg">
                                <p className="text-white text-xs truncate">{image.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};


interface ProjectDetailProps {
  project: Project;
  user: User;
  onBack: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

type Tab = 'overview' | 'documents' | 'tasks' | 'team' | 'equipment' | 'safety' | 'rfis' | 'activity' | 'daily-logs' | 'tools' | 'gallery';

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`py-2 px-4 transition-colors duration-200 ${
            isActive
                ? 'border-b-2 border-green-500 font-semibold text-green-600'
                : 'text-slate-500 hover:text-slate-700'
        }`}
    >
        {label}
    </button>
);


export const ProjectDetailView: React.FC<ProjectDetailProps> = ({ project, user, onBack, addToast, isOnline }) => {
    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [documents, setDocuments] = useState<Doc[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [companyUsers, setCompanyUsers] = useState<User[]>([]);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [projectHealth, setProjectHealth] = useState<ProjectHealth | null>(null);
    const [isHealthLoading, setIsHealthLoading] = useState(false);
    
    // UI State
    const [activeTab, setActiveTab] = useState<Tab>(user.role === Role.OPERATIVE ? 'gallery' : 'overview');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isReportIncidentModalOpen, setIsReportIncidentModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<Project>(project);
    const [isEditingManager, setIsEditingManager] = useState(false);
    const [selectedManagerId, setSelectedManagerId] = useState<string>(project.managerId.toString());
    const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);


    // --- PERMISSION CHECKS ---
    const canManageTasks = useMemo(() => hasPermission(user, Permission.MANAGE_TASKS), [user]);
    const canViewTasks = useMemo(() => hasPermission(user, Permission.VIEW_TASKS), [user]);
    const canManageTeam = useMemo(() => hasPermission(user, Permission.MANAGE_TEAM), [user]);
    const canManageDocs = useMemo(() => hasPermission(user, Permission.MANAGE_DOCUMENTS), [user]);
    const canViewDocs = useMemo(() => hasPermission(user, Permission.VIEW_DOCUMENTS), [user]);
    const canViewGallery = useMemo(() => hasPermission(user, Permission.VIEW_DOCUMENTS), [user]);
    const canAddPhotos = useMemo(() => hasPermission(user, Permission.MANAGE_DOCUMENTS), [user]);
    const canManageProject = useMemo(() => hasPermission(user, Permission.MANAGE_PROJECTS), [user]);
    const canViewHealth = useMemo(() => hasPermission(user, Permission.VIEW_ASSIGNED_PROJECTS) && (user.role === Role.ADMIN || user.role === Role.PM), [user]);
    const canManageSafety = useMemo(() => hasPermission(user, Permission.MANAGE_SAFETY_REPORTS), [user]);
    
    const projectManager = useMemo(() => companyUsers.find(u => u.id === currentProject.managerId), [companyUsers, currentProject.managerId]);

    // --- DATA FETCHING & ACTIONS ---
    const handleGenerateHealthReport = useCallback(async (
        proj: Project,
        todoList: Todo[],
        incidentList: SafetyIncident[],
        logList: AuditLog[],
        personnelList: User[],
        docList: Doc[]
    ) => {
        if (!canViewHealth) return;
        setIsHealthLoading(true);
        try {
            const report = await api.generateProjectHealthReport(proj, todoList, incidentList, logList, personnelList, docList);
            setProjectHealth(report);
        } catch (error) {
            addToast("Failed to generate project health report.", "error");
        } finally {
            setIsHealthLoading(false);
        }
    }, [addToast, canViewHealth]);

    const fetchData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        if (!isOnline && user.companyId) { 
            const cached = getCachedTasks(currentProject.id);
            if (cached) setTodos(cached);
            setLoading(false);
            return;
        }
        try {
            if (!user.companyId) throw new Error("User has no company assigned.");
            
            const [
                personnelData, docsData, todosData, companyUsersData, projectPhotosData, operativeReportsData, incidentsData, logsData
            ] = await Promise.all([
                api.getUsersByProject(currentProject.id, user.companyId),
                canViewDocs ? api.getDocumentsByProject(currentProject.id) : Promise.resolve([]),
                canViewTasks ? api.getTodosByProject(currentProject.id) : Promise.resolve([]),
                api.getUsersByCompany(user.companyId),
                canViewGallery ? api.getPhotosForProject(currentProject.id) : Promise.resolve([]),
                canViewGallery ? api.getOperativeReportsByProject(currentProject.id) : Promise.resolve([]),
                canManageSafety ? api.getIncidentsByProject(currentProject.id) : Promise.resolve([]),
                canViewHealth ? api.getAuditLogsByProject(currentProject.id) : Promise.resolve([]),
            ]);
            setPersonnel(personnelData);
            setDocuments(docsData);
            setTodos(todosData);
            setCompanyUsers(companyUsersData);
            setSafetyIncidents(incidentsData.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
            setAuditLogs(logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

            if (canViewHealth && isInitial) { // Only run health report on initial load to save resources
                handleGenerateHealthReport(currentProject, todosData, incidentsData, logsData, personnelData, docsData);
            }

            cacheTasks(currentProject.id, todosData);

            const uploaderMap = new Map<number, string>();
            companyUsersData.forEach(u => uploaderMap.set(u.id, u.name));

            const photoGalleryImages: GalleryImage[] = projectPhotosData.map(p => ({
                id: p.id,
                url: p.url,
                description: p.caption,
                uploadedAt: p.createdAt,
                uploaderId: p.uploaderId,
                uploaderName: uploaderMap.get(p.uploaderId) || 'Unknown'
            }));

            const reportImages: GalleryImage[] = operativeReportsData
                .filter(r => r.photoUrl)
                .map(r => ({
                    id: `report-${r.id}`,
                    url: r.photoUrl!,
                    description: r.notes,
                    uploadedAt: r.date,
                    uploaderId: r.userId,
                    uploaderName: uploaderMap.get(r.userId) || 'Unknown Operative'
                }));

            const combined = [...photoGalleryImages, ...reportImages].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
            setGalleryImages(combined);

        } catch (error) {
            console.error("Failed to fetch project details:", error);
            addToast('Failed to load project data.', 'error');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [currentProject, user.companyId, canViewDocs, canViewTasks, canViewGallery, canViewHealth, canManageSafety, addToast, isOnline, handleGenerateHealthReport]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    const handleUpdateTodo = async (todoId: number | string, updates: Partial<Todo>) => {
         try {
            const updatedTodo = await api.updateTodo(todoId, updates, user.id);
            const newTodos = todos.map(t => t.id === todoId ? updatedTodo : t);
            setTodos(newTodos);
            cacheTasks(project.id, newTodos);
            
            // Also update the selected task in the modal if it's open
            if (selectedTask && selectedTask.id === todoId) {
                setSelectedTask(updatedTodo);
            }
            addToast('Task updated!', 'success');
        } catch (error) {
            addToast(String(error), 'error');
        }
    };
    
    const handleAddTask = async (status: TodoStatus, text: string) => {
        try {
            const newTaskData = {
                text,
                projectId: currentProject.id,
                priority: TodoPriority.MEDIUM,
                status,
                creatorId: user.id,
            };
            const newTask = await api.addTodo(newTaskData, user.id);
            setTodos(prev => [newTask, ...prev]);
            addToast('Task added!', 'success');
        } catch (error) {
            addToast(`Error adding task: ${error}`, 'error');
        }
    };
    
     const handleUpdateSubTask = async (todoId: number | string, subTaskId: number, updates: Partial<SubTask>) => {
        const todo = todos.find(t => t.id === todoId);
        if (!todo) return;
        const updatedSubTasks = todo.subTasks?.map(st => st.id === subTaskId ? {...st, ...updates} : st);
        handleUpdateTodo(todoId, { subTasks: updatedSubTasks });
    };

    const handleSaveManager = async () => {
        if (selectedManagerId === currentProject.managerId.toString()) {
            setIsEditingManager(false);
            return;
        }
        try {
            const updatedProject = await api.updateProjectManager(currentProject.id, parseInt(selectedManagerId, 10), user.id);
            setCurrentProject(updatedProject); // Update local state
            addToast("Project Manager updated successfully!", "success");
            setIsEditingManager(false);
        } catch (error) {
            addToast(String(error), 'error');
        }
    };

    const handleUploadSuccess = () => {
        setIsUploadModalOpen(false);
        fetchData(); // Refetch all data to include the new photo
    };
    
    // --- RENDER LOGIC ---

    const availableTabs = [
        { id: 'overview', label: 'Overview', visible: canViewHealth },
        { id: 'gallery', label: 'Gallery', visible: canViewGallery },
        { id: 'tasks', label: 'Tasks', visible: canViewTasks },
        { id: 'documents', label: 'Documents', visible: canViewDocs },
        { id: 'safety', label: 'Safety', visible: canManageSafety },
        { id: 'team', label: 'Team', visible: hasPermission(user, Permission.VIEW_TEAM) },
        { id: 'activity', label: 'Activity', visible: canViewHealth },
    ].filter(tab => tab.visible);

    const renderManagerSection = () => {
        if (!projectManager && !canManageProject) return null;

        return (
            <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-slate-500">Project Manager</p>
                {isEditingManager && canManageProject ? (
                    <div className="flex items-center gap-2 mt-1">
                        <select
                            value={selectedManagerId}
                            onChange={(e) => setSelectedManagerId(e.target.value)}
                            className="p-1 border border-gray-300 rounded-md text-sm bg-white"
                        >
                            {personnel.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <Button size="sm" variant="success" onClick={handleSaveManager}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                            setIsEditingManager(false);
                            setSelectedManagerId(currentProject.managerId.toString());
                        }}>Cancel</Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-2">
                        <p className="text-lg font-semibold text-slate-800">{projectManager?.name || 'Unassigned'}</p>
                        {canManageProject && (
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingManager(true)}>Change</Button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderOverviewTab = () => {
        const getHealthColor = (score: number) => score > 80 ? 'text-green-500' : score > 60 ? 'text-yellow-500' : 'text-red-500';
        
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-slate-700">AI Project Health</h3>
                        {canManageProject && <Button size="sm" variant="secondary" isLoading={isHealthLoading} onClick={() => handleGenerateHealthReport(currentProject, todos, safetyIncidents, auditLogs, personnel, documents)}>Refresh</Button>}
                    </div>
                    {isHealthLoading && !projectHealth ? (
                        <div className="text-center py-10">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
                            <p className="mt-4 text-slate-600">AI is analyzing project data...</p>
                        </div>
                    ) : projectHealth ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <div className={`relative w-32 h-32 ${getHealthColor(projectHealth.score)}`}>
                                    <svg viewBox="0 0 36 36" className="w-full h-full">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3.8" />
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" strokeDasharray={`${projectHealth.score}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-3xl font-bold">{projectHealth.score}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-slate-600">Health Score</p>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <blockquote className="p-3 bg-slate-50 border-l-4 border-slate-400 text-slate-700 rounded-r-md italic">
                                    {projectHealth.summary}
                                </blockquote>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            Risks
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                            {projectHealth.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a2 2 0 00-1.8 2.4z" /></svg>
                                            Positives
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                            {projectHealth.positives.map((p, i) => <li key={i}>{p}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : <p className="text-slate-500 text-center py-8">Could not load project health data.</p>}
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold text-slate-700 mb-4">Site Location</h3>
                    <MapView markers={[{ lat: currentProject.location.lat, lng: currentProject.location.lng, radius: currentProject.radius }]} height="h-full min-h-[250px]" />
                </Card>
            </div>
        )
    };
    
    const renderSafetyTab = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-700">Safety Incidents</h3>
                {hasPermission(user, Permission.SUBMIT_SAFETY_REPORT) && <Button variant="danger" onClick={() => setIsReportIncidentModalOpen(true)}>Report Incident</Button>}
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Severity</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reporter</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {safetyIncidents.map(incident => (
                            <tr key={incident.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(incident.timestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{incident.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm"><IncidentSeverityBadge severity={incident.severity} /></td>
                                <td className="px-6 py-4 text-sm max-w-sm truncate" title={incident.description}>{incident.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{companyUsers.find(u => u.id === incident.reporterId)?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm"><IncidentStatusBadge status={incident.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {safetyIncidents.length === 0 && <p className="text-center py-8 text-slate-500">No safety incidents reported for this project.</p>}
            </div>
        </Card>
    );

    const renderActivityTab = () => {
        const getActorName = (id: number) => companyUsers.find(u => u.id === id)?.name || 'Unknown User';
        return (
            <Card>
                <h3 className="text-xl font-semibold text-slate-700 mb-4">Project Activity</h3>
                <ul className="space-y-4">
                    {auditLogs.map(log => (
                        <li key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 mt-1"></div>
                            <div>
                                <p className="text-sm text-slate-800">
                                    <span className="font-semibold">{getActorName(log.actorId)}</span> {log.action.toLowerCase()} {log.target ? `"${log.target.name}"` : ''}
                                </p>
                                <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                        </li>
                    ))}
                    {auditLogs.length === 0 && <p className="text-center py-8 text-slate-500">No activity recorded for this project yet.</p>}
                </ul>
            </Card>
        );
    };


    if (loading) {
        return <Card><p>Loading project details...</p></Card>;
    }

    return (
        <div className="animate-card-enter">
             {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    allTodos={todos}
                    user={user}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTodo={handleUpdateTodo}
                    onUpdateSubTask={handleUpdateSubTask}
                    addToast={addToast}
                />
            )}
             {isAddTaskModalOpen && (
                <AddTaskModal
                    projectId={currentProject.id}
                    user={user}
                    onClose={() => setIsAddTaskModalOpen(false)}
                    onTaskAdded={(newTask) => setTodos(prev => [newTask, ...prev])}
                    addToast={addToast}
                />
            )}
            {isReportIncidentModalOpen && (
                 <ReportIncidentModal
                    projectId={currentProject.id}
                    user={user}
                    onClose={() => setIsReportIncidentModalOpen(false)}
                    onIncidentReported={() => fetchData()}
                    addToast={addToast}
                />
            )}
            {isUploadModalOpen && (
                <UploadPhotoModal
                    projectId={currentProject.id}
                    user={user}
                    onClose={() => setIsUploadModalOpen(false)}
                    onUploadSuccess={handleUploadSuccess}
                    addToast={addToast}
                />
            )}
            {lightboxIndex !== null && (
                <LightboxModal
                    images={galleryImages}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
            <Button onClick={onBack} variant="ghost" className="mb-4 text-sm">
                &larr; Back to Projects
            </Button>
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                 <div className="flex-grow">
                    <h2 className="text-3xl font-bold text-slate-800">{currentProject.name}</h2>
                    <p className="text-slate-500">{currentProject.location.address}</p>
                </div>
                {renderManagerSection()}
            </div>

            <div className="mb-6 border-b flex justify-between items-center">
                <div className="flex flex-wrap gap-4 -mb-px">
                   {availableTabs.map(tab => (
                       <TabButton key={tab.id} label={tab.label} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id as Tab)} />
                   ))}
                </div>
                {activeTab === 'tasks' && canManageTasks && (
                    <Button onClick={() => setIsAddTaskModalOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        New Task
                    </Button>
                )}
            </div>

            {activeTab === 'overview' && canViewHealth && renderOverviewTab()}
            {activeTab === 'gallery' && canViewGallery && (
                <ProjectGallery 
                    images={galleryImages}
                    user={user}
                    canAddPhotos={canAddPhotos}
                    onAddPhoto={() => setIsUploadModalOpen(true)}
                    onImageSelect={(index) => setLightboxIndex(index)}
                />
            )}
            {activeTab === 'tasks' && canViewTasks && (
                <KanbanBoard 
                    todos={todos}
                    onUpdateTaskStatus={(todoId, newStatus) => handleUpdateTodo(todoId, { status: newStatus })}
                    onSelectTask={(task) => setSelectedTask(task)}
                    onAddTask={handleAddTask}
                    canManageTasks={canManageTasks}
                />
            )}
            {activeTab === 'safety' && renderSafetyTab()}
            {activeTab === 'activity' && renderActivityTab()}
        </div>
    );
};