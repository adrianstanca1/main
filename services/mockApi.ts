// services/mockApi.ts
import { 
    User, Project, Todo, Timesheet, SafetyIncident, Equipment, Document,
    Company, Client, Invoice, Quote, ResourceAssignment, ProjectAssignment,
    DocumentAcknowledgement, OperativeReport, WeatherForecast, FinancialKPIs,
    Conversation, ChatMessage, Announcement, AuditLog, PendingApproval,
    SystemHealth, UsageMetric, PlatformSettings, ProjectTemplate, TemplateTask,
    Grant, RiskAnalysis, BidPackage, AISearchResult, CompanySettings,
    Role, TimesheetStatus, IncidentStatus, DocumentStatus, WorkType
} from '../types';
import { mockData } from './mockData';

// Helper to simulate network latency
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Simple deep copy to avoid modifying the original mock data
const deepCopy = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

let data = deepCopy(mockData);

// Function to reset data for testing purposes if needed
export const resetMockData = () => {
    data = deepCopy(mockData);
};

export const api = {
    // User and Company
    getCompanies: async (): Promise<Company[]> => {
        await delay(200);
        return deepCopy(data.companies.filter(c => c.id !== 0));
    },
    getUsersByCompany: async (companyId?: number): Promise<User[]> => {
        await delay(200);
        if (companyId === undefined) return deepCopy(data.users);
        if (companyId === 0) return deepCopy(data.users.filter(u => u.companyId === 0 || !u.companyId));
        return deepCopy(data.users.filter(u => u.companyId === companyId));
    },

    // Projects
    getProjectsByUser: async (userId: number): Promise<Project[]> => {
        await delay(300);
        const userAssignments = data.projectAssignments.filter(a => a.userId === userId);
        const projectIds = new Set(userAssignments.map(a => a.projectId));
        return deepCopy(data.projects.filter(p => projectIds.has(p.id)));
    },
    getProjectsByManager: async (managerId: number): Promise<Project[]> => {
        await delay(300);
        // In a real API, we'd check if the user is a PM for the project
        // Here, we just return projects where they are assigned.
        return api.getProjectsByUser(managerId);
    },
    getProjectsByCompany: async (companyId?: number): Promise<Project[]> => {
        await delay(300);
        if (!companyId) return [];
        return deepCopy(data.projects.filter(p => p.companyId === companyId));
    },
    createProject: async (projectData: Omit<Project, 'id'|'companyId'|'actualCost'|'status'>, templateId: number | null, creatorId: number): Promise<Project> => {
        await delay(500);
        const user = data.users.find(u => u.id === creatorId);
        if (!user?.companyId) throw new Error("User has no company ID");
        
        const newProject: Project = {
            id: Date.now(),
            companyId: user.companyId,
            ...projectData,
            actualCost: 0,
            status: 'Active'
        };
        data.projects.push(newProject);
        data.projectAssignments.push({ userId: creatorId, projectId: newProject.id });

        if (templateId) {
            const template = data.projectTemplates.find(t => t.id === templateId);
            if (template) {
                template.templateTasks.forEach(task => {
                    const newTodo: Todo = {
                        id: Date.now() + Math.random(),
                        projectId: newProject.id,
                        text: task.text,
                        priority: task.priority,
                        status: TodoStatus.TODO,
                        creatorId: creatorId,
                        createdAt: new Date(),
                    };
                    data.todos.push(newTodo);
                });
            }
        }
        return deepCopy(newProject);
    },

    // Todos
    getTodosByProject: async (projectId: number): Promise<Todo[]> => {
        await delay(100);
        return deepCopy(data.todos.filter(t => t.projectId === projectId));
    },
    getTodosByProjectIds: async (projectIds: number[]): Promise<Todo[]> => {
        await delay(400);
        const idSet = new Set(projectIds);
        return deepCopy(data.todos.filter(t => idSet.has(t.projectId)));
    },
    addTodo: async (taskData: Omit<Todo, 'id' | 'createdAt'>, creatorId: number): Promise<Todo> => {
        await delay(200);
        const newTodo: Todo = {
            id: Date.now(),
            ...taskData,
            creatorId,
            createdAt: new Date(),
        };
        data.todos.unshift(newTodo);
        return deepCopy(newTodo);
    },
    updateTodo: async (todoId: number | string, updates: Partial<Todo>, actorId: number): Promise<Todo> => {
        await delay(150);
        const todoIndex = data.todos.findIndex(t => t.id === todoId);
        if (todoIndex === -1) throw new Error("Todo not found");
        data.todos[todoIndex] = { ...data.todos[todoIndex], ...updates };
        return deepCopy(data.todos[todoIndex]);
    },
    updateTodoReminder: async (todoId: number, reminderDate: Date | undefined, userId: number): Promise<Todo> => {
        await delay(100);
        return api.updateTodo(todoId, { reminderAt: reminderDate }, userId);
    },
    addComment: async (todoId: number | string, text: string, creatorId: number): Promise<Comment> => {
        await delay(100);
        const newComment: Comment = {
            id: Date.now(),
            creatorId,
            text,
            createdAt: new Date()
        };
        const todo = data.todos.find(t => t.id === todoId);
        if (!todo) throw new Error("Todo not found");
        if (!todo.comments) todo.comments = [];
        todo.comments.push(newComment);
        return deepCopy(newComment);
    },

    // Timesheets
    getTimesheetsByUser: async (userId: number): Promise<Timesheet[]> => {
        await delay(200);
        return deepCopy(data.timesheets.filter(ts => ts.userId === userId).sort((a,b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()));
    },
    getTimesheetsByCompany: async (companyId: number, actorId: number): Promise<Timesheet[]> => {
        await delay(400);
        const companyUsers = new Set(data.users.filter(u => u.companyId === companyId).map(u => u.id));
        return deepCopy(data.timesheets.filter(ts => companyUsers.has(ts.userId)));
    },
    getTimesheetsForManager: async (managerId: number): Promise<Timesheet[]> => {
        await delay(300);
        const managedProjects = new Set((await api.getProjectsByManager(managerId)).map(p => p.id));
        return deepCopy(data.timesheets.filter(ts => managedProjects.has(ts.projectId)));
    },
    getUnbilledTimesheets: async (companyId?: number): Promise<Timesheet[]> => {
        await delay(200);
        const billedIds = new Set(data.invoices.flatMap(inv => (inv as any).billedTimesheetIds || []));
        return deepCopy(data.timesheets.filter(ts => ts.status === TimesheetStatus.APPROVED && !billedIds.has(ts.id)));
    },
    clockIn: async (userId: number, projectId: number, location: Location, workType: WorkType, photo?: File): Promise<Timesheet> => {
        await delay(400);
        if (data.timesheets.some(ts => ts.userId === userId && ts.clockOut === null)) {
            throw new Error("User is already clocked in.");
        }
        const newTimesheet: Timesheet = {
            id: Date.now(),
            userId,
            projectId,
            clockIn: new Date(),
            clockOut: null,
            workType,
            status: TimesheetStatus.PENDING,
            clockInLocation: location,
            breaks: [],
            checkInPhotoUrl: photo ? URL.createObjectURL(photo) : undefined,
        };
        data.timesheets.push(newTimesheet);
        return deepCopy(newTimesheet);
    },
    clockOut: async (timesheetId: number, location: Location, photo?: File): Promise<Timesheet> => {
        await delay(400);
        const tsIndex = data.timesheets.findIndex(ts => ts.id === timesheetId);
        if (tsIndex === -1) throw new Error("Timesheet not found");
        data.timesheets[tsIndex].clockOut = new Date();
        data.timesheets[tsIndex].clockOutLocation = location;
        if (photo) data.timesheets[tsIndex].checkOutPhotoUrl = URL.createObjectURL(photo);
        return deepCopy(data.timesheets[tsIndex]);
    },
    startBreak: async (timesheetId: number, userId: number): Promise<Timesheet> => {
        await delay(150);
        const ts = data.timesheets.find(t => t.id === timesheetId);
        if (!ts) throw new Error("Timesheet not found");
        ts.breaks.push({ startTime: new Date(), endTime: null });
        return deepCopy(ts);
    },
    endBreak: async (timesheetId: number, userId: number): Promise<Timesheet> => {
        await delay(150);
        const ts = data.timesheets.find(t => t.id === timesheetId);
        if (!ts) throw new Error("Timesheet not found");
        const activeBreak = ts.breaks.find(b => b.endTime === null);
        if (activeBreak) activeBreak.endTime = new Date();
        return deepCopy(ts);
    },
    updateTimesheetStatus: async (timesheetId: number, status: TimesheetStatus, reason: string | undefined, actorId: number): Promise<void> => {
        await delay(200);
        const ts = data.timesheets.find(t => t.id === timesheetId);
        if (!ts) throw new Error("Timesheet not found");
        ts.status = status;
        if (status === TimesheetStatus.REJECTED) {
            ts.rejectionReason = reason;
        }
    },
    updateTimesheet: async (id: number, updates: Partial<Timesheet>, actorId: number): Promise<Timesheet> => {
        await delay(200);
        const tsIndex = data.timesheets.findIndex(ts => ts.id === id);
        if (tsIndex === -1) throw new Error("Timesheet not found");
        data.timesheets[tsIndex] = { ...data.timesheets[tsIndex], ...updates };
        return deepCopy(data.timesheets[tsIndex]);
    },

    // Documents
    getDocumentsByProjectIds: async (projectIds: number[]): Promise<Document[]> => {
        await delay(300);
        const idSet = new Set(projectIds);
        return deepCopy(data.documents.filter(d => idSet.has(d.projectId)));
    },
    getDocumentsByCompany: async (companyId?: number): Promise<Document[]> => {
        await delay(300);
        const companyProjects = new Set(data.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return deepCopy(data.documents.filter(d => companyProjects.has(d.projectId)));
    },
    getDocumentAcksForUser: async (userId: number): Promise<DocumentAcknowledgement[]> => {
        await delay(150);
        return deepCopy(data.documentAcks.filter(ack => ack.userId === userId));
    },
    acknowledgeDocument: async (userId: number, documentId: number): Promise<DocumentAcknowledgement> => {
        await delay(100);
        const newAck: DocumentAcknowledgement = { id: Date.now(), userId, documentId, acknowledgedAt: new Date() };
        data.documentAcks.push(newAck);
        return deepCopy(newAck);
    },
    initiateDocumentUpload: async (docData: Omit<Document, 'id' | 'url' | 'status' | 'uploadedAt' | 'version'>): Promise<Document> => {
        await delay(100);
        const newDoc: Document = {
            id: Date.now(),
            ...docData,
            status: DocumentStatus.UPLOADING,
            uploadedAt: new Date(),
            url: '',
            version: 1,
        };
        data.documents.unshift(newDoc);
        return deepCopy(newDoc);
    },
    performChunkedUpload: async (docId: number, fileSize: number, onProgress: (progress: number) => void) => {
        for (let i = 0; i <= 100; i += 10) {
            await delay(50);
            onProgress(i);
        }
    },
    finalizeDocumentUpload: async (docId: number, userId: number): Promise<Document> => {
        await delay(1000); // Simulate processing
        const doc = data.documents.find(d => d.id === docId);
        if (!doc) throw new Error("Document not found");
        doc.status = DocumentStatus.APPROVED; // simplified
        doc.url = `/mock-docs/doc-${docId}.pdf`;
        return deepCopy(doc);
    },
    uploadOfflineDocument: async (docData: any, fileData: any, creatorId: number) => {
        await delay(1000);
        const newDoc: Document = {
            id: Date.now(),
            ...docData,
            status: DocumentStatus.APPROVED,
            uploadedAt: new Date(),
            url: `/mock-docs/offline-doc-${Date.now()}.pdf`,
            version: 1,
        };
        data.documents.unshift(newDoc);
    },

    // Safety
    getSafetyIncidentsByCompany: async (companyId: number): Promise<SafetyIncident[]> => {
        await delay(300);
        const companyProjects = new Set(data.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return deepCopy(data.safetyIncidents.filter(i => companyProjects.has(i.projectId)));
    },
    getIncidentsByProject: async (projectId: number): Promise<SafetyIncident[]> => {
        await delay(200);
        return deepCopy(data.safetyIncidents.filter(i => i.projectId === projectId));
    },
    reportSafetyIncident: async (incidentData: Omit<SafetyIncident, 'id'>, actorId: number): Promise<SafetyIncident> => {
        await delay(300);
        const newIncident: SafetyIncident = { id: Date.now(), ...incidentData };
        data.safetyIncidents.unshift(newIncident);
        return deepCopy(newIncident);
    },

    // Equipment & Resources
    getEquipmentByCompany: async (companyId: number): Promise<Equipment[]> => {
        await delay(200);
        return deepCopy(data.equipment.filter(e => e.companyId === companyId));
    },
    assignEquipmentToProject: async (equipmentId: number, projectId: number, actorId: number): Promise<void> => {
        await delay(150);
        const item = data.equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        item.projectId = projectId;
        item.status = 'In Use';
    },
    unassignEquipmentFromProject: async (equipmentId: number, actorId: number): Promise<void> => {
        await delay(150);
        const item = data.equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        delete item.projectId;
        item.status = 'Available';
    },
    updateEquipmentStatus: async (equipmentId: number, status: EquipmentStatus, actorId: number): Promise<void> => {
        await delay(150);
        const item = data.equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        item.status = status;
        if (status === 'Available') delete item.projectId;
    },
    getResourceAssignments: async (companyId?: number): Promise<ResourceAssignment[]> => {
        await delay(200);
        return deepCopy(data.resourceAssignments.filter(a => a.companyId === companyId));
    },
    createResourceAssignment: async (assignmentData: Omit<ResourceAssignment, 'id'>, actorId: number): Promise<ResourceAssignment> => {
        await delay(200);
        const newAssignment: ResourceAssignment = { id: Date.now(), ...assignmentData };
        data.resourceAssignments.push(newAssignment);
        return newAssignment;
    },
    deleteResourceAssignment: async (assignmentId: number, actorId: number): Promise<void> => {
        await delay(150);
        data.resourceAssignments = data.resourceAssignments.filter(a => a.id !== assignmentId);
    },

    // Other
    getProjectAssignmentsByCompany: async (companyId: number): Promise<ProjectAssignment[]> => {
        await delay(200);
        // This is a simplification. We should get projects for company then filter assignments.
        return deepCopy(data.projectAssignments);
    },
    getAuditLogsForUserProjects: async (userId: number): Promise<AuditLog[]> => {
        await delay(200);
        return deepCopy(data.auditLogs.slice(0, 15));
    },
    getWeatherForecast: async (lat: number, lng: number): Promise<WeatherForecast> => {
        await delay(400);
        return {
            temperature: 18,
            condition: "Partly Cloudy",
            icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        };
    },
    submitOperativeReport: async (reportData: { projectId: number, userId: number, notes: string, photoFile?: File }): Promise<void> => {
        await delay(500);
        const newReport: OperativeReport = {
            id: Date.now(),
            projectId: reportData.projectId,
            userId: reportData.userId,
            notes: reportData.notes,
            submittedAt: new Date(),
            photoUrl: reportData.photoFile ? URL.createObjectURL(reportData.photoFile) : undefined
        };
        data.operativeReports.push(newReport);
    },
    getConversationsForUser: async (userId: number): Promise<Conversation[]> => {
        await delay(100);
        return deepCopy(data.conversations.filter(c => c.participants.includes(userId)));
    },
    getMessagesForConversation: async (convoId: number, userId: number): Promise<ChatMessage[]> => {
        await delay(150);
        const convo = data.conversations.find(c => c.id === convoId);
        if (!convo) return [];
        // Mark messages as read
        convo.messages.forEach(m => {
            if (m.senderId !== userId) m.isRead = true;
        });
        if (convo.lastMessage && convo.lastMessage.senderId !== userId) {
            convo.lastMessage.isRead = true;
        }
        return deepCopy(convo.messages);
    },
    sendMessage: async (senderId: number, recipientId: number, content: string): Promise<{message: ChatMessage, conversation: Conversation}> => {
        await delay(200);
        let convo = data.conversations.find(c => c.participants.includes(senderId) && c.participants.includes(recipientId));
        if (!convo) {
            convo = { id: Date.now(), participants: [senderId, recipientId], messages: [], lastMessage: null };
            data.conversations.unshift(convo);
        }
        const newMessage: ChatMessage = { id: Date.now(), senderId, content, timestamp: new Date(), isRead: false };
        convo.messages.push(newMessage);
        convo.lastMessage = newMessage;
        return { message: deepCopy(newMessage), conversation: deepCopy(convo) };
    },
    getAnnouncementsForCompany: async (companyId: number): Promise<Announcement[]> => {
        await delay(150);
        return deepCopy(data.announcements.filter(a => a.scope === 'platform' || a.scope === 'company')); // Simplified
    },
    getCompanySettings: async (companyId: number): Promise<CompanySettings> => {
        await delay(100);
        const settings = data.companySettings.find(s => s.companyId === companyId);
        if (!settings) return deepCopy(data.companySettings[0]); // return default
        return deepCopy(settings);
    },
    updateCompanySettings: async (companyId: number, settings: CompanySettings, actorId: number): Promise<CompanySettings> => {
        await delay(200);
        const settingIndex = data.companySettings.findIndex(s => s.companyId === companyId);
        if (settingIndex > -1) {
            data.companySettings[settingIndex] = { ...data.companySettings[settingIndex], ...settings };
        } else {
            data.companySettings.push({ id: Date.now(), companyId, ...settings });
        }
        return settings;
    },

    // Financials
    getFinancialKPIsForCompany: async (companyId?: number): Promise<FinancialKPIs> => {
        await delay(500);
        return { profitability: 12.5, projectMargin: 18.2, cashFlow: 150340, currency: 'GBP' };
    },
    getInvoicesByCompany: async (companyId?: number): Promise<Invoice[]> => {
        await delay(300);
        return deepCopy(data.invoices.filter(i => i.companyId === companyId));
    },
    getQuotesByCompany: async (companyId?: number): Promise<Quote[]> => {
        await delay(300);
        return deepCopy(data.quotes.filter(q => q.companyId === companyId));
    },
    getClientsByCompany: async (companyId?: number): Promise<Client[]> => {
        await delay(200);
        return deepCopy(data.clients.filter(c => c.companyId === companyId));
    },
    getMonthlyFinancials: async (companyId?: number): Promise<any[]> => {
        await delay(200);
        return deepCopy(data.monthlyFinancials);
    },
    getCostBreakdown: async (companyId?: number): Promise<any[]> => {
        await delay(200);
        return deepCopy(data.costBreakdown);
    },
    createInvoice: async (invoiceData: any, timesheetIds: number[], actorId: number): Promise<Invoice> => {
        await delay(500);
        const newInvoice: Invoice = {
            id: Date.now(),
            ...invoiceData,
            issuedAt: new Date(),
            amountDue: invoiceData.total,
        };
        (newInvoice as any).billedTimesheetIds = timesheetIds;
        data.invoices.unshift(newInvoice);
        return deepCopy(newInvoice);
    },

    // AI Tools
    searchAcrossDocuments: async (query: string, projectIds: number[], userId: number): Promise<AISearchResult> => {
        await delay(1500);
        if (query.toLowerCase().includes("fail")) throw new Error("AI search engine failed to respond.");
        return {
            summary: `Based on the documents, the rebar specification for the foundation is grade B500B, and all safety harnesses must be inspected weekly. The deadline for the phase 2 concrete pour is approaching.`,
            sources: [
                { documentId: 1, snippet: `...all structural steel must conform to grade S355, while all reinforcing bar (rebar) shall be B500B standard...` },
                { documentId: 3, snippet: `...weekly inspection of all fall arrest systems, including harnesses and lanyards, is mandatory...` }
            ]
        };
    },
    generateSafetyAnalysis: async (incidents: SafetyIncident[], projectId: number, userId: number): Promise<{ report: string }> => {
        await delay(2000);
        return { report: `Analysis of ${incidents.length} incidents for Project ${projectId}:\n\nA recurring trend of 'Near Miss' incidents involving falling objects from height has been identified. This suggests a need to review and enforce stricter material handling protocols on upper levels.\n\nRecommendations:\n1. Mandate the use of tethered tools for all personnel working at height.\n2. Increase the frequency of site walks by the Safety Officer, focusing on storage and securing of materials.\n3. Hold a toolbox talk specifically addressing this issue within the next 48 hours.` };
    },
    generateDailySummary: async (projectId: number, date: Date, userId: number): Promise<string> => {
        await delay(1500);
        return `Date: ${date.toLocaleDateString()} - Project ID: ${projectId}
--- DAILY SUMMARY ---
Weather: 18°C, Partly Cloudy
Personnel On-site: 12 Operatives, 2 Foremen, 1 PM

Work Completed:
- Completed rebar installation for the main foundation slab.
- Poured section 2 of the concrete foundation (15 cubic meters).
- Received delivery of structural steel beams.

Safety Observations:
- One minor incident reported: Near miss with a dropped hand tool (no injury).
- All personnel adhered to PPE requirements.

Blockers:
- Awaiting final permit for electrical work, may delay next week's schedule.

Plan for Tomorrow:
- Pour section 3 of the concrete foundation.
- Begin preparations for steel beam erection.
`;
    },
    findGrants: async (keywords: string, location: string): Promise<Grant[]> => {
        await delay(1200);
        return [
            { id: 1, name: 'Green Construction Innovation Fund', agency: 'Innovate UK', amount: '£50,000 - £250,000', description: 'For SMEs developing sustainable building materials and methods.', url: '#' },
            { id: 2, name: 'Heritage Building Restoration Grant', agency: 'National Lottery Heritage Fund', amount: 'Up to £100,000', description: 'Supports the restoration of listed buildings and structures.', url: '#' }
        ];
    },
    analyzeForRisks: async (text: string): Promise<RiskAnalysis> => {
        await delay(1000);
        return {
            summary: "The provided text indicates potential financial risk due to unclear payment terms and compliance risk related to unspecified material standards.",
            identifiedRisks: [
                { severity: 'Medium', description: "Payment terms are 'Net 90' which could impact cash flow.", recommendation: "Negotiate for Net 30 or Net 60 terms, or arrange for milestone payments." },
                { severity: 'Low', description: "Materials are specified as 'high-quality timber' without a specific grade.", recommendation: "Request clarification on the exact material grade (e.g., C16, C24) to ensure compliance and accurate costing." }
            ]
        };
    },
    generateBidPackage: async (tenderUrl: string, strengths: string): Promise<BidPackage> => {
        await delay(1800);
        return {
            coverLetter: `Dear Sir/Madam,\n\nPlease find enclosed our bid for the project referenced. With over 15 years of experience and a specialization in ${strengths || 'high-quality construction'}, we are confident in our ability to deliver this project on time and within budget.\n\nSincerely,\n[Your Company]`,
            checklist: ["Completed Bid Form", "Proof of Insurance", "Project Timeline Proposal", "Safety Record Documentation"],
            summary: "This bid proposes a comprehensive solution for the construction project, leveraging our key strengths to ensure a successful outcome. The timeline is projected for 18 months with a focus on safety and quality."
        };
    },
    
    // Principal Admin
    getSystemHealth: async (adminId: number): Promise<SystemHealth> => {
        await delay(300);
        return { uptime: '99.98%', apiHealth: { status: 'Operational', errorRate: 0.2, throughput: 1200 }, databaseHealth: { status: 'Operational', latency: 45 }, storageHealth: { status: 'Operational', capacityUsed: '72%' }};
    },
    getAllCompaniesForAdmin: async (adminId: number): Promise<Company[]> => {
        await delay(300);
        return deepCopy(data.companies);
    },
    getUsageMetrics: async (adminId: number): Promise<UsageMetric[]> => {
        await delay(400);
        return data.companies.map(c => ({ companyId: c.id, apiCalls: Math.floor(Math.random() * 50000), storageUsedGB: parseFloat(c.storageUsageGB.toFixed(2)), activeUsers: data.users.filter(u => u.companyId === c.id).length }));
    },
    getPlatformStats: async (adminId: number): Promise<any> => {
        await delay(100);
        return { totalCompanies: data.companies.length, totalUsers: data.users.length, activeProjects: data.projects.filter(p => p.status === 'Active').length };
    },
    getPlatformSettings: async (adminId: number): Promise<PlatformSettings> => {
        await delay(100);
        return deepCopy(data.platformSettings);
    },
    updatePlatformSettings: async (settings: PlatformSettings, adminId: number): Promise<PlatformSettings> => {
        await delay(300);
        data.platformSettings = settings;
        return deepCopy(data.platformSettings);
    },
    getPendingApprovalsForPlatform: async (adminId: number): Promise<PendingApproval[]> => {
        await delay(200);
        return []; // Mock empty for now
    },
    getPlatformAuditLogs: async (adminId: number): Promise<AuditLog[]> => {
        await delay(300);
        return deepCopy(data.auditLogs);
    },
    getPlatformAnnouncements: async (adminId: number): Promise<Announcement[]> => {
        await delay(200);
        return deepCopy(data.announcements.filter(a => a.scope === 'platform'));
    },
    sendAnnouncement: async (announcement: Omit<Announcement, 'id' | 'createdAt'>, adminId: number): Promise<Announcement> => {
        await delay(300);
        const newAnn: Announcement = { ...announcement, id: Date.now(), createdAt: new Date() };
        data.announcements.push(newAnn);
        return deepCopy(newAnn);
    },
    inviteCompany: async (companyName: string, adminEmail: string, adminId: number): Promise<void> => {
        await delay(500);
        console.log(`Sending invite to ${adminEmail} for company ${companyName}`);
    },
    updateCompanyStatus: async (companyId: number, status: Company['status'], adminId: number): Promise<void> => {
        await delay(300);
        const company = data.companies.find(c => c.id === companyId);
        if (company) company.status = status;
    },
    
    // Templates
    getProjectTemplates: async (companyId: number): Promise<ProjectTemplate[]> => {
        await delay(200);
        return deepCopy(data.projectTemplates.filter(t => t.companyId === companyId));
    },
    saveProjectTemplate: async (templateData: Omit<ProjectTemplate, 'id'> | ProjectTemplate, actorId: number): Promise<ProjectTemplate> => {
        await delay(300);
        if ('id' in templateData) {
            const index = data.projectTemplates.findIndex(t => t.id === templateData.id);
            if (index > -1) {
                data.projectTemplates[index] = templateData;
                return deepCopy(templateData);
            }
        }
        const newTemplate: ProjectTemplate = { ...templateData, id: Date.now() };
        data.projectTemplates.push(newTemplate);
        return deepCopy(newTemplate);
    },
    deleteProjectTemplate: async (templateId: number, actorId: number): Promise<void> => {
        await delay(200);
        data.projectTemplates = data.projectTemplates.filter(t => t.id !== templateId);
    }
};
