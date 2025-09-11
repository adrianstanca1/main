// This file contains the initial mock data for the application.
import {
  User, Company, Project, Todo, Timesheet, Document, SafetyIncident,
  FinancialKPIs, Invoice, Quote, Client, Equipment, ResourceAssignment,
  ProjectAssignment, Announcement, Conversation, ChatMessage,
  ProjectTemplate, PlatformSettings, PendingApproval, AuditLog, UsageMetric, SystemHealth, CompanySettings,
  Role, TodoStatus, TodoPriority, WorkType, TimesheetStatus, DocumentCategory,
  DocumentStatus, IncidentSeverity, IncidentType, IncidentStatus, EquipmentStatus,
  InvoiceStatus, QuoteStatus, ProjectRole, Tool, ToolStatus, MonthlyFinancials, CostBreakdown, DocumentAcknowledgement, ProjectPhoto, OperativeReport
} from '../types';

// --- USERS & COMPANIES ---
export const companies: Company[] = [
    { id: 1, name: 'ConstructCo', status: 'Active', subscriptionPlan: 'Pro', storageUsageGB: 25.5 },
    { id: 2, name: 'BuildRight Inc.', status: 'Active', subscriptionPlan: 'Enterprise', storageUsageGB: 150.2 },
    { id: 3, name: 'Renovate Now', status: 'Suspended', subscriptionPlan: 'Basic', storageUsageGB: 4.8 },
];

export const users: User[] = [
    // Principal Admin (system-level)
    { id: 1, name: 'Alex Admin', email: 'alex@system.com', role: Role.PRINCIPAL_ADMIN, companyId: 0 },
    
    // ConstructCo Users
    { id: 10, name: 'Charlie Admin', email: 'charlie@constructco.com', role: Role.ADMIN, companyId: 1 },
    { id: 11, name: 'Penelope Manager', email: 'penelope@constructco.com', role: Role.PM, companyId: 1 },
    { id: 12, name: 'Frank Foreman', email: 'frank@constructco.com', role: Role.FOREMAN, companyId: 1 },
    { id: 13, name: 'Olivia Operative', email: 'olivia@constructco.com', role: Role.OPERATIVE, companyId: 1 },
    { id: 14, name: 'Sam Safety', email: 'sam@constructco.com', role: Role.SAFETY_OFFICER, companyId: 1 },
    { id: 15, name: 'Oscar Operative', email: 'oscar@constructco.com', role: Role.OPERATIVE, companyId: 1 },

    // BuildRight Inc. Users
    { id: 20, name: 'Brenda Boss', email: 'brenda@buildright.com', role: Role.ADMIN, companyId: 2 },
    { id: 21, name: 'Peter Projectson', email: 'peter@buildright.com', role: Role.PM, companyId: 2 },
    { id: 22, name: 'Owen Operator', email: 'owen@buildright.com', role: Role.OPERATIVE, companyId: 2 },
];

// --- PROJECTS ---
export const projects: Project[] = [
    { id: 101, companyId: 1, name: 'Downtown Tower Renovation', location: { address: '123 Main St, London', lat: 51.5074, lng: -0.1278 }, budget: 5000000, actualCost: 2300000, startDate: new Date('2023-10-01'), imageUrl: 'https://picsum.photos/seed/project1/800/400', status: 'Active', projectType: 'Commercial', workClassification: 'Renovation', geofenceRadius: 200 },
    { id: 102, companyId: 1, name: 'Suburban Office Park', location: { address: '456 Oak Ave, Manchester', lat: 53.4808, lng: -2.2426 }, budget: 12000000, actualCost: 11500000, startDate: new Date('2023-05-15'), imageUrl: 'https://picsum.photos/seed/project2/800/400', status: 'Completed', projectType: 'Commercial', workClassification: 'New Build' },
    { id: 201, companyId: 2, name: 'Waterfront Luxury Condos', location: { address: '789 Beach Rd, Brighton', lat: 50.8225, lng: -0.1372 }, budget: 25000000, actualCost: 18000000, startDate: new Date('2024-01-20'), imageUrl: 'https://picsum.photos/seed/project3/800/400', status: 'Active', projectType: 'Residential', workClassification: 'New Build', geofenceRadius: 300 },
];

