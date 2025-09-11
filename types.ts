// types.ts

export type View = 'dashboard' | 'projects' | 'documents' | 'safety' | 'timesheets' | 'time' | 'settings' | 'users' | 'chat' | 'tools' | 'financials' | 'equipment' | 'templates' | 'all-tasks' | 'map' | 'principal-dashboard' | 'my-day';

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
  companyId?: number;
  avatarUrl?: string;
}

export interface Company {
  id: number;
  name: string;
  status: 'Active' | 'Suspended' | 'Archived';
  subscriptionPlan: string;
  storageUsageGB: number;
  createdAt: Date;
}

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
  endDate?: Date;
  status: 'Active' | 'On Hold' | 'Completed';
  imageUrl: string;
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
  id: number | string;
  creatorId: number;
  text: string;
  createdAt: Date;
  isOffline?: boolean;
}

export interface Todo {
  id: number | string;
  projectId: number;
  text: string;
  status: TodoStatus;
  priority: TodoPriority;
  creatorId: number;
  assigneeId?: number;
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  dependsOn?: number;
  subTasks?: SubTask[];
  comments?: Comment[];
  isOffline?: boolean;
  reminderAt?: Date;
}

export enum DocumentStatus {
  UPLOADING = 'Uploading',
  SCANNING = 'Scanning',
  APPROVED = 'Approved',
  QUARANTINED = 'Quarantined',
}

export enum DocumentCategory {
  GENERAL = 'General',
  BLUEPRINTS = 'Blueprints',
  PERMITS = 'Permits',
  HS = 'Health & Safety',
  CONTRACTS = 'Contracts',
  PHOTOS = 'Site Photos',
}

export interface Document {
  id: number;
  projectId: number;
  name: string;
  category: DocumentCategory;
  url: string;
  status: DocumentStatus;
  uploadedAt: Date;
  creatorId: number;
  version: number;
  isOffline?: boolean;
}

export interface DocumentAcknowledgement {
  id: number;
  userId: number;
  documentId: number;
  acknowledgedAt: Date;
}

export enum TimesheetStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  FLAGGED = 'Flagged',
}

export enum WorkType {
    GENERAL_LABOR = 'General Labor',
    EQUIPMENT_OPERATION = 'Equipment Operation',
    SITE_MANAGEMENT = 'Site Management',
}

export interface Break {
  startTime: Date;
  endTime: Date | null;
}

export interface Timesheet {
  id: number;
  userId: number;
  projectId: number;
  clockIn: Date;
  clockOut: Date | null;
  workType: WorkType;
  status: TimesheetStatus;
  comment?: string;
  rejectionReason?: string;
  clockInLocation?: Location;
  clockOutLocation?: Location;
  checkInPhotoUrl?: string;
  checkOutPhotoUrl?: string;
  breaks: Break[];
  trustScore?: number;
  trustReasons?: { [key: string]: string };
}

export enum IncidentStatus {
  REPORTED = 'Reported',
  UNDER_REVIEW = 'Under Review',
  RESOLVED = 'Resolved',
}

export enum IncidentSeverity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum IncidentType {
  INJURY = 'Injury',
  NEAR_MISS = 'Near Miss',
  HAZARD_OBSERVATION = 'Hazard Observation',
  PROPERTY_DAMAGE = 'Property Damage',
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
  resolvedAt?: Date;
  actionsTaken?: string;
}

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

export interface OperativeReport {
    id: number;
    projectId: number;
    userId: number;
    submittedAt: Date;
    notes: string;
    photoUrl?: string;
}

export interface WeatherForecast {
    temperature: number;
    condition: string;
    icon: string; // SVG path data
}

export interface ProjectAssignment {
    projectId: number;
    userId: number;
}

export interface FinancialKPIs {
  profitability: number;
  projectMargin: number;
  cashFlow: number;
  currency: 'USD' | 'GBP';
}

export interface PendingApproval {
  id: number;
  companyId: number;
  type: 'Timesheet' | 'Invoice' | 'New Company';
  description: string;
  submittedAt: Date;
}

export enum AuditLogAction {
    USER_LOGIN = 'USER_LOGIN',
    PROJECT_CREATED = 'PROJECT_CREATED',
    TASK_COMPLETED = 'TASK_COMPLETED',
    DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
    TIMESHEET_APPROVED = 'TIMESHEET_APPROVED',
    SAFETY_INCIDENT_REPORTED = 'SAFETY_INCIDENT_REPORTED'
}

export interface AuditLog {
    id: number;
    actorId: number;
    action: string;
    timestamp: Date;
    target?: { id: number | string; type: string; name: string };
    projectId?: number;
    companyId?: number;
}

export interface Announcement {
    id: number;
    senderId: number;
    scope: 'platform' | 'company';
    title: string;
    content: string;
    createdAt: Date;
}

// Permissions system
export enum Permission {
  VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
  VIEW_ASSIGNED_PROJECTS = 'VIEW_ASSIGNED_PROJECTS',
  MANAGE_PROJECTS = 'MANAGE_PROJECTS',
  MANAGE_PROJECT_TEMPLATES = 'MANAGE_PROJECT_TEMPLATES',
  
