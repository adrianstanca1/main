// services/mockData.ts
import { Role, TodoStatus, TodoPriority, DocumentStatus, DocumentCategory, TimesheetStatus, WorkType, IncidentStatus, IncidentSeverity, IncidentType, EquipmentStatus, InvoiceStatus, QuoteStatus, AuditLogAction } from '../types';

export const mockData = {
  companies: [
    { id: 1, name: 'ConstructCo', status: 'Active', subscriptionPlan: 'Pro', storageUsageGB: 25.6, createdAt: new Date('2022-01-15') },
    { id: 2, name: 'BuildRight Inc.', status: 'Active', subscriptionPlan: 'Enterprise', storageUsageGB: 78.2, createdAt: new Date('2021-11-20') },
    { id: 3, name: 'Renovate Now', status: 'Suspended', subscriptionPlan: 'Basic', storageUsageGB: 4.1, createdAt: new Date('2023-03-10') },
    { id: 0, name: 'Platform Admins', status: 'Active', subscriptionPlan: 'Internal', storageUsageGB: 0, createdAt: new Date('2020-01-01') }
  ],
  users: [
    // Principal Admin
    { id: 1, name: 'Alex Admin', email: 'alex@system.com', role: Role.PRINCIPAL_ADMIN, companyId: 0 },

    // ConstructCo Users
    { id: 101, name: 'Charlie Admin', email: 'charlie@constructco.com', role: Role.ADMIN, companyId: 1 },
    { id: 102, name: 'Peter Manager', email: 'peter@constructco.com', role: Role.PM, companyId: 1 },
    { id: 103, name: 'Frank Foreman', email: 'frank@constructco.com', role: Role.FOREMAN, companyId: 1 },
    { id: 104, name: 'Owen Operative', email: 'owen@constructco.com', role: Role.OPERATIVE, companyId: 1 },
    { id: 105, name: 'Sam Safety', email: 'sam@constructco.com', role: Role.SAFETY_OFFICER, companyId: 1 },
    { id: 106, name: 'Olivia Operative', email: 'olivia@constructco.com', role: Role.OPERATIVE, companyId: 1 },

    // BuildRight Inc. Users
    { id: 201, name: 'Bella Admin', email: 'bella@buildright.com', role: Role.ADMIN, companyId: 2 },
    { id: 202, name: 'Mike Manager', email: 'mike@buildright.com', role: Role.PM, companyId: 2 },
  ],
  projects: [
    { id: 1, companyId: 1, name: 'Downtown Office Tower', location: { address: '123 Main St, London', lat: 51.5074, lng: -0.1278 }, budget: 5000000, actualCost: 2300000, startDate: new Date('2023-05-01'), status: 'Active', imageUrl: 'https://picsum.photos/seed/project1/800/400', projectType: 'Commercial', workClassification: 'New Build', geofenceRadius: 150 },
    { id: 2, companyId: 1, name: 'Suburban Housing Development', location: { address: '456 Oak Ave, Manchester', lat: 53.4808, lng: -2.2426 }, budget: 12000000, actualCost: 12500000, startDate: new Date('2022-11-10'), status: 'Active', imageUrl: 'https://picsum.photos/seed/project2/800/400', projectType: 'Residential', workClassification: 'Development', geofenceRadius: 500 },
    { id: 3, companyId: 1, name: 'Historic Library Renovation', location: { address: '789 Elm St, London', lat: 51.515, lng: -0.131 }, budget: 850000, actualCost: 920000, startDate: new Date('2023-01-20'), status: 'On Hold', imageUrl: 'https://picsum.photos/seed/project3/800/400', projectType: 'Renovation', workClassification: 'Contracting' },
    { id: 4, companyId: 2, name: 'Coastal Bridge Repair', location: { address: '101 Coast Rd, Brighton', lat: 50.8225, lng: -0.1372 }, budget: 2200000, actualCost: 1500000, startDate: new Date('2023-08-01'), status: 'Active', imageUrl: 'https://picsum.photos/seed/project4/800/400', projectType: 'Infrastructure', workClassification: 'Civil Engineering', geofenceRadius: 200 }
  ],
  projectAssignments: [
    { projectId: 1, userId: 102 }, { projectId: 1, userId: 103 }, { projectId: 1, userId: 104 }, { projectId: 1, userId: 105 }, { projectId: 1, userId: 106 },
    { projectId: 2, userId: 102 }, { projectId: 2, userId: 106 },
    { projectId: 3, userId: 102 },
    { projectId: 4, userId: 202 },
  ],
  todos: [
    { id: 1, projectId: 1, text: 'Finalize foundation rebar placement', status: TodoStatus.IN_PROGRESS, priority: TodoPriority.HIGH, creatorId: 102, assigneeId: 103, createdAt: new Date(), dueDate: new Date(new Date().setDate(new Date().getDate() + 2)) },
    { id: 2, projectId: 1, text: 'Schedule concrete pour for foundation', status: TodoStatus.TODO, priority: TodoPriority.HIGH, creatorId: 102, assigneeId: 102, createdAt: new Date(), dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), dependsOn: 1 },
    { id: 3, projectId: 1, text: 'Update weekly safety logs', status: TodoStatus.DONE, priority: TodoPriority.MEDIUM, creatorId: 105, assigneeId: 105, createdAt: new Date(), completedAt: new Date() },
    { id: 4, projectId: 2, text: 'Order roofing materials for Phase 2', status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, creatorId: 102, assigneeId: 102, createdAt: new Date(), dueDate: new Date(new Date().setDate(new Date().getDate() + 10)) },
    { id: 5, projectId: 1, text: 'Submit updated blueprint to client', status: TodoStatus.TODO, priority: TodoPriority.LOW, creatorId: 102, createdAt: new Date() }
  ],
  documents: [
    { id: 1, projectId: 1, name: 'Structural_Blueprints_Rev3.pdf', category: DocumentCategory.BLUEPRINTS, url: '#', status: DocumentStatus.APPROVED, uploadedAt: new Date(), creatorId: 102, version: 3 },
    { id: 2, projectId: 1, name: 'Site_Safety_Plan.pdf', category: DocumentCategory.HS, url: '#', status: DocumentStatus.APPROVED, uploadedAt: new Date(), creatorId: 105, version: 1 },
    { id: 3, projectId: 2, name: 'Phase_1_Permit.pdf', category: DocumentCategory.PERMITS, url: '#', status: DocumentStatus.APPROVED, uploadedAt: new Date(), creatorId: 102, version: 1 },
  ],
  documentAcks: [
    { id: 1, userId: 104, documentId: 2, acknowledgedAt: new Date() }
  ],
  timesheets: [
    { id: 1, userId: 104, projectId: 1, clockIn: new Date(new Date().setDate(new Date().getDate() - 1)), clockOut: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(17)), workType: WorkType.GENERAL_LABOR, status: TimesheetStatus.APPROVED, breaks: [], trustScore: 0.95 },
    { id: 2, userId: 106, projectId: 2, clockIn: new Date(new Date().setDate(new Date().getDate() - 1)), clockOut: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(16, 30)), workType: WorkType.EQUIPMENT_OPERATION, status: TimesheetStatus.PENDING, breaks: [{startTime: new Date(new Date().setHours(12)), endTime: new Date(new Date().setHours(12, 30))}], trustScore: 0.75, trustReasons: { geofence: 'User was outside project geofence.'}},
    { id: 3, userId: 104, projectId: 1, clockIn: new Date(new Date().setHours(8)), clockOut: null, workType: WorkType.GENERAL_LABOR, status: TimesheetStatus.PENDING, breaks: [] },
  ],
  safetyIncidents: [
    { id: 1, projectId: 1, reporterId: 104, timestamp: new Date(), severity: IncidentSeverity.LOW, type: IncidentType.NEAR_MISS, description: 'Dropped hammer from level 2, landed in safe zone.', locationOnSite: 'Level 2, East Wing', status: IncidentStatus.RESOLVED },
    { id: 2, projectId: 2, reporterId: 106, timestamp: new Date(), severity: IncidentSeverity.MEDIUM, type: IncidentType.HAZARD_OBSERVATION, description: 'Large pothole in main access road causing issues for vehicles.', locationOnSite: 'Site Entrance', status: IncidentStatus.UNDER_REVIEW },
  ],
  equipment: [
    { id: 1, companyId: 1, name: 'Excavator EX-101', type: 'Heavy Machinery', status: EquipmentStatus.IN_USE, projectId: 1 },
    { id: 2, companyId: 1, name: 'Crane C-20', type: 'Heavy Machinery', status: EquipmentStatus.AVAILABLE },
    { id: 3, companyId: 1, name: 'Generator G-5', type: 'Power Tool', status: EquipmentStatus.MAINTENANCE },
  ],
  resourceAssignments: [
      { id: 1, companyId: 1, projectId: 1, resourceId: 104, resourceType: 'user', startDate: new Date('2023-10-09'), endDate: new Date('2023-10-13') }
  ],
  clients: [
      { id: 1, companyId: 1, name: 'Global Property Group', contactEmail: 'contact@gpg.com', contactPhone: '555-1234', createdAt: new Date() }
  ],
  invoices: [
      { id: 1, companyId: 1, clientId: 1, projectId: 1, status: InvoiceStatus.PAID, total: 150000, amountDue: 0, issuedAt: new Date(), dueAt: new Date(), items: [] }
  ],
  quotes: [
      { id: 1, companyId: 1, clientId: 1, projectId: 3, status: QuoteStatus.SENT, total: 850000, issuedAt: new Date(), validUntil: new Date() }
  ],
  operativeReports: [],
  conversations: [
      { id: 1, participants: [102, 103], messages: [{ id: 1, senderId: 102, content: "Frank, how's the rebar coming along?", timestamp: new Date(), isRead: true }], lastMessage: { id: 1, senderId: 102, content: "Frank, how's the rebar coming along?", timestamp: new Date(), isRead: true } }
  ],
  announcements: [
      { id: 1, senderId: 101, scope: 'company', title: 'New Safety Protocols for Q4', content: 'All staff must review the new safety documentation available in the app.', createdAt: new Date() }
  ],
  auditLogs: [
      { id: 1, actorId: 102, action: AuditLogAction.PROJECT_CREATED, timestamp: new Date(), target: { id: 1, type: 'Project', name: 'Downtown Office Tower' }, companyId: 1 },
      { id: 2, actorId: 104, action: AuditLogAction.TIMESHEET_APPROVED, timestamp: new Date(), target: { id: 1, type: 'Timesheet', name: 'Timesheet #1' }, companyId: 1 }
  ],
  platformSettings: {
    mfaRequired: false,
    newTenantOnboardingWorkflow: 'manual',
    defaultStorageQuotaGB: 50,
    logRetentionDays: 90
  },
  companySettings: [
    { id: 1, companyId: 1, theme: 'light', notificationPreferences: { projectUpdates: true, timeReminders: true, photoRequirements: false }, locationPreferences: { gpsAccuracy: 'standard', backgroundTracking: true, locationHistoryDays: 30 } }
  ],
  projectTemplates: [
      { id: 1, companyId: 1, name: 'Standard Commercial Build', description: 'Template for new commercial buildings.', templateTasks: [{id: 't1', text: 'Initial site survey', priority: TodoPriority.HIGH}], documentCategories: [DocumentCategory.PERMITS, DocumentCategory.BLUEPRINTS], safetyProtocols: ['Hard hats required at all times.'] }
  ],
  monthlyFinancials: [
    { month: 'Apr', revenue: 120000, costs: 95000, profit: 25000 },
    { month: 'May', revenue: 150000, costs: 110000, profit: 40000 },
    { month: 'Jun', revenue: 180000, costs: 135000, profit: 45000 },
    { month: 'Jul', revenue: 160000, costs: 120000, profit: 40000 },
    { month: 'Aug', revenue: 210000, costs: 160000, profit: 50000 },
    { month: 'Sep', revenue: 250000, costs: 190000, profit: 60000 },
  ],
  costBreakdown: [
      { category: 'Labor', amount: 450000 },
      { category: 'Materials', amount: 620000 },
      { category: 'Subcontractors', amount: 250000 },
      { category: 'Permits', amount: 50000 },
      { category: 'Overhead', amount: 180000 },
  ],
};
