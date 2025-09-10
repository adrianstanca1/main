import {
    Company, User, Project, Timesheet, Document, Todo,
    Site, Role, TimesheetStatus, WorkType, DocumentStatus, DocumentCategory,
    TodoStatus, TodoPriority, SafetyIncident,
    IncidentSeverity, IncidentType, IncidentStatus, AuditLog, AuditLogAction,
    DocumentAcknowledgement, CompanySettings, Client, Quote, QuoteStatus,
    Invoice, InvoiceStatus, ProjectAssignment, Tool, ToolStatus, Permission, SystemHealth, UsageMetric, FinancialKPIs, PendingApproval, PlatformSettings, Equipment, EquipmentStatus, ProjectPhoto, OperativeReport, DailyLog, Announcement
} from '../types';

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const companies: Company[] = [
    { id: 1, name: 'AS Agents Construction', status: 'Active', subscriptionPlan: 'Enterprise', storageUsageGB: 12.5 },
    { id: 2, name: 'Innovate Builders Inc.', status: 'Active', subscriptionPlan: 'Pro', storageUsageGB: 5.2 },
    { id: 3, name: 'Suspended Contractors', status: 'Suspended', subscriptionPlan: 'Basic', storageUsageGB: 1.1 },
];

const users: User[] = [
    // Platform Super Admin (no companyId)
    { id: 99, name: 'Super Admin', email: 'super@asagents.platform', role: Role.PRINCIPAL_ADMIN, createdAt: daysAgo(1000) },
    
    // AS Agents Users
    { id: 1, name: 'Alice Admin', email: 'alice@asagents.com', role: Role.ADMIN, companyId: 1, createdAt: daysAgo(365) },
    { id: 2, name: 'Peter Manager', email: 'peter@asagents.com', role: Role.PM, companyId: 1, createdAt: daysAgo(200) },
    { id: 3, name: 'Frank Foreman', email: 'frank@asagents.com', role: Role.FOREMAN, companyId: 1, createdAt: daysAgo(150) },
    { id: 4, name: 'Olivia Operative', email: 'olivia@asagents.com', role: Role.OPERATIVE, companyId: 1, createdAt: daysAgo(90) },
    { id: 5, name: 'Sam Safety', email: 'sam@asagents.com', role: Role.SAFETY_OFFICER, companyId: 1, createdAt: daysAgo(180) },

    // Innovate Builders Users
    { id: 6, name: 'Ian Innovate', email: 'ian@innovate.com', role: Role.ADMIN, companyId: 2, createdAt: daysAgo(400) },
    { id: 7, name: 'Mary Manager', email: 'mary@innovate.com', role: Role.PM, companyId: 2, createdAt: daysAgo(300) },
    
    // Suspended Co Users
    { id: 8, name: 'Sue Suspended', email: 'sue@suspended.com', role: Role.ADMIN, companyId: 3, createdAt: daysAgo(500) },
];

const sites: Site[] = [
    { id: 1, name: 'Downtown Core Site', location: { lat: 51.5074, lng: -0.1278 }, radius: 150, companyId: 1, createdAt: daysAgo(100) },
    { id: 2, name: 'Greenwich Peninsula', location: { lat: 51.503, lng: 0.009 }, radius: 200, companyId: 1, createdAt: daysAgo(50) },
    { id: 3, name: 'Innovation Park', location: { lat: 52.2053, lng: 0.1218 }, radius: 250, companyId: 2, createdAt: daysAgo(200) },
];

