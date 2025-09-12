// full contents of services/mockApi.ts

import {
  User, Project, Todo, TodoStatus, Document, SafetyIncident, Timesheet, Equipment, EquipmentStatus,
  Company, CompanySettings, Permission, Role, Conversation, ChatMessage,
  Client, Invoice, Quote, ProjectTemplate, ResourceAssignment, AISearchResult, AuditLog,
  FinancialKPIs, MonthlyFinancials, CostBreakdown, Grant, RiskAnalysis, BidPackage, TimesheetStatus, ProjectAssignment
} from '../types';
import { db } from './mockData';
import { hasPermission } from './auth';

const LATENCY = 300; // ms

const simulateNetwork = <T>(data: T): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), LATENCY);
  });
};

export const api = {
  // User & Auth
  getUsersByCompany: (companyId?: number): Promise<User[]> => {
    if (companyId === 0) return simulateNetwork(db.users.filter(u => u.role === Role.PRINCIPAL_ADMIN));
    if (companyId) return simulateNetwork(db.users.filter(u => u.companyId === companyId));
    return simulateNetwork(db.users);
  },

  // Company
  getCompanies: (): Promise<Company[]> => simulateNetwork(db.companies),
  getCompanySettings: (companyId: number): Promise<CompanySettings> => {
    const settings = db.companySettings.find(cs => cs.companyId === companyId)!;
    const { companyId: _, ...companySettings } = settings;
    return simulateNetwork(companySettings);
  },
  updateCompanySettings: (companyId: number, settings: CompanySettings, actorId: number): Promise<CompanySettings> => {
    const index = db.companySettings.findIndex(cs => cs.companyId === companyId);
    db.companySettings[index] = { ...settings, companyId };
    return simulateNetwork(settings);
  },

  // Projects
  getProjectsByCompany: (companyId: number): Promise<Project[]> => simulateNetwork(db.projects.filter(p => p.companyId === companyId)),
  getProjectsByUser: (userId: number): Promise<Project[]> => {
    const assignments = db.projectAssignments.filter(a => a.userId === userId);
    const projectIds = assignments.map(a => a.projectId);
    return simulateNetwork(db.projects.filter(p => projectIds.includes(p.id)));
  },
  getProjectsByManager: (userId: number): Promise<Project[]> => {
      const user = db.users.find(u => u.id === userId);
      if (user?.role !== Role.PM) return simulateNetwork([]);
      // In a real app, projects would have a managerId. Here we'll just give them a subset.
      return simulateNetwork(db.projects.filter(p => p.companyId === user.companyId).slice(0,3));
  },
   createProject: (projectData: Omit<Project, 'id' | 'companyId' | 'actualCost' | 'status'>, templateId: number | null, actorId: number): Promise<Project> => {
    const actor = db.users.find(u => u.id === actorId);
    if (!actor?.companyId) throw new Error("User has no companyId");

    const newProject: Project = {
        ...projectData,
        id: Date.now(),
        companyId: actor.companyId,
        actualCost: 0,
        status: 'Active',
    };
    db.projects.push(newProject);

    if (templateId) {
        const template = db.projectTemplates.find(t => t.id === templateId);
        if (template) {
            template.templateTasks.forEach(taskTemplate => {
                const newTodo: Todo = {
                    ...taskTemplate,
                    id: `${newProject.id}-${Date.now()}-${Math.random()}`,
                    projectId: newProject.id,
                    creatorId: actorId,
                    status: TodoStatus.TODO,
                } as Todo;
                db.todos.push(newTodo);
            });
        }
    }
    return simulateNetwork(newProject);
  },


  // Todos
  getTodosByProjectIds: (projectIds: number[]): Promise<Todo[]> => simulateNetwork(db.todos.filter(t => projectIds.includes(t.projectId))),
  updateTodo: (todoId: number | string, updates: Partial<Todo>, actorId: number): Promise<Todo> => {
    const index = db.todos.findIndex(t => t.id === todoId);
    if (index === -1) throw new Error("Todo not found");
    const updatedTodo = { ...db.todos[index], ...updates };
    db.todos[index] = updatedTodo;
    return simulateNetwork(updatedTodo);
  },

  // Documents
  getDocumentsByProjectIds: (projectIds: number[]): Promise<Document[]> => simulateNetwork(db.documents.filter(d => projectIds.includes(d.projectId))),

  // Timesheets
  getTimesheetsByCompany: (companyId: number, actorId: number): Promise<Timesheet[]> => simulateNetwork(db.timesheets.filter(t => {
      const user = db.users.find(u => u.id === t.userId);
      return user?.companyId === companyId;
  })),
  getTimesheetsByUser: (userId: number): Promise<Timesheet[]> => simulateNetwork(db.timesheets.filter(t => t.userId === userId)),
  getTimesheetsForManager: (managerId: number): Promise<Timesheet[]> => {
      // Complex logic: get projects for manager, then get users for those projects, then get timesheets for those users
      return api.getProjectsByManager(managerId).then(projects => {
          const projectIds = projects.map(p => p.id);
          const assignments = db.projectAssignments.filter(a => projectIds.includes(a.projectId));
          const userIds = new Set(assignments.map(a => a.userId));
          return simulateNetwork(db.timesheets.filter(t => userIds.has(t.userId)));
      });
  },
  updateTimesheetStatus: (id: number, status: TimesheetStatus, actorId: number, reason?: string): Promise<Timesheet> => {
      const index = db.timesheets.findIndex(t => t.id === id);
      if (index === -1) throw new Error("Timesheet not found");
      db.timesheets[index].status = status;
      if (reason) db.timesheets[index].rejectionReason = reason;
      return simulateNetwork(db.timesheets[index]);
  },

  // Safety
  getSafetyIncidentsByCompany: (companyId: number): Promise<SafetyIncident[]> => {
      const projectIds = db.projects.filter(p => p.companyId === companyId).map(p => p.id);
      return simulateNetwork(db.safetyIncidents.filter(i => projectIds.includes(i.projectId)));
  },

  // Equipment
  getEquipmentByCompany: (companyId: number): Promise<Equipment[]> => simulateNetwork(db.equipment.filter(e => e.companyId === companyId)),
  assignEquipmentToProject: (equipmentId: number, projectId: number, actorId: number): Promise<Equipment> => {
      const index = db.equipment.findIndex(e => e.id === equipmentId);
      if (index === -1) throw new Error("Equipment not found");
      db.equipment[index].projectId = projectId;
      db.equipment[index].status = EquipmentStatus.IN_USE;
      return simulateNetwork(db.equipment[index]);
  },
  unassignEquipmentFromProject: (equipmentId: number, actorId: number): Promise<Equipment> => {
      const index = db.equipment.findIndex(e => e.id === equipmentId);
      if (index === -1) throw new Error("Equipment not found");
      db.equipment[index].projectId = null;
      db.equipment[index].status = EquipmentStatus.AVAILABLE;
      return simulateNetwork(db.equipment[index]);
  },
  updateEquipmentStatus: (equipmentId: number, status: EquipmentStatus, actorId: number): Promise<Equipment> => {
      const index = db.equipment.findIndex(e => e.id === equipmentId);
      if (index === -1) throw new Error("Equipment not found");
      db.equipment[index].status = status;
      if (status === EquipmentStatus.AVAILABLE) db.equipment[index].projectId = null;
      return simulateNetwork(db.equipment[index]);
  },

  // Chat
  getConversationsForUser: (userId: number): Promise<Conversation[]> => simulateNetwork(db.conversations.filter(c => c.participants.includes(userId))),
  getMessagesForConversation: (conversationId: number, userId: number): Promise<ChatMessage[]> => {
      const convo = db.conversations.find(c => c.id === conversationId);
      if (!convo || !convo.participants.includes(userId)) throw new Error("Conversation not found or access denied");
      // Mark messages as read
      convo.messages.forEach(msg => {
          if (msg.senderId !== userId) msg.isRead = true;
      });
      if (convo.lastMessage && convo.lastMessage.senderId !== userId) {
        convo.lastMessage.isRead = true;
      }
      return simulateNetwork(convo.messages);
  },
  sendMessage: (senderId: number, recipientId: number, content: string): Promise<{ message: ChatMessage; conversation: Conversation }> => {
      let convo = db.conversations.find(c => c.participants.includes(senderId) && c.participants.includes(recipientId));
      if (!convo) {
          convo = { id: Date.now(), participants: [senderId, recipientId], messages: [], lastMessage: null };
          db.conversations.push(convo);
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
      return simulateNetwork({ message: newMessage, conversation: convo });
  },

  // Financials
  getClientsByCompany: (companyId: number): Promise<Client[]> => simulateNetwork(db.clients.filter(c => c.companyId === companyId)),
  getInvoicesByCompany: (companyId: number): Promise<Invoice[]> => {
    const clientIds = db.clients.filter(c => c.companyId === companyId).map(c => c.id);
    return simulateNetwork(db.invoices.filter(i => clientIds.includes(i.clientId)));
  },
  getQuotesByCompany: (companyId: number): Promise<Quote[]> => {
    const clientIds = db.clients.filter(c => c.companyId === companyId).map(c => c.id);
    return simulateNetwork(db.quotes.filter(q => clientIds.includes(q.clientId)));
  },
  getFinancialKPIsForCompany: (companyId: number): Promise<FinancialKPIs> => simulateNetwork({ 
    totalRevenue: 500000, 
    totalExpenses: 400000, 
    netProfit: 100000, 
    profitMargin: 20.0, 
    outstandingInvoices: 85000, 
    averageProjectValue: 125000 
  }),
  getMonthlyFinancials: (companyId: number): Promise<MonthlyFinancials[]> => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return simulateNetwork(months.map(m => ({ 
        month: m, 
        revenue: 100000 + Math.random() * 50000, 
        expenses: 80000 + Math.random() * 30000, 
        profit: 20000 + Math.random() * 20000 
      })));
  },
  getCostBreakdown: (companyId: number): Promise<CostBreakdown[]> => {
    const costs = [
      { category: 'Labor', amount: 150000 },
      { category: 'Materials', amount: 250000 },
      { category: 'Subcontractors', amount: 120000 },
      { category: 'Equipment', amount: 80000 },
      { category: 'Overhead', amount: 50000 },
    ];
    const total = costs.reduce((sum, cost) => sum + cost.amount, 0);
    return simulateNetwork(costs.map(cost => ({
      ...cost,
      percentage: (cost.amount / total) * 100
    })));
  },

  // Templates
  getProjectTemplates: (companyId: number): Promise<ProjectTemplate[]> => simulateNetwork(db.projectTemplates.filter(t => t.companyId === companyId)),

  // Assignments
  getProjectAssignmentsByCompany: (companyId: number): Promise<ProjectAssignment[]> => {
      const projectIds = db.projects.filter(p => p.companyId === companyId).map(p => p.id);
      return simulateNetwork(db.projectAssignments.filter(a => projectIds.includes(a.projectId)));
  },
  getResourceAssignments: (companyId: number): Promise<ResourceAssignment[]> => simulateNetwork(db.resourceAssignments.filter(a => a.companyId === companyId)),
   createResourceAssignment: (assignmentData: Omit<ResourceAssignment, 'id'>, actorId: number): Promise<ResourceAssignment> => {
        const newAssignment: ResourceAssignment = { ...assignmentData, id: Date.now() };
        db.resourceAssignments.push(newAssignment);
        return simulateNetwork(newAssignment);
    },
    deleteResourceAssignment: (assignmentId: number, actorId: number): Promise<{ success: true }> => {
        db.resourceAssignments = db.resourceAssignments.filter(a => a.id !== assignmentId);
        return simulateNetwork({ success: true });
    },

  // Audit
  getAuditLogsByActorId: (actorId: number): Promise<AuditLog[]> => simulateNetwork(db.auditLogs.filter(log => log.actorId === actorId)),

  // AI Tools
  searchAcrossDocuments: (query: string, projectIds: number[], userId: number): Promise<AISearchResult> => {
    return simulateNetwork({
      summary: `Based on the documents, the rebar specification is Grade B, 16mm diameter. Safety procedure for crane operation requires a 10-meter exclusion zone. The deadline for the foundation pour is next Friday.`,
      sources: [
        { documentId: 101, snippet: `...all structural reinforcement must use Grade B rebar, with a standard diameter of 16mm...` },
        { documentId: 103, snippet: `...a minimum 10-meter exclusion zone must be maintained during all crane lifting operations...` },
      ]
    });
  },
  generateDailySummary: (projectId: number, date: Date, userId: number): Promise<string> => {
      return simulateNetwork(`
## Daily Summary for Project X - ${date.toDateString()}

**Progress:**
- Formwork for the 2nd-floor slab is 80% complete.
- Electrical rough-in on the ground floor is complete.
- 50 cubic meters of concrete were poured for shear walls.

**Issues:**
- Delivery of HVAC units delayed by 24 hours.
- Minor safety incident reported (see safety log).

**Next Steps:**
- Complete 2nd-floor formwork by EOD tomorrow.
- Begin plumbing installation on ground floor.
    `);
  },
  findGrants: (keywords: string, location: string): Promise<Grant[]> => {
      return simulateNetwork([
          { id: 1, name: 'Green Construction Fund', agency: 'Gov UK', amount: '£50,000 - £250,000', description: 'For projects utilizing sustainable materials and reducing carbon footprint.', url: '#' },
          { id: 2, name: 'SME Innovation Grant', agency: 'Innovate UK', amount: 'Up to £100,000', description: 'Supports small and medium-sized enterprises adopting new construction technologies.', url: '#' },
      ]);
  },
   analyzeForRisks: (text: string): Promise<RiskAnalysis> => {
    return simulateNetwork({
        summary: "The text contains a potential financial risk related to unspecified material costs and a compliance risk regarding payment terms.",
        identifiedRisks: [
            { severity: 'Medium', description: "The quote mentions 'material costs to be confirmed', which creates budget uncertainty.", recommendation: "Request a fixed price or an allowance for materials before proceeding." },
            { severity: 'Low', description: "Payment terms of 'Net 60' might impact cash flow on a short project.", recommendation: "Negotiate for Net 30 terms if possible." },
        ]
    });
  },
  generateBidPackage: (tenderUrl: string, companyStrengths: string, userId: number): Promise<BidPackage> => {
      return simulateNetwork({
          summary: `This bid leverages our key strengths in sustainable building and our strong safety record to deliver exceptional value. We propose an efficient timeline and a highly experienced team...`,
          coverLetter: `Dear Sir/Madam,\n\nWe are pleased to submit our bid for the project... Based on our expertise in ${companyStrengths}, we are confident in our ability to exceed your expectations...\n\nSincerely,\n[Your Name]`,
          checklist: ['Complete Form of Tender', 'Provide Insurance Certificates', 'Submit Project Timeline', 'Include Key Personnel CVs']
      });
  },
  generateSafetyAnalysis: (incidents: SafetyIncident[], projectId: number, userId: number): Promise<{ report: string }> => {
      return simulateNetwork({
          report: `
## AI Safety Analysis for Project Y

**Trend Identification:**
- A recurring trend of 'slip and trip' incidents has been identified, with 3 of the 5 reported incidents falling into this category.
- Most incidents occurred in the afternoon, between 2 PM and 4 PM.

**Root Cause Hypothesis:**
- Poor housekeeping and debris accumulation in high-traffic areas are likely contributing factors.
- Potential worker fatigue in the afternoon could be reducing awareness.

**Recommendations:**
1.  **Immediate:** Mandate a 15-minute site-wide cleanup at 1 PM daily.
2.  **Short-term:** Hold a toolbox talk focused on housekeeping and awareness of surroundings.
3.  **Long-term:** Consider revising work schedules to include a second short break in the mid-afternoon.
      `});
  },

};
