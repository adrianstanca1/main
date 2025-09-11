// This file defines all the core data structures and types used throughout the application.

// --- USER & AUTHENTICATION ---
export enum Role {
  PRINCIPAL_ADMIN = 'Principal Admin',
  ADMIN = 'Company Admin',
  PM = 'Project Manager',
  FOREMAN = 'Foreman',
  OPERATIVE = 'Operative',
  SAFETY_OFFICER = 'Safety Officer',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  companyId: number;
}

export enum Permission {
  // Projects
  VIEW_ASSIGNED_PROJECTS = 'VIEW_ASSIGNED_PROJECTS',
  VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
  MANAGE_PROJECTS = 'MANAGE_PROJECTS', // Create, edit, delete
  MANAGE_PROJECT_TEMPLATES = 'MANAGE_PROJECT_TEMPLATES',
  
  // Tasks
  VIEW_ALL_TASKS = 'VIEW_ALL_TASKS',
  MANAGE_TASKS = 'MANAGE_TASKS', // Create, edit, assign, change status
  
  // Team & Users
  VIEW_TEAM = 'VIEW_TEAM',
  MANAGE_TEAM = 'MANAGE_TEAM', // Invite, edit roles, deactivate
  
  // Timesheets
  SUBMIT_TIMESHEET = 'SUBMIT_TIMESHEET',
  VIEW_ALL_TIMESHEETS = 'VIEW_ALL_TIMESHEETS',
  MANAGE_TIMESHEETS = 'MANAGE_TIMESHEETS', // Approve, reject, edit
  
  // Documents
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
  MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS',
  
  // Safety
  VIEW_SAFETY_REPORTS = 'VIEW_SAFETY_REPORTS',
  SUBMIT_SAFETY_REPORT = 'SUBMIT_SAFETY_REPORT',
  MANAGE_SAFETY_REPORTS = 'MANAGE_SAFETY_REPORTS',
  ACCESS_SAFETY_TOOLS = 'ACCESS_SAFETY_TOOLS',

  // Financials
  VIEW_FINANCES = 'VIEW_FINANCES',
  MANAGE_FINANCES = 'MANAGE_FINANCES', // Create invoices, quotes
  
  // Equipment
  VIEW_EQUIPMENT = 'VIEW_EQUIPMENT',
  MANAGE_EQUIPMENT = 'MANAGE_EQUIPMENT',
  
  // Communication
  SEND_ANNOUNCEMENT = 'SEND_ANNOUNCEMENT',
  SEND_DIRECT_MESSAGE = 'SEND_DIRECT_MESSAGE',

  // Tools
  ACCESS_ALL_TOOLS = 'ACCESS_ALL_TOOLS',
}

export const RolePermissions: Record<Role, Set<Permission>> = {
  [Role.PRINCIPAL_ADMIN]: new Set(Object.values(Permission)), // Has all permissions
  [Role.ADMIN]: new Set([
    Permission.VIEW_ALL_PROJECTS,
    Permission.MANAGE_PROJECTS,
    Permission.MANAGE_PROJECT_TEMPLATES,
    Permission.VIEW_ALL_TASKS,
    Permission.MANAGE_TASKS,
    Permission.VIEW_TEAM,
    Permission.MANAGE_TEAM,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.MANAGE_DOCUMENTS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.MANAGE_SAFETY_REPORTS,
    Permission.ACCESS_SAFETY_TOOLS,
    Permission.VIEW_FINANCES,
    Permission.MANAGE_FINANCES,
    Permission.VIEW_EQUIPMENT,
    Permission.MANAGE_EQUIPMENT,
    Permission.SEND_ANNOUNCEMENT,
    Permission.SEND_DIRECT_MESSAGE,
    Permission.ACCESS_ALL_TOOLS,
  ]),
  [Role.PM]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_ALL_PROJECTS, // PMs can often see all projects
    Permission.MANAGE_PROJECTS,
    Permission.VIEW_ALL_TASKS,
    Permission.MANAGE_TASKS,
    Permission.VIEW_TEAM,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.MANAGE_SAFETY_REPORTS,
    Permission.ACCESS_SAFETY_TOOLS,
    Permission.VIEW_EQUIPMENT,
    Permission.MANAGE_EQUIPMENT,
    Permission.SEND_DIRECT_MESSAGE,
    Permission.ACCESS_ALL_TOOLS,
  ]),
  [Role.FOREMAN]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.MANAGE_TASKS,
    Permission.VIEW_TEAM,
    Permission.SUBMIT_TIMESHEET,
    Permission.MANAGE_TIMESHEETS, // Can approve for their crew
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.VIEW_EQUIPMENT,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.OPERATIVE]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.SUBMIT_TIMESHEET,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.SAFETY_OFFICER]: new Set([
      Permission.VIEW_ALL_PROJECTS,
      Permission.VIEW_ALL_TASKS,
      Permission.VIEW_TEAM,
      Permission.VIEW_DOCUMENTS,
      Permission.VIEW_SAFETY_REPORTS,
      Permission.SUBMIT_SAFETY_REPORT,
      Permission.MANAGE_SAFETY_REPORTS,
      Permission.ACCESS_SAFETY_TOOLS,
      Permission.SEND_DIRECT_MESSAGE,
  ]),
};

