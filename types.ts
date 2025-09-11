// This file contains all the core data types and enums for the application.

// --- Core Enums ---

export enum Role {
  PRINCIPAL_ADMIN = 'Principal Admin',
  ADMIN = 'Company Admin',
  PM = 'Project Manager',
  FOREMAN = 'Foreman',
  SAFETY_OFFICER = 'Safety Officer',
  OPERATIVE = 'Operative',
}

export type View =
  | 'dashboard'
  | 'principal-dashboard'
  | 'projects'
  | 'documents'
  | 'safety'
  | 'timesheets'
  | 'time'
  | 'settings'
  | 'users'
  | 'chat'
  | 'tools'
  | 'financials'
  | 'equipment'
  | 'templates'
  | 'map';

// --- Permissions ---

export enum Permission {
  // Project Management
  VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
  VIEW_ASSIGNED_PROJECTS = 'VIEW_ASSIGNED_PROJECTS',
  MANAGE_PROJECTS = 'MANAGE_PROJECTS', // Create, edit, delete
  MANAGE_PROJECT_TEMPLATES = 'MANAGE_PROJECT_TEMPLATES',
  
  // Tasks
  MANAGE_TASKS = 'MANAGE_TASKS', // Create, edit, assign, delete
  VIEW_ALL_TASKS = 'VIEW_ALL_TASKS',
  VIEW_ASSIGNED_TASKS = 'VIEW_ASSIGNED_TASKS',

  // Team Management
  VIEW_TEAM = 'VIEW_TEAM',
  MANAGE_TEAM = 'MANAGE_TEAM', // Invite, edit roles, remove

  // Timesheets
  SUBMIT_TIMESHEET = 'SUBMIT_TIMESHEET',
  MANAGE_TIMESHEETS = 'MANAGE_TIMESHEETS', // Approve, reject
  VIEW_ALL_TIMESHEETS = 'VIEW_ALL_TIMESHEETS',
  VIEW_OWN_TIMESHEETS = 'VIEW_OWN_TIMESHEETS',

  // Safety
  SUBMIT_SAFETY_REPORT = 'SUBMIT_SAFETY_REPORT',
  MANAGE_SAFETY_REPORTS = 'MANAGE_SAFETY_REPORTS', // Review, resolve
  VIEW_SAFETY_REPORTS = 'VIEW_SAFETY_REPORTS',
  ACCESS_SAFETY_TOOLS = 'ACCESS_SAFETY_TOOLS',
  
  // Documents
  UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS', // Delete, set permissions

  // Financials
  VIEW_FINANCES = 'VIEW_FINANCES',
  MANAGE_INVOICES = 'MANAGE_INVOICES',
  MANAGE_QUOTES = 'MANAGE_QUOTES',
  
  // Equipment & Tools
  MANAGE_EQUIPMENT = 'MANAGE_EQUIPMENT',
  ACCESS_ALL_TOOLS = 'ACCESS_ALL_TOOLS',
  
  // Communication
  SEND_ANNOUNCEMENT = 'SEND_ANNOUNCEMENT',
  SEND_DIRECT_MESSAGE = 'SEND_DIRECT_MESSAGE',
}

