import { Type } from "@google/genai";

export enum Role {
    PRINCIPAL_ADMIN = 'Principal Admin',
    ADMIN = 'Company Admin',
    PM = 'Project Manager',
    OPERATIVE = 'Operative',
    FOREMAN = 'Foreman',
    SAFETY_OFFICER = 'Safety Officer'
}

// A centralized permissions system
export enum Permission {
    // Platform-level permissions
    MANAGE_TENANTS = 'MANAGE_TENANTS', // Invite, suspend, archive companies
    VIEW_PLATFORM_METRICS = 'VIEW_PLATFORM_METRICS',

    // Company-level permissions
    VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
    VIEW_ASSIGNED_PROJECTS = 'VIEW_ASSIGNED_PROJECTS',
    MANAGE_PROJECTS = 'MANAGE_PROJECTS', // Create, edit project settings
    VIEW_ALL_TIMESHEETS = 'VIEW_ALL_TIMESHEETS',
    MANAGE_TIMESHEETS = 'MANAGE_TIMESHEETS', // Approve, reject
    VIEW_OWN_TIMESHEETS = 'VIEW_OWN_TIMESHEETS',
    SUBMIT_TIMESHEET = 'SUBMIT_TIMESHEET',
    MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS', // Upload, delete, manage versions
    VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
    ACKNOWLEDGE_DOCUMENTS = 'ACKNOWLEDGE_DOCUMENTS',
    MANAGE_TEAM = 'MANAGE_TEAM', // Add, remove users from company/project
    VIEW_TEAM = 'VIEW_TEAM',
    MANAGE_TASKS = 'MANAGE_TASKS', // Create, edit, assign tasks
    VIEW_TASKS = 'VIEW_TASKS',
    UPDATE_OWN_TASK_STATUS = 'UPDATE_OWN_TASK_STATUS',
    MANAGE_FINANCES = 'MANAGE_FINANCES', // Invoices, Quotes, Clients
    VIEW_FINANCES = 'VIEW_FINANCES',
    MANAGE_SAFETY_REPORTS = 'MANAGE_SAFETY_REPORTS',
    VIEW_SAFETY_REPORTS = 'VIEW_SAFETY_REPORTS',
    SUBMIT_SAFETY_REPORT = 'SUBMIT_SAFETY_REPORT',
    SUBMIT_DAILY_REPORT = 'SUBMIT_DAILY_REPORT',
    VIEW_COMPANY_SETTINGS = 'VIEW_COMPANY_SETTINGS',
    MANAGE_COMPANY_SETTINGS = 'MANAGE_COMPANY_SETTINGS',
    ACCESS_ALL_TOOLS = 'ACCESS_ALL_TOOLS',
    ACCESS_PROJECT_TOOLS = 'ACCESS_PROJECT_TOOLS',
    ACCESS_FINANCIAL_TOOLS = 'ACCESS_FINANCIAL_TOOLS',
    ACCESS_SAFETY_TOOLS = 'ACCESS_SAFETY_TOOLS',
    MANAGE_EQUIPMENT = 'MANAGE_EQUIPMENT',
    SEND_ANNOUNCEMENT = 'SEND_ANNOUNCEMENT',
}

