import {
  User, Company, Project, Todo, Timesheet, SafetyIncident, Document,
  Role, Permission, View, TimesheetStatus, TodoStatus, TodoPriority,
  IncidentStatus, ProjectAssignment, ProjectRole, SubTask, Comment,
  SystemHealth, UsageMetric, PlatformSettings, PendingApproval, AuditLog, Announcement,
  Client, Invoice, Quote, Equipment, ResourceAssignment, CompanySettings,
  ChatMessage, Conversation, DocumentAcknowledgement, OperativeReport, WeatherForecast,
  ProjectPhoto, DocumentCategory, DocumentStatus, IncidentSeverity, IncidentType,
  WorkType, InvoiceStatus, QuoteStatus, EquipmentStatus, UserStatus,
  FinancialKPIs, Tool, ToolStatus, ProjectTemplate
} from '../types';

export const simulateDelay = (ms = Math.random() * 400 + 100) => new Promise(res => setTimeout(res, ms));

// --- MOCK DATA DEFINITION ---

const companies: Company[] = [
  { id: 0, name: 'Platform Administration', status: 'Active', subscriptionPlan: 'Internal', storageUsageGB: 10 },
  { id: 1, name: 'AS Agents Construction', status: 'Active', subscriptionPlan: 'Enterprise', storageUsageGB: 125.5 },
  { id: 2, name: 'Modern Builders Co.', status: 'Active', subscriptionPlan: 'Pro', storageUsageGB: 45.2 },
  { id: 3, name: 'Heritage Renovations', status: 'Suspended', subscriptionPlan: 'Pro', storageUsageGB: 88.1 },
];

const users: User[] = [
  // Platform Admin
  { id: 0, name: 'Platform Admin', email: 'pa@platform.com', role: Role.PRINCIPAL_ADMIN, companyId: 0 },
  
  // AS Agents Construction
  { id: 1, name: 'Michael Rodriguez', email: 'michael.r@asagents.com', role: Role.ADMIN, companyId: 1 },
  { id: 2, name: 'Sarah Johnson', email: 'sarah.j@asagents.com', role: Role.PM, companyId: 1 },
  { id: 3, name: 'David Chen', email: 'david.c@asagents.com', role: Role.OPERATIVE, companyId: 1 },
  { id: 4, name: 'James Wilson', email: 'james.w@asagents.com', role: Role.OPERATIVE, companyId: 1 },
  { id: 5, name: 'Maria Garcia', email: 'maria.g@asagents.com', role: Role.OPERATIVE, companyId: 1 },
  { id: 6, name: 'Emily White', email: 'emily.w@asagents.com', role: Role.SAFETY_OFFICER, companyId: 1 },
  { id: 7, name: 'Robert Brown', email: 'robert.b@asagents.com', role: Role.FOREMAN, companyId: 1 },

  // Modern Builders Co.
  { id: 10, name: 'Laura Smith', email: 'laura.s@modernbuilders.com', role: Role.ADMIN, companyId: 2 },
  { id: 11, name: 'Ben Carter', email: 'ben.c@modernbuilders.com', role: Role.PM, companyId: 2 },
  { id: 12, name: 'Olivia Green', email: 'olivia.g@modernbuilders.com', role: Role.OPERATIVE, companyId: 2 },
];

const projects: Project[] = [
  { id: 1, name: 'Downtown Office Complex', companyId: 1, location: { lat: 51.5074, lng: -0.1278, address: '123 Business District, London' }, startDate: new Date('2025-01-15'), budget: 5000000, actualCost: 2300000, status: 'Active', imageUrl: 'https://images.pexels.com/photos/3861458/pexels-photo-3861458.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', projectType: 'Commercial Construction', workClassification: 'Contracting', geofenceRadius: 200 },
  { id: 2, name: 'Suburban Housing Development', companyId: 1, location: { lat: 51.5560, lng: -0.2796, address: '456 Oak Lane, Wembley' }, startDate: new Date('2024-09-01'), budget: 8000000, actualCost: 750000, status: 'Active', imageUrl: 'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', projectType: 'Residential Construction', workClassification: 'Development', geofenceRadius: 500 },
  { id: 3, name: 'City Bridge Refurbishment', companyId: 1, location: { lat: 51.509865, lng: -0.118092, address: 'River Thames Crossing, London' }, startDate: new Date('2024-05-10'), budget: 2500000, actualCost: 2650000, status: 'Completed', imageUrl: 'https://images.pexels.com/photos/1586795/pexels-photo-1586795.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', projectType: 'Infrastructure', workClassification: 'Maintenance' },
  { id: 10, name: 'Mall Expansion', companyId: 2, location: { lat: 53.4808, lng: -2.2426, address: '789 High Street, Manchester' }, startDate: new Date('2025-03-01'), budget: 12000000, actualCost: 450000, status: 'Active', imageUrl: 'https://images.pexels.com/photos/21067/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', projectType: 'Commercial Construction', workClassification: 'Contracting', geofenceRadius: 300 },
];