// --- COMPANY & TENANT ---
export interface Company {
    id: number;
    name: string;
    status: 'Active' | 'Suspended' | 'Archived';
    subscriptionPlan: 'Basic' | 'Pro' | 'Enterprise';
    storageUsageGB: number;
}
export interface Client {
  id: number;
  companyId: number;
  name: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
}

// --- PROJECT & TASKS ---
export interface Location {
    address: string;
    lat: number;
    lng: number;
    accuracy?: number;
}
export interface Project {
  id: number;
  companyId: number;
  name: string;
  location: Location;
  budget: number;
  actualCost: number;
  startDate: Date;
  imageUrl: string;
  status: 'Active' | 'On Hold' | 'Completed';
  projectType: string;
  workClassification: string;
  geofenceRadius?: number; // in meters
}
export enum TodoStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}
export enum TodoPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}
export interface Comment {
    id: number | string;
    creatorId: number;
    text: string;
    createdAt: Date;
    isOffline?: boolean;
}
export interface SubTask {
    id: number;
    text: string;
    completed: boolean;
}
export interface Todo {
  id: number | string; // string for optimistic offline tasks
  text: string;
  projectId: number;
  creatorId: number;
  assigneeId?: number;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
  comments?: Comment[];
  subTasks?: SubTask[];
  dependsOn?: number;
  isOffline?: boolean;
  reminderAt?: Date;
}

// --- TIME & LOCATION ---
export enum WorkType {
  GENERAL_LABOR = 'General Labor',
  EQUIPMENT_OPERATION = 'Equipment Operation',
  SITE_PREP = 'Site Prep',
  SUPERVISION = 'Supervision',
}
export enum TimesheetStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  FLAGGED = 'Flagged', // For issues like geofence mismatch
}
export interface Timesheet {
  id: number;
  userId: number;
  projectId: number;
  clockIn: Date;
  clockOut: Date | null;
  breaks: { startTime: Date; endTime: Date | null }[];
  workType: WorkType;
  status: TimesheetStatus;
  comment?: string;
  rejectionReason?: string;
  clockInLocation?: Location;
  clockOutLocation?: Location;
  trustScore?: number;
  trustReasons?: Record<string, string>;
  checkInPhotoUrl?: string;
}

// --- DOCUMENTS ---
export enum DocumentCategory {
  GENERAL = 'General',
  DRAWINGS = 'Drawings',
  PERMITS = 'Permits',
  RFIS = 'RFIs',
  SUBMITTALS = 'Submittals',
  HS = 'Health & Safety', // H&S
  FINANCIAL = 'Financial',
}
export enum DocumentStatus {
  APPROVED = 'Approved',
  UPLOADING = 'Uploading',
  SCANNING = 'Scanning',
  QUARANTINED = 'Quarantined',
}
export interface Document {
  id: number;
  name: string;
  projectId: number;
  category: DocumentCategory;
  status: DocumentStatus;
  uploadedAt: Date;
  version: number;
  url: string;
  creatorId: number;
  isOffline?: boolean;
}
export interface DocumentAcknowledgement {
  id: number;
  userId: number;
  documentId: number;
  timestamp: Date;
}
export interface ProjectPhoto {
    id: number;
    projectId: number;
    uploaderId: number;
    url: string;
    caption: string;
    timestamp: Date;
}