// Defines which permissions each role has. This is the single source of truth for access control.
export const RolePermissions: Record<Role, Set<Permission>> = {
    [Role.PRINCIPAL_ADMIN]: new Set(Object.values(Permission)), // Super admin has all permissions
    [Role.ADMIN]: new Set([
        Permission.VIEW_ALL_PROJECTS, Permission.MANAGE_PROJECTS,
        Permission.VIEW_ALL_TIMESHEETS, Permission.MANAGE_TIMESHEETS,
        Permission.MANAGE_DOCUMENTS, Permission.VIEW_DOCUMENTS,
        Permission.MANAGE_TEAM, Permission.VIEW_TEAM,
        Permission.MANAGE_TASKS, Permission.VIEW_TASKS,
        Permission.MANAGE_FINANCES, Permission.VIEW_FINANCES,
        Permission.MANAGE_SAFETY_REPORTS, Permission.VIEW_SAFETY_REPORTS,
        Permission.VIEW_COMPANY_SETTINGS, Permission.MANAGE_COMPANY_SETTINGS,
        Permission.ACCESS_ALL_TOOLS, Permission.ACCESS_PROJECT_TOOLS, Permission.ACCESS_FINANCIAL_TOOLS, Permission.ACCESS_SAFETY_TOOLS,
        Permission.MANAGE_EQUIPMENT, Permission.SEND_ANNOUNCEMENT,
    ]),
    [Role.PM]: new Set([
        Permission.VIEW_ASSIGNED_PROJECTS, Permission.MANAGE_PROJECTS, // Can manage projects they are assigned to
        Permission.VIEW_ALL_TIMESHEETS, Permission.MANAGE_TIMESHEETS, // For their projects
        Permission.MANAGE_DOCUMENTS, Permission.VIEW_DOCUMENTS,
        Permission.MANAGE_TEAM, Permission.VIEW_TEAM, // Can manage team on their projects
        Permission.MANAGE_TASKS, Permission.VIEW_TASKS,
        Permission.MANAGE_FINANCES, Permission.VIEW_FINANCES,
        Permission.MANAGE_SAFETY_REPORTS, Permission.VIEW_SAFETY_REPORTS,
        Permission.SUBMIT_DAILY_REPORT,
        Permission.ACCESS_PROJECT_TOOLS, Permission.ACCESS_SAFETY_TOOLS,
        Permission.MANAGE_EQUIPMENT, Permission.SEND_ANNOUNCEMENT,
    ]),
    [Role.FOREMAN]: new Set([
        Permission.VIEW_ASSIGNED_PROJECTS,
        Permission.MANAGE_TASKS, Permission.VIEW_TASKS,
        Permission.MANAGE_DOCUMENTS, // Can upload site photos, daily logs
        Permission.VIEW_DOCUMENTS,
        Permission.SUBMIT_SAFETY_REPORT, Permission.VIEW_SAFETY_REPORTS,
        Permission.SUBMIT_DAILY_REPORT,
        Permission.VIEW_TEAM // Can see their project team
    ]),
    [Role.SAFETY_OFFICER]: new Set([
        Permission.VIEW_ALL_PROJECTS, // Needs to see all projects for safety context
        Permission.VIEW_DOCUMENTS, Permission.ACKNOWLEDGE_DOCUMENTS,
        Permission.MANAGE_SAFETY_REPORTS, Permission.VIEW_SAFETY_REPORTS,
        Permission.ACCESS_SAFETY_TOOLS
    ]),
    [Role.OPERATIVE]: new Set([
        Permission.VIEW_OWN_TIMESHEETS, Permission.SUBMIT_TIMESHEET,
        Permission.VIEW_ASSIGNED_PROJECTS,
        Permission.VIEW_DOCUMENTS, Permission.ACKNOWLEDGE_DOCUMENTS,
        Permission.UPDATE_OWN_TASK_STATUS, Permission.VIEW_TASKS,
        Permission.SUBMIT_SAFETY_REPORT, Permission.SUBMIT_DAILY_REPORT,
        Permission.VIEW_TEAM // See who is on their project
    ]),
};


export interface Company {
    id: number;
    name: string;
    status: 'Active' | 'Suspended' | 'Archived';
    subscriptionPlan?: 'Basic' | 'Pro' | 'Enterprise';
    storageUsageGB?: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
    companyId?: number; // Foreign Key to Company, optional for Principal Admin
    createdAt: Date;
}

export interface Site {
    id: number;
    name: string;
    location: { lat: number; lng: number };
    radius: number;
    companyId: number; // Foreign Key to Company
    createdAt: Date;
}

export interface Project {
    id: number;
    name: string;
    siteId: number; // Foreign Key to Site
    companyId: number; // Foreign Key to Company
    managerId: number; // Foreign Key to User
    createdAt: Date;
    location: {
        address: string;
        lat: number;
        lng: number;
    };
    radius: number;
    budget: number;
    actualCost: number;
    imageUrl?: string;
}

export enum TimesheetStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    FLAGGED = 'Flagged for Review'
}

export enum WorkType {
    GENERAL_LABOR = 'General Labor',
    EQUIPMENT_OPERATION = 'Equipment Operation',
    SITE_PREP = 'Site Prep',
    CONCRETE = 'Concrete',
    FRAMING = 'Framing',
    ELECTRICAL = 'Electrical',
    PLUMBING = 'Plumbing'
}

export interface Break {
    startTime: Date;
    endTime: Date | null;
}

export interface Timesheet {
    id: number;
    userId: number; // Foreign Key to User
    projectId: number; // Foreign Key to Project
    clockIn: Date;
    clockOut: Date | null;
    status: TimesheetStatus;
    clockInLocation?: { lat: number; lng: number };
    clockOutLocation?: { lat: number; lng: number };
    trustScore?: number;
    trustReasons?: Record<string, any>;
    workType: WorkType;
    breaks: Break[];
    comment: string;
}