const projects: Project[] = [
    { id: 101, name: 'Project Alpha (High-Rise)', siteId: 1, companyId: 1, managerId: 2, createdAt: daysAgo(90), location: { address: "123 Main Street, London", lat: 51.5074, lng: -0.1278 }, radius: 150, budget: 5000000, actualCost: 4250000, imageUrl: 'https://placehold.co/600x400/5e8b7e/ffffff?text=Alpha' },
    { id: 102, name: 'Project Bravo (Residential)', siteId: 2, companyId: 1, managerId: 2, createdAt: daysAgo(45), location: { address: "456 River Road, London", lat: 51.503, lng: 0.009 }, radius: 200, budget: 1200000, actualCost: 950000, imageUrl: 'https://placehold.co/600x400/a2d5f2/ffffff?text=Bravo' },
    { id: 201, name: 'Tech Campus Development', siteId: 3, companyId: 2, managerId: 7, createdAt: daysAgo(180), location: { address: "789 Science Ave, Cambridge", lat: 52.2053, lng: 0.1218 }, radius: 250, budget: 10000000, actualCost: 11500000, imageUrl: 'https://placehold.co/600x400/ff8c42/ffffff?text=Tech' },
    { id: 301, name: 'Old Warehouse Retrofit', siteId: 1, companyId: 3, managerId: 8, createdAt: daysAgo(450), location: { address: "1 Old industrial way", lat: 51.5, lng: -0.1 }, radius: 100, budget: 800000, actualCost: 750000 },
];

const projectAssignments: ProjectAssignment[] = [
    { userId: 2, projectId: 101 }, { userId: 3, projectId: 101 }, { userId: 4, projectId: 101 }, { userId: 5, projectId: 101 },
    { userId: 2, projectId: 102 }, { userId: 3, projectId: 102 }, { userId: 4, projectId: 102 },
    { userId: 7, projectId: 201 },
    { userId: 8, projectId: 301 },
];

const timesheets: Timesheet[] = [
    { id: 1, userId: 4, projectId: 101, clockIn: daysAgo(1), clockOut: new Date(daysAgo(1).getTime() + 8 * 3600000), status: TimesheetStatus.APPROVED, workType: WorkType.GENERAL_LABOR, breaks: [], comment: "Completed site cleanup.", clockInLocation: { lat: 51.5074, lng: -0.1278 }, clockOutLocation: { lat: 51.5079, lng: -0.1283 } },
    { id: 2, userId: 4, projectId: 101, clockIn: daysAgo(2), clockOut: new Date(daysAgo(2).getTime() + 8 * 3600000), status: TimesheetStatus.APPROVED, workType: WorkType.FRAMING, breaks: [], comment: "", clockInLocation: { lat: 51.5070, lng: -0.1275 } },
    { id: 3, userId: 4, projectId: 102, clockIn: daysAgo(3), clockOut: new Date(daysAgo(3).getTime() + 7.5 * 3600000), status: TimesheetStatus.PENDING, workType: WorkType.SITE_PREP, breaks: [], comment: "Initial groundwork.", clockInLocation: { lat: 51.503, lng: 0.009 } },
    { id: 4, userId: 4, projectId: 102, clockIn: daysAgo(0), clockOut: null, status: TimesheetStatus.PENDING, workType: WorkType.SITE_PREP, breaks: [], comment: "", clockInLocation: { lat: 51.5035, lng: 0.0095 } },
];

const documents: Document[] = [
    { id: 1, name: 'Alpha-Safety-Plan-v1.pdf', url: '/mock-doc', projectId: 101, status: DocumentStatus.APPROVED, uploadedAt: daysAgo(80), category: DocumentCategory.HS, version: 1, documentGroupId: 1, creatorId: 2 },
    { id: 2, name: 'Alpha-Blueprints-v2.pdf', url: '/mock-doc', projectId: 101, status: DocumentStatus.APPROVED, uploadedAt: daysAgo(75), category: DocumentCategory.BLUEPRINT, version: 2, documentGroupId: 2, creatorId: 2, indexedContent: "All structural steel must be Grade 50. Rebar to be #5." },
    { id: 3, name: 'Alpha-Blueprints-v1.pdf', url: '/mock-doc', projectId: 101, status: DocumentStatus.APPROVED, uploadedAt: daysAgo(85), category: DocumentCategory.BLUEPRINT, version: 1, documentGroupId: 2, creatorId: 2 },
    { id: 4, name: 'Bravo-Site-Survey.pdf', url: '/mock-doc', projectId: 102, status: DocumentStatus.APPROVED, uploadedAt: daysAgo(40), category: DocumentCategory.GENERAL, version: 1, documentGroupId: 3, creatorId: 2 },
];