const subtasks1: SubTask[] = [{id: 1, text: 'Pour foundation', completed: true}, {id: 2, text: 'Erect steel frame', completed: false}];
const comments1: Comment[] = [{id: 1, creatorId: 2, text: 'Foundation poured ahead of schedule. Good work.', createdAt: new Date('2025-01-20T10:00:00Z')}];

const todos: Todo[] = [
    { id: 1, projectId: 1, creatorId: 2, assigneeId: 6, text: 'Finalize structural blueprints', status: TodoStatus.DONE, priority: TodoPriority.HIGH, createdAt: new Date('2025-01-10'), completedAt: new Date('2025-01-14'), dueDate: new Date('2025-01-15') },
    { id: 2, projectId: 1, creatorId: 2, assigneeId: 7, text: 'Site preparation and excavation', status: TodoStatus.IN_PROGRESS, priority: TodoPriority.HIGH, createdAt: new Date('2025-01-15'), subTasks: subtasks1, comments: comments1, dependsOn: 1, dueDate: new Date() },
    { id: 3, projectId: 1, creatorId: 1, assigneeId: 2, text: 'Order HVAC systems', status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, createdAt: new Date('2025-01-18'), dependsOn: 2, dueDate: new Date('2025-02-10') },
    { id: 4, projectId: 1, creatorId: 2, assigneeId: 3, text: 'Install plumbing rough-in', status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, createdAt: new Date('2025-01-22'), reminderAt: new Date(Date.now() + 86400000), dueDate: new Date(Date.now() + 2 * 86400000) },
    { id: 5, projectId: 2, creatorId: 2, assigneeId: 5, text: 'Clear and grade lots 1-5', status: TodoStatus.IN_PROGRESS, priority: TodoPriority.HIGH, createdAt: new Date('2024-09-05'), dueDate: new Date(Date.now() - 10 * 86400000) },
    { id: 6, projectId: 2, creatorId: 2, text: 'Lay foundations for Phase 1', status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, createdAt: new Date('2024-09-10'), dependsOn: 5 },
    { id: 7, projectId: 3, creatorId: 1, assigneeId: 6, text: 'Final safety inspection', status: TodoStatus.DONE, priority: TodoPriority.HIGH, createdAt: new Date('2024-08-01'), completedAt: new Date('2024-08-15') },
    { id: 10, projectId: 10, creatorId: 11, assigneeId: 12, text: 'Submit expansion plans to council', status: TodoStatus.IN_PROGRESS, priority: TodoPriority.HIGH, createdAt: new Date('2025-03-02'), dueDate: new Date('2025-03-15') },
];