  VIEW_ALL_TASKS = 'VIEW_ALL_TASKS',
  MANAGE_TASKS = 'MANAGE_TASKS',

  SUBMIT_TIMESHEET = 'SUBMIT_TIMESHEET',
  VIEW_OWN_TIMESHEETS = 'VIEW_OWN_TIMESHEETS',
  VIEW_ALL_TIMESHEETS = 'VIEW_ALL_TIMESHEETS',
  MANAGE_TIMESHEETS = 'MANAGE_TIMESHEETS',

  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
  MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS',
  
  SUBMIT_SAFETY_REPORT = 'SUBMIT_SAFETY_REPORT',
  VIEW_SAFETY_REPORTS = 'VIEW_SAFETY_REPORTS',
  MANAGE_SAFETY_REPORTS = 'MANAGE_SAFETY_REPORTS',

  VIEW_TEAM = 'VIEW_TEAM',
  MANAGE_TEAM = 'MANAGE_TEAM',

  VIEW_FINANCES = 'VIEW_FINANCES',
  MANAGE_FINANCES = 'MANAGE_FINANCES',
  
  MANAGE_EQUIPMENT = 'MANAGE_EQUIPMENT',
  
  SEND_DIRECT_MESSAGE = 'SEND_DIRECT_MESSAGE',
  
  ACCESS_ALL_TOOLS = 'ACCESS_ALL_TOOLS',
}

export const RolePermissions: Record<Role, Set<Permission>> = {
  [Role.PRINCIPAL_ADMIN]: new Set(Object.values(Permission)),
  [Role.ADMIN]: new Set([
    Permission.VIEW_ALL_PROJECTS, Permission.MANAGE_PROJECTS, Permission.MANAGE_PROJECT_TEMPLATES,
    Permission.VIEW_ALL_TASKS, Permission.MANAGE_TASKS,
    Permission.VIEW_ALL_TIMESHEETS, Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_DOCUMENTS, Permission.UPLOAD_DOCUMENTS, Permission.MANAGE_DOCUMENTS,
    Permission.VIEW_SAFETY_REPORTS, Permission.MANAGE_SAFETY_REPORTS,
    Permission.VIEW_TEAM, Permission.MANAGE_TEAM,
    Permission.VIEW_FINANCES, Permission.MANAGE_FINANCES,
    Permission.MANAGE_EQUIPMENT,
    Permission.SEND_DIRECT_MESSAGE,
    Permission.ACCESS_ALL_TOOLS
  ]),
  [Role.PM]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS, Permission.MANAGE_PROJECTS,
    Permission.VIEW_ALL_TASKS, Permission.MANAGE_TASKS,
    Permission.VIEW_ALL_TIMESHEETS, Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_DOCUMENTS, Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_SAFETY_REPORTS, Permission.MANAGE_SAFETY_REPORTS,
    Permission.VIEW_TEAM,
    Permission.SEND_DIRECT_MESSAGE,
    Permission.ACCESS_ALL_TOOLS
  ]),
  [Role.SAFETY_OFFICER]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_SAFETY_REPORTS, Permission.MANAGE_SAFETY_REPORTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.FOREMAN]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.MANAGE_TASKS,
    Permission.SUBMIT_TIMESHEET, Permission.VIEW_OWN_TIMESHEETS,
    Permission.VIEW_DOCUMENTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.OPERATIVE]: new Set([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.SUBMIT_TIMESHEET, Permission.VIEW_OWN_TIMESHEETS,
    Permission.VIEW_DOCUMENTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
};

export interface AISearchResult {
  summary: string;
  sources: {
    documentId: number;
    snippet: string;
  }[];
}

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
  id: number | string;
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
  issuedAt: Date;
  validUntil: Date;
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

export enum UserStatus {
  ON_SITE = 'On Site',
  OFF_SITE = 'Off Site',
  ON_BREAK = 'On Break',
}

export interface MonthlyFinancials {
    month: string;
    revenue: number;
    costs: number;
    profit: number;
}

export interface CostBreakdown {
    category: string;
    amount: number;
}

export interface SystemHealth {
    uptime: string;
    apiHealth: { status: string; errorRate: number; throughput: number };
    databaseHealth: { status: string; latency: number };
    storageHealth: { status: string; capacityUsed: string };
}

export interface UsageMetric {
    companyId: number;
    apiCalls: number;
    storageUsedGB: number;
    activeUsers: number;
}

export interface PlatformSettings {
    mfaRequired: boolean;
    newTenantOnboardingWorkflow: 'manual' | 'auto';
    defaultStorageQuotaGB: number;
    logRetentionDays: number;
}

export interface Conversation {
  id: number;
  participants: number[];
  messages: ChatMessage[];
  lastMessage: ChatMessage | null;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  content: string;
  timestamp: Date;
  isRead: boolean;
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

export interface TemplateTask {
  id: string; // Temporary ID for UI
  text: string;
  priority: TodoPriority;
}

export interface Grant {
    id: number;
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
    id: number;
    companyId: number;
    theme: 'light' | 'dark';
    notificationPreferences: NotificationPreferences;
    locationPreferences: LocationPreferences;
}
