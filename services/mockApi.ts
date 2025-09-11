
import * as mockData from './mockData';
import {
  User, Company, Project, Todo, Timesheet, Document, SafetyIncident,
  FinancialKPIs, Invoice, Quote, Client, Equipment, ResourceAssignment,
  ProjectAssignment, Announcement, Conversation, ChatMessage,
  ProjectTemplate, PlatformSettings, PendingApproval, AuditLog, UsageMetric, SystemHealth, CompanySettings,
  Role, TodoStatus, TodoPriority, WorkType, TimesheetStatus, DocumentCategory,
  DocumentStatus, IncidentSeverity, IncidentType, IncidentStatus as SafetyIncidentStatus, EquipmentStatus,
  InvoiceStatus, QuoteStatus, ProjectRole, Tool, ToolStatus, MonthlyFinancials, CostBreakdown, DocumentAcknowledgement, ProjectPhoto, OperativeReport, Grant, RiskAnalysis, BidPackage, Comment, AISearchResult, View, InvoiceLineItem
} from '../types';
import { GenerateContentResponse, Part } from "@google/genai";


// Utility to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Let's make the data mutable for our mock API
let users = [...mockData.users];
let companies = [...mockData.companies];
let projects = [...mockData.projects];
let todos = [...mockData.todos];
let timesheets = [...mockData.timesheets];
let documents = [...mockData.documents];
let safetyIncidents = [...mockData.safetyIncidents];
let clients = [...mockData.clients];
let invoices = [...mockData.invoices];
let quotes = [...mockData.quotes];
let equipment = [...mockData.equipment];
let resourceAssignments = [...mockData.resourceAssignments];
let projectAssignments = [...mockData.projectAssignments];
let announcements = [...mockData.announcements];
let conversations = [...mockData.conversations];
let projectTemplates = [...mockData.projectTemplates];
let platformSettings = { ...mockData.platformSettings };
let pendingApprovals = [...mockData.pendingApprovals];
let auditLogs = [...mockData.auditLogs];
const usageMetrics = [...mockData.usageMetrics];
const systemHealth = { ...mockData.systemHealth };
let companySettings = [...mockData.companySettings];
const tools = [...mockData.tools];
const monthlyFinancials = [...mockData.monthlyFinancials];
const costBreakdown = [...mockData.costBreakdown];
let documentAcks = [...mockData.documentAcks];
const projectPhotos = [...mockData.projectPhotos];
let operativeReports = [...mockData.operativeReports];


const logAudit = (actorId: number, action: string, target?: { id: number | string; type: string; name: string }, projectId?: number) => {
    const log: AuditLog = {
        id: Date.now(),
        timestamp: new Date(),
        actorId,
        action,
        target,
        projectId,
    };
    auditLogs.unshift(log);
};

// A simple mock for Gemini API responses
const mockGeminiResponse = (text: string): GenerateContentResponse => ({
    text: text,
    candidates: [{
        content: {
            parts: [{ text }],
            role: 'model'
        },
        finishReason: 'STOP',
        index: 0,
        safetyRatings: [],
    }],
});

const mockGeminiImageResponse = (text: string, base64Image: string, mimeType: string): GenerateContentResponse => ({
    text: text,
    candidates: [{
        content: {
            parts: [
                { text: text },
                { inlineData: { data: base64Image, mimeType: mimeType } }
            ],
            role: 'model'
        },
        finishReason: 'STOP',
        index: 0,
        safetyRatings: [],
    }]
});