const timesheets: Timesheet[] = [
    { id: 1, userId: 3, projectId: 1, clockIn: new Date('2025-01-20T08:00:00Z'), clockOut: new Date('2025-01-20T17:00:00Z'), clockInLocation: { lat: 51.5074, lng: -0.1278 }, clockOutLocation: { lat: 51.5074, lng: -0.1278 }, workType: WorkType.GENERAL_LABOR, status: TimesheetStatus.APPROVED, breaks: [{startTime: new Date('2025-01-20T12:00:00Z'), endTime: new Date('2025-01-20T12:30:00Z')}] },
    { id: 2, userId: 4, projectId: 1, clockIn: new Date('2025-01-20T08:05:00Z'), clockOut: new Date('2025-01-20T17:02:00Z'), clockInLocation: { lat: 51.5074, lng: -0.1278 }, clockOutLocation: { lat: 51.5074, lng: -0.1278 }, workType: WorkType.EQUIPMENT_OPERATION, status: TimesheetStatus.PENDING, breaks: [{startTime: new Date('2025-01-20T12:00:00Z'), endTime: new Date('2025-01-20T12:30:00Z')}], trustScore: 0.75, trustReasons: { geofence: 'Clocked in outside of project geofence' } },
    { id: 3, userId: 5, projectId: 2, clockIn: new Date(Date.now() - 4 * 3600 * 1000), clockOut: null, clockInLocation: { lat: 51.5560, lng: -0.2796 }, clockOutLocation: null, workType: WorkType.GENERAL_LABOR, status: TimesheetStatus.PENDING, breaks: [] },
    { id: 4, userId: 12, projectId: 10, clockIn: new Date('2025-03-05T08:30:00Z'), clockOut: new Date('2025-03-05T16:30:00Z'), clockInLocation: { lat: 53.4808, lng: -2.2426 }, clockOutLocation: { lat: 53.4808, lng: -2.2426 }, workType: WorkType.GENERAL_LABOR, status: TimesheetStatus.REJECTED, comment: 'Incorrect project selected.', breaks: [] },
];

const safetyIncidents: SafetyIncident[] = [
    { id: 1, projectId: 1, reporterId: 3, timestamp: new Date('2025-01-19T14:30:00Z'), type: IncidentType.NEAR_MISS, severity: IncidentSeverity.LOW, description: 'A small hand tool was dropped from scaffolding, but landed in a cordoned-off area. No injuries.', locationOnSite: 'Scaffolding, West face', status: IncidentStatus.RESOLVED },
    { id: 2, projectId: 1, reporterId: 6, timestamp: new Date('2025-01-22T10:00:00Z'), type: IncidentType.HAZARD_OBSERVATION, severity: IncidentSeverity.MEDIUM, description: 'Water pooling near electrical panel on Level 2.', locationOnSite: 'Level 2, near main electrical room', status: IncidentStatus.UNDER_REVIEW },
    { id: 3, projectId: 2, reporterId: 5, timestamp: new Date('2024-09-10T11:00:00Z'), type: IncidentType.INJURY, severity: IncidentSeverity.MEDIUM, description: 'Minor cut to hand while handling rebar. First aid administered on site.', locationOnSite: 'Lot 3 Foundation Area', status: IncidentStatus.REPORTED },
];

const documents: Document[] = [
    { id: 1, name: 'Foundation Blueprint Rev. 2.pdf', url: '/mock-assets/docs/Foundation Blueprint.pdf', projectId: 1, category: DocumentCategory.BLUEPRINTS, status: DocumentStatus.APPROVED, uploadedAt: new Date('2025-01-05T11:00:00Z'), creatorId: 2, version: 2 },
    { id: 2, name: 'Site Safety Plan.pdf', url: '/mock-assets/docs/Site Safety Plan.pdf', projectId: 1, category: DocumentCategory.HS, status: DocumentStatus.APPROVED, uploadedAt: new Date('2025-01-02T15:00:00Z'), creatorId: 6, version: 1 },
    { id: 3, name: 'Main Contract.pdf', url: '/mock-assets/docs/Main Contract.pdf', projectId: 1, category: DocumentCategory.CONTRACT, status: DocumentStatus.APPROVED, uploadedAt: new Date('2024-12-15T09:00:00Z'), creatorId: 1, version: 1 },
    { id: 4, name: 'Lot Plan - Phase 1.dwg', url: '/mock-assets/docs/Lot Plan.dwg', projectId: 2, category: DocumentCategory.BLUEPRINTS, status: DocumentStatus.APPROVED, uploadedAt: new Date('2024-09-02T13:00:00Z'), creatorId: 2, version: 1 },
];

const documentAcks: DocumentAcknowledgement[] = [
    { id: 1, documentId: 2, userId: 3, acknowledgedAt: new Date('2025-01-20T08:10:00Z') },
];