export enum DocumentStatus {
    UPLOADING = 'Uploading',
    SCANNING = 'Scanning',
    APPROVED = 'Approved',
    QUARANTINED = 'Quarantined'
}

export enum DocumentCategory {
    HS = 'H&S',
    BLUEPRINT = 'Blueprint',
    GENERAL = 'General',
    POLICY = 'Policy'
}

export interface Document {
    id: number;
    name: string;
    url: string;
    projectId: number; // Foreign Key to Project
    status: DocumentStatus;
    uploadedAt: Date;
    category: DocumentCategory;
    indexedContent?: string;
    version: number;
    documentGroupId: number;
    relatedDocumentIds?: number[];
    creatorId: number; // Foreign Key to User
}

export enum TodoStatus {
    TODO = 'To Do',
    IN_PROGRESS = 'In Progress',
    DONE = 'Done'
}

export enum TodoPriority {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High'
}

export interface SubTask {
    id: number;
    text: string;
    completed: boolean;
}

export interface Comment {
    id: number;
    text: string;
    creatorId: number; // Foreign Key to User
    createdAt: Date;
}

export interface Todo {
    id: number | string; // Allow string for temporary offline IDs
    text: string;
    status: TodoStatus;
    projectId: number; // Foreign Key to Project
    priority: TodoPriority;
    dueDate?: Date;
    dependsOn?: number;
    subTasks?: SubTask[];
    comments?: Comment[];
    createdAt: Date;
    creatorId: number; // Foreign Key to User
    reminderAt?: Date;
    isOffline?: boolean; // Flag for UI to show it's not synced
    isSafetyTask?: boolean;
}

export interface ProjectAssignment {
    userId: number; // Foreign Key to User
    projectId: number; // Foreign Key to Project
}

export interface DocumentAcknowledgement {
    id: number;
    userId: number; // Foreign Key to User
    documentId: number; // Foreign Key to Document
    acknowledgedAt: Date;
}

export interface NotificationPreferences {
    taskDueDate: boolean;
    newDocumentAssigned: boolean;
    timesheetFlagged: boolean;
}

export interface CompanySettings {
    id: number;
    companyId: number; // Foreign Key to Company
    timesheetRetentionDays: number;
    theme: 'light' | 'dark';
    notificationPreferences: NotificationPreferences;
    country: string;
    currency: 'USD' | 'EUR' | 'GBP';
}

export enum AuditLogAction {
    USER_ASSIGNED = 'User Assigned',
    USER_UNASSIGNED = 'User Unassigned',
    TIMESHEET_APPROVED = 'Timesheet Approved',
    TIMESHEET_REJECTED = 'Timesheet Rejected',
    TIMESHEET_FLAGGED_FOR_REVIEW = 'Timesheet Flagged for Review',
    TIMESHEET_FLAG_APPROVED = 'Flagged Timesheet Approved',
    TIMESHEET_FLAG_REJECTED = 'Flagged Timesheet Rejected',
    DOCUMENT_UPLOADED = 'Document Uploaded',
    DOCUMENT_ACKNOWLEDGED = 'Document Acknowledged',
    PROJECT_MANAGER_CHANGED = 'Project Manager Changed',
    TODO_ADDED = 'Task Added',
    TODO_COMPLETED = 'Task Completed',
    TODO_STATUS_CHANGED = 'Task Status Changed',
    TODO_PRIORITY_CHANGED = 'Task Priority Changed',
    TODO_DUE_DATE_CHANGED = 'Task Due Date Changed',
    TODO_DEPENDENCY_ADDED = 'Task Dependency Added',
    TODO_DEPENDENCY_REMOVED = 'Task Dependency Removed',
    SUBTASK_ADDED = 'Sub-task Added',
    SUBTASK_COMPLETED = 'Sub-task Completed',
    SUBTASK_DELETED = 'Sub-task Deleted',
    SUBTASK_UPDATED = 'Sub-task Updated',
    TODO_COMMENT_ADDED = 'Comment Added to Task',
    TODO_REMINDER_SET = 'Task Reminder Set',
    SAFETY_INCIDENT_REPORTED = 'Safety Incident Reported',
    SAFETY_INCIDENT_STATUS_UPDATED = 'Safety Incident Status Updated',
    DOCUMENT_VERSION_REVERTED = 'Document Version Reverted',
    DOCUMENT_LINK_ADDED = 'Document Link Added',
    DOCUMENT_LINK_REMOVED = 'Document Link Removed',
    DOCUMENT_AI_QUERY = 'Document AI Query',
    DAILY_LOG_ADDED = 'Daily Log Added',
    COST_ESTIMATE_GENERATED = 'Cost Estimate Generated',
    EQUIPMENT_ASSIGNED = 'Equipment Assigned',
    EQUIPMENT_UNASSIGNED = 'Equipment Unassigned',
    EQUIPMENT_STATUS_CHANGED = 'Equipment Status Changed',
    RESOURCE_SCHEDULED = 'Resource Scheduled',
    SAFETY_ANALYSIS_GENERATED = 'Safety Analysis Generated',
    RFI_CREATED = 'RFI Created',
    RFI_ANSWERED = 'RFI Answered',
    RFI_ASSIGNEE_CHANGED = 'RFI Assignee Changed',
    AI_PROJECT_SEARCH = 'AI Project Search',
    OPERATIVE_REPORT_SUBMITTED = 'Operative Report Submitted',
    INVOICE_CREATED = 'Invoice Created',
    INVOICE_SENT = 'Invoice Sent',
    INVOICE_PAYMENT_RECEIVED = 'Invoice Payment Received',
    QUOTE_CREATED = 'Quote Created',
    QUOTE_SENT = 'Quote Sent',
    QUOTE_ACCEPTED = 'Quote Accepted',
    QUOTE_REJECTED = 'Quote Rejected',
    PROJECT_PHOTO_ADDED = 'Project Photo Added',
    CLIENT_ADDED = 'Client Added',
    COMPANY_ANNOUNCEMENT_SENT = 'Company Announcement Sent',
    // Platform-level actions
    TENANT_SUSPENDED = 'Tenant Suspended',
    TENANT_ACTIVATED = 'Tenant Activated',
    TENANT_ARCHIVED = 'Tenant Archived',
    TENANT_INVITED = 'Tenant Invited',
    PLATFORM_SETTINGS_UPDATED = 'Platform Settings Updated',
    PLATFORM_ANNOUNCEMENT_SENT = 'Platform Announcement Sent',
}

