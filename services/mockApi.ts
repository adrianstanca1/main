// This file mocks a backend API for the application.
// In a real application, this would be replaced with actual HTTP calls.
import * as mockData from './mockData';
import { 
    User, Company, Project, Todo, Timesheet, Document, SafetyIncident,
    FinancialKPIs, Invoice, Quote, Client, Equipment, ResourceAssignment,
    ProjectAssignment, Announcement, Conversation, ChatMessage,
    ProjectTemplate, TemplateTask, PlatformSettings, PendingApproval,
    AuditLog, UsageMetric, SystemHealth,
    Role, TodoStatus, TimesheetStatus, IncidentStatus, EquipmentStatus,
    DocumentStatus, DocumentCategory, ProjectRole,
    InvoiceLineItem, TodoPriority,
    // FIX: Add Comment and RiskAnalysis to imports to resolve type conflicts and errors.
    Comment,
    RiskAnalysis
// FIX: Removed Omit, as it's a built-in TypeScript utility type.
} from '../types';

// Simulate network latency
const LATENCY = 300;
const simulateDelay = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), LATENCY));
// FIX: Changed return type to Promise<never> to satisfy functions that expect specific Promise types on their error paths.
const simulateError = (message: string): Promise<never> => new Promise((_, reject) => setTimeout(() => reject(new Error(message)), LATENCY));


// --- Helper Functions ---
let nextId = 1000;
const getNextId = () => nextId++;

const createAuditLog = (actorId: number, action: string, target?: {id: number | string, type: string, name: string}, projectId?: number) => {
    const log: AuditLog = {
        id: getNextId(),
        timestamp: new Date(),
        actorId,
        action,
        target,
        projectId,
    };
    mockData.auditLogs.unshift(log);
}