const projectAssignments: ProjectAssignment[] = [
    { userId: 2, projectId: 1, projectRole: ProjectRole.PROJECT_MANAGER },
    { userId: 7, projectId: 1, projectRole: ProjectRole.SITE_SUPERVISOR },
    { userId: 3, projectId: 1, projectRole: ProjectRole.WORKER },
    { userId: 4, projectId: 1, projectRole: ProjectRole.WORKER },
    { userId: 5, projectId: 1, projectRole: ProjectRole.WORKER },
    { userId: 6, projectId: 1, projectRole: ProjectRole.LEAD_ENGINEER },

    { userId: 2, projectId: 2, projectRole: ProjectRole.PROJECT_MANAGER },
    { userId: 7, projectId: 2, projectRole: ProjectRole.SITE_SUPERVISOR },
    { userId: 5, projectId: 2, projectRole: ProjectRole.WORKER },
    
    { userId: 2, projectId: 3, projectRole: ProjectRole.PROJECT_MANAGER },

    { userId: 11, projectId: 10, projectRole: ProjectRole.PROJECT_MANAGER },
    { userId: 12, projectId: 10, projectRole: ProjectRole.WORKER },
];

const systemHealth: SystemHealth = { uptime: '99.99%', apiHealth: { status: 'Operational', errorRate: 0.2, throughput: 1200 }, databaseHealth: { status: 'Operational', latency: 45 }, storageHealth: { status: 'Operational', usedGB: 125.5, totalGB: 1000 } };
const usageMetrics: UsageMetric[] = [{ companyId: 1, apiCalls: 15000, storageUsed: 125.5, activeUsers: 6 }, { companyId: 2, apiCalls: 8000, storageUsed: 45.2, activeUsers: 3 }];
const platformSettings: PlatformSettings = { mfaRequired: true, logRetentionDays: 90, newTenantOnboardingWorkflow: 'manual', defaultStorageQuotaGB: 50 };
const pendingApprovals: PendingApproval[] = [{ id: 1, type: 'New User', description: 'John Doe from New Client Inc.', companyId: 2 }];

const auditLogs: AuditLog[] = [
    { id: 1, actorId: 2, action: 'TASK_CREATED', timestamp: new Date('2025-01-22T09:00:00Z'), target: { type: 'Task', id: 4, name: 'Install plumbing rough-in' }, projectId: 1 },
    { id: 2, actorId: 3, action: 'TIMESHEET_APPROVED', timestamp: new Date('2025-01-21T10:00:00Z'), target: { type: 'User', id: 3, name: 'David Chen' }, projectId: 1 },
    { id: 3, actorId: 6, action: 'SAFETY_INCIDENT_REPORTED', timestamp: new Date('2025-01-22T10:05:00Z'), target: { type: 'Project', id: 1, name: 'Downtown Office Complex' }, projectId: 1 },
];

const announcements: Announcement[] = [
    { id: 1, senderId: 0, scope: 'platform', title: 'Scheduled Maintenance', content: 'The platform will undergo scheduled maintenance this Sunday from 2 AM to 4 AM GMT.', createdAt: new Date('2025-01-20T12:00:00Z') },
    { id: 2, senderId: 1, scope: 'company', companyId: 1, title: 'Annual Safety Meeting', content: 'The annual all-hands safety meeting will be held next Friday in the main conference room.', createdAt: new Date('2025-01-21T09:00:00Z') },
];

const chatMessages: ChatMessage[] = [];
const conversations: Conversation[] = [
    { id: 1, participants: [1, 2], messages: [{ id: 1, conversationId: 1, senderId: 2, content: 'Hey Michael, can you approve the latest timesheets?', timestamp: new Date(Date.now() - 3600000), isRead: false}], lastMessage: { id: 1, conversationId: 1, senderId: 2, content: 'Hey Michael, can you approve the latest timesheets?', timestamp: new Date(Date.now() - 3600000), isRead: false} },
];

