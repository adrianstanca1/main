// This file mocks a backend API for the application.
// In a real-world scenario, this would be replaced with actual HTTP requests to a server.

// FIX: Added InvoiceStatus to the import list to resolve a type error.
import {
  User, Company, Project, Todo, Timesheet, SafetyIncident, Document,
  Role, Permission, View, TimesheetStatus, TodoStatus, TodoPriority,
  IncidentStatus, ProjectAssignment, ProjectRole,
  SystemHealth, UsageMetric, PlatformSettings, PendingApproval, AuditLog, Announcement,
  Client, Invoice, Quote, Equipment, ResourceAssignment, CompanySettings, InvoiceStatus,
  ChatMessage, Conversation, DocumentAcknowledgement, OperativeReport, WeatherForecast,
  ProjectPhoto, Grant, RiskAnalysis, BidPackage, AISearchResult,
  DocumentStatus, Comment, WorkType, Location, EquipmentStatus, AuditLogAction, FinancialKPIs, InvoiceLineItem,
  ProjectTemplate
} from '../types';
import { MOCK_DATA, simulateDelay } from './mockData';
import { GoogleGenAI, GenerateContentResponse, Part, Modality } from "@google/genai";

// A simple in-memory representation of the database.
let DB = MOCK_DATA;

const getApiKey = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
    throw new Error("API_KEY environment variable not set. Please add it to your environment.");
  }
  return process.env.API_KEY;
}

let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({apiKey: getApiKey()});
} catch(e) {
  console.error(e);
}

const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    DB.auditLogs.unshift({ ...log, id: DB.auditLogs.length + 1, timestamp: new Date() });
};