export interface AuditLog {
    id: number;
    projectId?: number; // Foreign Key to Project
    actorId: number; // Foreign Key to User
    action: AuditLogAction;
    target?: {
        type: string;
        id: number | string;
        name: string;
    };
    timestamp: Date;
}

export enum IncidentSeverity {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
    CRITICAL = 'Critical'
}

export enum IncidentType {
    NEAR_MISS = 'Near Miss',
    HAZARD_OBSERVATION = 'Hazard Observation',
    PROPERTY_DAMAGE = 'Property Damage',
    INJURY = 'Injury'
}

export enum IncidentStatus {
    REPORTED = 'Reported',
    UNDER_REVIEW = 'Under Review',
    RESOLVED = 'Resolved'
}

export interface SafetyIncident {
    id: number;
    projectId: number; // Foreign Key to Project
    reporterId: number; // Foreign Key to User
    timestamp: Date;
    severity: IncidentSeverity;
    type: IncidentType;
    description: string;
    locationOnSite: string;
    correctiveActionTaken?: string;
    status: IncidentStatus;
    aiSummary?: string;
}

export interface ProjectHealth {
    score: number;
    summary: string;
    risks: string[];
    positives: string[];
}

export interface DailyLog {
    id: number;
    projectId: number; // Foreign Key to Project
    authorId: number; // Foreign Key to User
    date: Date;
    weather: 'Sunny' | 'Cloudy' | 'Rain' | 'Windy' | 'Snow';
    temperature: number;
    notes: string;
}

export interface CostEstimate {
    category: 'Materials' | 'Labor' | 'Equipment' | 'Permits' | 'Other';
    item: string;
    quantity: string;
    unitCost: number;
    totalCost: number;
    justification: string;
}

export enum EquipmentStatus {
    AVAILABLE = 'Available',
    IN_USE = 'In Use',
    MAINTENANCE = 'Maintenance'
}

export interface Equipment {
    id: number;
    name: string;
    type: 'Heavy' | 'Light' | 'Vehicle';
    status: EquipmentStatus;
    companyId: number; // Foreign Key to Company
    projectId?: number; // Foreign Key to Project
}

export interface ResourceAssignment {
    id: number;
    resourceId: number;
    resourceType: 'user' | 'equipment';
    projectId: number; // Foreign Key to Project
    startDate: Date;
    endDate: Date;
}

export enum RFIStatus {
    OPEN = 'Open',
    ANSWERED = 'Answered',
    CLOSED = 'Closed'
}