// --- TODOS ---
export const todos: Todo[] = [
    { id: 1, text: 'Submit structural drawings for approval', projectId: 101, creatorId: 11, assigneeId: 11, status: TodoStatus.DONE, priority: TodoPriority.HIGH, createdAt: new Date('2024-05-01'), completedAt: new Date('2024-05-10'), dueDate: new Date('2024-05-15') },
    { id: 2, text: 'Order HVAC units for floors 10-15', projectId: 101, creatorId: 11, assigneeId: 12, status: TodoStatus.IN_PROGRESS, priority: TodoPriority.HIGH, createdAt: new Date('2024-05-12'), dueDate: new Date('2024-06-20'), reminderAt: new Date(Date.now() + 60000) },
    { id: 3, text: 'Finalize paint selection with client', projectId: 101, creatorId: 11, assigneeId: 11, status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, createdAt: new Date('2024-05-20'), dueDate: new Date('2024-06-25') },
    { id: 4, text: 'Install perimeter fencing', projectId: 201, creatorId: 21, assigneeId: 22, status: TodoStatus.TODO, priority: TodoPriority.HIGH, createdAt: new Date('2024-05-18'), comments: [{id: 1, creatorId: 21, text: 'Make sure this is done before excavation begins.', createdAt: new Date() }] },
    { id: 5, text: 'Review soil report', projectId: 201, creatorId: 21, status: TodoStatus.IN_PROGRESS, priority: TodoPriority.MEDIUM, createdAt: new Date('2024-05-21') },
];

// --- TIMESHEETS ---
export const timesheets: Timesheet[] = [
    { id: 1, userId: 13, projectId: 101, clockIn: new Date('2024-05-20T08:00:00'), clockOut: new Date('2024-05-20T17:00:00'), breaks: [{ startTime: new Date('2024-05-20T12:00:00'), endTime: new Date('2024-05-20T12:30:00') }], workType: WorkType.GENERAL_LABOR, status: TimesheetStatus.APPROVED, clockInLocation: { lat: 51.5074, lng: -0.1278, address: '' } },
    { id: 2, userId: 15, projectId: 101, clockIn: new Date('2024-05-21T08:05:00'), clockOut: new Date('2024-05-21T16:55:00'), breaks: [{ startTime: new Date('2024-05-21T12:00:00'), endTime: new Date('2024-05-21T12:30:00') }], workType: WorkType.EQUIPMENT_OPERATION, status: TimesheetStatus.PENDING, clockInLocation: { lat: 51.5070, lng: -0.1270, address: '' }, trustScore: 0.7, trustReasons: { geofence: 'User was 150m outside geofence' } },
    { id: 3, userId: 22, projectId: 201, clockIn: new Date('2024-05-21T07:58:00'), clockOut: null, breaks: [], workType: WorkType.SITE_PREP, status: TimesheetStatus.PENDING, clockInLocation: { lat: 50.8225, lng: -0.1372, address: '' }, checkInPhotoUrl: 'https://picsum.photos/seed/checkin/200' },
    { id: 4, userId: 13, projectId: 101, clockIn: new Date('2024-05-19T08:00:00'), clockOut: new Date('2024-05-19T17:00:00'), breaks: [], workType: WorkType.GENERAL_LABOR, status: TimesheetStatus.REJECTED, rejectionReason: 'Forgot to log break.' },
];

// --- DOCUMENTS ---
export const documents: Document[] = [
    { id: 1, name: 'H&S Manual v2.1.pdf', projectId: 101, category: DocumentCategory.HS, status: DocumentStatus.APPROVED, uploadedAt: new Date('2024-04-10'), version: 2, url: '/sample.pdf', creatorId: 10 },
    { id: 2, name: 'Structural Drawings - Floors 10-15.dwg', projectId: 101, category: DocumentCategory.DRAWINGS, status: DocumentStatus.APPROVED, uploadedAt: new Date('2024-05-01'), version: 1, url: '/sample.pdf', creatorId: 11 },
    { id: 3, name: 'Foundation Permit.pdf', projectId: 201, category: DocumentCategory.PERMITS, status: DocumentStatus.APPROVED, uploadedAt: new Date('2024-04-25'), version: 1, url: '/sample.pdf', creatorId: 20 },
];
export const documentAcks: DocumentAcknowledgement[] = [
    { id: 1, userId: 12, documentId: 1, timestamp: new Date() }
];