export const RolePermissions: Record<Role, Set<Permission>> = {
  [Role.PRINCIPAL_ADMIN]: new Set(Object.values(Permission)), // Has all permissions
  [Role.ADMIN]: new Set([
    Permission.VIEW_ALL_PROJECTS,
    Permission.MANAGE_PROJECTS,
    Permission.MANAGE_PROJECT_TEMPLATES,
    Permission.MANAGE_TASKS,
    Permission.VIEW_ALL_TASKS,
    Permission.VIEW_TEAM,
    Permission.MANAGE_TEAM,
    Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.MANAGE_SAFETY_REPORTS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.ACCESS_SAFETY_TOOLS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_DOCUMENTS,
    Permission.MANAGE_DOCUMENTS,
    Permission.VIEW_FINANCES,
    Permission.MANAGE_INVOICES,
    Permission.MANAGE_QUOTES,
    Permission.MANAGE_EQUIPMENT,
    Permission.ACCESS_ALL_TOOLS,
    Permission.SEND_ANNOUNCEMENT,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.PM]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_ALL_PROJECTS, // Often PMs can see all projects
    Permission.MANAGE_PROJECTS,
    Permission.MANAGE_TASKS,
    Permission.VIEW_ALL_TASKS,
    Permission.VIEW_TEAM,
    Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.MANAGE_SAFETY_REPORTS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.ACCESS_SAFETY_TOOLS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_FINANCES,
    Permission.MANAGE_EQUIPMENT,
    Permission.ACCESS_ALL_TOOLS,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.FOREMAN]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_TASKS,
    Permission.VIEW_TEAM,
    Permission.SUBMIT_TIMESHEET,
    Permission.VIEW_OWN_TIMESHEETS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.SAFETY_OFFICER]: new Set([
    Permission.VIEW_ALL_PROJECTS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.MANAGE_SAFETY_REPORTS,
    Permission.ACCESS_SAFETY_TOOLS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_TEAM,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.OPERATIVE]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_TASKS,
    Permission.SUBMIT_TIMESHEET,
    Permission.VIEW_OWN_TIMESHEETS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
};


// --- Data Models ---

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  companyId: number;
}

export interface Company {
  id: number;
  name: string;
  status: 'Active' | 'Suspended' | 'Archived';
  subscriptionPlan: string;
  storageUsageGB: number;
}

export interface Location {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
}

export interface Project {
  id: number;
  name: string;
  location: Location;
  startDate: Date;
  budget: number;
  actualCost: number;
  status: 'Active' | 'On Hold' | 'Completed';
  imageUrl: string;
  projectType: string;
  workClassification: string;
  companyId: number;
  geofenceRadius?: number;
}

export enum TodoStatus {
    TODO = 'To Do',
    IN_PROGRESS = 'In Progress',
    DONE = 'Done',
}

export enum TodoPriority {
    HIGH = 'High',
    MEDIUM = 'Medium',
    LOW = 'Low',
}

export interface SubTask {
    id: number;
    text: string;
    completed: boolean;
}

export interface Comment {
    id: number;
    creatorId: number;
    text: string;
    createdAt: Date;
}

export interface Todo {
    id: number | string; // string for optimistic offline tasks
    projectId: number;
    creatorId: number;
    text: string;
    status: TodoStatus;
    priority: TodoPriority;
    createdAt: Date;
    dueDate?: Date;
    completedAt?: Date;
    dependsOn?: number | string;
    subTasks?: SubTask[];
    comments?: Comment[];
    reminderAt?: Date;
    isOffline?: boolean;
}

export enum WorkType {
    GENERAL_LABOR = 'General Labor',
    EQUIPMENT_OPERATION = 'Equipment Operation',
}

export enum TimesheetStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    FLAGGED = 'Flagged'
}

export interface Timesheet {
    id: number;
    userId: number;
    projectId: number;
    clockIn: Date;
    clockOut: Date | null;
    clockInLocation: Location | null;
    clockOutLocation: Location | null;
    workType: WorkType;
    status: TimesheetStatus;
    comment?: string;
    checkInPhotoUrl?: string;
    checkOutPhotoUrl?: string;
    breaks: { startTime: Date; endTime: Date | null }[];
    trustScore?: number;
    trustReasons?: Record<string, string>;
    invoiceId?: number;
}

export enum DocumentCategory {
    GENERAL = 'General',
    BLUEPRINTS = 'Blueprints',
    HS = 'Health & Safety',
    CONTRACT = 'Contract',
    INVOICE = 'Invoice',
}