const todos: Todo[] = [
    { id: 1, text: 'Finalize foundation pouring schedule', status: TodoStatus.IN_PROGRESS, projectId: 101, priority: TodoPriority.HIGH, dueDate: daysFromNow(2), createdAt: daysAgo(5), creatorId: 2, comments: [{ id: 101, text: "Waiting on confirmation from supplier.", creatorId: 3, createdAt: daysAgo(1) }, { id: 102, text: "Supplier confirmed for Tuesday.", creatorId: 2, createdAt: new Date() }] },
    { id: 2, text: 'Order drywall for floors 1-5', status: TodoStatus.TODO, projectId: 101, priority: TodoPriority.MEDIUM, dueDate: daysFromNow(7), createdAt: daysAgo(2), creatorId: 2, subTasks: [{id: 1, text: 'Get 3 quotes', completed: true}, {id: 2, text: 'Confirm delivery date', completed: false}] },
    { id: 3, text: 'Install safety netting on perimeter', status: TodoStatus.DONE, projectId: 101, priority: TodoPriority.HIGH, createdAt: daysAgo(10), creatorId: 3, isSafetyTask: true },
    { id: 4, text: 'Clear and grade the site', status: TodoStatus.TODO, projectId: 102, priority: TodoPriority.HIGH, dueDate: new Date(), createdAt: daysAgo(1), creatorId: 3, subTasks: [{id: 3, text: 'Mark utility lines', completed: true}, {id: 4, text: 'Remove topsoil', completed: false}], comments: [{id: 103, text: 'Make sure to check for irrigation pipes before digging.', creatorId: 2, createdAt: daysAgo(1)}] },
];

const equipment: Equipment[] = [
    { id: 1, name: 'Excavator CAT 320', type: 'Heavy', status: EquipmentStatus.AVAILABLE, companyId: 1 },
    { id: 2, name: 'Skid Steer Loader', type: 'Heavy', status: EquipmentStatus.IN_USE, companyId: 1, projectId: 101 },
    { id: 3, name: 'Concrete Mixer', type: 'Light', status: EquipmentStatus.MAINTENANCE, companyId: 1 },
    { id: 4, name: 'Ford F-150', type: 'Vehicle', status: EquipmentStatus.AVAILABLE, companyId: 1 },
    { id: 5, name: 'Scissor Lift', type: 'Light', status: EquipmentStatus.AVAILABLE, companyId: 2 },
];

const safetyIncidents: SafetyIncident[] = [
    { id: 1, projectId: 101, reporterId: 4, timestamp: daysAgo(15), severity: IncidentSeverity.LOW, type: IncidentType.NEAR_MISS, description: 'A pallet of bricks was left in a walkway.', locationOnSite: 'Level 3, East Wing', status: IncidentStatus.RESOLVED, correctiveActionTaken: 'Pallet moved and area cleared.' },
    { id: 2, projectId: 201, reporterId: 7, timestamp: daysAgo(5), severity: IncidentSeverity.MEDIUM, type: IncidentType.HAZARD_OBSERVATION, description: 'Exposed wiring found near the west entrance.', locationOnSite: 'Ground Floor, West Entrance', status: IncidentStatus.UNDER_REVIEW },
    { id: 3, projectId: 101, reporterId: 3, timestamp: daysAgo(2), severity: IncidentSeverity.MEDIUM, type: IncidentType.HAZARD_OBSERVATION, description: 'Incorrect scaffolding clamps used on level 5.', locationOnSite: 'Level 5, South Face', status: IncidentStatus.REPORTED },
];