// --- SAFETY ---
export const safetyIncidents: SafetyIncident[] = [
    { id: 1, projectId: 101, reporterId: 12, timestamp: new Date('2024-05-15T10:30:00'), severity: IncidentSeverity.LOW, type: IncidentType.HAZARD_OBSERVATION, description: 'Trailing cables near site entrance', locationOnSite: 'Ground Floor Entrance', status: IncidentStatus.RESOLVED },
    { id: 2, projectId: 201, reporterId: 22, timestamp: new Date('2024-05-20T14:00:00'), severity: IncidentSeverity.MEDIUM, type: IncidentType.NEAR_MISS, description: 'Small piece of debris fell from scaffolding, landed 2m away from worker.', locationOnSite: 'East face, level 2', status: IncidentStatus.UNDER_REVIEW },
];
export const operativeReports: OperativeReport[] = [
    { id: 1, projectId: 101, userId: 13, notes: 'Completed drywall installation on Floor 5, Section A.', timestamp: new Date('2024-05-22'), photoUrl: 'https://picsum.photos/seed/report1/400' }
];
export const projectPhotos: ProjectPhoto[] = [
    { id: 1, projectId: 101, uploaderId: 11, url: 'https://picsum.photos/seed/photo1/400', caption: 'Progress on the East Wing facade.', timestamp: new Date('2024-05-20') }
];


// --- FINANCIALS ---
export const clients: Client[] = [
    { id: 1, companyId: 1, name: 'Global Property Group', contactEmail: 'contact@gpg.com', contactPhone: '555-0101', createdAt: new Date('2022-01-15')},
    { id: 2, companyId: 2, name: 'Seaside Developments', contactEmail: 'info@seaside.dev', contactPhone: '555-0102', createdAt: new Date('2023-03-20') },
];
export const invoices: Invoice[] = [
    { id: 1, companyId: 1, clientId: 1, projectId: 101, total: 250000, amountDue: 250000, issuedAt: new Date('2024-05-01'), dueAt: new Date('2024-05-31'), status: InvoiceStatus.SENT, items: [] },
    { id: 2, companyId: 1, clientId: 1, projectId: 102, total: 120000, amountDue: 0, issuedAt: new Date('2024-04-15'), dueAt: new Date('2024-05-15'), status: InvoiceStatus.PAID, items: [] },
];
export const quotes: Quote[] = [
    { id: 1, companyId: 1, clientId: 1, projectId: 101, total: 5000000, issuedAt: new Date('2023-08-01'), validUntil: new Date('2023-09-01'), status: QuoteStatus.ACCEPTED },
];
export const monthlyFinancials: MonthlyFinancials[] = [
    { month: 'Jan', revenue: 120000, costs: 80000, profit: 40000 },
    { month: 'Feb', revenue: 150000, costs: 95000, profit: 55000 },
    { month: 'Mar', revenue: 135000, costs: 90000, profit: 45000 },
    { month: 'Apr', revenue: 180000, costs: 110000, profit: 70000 },
    { month: 'May', revenue: 160000, costs: 105000, profit: 55000 },
    { month: 'Jun', revenue: 210000, costs: 130000, profit: 80000 },
];
export const costBreakdown: CostBreakdown[] = [
    { category: 'Labor', amount: 450000 },
    { category: 'Materials', amount: 800000 },
    { category: 'Subcontractors', amount: 650000 },
    { category: 'Permits', amount: 50000 },
    { category: 'Other', amount: 120000 },
];