export interface RFI {
    id: number;
    projectId: number; // Foreign Key to Project
    subject: string;
    question: string;
    status: RFIStatus;
    creatorId: number; // Foreign Key to User
    assigneeId?: number; // Foreign Key to User
    createdAt: Date;
    answer?: string;
    answeredAt?: Date;
}

export interface AISearchResult {
    summary: string;
    sources: {
        documentId: number;
        snippet: string;
    }[];
}

export interface OperativeReport {
  id: number;
  userId: number; // Foreign Key to User
  projectId: number; // Foreign Key to Project
  date: Date;
  notes: string;
  photoUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Client {
    id: number;
    name: string;
    companyId: number; // Foreign Key to Company
    contactEmail: string;
    contactPhone: string;
    address: string;
    createdAt: Date;
}

export enum QuoteStatus {
    DRAFT = 'Draft',
    SENT = 'Sent',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected',
}

export interface QuoteItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Quote {
    id: number;
    projectId: number; // Foreign Key to Project
    clientId: number; // Foreign Key to Client
    status: QuoteStatus;
    items: QuoteItem[];
    total: number;
    createdAt: Date;
    validUntil: Date;
}

export enum InvoiceStatus {
    DRAFT = 'Draft',
    SENT = 'Sent',
    PAID = 'Paid',
    OVERDUE = 'Overdue',
    VOID = 'Void',
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
    id: number;
    projectId: number; // Foreign Key to Project
    clientId: number; // Foreign Key to Client
    status: InvoiceStatus;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    amountPaid: number;
    amountDue: number;
    issuedAt: Date;
    dueAt: Date;
}

export enum ToolStatus {
    ACTIVE = 'Active',
    MAINTENANCE = 'Maintenance',
    COMING_SOON = 'Coming Soon',
    NEW = 'New',
    DEV_PHASE = 'Development Phase'
}

export interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string; // SVG path
    status: ToolStatus;
    tags: ('AI' | 'Finance' | 'HR' | 'Project' | 'Document' | 'Safety')[];
    usage: number; // 0-100
    requiredPermission?: Permission; // NEW: The permission required to see/use this tool
}

export interface Grant {
    id: string;
    name: string;
    agency: string;
    amount: string;
    description: string;
    url: string;
}

export interface RiskAnalysis {
    overallScore: number; // 0-100
    summary: string;
    identifiedRisks: {
        severity: 'High' | 'Medium' | 'Low';
        description: string;
        recommendation: string;
    }[];
}

export interface BidPackage {
    coverLetter: string;
    checklist: string[];
    summary: string;
}

export interface SystemHealth {
    uptime: string;
    apiHealth: {
        throughput: number; // requests per minute
        errorRate: number; // percentage
    };
    databaseHealth: {
        latency: number; // ms
        connections: number;
    };
    storageHealth: {
        totalUsageGB: number;
        status: 'Operational' | 'Degraded';
    };
}

export interface UsageMetric {
    companyId: number;
    period: string; // e.g., '2023-10'
    activeUsers: number;
    apiCalls: number;
    storageUsedGB: number;
    featureAdoption: Record<string, number>; // e.g., { invoices: 80, tasks: 95 }
}

export interface FinancialKPIs {
    companyId: number;
    profitability: number;
    utilizationRate: number;
    projectMargin: number;
    cashFlow: number;
}

export interface PendingApproval {
    id: number;
    type: 'Timesheet' | 'Invoice' | 'Document' | 'Tenant Signup';
    description: string;
    submittedBy: string;
    projectId?: number;
    companyId: number;
    date: Date;
}

export interface PlatformSettings {
    defaultDbType: 'PostgreSQL' | 'MySQL' | 'MongoDB';
    defaultStorageQuotaGB: number;
    mfaRequired: boolean;
    logRetentionDays: number;
    newTenantOnboardingWorkflow: 'auto' | 'manual';
}

export interface ProjectPhoto {
    id: number;
    projectId: number;
    url: string;
    caption: string;
    uploaderId: number; // Foreign Key to User
    createdAt: Date;
}

export interface WeatherForecast {
    temperature: number;
    condition: 'Sunny' | 'Partly Cloudy' | 'Cloudy' | 'Rain' | 'Thunderstorm';
    icon: string; // SVG path
}

export interface Announcement {
    id: number;
    senderId: number; // Foreign Key to User
    scope: 'platform' | 'company';
    companyId?: number; // Foreign Key to Company
    title: string;
    content: string;
    createdAt: Date;
}

export type View = 'dashboard' | 'users' | 'projects' | 'timesheets' | 'documents' | 'safety' | 'tools' | 'equipment' | 'settings' | 'invoices' | 'clients' | 'principal-dashboard';