const companySettings: CompanySettings[] = [
    { id: 1, companyId: 1, timesheetRetentionDays: 365, theme: 'light', notificationPreferences: { taskDueDate: true, newDocumentAssigned: true, timesheetFlagged: true }, country: 'United Kingdom', currency: 'GBP' },
    { id: 2, companyId: 2, timesheetRetentionDays: 730, theme: 'dark', notificationPreferences: { taskDueDate: true, newDocumentAssigned: false, timesheetFlagged: true }, country: 'United States', currency: 'USD' },
];

const clients: Client[] = [
    {id: 1, name: "Global Property Group", companyId: 1, contactEmail: "contact@gpg.com", contactPhone: "555-1234", address: "1 Financial Square", createdAt: daysAgo(400) },
    {id: 2, name: "City Developments", companyId: 1, contactEmail: "info@citydev.com", contactPhone: "555-5678", address: "200 Urban Drive", createdAt: daysAgo(250) },
];

const invoices: Invoice[] = [
    {id: 1, projectId: 101, clientId: 1, status: InvoiceStatus.PAID, items: [], subtotal: 50000, tax: 10000, total: 60000, amountPaid: 60000, amountDue: 0, issuedAt: daysAgo(30), dueAt: daysAgo(0)},
    {id: 2, projectId: 101, clientId: 1, status: InvoiceStatus.SENT, items: [], subtotal: 75000, tax: 15000, total: 90000, amountPaid: 0, amountDue: 90000, issuedAt: daysAgo(5), dueAt: daysFromNow(25)},
];

const quotes: Quote[] = [
    {id: 1, projectId: 102, clientId: 2, status: QuoteStatus.ACCEPTED, items: [], total: 1200000, createdAt: daysAgo(50), validUntil: daysAgo(20)}
];

const auditLogs: AuditLog[] = [
    { id: 1, projectId: 101, actorId: 2, action: AuditLogAction.TODO_ADDED, target: { type: 'task', id: 2, name: 'Order drywall for floors 1-5' }, timestamp: daysAgo(2) },
    { id: 2, projectId: 101, actorId: 3, action: AuditLogAction.SAFETY_INCIDENT_REPORTED, target: { type: 'incident', id: 3, name: 'Incorrect scaffolding clamps' }, timestamp: daysAgo(2) },
    { id: 3, projectId: 102, actorId: 2, action: AuditLogAction.TIMESHEET_APPROVED, target: { type: 'timesheet', id: 1, name: 'Timesheet for Olivia Operative' }, timestamp: daysAgo(1) },
    { id: 4, projectId: 101, actorId: 4, action: AuditLogAction.DOCUMENT_ACKNOWLEDGED, target: { type: 'document', id: 1, name: 'Alpha-Safety-Plan-v1.pdf' }, timestamp: daysAgo(1) },
    { id: 5, projectId: 102, actorId: 1, action: AuditLogAction.PROJECT_PHOTO_ADDED, target: { type: 'photo', id: 4, name: 'Initial site clearing and grading.' }, timestamp: daysAgo(40) },
    { id: 6, actorId: 99, action: AuditLogAction.TENANT_SUSPENDED, target: { type: 'company', id: 3, name: 'Suspended Contractors' }, timestamp: daysAgo(1) },
];