// --- EQUIPMENT & RESOURCES ---
export const equipment: Equipment[] = [
    { id: 1, companyId: 1, name: 'Excavator EX-2000', type: 'Heavy Machinery', status: EquipmentStatus.IN_USE, projectId: 101 },
    { id: 2, companyId: 1, name: 'Crane C-150', type: 'Heavy Machinery', status: EquipmentStatus.AVAILABLE },
    { id: 3, companyId: 2, name: 'Skid Steer S-50', type: 'Light Machinery', status: EquipmentStatus.MAINTENANCE },
];
export const resourceAssignments: ResourceAssignment[] = [
    { id: 1, companyId: 1, projectId: 101, resourceId: 1, resourceType: 'equipment', startDate: new Date('2024-05-01'), endDate: new Date('2024-05-30') },
    { id: 2, companyId: 1, projectId: 101, resourceId: 13, resourceType: 'user', startDate: new Date('2024-05-20'), endDate: new Date('2024-05-24') },
];

// --- TEAM ---
export const projectAssignments: ProjectAssignment[] = [
    // ConstructCo
    { id: 1, userId: 11, projectId: 101, projectRole: ProjectRole.MANAGER },
    { id: 2, userId: 11, projectId: 102, projectRole: ProjectRole.MANAGER },
    { id: 3, userId: 12, projectId: 101, projectRole: ProjectRole.FOREMAN },
    { id: 4, userId: 13, projectId: 101, projectRole: ProjectRole.OPERATIVE },
    { id: 5, userId: 14, projectId: 101, projectRole: ProjectRole.SAFETY_LEAD },
    { id: 6, userId: 15, projectId: 101, projectRole: ProjectRole.OPERATIVE },
    // BuildRight
    { id: 7, userId: 21, projectId: 201, projectRole: ProjectRole.MANAGER },
    { id: 8, userId: 22, projectId: 201, projectRole: ProjectRole.OPERATIVE },
];

// --- COMMUNICATION ---
export const announcements: Announcement[] = [
    { id: 1, senderId: 1, scope: 'platform', title: 'System Maintenance Scheduled', content: 'The platform will be down for scheduled maintenance this Saturday.', createdAt: new Date('2024-05-20')},
    { id: 2, senderId: 10, scope: 'company', companyId: 1, title: 'New H&S Policy Update', content: 'Please review the updated Health & Safety manual in the Documents section.', createdAt: new Date('2024-05-18') },
];
export const conversations: Conversation[] = [
    {
        id: 1, participants: [11, 12],
        messages: [{ id: 1, conversationId: 1, senderId: 11, content: "Hey Frank, how's progress on the 10th floor?", timestamp: new Date(Date.now() - 3600000), isRead: true }],
        lastMessage: { id: 1, conversationId: 1, senderId: 11, content: "Hey Frank, how's progress on the 10th floor?", timestamp: new Date(Date.now() - 3600000), isRead: true }
    },
    {
        id: 2, participants: [11, 14],
        messages: [{ id: 2, conversationId: 2, senderId: 14, content: 'Can you check the incident report from yesterday?', timestamp: new Date(Date.now() - 120000), isRead: false }],
        lastMessage: { id: 2, conversationId: 2, senderId: 14, content: 'Can you check the incident report from yesterday?', timestamp: new Date(Date.now() - 120000), isRead: false }
    },
];

// --- TEMPLATES ---
export const projectTemplates: ProjectTemplate[] = [
    {
        id: 1, companyId: 1, name: 'Standard Commercial Build', description: 'Template for new commercial construction projects.',
        templateTasks: [
            { id: 't1', text: 'Site survey and soil testing', priority: TodoPriority.HIGH },
            { id: 't2', text: 'Apply for initial permits', priority: TodoPriority.HIGH },
            { id: 't3', text: 'Develop site safety plan', priority: TodoPriority.MEDIUM },
        ],
        documentCategories: [DocumentCategory.PERMITS, DocumentCategory.HS, DocumentCategory.DRAWINGS],
        safetyProtocols: ['Hard hats required on site at all times.', 'Daily safety briefing before work commences.'],
    }
];