export const api = {
    // --- Companies & Users ---
    getCompanies: async (): Promise<Company[]> => {
        await delay(200);
        return companies.filter(c => c.status !== 'Archived');
    },
    getUsersByCompany: async (companyId?: number): Promise<User[]> => {
        await delay(200);
        if (companyId === undefined) return users;
        return users.filter(u => u.companyId === companyId);
    },
    // --- Projects ---
    getProjectsByCompany: async (companyId: number): Promise<Project[]> => {
        await delay(300);
        return projects.filter(p => p.companyId === companyId);
    },
    getProjectsByUser: async (userId: number): Promise<Project[]> => {
        await delay(300);
        const userProjectIds = new Set(projectAssignments.filter(pa => pa.userId === userId).map(pa => pa.projectId));
        return projects.filter(p => userProjectIds.has(p.id));
    },
    getProjectsByManager: async (userId: number): Promise<Project[]> => {
        await delay(300);
        const managedProjectIds = new Set(projectAssignments.filter(pa => pa.userId === userId && pa.projectRole === ProjectRole.MANAGER).map(pa => pa.projectId));
        return projects.filter(p => managedProjectIds.has(p.id));
    },
    createProject: async (projectData: Omit<Project, 'id' | 'companyId' | 'actualCost' | 'status'>, templateId: number | null, actorId: number): Promise<Project> => {
        await delay(1000);
        const user = users.find(u => u.id === actorId);
        if (!user || !user.companyId) throw new Error("User not found or not associated with a company.");

        const newProject: Project = {
            ...projectData,
            id: Date.now(),
            companyId: user.companyId,
            actualCost: 0,
            status: 'Active',
        };
        projects.push(newProject);
        
        // Add creator as project manager
        projectAssignments.push({ id: Date.now(), userId: actorId, projectId: newProject.id, projectRole: ProjectRole.MANAGER });
        
        // If template is used, create tasks from it
        if (templateId) {
            const template = projectTemplates.find(t => t.id === templateId);
            if (template) {
                template.templateTasks.forEach(tt => {
                    const newTodo: Todo = {
                        id: Date.now() + Math.random(),
                        text: tt.text,
                        projectId: newProject.id,
                        creatorId: actorId,
                        status: TodoStatus.TODO,
                        priority: tt.priority,
                        createdAt: new Date(),
                    };
                    todos.push(newTodo);
                });
            }
        }
        
        logAudit(actorId, 'Created Project', { id: newProject.id, type: 'Project', name: newProject.name });
        return newProject;
    },
    // --- Tasks (Todos) ---
    getTodosByProject: async (projectId: number): Promise<Todo[]> => {
        await delay(400);
        return todos.filter(t => t.projectId === projectId);
    },
    getTodosByProjectIds: async (projectIds: number[]): Promise<Todo[]> => {
        await delay(500);
        const idSet = new Set(projectIds);
        return todos.filter(t => idSet.has(t.projectId));
    },
    addTodo: async (taskData: Omit<Todo, 'id' | 'createdAt'>, actorId: number): Promise<Todo> => {
        await delay(500);
        const newTodo: Todo = {
            ...taskData,
            id: Date.now(),
            createdAt: new Date(),
        };
        todos.unshift(newTodo);
        logAudit(actorId, 'Created Task', { id: newTodo.id, type: 'Task', name: newTodo.text }, newTodo.projectId);
        return newTodo;
    },
    updateTodo: async (todoId: number | string, updates: Partial<Todo>, actorId: number): Promise<Todo> => {
        await delay(300);
        const todoIndex = todos.findIndex(t => t.id === todoId);
        if (todoIndex === -1) throw new Error("Todo not found");
        
        // If status is changed to Done, add completedAt timestamp
        if (updates.status === TodoStatus.DONE && todos[todoIndex].status !== TodoStatus.DONE) {
            updates.completedAt = new Date();
        }

        todos[todoIndex] = { ...todos[todoIndex], ...updates };
        logAudit(actorId, `Updated Task: ${Object.keys(updates).join(', ')}`, { id: todoId, type: 'Task', name: todos[todoIndex].text }, todos[todoIndex].projectId);
        return todos[todoIndex];
    },
    updateTodoReminder: async (todoId: number, reminderDate: Date | undefined, actorId: number): Promise<Todo> => {
        await delay(300);
        return await api.updateTodo(todoId, { reminderAt: reminderDate }, actorId);
    },
    addComment: async (todoId: number | string, text: string, creatorId: number): Promise<Comment> => {
        await delay(400);
        const todo = todos.find(t => t.id === todoId);
        if (!todo) throw new Error("Todo not found");

        const newComment: Comment = {
            id: Date.now(),
            creatorId,
            text,
            createdAt: new Date(),
        };
        if (!todo.comments) todo.comments = [];
        todo.comments.push(newComment);
        logAudit(creatorId, 'Added Comment to Task', { id: todo.id, type: 'Task', name: todo.text }, todo.projectId);
        return newComment;
    },
    // --- Timesheets ---
    getTimesheetsByUser: async (userId: number): Promise<Timesheet[]> => {
        await delay(300);
        return timesheets.filter(ts => ts.userId === userId).sort((a,b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
    },
    getTimesheetsByCompany: async (companyId: number, actorId: number): Promise<Timesheet[]> => {
        await delay(500);
        const companyUserIds = new Set(users.filter(u => u.companyId === companyId).map(u => u.id));
        return timesheets.filter(ts => companyUserIds.has(ts.userId));
    },
    getTimesheetsForManager: async (managerId: number): Promise<Timesheet[]> => {
        await delay(500);
        const managedProjectIds = new Set(projectAssignments.filter(pa => pa.userId === managerId && pa.projectRole === ProjectRole.MANAGER).map(pa => pa.projectId));
        return timesheets.filter(ts => managedProjectIds.has(ts.projectId));
    },
    getUnbilledTimesheets: async (companyId: number): Promise<Timesheet[]> => {
        await delay(400);
        // This is a mock. In reality, you'd have a flag on the timesheet.
        // For now, let's just return some recent approved timesheets.
        return timesheets.filter(ts => ts.status === TimesheetStatus.APPROVED).slice(0, 5);
    },
    clockIn: async (userId: number, projectId: number, location: Location, workType: WorkType, photoFile?: File): Promise<Timesheet> => {
        await delay(800);
        if (timesheets.some(ts => ts.userId === userId && ts.clockOut === null)) {
            throw new Error("You are already clocked in.");
        }
        const newTimesheet: Timesheet = {
            id: Date.now(),
            userId,
            projectId,
            clockIn: new Date(),
            clockOut: null,
            breaks: [],
            workType,
            status: TimesheetStatus.PENDING,
            clockInLocation: location,
            checkInPhotoUrl: photoFile ? URL.createObjectURL(photoFile) : undefined,
        };
        timesheets.push(newTimesheet);
        logAudit(userId, 'Clocked In', { id: newTimesheet.id, type: 'Timesheet', name: `Timesheet #${newTimesheet.id}`}, projectId);
        return newTimesheet;
    },
    clockOut: async (timesheetId: number, location: Location, photoFile?: File): Promise<Timesheet> => {
        await delay(800);
        const tsIndex = timesheets.findIndex(ts => ts.id === timesheetId);
        if (tsIndex === -1) throw new Error("Timesheet not found.");
        timesheets[tsIndex] = {
            ...timesheets[tsIndex],
            clockOut: new Date(),
            clockOutLocation: location,
            // checkOutPhotoUrl would be handled here
        };
        logAudit(timesheets[tsIndex].userId, 'Clocked Out', { id: timesheetId, type: 'Timesheet', name: `Timesheet #${timesheetId}`}, timesheets[tsIndex].projectId);
        return timesheets[tsIndex];
    },
    startBreak: async (timesheetId: number, actorId: number): Promise<Timesheet> => {
        await delay(300);
        const ts = timesheets.find(t => t.id === timesheetId);
        if (!ts) throw new Error('Timesheet not found');
        ts.breaks.push({ startTime: new Date(), endTime: null });
        return ts;
    },
    endBreak: async (timesheetId: number, actorId: number): Promise<Timesheet> => {
        await delay(300);
        const ts = timesheets.find(t => t.id === timesheetId);
        if (!ts) throw new Error('Timesheet not found');
        const activeBreak = ts.breaks.find(b => b.endTime === null);
        if (activeBreak) activeBreak.endTime = new Date();
        return ts;
    },
    updateTimesheetStatus: async (id: number, status: TimesheetStatus, reason: string | undefined, actorId: number): Promise<Timesheet> => {
        await delay(500);
        const ts = timesheets.find(t => t.id === id);
        if (!ts) throw new Error("Timesheet not found");
        ts.status = status;
        if (status === TimesheetStatus.REJECTED) {
            ts.rejectionReason = reason;
        }
        logAudit(actorId, `Set Timesheet Status to ${status}`, { id, type: 'Timesheet', name: `Timesheet #${id}`}, ts.projectId);
        return ts;
    },
     updateTimesheet: async (id: number, updates: Partial<Timesheet>, actorId: number): Promise<Timesheet> => {
        await delay(600);
        const tsIndex = timesheets.findIndex(t => t.id === id);
        if (tsIndex === -1) throw new Error("Timesheet not found");
        timesheets[tsIndex] = { ...timesheets[tsIndex], ...updates };
        logAudit(actorId, 'Edited Timesheet', { id, type: 'Timesheet', name: `Timesheet #${id}`}, timesheets[tsIndex].projectId);
        return timesheets[tsIndex];
    },
    // --- Documents ---
    getDocumentsByCompany: async (companyId: number): Promise<Document[]> => {
        await delay(400);
        const companyProjectIds = new Set(projects.filter(p => p.companyId === companyId).map(p => p.id));
        return documents.filter(d => companyProjectIds.has(d.projectId));
    },
    getDocumentsByProjectIds: async (projectIds: number[]): Promise<Document[]> => {
        await delay(500);
        const idSet = new Set(projectIds);
        return documents.filter(d => idSet.has(d.projectId));
    },
    getDocumentAcksForUser: async (userId: number): Promise<DocumentAcknowledgement[]> => {
        await delay(200);
        return documentAcks.filter(ack => ack.userId === userId);
    },
    acknowledgeDocument: async (userId: number, documentId: number): Promise<DocumentAcknowledgement> => {
        await delay(300);
        const newAck: DocumentAcknowledgement = {
            id: Date.now(),
            userId,
            documentId,
            timestamp: new Date(),
        };
        documentAcks.push(newAck);
        const doc = documents.find(d => d.id === documentId);
        if (doc) {
            logAudit(userId, 'Acknowledged Document', {id: documentId, type: 'Document', name: doc.name}, doc.projectId);
        }
        return newAck;
    },
    initiateDocumentUpload: async (docData: Omit<Document, 'id' | 'status' | 'uploadedAt' | 'version' | 'url'>): Promise<Document> => {
        await delay(200);
        const newDoc: Document = {
            ...docData,
            id: Date.now(),
            status: DocumentStatus.UPLOADING,
            uploadedAt: new Date(),
            version: 1,
            url: ''
        };
        // Don't add to main list yet, wait for finalize
        return newDoc;
    },
    performChunkedUpload: async (docId: number, fileSize: number, onProgress: (progress: number) => void): Promise<void> => {
        let uploaded = 0;
        const totalChunks = 5;
        for (let i = 0; i < totalChunks; i++) {
            await delay(300); // Simulate chunk upload
            uploaded += fileSize / totalChunks;
            onProgress((uploaded / fileSize) * 100);
        }
    },
    finalizeDocumentUpload: async (docId: number, actorId: number): Promise<Document> => {
        await delay(500);
        // In a real API, this would come from the initiated data.
        // Here we just mock it.
        const docStub = {
             id: docId,
             name: 'Uploaded File.pdf',
             projectId: projects[0].id,
             category: DocumentCategory.GENERAL,
             uploadedAt: new Date(),
             version: 1,
             creatorId: actorId
        };
        const finalDoc: Document = {
            ...docStub,
            status: DocumentStatus.APPROVED,
            url: '/sample.pdf',
        };
        documents.unshift(finalDoc);
        logAudit(actorId, 'Uploaded Document', {id: docId, type: 'Document', name: finalDoc.name}, finalDoc.projectId);
        return finalDoc;
    },
    uploadOfflineDocument: async (docData: any, fileData: any, actorId: number): Promise<void> => {
        await delay(1500); // Simulate a longer upload
        const finalDoc: Document = {
            id: Date.now(),
            name: docData.name,
            projectId: docData.projectId,
            category: docData.category,
            creatorId: actorId,
            status: DocumentStatus.APPROVED,
            uploadedAt: new Date(),
            version: 1,
            url: '/sample.pdf', // Mock URL
        };
        documents.unshift(finalDoc);
        logAudit(actorId, 'Uploaded Offline Document', {id: finalDoc.id, type: 'Document', name: finalDoc.name}, finalDoc.projectId);
    },
    // --- Safety ---
    getSafetyIncidentsByCompany: async (companyId: number): Promise<SafetyIncident[]> => {
        await delay(400);
        const companyProjectIds = new Set(projects.filter(p => p.companyId === companyId).map(p => p.id));
        return safetyIncidents.filter(i => companyProjectIds.has(i.projectId));
    },
    getIncidentsByProject: async (projectId: number): Promise<SafetyIncident[]> => {
        await delay(300);
        return safetyIncidents.filter(i => i.projectId === projectId);
    },
    reportSafetyIncident: async (report: Omit<SafetyIncident, 'id'>, actorId: number): Promise<SafetyIncident> => {
        await delay(700);
        const newIncident: SafetyIncident = {
            ...report,
            id: Date.now(),
        };
        safetyIncidents.unshift(newIncident);
        logAudit(actorId, 'Reported Safety Incident', {id: newIncident.id, type: 'SafetyIncident', name: newIncident.type}, newIncident.projectId);
        return newIncident;
    },
    submitOperativeReport: async (reportData: { projectId: number; userId: number; notes: string; photoFile?: File }): Promise<OperativeReport> => {
        await delay(800);
        const newReport: OperativeReport = {
            id: Date.now(),
            projectId: reportData.projectId,
            userId: reportData.userId,
            notes: reportData.notes,
            timestamp: new Date(),
            photoUrl: reportData.photoFile ? URL.createObjectURL(reportData.photoFile) : undefined
        };
        operativeReports.push(newReport);
        logAudit(reportData.userId, 'Submitted Operative Report', {id: newReport.id, type: 'OperativeReport', name: `Report for project ${reportData.projectId}`}, reportData.projectId);
        return newReport;
    },
    getOperativeReportsByProject: async (projectId: number): Promise<OperativeReport[]> => {
        await delay(300);
        return operativeReports.filter(r => r.projectId === projectId);
    },
    getPhotosForProject: async (projectId: number): Promise<ProjectPhoto[]> => {
        await delay(300);
        return projectPhotos.filter(p => p.projectId === projectId);
    },
    // --- Financials ---
    getClientsByCompany: async (companyId: number): Promise<Client[]> => {
        await delay(300);
        return clients.filter(c => c.companyId === companyId);
    },
    getInvoicesByCompany: async (companyId: number): Promise<Invoice[]> => {
        await delay(400);
        return invoices.filter(i => i.companyId === companyId);
    },
    getQuotesByCompany: async (companyId: number): Promise<Quote[]> => {
        await delay(400);
        return quotes.filter(q => q.companyId === companyId);
    },
    getFinancialKPIsForCompany: async (companyId: number): Promise<FinancialKPIs> => {
        await delay(600);
        return {
            profitability: 22.5,
            projectMargin: 18.2,
            cashFlow: 125000,
            currency: 'GBP'
        };
    },
     getMonthlyFinancials: async (companyId: number): Promise<MonthlyFinancials[]> => {
        await delay(500);
        return monthlyFinancials;
    },
    getCostBreakdown: async (companyId: number): Promise<CostBreakdown[]> => {
        await delay(500);
        return costBreakdown;
    },
    createInvoice: async (invoiceData: Omit<Invoice, 'id' | 'issuedAt' | 'amountDue'>, billedTimesheetIds: number[], actorId: number): Promise<Invoice> => {
        await delay(1000);
        const newInvoice: Invoice = {
            ...invoiceData,
            id: Date.now(),
            issuedAt: new Date(),
            amountDue: invoiceData.total,
        };
        invoices.push(newInvoice);
        // Here you would mark timesheets as billed
        logAudit(actorId, 'Created Invoice', {id: newInvoice.id, type: 'Invoice', name: `Invoice #${newInvoice.id}`}, newInvoice.projectId);
        return newInvoice;
    },
    // --- Equipment ---
    getEquipmentByCompany: async (companyId: number): Promise<Equipment[]> => {
        await delay(300);
        return equipment.filter(e => e.companyId === companyId);
    },
    assignEquipmentToProject: async (equipmentId: number, projectId: number, actorId: number): Promise<Equipment> => {
        await delay(500);
        const item = equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        item.projectId = projectId;
        item.status = EquipmentStatus.IN_USE;
        logAudit(actorId, `Assigned Equipment to Project`, {id: equipmentId, type: 'Equipment', name: item.name}, projectId);
        return item;
    },
    unassignEquipmentFromProject: async (equipmentId: number, actorId: number): Promise<Equipment> => {
        await delay(500);
        const item = equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        const projectId = item.projectId;
        item.projectId = undefined;
        item.status = EquipmentStatus.AVAILABLE;
        logAudit(actorId, `Unassigned Equipment from Project`, {id: equipmentId, type: 'Equipment', name: item.name}, projectId);
        return item;
    },
    updateEquipmentStatus: async (equipmentId: number, status: EquipmentStatus, actorId: number): Promise<Equipment> => {
        await delay(400);
        const item = equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        item.status = status;
        if(status === EquipmentStatus.AVAILABLE) item.projectId = undefined;
        logAudit(actorId, `Updated Equipment Status to ${status}`, {id: equipmentId, type: 'Equipment', name: item.name}, item.projectId);
        return item;
    },
    getResourceAssignments: async (companyId: number): Promise<ResourceAssignment[]> => {
        await delay(300);
        return resourceAssignments.filter(ra => ra.companyId === companyId);
    },
    createResourceAssignment: async (assignmentData: Omit<ResourceAssignment, 'id'>, actorId: number): Promise<ResourceAssignment> => {
        await delay(500);
        const newAssignment: ResourceAssignment = { ...assignmentData, id: Date.now() };
        resourceAssignments.push(newAssignment);
        logAudit(actorId, `Created Resource Assignment`, {id: newAssignment.id, type: 'Assignment', name: `Assignment #${newAssignment.id}`}, newAssignment.projectId);
        return newAssignment;
    },
    deleteResourceAssignment: async (assignmentId: number, actorId: number): Promise<void> => {
        await delay(500);
        resourceAssignments = resourceAssignments.filter(ra => ra.id !== assignmentId);
        logAudit(actorId, `Deleted Resource Assignment`, {id: assignmentId, type: 'Assignment', name: `Assignment #${assignmentId}`});
    },
    // --- Team & Assignments ---
    getProjectAssignmentsByCompany: async (companyId: number): Promise<ProjectAssignment[]> => {
        await delay(200);
        const companyProjectIds = new Set(projects.filter(p => p.companyId === companyId).map(p => p.id));
        return projectAssignments.filter(pa => companyProjectIds.has(pa.projectId));
    },
    // --- Communication ---
    getAnnouncementsForCompany: async (companyId: number): Promise<Announcement[]> => {
        await delay(300);
        return announcements.filter(a => a.scope === 'company' && a.companyId === companyId || a.scope === 'platform');
    },
    sendAnnouncement: async (announcement: Omit<Announcement, 'id' | 'createdAt'>, actorId: number): Promise<Announcement> => {
        await delay(600);
        const newAnnouncement: Announcement = { ...announcement, id: Date.now(), createdAt: new Date() };
        announcements.unshift(newAnnouncement);
        logAudit(actorId, 'Sent Announcement', { id: newAnnouncement.id, type: 'Announcement', name: newAnnouncement.title });
        return newAnnouncement;
    },
    getConversationsForUser: async (userId: number): Promise<Conversation[]> => {
        await delay(400);
        return conversations.filter(c => c.participants.includes(userId));
    },
    getMessagesForConversation: async (conversationId: number, userId: number): Promise<ChatMessage[]> => {
        await delay(200);
        const convo = conversations.find(c => c.id === conversationId);
        if (!convo) return [];
        
        // Mark messages as read
        if (convo.lastMessage && convo.lastMessage.senderId !== userId) {
            convo.lastMessage.isRead = true;
        }
        convo.messages.forEach(msg => {
            if(msg.senderId !== userId) msg.isRead = true;
        })

        return convo.messages;
    },
    sendMessage: async (senderId: number, recipientId: number, content: string): Promise<{ message: ChatMessage, conversation: Conversation }> => {
        await delay(500);
        let convo = conversations.find(c => c.participants.includes(senderId) && c.participants.includes(recipientId));
        
        if (!convo) {
            convo = { id: Date.now(), participants: [senderId, recipientId], messages: [], lastMessage: null };
            conversations.push(convo);
        }

        const newMessage: ChatMessage = {
            id: Date.now(),
            conversationId: convo.id,
            senderId,
            content,
            timestamp: new Date(),
            isRead: false,
        };

        convo.messages.push(newMessage);
        convo.lastMessage = newMessage;
        return { message: newMessage, conversation: convo };
    },
    // --- Templates ---
    getProjectTemplates: async (companyId: number): Promise<ProjectTemplate[]> => {
        await delay(400);
        return projectTemplates.filter(t => t.companyId === companyId);
    },
    saveProjectTemplate: async (templateData: Omit<ProjectTemplate, 'id'> | ProjectTemplate, actorId: number): Promise<ProjectTemplate> => {
        await delay(800);
        if ('id' in templateData) { // Update
            const index = projectTemplates.findIndex(t => t.id === templateData.id);
            if (index > -1) {
                projectTemplates[index] = templateData;
                logAudit(actorId, 'Updated Project Template', { id: templateData.id, type: 'Template', name: templateData.name });
                return templateData;
            }
        }
        // Create
        const newTemplate: ProjectTemplate = { ...(templateData as Omit<ProjectTemplate, 'id'>), id: Date.now() };
        projectTemplates.push(newTemplate);
        logAudit(actorId, 'Created Project Template', { id: newTemplate.id, type: 'Template', name: newTemplate.name });
        return newTemplate;
    },
    deleteProjectTemplate: async (templateId: number, actorId: number): Promise<void> => {
        await delay(500);
        const template = projectTemplates.find(t => t.id === templateId);
        projectTemplates = projectTemplates.filter(t => t.id !== templateId);
        if (template) {
            logAudit(actorId, 'Deleted Project Template', { id: template.id, type: 'Template', name: template.name });
        }
    },
    // --- AI & Tools ---
    getTools: async (userId: number): Promise<Tool[]> => {
        await delay(100);
        return tools;
    },
    searchAcrossDocuments: async (query: string, projectIds: number[], userId: number): Promise<AISearchResult> => {
        await delay(2000);
        const relevantDocs = documents.filter(d => projectIds.includes(d.projectId));
        if (relevantDocs.length === 0) {
            return { summary: "No relevant documents found to search within.", sources: [] };
        }
        return {
            summary: `Based on documents like "${relevantDocs[0].name}", the specifications for "${query}" require Grade A materials and adherence to safety protocol 2.1.`,
            sources: relevantDocs.slice(0, 2).map(d => ({
                documentId: d.id,
                snippet: `...contains information related to your query about ${query}...`
            }))
        };
    },
    generateSafetyAnalysis: async (incidents: SafetyIncident[], projectId: number, userId: number): Promise<{ report: string }> => {
        await delay(2500);
        const project = projects.find(p => p.id === projectId);
        return { report: `Safety Analysis for ${project?.name}:\n\nA high number of "Near Miss" incidents (${incidents.filter(i => i.type === IncidentType.NEAR_MISS).length}) were reported on the East face scaffolding. \n\nRecommendation: Immediately conduct a scaffolding safety review and hold a mandatory toolbox talk for all operatives working at height.` };
    },
     findGrants: async (keywords: string, location: string): Promise<Grant[]> => {
        await delay(1500);
        return [
            { id: 'g1', name: 'Green Construction Innovation Fund', agency: 'Gov.UK', amount: '£50,000 - £250,000', description: 'Supports SMEs using sustainable materials.', url: '#' },
            { id: 'g2', name: 'Heritage Site Restoration Grant', agency: 'National Trust', amount: 'Up to £100,000', description: 'Funding for restoring historically significant buildings.', url: '#' },
        ];
    },
    analyzeForRisks: async (text: string): Promise<RiskAnalysis> => {
        await delay(1500);
        return {
            summary: "The provided text contains one medium financial risk related to unclear payment terms and one low compliance risk.",
            identifiedRisks: [{
                severity: 'Medium',
                description: "Payment terms state 'Net 30' but do not specify penalties for late payment.",
                recommendation: "Amend terms to include a 1.5% monthly interest charge on overdue invoices."
            }]
        }
    },
    generateBidPackage: async (tenderUrl: string, strengths: string): Promise<BidPackage> => {
        await delay(2000);
        return {
            coverLetter: "Dear Sir/Madam,\n\nPlease find our comprehensive bid for the project. Our expertise in sustainable materials makes us an ideal partner.\n\nSincerely,\nAS Agents",
            checklist: ["Financial statements", "Safety record (HS-01)", "Insurance certificate", "Project timeline"],
            summary: "This bid outlines a cost-effective approach, leveraging our core strengths to deliver the project on time and within budget."
        };
    },
    generateDailySummary: async (projectId: number, date: Date, userId: number): Promise<string> => {
        await delay(1800);
        const project = projects.find(p => p.id === projectId);
        return `--- Daily Summary for ${project?.name} - ${date.toLocaleDateString()} ---\n\nProgress:\n- Completed framing on Floor 5.\n- Received HVAC unit delivery.\n\nIssues:\n- Minor safety observation (trailing cables) reported and resolved.\n\nNext Steps:\n- Begin HVAC installation on Floor 6.\n- Scheduled concrete pour for Wednesday.`
    },
    editImageWithAi: async (base64: string, mimeType: string, prompt: string, projectId: number, userId: number): Promise<{ parts: Part[] }> => {
        await delay(2500);
        // This is a mock. It doesn't actually edit the image. It just returns the original with a text response.
        return {
            parts: [
                { text: `Analysis for prompt "${prompt}": One potential hazard found near the scaffolding. All workers appear to be wearing correct PPE.` },
                { inlineData: { data: base64, mimeType: mimeType } }
            ]
        };
    },
    // --- Settings ---
    getCompanySettings: async (companyId: number): Promise<CompanySettings> => {
        await delay(100);
        return companySettings.find(cs => cs.companyId === companyId) || companySettings[0];
    },
    updateCompanySettings: async (companyId: number, settings: CompanySettings, actorId: number): Promise<CompanySettings> => {
        await delay(500);
        const index = companySettings.findIndex(cs => cs.companyId === companyId);
        if (index > -1) {
            companySettings[index] = settings;
        } else {
            companySettings.push(settings);
        }
        logAudit(actorId, `Updated Company Settings`);
        return settings;
    },
    // --- Principal Admin ---
    getSystemHealth: async (adminId: number): Promise<SystemHealth> => {
        await delay(300);
        return systemHealth;
    },
    getAllCompaniesForAdmin: async (adminId: number): Promise<Company[]> => {
        await delay(300);
        return companies;
    },
    getUsageMetrics: async (adminId: number): Promise<UsageMetric[]> => {
        await delay(400);
        return usageMetrics;
    },
    getPlatformStats: async (adminId: number): Promise<{ totalCompanies: number; totalUsers: number; activeProjects: number }> => {
        await delay(200);
        return {
            totalCompanies: companies.length,
            totalUsers: users.length,
            activeProjects: projects.filter(p => p.status === 'Active').length,
        };
    },
    getPlatformSettings: async (adminId: number): Promise<PlatformSettings> => {
        await delay(100);
        return platformSettings;
    },
    getPendingApprovalsForPlatform: async (adminId: number): Promise<PendingApproval[]> => {
        await delay(300);
        return pendingApprovals;
    },
    getPlatformAuditLogs: async (adminId: number): Promise<AuditLog[]> => {
        await delay(500);
        return auditLogs;
    },
    getPlatformAnnouncements: async (adminId: number): Promise<Announcement[]> => {
        await delay(200);
        return announcements;
    },
    updateCompanyStatus: async (companyId: number, status: Company['status'], actorId: number): Promise<Company> => {
        await delay(500);
        const company = companies.find(c => c.id === companyId);
        if (!company) throw new Error("Company not found");
        company.status = status;
        logAudit(actorId, `Updated Company Status to ${status}`, { id: companyId, type: 'Company', name: company.name });
        return company;
    },
    updatePlatformSettings: async (settings: PlatformSettings, actorId: number): Promise<PlatformSettings> => {
        await delay(600);
        platformSettings = settings;
        logAudit(actorId, 'Updated Platform Settings');
        return platformSettings;
    },
    inviteCompany: async (companyName: string, adminEmail: string, actorId: number): Promise<void> => {
        await delay(1000);
        logAudit(actorId, 'Invited New Company', { id: companyName, type: 'Company', name: companyName });
    },
    // --- Misc ---
    getWeatherForecast: async (lat: number, lng: number): Promise<{ condition: string; temperature: number; icon: string }> => {
        await delay(700);
        // Simple mock based on UK-ish locations
        if (lat > 53) return { condition: 'Cloudy', temperature: 14, icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' };
        return { condition: 'Sunny', temperature: 18, icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' };
    }
};