// --- SAFETY ---
export enum IncidentSeverity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}
export enum IncidentType {
  HAZARD_OBSERVATION = 'Hazard Observation',
  NEAR_MISS = 'Near Miss',
  PROPERTY_DAMAGE = 'Property Damage',
  INJURY = 'Injury',
  ENVIRONMENTAL = 'Environmental',
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
  severity: IncidentSeverity;
  type: IncidentType;
  description: string;
  locationOnSite: string;
  status: IncidentStatus;
}
export interface OperativeReport {
  id: number;
  projectId: number;
  userId: number;
  notes: string;
  photoUrl?: string;
  timestamp: Date;
}


// --- FINANCIALS ---
export interface FinancialKPIs {
  profitability: number;
  projectMargin: number;
  cashFlow: number;
  currency: 'USD' | 'GBP';
}
export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  VOID = 'Void',
}
export enum QuoteStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
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
  total: number;
  amountDue: number;
  issuedAt: Date;
  dueAt: Date;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
}
export interface Quote {
  id: number;
  companyId: number;
  clientId: number;
  projectId: number;
  total: number;
  issuedAt: Date;
  validUntil: Date;
  status: QuoteStatus;
}
export interface MonthlyFinancials {
    month: string;
    revenue: number;
    costs: number;
    profit: number;
}
export interface CostBreakdown {
    category: 'Labor' | 'Materials' | 'Subcontractors' | 'Permits' | 'Other';
    amount: number;
}


// --- EQUIPMENT & RESOURCES ---
export enum EquipmentStatus {
  AVAILABLE = 'Available',
  IN_USE = 'In Use',
  MAINTENANCE = 'Maintenance',
}
export interface Equipment {
  id: number;
  companyId: number;
  name: string;
  type: string;
  status: EquipmentStatus;
  projectId?: number;
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


// --- UI & MISC ---
export type View = 'dashboard' | 'projects' | 'documents' | 'safety' | 'timesheets' | 'time' | 'settings' | 'users' | 'chat' | 'tools' | 'financials' | 'equipment' | 'templates' | 'all-tasks' | 'map' | 'principal-dashboard';

export enum UserStatus {
    ON_SITE = 'On Site',
    ON_BREAK = 'On Break',
    OFF_SITE = 'Off Site',
}
export interface ProjectAssignment {
    id: number;
    userId: number;
    projectId: number;
    projectRole: ProjectRole;
}
export enum ProjectRole {
    MANAGER = 'Manager',
    FOREMAN = 'Foreman',
    OPERATIVE = 'Operative',
    SAFETY_LEAD = 'Safety Lead',
    SURVEYOR = 'Surveyor'
}
export interface WeatherForecast {
    condition: string;
    temperature: number; // Celsius
    icon: string; // SVG path data
}

// --- Communication ---
export interface Announcement {
  id: number;
  senderId: number;
  scope: 'platform' | 'company';
  companyId?: number;
  title: string;
  content: string;
  createdAt: Date;
}
export interface Conversation {
  id: number;
  participants: number[];
  messages: ChatMessage[];
  lastMessage: ChatMessage | null;
}
export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

// --- AI & Tools ---
export enum ToolStatus {
  ACTIVE = 'Active',
  NEW = 'New',
  MAINTENANCE = 'Maintenance',
  COMING_SOON = 'Coming Soon',
  DEV_PHASE = 'In Development',
}
export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path
  status: ToolStatus;
  tags: string[]; // e.g., ['AI', 'Finance']
}
export interface AISearchResult {
  summary: string;
  sources: {
    documentId: number;
    snippet: string;
  }[];
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

// --- TEMPLATES ---
export interface TemplateTask {
    id: string;
    text: string;
    priority: TodoPriority;
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

// --- PRINCIPAL ADMIN ---
export interface SystemHealth {
  uptime: string;
  apiHealth: { status: string; throughput: number; errorRate: number };
  databaseHealth: { status: string; latency: number };
  storageHealth: { status: string; totalUsedGB: number };
}
export interface UsageMetric {
  companyId: number;
  apiCalls: number;
  storageUsedGB: number;
  activeUsers: number;
}
export interface PlatformSettings {
    newTenantOnboardingWorkflow: 'manual' | 'auto';
    defaultStorageQuotaGB: number;
    mfaRequired: boolean;
    logRetentionDays: number;
}
export interface PendingApproval {
  id: number;
  companyId: number;
  type: 'New Company' | 'Plan Upgrade';
  description: string;
}
export interface AuditLog {
  id: number;
  timestamp: Date;
  actorId: number;
  action: AuditLogAction;
  target?: { id: number | string; type: string; name: string };
  projectId?: number;
}
export type AuditLogAction = string;

// --- SETTINGS ---
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