export enum DocumentStatus {
    UPLOADING = 'Uploading',
    SCANNING = 'Scanning',
    APPROVED = 'Approved',
    QUARANTINED = 'Quarantined',
}

export interface Document {
    id: number;
    name: string;
    url: string;
    projectId: number;
    category: DocumentCategory;
    status: DocumentStatus;
    uploadedAt: Date;
    creatorId: number;
    version: number;
}

export interface DocumentAcknowledgement {
    id: number;
    documentId: number;
    userId: number;
    acknowledgedAt: Date;
}


export enum IncidentType {
    NEAR_MISS = 'Near Miss',
    INJURY = 'Injury',
    PROPERTY_DAMAGE = 'Property Damage',
    HAZARD_OBSERVATION = 'Hazard Observation',
}

export enum IncidentSeverity {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
    CRITICAL = 'Critical',
}

export enum IncidentStatus {
    REPORTED = 'Reported',
    UNDER_REVIEW = 'Under Review',
    RESOLVED = 'Resolved',
}


export interface SafetyIncident {
    id: number;
    projectId: number;
    reporterId: number;
    timestamp: Date;
    type: IncidentType;
    severity: IncidentSeverity;
    description: string;
    locationOnSite: string;
    status: IncidentStatus;
}

export interface FinancialKPIs {
    companyId: number;
    currency: 'USD' | 'GBP' | 'EUR';
    profitability: number;
    profitabilityChange: number;
    projectMargin: number;
    projectMarginChange: number;
    cashFlow: number;
    cashFlowChange: number;
}

export interface PendingApproval {
    id: number;
    type: 'Timesheet' | 'Invoice' | 'New User';
    description: string;
    companyId: number;
}

export type AuditLogAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'SAFETY_INCIDENT_REPORTED'
  | 'TIMESHEET_APPROVED'
  | 'TIMESHEET_REJECTED'
  | 'INVOICE_GENERATED_FROM_TIMESHEETS';


export interface AuditLog {
    id: number;
    actorId: number;
    action: AuditLogAction;
    timestamp: Date;
    target?: {
        type: 'Project' | 'Task' | 'User' | 'Document';
        id: number | string;
        name: string;
    };
    projectId?: number;
}

export interface DailyLog {
    id: number;
    projectId: number;
    date: Date;
    notes: string;
    userId: number;
}

export enum EquipmentStatus {
    AVAILABLE = 'Available',
    IN_USE = 'In Use',
    MAINTENANCE = 'Maintenance',
}


export interface Equipment {
    id: number;
    name: string;
    type: string;
    status: EquipmentStatus;
    companyId: number;
    projectId?: number;
}

export interface OperativeReport {
    id: number;
    projectId: number;
    userId: number;
    notes: string;
    photoUrl?: string;
    timestamp: Date;
}

export interface WeatherForecast {
    temperature: number;
    condition: string;
    icon: string; // SVG path data
}

export interface Announcement {
    id: number;
    senderId: number;
    scope: 'company' | 'platform' | 'project';
    companyId?: number;
    projectId?: number;
    title: string;
    content: string;
    createdAt: Date;
}

export interface ChatMessage {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    timestamp: Date;
    isRead: boolean;
}

export interface Conversation {
    id: number;
    participants: number[];
    messages: ChatMessage[];
    lastMessage: ChatMessage | null;
}

export enum ProjectRole {
  PROJECT_MANAGER = 'Project Manager',
  SITE_SUPERVISOR = 'Site Supervisor',
  LEAD_ENGINEER = 'Lead Engineer',
  WORKER = 'Worker',
}

export interface ProjectAssignment {
  userId: number;
  projectId: number;
  projectRole: ProjectRole;
}


