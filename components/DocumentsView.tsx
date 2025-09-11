import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Document as Doc, Project, Role, DocumentCategory, DocumentStatus, DocumentAcknowledgement } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { DocumentStatusBadge } from './ui/StatusBadge';
import { Button } from './ui/Button';
import { queueAction } from '../hooks/useOfflineSync';

interface DocumentsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

const SortIcon: React.FC<{ sortKey: string; currentSort: { key: string; order: string; } }> = ({ sortKey, currentSort }) => {
    if (currentSort.key !== sortKey) {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (currentSort.order === 'asc') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
}

type DocWithProgress = Doc & { uploadProgress?: number };

export const DocumentsView: React.FC<DocumentsViewProps> = ({ user, addToast, isOnline }) => {
    const [allDocuments, setAllDocuments] = useState<DocWithProgress[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [acks, setAcks] = useState<DocumentAcknowledgement[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        projectId: 'all',
        category: 'all',
        status: 'all',
    });
    const [sort, setSort] = useState({ key: 'uploadedAt', order: 'desc' });
    
    // Upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProjectId, setUploadProjectId] = useState<string>('');
    const [uploadCategory, setUploadCategory] = useState<DocumentCategory>(DocumentCategory.GENERAL);
    const [isUploading, setIsUploading] = useState(false);

    const canUpload = user.role === Role.ADMIN || user.role === Role.PM;

    const fetchData = useCallback(async () => {
        // Don't set loading to true on refetch, only on initial load
        // setLoading(true); 
        try {
            let docsPromise;
            let projectsPromise;
            
            const userRole = user.role;
            if (userRole === Role.ADMIN) {
                projectsPromise = api.getProjectsByCompany(user.companyId);
                docsPromise = api.getDocumentsByCompany(user.companyId);
            } else if (userRole === Role.PM) {
                const managedProjects = await api.getProjectsByManager(user.id);
                const projectIds = managedProjects.map(p => p.id);
                docsPromise = api.getDocumentsByProjectIds(projectIds);
                projectsPromise = Promise.resolve(managedProjects);
            } else { // Operative, Foreman, Safety Officer
                const assignedProjects = await api.getProjectsByUser(user.id);
                const projectIds = assignedProjects.map(p => p.id);
                docsPromise = api.getDocumentsByProjectIds(projectIds);
                projectsPromise = Promise.resolve(assignedProjects);
            }
            
            const [docs, projs, companyUsers, userAcks] = await Promise.all([
                docsPromise,
                projectsPromise,
                api.getUsersByCompany(user.companyId),
                api.getDocumentAcksForUser(user.id)
            ]);
            
            setAllDocuments(prevDocs => {
                const uploadingDocs = prevDocs.filter(d => d.status === DocumentStatus.UPLOADING);
                const newDocIds = new Set(docs.map(d => d.id));
                const uniqueUploadingDocs = uploadingDocs.filter(ud => !newDocIds.has(ud.id));
                return [...uniqueUploadingDocs, ...docs];
            });

            setProjects(projs);
            setUsers(companyUsers);
            setAcks(userAcks);
            
            if (projs.length > 0 && !uploadProjectId) {
                setUploadProjectId(projs[0].id.toString());
            }

        } catch (error) {
            addToast('Failed to load documents.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast, uploadProjectId]);
    
    useEffect(() => {
        fetchData();
        
        const handleDataChange = () => fetchData();
        window.addEventListener('datachanged', handleDataChange);
        return () => window.removeEventListener('datachanged', handleDataChange);
    }, [fetchData]);

    const filteredAndSortedDocuments = useMemo(() => {
        const uploadingDocs = allDocuments.filter(d => d.status === DocumentStatus.UPLOADING);
        let processableDocs = allDocuments.filter(d => d.status !== DocumentStatus.UPLOADING);

        if (searchTerm) {
            processableDocs = processableDocs.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (filters.projectId !== 'all') {
            processableDocs = processableDocs.filter(doc => doc.projectId === parseInt(filters.projectId, 10));
        }
        if (filters.category !== 'all') {
            processableDocs = processableDocs.filter(doc => doc.category === filters.category);
        }
        if (filters.status !== 'all') {
            processableDocs = processableDocs.filter(doc => doc.status === filters.status);
        }
        
        processableDocs.sort((a, b) => {
            if (sort.key === 'uploadedAt') {
                const valA = new Date(a.uploadedAt).getTime();
                const valB = new Date(b.uploadedAt).getTime();
                return sort.order === 'asc' ? valA - valB : valB - valA;
            } else { // name
                // Use localeCompare for more accurate string sorting
                return sort.order === 'asc'
                    ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                    : b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
            }
        });
        
        return [...uploadingDocs, ...processableDocs];
    }, [allDocuments, searchTerm, filters, sort]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value }));
    };

    const handleSort = (key: 'name' | 'uploadedAt') => {
        setSort(prev => {
            if (prev.key === key) {
                return { ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' };
            }
            return { key, order: 'desc' };
        });
    };
    
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !uploadProjectId || isUploading) return;
        
        if (!isOnline) {
            // --- OFFLINE PATH ---
            addToast(`You are offline. Upload for ${selectedFile.name} is queued.`, 'success');
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
                const base64 = dataUrl.split(',')[1];
    
                const docData = {
                    name: selectedFile.name,
                    projectId: parseInt(uploadProjectId),
                    category: uploadCategory,
                    creatorId: user.id,
                };
    
                const fileData = { base64, mimeType };
    
                queueAction({
                    type: 'UPLOAD_DOCUMENT',
                    payload: { docData, fileData },
                    projectId: parseInt(uploadProjectId)
                });
    
                // Optimistic UI update
                const optimisticDoc: DocWithProgress = {
                    id: Date.now(), // Temp ID
                    name: selectedFile.name,
                    projectId: parseInt(uploadProjectId),
                    category: uploadCategory,
                    creatorId: user.id,
                    status: DocumentStatus.UPLOADING,
                    uploadedAt: new Date(),
                    version: 1,
                    url: '',
                    isOffline: true,
                    uploadProgress: 0,
                };
                setAllDocuments(prev => [optimisticDoc, ...prev]);
    
                // Reset form
                setShowUploadForm(false);
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            };
            reader.readAsDataURL(selectedFile);
            return;
        }

        // --- ONLINE PATH ---
        setIsUploading(true);
        addToast(`Starting upload for ${selectedFile.name}...`, 'success');

        try {
            const newDocStub = await api.initiateDocumentUpload({
                name: selectedFile.name,
                projectId: parseInt(uploadProjectId),
                category: uploadCategory,
                creatorId: user.id,
            });

            setAllDocuments(prev => [{ ...newDocStub, uploadProgress: 0 }, ...prev]);

            await api.performChunkedUpload(newDocStub.id, selectedFile.size, (progress) => {
                setAllDocuments(prev => prev.map(d =>
                    d.id === newDocStub.id ? { ...d, uploadProgress: progress } : d
                ));
            });

            await api.finalizeDocumentUpload(newDocStub.id, user.id);
            
            addToast(`${selectedFile.name} uploaded and is being processed.`, 'success');

            // Reset form
            setShowUploadForm(false);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

        } catch (error) {
            addToast(`Upload failed: ${error}`, 'error');
        } finally {
            setIsUploading(false);
            await fetchData(); // Refresh the list with final data
        }
    };

    const handleAcknowledge = async (docId: number) => {
        try {
            const ack = await api.acknowledgeDocument(user.id, docId);
            setAcks(prev => [...prev, ack]);
            addToast("Document acknowledged successfully!", "success");
        } catch (error) {
            addToast("Failed to acknowledge document.", "error");
        }
    };
    
    if (loading) {
        return <Card><p>Loading documents...</p></Card>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Documents</h2>
                 {canUpload && (
                    <Button variant="primary" onClick={() => setShowUploadForm(prev => !prev)}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {showUploadForm ? 'Cancel Upload' : 'Upload Document'}
                    </Button>
                )}
            </div>
            <Card>
                {showUploadForm && (
                    <form onSubmit={handleUpload} className="p-4 mb-6 bg-slate-50 rounded-lg border transition-all duration-300">
                        <h3 className="font-semibold text-lg mb-4 text-slate-700">New Document Upload</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                                <label htmlFor="doc-file" className="block text-sm font-medium text-gray-700">File</label>
                                <input
                                    type="file"
                                    id="doc-file"
                                    ref={fileInputRef}
                                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                    required
                                    className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                                />
                            </div>
                            <div>
                                <label htmlFor="upload-project" className="block text-sm font-medium text-gray-700">Project</label>
                                <select id="upload-project" value={uploadProjectId} onChange={(e) => setUploadProjectId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="upload-category" className="block text-sm font-medium text-gray-700">Category</label>
                                <select id="upload-category" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                                    {/* FIX: Use String() for enum keys in map to prevent potential type errors. */}
                                    {Object.values(DocumentCategory).map(c => <option key={String(c)} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button type="submit" className="w-full" isLoading={isUploading} disabled={!selectedFile || !uploadProjectId}>
                                    Upload
                                </Button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="flex flex-wrap items-end gap-4 mb-4 pb-4 border-b">
                    <div className="flex-grow min-w-[250px]">
                        <label htmlFor="doc-search" className="block text-sm font-medium text-gray-700 mb-1">Search by Name</label>
                        <input
                            id="doc-search"
                            type="text"
                            placeholder="e.g., Safety Manual..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                    </div>
                     <div className="flex-shrink-0">
                        <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select id="project-filter" name="projectId" value={filters.projectId} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                     <div className="flex-shrink-0">
                        <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select id="category-filter" name="category" value={filters.category} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                            <option value="all">All Categories</option>
                            {/* FIX: Use String() for enum keys in map to prevent potential type errors. */}
                            {Object.values(DocumentCategory).map(c => <option key={String(c)} value={c}>{c}</option>)}
                        </select>
                    </div>
                     <div className="flex-shrink-0">
                        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select id="status-filter" name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                            <option value="all">All Statuses</option>
                            {/* FIX: Use String() for enum keys in map to prevent potential type errors. */}
                            {Object.values(DocumentStatus).filter(s => s !== DocumentStatus.UPLOADING).map(s => <option key={String(s)} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort('name')} className={`flex items-center gap-1 transition-colors ${sort.key === 'name' ? 'text-slate-800 font-semibold' : 'hover:text-slate-700'}`}>
                                        Document Name <SortIcon sortKey="name" currentSort={sort} />
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                     <button onClick={() => handleSort('uploadedAt')} className={`flex items-center gap-1 transition-colors ${sort.key === 'uploadedAt' ? 'text-slate-800 font-semibold' : 'hover:text-slate-700'}`}>
                                        Uploaded <SortIcon sortKey="uploadedAt" currentSort={sort} />
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Uploaded By</th>
                                <th scope="col" className="relative px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSortedDocuments.map(doc => {
                                const project = projects.find(p => p.id === doc.projectId);
                                const creator = users.find(u => u.id === doc.creatorId);
                                const isAcknowledged = acks.some(ack => ack.documentId === doc.id);
                                return (
                                <tr key={doc.id} className={`hover:bg-slate-50 transition-colors ${doc.isOffline ? 'opacity-70' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        <p>{doc.name} {doc.version > 1 && `(v${doc.version})`}</p>
                                        {doc.isOffline && doc.status === DocumentStatus.UPLOADING && (
                                            <div className="mt-2 text-xs text-sky-700 font-medium flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Queued for upload
                                            </div>
                                        )}
                                        {doc.uploadProgress !== undefined && !doc.isOffline && doc.status === DocumentStatus.UPLOADING && (
                                            <div className="mt-2">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-medium text-sky-700">Uploading...</span>
                                                    <span className="text-xs font-medium text-sky-700">{Math.round(doc.uploadProgress)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div className="bg-sky-600 h-1.5 rounded-full transition-all duration-200" style={{ width: `${doc.uploadProgress}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{project?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><DocumentStatusBadge status={doc.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{creator?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            {doc.category === DocumentCategory.HS && doc.status === DocumentStatus.APPROVED && (
                                                <Button
                                                    size="sm"
                                                    variant={isAcknowledged ? 'success' : 'secondary'}
                                                    onClick={() => handleAcknowledge(doc.id)}
                                                    disabled={isAcknowledged}
                                                    className="w-[140px]"
                                                >
                                                    {isAcknowledged ? (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Acknowledged
                                                        </>
                                                    ) : (
                                                        'Acknowledge'
                                                    )}
                                                </Button>
                                            )}
                                            {doc.status === DocumentStatus.APPROVED && (
                                                <Button size="sm" variant="ghost" onClick={() => window.open(doc.url, '_blank')}>
                                                    Preview
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {filteredAndSortedDocuments.length === 0 && (
                        <p className="text-center py-8 text-slate-500">No documents match the current filters.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};