const clients: Client[] = [{ id: 1, companyId: 1, name: 'Innovate Corp', contactEmail: 'contact@innovate.com', contactPhone: '555-1234', createdAt: new Date('2024-11-01') }];
const invoices: Invoice[] = [{ id: 1, companyId: 1, clientId: 1, projectId: 3, status: InvoiceStatus.PAID, total: 150000, amountDue: 0, issuedAt: new Date('2024-08-20'), dueAt: new Date('2024-09-20'), items: [] }];
const quotes: Quote[] = [{ id: 1, companyId: 1, clientId: 1, projectId: 1, status: QuoteStatus.ACCEPTED, total: 4800000, validUntil: new Date('2024-12-31') }];
const equipment: Equipment[] = [{ id: 1, name: 'Excavator EX-200', type: 'Heavy Machinery', status: EquipmentStatus.AVAILABLE, companyId: 1 }, { id: 2, name: 'Crane C-150', type: 'Heavy Machinery', status: EquipmentStatus.IN_USE, companyId: 1, projectId: 1 }];
const resourceAssignments: ResourceAssignment[] = [
    {
        id: 1,
        companyId: 1,
        projectId: 1,
        resourceId: 3, // David Chen
        resourceType: 'user',
        startDate: new Date(new Date().setDate(new Date().getDate() - 2)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 3)),
    },
    {
        id: 2,
        companyId: 1,
        projectId: 1,
        resourceId: 4, // James Wilson
        resourceType: 'user',
        startDate: new Date(new Date().setDate(new Date().getDate())),
        endDate: new Date(new Date().setDate(new Date().getDate() + 6)),
    },
    {
        id: 3,
        companyId: 1,
        projectId: 2,
        resourceId: 5, // Maria Garcia
        resourceType: 'user',
        startDate: new Date(new Date().setDate(new Date().getDate() - 5)),
        endDate: new Date(new Date().setDate(new Date().getDate() - 1)),
    }
];
const operativeReports: OperativeReport[] = [{id: 1, projectId: 1, userId: 3, notes: 'Framing on floor 2 complete.', timestamp: new Date('2025-01-22T16:00:00Z'), photoUrl: 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'}];
const weatherForecasts: WeatherForecast[] = [];
const projectPhotos: ProjectPhoto[] = [{id: 1, projectId: 1, uploaderId: 2, url: 'https://images.pexels.com/photos/585419/pexels-photo-585419.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', caption: 'Site progress as of Jan 22.', timestamp: new Date('2025-01-22T12:00:00Z')}];

const companySettings: CompanySettings[] = [
    { companyId: 1, theme: 'light', notificationPreferences: { projectUpdates: true, timeReminders: true, photoRequirements: false }, locationPreferences: { gpsAccuracy: 'standard', backgroundTracking: true, locationHistoryDays: 30 } },
    { companyId: 2, theme: 'dark', notificationPreferences: { projectUpdates: true, timeReminders: false, photoRequirements: true }, locationPreferences: { gpsAccuracy: 'high', backgroundTracking: true, locationHistoryDays: 60 } },
];
const financialKPIs: FinancialKPIs[] = [
    {
        companyId: 1,
        currency: 'GBP',
        profitability: 22.5,
        profitabilityChange: 1.2,
        projectMargin: 18.3,
        projectMarginChange: -0.5,
        cashFlow: 120450,
        cashFlowChange: 5.8,
    },
    {
        companyId: 2,
        currency: 'USD',
        profitability: 19.8,
        profitabilityChange: -2.1,
        projectMargin: 15.1,
        projectMarginChange: 0.2,
        cashFlow: 85200,
        cashFlowChange: -1.5,
    }
];

const tools: Tool[] = [
  // AI Powered
  { id: 'advisor', name: 'AI Business Advisor', description: 'Conversational assistant for business strategy and operations.', status: ToolStatus.ACTIVE, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', tags: ['AI', 'Strategy'] },
  { id: 'site-inspector', name: 'AI Site Inspector', description: 'Analyze site photos for safety hazards, progress, and quality control.', status: ToolStatus.ACTIVE, icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', tags: ['AI', 'Safety', 'Project'] },
  { id: 'daily-summary', name: 'Daily Summary Generator', description: 'Automatically generate daily progress reports from project data.', status: ToolStatus.NEW, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', tags: ['AI', 'Project', 'Reporting'] },
  
  // Financial Tools
  { id: 'project-estimator', name: 'AI Cost Estimator', description: 'Get high-level cost estimates for potential projects.', status: ToolStatus.ACTIVE, icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', tags: ['AI', 'Finance'] },
  { id: 'funding-bot', name: 'FundingBot', description: 'Discover grants and funding opportunities for your projects.', status: ToolStatus.ACTIVE, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01', tags: ['AI', 'Finance'] },
  { id: 'risk-bot', name: 'RiskBot', description: 'Analyze contracts and documents for financial and compliance risks.', status: ToolStatus.ACTIVE, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', tags: ['AI', 'Finance'] },
  { id: 'bid-generator', name: 'Bid Package Generator', description: 'Assemble tender cover letters and summaries automatically.', status: ToolStatus.DEV_PHASE, icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z', tags: ['AI', 'Finance'] },

  // Project Management
  { id: 'schedule-optimizer', name: 'Schedule Optimizer', description: 'AI-powered resource and task scheduling for maximum efficiency.', status: ToolStatus.COMING_SOON, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', tags: ['AI', 'Project'] },
  { id: 'safety-analysis', name: 'Safety Analysis', description: 'Analyze incident reports to identify trends and recommend actions.', status: ToolStatus.ACTIVE, icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', tags: ['AI', 'Safety', 'Project'] },
  { id: 'workforce-planner', name: 'Workforce Planner', description: 'Visually assign operatives to projects and manage team availability.', status: ToolStatus.NEW, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', tags: ['Project', 'Strategy'] },
];

const projectTemplates: ProjectTemplate[] = [
    {
        id: 1,
        companyId: 1,
        name: 'Standard Residential Build',
        description: 'A template for a typical single-family home construction project from foundation to finish.',
        templateTasks: [
            { id: 'temp-1', text: 'Site Survey & Layout', priority: TodoPriority.HIGH },
            { id: 'temp-2', text: 'Excavation & Foundation', priority: TodoPriority.HIGH },
            { id: 'temp-3', text: 'Framing & Roofing', priority: TodoPriority.HIGH },
            { id: 'temp-4', text: 'Plumbing & Electrical Rough-in', priority: TodoPriority.MEDIUM },
            { id: 'temp-5', text: 'Insulation & Drywall', priority: TodoPriority.MEDIUM },
            { id: 'temp-6', text: 'Interior & Exterior Finishes', priority: TodoPriority.LOW },
            { id: 'temp-7', text: 'Final Landscaping', priority: TodoPriority.LOW },
        ],
        documentCategories: [DocumentCategory.BLUEPRINTS, DocumentCategory.CONTRACT, DocumentCategory.HS],
        safetyProtocols: ['Daily toolbox talks required', 'Hard hats mandatory at all times', 'Fall protection required above 6 feet'],
    },
    {
        id: 2,
        companyId: 1,
        name: 'Commercial Office Fit-out',
        description: 'A template for interior fit-out projects in commercial office spaces.',
        templateTasks: [
            { id: 'temp-8', text: 'Demolition of existing space', priority: TodoPriority.MEDIUM },
            { id: 'temp-9', text: 'HVAC & Electrical Installation', priority: TodoPriority.HIGH },
            { id: 'temp-10', text: 'Partitioning & Ceilings', priority: TodoPriority.HIGH },
            { id: 'temp-11', text: 'Flooring & Painting', priority: TodoPriority.MEDIUM },
            { id: 'temp-12', text: 'Furniture & Fixtures Installation', priority: TodoPriority.LOW },
        ],
        documentCategories: [DocumentCategory.BLUEPRINTS, DocumentCategory.CONTRACT],
        safetyProtocols: ['Hot work permit required for welding/cutting', 'Work area must be cordoned off from public'],
    }
];


// --- EXPORT ---

export const MOCK_DATA = {
    companies, users, projects, todos, timesheets, safetyIncidents, documents,
    projectAssignments, systemHealth, usageMetrics, platformSettings, pendingApprovals,
    auditLogs, announcements, conversations, chatMessages, clients, invoices, quotes,
    equipment, resourceAssignments, companySettings, documentAcks, operativeReports,
    weatherForecasts, projectPhotos, financialKPIs, tools, projectTemplates
};