const tools: Tool[] = [
  { id: 'advisor', name: 'Business Advisor', description: 'Conversational AI for strategic business and operational advice.', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', status: ToolStatus.ACTIVE, tags: ['AI', 'Finance'], usage: 65, requiredPermission: Permission.ACCESS_FINANCIAL_TOOLS },
  { id: 'project-estimator', name: 'AI Project Estimator', description: 'Generate accurate project cost estimates using AI.', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', status: ToolStatus.NEW, tags: ['AI', 'Project', 'Finance'], usage: 92, requiredPermission: Permission.ACCESS_FINANCIAL_TOOLS },
  { id: 'schedule-optimizer', name: 'Resource Scheduler', description: 'Visualize and manage project schedules and resource allocation.', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', status: ToolStatus.ACTIVE, tags: ['Project'], usage: 78, requiredPermission: Permission.ACCESS_PROJECT_TOOLS },
  { id: 'safety-analysis', name: 'AI Safety Analysis', description: 'Analyze incident reports to find trends and get recommendations.', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', status: ToolStatus.ACTIVE, tags: ['AI', 'Safety'], usage: 40, requiredPermission: Permission.ACCESS_SAFETY_TOOLS },
  { id: 'funding-bot', name: 'FundingBot', description: 'Discover grants and funding opportunities.', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', status: ToolStatus.ACTIVE, tags: ['AI', 'Finance'], usage: 45, requiredPermission: Permission.ACCESS_FINANCIAL_TOOLS },
  { id: 'risk-bot', name: 'RiskBot', description: 'Analyze text for compliance and financial risks.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', status: ToolStatus.ACTIVE, tags: ['AI', 'Finance', 'Safety'], usage: 33, requiredPermission: Permission.ACCESS_SAFETY_TOOLS },
  { id: 'bid-generator', name: 'Bid Package Generator', description: 'Assemble tender cover letter, checklist, and summaries.', icon: 'M4 5a2 2 0 012-2h7a2 2 0 012 2v12a2 2 0 01-2-2H6a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h6a1 1 0 100-2H7zm6 4a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-1-4a1 1 0 10-2 0v1h2V6z', status: ToolStatus.NEW, tags: ['AI', 'Project'], usage: 12, requiredPermission: Permission.ACCESS_FINANCIAL_TOOLS },
  { id: 'procurement', name: 'Procurement Manager', description: 'Track materials, requests, and supplier notes.', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', status: ToolStatus.DEV_PHASE, tags: ['Project', 'Finance'], usage: 0, requiredPermission: Permission.ACCESS_FINANCIAL_TOOLS },
  { id: 'daily-summary', name: 'AI Daily Summary', description: 'Generate a daily project summary from tasks, incidents, and reports.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', status: ToolStatus.NEW, tags: ['AI', 'Project'], usage: 0, requiredPermission: Permission.ACCESS_PROJECT_TOOLS },
];

const systemHealth: SystemHealth = {
    uptime: '99.99%',
    apiHealth: { throughput: 1250, errorRate: 0.1 },
    databaseHealth: { latency: 45, connections: 88 },
    storageHealth: { totalUsageGB: 18.8, status: 'Operational' }
};

const usageMetrics: UsageMetric[] = [
    { companyId: 1, period: '2023-10', activeUsers: 5, apiCalls: 15234, storageUsedGB: 12.5, featureAdoption: { tasks: 90, documents: 75, finances: 60 } },
    { companyId: 2, period: '2023-10', activeUsers: 2, apiCalls: 8102, storageUsedGB: 5.2, featureAdoption: { tasks: 85, documents: 60, finances: 40 } },
    { companyId: 3, period: '2023-10', activeUsers: 1, apiCalls: 1250, storageUsedGB: 1.1, featureAdoption: { tasks: 50, documents: 20, finances: 10 } },
];

const financialKPIs: FinancialKPIs[] = [
    { companyId: 1, profitability: 12.5, utilizationRate: 88, projectMargin: 15.2, cashFlow: 125000 },
    { companyId: 2, profitability: 9.8, utilizationRate: 92, projectMargin: 12.1, cashFlow: 85000 },
];

const pendingApprovals: PendingApproval[] = [
    { id: 1, type: 'Timesheet', description: "Olivia Operative - 40 hours", submittedBy: "Olivia Operative", projectId: 101, companyId: 1, date: daysAgo(1) },
    { id: 2, type: 'Invoice', description: "INV-0003 for Global Property", submittedBy: "Peter Manager", projectId: 101, companyId: 1, date: daysAgo(2) },
    { id: 3, type: 'Tenant Signup', description: "Innovate Builders Inc.", submittedBy: "System", companyId: 2, date: daysAgo(400) },
];

const platformSettings: PlatformSettings = {
    defaultDbType: 'PostgreSQL',
    defaultStorageQuotaGB: 50,
    mfaRequired: true,
    logRetentionDays: 365,
    newTenantOnboardingWorkflow: 'manual',
};

const projectPhotos: ProjectPhoto[] = [
    { id: 1, projectId: 101, url: 'https://placehold.co/800x600/5e8b7e/ffffff?text=Foundation+Pour', caption: 'Foundation pouring complete for the west wing.', uploaderId: 2, createdAt: daysAgo(20) },
    { id: 2, projectId: 101, url: 'https://placehold.co/800x600/5e8b7e/ffffff?text=Steel+Frame', caption: 'Steel framing reaching the 5th floor.', uploaderId: 3, createdAt: daysAgo(10) },
    { id: 3, projectId: 101, url: 'https://placehold.co/800x600/5e8b7e/ffffff?text=Curtain+Wall', caption: 'Curtain wall installation has begun.', uploaderId: 2, createdAt: daysAgo(2) },
    { id: 4, projectId: 102, url: 'https://placehold.co/800x600/a2d5f2/ffffff?text=Site+Clearing', caption: 'Initial site clearing and grading.', uploaderId: 3, createdAt: daysAgo(40) },
];

const operativeReports: OperativeReport[] = [
    { id: 1, userId: 4, projectId: 101, date: daysAgo(5), notes: "Completed interior fittings on floor 2. All clear.", photoUrl: "https://placehold.co/800x600/6a6a6a/ffffff?text=Floor+2+Fittings", status: 'Approved' },
    { id: 2, userId: 4, projectId: 101, date: daysAgo(3), notes: "Minor delay due to weather, but back on track. Inspected safety harnesses.", photoUrl: "https://placehold.co/800x600/6a6a6a/ffffff?text=Harness+Check", status: 'Pending' },
    { id: 3, userId: 4, projectId: 102, date: daysAgo(15), notes: "Plumbing rough-in for unit 1A is complete.", photoUrl: "https://placehold.co/800x600/7a7a7a/ffffff?text=Plumbing+1A", status: 'Approved' },
];

const dailyLogs: DailyLog[] = [
    { id: 1, projectId: 101, authorId: 4, date: daysAgo(1), weather: 'Sunny', temperature: 22, notes: 'Productive day. All teams on schedule. No issues reported.'},
    { id: 2, projectId: 102, authorId: 4, date: daysAgo(1), weather: 'Cloudy', temperature: 18, notes: 'Site prep is nearly complete. Waiting on final survey markers.'},
];

const announcements: Announcement[] = [
    { id: 1, senderId: 99, scope: 'platform', title: 'Platform Maintenance Alert', content: 'The platform will be undergoing scheduled maintenance this Saturday from 2 AM to 4 AM GMT. Please expect intermittent downtime.', createdAt: daysAgo(1) },
    { id: 2, senderId: 1, scope: 'company', companyId: 1, title: 'Holiday Office Closure', content: 'A reminder that all AS Agents sites and offices will be closed for the upcoming bank holiday on Monday.', createdAt: daysAgo(3) },
];


export const MOCK_DATA = {
    companies,
    users,
    sites,
    projects,
    projectAssignments,
    timesheets,
    documents,
    documentAcks: [] as DocumentAcknowledgement[],
    todos,
    auditLogs,
    safetyIncidents,
    companySettings,
    dailyLogs,
    equipment,
    resourceAssignments: [],
    rfis: [],
    operativeReports,
    clients,
    quotes,
    invoices,
    tools,
    systemHealth,
    usageMetrics,
    financialKPIs,
    pendingApprovals,
    platformSettings,
    projectPhotos,
    announcements,
};