// --- Principal Admin Types ---
export interface SystemHealth {
    uptime: string;
    apiHealth: { status: string, errorRate: number, throughput: number };
    databaseHealth: { status: string, latency: number };
    storageHealth: { status: string, usedGB: number, totalGB: number };
}
export interface UsageMetric {
    companyId: number;
    apiCalls: number;
    storageUsed: number;
    activeUsers: number;
}
export interface PlatformSettings {
    mfaRequired: boolean;
    logRetentionDays: number;
    newTenantOnboardingWorkflow: 'manual' | 'auto';
    defaultStorageQuotaGB: number;
}

// --- Financial Types ---
export interface Client {
  id: number;
  companyId: number;
  name: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
}

export enum InvoiceStatus {
    DRAFT = 'Draft',
    SENT = 'Sent',
    PAID = 'Paid',
    OVERDUE = 'Overdue',
    VOID = 'Void',
}

export interface InvoiceLineItem {
    id: string; // temp id for UI
    description: string;
    quantity: number;
    rate: number;
    total: number;
}


export interface Invoice {
    id: number;
    companyId: number;
    clientId: number;
    projectId: number;
    status: InvoiceStatus;
    total: number;
    amountDue: number;
    issuedAt: Date;
    dueAt: Date;
    items: InvoiceLineItem[];
}

export enum QuoteStatus {
    DRAFT = 'Draft',
    SENT = 'Sent',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected',
}

export interface Quote {
    id: number;
    companyId: number;
    clientId: number;
    projectId: number;
    status: QuoteStatus;
    total: number;
    validUntil: Date;
}

export enum UserStatus {
  ON_SITE = 'On Site',
  ON_BREAK = 'On Break',
  OFF_SITE = 'Off Site'
}

export interface ResourceAssignment {
    id: number;
    companyId: number;
    projectId: number;
    resourceId: number;
    resourceType: 'user' | 'equipment';
    startDate: Date;
    endDate: Date;
}

// --- Settings Types ---
export interface NotificationPreferences {
    projectUpdates: boolean;
    timeReminders: boolean;
    photoRequirements: boolean;
}

export interface LocationPreferences {
    gpsAccuracy: 'standard' | 'high';
    backgroundTracking: boolean;
    locationHistoryDays: 30 | 60 | 90;
}

export interface CompanySettings {
    companyId: number;
    theme: 'light' | 'dark';
    notificationPreferences: NotificationPreferences;
    locationPreferences: LocationPreferences;
}

// --- AI Related Types ---
export interface Grant {
    id: string;
    name: string;
    agency: string;
    amount: string;
    description: string;
    url: string;
}

export interface RiskAnalysis {
    summary: string;
    identifiedRisks: {
        severity: 'Low' | 'Medium' | 'High';
        description: string;
        recommendation: string;
    }[];
}

export interface BidPackage {
    coverLetter: string;
    checklist: string[];
    summary: string;
}

export interface AISearchResult {
    summary: string;
    sources: {
        documentId: number;
        snippet: string;
    }[];
}

export interface ProjectPhoto {
    id: number;
    projectId: number;
    uploaderId: number;
    url: string;
    caption: string;
    timestamp: Date;
}

export enum ToolStatus {
    ACTIVE = 'Active',
    NEW = 'New',
    MAINTENANCE = 'Under Maintenance',
    COMING_SOON = 'Coming Soon',
    DEV_PHASE = 'In Development',
}

export interface Tool {
    id: string;
    name: string;
    description: string;
    status: ToolStatus;
    icon: string; // SVG path data
    tags: ('AI' | 'Finance' | 'Project' | 'Strategy' | 'Safety' | 'Reporting')[];
}

// --- Project Template Types ---
export interface TemplateTask {
    id: string; // e.g., 'temp-168...
    text: string;
    priority: TodoPriority;
    // Note: Due date could be relative, e.g., "7 days after project start", but for simplicity, we'll omit it.
}

export interface ProjectTemplate {
    id: number;
    companyId: number;
    name: string;
    description: string;
    templateTasks: TemplateTask[];
    documentCategories: DocumentCategory[];
    safetyProtocols: string[];
}