// --- API Implementation ---
export const api = {
    // Auth/User
    getUsersByCompany: (companyId?: number): Promise<User[]> => {
        if (companyId === undefined) return simulateDelay(mockData.users); // For login screen
        return simulateDelay(mockData.users.filter(u => u.companyId === companyId));
    },

    // Company
    getCompanies: (): Promise<Company[]> => simulateDelay(mockData.companies),
    getCompanySettings: (companyId: number) => simulateDelay(mockData.companySettings.find(cs => cs.companyId === companyId) || mockData.companySettings[0]),
    updateCompanySettings: (companyId: number, updates: any, actorId: number) => {
        const index = mockData.companySettings.findIndex(cs => cs.companyId === companyId);
        if (index > -1) {
            mockData.companySettings[index] = { ...mockData.companySettings[index], ...updates };
            createAuditLog(actorId, `Updated company settings`);
            return simulateDelay(mockData.companySettings[index]);
        }
        return simulateError("Settings not found");
    },
    
    // Projects
    getProjectsByCompany: (companyId: number): Promise<Project[]> => simulateDelay(mockData.projects.filter(p => p.companyId === companyId)),
    getProjectsByUser: (userId: number): Promise<Project[]> => {
        const assignments = mockData.projectAssignments.filter(a => a.userId === userId);
        const projectIds = new Set(assignments.map(a => a.projectId));
        return simulateDelay(mockData.projects.filter(p => projectIds.has(p.id)));
    },
    getProjectsByManager: (userId: number): Promise<Project[]> => {
        const assignments = mockData.projectAssignments.filter(a => a.userId === userId && a.projectRole === ProjectRole.MANAGER);
        const projectIds = new Set(assignments.map(a => a.projectId));
        return simulateDelay(mockData.projects.filter(p => projectIds.has(p.id)));
    },
    // FIX: Corrected return type annotation by removing Omit wrapper which is not needed here.
    createProject: (projectData: Omit<Project, 'id' | 'companyId' | 'actualCost' | 'status'>, templateId: number | null, actorId: number): Promise<Project> => {
        const companyId = mockData.users.find(u => u.id === actorId)?.companyId;
        // FIX: The simulateError fix allows this return path to type-check correctly.
        if (!companyId) return simulateError("User company not found");

        const newProject: Project = {
            ...projectData,
            id: getNextId(),
            companyId,
            actualCost: 0,
            status: 'Active',
        };
        mockData.projects.push(newProject);
        createAuditLog(actorId, 'Created Project', {id: newProject.id, type: 'Project', name: newProject.name});

        if (templateId) {
            const template = mockData.projectTemplates.find(t => t.id === templateId);
            if (template) {
                template.templateTasks.forEach(tt => {
                    const newTodo: Todo = {
                        id: getNextId(),
                        text: tt.text,
                        projectId: newProject.id,
                        creatorId: actorId,
                        status: TodoStatus.TODO,
                        priority: tt.priority,
                        createdAt: new Date(),
                    };
                    mockData.todos.push(newTodo);
                });
            }
        }
        return simulateDelay(newProject);
    },

    // Todos
    getTodosByProject: (projectId: number): Promise<Todo[]> => simulateDelay(mockData.todos.filter(t => t.projectId === projectId)),
    getTodosByProjectIds: (projectIds: number[]): Promise<Todo[]> => simulateDelay(mockData.todos.filter(t => projectIds.includes(t.projectId))),
    addTodo: (taskData: Omit<Todo, 'id' | 'createdAt'>, actorId: number): Promise<Todo> => {
        const newTodo: Todo = { ...taskData, id: getNextId(), createdAt: new Date() };
        mockData.todos.unshift(newTodo);
        createAuditLog(actorId, 'Created Task', { id: newTodo.id, type: 'Task', name: newTodo.text }, newTodo.projectId);
        return simulateDelay(newTodo);
    },
    updateTodo: (id: number | string, updates: Partial<Todo>, actorId: number): Promise<Todo> => {
        const index = mockData.todos.findIndex(t => t.id === id);
        if (index > -1) {
            if (updates.status === TodoStatus.DONE && !mockData.todos[index].completedAt) {
                updates.completedAt = new Date();
            }
            mockData.todos[index] = { ...mockData.todos[index], ...updates, isOffline: false };
            createAuditLog(actorId, `Updated Task: ${Object.keys(updates).join(', ')}`, { id, type: 'Task', name: mockData.todos[index].text }, mockData.todos[index].projectId);
            return simulateDelay(mockData.todos[index]);
        }
        return simulateError("Todo not found");
    },
    // FIX: Added explicit return type Promise<Comment>
    addComment: (todoId: number | string, text: string, creatorId: number): Promise<Comment> => {
        const todo = mockData.todos.find(t => t.id === todoId);
        if (todo) {
            // FIX: Explicitly typing newComment as Comment from '../types' to resolve name collision with DOM Comment type.
            const newComment: Comment = { id: getNextId(), creatorId, text, createdAt: new Date() };
            if (!todo.comments) todo.comments = [];
            // FIX: Pushing the correctly typed comment object.
            todo.comments.push(newComment);
            createAuditLog(creatorId, 'Added Comment', { id: todoId, type: 'Task', name: todo.text }, todo.projectId);
            // FIX: Returning the correctly typed comment object.
            return simulateDelay(newComment);
        }
        // FIX: The simulateError fix allows this return path to type-check correctly.
        return simulateError("Todo not found");
    },
    updateTodoReminder: (todoId: number, reminderAt: Date | undefined, actorId: number) => {
        const todo = mockData.todos.find(t => t.id === todoId);
        if(todo) {
            todo.reminderAt = reminderAt;
            return simulateDelay(todo);
        }
        // FIX: The simulateError fix allows this return path to type-check correctly.
        return simulateError("Todo not found");
    },

    // Timesheets
    getTimesheetsByUser: (userId: number): Promise<Timesheet[]> => simulateDelay(mockData.timesheets.filter(t => t.userId === userId)),
    getTimesheetsByCompany: (companyId: number, actorId: number): Promise<Timesheet[]> => simulateDelay(mockData.timesheets.filter(ts => mockData.users.find(u => u.id === ts.userId)?.companyId === companyId)),
    getTimesheetsForManager: (managerId: number): Promise<Timesheet[]> => {
        const managedProjectIds = new Set(mockData.projectAssignments.filter(pa => pa.userId === managerId && pa.projectRole === ProjectRole.MANAGER).map(pa => pa.projectId));
        const managedUserIds = new Set(mockData.projectAssignments.filter(pa => managedProjectIds.has(pa.projectId)).map(pa => pa.userId));
        return simulateDelay(mockData.timesheets.filter(ts => managedUserIds.has(ts.userId)));
    },
    clockIn: (userId: number, projectId: number, location: any, workType: any, photo?: File): Promise<Timesheet> => {
        if (mockData.timesheets.some(t => t.userId === userId && t.clockOut === null)) {
            // FIX: The simulateError fix allows this return path to type-check correctly.
            return simulateError("You are already clocked in to another project.");
        }
        const newTimesheet: Timesheet = {
            id: getNextId(),
            userId,
            projectId,
            clockIn: new Date(),
            clockOut: null,
            breaks: [],
            workType,
            status: TimesheetStatus.PENDING,
            clockInLocation: location,
            trustScore: 1, // Will be calculated on backend
        };
        mockData.timesheets.unshift(newTimesheet);
        return simulateDelay(newTimesheet);
    },
    clockOut: (id: number, location: any, photo?: File): Promise<Timesheet> => {
        const index = mockData.timesheets.findIndex(t => t.id === id);
        if (index > -1) {
            mockData.timesheets[index].clockOut = new Date();
            mockData.timesheets[index].clockOutLocation = location;
            return simulateDelay(mockData.timesheets[index]);
        }
        return simulateError("Timesheet not found");
    },
    startBreak: (id: number, actorId: number) => {
         const ts = mockData.timesheets.find(t => t.id === id);
         if (ts) {
            ts.breaks.push({ startTime: new Date(), endTime: null });
            return simulateDelay(ts);
         }
         return simulateError("Timesheet not found");
    },
    endBreak: (id: number, actorId: number) => {
        const ts = mockData.timesheets.find(t => t.id === id);
        const openBreak = ts?.breaks.find(b => b.endTime === null);
        if(openBreak) {
            openBreak.endTime = new Date();
            return simulateDelay(ts!);
        }
        return simulateError("No active break found");
    },
    updateTimesheetStatus: (id: number, status: TimesheetStatus, reason: string | undefined, actorId: number) => {
        const ts = mockData.timesheets.find(t => t.id === id);
        if (ts) {
            ts.status = status;
            ts.rejectionReason = reason;
            createAuditLog(actorId, `Updated Timesheet to ${status}`, { id, type: 'Timesheet', name: `Timesheet #${id}`}, ts.projectId);
            return simulateDelay(ts);
        }
        return simulateError("Timesheet not found");
    },
    updateTimesheet: (id: number, updates: Partial<Timesheet>, actorId: number) => {
        const index = mockData.timesheets.findIndex(t => t.id === id);
        if (index > -1) {
            mockData.timesheets[index] = { ...mockData.timesheets[index], ...updates };
            createAuditLog(actorId, `Edited Timesheet`, { id, type: 'Timesheet', name: `Timesheet #${id}`}, mockData.timesheets[index].projectId);
            return simulateDelay(mockData.timesheets[index]);
        }
        return simulateError("Timesheet not found");
    },
    getUnbilledTimesheets: (companyId: number) => {
        const billableStatuses = [TimesheetStatus.APPROVED];
        const billedIds = new Set(mockData.invoices.flatMap(inv => (inv as any).billedTimesheetIds || []));
        const unbilled = mockData.timesheets.filter(ts => {
            const user = mockData.users.find(u => u.id === ts.userId);
            return user?.companyId === companyId && billableStatuses.includes(ts.status) && !billedIds.has(ts.id);
        });
        return simulateDelay(unbilled);
    },

    // Documents
    getDocumentsByCompany: (companyId: number) => simulateDelay(mockData.documents.filter(d => mockData.projects.find(p => p.id === d.projectId)?.companyId === companyId)),
    getDocumentsByProjectIds: (projectIds: number[]) => simulateDelay(mockData.documents.filter(d => projectIds.includes(d.projectId))),
    initiateDocumentUpload: (docData: any) => {
        const newDoc = { ...docData, id: getNextId(), status: DocumentStatus.UPLOADING, uploadedAt: new Date(), version: 1, url: '' };
        return simulateDelay(newDoc);
    },
    performChunkedUpload: (docId: number, fileSize: number, onProgress: (progress: number) => void) => {
        return new Promise(resolve => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 20;
                onProgress(progress);
                if (progress >= 100) {
                    clearInterval(interval);
                    resolve(true);
                }
            }, 100);
        });
    },
    finalizeDocumentUpload: (docId: number, actorId: number) => {
        const doc = mockData.documents.find(d => d.id === docId);
        if(doc) {
            doc.status = DocumentStatus.SCANNING;
            createAuditLog(actorId, 'Uploaded Document', {id: doc.id, type: 'Document', name: doc.name}, doc.projectId);
            // Simulate scanning process
            setTimeout(() => {
                doc.status = DocumentStatus.APPROVED;
                doc.url = '/sample.pdf';
            }, 2000);
            return simulateDelay(doc);
        }
        return simulateError("Document not found");
    },
    uploadOfflineDocument: (docData: any, fileData: any, actorId: number) => {
        const newDoc: Document = {
            id: getNextId(),
            ...docData,
            status: DocumentStatus.APPROVED,
            uploadedAt: new Date(),
            version: 1,
            url: '/sample.pdf', // Mock URL
        };
        mockData.documents.unshift(newDoc);
        createAuditLog(actorId, 'Uploaded Offline Document', { id: newDoc.id, type: 'Document', name: newDoc.name }, newDoc.projectId);
        return simulateDelay(newDoc);
    },
    searchAcrossDocuments: (query: string, projectIds: number[], userId: number) => {
        return simulateDelay({
            summary: `Based on your query for "${query}", the main findings indicate that safety harness checks are required daily before use, and rebar spacing should not exceed 12 inches on center.`,
            sources: [
                { documentId: 1, snippet: `...all personnel must wear appropriate harnesses when working at heights. These harnesses must be checked daily for any signs of wear and tear before any work commences...` },
                { documentId: 2, snippet: `...spacing for #5 rebar shall be 12" O.C. unless otherwise specified in the structural drawings...` },
            ]
        });
    },
    getDocumentAcksForUser: (userId: number) => simulateDelay(mockData.documentAcks.filter(ack => ack.userId === userId)),
    acknowledgeDocument: (userId: number, documentId: number) => {
        const newAck = { id: getNextId(), userId, documentId, timestamp: new Date() };
        mockData.documentAcks.push(newAck);
        return simulateDelay(newAck);
    },

    // Safety
    getSafetyIncidentsByCompany: (companyId: number) => simulateDelay(mockData.safetyIncidents.filter(i => mockData.projects.find(p => p.id === i.projectId)?.companyId === companyId)),
    getIncidentsByProject: (projectId: number) => simulateDelay(mockData.safetyIncidents.filter(i => i.projectId === projectId)),
    reportSafetyIncident: (incidentData: Omit<SafetyIncident, 'id'>, actorId: number) => {
        const newIncident = { ...incidentData, id: getNextId() };
        mockData.safetyIncidents.unshift(newIncident);
        createAuditLog(actorId, 'Reported Safety Incident', { id: newIncident.id, type: 'Safety', name: newIncident.type }, newIncident.projectId);
        return simulateDelay(newIncident);
    },
    generateSafetyAnalysis: (incidents: SafetyIncident[], projectId: number, actorId: number) => {
        return simulateDelay({
            report: `Analysis of ${incidents.length} incidents for Project #${projectId}:\n\n- Common trend: 65% of incidents are 'Near Miss' related to falling objects.\n- Recommendation: Implement mandatory tethering for all tools used at height.\n- Action: Schedule a toolbox talk on this topic for all site operatives.`
        });
    },
    
    // Reports
    submitOperativeReport: (data: { projectId: number, userId: number, notes: string, photoFile?: File }) => {
        const newReport = { id: getNextId(), timestamp: new Date(), ...data, photoUrl: data.photoFile ? '/placeholder.jpg' : undefined };
        mockData.operativeReports.unshift(newReport);
        return simulateDelay(newReport);
    },
    getOperativeReportsByProject: (projectId: number) => simulateDelay(mockData.operativeReports.filter(r => r.projectId === projectId)),
    getPhotosForProject: (projectId: number) => simulateDelay(mockData.projectPhotos.filter(p => p.projectId === projectId)),

    // Financials
    getFinancialKPIsForCompany: (companyId: number): Promise<FinancialKPIs> => simulateDelay({ profitability: 12.5, projectMargin: 22.3, cashFlow: 150340, currency: 'GBP' }),
    getInvoicesByCompany: (companyId: number) => simulateDelay(mockData.invoices.filter(i => i.companyId === companyId)),
    getQuotesByCompany: (companyId: number) => simulateDelay(mockData.quotes.filter(q => q.companyId === companyId)),
    getClientsByCompany: (companyId: number) => simulateDelay(mockData.clients.filter(c => c.companyId === companyId)),
    createInvoice: (invoiceData: Omit<Invoice, 'id' | 'issuedAt' | 'amountDue'>, billedTimesheetIds: number[], actorId: number) => {
        const newInvoice: Invoice = {
            ...invoiceData,
            id: getNextId(),
            issuedAt: new Date(),
            amountDue: invoiceData.total,
            status: 'Sent',
            billedTimesheetIds: billedTimesheetIds
        } as any;
        mockData.invoices.unshift(newInvoice);
        return simulateDelay(newInvoice);
    },
    getMonthlyFinancials: (companyId: number) => simulateDelay(mockData.monthlyFinancials),
    getCostBreakdown: (companyId: number) => simulateDelay(mockData.costBreakdown),

    // Equipment & Resources
    getEquipmentByCompany: (companyId: number) => simulateDelay(mockData.equipment.filter(e => e.companyId === companyId)),
    assignEquipmentToProject: (equipmentId: number, projectId: number, actorId: number) => {
        const item = mockData.equipment.find(e => e.id === equipmentId);
        if (item) {
            item.projectId = projectId;
            item.status = EquipmentStatus.IN_USE;
            return simulateDelay(item);
        }
        return simulateError("Equipment not found");
    },
    unassignEquipmentFromProject: (equipmentId: number, actorId: number) => {
        const item = mockData.equipment.find(e => e.id === equipmentId);
        if (item) {
            item.projectId = undefined;
            item.status = EquipmentStatus.AVAILABLE;
            return simulateDelay(item);
        }
        return simulateError("Equipment not found");
    },
    updateEquipmentStatus: (equipmentId: number, status: EquipmentStatus, actorId: number) => {
         const item = mockData.equipment.find(e => e.id === equipmentId);
        if (item) {
            item.status = status;
            if (status === EquipmentStatus.AVAILABLE) item.projectId = undefined;
            return simulateDelay(item);
        }
        return simulateError("Equipment not found");
    },
    getResourceAssignments: (companyId: number): Promise<ResourceAssignment[]> => simulateDelay(mockData.resourceAssignments.filter(r => r.companyId === companyId)),
    createResourceAssignment: (data: any, actorId: number) => {
        const newAssignment = { ...data, id: getNextId() };
        mockData.resourceAssignments.push(newAssignment);
        return simulateDelay(newAssignment);
    },
    deleteResourceAssignment: (id: number, actorId: number) => {
        // FIX: Mutate array in place to avoid read-only assignment error.
        const index = mockData.resourceAssignments.findIndex(a => a.id === id);
        if (index > -1) {
            mockData.resourceAssignments.splice(index, 1);
        }
        return simulateDelay({success: true});
    },
    
    // Team
    getProjectAssignmentsByCompany: (companyId: number) => simulateDelay(mockData.projectAssignments),
    updateUserProjectRole: (userId: number, projectId: number, role: ProjectRole, actorId: number) => {
        const assignment = mockData.projectAssignments.find(a => a.userId === userId && a.projectId === projectId);
        if (assignment) {
            assignment.projectRole = role;
            return simulateDelay(assignment);
        }
        return simulateError("Assignment not found");
    },
    
    // Communication
    sendAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>, actorId: number) => {
        const newAnnouncement: Announcement = { ...data, id: getNextId(), createdAt: new Date() };
        mockData.announcements.unshift(newAnnouncement);
        return simulateDelay(newAnnouncement);
    },
    getAnnouncementsForCompany: (companyId: number) => simulateDelay(mockData.announcements.filter(a => a.scope === 'platform' || a.companyId === companyId)),
    getConversationsForUser: (userId: number): Promise<Conversation[]> => {
        return simulateDelay(mockData.conversations.filter(c => c.participants.includes(userId)));
    },
    getMessagesForConversation: (conversationId: number, userId: number): Promise<ChatMessage[]> => {
        const convo = mockData.conversations.find(c => c.id === conversationId);
        if (convo) {
            // Mark messages as read
            convo.messages.forEach(msg => { if (msg.senderId !== userId) msg.isRead = true; });
            if (convo.lastMessage && convo.lastMessage.senderId !== userId) {
                convo.lastMessage.isRead = true;
            }
            return simulateDelay(convo.messages);
        }
        // FIX: The simulateError fix allows this return path to type-check correctly.
        return simulateError("Conversation not found");
    },
    sendMessage: (senderId: number, recipientId: number, content: string) => {
        let convo = mockData.conversations.find(c => c.participants.includes(senderId) && c.participants.includes(recipientId));
        if (!convo) {
            convo = { id: getNextId(), participants: [senderId, recipientId], messages: [], lastMessage: null };
            mockData.conversations.unshift(convo);
        }
        const newMessage: ChatMessage = {
            id: getNextId(),
            conversationId: convo.id,
            senderId,
            content,
            timestamp: new Date(),
            isRead: false,
        };
        convo.messages.push(newMessage);
        convo.lastMessage = newMessage;
        return simulateDelay({ message: newMessage, conversation: convo });
    },
    
    // Weather & Location
    getWeatherForecast: (lat: number, lng: number): Promise<any> => simulateDelay({ condition: 'Partly Cloudy', temperature: 18, icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" }),

    // Templates
    getProjectTemplates: (companyId: number) => simulateDelay(mockData.projectTemplates.filter(t => t.companyId === companyId)),
    saveProjectTemplate: (templateData: any, actorId: number) => {
        if (templateData.id) {
            const index = mockData.projectTemplates.findIndex(t => t.id === templateData.id);
            mockData.projectTemplates[index] = { ...mockData.projectTemplates[index], ...templateData };
            return simulateDelay(mockData.projectTemplates[index]);
        } else {
            const newTemplate = { ...templateData, id: getNextId() };
            mockData.projectTemplates.push(newTemplate);
            return simulateDelay(newTemplate);
        }
    },
    deleteProjectTemplate: (templateId: number, actorId: number) => {
        // FIX: Mutate array in place to avoid read-only assignment error.
        const index = mockData.projectTemplates.findIndex(t => t.id === templateId);
        if (index > -1) {
            mockData.projectTemplates.splice(index, 1);
        }
        return simulateDelay({ success: true });
    },

    // AI Tools
    getTools: (userId: number) => simulateDelay(mockData.tools),
    findGrants: (keywords: string, location: string) => {
        return simulateDelay([
            { id: 'g1', name: 'Green Construction Initiative', agency: 'Gov UK', amount: '£50,000', description: 'For SMEs using sustainable materials.', url: '#' },
            { id: 'g2', name: 'Tech Retrofit Fund', agency: 'Innovate UK', amount: '£100,000', description: 'For retrofitting buildings with smart technology.', url: '#' },
        ]);
    },
    analyzeForRisks: (text: string) => {
        // FIX: Explicitly type the object to match the RiskAnalysis type, ensuring correct literal types for `severity`.
        const riskAnalysis: RiskAnalysis = {
            summary: "Analysis found 2 potential risks: one medium financial risk related to unclear payment terms and one low compliance risk.",
            identifiedRisks: [
                { severity: 'Medium', description: "Payment terms mention 'net 30' but do not specify if this is from invoice date or completion date.", recommendation: "Clarify the start date for the net 30 payment term in writing before agreeing." },
                { severity: 'Low', description: "Reference to 'standard safety procedures' is vague.", recommendation: "Request a specific list of applicable safety standards (e.g., ISO 45001)." }
            ]
        };
        return simulateDelay(riskAnalysis);
    },
    generateBidPackage: (url: string, strengths: string) => {
        return simulateDelay({
            coverLetter: `Dear Sir/Madam,\n\nWe are pleased to submit our bid... Our key strengths include ${strengths}.\n\nSincerely,\nAS Agents`,
            checklist: ["Complete Form A", "Provide insurance certificate", "Submit 3 case studies"],
            summary: "This project involves... Our proposal focuses on delivering quality and efficiency."
        });
    },
    generateDailySummary: (projectId: number, date: Date, userId: number) => {
        return simulateDelay(`**Daily Summary for ${date.toLocaleDateString()}**\n- Progress: Framing on floor 2 completed (95%). Electrical rough-in started.\n- Blockers: None reported.\n- Safety: 1 minor hazard observation (trailing cables), resolved on site.\n- Next 24h: Continue electrical, start plumbing rough-in.`);
    },
    editImageWithAi: (base64: string, mimeType: string, prompt: string, projectId: number, userId: number) => {
        // Mock response: returns the same image with a text response
        return simulateDelay({
            parts: [
                { text: "I have circled the potential hazard in red as requested. The worker on the left is not wearing safety glasses." },
                { inlineData: { data: base64, mimeType: mimeType } }
            ]
        });
    },

    // Principal Admin
    getSystemHealth: (actorId: number) => simulateDelay(mockData.systemHealth),
    getAllCompaniesForAdmin: (actorId: number) => simulateDelay(mockData.companies),
    getUsageMetrics: (actorId: number) => simulateDelay(mockData.usageMetrics),
    getPlatformStats: (actorId: number) => simulateDelay({ totalCompanies: mockData.companies.length, totalUsers: mockData.users.length, activeProjects: mockData.projects.filter(p => p.status === 'Active').length }),
    getPlatformSettings: (actorId: number) => simulateDelay(mockData.platformSettings),
    updatePlatformSettings: (settings: PlatformSettings, actorId: number) => {
        // FIX: Mutate object properties instead of reassigning the read-only object.
        Object.assign(mockData.platformSettings, settings);
        return simulateDelay(mockData.platformSettings);
    },
    getPendingApprovalsForPlatform: (actorId: number) => simulateDelay(mockData.pendingApprovals),
    getPlatformAuditLogs: (actorId: number) => simulateDelay(mockData.auditLogs),
    getPlatformAnnouncements: (actorId: number) => simulateDelay(mockData.announcements.filter(a => a.scope === 'platform')),
    updateCompanyStatus: (companyId: number, status: Company['status'], actorId: number) => {
        const company = mockData.companies.find(c => c.id === companyId);
        if (company) {
            company.status = status;
            return simulateDelay(company);
        }
        return simulateError("Company not found");
    },
    inviteCompany: (companyName: string, adminEmail: string, actorId: number) => {
        // In a real app, this would trigger an email and provisioning workflow.
        console.log(`Inviting ${companyName} with admin ${adminEmail}`);
        return simulateDelay({ success: true });
    },
    getAuditLogsForUserProjects: (userId: number) => {
         const userProjectIds = new Set(mockData.projectAssignments.filter(a => a.userId === userId).map(a => a.projectId));
         return simulateDelay(mockData.auditLogs.filter(log => log.projectId && userProjectIds.has(log.projectId)));
    }
};