export const api = {
  // --- User & Company ---
  getCompanies: async (): Promise<Company[]> => {
    await simulateDelay();
    return DB.companies.filter(c => c.id !== 0);
  },
  getUsersByCompany: async (companyId?: number): Promise<User[]> => {
    await simulateDelay();
    if (companyId === 0 || companyId === undefined) return DB.users.filter(u => u.companyId === 0);
    return DB.users.filter(u => u.companyId === companyId);
  },
  
  // --- Projects ---
  getProjectsByCompany: async (companyId?: number): Promise<Project[]> => {
    await simulateDelay();
    if (!companyId) return [];
    return DB.projects.filter(p => p.companyId === companyId);
  },
  getProjectsByUser: async (userId: number): Promise<Project[]> => {
    await simulateDelay();
    const assignments = DB.projectAssignments.filter(a => a.userId === userId);
    const projectIds = new Set(assignments.map(a => a.projectId));
    return DB.projects.filter(p => projectIds.has(p.id));
  },
  getProjectsByManager: async (managerId: number): Promise<Project[]> => {
    await simulateDelay();
    const assignments = DB.projectAssignments.filter(a => a.userId === managerId && a.projectRole === ProjectRole.PROJECT_MANAGER);
    const projectIds = new Set(assignments.map(a => a.projectId));
    return DB.projects.filter(p => projectIds.has(p.id));
  },
  getUsersByProject: async (projectId: number, companyId: number): Promise<User[]> => {
    await simulateDelay();
    const userIds = new Set(DB.projectAssignments.filter(pa => pa.projectId === projectId).map(pa => pa.userId));
    return DB.users.filter(u => u.companyId === companyId && userIds.has(u.id));
  },
  createProject: async (projectData: Omit<Project, 'id' | 'companyId' | 'actualCost' | 'status'>, templateId: number | null, actorId: number): Promise<Project> => {
    await simulateDelay(600);
    const actor = DB.users.find(u => u.id === actorId);
    if (!actor) throw new Error("Actor not found");

    const newProject: Project = {
        ...projectData,
        id: DB.projects.length + 100,
        companyId: actor.companyId,
        actualCost: 0,
        status: 'Active',
    };
    DB.projects.unshift(newProject);
    
    if (templateId) {
        const template = DB.projectTemplates.find(t => t.id === templateId);
        if (template) {
            template.templateTasks.forEach(taskTemplate => {
                const newTodo: Todo = {
                    id: `new_${DB.todos.length}_${Math.random()}`,
                    projectId: newProject.id,
                    creatorId: actorId,
                    text: taskTemplate.text,
                    status: TodoStatus.TODO,
                    priority: taskTemplate.priority,
                    createdAt: new Date(),
                };
                DB.todos.unshift(newTodo);
            });
        }
    }
    
    addAuditLog({ actorId, action: 'PROJECT_CREATED', target: { type: 'Project', id: newProject.id, name: newProject.name }});
    
    return newProject;
  },


  // --- Todos ---
  getTodosByProject: async (projectId: number): Promise<Todo[]> => {
    await simulateDelay();
    return DB.todos.filter(t => t.projectId === projectId);
  },
  getTodosByProjectIds: async (projectIds: number[]): Promise<Todo[]> => {
    await simulateDelay();
    const idSet = new Set(projectIds);
    return DB.todos.filter(t => idSet.has(t.projectId));
  },
  addTodo: async (todoData: Omit<Todo, 'id' | 'createdAt'>, actorId: number): Promise<Todo> => {
    await simulateDelay(200);
    const newTodo: Todo = {
      ...todoData,
      id: DB.todos.length + 1000,
      createdAt: new Date(),
    };
    DB.todos.unshift(newTodo);
    addAuditLog({ actorId, action: 'TASK_CREATED' as AuditLogAction, target: { type: 'Task', id: newTodo.id, name: newTodo.text }, projectId: newTodo.projectId });
    return newTodo;
  },
  updateTodo: async (todoId: number | string, updates: Partial<Todo>, actorId: number): Promise<Todo> => {
    await simulateDelay(150);
    const index = DB.todos.findIndex(t => t.id === todoId);
    if (index === -1) throw new Error("Todo not found");
    
    const originalTodo = { ...DB.todos[index] };
    const updatedTodo = { ...originalTodo, ...updates };
    DB.todos[index] = updatedTodo;

    // --- Audit Logging ---
    if (updates.status && updates.status !== originalTodo.status) {
        addAuditLog({ actorId, action: 'TASK_UPDATED' as AuditLogAction, target: { type: 'Task', id: updatedTodo.id, name: updatedTodo.text }, projectId: updatedTodo.projectId });
        if (updates.status === TodoStatus.DONE) {
            updatedTodo.completedAt = new Date();
        } else if (originalTodo.status === TodoStatus.DONE) {
            updatedTodo.completedAt = undefined;
        }
    }
    
    if (updates.subTasks) {
        const originalSubtasks = new Map(originalTodo.subTasks?.map(st => [st.id, st.completed]));
        const changedSubtask = updatedTodo.subTasks?.find(st => originalSubtasks.get(st.id) !== st.completed);
        if (changedSubtask) {
             const statusText = changedSubtask.completed ? 'complete' : 'incomplete';
             addAuditLog({ actorId, action: 'TASK_UPDATED' as AuditLogAction, target: { type: 'Task', id: updatedTodo.id, name: `sub-task "${changedSubtask.text}" marked as ${statusText}` }, projectId: updatedTodo.projectId });
        }
    }
    
    if ('dependsOn' in updates) {
        const parentTask = DB.todos.find(t => t.id === updates.dependsOn);
        const actionText = parentTask
            ? `set dependency to "${parentTask.text}"`
            : `cleared dependency`;
        addAuditLog({ actorId, action: 'TASK_UPDATED' as AuditLogAction, target: { type: 'Task', id: updatedTodo.id, name: `${updatedTodo.text} (${actionText})` }, projectId: updatedTodo.projectId });
    }
    
    return updatedTodo;
  },

  // --- Timesheets ---
  getTimesheetsByCompany: async (companyId: number, actorId: number): Promise<Timesheet[]> => {
    await simulateDelay();
    const companyUsers = new Set(DB.users.filter(u => u.companyId === companyId).map(u => u.id));
    return DB.timesheets.filter(t => companyUsers.has(t.userId));
  },
  getTimesheetsByUser: async (userId: number): Promise<Timesheet[]> => {
    await simulateDelay();
    return DB.timesheets.filter(t => t.userId === userId);
  },
  getTimesheetsForManager: async (managerId: number): Promise<Timesheet[]> => {
    await simulateDelay();
    const managedProjectIds = new Set(DB.projectAssignments.filter(a => a.userId === managerId).map(a => a.projectId));
    return DB.timesheets.filter(t => managedProjectIds.has(t.projectId));
  },
  updateTimesheetStatus: async (timesheetId: number, status: TimesheetStatus, reason: string | undefined, actorId: number): Promise<Timesheet> => {
      await simulateDelay(300);
      const ts = DB.timesheets.find(t => t.id === timesheetId);
      if (!ts) throw new Error("Timesheet not found");
      ts.status = status;
      if (status === TimesheetStatus.REJECTED) {
          ts.comment = reason;
      }
      return ts;
  },
  clockIn: async (userId: number, projectId: number, location: Location, workType: WorkType, photo?: File): Promise<Timesheet> => {
      await simulateDelay(500);
      if (DB.timesheets.some(t => t.userId === userId && t.clockOut === null)) {
          throw new Error("User is already clocked in.");
      }
      const newTimesheet: Timesheet = {
        id: DB.timesheets.length + 1,
        userId,
        projectId,
        clockIn: new Date(),
        clockOut: null,
        clockInLocation: location,
        clockOutLocation: null,
        workType,
        status: TimesheetStatus.PENDING,
        checkInPhotoUrl: photo ? URL.createObjectURL(photo) : undefined,
        breaks: [],
        trustScore: 0.95, // mock score
      };
      DB.timesheets.unshift(newTimesheet);
      return newTimesheet;
  },
  clockOut: async (timesheetId: number, location: Location, photo?: File): Promise<Timesheet> => {
      await simulateDelay(500);
      const ts = DB.timesheets.find(t => t.id === timesheetId);
      if (!ts) throw new Error("Timesheet not found");
      ts.clockOut = new Date();
      ts.clockOutLocation = location;
      ts.checkOutPhotoUrl = photo ? URL.createObjectURL(photo) : undefined;
      return ts;
  },
   startBreak: async (timesheetId: number, userId: number): Promise<Timesheet> => {
    await simulateDelay();
    const ts = DB.timesheets.find(t => t.id === timesheetId);
    if (!ts) throw new Error("Timesheet not found");
    ts.breaks.push({ startTime: new Date(), endTime: null });
    return ts;
  },
  endBreak: async (timesheetId: number, userId: number): Promise<Timesheet> => {
    await simulateDelay();
    const ts = DB.timesheets.find(t => t.id === timesheetId);
    if (!ts) throw new Error("Timesheet not found");
    const activeBreak = ts.breaks.find(b => b.endTime === null);
    if (activeBreak) activeBreak.endTime = new Date();
    return ts;
  },

  // --- Safety ---
  getSafetyIncidentsByCompany: async (companyId: number): Promise<SafetyIncident[]> => {
      await simulateDelay();
      const companyProjects = new Set(DB.projects.filter(p => p.companyId === companyId).map(p => p.id));
      return DB.safetyIncidents.filter(i => companyProjects.has(i.projectId));
  },
  reportSafetyIncident: async (incidentData: Omit<SafetyIncident, 'id'>, actorId: number): Promise<SafetyIncident> => {
      await simulateDelay(400);
      const newIncident: SafetyIncident = { ...incidentData, id: DB.safetyIncidents.length + 1 };
      DB.safetyIncidents.unshift(newIncident);
      return newIncident;
  },
  getIncidentsByProject: async(projectId: number): Promise<SafetyIncident[]> => {
      await simulateDelay();
      return DB.safetyIncidents.filter(i => i.projectId === projectId);
  },

  // --- Documents ---
  getDocumentsByCompany: async (companyId?: number): Promise<Document[]> => {
    await simulateDelay();
    if(!companyId) return [];
    const companyProjects = new Set(DB.projects.filter(p => p.companyId === companyId).map(p => p.id));
    return DB.documents.filter(d => companyProjects.has(d.projectId));
  },
  getDocumentsByProjectIds: async (projectIds: number[]): Promise<Document[]> => {
      await simulateDelay();
      const idSet = new Set(projectIds);
      return DB.documents.filter(d => idSet.has(d.projectId));
  },
  initiateDocumentUpload: async(docData: any) : Promise<Document> => {
      await simulateDelay(100);
      const newDoc: Document = {
          ...docData,
          id: DB.documents.length + 100,
          url: '',
          status: DocumentStatus.UPLOADING,
          uploadedAt: new Date(),
          version: 1,
      };
      DB.documents.unshift(newDoc);
      return newDoc;
  },
  performChunkedUpload: async (docId: number, fileSize: number, onProgress: (progress: number) => void) => {
      const chunks = 10;
      for (let i = 1; i <= chunks; i++) {
          await simulateDelay(150);
          onProgress((i / chunks) * 100);
      }
  },
  finalizeDocumentUpload: async (docId: number, actorId: number) => {
    await simulateDelay(1000); // Simulate processing
    const doc = DB.documents.find(d => d.id === docId);
    if (!doc) throw new Error("Document not found");
    doc.status = DocumentStatus.SCANNING;
    setTimeout(() => {
        doc.status = DocumentStatus.APPROVED;
        doc.url = `/mock-assets/docs/${doc.name}`;
    }, 2000); // Simulate scanning time
  },
  getDocumentAcksForUser: async(userId: number): Promise<DocumentAcknowledgement[]> => {
      await simulateDelay();
      return DB.documentAcks.filter(ack => ack.userId === userId);
  },
  acknowledgeDocument: async(userId: number, documentId: number): Promise<DocumentAcknowledgement> => {
      await simulateDelay();
      const newAck: DocumentAcknowledgement = {
          id: DB.documentAcks.length + 1,
          userId,
          documentId,
          acknowledgedAt: new Date()
      };
      DB.documentAcks.push(newAck);
      return newAck;
  },
  
  // --- Team / Assignments ---
  getProjectAssignmentsByCompany: async (companyId: number): Promise<ProjectAssignment[]> => {
    await simulateDelay();
    const companyProjectIds = new Set(DB.projects.filter(p => p.companyId === companyId).map(p => p.id));
    return DB.projectAssignments.filter(pa => companyProjectIds.has(pa.projectId));
  },
  updateUserProjectRole: async (userId: number, projectId: number, role: ProjectRole, actorId: number): Promise<ProjectAssignment> => {
    await simulateDelay();
    const assignment = DB.projectAssignments.find(a => a.userId === userId && a.projectId === projectId);
    if (!assignment) throw new Error("Assignment not found");
    assignment.projectRole = role;
    return assignment;
  },
  
  // --- Audit & Announcements ---
  getAuditLogsForUserProjects: async (userId: number): Promise<AuditLog[]> => {
      await simulateDelay();
      // This is a simplified version
      return DB.auditLogs.slice(0, 15);
  },
  getAnnouncementsForCompany: async (companyId?: number): Promise<Announcement[]> => {
      await simulateDelay();
      if (!companyId) return [];
      return DB.announcements.filter(a => a.scope === 'platform' || a.companyId === companyId);
  },
  sendAnnouncement: async (announcement: Omit<Announcement, 'id' | 'createdAt'>, actorId: number): Promise<Announcement> => {
      await simulateDelay();
      const newAnn: Announcement = { ...announcement, id: DB.announcements.length + 1, createdAt: new Date() };
      DB.announcements.unshift(newAnn);
      return newAnn;
  },

  // --- Operative Reports & Weather ---
  submitOperativeReport: async (report: Omit<OperativeReport, 'id'|'timestamp'|'photoUrl'> & { photoFile?: File }): Promise<OperativeReport> => {
      await simulateDelay(600);
      const newReport: OperativeReport = {
          id: DB.operativeReports.length + 1,
          projectId: report.projectId,
          userId: report.userId,
          notes: report.notes,
          timestamp: new Date(),
          photoUrl: report.photoFile ? URL.createObjectURL(report.photoFile) : undefined
      };
      DB.operativeReports.unshift(newReport);
      return newReport;
  },
   getWeatherForecast: async (lat: number, lng: number): Promise<WeatherForecast> => {
    await simulateDelay(300);
    // Mock weather based on location hash
    const hash = Math.round((lat + lng) * 100) % 4;
    const mockForecasts: WeatherForecast[] = [
      { temperature: 18, condition: 'Sunny', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
      { temperature: 15, condition: 'Partly Cloudy', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
      { temperature: 12, condition: 'Showers', icon: 'M18 10a6 6 0 00-12 0v1a2 2 0 00-2 2v3a2 2 0 002 2h12a2 2 0 002-2v-3a2 2 0 00-2-2v-1zM10 16v-2m4 2v-2' },
      { temperature: 22, condition: 'Clear', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
    ];
    return mockForecasts[hash];
  },
  
  // --- Principal Admin ---
  getSystemHealth: async (adminId: number): Promise<SystemHealth> => {
      await simulateDelay();
      return DB.systemHealth;
  },
  getAllCompaniesForAdmin: async (adminId: number): Promise<Company[]> => {
      await simulateDelay();
      return DB.companies.filter(c => c.id !== 0);
  },
  getUsageMetrics: async (adminId: number): Promise<UsageMetric[]> => {
      await simulateDelay();
      return DB.usageMetrics;
  },
  getPlatformStats: async (adminId: number): Promise<{ totalCompanies: number, totalUsers: number, activeProjects: number }> => {
      await simulateDelay();
      return {
          totalCompanies: DB.companies.length - 1, // Exclude platform admin company
          totalUsers: DB.users.length - 1, // Exclude platform admin
          activeProjects: DB.projects.filter(p => p.status === 'Active').length,
      }
  },
  getPlatformSettings: async (adminId: number): Promise<PlatformSettings> => {
      await simulateDelay();
      return DB.platformSettings;
  },
  updatePlatformSettings: async(settings: PlatformSettings, adminId: number): Promise<PlatformSettings> => {
      await simulateDelay();
      DB.platformSettings = settings;
      return DB.platformSettings;
  },
  getPendingApprovalsForPlatform: async (adminId: number): Promise<PendingApproval[]> => {
      await simulateDelay();
      return DB.pendingApprovals;
  },
  getPlatformAuditLogs: async (adminId: number): Promise<AuditLog[]> => {
      await simulateDelay();
      return DB.auditLogs.slice(0, 50); // Return most recent 50
  },
  getPlatformAnnouncements: async (adminId: number): Promise<Announcement[]> => {
      await simulateDelay();
      return DB.announcements.filter(a => a.scope === 'platform');
  },
  updateCompanyStatus: async (companyId: number, status: Company['status'], adminId: number): Promise<Company> => {
      await simulateDelay();
      const company = DB.companies.find(c => c.id === companyId);
      if (!company) throw new Error("Company not found");
      company.status = status;
      return company;
  },
  inviteCompany: async (companyName: string, adminEmail: string, adminId: number): Promise<void> => {
      await simulateDelay(800);
      console.log(`Mock Invite Sent: Company "${companyName}", Admin Email "${adminEmail}"`);
      // In a real app, this would trigger an email and create placeholder records.
  },

  // --- Chat ---
   getConversationsForUser: async (userId: number): Promise<Conversation[]> => {
    await simulateDelay();
    return DB.conversations.filter(c => c.participants.includes(userId));
  },
  getMessagesForConversation: async (conversationId: number, userId: number): Promise<ChatMessage[]> => {
    await simulateDelay();
    if (String(conversationId).startsWith("temp_")) return [];
    
    const convo = DB.conversations.find(c => c.id === conversationId);
    if (!convo?.participants.includes(userId)) throw new Error("Access denied");

    convo.messages.forEach((msg: ChatMessage) => {
        if(msg.senderId !== userId) msg.isRead = true;
    })
    convo.lastMessage = convo.messages[convo.messages.length-1] || null;
    if(convo.lastMessage) convo.lastMessage.isRead = true;

    return convo.messages;
  },
  sendMessage: async (senderId: number, recipientId: number, content: string): Promise<{ message: ChatMessage, conversation: Conversation }> => {
    await simulateDelay();
    let convo = DB.conversations.find(c => c.participants.includes(senderId) && c.participants.includes(recipientId));
    if (!convo) {
      convo = { id: DB.conversations.length + 1, participants: [senderId, recipientId], messages: [], lastMessage: null };
      DB.conversations.push(convo);
    }
    const newMessage: ChatMessage = {
      id: Math.random(),
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

  // --- Tools, Equipment, Financials ---
  getTools: async (userId: number) => {
      await simulateDelay();
      return DB.tools;
  },
  getEquipmentByCompany: async (companyId?: number): Promise<Equipment[]> => {
      await simulateDelay();
      if (!companyId) return [];
      return DB.equipment.filter(e => e.companyId === companyId);
  },
  assignEquipmentToProject: async (equipmentId: number, projectId: number, actorId: number): Promise<Equipment> => {
      await simulateDelay();
      const item = DB.equipment.find(e => e.id === equipmentId);
      if (!item) throw new Error("Equipment not found");
      item.projectId = projectId;
      item.status = EquipmentStatus.IN_USE;
      return item;
  },
  unassignEquipmentFromProject: async (equipmentId: number, actorId: number): Promise<Equipment> => {
      await simulateDelay();
      const item = DB.equipment.find(e => e.id === equipmentId);
      if (!item) throw new Error("Equipment not found");
      item.projectId = undefined;
      item.status = EquipmentStatus.AVAILABLE;
      return item;
  },
  updateEquipmentStatus: async (equipmentId: number, status: Equipment['status'], actorId: number): Promise<Equipment> => {
    await simulateDelay();
    const item = DB.equipment.find(e => e.id === equipmentId);
    if (!item) throw new Error("Equipment not found");
    item.status = status;
    return item;
  },
  getResourceAssignments: async (companyId?: number): Promise<ResourceAssignment[]> => {
      await simulateDelay();
      if (!companyId) return [];
      return DB.resourceAssignments.filter(ra => ra.companyId === companyId);
  },
  getCompanySettings: async (companyId: number): Promise<CompanySettings> => {
      await simulateDelay();
      let settings = DB.companySettings.find(cs => cs.companyId === companyId);
      if (!settings) {
          // Create default settings if none exist
          settings = {
              companyId,
              theme: 'light',
              notificationPreferences: { projectUpdates: true, timeReminders: true, photoRequirements: false },
              locationPreferences: { gpsAccuracy: 'standard', backgroundTracking: true, locationHistoryDays: 30 }
          };
          DB.companySettings.push(settings);
      }
      return settings;
  },
  updateCompanySettings: async (companyId: number, updates: Partial<CompanySettings>, actorId: number): Promise<CompanySettings> => {
      await simulateDelay();
      let settings = DB.companySettings.find(cs => cs.companyId === companyId);
      if (!settings) throw new Error("Settings not found");
      settings = Object.assign(settings, updates);
      return settings;
  },
  
  // -- Financials --
  getFinancialKPIsForCompany: async(companyId?: number): Promise<FinancialKPIs | null> => {
      await simulateDelay();
      if (!companyId) return null;
      return DB.financialKPIs.find(kpi => kpi.companyId === companyId) || null;
  },
  getUnbilledTimesheets: async(companyId?: number): Promise<Timesheet[]> => {
    await simulateDelay();
    if (!companyId) return [];
    const companyUsers = new Set(DB.users.filter(u => u.companyId === companyId).map(u => u.id));
    return DB.timesheets.filter(t => companyUsers.has(t.userId) && t.status === TimesheetStatus.APPROVED && !t.invoiceId);
  },
  createInvoice: async(
    invoiceData: Omit<Invoice, 'id' | 'status' | 'amountDue' | 'issuedAt'>,
    timesheetIdsToBill: number[],
    actorId: number
  ): Promise<Invoice> => {
    await simulateDelay(600);
    const newInvoice: Invoice = {
      ...invoiceData,
      id: DB.invoices.length + 100,
      status: InvoiceStatus.DRAFT,
      amountDue: invoiceData.total,
      issuedAt: new Date(),
    };
    DB.invoices.unshift(newInvoice);

    // Mark timesheets as billed
    timesheetIdsToBill.forEach(tsId => {
      const ts = DB.timesheets.find(t => t.id === tsId);
      if (ts) {
        ts.invoiceId = newInvoice.id;
      }
    });

    addAuditLog({
        actorId,
        action: 'INVOICE_GENERATED_FROM_TIMESHEETS',
        target: { type: 'Project', id: newInvoice.projectId, name: `Invoice #${newInvoice.id}` },
        projectId: newInvoice.projectId
    });

    return newInvoice;
  },
  getClientsByCompany: async (companyId?: number): Promise<Client[]> => {
      await simulateDelay();
      if (!companyId) return [];
      return DB.clients.filter(c => c.companyId === companyId);
  },
  getInvoicesByCompany: async (companyId?: number): Promise<Invoice[]> => {
      await simulateDelay();
      if (!companyId) return [];
      return DB.invoices.filter(i => i.companyId === companyId);
  },
  getQuotesByCompany: async (companyId?: number): Promise<Quote[]> => {
      await simulateDelay();
      if (!companyId) return [];
      return DB.quotes.filter(q => q.companyId === companyId);
  },

  // --- Reminders & Comments ---
  updateTodoReminder: async (todoId: number, reminderDate: Date | undefined, actorId: number): Promise<Todo> => {
    await simulateDelay();
    const todo = DB.todos.find(t => t.id === todoId);
    if (!todo) throw new Error("Todo not found");
    todo.reminderAt = reminderDate;
    return todo;
  },
  addComment: async (todoId: number | string, text: string, creatorId: number): Promise<Comment> => {
    await simulateDelay(300);
    const todo = DB.todos.find(t => t.id === todoId);
    if (!todo) throw new Error("Todo not found");
    const newComment: Comment = {
      id: Math.random(),
      creatorId,
      text,
      createdAt: new Date(),
    };
    if (!todo.comments) todo.comments = [];
    todo.comments.push(newComment);
    return newComment;
  },

  // --- Gemini API Mocks ---
  searchAcrossDocuments: async (query: string, projectIds: number[], actorId: number): Promise<AISearchResult> => {
    await simulateDelay(2000);
    // This is a very simplified mock. A real implementation would use embeddings.
    const relevantDocs = DB.documents.filter(d => projectIds.includes(d.projectId)).slice(0, 2);
    return {
        summary: `Based on the project documents, the rebar specification requires Grade 60 steel. Safety procedures mandate hard hats on site at all times. The concrete pouring deadline is this Friday.`,
        sources: relevantDocs.map(d => ({
            documentId: d.id,
            snippet: `... an important section of document ${d.name} that contains keywords related to the query...`
        }))
    }
  },
  getPhotosForProject: async (projectId: number): Promise<ProjectPhoto[]> => {
      await simulateDelay();
      return DB.projectPhotos.filter(p => p.projectId === projectId);
  },
  getOperativeReportsByProject: async (projectId: number): Promise<OperativeReport[]> => {
      await simulateDelay();
      return DB.operativeReports.filter(r => r.projectId === projectId);
  },

   editImageWithAi: async (
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    projectId: number,
    actorId: number
  ): Promise<{ parts: Part[] }> => {
    if (!ai) throw new Error("GenAI not initialized");
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64ImageData,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return { parts: response.candidates?.[0]?.content.parts ?? [] };
  },

   generateSafetyAnalysis: async (incidents: SafetyIncident[], projectId: number, actorId: number): Promise<{ report: string }> => {
    if (!ai) throw new Error("GenAI not initialized");
    const prompt = `
      Analyze the following safety incidents for project ID ${projectId} and provide a report.
      Incidents: ${JSON.stringify(incidents.map(i => i.description))}
      Report should include:
      1. Key trends or common factors.
      2. High-risk areas or activities.
      3. Actionable recommendations to improve safety.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return { report: response.text };
  },
   generateDailySummary: async (projectId: number, date: Date, actorId: number): Promise<string> => {
        if (!ai) throw new Error("GenAI not initialized");
        const prompt = `Generate a daily summary for project ID ${projectId} for ${date.toDateString()}. Include progress, blockers, and safety notes.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text;
    },

    findGrants: async (keywords: string, location: string): Promise<Grant[]> => {
        await simulateDelay(1500);
        return [
            { id: '1', name: 'Green Construction Fund', agency: 'Gov UK', amount: '£50,000', description: 'For projects using sustainable materials.', url: '#' },
            { id: '2', name: 'SME Retrofit Grant', agency: 'Local Council', amount: '£10,000', description: 'Aids small businesses in retrofitting old buildings.', url: '#' },
        ];
    },
    analyzeForRisks: async (text: string): Promise<RiskAnalysis> => {
        await simulateDelay(1500);
        return {
            summary: 'The provided text has low-to-medium financial and compliance risk.',
            identifiedRisks: [
                { severity: 'Low', description: 'Payment terms are net 60, could impact cash flow.', recommendation: 'Negotiate for net 30 terms.' },
                { severity: 'Medium', description: 'No mention of liability insurance cap.', recommendation: 'Clarify liability limits before signing.' },
            ],
        };
    },
     generateBidPackage: async (tenderUrl: string, strengths: string): Promise<BidPackage> => {
        await simulateDelay(2000);
        return {
            coverLetter: 'Dear Sir/Madam,\n\nPlease find our bid for the tender. We are confident in our ability to deliver...\n\nSincerely, AS Agents',
            checklist: ['Submit Form A', 'Include Insurance Certificate', 'Provide Project Portfolio'],
            summary: 'This project aims to build a new commercial center. Our bid focuses on quality and efficiency.'
        };
    },

    // --- Project Templates ---
    getProjectTemplates: async (companyId?: number): Promise<ProjectTemplate[]> => {
        await simulateDelay();
        if (!companyId) return [];
        return DB.projectTemplates.filter(t => t.companyId === companyId);
    },
    saveProjectTemplate: async (templateData: Omit<ProjectTemplate, 'id'>, actorId: number): Promise<ProjectTemplate> => {
        await simulateDelay(400);
        const newTemplate: ProjectTemplate = {
            ...templateData,
            id: DB.projectTemplates.length + 1,
        };
        DB.projectTemplates.push(newTemplate);
        return newTemplate;
    },
    deleteProjectTemplate: async (templateId: number, actorId: number): Promise<void> => {
        await simulateDelay(300);
        DB.projectTemplates = DB.projectTemplates.filter(t => t.id !== templateId);
    },
};