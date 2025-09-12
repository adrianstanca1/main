import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Corrected import paths to be relative.
import { User, Project, Todo, Document, SafetyIncident, Permission, TodoStatus, ProjectAssignment } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { DocumentStatusBadge } from './ui/StatusBadge';
import { MapView, MapMarker } from './MapView';

interface ProjectDetailViewProps {
  project: Project;
  user: User;
  onBack: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
  onStartChat: (user: User) => void;
}

type Tab = 'overview' | 'tasks' | 'documents' | 'team' | 'safety';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, user, onBack, addToast, isOnline, onStartChat }) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [todos, setTodos] = useState<Todo[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [todosData, documentsData, allAssignments, allUsers] = await Promise.all([
                api.getTodosByProjectIds([project.id]),
                api.getDocumentsByProjectIds([project.id]),
                api.getProjectAssignmentsByCompany(user.companyId!),
                api.getUsersByCompany(user.companyId!)
            ]);
            setTodos(todosData);
            setDocuments(documentsData);

            const projectAssignments = allAssignments.filter(a => a.projectId === project.id);
            const teamMembers = allUsers.filter(u => projectAssignments.some(pa => pa.userId === u.id));
            setTeam(teamMembers);

        } catch (error) {
            addToast("Failed to load project details.", "error");
        } finally {
            setLoading(false);
        }
    }, [project.id, user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleUpdateTask = async (taskId: number | string, updates: Partial<Todo>) => {
        try {
            const updatedTask = await api.updateTodo(taskId, updates, user.id);
            setTodos(currentTodos => currentTodos.map(t => t.id === taskId ? updatedTask : t));
            addToast("Task updated successfully", "success");
        } catch (error) {
            addToast("Failed to update task", "error");
        }
    };
    
    const mapMarkers: MapMarker[] = useMemo(() => [
        { lat: project.location.lat, lng: project.location.lng, radius: project.geofenceRadius, popupContent: project.name }
    ], [project]);


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}>&larr; All Projects</Button>
                <h2 className="text-3xl font-bold text-slate-800">{project.name}</h2>
            </div>
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                    {(['overview', 'tasks', 'documents', 'team'] as Tab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {loading ? <Card><p>Loading project data...</p></Card> : (
                <>
                    {activeTab === 'overview' && (
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2">
                               <h3 className="font-semibold text-lg mb-2">Project Details</h3>
                               <p>{project.projectType} - {project.workClassification}</p>
                               <MapView markers={mapMarkers} height="h-80" />
                            </Card>
                             <Card>
                                 <h3 className="font-semibold text-lg mb-2">Financials</h3>
                                 <p>Budget: £{project.budget.toLocaleString()}</p>
                                 <p>Actual Cost: £{project.actualCost.toLocaleString()}</p>
                             </Card>
                        </div>
                    )}
                    {activeTab === 'tasks' && <KanbanBoard todos={todos} onUpdateTodo={handleUpdateTask} personnel={team} user={user} />}
                    {activeTab === 'documents' && <Card>
                        <h3 className="font-semibold text-lg mb-4">Project Documents</h3>
                        {documents.map(doc => (
                            <div key={doc.id} className="p-2 border-b flex justify-between items-center">
                                <span>{doc.name}</span>
                                <DocumentStatusBadge status={doc.status} />
                            </div>
                        ))}
                        {documents.length === 0 && <p>No documents for this project.</p>}
                    </Card>}
                    {activeTab === 'team' && <Card>
                        <h3 className="font-semibold text-lg mb-4">Project Team</h3>
                        {team.map(member => (
                            <div key={member.id} className="p-2 border-b flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-sm text-slate-500">{member.role}</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => onStartChat(member)}>Message</Button>
                            </div>
                        ))}
                    </Card>}
                </>
            )}
        </div>
    );
};