// --- AI & TOOLS ---
export const tools: Tool[] = [
    { id: 'advisor', name: 'AI Business Advisor', description: 'Get strategic advice on cash flow, risks, and operations.', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', status: ToolStatus.ACTIVE, tags: ['AI', 'Business'] },
    { id: 'project-estimator', name: 'AI Project Cost Estimator', description: 'Generate high-level cost estimates for potential projects.', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', status: ToolStatus.ACTIVE, tags: ['AI', 'Finance'] },
    { id: 'safety-analysis', name: 'AI Safety Analysis', description: 'Analyze incident reports to identify trends and get recommendations.', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', status: ToolStatus.ACTIVE, tags: ['AI', 'Safety'] },
    { id: 'funding-bot', name: 'FundingBot', description: 'Discover grants and funding opportunities.', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945C20.437 11.597 21 12.723 21 14v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4c0-1.277.563-2.403 1.055-3.001zM14 11V3m0 0L-1 3m1 1a2 2 0 012-2h4a2 2 0 012 2v8', status: ToolStatus.NEW, tags: ['AI', 'Finance'] },
    { id: 'risk-bot', name: 'RiskBot', description: 'Analyze text for compliance and financial risks.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', status: ToolStatus.ACTIVE, tags: ['AI', 'Compliance'] },
    { id: 'bid-generator', name: 'Bid Package Generator', description: 'Assemble tender cover letter, checklist, and summaries.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', status: ToolStatus.ACTIVE, tags: ['AI', 'Business'] },
    { id: 'daily-summary', name: 'Daily Summary Generator', description: 'Generate a daily progress report for any project.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', status: ToolStatus.ACTIVE, tags: ['AI', 'Project'] },
    { id: 'site-inspector', name: 'AI Site Inspector', description: 'Analyze site photos for safety hazards and progress.', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', status: ToolStatus.NEW, tags: ['AI', 'Safety', 'Project'] },
    { id: 'workforce-planner', name: 'Workforce Planner', description: 'Drag-and-drop operatives onto project timelines.', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', status: ToolStatus.ACTIVE, tags: ['Project'] },
    { id: 'schedule-optimizer', name: 'Schedule Optimizer', description: 'AI-powered project schedule optimization.', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', status: ToolStatus.DEV_PHASE, tags: ['AI', 'Project'] },
];

// --- PRINCIPAL ADMIN ---
export const systemHealth: SystemHealth = {
  uptime: '99.98%',
  apiHealth: { status: 'Operational', throughput: 1200, errorRate: 0.1 },
  databaseHealth: { status: 'Operational', latency: 45 },
  storageHealth: { status: 'Operational', totalUsedGB: 175.7 },
};
export const usageMetrics: UsageMetric[] = [
    { companyId: 1, apiCalls: 125000, storageUsedGB: 25.5, activeUsers: 5 },
    { companyId: 2, apiCalls: 890000, storageUsedGB: 150.2, activeUsers: 3 },
];
export const platformSettings: PlatformSettings = {
    newTenantOnboardingWorkflow: 'manual',
    defaultStorageQuotaGB: 10,
    mfaRequired: false,
    logRetentionDays: 90,
};
export const pendingApprovals: PendingApproval[] = [
    { id: 1, companyId: 3, type: 'New Company', description: 'Renovate Now' }
];
export let auditLogs: AuditLog[] = [
    { id: 1, timestamp: new Date(Date.now() - 3600000 * 2), actorId: 10, action: 'Approved Timesheet', target: { id: 1, type: 'Timesheet', name: 'Timesheet #1' }, projectId: 101 },
    { id: 2, timestamp: new Date(Date.now() - 3600000 * 5), actorId: 11, action: 'Created Task', target: { id: 3, type: 'Task', name: 'Finalize paint selection with client' }, projectId: 101 },
];

// --- COMPANY SETTINGS ---
export const companySettings: CompanySettings[] = [
    { companyId: 1, theme: 'light', notificationPreferences: { projectUpdates: true, timeReminders: true, photoRequirements: false }, locationPreferences: { gpsAccuracy: 'standard', backgroundTracking: true, locationHistoryDays: 30 } },
    { companyId: 2, theme: 'dark', notificationPreferences: { projectUpdates: true, timeReminders: false, photoRequirements: true }, locationPreferences: { gpsAccuracy: 'high', backgroundTracking: true, locationHistoryDays: 90 } },
];