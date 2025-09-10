import { GoogleGenAI, Type } from "@google/genai";
import {
    Company, User, Project, Timesheet, Document, Todo,
    Site, Role, TimesheetStatus, WorkType, DocumentStatus, DocumentCategory,
    TodoStatus, TodoPriority, AuditLog, AuditLogAction, SafetyIncident,
    IncidentSeverity, IncidentType, IncidentStatus, ProjectHealth,
    DocumentAcknowledgement, CompanySettings, DailyLog, CostEstimate,
    Equipment, EquipmentStatus, ResourceAssignment, RFI, RFIStatus,
    AISearchResult, OperativeReport, Client, Quote, QuoteStatus, Invoice, InvoiceStatus, SubTask, Comment, Tool, Grant, RiskAnalysis, BidPackage, Permission, SystemHealth, UsageMetric, FinancialKPIs, PendingApproval, PlatformSettings, ProjectPhoto, ProjectAssignment, WeatherForecast, Announcement
} from '../types';
import { MOCK_DATA } from './mockData';
import { hasPermission } from './auth';

const LATENCY = 200; // ms

// A mock implementation of the Gemini API client for AI-powered features
class MockGeminiAPI {
    ai: GoogleGenAI;
    constructor() {
        // This is for show, to adhere to the coding guidelines.
        // No actual calls are made, so the API key doesn't need to be real.
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "mock_api_key" });
    }

    async generate(prompt: string): Promise<string> {
        await new Promise(res => setTimeout(res, LATENCY * 2));
        if (prompt.toLowerCase().includes('health report')) {
            return JSON.stringify({
                score: 85,
                summary: "Project is on track. Minor concerns with task slippage in the 'Framing' phase. Proactive communication with the client is excellent.",
                risks: ["Potential 2-day delay on framing if subcontractor availability doesn't improve.", "One unresolved high-priority RFI regarding HVAC specifications."],
                positives: ["Safety compliance is 100% for the last reporting period.", "Material costs are currently 5% under budget.", "Client feedback has been consistently positive."]
            });
        }
        if (prompt.toLowerCase().includes('cost estimate')) {
            return JSON.stringify([
                { category: 'Materials', item: 'Concrete (4000 PSI)', quantity: '150 cubic yards', unitCost: 200, totalCost: 30000, justification: 'Based on standard slab foundation requirements.' },
                { category: 'Labor', item: 'Foundation Pouring Crew (5 workers)', quantity: '40 hours', unitCost: 75, totalCost: 15000, justification: 'Standard crew size and hours for a project of this scale.' },
                { category: 'Equipment', item: 'Concrete Pump Truck Rental', quantity: '1 day', unitCost: 1200, totalCost: 1200, justification: 'Required for efficient pouring on-site.' },
            ]);
        }
        if (prompt.toLowerCase().includes('safety analysis')) {
             return JSON.stringify({
                report: `**Safety Analysis Report**

**Summary:**
Analysis of the 3 reported incidents reveals a recurring theme of minor issues related to site organization and material storage. While no injuries occurred, these "Near Miss" and "Hazard Observation" events indicate a need for improved housekeeping protocols.

**Key Trends:**
- **Cluttered Walkways:** 2 of the 3 incidents involved trip hazards from improperly stored materials or tools.
- **Time of Day:** All incidents were reported in the late afternoon, suggesting end-of-day fatigue or rushing could be a contributing factor.

**Recommendations:**
1.  **Mandatory End-of-Day Cleanup:** Implement a 15-minute period before shift end for all operatives to clear their work areas.
2.  **Toolbox Talk:** Conduct a toolbox talk specifically on "Housekeeping and Hazard Awareness" this week.
3.  **Increase Spot Checks:** The site foreman should perform and log at least two random housekeeping spot checks daily.`
            });
        }
        if (prompt.toLowerCase().includes('analyze text')) {
             return JSON.stringify({
                overallScore: 75,
                summary: "The text indicates a potential schedule risk due to vaguely defined completion dates ('end of month') and a financial risk from unspecified material costs. It's recommended to clarify these points before proceeding.",
                identifiedRisks: [
                    { severity: 'Medium', description: "Vague deadline: 'work to be completed by end of month'.", recommendation: "Define a specific date (e.g., 'by October 31st')." },
                    { severity: 'Low', description: "Unspecified material costs: 'cost of materials to be determined'.", recommendation: "Request a detailed quote for materials before signing." }
                ]
            });
        }
         if (prompt.toLowerCase().includes('bid package')) {
            return JSON.stringify({
                coverLetter: "Dear Sir/Madam,\n\nPlease find our bid package for the above-referenced project. We believe our expertise in sustainable building makes us an ideal partner...\n\nSincerely,\nAS Agents Construction",
                checklist: ["Form of Tender", "Pricing Summary", "Health and Safety Plan", "Insurance Certificates"],
                summary: "This bid outlines our competitive pricing and highlights our commitment to quality and safety, leveraging over 15 years of experience in commercial construction."
            });
        }
         if (prompt.toLowerCase().includes('daily summary')) {
            return `### Daily Summary for Project Alpha - ${new Date().toLocaleDateString()}

**Overall Status:** Green. Progress is steady and on schedule.

**Key Activities Completed:**
- Task #3: "Install safety netting on perimeter" was completed by the safety team.
- All scheduled concrete pours for the sub-level garage were finished.

**Safety:**
- No new incidents reported today.
- One safety observation regarding material storage was resolved.

**Operative Reports:**
- Olivia Operative reported completion of interior fittings on floor 2. Noted minor delay due to weather but confirmed the team is back on track.

**Blockers / Issues:**
- None.

**Plan for Tomorrow:**
- Begin framing on Floor 6.
- Scheduled delivery of HVAC units.`;
        }
        return "This is a mock AI response.";
    }
}

class MockApi {
    private db = MOCK_DATA;
    private gemini = new MockGeminiAPI();

    private getActor(actorId: number): User {
        const actor = this.db.users.find(u => u.id === actorId);
        if (!actor) throw new Error("Action denied. Actor not found.");
        return actor;
    }

    private logAction(
        actorId: number,
        action: AuditLogAction,
        projectId?: number,
        target?: { type: string, id: number | string, name: string }
    ) {
        const log: AuditLog = {
            id: Date.now() + Math.random(),
            projectId,
            actorId,
            action,
            target,
            timestamp: new Date(),
        };
        this.db.auditLogs.unshift(log);
    }
    
    // --- PLATFORM ADMIN APIs ---
    
    async getAllCompaniesForAdmin(actorId: number): Promise<Company[]> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_TENANTS)) {
            throw new Error("Permission Denied: Cannot view all companies.");
        }
        return new Promise(res => setTimeout(() => res([...this.db.companies]), LATENCY));
    }
    
    async getPlatformStats(actorId: number): Promise<{ totalCompanies: number, totalUsers: number, activeProjects: number }> {
        const actor = this.getActor(actorId);
         if (!hasPermission(actor, Permission.VIEW_PLATFORM_METRICS)) {
            throw new Error("Permission Denied: Cannot view platform stats.");
        }
        return new Promise(res => setTimeout(() => res({
            totalCompanies: this.db.companies.length,
            totalUsers: this.db.users.filter(u => u.role !== Role.PRINCIPAL_ADMIN).length, // Exclude super admin from tenant user count
            activeProjects: this.db.projects.length, // Simplified
        }), LATENCY));
    }
    
    async updateCompanyStatus(companyId: number, status: Company['status'], actorId: number): Promise<Company> {
        const actor = this.getActor(actorId);
         if (!hasPermission(actor, Permission.MANAGE_TENANTS)) {
            throw new Error("Permission Denied: Cannot update company status.");
        }
        const company = this.db.companies.find(c => c.id === companyId);
        if (!company) throw new Error("Company not found");
        company.status = status;

        const actionMap = {
            'Active': AuditLogAction.TENANT_ACTIVATED,
            'Suspended': AuditLogAction.TENANT_SUSPENDED,
            'Archived': AuditLogAction.TENANT_ARCHIVED,
        };
        this.logAction(actorId, actionMap[status], undefined, { type: 'company', id: companyId, name: company.name });

        return new Promise(res => setTimeout(() => res({...company}), LATENCY));
    }
    
    async inviteCompany(name: string, adminEmail: string, actorId: number): Promise<void> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_TENANTS)) {
            throw new Error("Permission Denied: Cannot invite new company.");
        }
        // In a real app, this would trigger a workflow: create a new DB, send an email, etc.
        // Here we just log it.
        console.log(`[Mock API] Principal Admin ${actorId} invited new company "${name}" with admin email ${adminEmail}.`);
        this.logAction(actorId, AuditLogAction.TENANT_INVITED, undefined, { type: 'company', id: 0, name });
        return new Promise(res => setTimeout(res, LATENCY * 4)); // Increased latency
    }

    async getSystemHealth(actorId: number): Promise<SystemHealth> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.VIEW_PLATFORM_METRICS)) {
            throw new Error("Permission Denied: Cannot view system health.");
        }
        return new Promise(res => setTimeout(() => res({ ...this.db.systemHealth }), LATENCY));
    }

    async getUsageMetrics(actorId: number): Promise<UsageMetric[]> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.VIEW_PLATFORM_METRICS)) {
            throw new Error("Permission Denied: Cannot view usage metrics.");
        }
        return new Promise(res => setTimeout(() => res(this.db.usageMetrics.map(m => ({ ...m }))), LATENCY));
    }

    async getPlatformSettings(actorId: number): Promise<PlatformSettings> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_TENANTS)) {
            throw new Error("Permission Denied: Cannot view platform settings.");
        }
        return new Promise(res => setTimeout(() => res({ ...this.db.platformSettings }), LATENCY));
    }

    async updatePlatformSettings(updates: Partial<PlatformSettings>, actorId: number): Promise<PlatformSettings> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_TENANTS)) {
            throw new Error("Permission Denied: Cannot update platform settings.");
        }
        this.db.platformSettings = { ...this.db.platformSettings, ...updates };
        this.logAction(actorId, AuditLogAction.PLATFORM_SETTINGS_UPDATED, undefined, { type: 'settings', id: 'platform', name: 'System Settings' });
        return new Promise(res => setTimeout(() => res({ ...this.db.platformSettings }), LATENCY));
    }

    async getPendingApprovalsForPlatform(actorId: number): Promise<PendingApproval[]> {
        const actor = this.getActor(actorId);
        if (actor.role !== Role.PRINCIPAL_ADMIN) {
            throw new Error("Permission Denied: Cannot view all pending approvals.");
        }
        // Return a copy to prevent mutation
        return new Promise(res => setTimeout(() => res(this.db.pendingApprovals.map(pa => ({...pa}))), LATENCY));
    }

    async getPlatformAuditLogs(actorId: number): Promise<AuditLog[]> {
        const actor = this.getActor(actorId);
        if (actor.role !== Role.PRINCIPAL_ADMIN) {
            throw new Error("Permission Denied.");
        }
        const logs = this.db.auditLogs.filter(l => !l.projectId);
        return new Promise(res => setTimeout(() => res(logs.map(l => ({...l}))), LATENCY));
    }


    // --- TENANT-SCOPED APIs ---

    // COMPANIES & SETTINGS
    async getCompanies(): Promise<Company[]> {
        // This is for the login screen, so it should return all active companies
        return new Promise(res => setTimeout(() => res([...this.db.companies.filter(c => c.status === 'Active')]), LATENCY));
    }
    async getCompanySettings(companyId: number): Promise<CompanySettings | null> {
        const setting = this.db.companySettings.find(s => s.companyId === companyId) || null;
        return new Promise(res => setTimeout(() => res(setting ? {...setting} : null), LATENCY));
    }
    async updateCompanySettings(companyId: number, updates: Partial<CompanySettings>, actorId: number): Promise<CompanySettings> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_COMPANY_SETTINGS)) {
            throw new Error("Permission Denied: Cannot update company settings.");
        }
        
        let setting = this.db.companySettings.find(s => s.companyId === companyId);
        if (setting) {
            setting = { ...setting, ...updates };
            this.db.companySettings = this.db.companySettings.map(s => s.companyId === companyId ? setting! : s);
        } else {
            throw new Error("Settings not found");
        }
        return new Promise(res => setTimeout(() => res({...setting!}), LATENCY));
    }

    // USERS
    async getUsersByCompany(companyId: number | undefined): Promise<User[]> {
        if (companyId === undefined) { // For Principal Admin to get all users
            return new Promise(res => setTimeout(() => res(this.db.users.map(u => ({ ...u }))), LATENCY));
        }
        const users = this.db.users.filter(u => u.companyId === companyId);
        return new Promise(res => setTimeout(() => res(users.map(u => ({...u}))), LATENCY));
    }
    async getUsersByProject(projectId: number, companyId: number): Promise<User[]> {
        const project = this.db.projects.find(p => p.id === projectId && p.companyId === companyId);
        if (!project) return Promise.resolve([]);

        const assignments = this.db.projectAssignments.filter(a => a.projectId === projectId);
        const userIds = new Set(assignments.map(a => a.userId));
        const users = this.db.users.filter(u => userIds.has(u.id) && u.companyId === companyId);
        return new Promise(res => setTimeout(() => res(users.map(u => ({...u}))), LATENCY));
    }
    async getUnassignedUsers(projectId: number, companyId: number): Promise<User[]> {
        const projectUsers = await this.getUsersByProject(projectId, companyId);
        const projectUserIds = new Set(projectUsers.map(u => u.id));
        const companyUsers = this.db.users.filter(u => u.companyId === companyId);
        const unassigned = companyUsers.filter(u => !projectUserIds.has(u.id));
        return new Promise(res => setTimeout(() => res(unassigned.map(u => ({...u}))), LATENCY));
    }
    async getProjectsByUser(userId: number): Promise<Project[]> {
        const user = this.db.users.find(u => u.id === userId);
        if (!user || !user.companyId) return Promise.resolve([]);
        const assignments = this.db.projectAssignments.filter(a => a.userId === userId);
        const projectIds = new Set(assignments.map(a => a.projectId));
        const projects = this.db.projects.filter(p => projectIds.has(p.id) && p.companyId === user.companyId);
        return new Promise(res => setTimeout(() => res(projects.map(p => ({...p}))), LATENCY));
    }
     async getProjectsByManager(userId: number): Promise<Project[]> {
        const user = this.db.users.find(u => u.id === userId);
        if (!user || !user.companyId) return Promise.resolve([]);
        const projects = this.db.projects.filter(p => p.managerId === userId && p.companyId === user.companyId);
        return new Promise(res => setTimeout(() => res(projects.map(p => ({...p}))), LATENCY));
    }

    // PROJECTS
    async getProjectsByCompany(companyId: number): Promise<Project[]> {
        const projects = this.db.projects.filter(p => p.companyId === companyId);
        return new Promise(res => setTimeout(() => res(projects.map(p => ({...p}))), LATENCY));
    }
     async assignUserToProject(userId: number, projectId: number, actorId: number): Promise<void> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_TEAM)) throw new Error("Permission Denied.");
        this.db.projectAssignments.push({ userId, projectId });
        const user = this.db.users.find(u => u.id === userId);
        this.logAction(actorId, AuditLogAction.USER_ASSIGNED, projectId, { type: 'user', id: userId, name: user!.name });
        return new Promise(res => setTimeout(res, LATENCY));
    }
    async unassignUserFromProject(userId: number, projectId: number, actorId: number): Promise<void> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_TEAM)) throw new Error("Permission Denied.");
        this.db.projectAssignments = this.db.projectAssignments.filter(a => !(a.userId === userId && a.projectId === projectId));
        const user = this.db.users.find(u => u.id === userId);
        this.logAction(actorId, AuditLogAction.USER_UNASSIGNED, projectId, { type: 'user', id: userId, name: user!.name });
        return new Promise(res => setTimeout(res, LATENCY));
    }
    async updateProjectManager(projectId: number, newManagerId: number, actorId: number): Promise<Project> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_PROJECTS)) {
            throw new Error("Permission Denied: Cannot change project manager.");
        }
        
        const project = this.db.projects.find(p => p.id === projectId);
        if (!project) throw new Error("Project not found.");

        const newManager = this.db.users.find(u => u.id === newManagerId);
        if (!newManager) throw new Error("New manager not found.");

        project.managerId = newManagerId;

        this.logAction(actorId, AuditLogAction.PROJECT_MANAGER_CHANGED, projectId, { 
            type: 'user', 
            id: newManagerId, 
            name: newManager.name 
        });

        return new Promise(res => setTimeout(() => res({ ...project }), LATENCY));
    }
    async getProjectAssignmentsByCompany(companyId: number): Promise<ProjectAssignment[]> {
        const companyProjects = new Set(this.db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        const assignments = this.db.projectAssignments.filter(pa => companyProjects.has(pa.projectId));
        return new Promise(res => setTimeout(() => res(assignments.map(a => ({...a}))), LATENCY));
    }


    // TIMESHEETS
    async getTimesheetsByUser(userId: number): Promise<Timesheet[]> {
        const timesheets = this.db.timesheets.filter(t => t.userId === userId).sort((a,b) => b.clockIn.getTime() - a.clockIn.getTime());
        return new Promise(res => setTimeout(() => res(timesheets.map(t => ({...t}))), LATENCY));
    }
    async getTimesheetsByCompany(companyId: number, actorId: number): Promise<Timesheet[]> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.VIEW_ALL_TIMESHEETS)) {
            throw new Error("Permission Denied.");
        }
        const projects = this.db.projects.filter(p => p.companyId === companyId);
        const projectIds = new Set(projects.map(p => p.id));
        const timesheets = this.db.timesheets.filter(t => projectIds.has(t.projectId)).sort((a,b) => b.clockIn.getTime() - a.clockIn.getTime());
        return new Promise(res => setTimeout(() => res(timesheets.map(t => ({...t}))), LATENCY));
    }
     async getTimesheetsForManager(managerId: number): Promise<Timesheet[]> {
        const actor = this.getActor(managerId);
        if (!hasPermission(actor, Permission.VIEW_ALL_TIMESHEETS)) {
            throw new Error("Permission Denied.");
        }
        const managedProjects = this.db.projects.filter(p => p.managerId === managerId);
        const projectIds = new Set(managedProjects.map(p => p.id));
        const timesheets = this.db.timesheets.filter(t => projectIds.has(t.projectId)).sort((a,b) => b.clockIn.getTime() - a.clockIn.getTime());
        return new Promise(res => setTimeout(() => res(timesheets.map(t => ({...t}))), LATENCY));
    }
    async updateTimesheetStatus(timesheetId: number, status: TimesheetStatus, comment: string | undefined, actorId: number): Promise<Timesheet> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_TIMESHEETS)) {
            throw new Error("Permission Denied.");
        }
        const timesheet = this.db.timesheets.find(t => t.id === timesheetId);
        if (!timesheet) throw new Error("Timesheet not found");
        timesheet.status = status;
        if (comment) {
            timesheet.comment = `[${status} by ${actor.name}]: ${comment}`;
        }
        const action = status === TimesheetStatus.APPROVED ? AuditLogAction.TIMESHEET_APPROVED : AuditLogAction.TIMESHEET_REJECTED;
        const user = this.db.users.find(u => u.id === timesheet.userId);
        this.logAction(actorId, action, timesheet.projectId, { type: 'timesheet', id: timesheetId, name: `Timesheet for ${user?.name}` });
        return new Promise(res => setTimeout(() => res({ ...timesheet }), LATENCY));
    }
    async clockIn(userId: number, projectId: number, location: { lat: number, lng: number, accuracy: number }, workType: WorkType): Promise<Timesheet> {
        // Clock-in is a user-level action, permission check is implicit
        if (this.db.timesheets.some(t => t.userId === userId && t.clockOut === null)) {
            throw new Error("User is already clocked in.");
        }
        const project = this.db.projects.find(p => p.id === projectId)!;
        const R = 6371e3; // metres
        const φ1 = project.location.lat * Math.PI/180;
        const φ2 = location.lat * Math.PI/180;
        const Δφ = (location.lat-project.location.lat) * Math.PI/180;
        const Δλ = (location.lng-project.location.lng) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // in metres

        let trustScore = 1.0;
        const trustReasons: Record<string, string> = {};

        if (d > project.radius) {
            trustScore -= 0.5;
            trustReasons['location'] = `Outside geofence by ${Math.round(d - project.radius)}m`;
        }
        if (location.accuracy > 50) {
            trustScore -= 0.2;
             trustReasons['accuracy'] = `Low GPS accuracy (${Math.round(location.accuracy)}m)`;
        }

        const newTimesheet: Timesheet = {
            id: Date.now(),
            userId,
            projectId,
            clockIn: new Date(),
            clockOut: null,
            status: TimesheetStatus.PENDING,
            clockInLocation: { lat: location.lat, lng: location.lng },
            trustScore: Math.max(0.1, trustScore),
            trustReasons,
            workType,
            breaks: [],
            comment: ''
        };
        this.db.timesheets.push(newTimesheet);
        return new Promise(res => setTimeout(() => res({...newTimesheet}), LATENCY));
    }
    async clockOut(timesheetId: number, location: { lat: number, lng: number }): Promise<Timesheet> {
        const timesheet = this.db.timesheets.find(t => t.id === timesheetId);
        if (!timesheet) throw new Error("Timesheet not found");
        timesheet.clockOut = new Date();
        timesheet.clockOutLocation = location;
        return new Promise(res => setTimeout(() => res({...timesheet}), LATENCY));
    }
    
    // DOCUMENTS
    async getDocumentsByProject(projectId: number): Promise<Document[]> {
        const docs = this.db.documents.filter(d => d.projectId === projectId).sort((a,b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
        return new Promise(res => setTimeout(() => res(docs.map(d => ({...d}))), LATENCY));
    }
    async getDocumentsByProjectIds(projectIds: number[]): Promise<Document[]> {
        const idSet = new Set(projectIds);
        const docs = this.db.documents.filter(d => idSet.has(d.projectId));
        return new Promise(res => setTimeout(() => res(docs.map(d => ({...d}))), LATENCY));
    }
    async getDocumentsByCompany(companyId: number): Promise<Document[]> {
        const projects = this.db.projects.filter(p => p.companyId === companyId);
        const projectIds = new Set(projects.map(p => p.id));
        const docs = this.db.documents.filter(d => projectIds.has(d.projectId));
        return new Promise(res => setTimeout(() => res(docs.map(d => ({...d}))), LATENCY));
    }
    async acknowledgeDocument(userId: number, documentId: number): Promise<DocumentAcknowledgement> {
        const ack: DocumentAcknowledgement = {
            id: Date.now(),
            userId,
            documentId,
            acknowledgedAt: new Date()
        };
        this.db.documentAcks.push(ack);
        const doc = this.db.documents.find(d => d.id === documentId);
        this.logAction(userId, AuditLogAction.DOCUMENT_ACKNOWLEDGED, doc!.projectId, { type: 'document', id: documentId, name: doc!.name });
        return new Promise(res => setTimeout(() => res({...ack}), LATENCY));
    }
    async getAcksByDocument(projectId: number): Promise<DocumentAcknowledgement[]> {
        // This is a simplification; in reality, you'd query by document IDs in the project
        const projectDocs = this.db.documents.filter(d => d.projectId === projectId);
        const docIds = new Set(projectDocs.map(d => d.id));
        const acks = this.db.documentAcks.filter(ack => docIds.has(ack.documentId));
        return new Promise(res => setTimeout(() => res(acks.map(a => ({...a}))), LATENCY));
    }
    async getDocumentAcksForUser(userId: number): Promise<DocumentAcknowledgement[]> {
        const acks = this.db.documentAcks.filter(ack => ack.userId === userId);
        return new Promise(res => setTimeout(() => res(acks.map(a => ({...a}))), LATENCY));
    }
     async initiateDocumentUpload(docData: { name: string, projectId: number, category: DocumentCategory, creatorId: number }): Promise<Document> {
        const actor = this.getActor(docData.creatorId);
        if (!hasPermission(actor, Permission.MANAGE_DOCUMENTS)) throw new Error("Permission Denied.");
        
        const latestVersion = this.db.documents
            .filter(d => d.name === docData.name && d.projectId === docData.projectId)
            .reduce((max, d) => d.version > max ? d.version : max, 0);

        const newDoc: Document = {
            id: Date.now(),
            name: docData.name,
            url: '',
            projectId: docData.projectId,
            status: DocumentStatus.UPLOADING,
            uploadedAt: new Date(),
            category: docData.category,
            version: latestVersion + 1,
            documentGroupId: this.db.documents.find(d => d.name === docData.name)?.documentGroupId || Date.now() + Math.random(),
            creatorId: docData.creatorId,
        };
        this.db.documents.push(newDoc);
        this.logAction(docData.creatorId, AuditLogAction.DOCUMENT_UPLOADED, docData.projectId, { type: 'document', id: newDoc.id, name: newDoc.name });
        return new Promise(res => setTimeout(() => res({ ...newDoc }), LATENCY / 2));
    }
    async performChunkedUpload(documentId: number, fileSize: number, onProgress: (progress: number) => void): Promise<void> {
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            onProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, LATENCY);
        return new Promise(res => setTimeout(() => res(), LATENCY * 6));
    }
    async finalizeDocumentUpload(documentId: number, userId: number): Promise<Document> {
        const doc = this.db.documents.find(d => d.id === documentId);
        if (!doc) throw new Error("Document not found for finalization.");

        // Simulate scanning and indexing
        doc.status = DocumentStatus.SCANNING;
        await new Promise(res => setTimeout(res, LATENCY * 4));
        doc.status = DocumentStatus.APPROVED;
        doc.indexedContent = `This is the indexed content for ${doc.name}. It contains important safety information and material specifications. The rebar should be grade 60. All personnel must wear hard hats.`;
        doc.url = `/mock-docs/${doc.name.replace(/\s/g, '_')}`;
        
        return new Promise(res => setTimeout(() => res({ ...doc }), LATENCY / 2));
    }

    // TODOS
    async getTodosByProject(projectId: number): Promise<Todo[]> {
        const todos = this.db.todos.filter(t => t.projectId === projectId).sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());
        return new Promise(res => setTimeout(() => res(todos.map(t => ({...t}))), LATENCY));
    }
    async getTodosByProjectIds(projectIds: number[]): Promise<Todo[]> {
        const idSet = new Set(projectIds);
        const todos = this.db.todos.filter(t => idSet.has(t.projectId));
        return new Promise(res => setTimeout(() => res(todos.map(t => ({...t}))), LATENCY));
    }
    async addTodo(taskData: Omit<Todo, 'id' | 'createdAt'>, creatorId: number): Promise<Todo> {
        const actor = this.getActor(creatorId);
        if (!hasPermission(actor, Permission.MANAGE_TASKS)) throw new Error("Permission Denied.");
        const newTodo: Todo = {
            ...taskData,
            id: Date.now(),
            createdAt: new Date(),
        };
        this.db.todos.unshift(newTodo);
        if (typeof newTodo.id === 'number') {
            this.logAction(creatorId, AuditLogAction.TODO_ADDED, taskData.projectId, { type: 'todo', id: newTodo.id, name: newTodo.text });
        }
        return new Promise(res => setTimeout(() => res({...newTodo}), LATENCY));
    }
    async updateTodo(todoId: number | string, updates: Partial<Todo>, actorId: number): Promise<Todo> {
        let todo = this.db.todos.find(t => t.id === todoId);
        if (!todo) throw new Error("Todo not found");

        const actor = this.getActor(actorId);
        // A user can update status if they have general MANAGE_TASKS or specific UPDATE_OWN_TASK_STATUS permission
        if (updates.status && !(hasPermission(actor, Permission.MANAGE_TASKS) || hasPermission(actor, Permission.UPDATE_OWN_TASK_STATUS))) {
            throw new Error("Permission Denied to update task status.");
        }
        // For other edits, require full management permission
        if (Object.keys(updates).some(k => k !== 'status') && !hasPermission(actor, Permission.MANAGE_TASKS)) {
             throw new Error("Permission Denied to edit task details.");
        }

        if(updates.status && updates.status !== todo.status) {
             if (typeof todo.id === 'number') {
                this.logAction(actorId, AuditLogAction.TODO_STATUS_CHANGED, todo.projectId, { type: 'todo', id: todo.id, name: todo.text });
             }
        }
        
        if (updates.hasOwnProperty('dependsOn')) {
            if (updates.dependsOn && todo.dependsOn !== updates.dependsOn) {
                const targetTodo = this.db.todos.find(t => t.id === updates.dependsOn);
                if (typeof todo.id === 'number' && targetTodo) {
                    this.logAction(actorId, AuditLogAction.TODO_DEPENDENCY_ADDED, todo.projectId, { type: 'todo', id: todo.id, name: `dependency on #${targetTodo.id}` });
                }
            } else if (!updates.dependsOn && todo.dependsOn) {
                if (typeof todo.id === 'number') {
                    this.logAction(actorId, AuditLogAction.TODO_DEPENDENCY_REMOVED, todo.projectId, { type: 'todo', id: todo.id, name: todo.text });
                }
            }
        }

        Object.assign(todo, updates);
        return new Promise(res => setTimeout(() => res({...todo!}), LATENCY));
    }
     async updateTodoReminder(todoId: number | string, reminderAt: Date | undefined, actorId: number): Promise<Todo> {
        const todo = this.db.todos.find(t => t.id === todoId);
        if (!todo) throw new Error("Todo not found");
        todo.reminderAt = reminderAt;
        if(reminderAt) {
            if (typeof todo.id === 'number') {
                this.logAction(actorId, AuditLogAction.TODO_REMINDER_SET, todo.projectId, { type: 'todo', id: todo.id, name: todo.text });
            }
        }
        return new Promise(res => setTimeout(() => res({...todo}), LATENCY));
    }
     async addComment(todoId: number | string, text: string, creatorId: number): Promise<Comment> {
        const todo = this.db.todos.find(t => t.id === todoId);
        if (!todo) throw new Error("Todo not found");
        const newComment: Comment = {
            id: Date.now(),
            text,
            creatorId,
            createdAt: new Date(),
        };
        if (!todo.comments) todo.comments = [];
        todo.comments.push(newComment);
        if (typeof todo.id === 'number') {
            this.logAction(creatorId, AuditLogAction.TODO_COMMENT_ADDED, todo.projectId, { type: 'todo', id: todo.id, name: todo.text });
        }
        return new Promise(res => setTimeout(() => res({...newComment}), LATENCY));
    }


    // AUDIT LOG
    async getAuditLogsByProject(projectId: number): Promise<AuditLog[]> {
        const logs = this.db.auditLogs.filter(l => l.projectId === projectId);
        return new Promise(res => setTimeout(() => res(logs.map(l => ({...l}))), LATENCY));
    }
     async getAuditLogsByCompany(companyId: number, limit: number = 5): Promise<AuditLog[]> {
        const companyProjects = new Set(this.db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        const logs = this.db.auditLogs
            .filter(l => l.projectId && companyProjects.has(l.projectId))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
        return new Promise(res => setTimeout(() => res(logs.map(l => ({ ...l }))), LATENCY));
    }
    
    // SAFETY INCIDENTS
    async getIncidentsByCompany(companyId: number): Promise<SafetyIncident[]> {
        const projects = this.db.projects.filter(p => p.companyId === companyId);
        const projectIds = new Set(projects.map(p => p.id));
        const incidents = this.db.safetyIncidents.filter(i => projectIds.has(i.projectId));
        return new Promise(res => setTimeout(() => res(incidents.map(i => ({...i}))), LATENCY));
    }
    async getIncidentsByProject(projectId: number): Promise<SafetyIncident[]> {
        const incidents = this.db.safetyIncidents.filter(i => i.projectId === projectId);
        return new Promise(res => setTimeout(() => res(incidents.map(i => ({...i}))), LATENCY));
    }
    async reportSafetyIncident(incidentData: Omit<SafetyIncident, 'id'>): Promise<SafetyIncident> {
        const newIncident: SafetyIncident = {
            ...incidentData,
            id: Date.now(),
        };
        this.db.safetyIncidents.push(newIncident);
        this.logAction(incidentData.reporterId, AuditLogAction.SAFETY_INCIDENT_REPORTED, incidentData.projectId, { type: 'incident', id: newIncident.id, name: newIncident.type });
        return new Promise(res => setTimeout(() => res({...newIncident}), LATENCY));
    }
    async getSafetyTasksForCompany(companyId: number): Promise<Todo[]> {
        const projects = this.db.projects.filter(p => p.companyId === companyId);
        const projectIds = new Set(projects.map(p => p.id));
        const tasks = this.db.todos.filter(t => projectIds.has(t.projectId) && t.isSafetyTask);
        return new Promise(res => setTimeout(() => res(tasks.map(t => ({...t}))), LATENCY));
    }

    // DAILY LOGS
    async getDailyLogsByProject(projectId: number): Promise<DailyLog[]> {
        const logs = this.db.dailyLogs.filter(l => l.projectId === projectId).sort((a,b) => b.date.getTime() - a.date.getTime());
        return new Promise(res => setTimeout(() => res(logs.map(l => ({...l}))), LATENCY));
    }
    async addDailyLog(logData: Omit<DailyLog, 'id'>, actorId: number): Promise<DailyLog> {
        const newLog: DailyLog = { ...logData, id: Date.now() };
        this.db.dailyLogs.push(newLog);
        this.logAction(actorId, AuditLogAction.DAILY_LOG_ADDED, logData.projectId);
        return new Promise(res => setTimeout(() => res({...newLog}), LATENCY));
    }
    
    // EQUIPMENT
    async getEquipmentByCompany(companyId: number): Promise<Equipment[]> {
        const equipment = this.db.equipment.filter(e => e.companyId === companyId);
        return new Promise(res => setTimeout(() => res(equipment.map(e => ({...e}))), LATENCY));
    }
    async getEquipmentByProject(projectId: number): Promise<Equipment[]> {
        const equipment = this.db.equipment.filter(e => e.projectId === projectId);
        return new Promise(res => setTimeout(() => res(equipment.map(e => ({...e}))), LATENCY));
    }
    async assignEquipmentToProject(equipmentId: number, projectId: number, actorId: number): Promise<Equipment> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_EQUIPMENT)) throw new Error("Permission Denied.");
        const item = this.db.equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        item.projectId = projectId;
        item.status = EquipmentStatus.IN_USE;
        this.logAction(actorId, AuditLogAction.EQUIPMENT_ASSIGNED, projectId, { type: 'equipment', id: equipmentId, name: item.name });
        return new Promise(res => setTimeout(() => res({...item}), LATENCY));
    }
    async unassignEquipmentFromProject(equipmentId: number, actorId: number): Promise<Equipment> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_EQUIPMENT)) throw new Error("Permission Denied.");
        const item = this.db.equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");
        const projectId = item.projectId;
        item.projectId = undefined;
        item.status = EquipmentStatus.AVAILABLE;
        this.logAction(actorId, AuditLogAction.EQUIPMENT_UNASSIGNED, projectId, { type: 'equipment', id: equipmentId, name: item.name });
        return new Promise(res => setTimeout(() => res({...item}), LATENCY));
    }
    async updateEquipmentStatus(equipmentId: number, status: EquipmentStatus, actorId: number): Promise<Equipment> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_EQUIPMENT)) throw new Error("Permission Denied.");
        const item = this.db.equipment.find(e => e.id === equipmentId);
        if (!item) throw new Error("Equipment not found");

        const oldStatus = item.status;
        const projectId = item.projectId;
        item.status = status;

        // If moving out of 'In Use' state, it's no longer on a project.
        if (oldStatus === EquipmentStatus.IN_USE && (status === EquipmentStatus.AVAILABLE || status === EquipmentStatus.MAINTENANCE)) {
            item.projectId = undefined;
        }

        this.logAction(actorId, AuditLogAction.EQUIPMENT_STATUS_CHANGED, projectId, { type: 'equipment', id: equipmentId, name: item.name });
        return new Promise(res => setTimeout(() => res({...item}), LATENCY));
    }
    
    // RESOURCES
    async getResourceAssignments(companyId: number): Promise<ResourceAssignment[]> {
         // This is a mock; in reality, you'd query based on company
        return new Promise(res => setTimeout(() => res(this.db.resourceAssignments.map(r => ({...r}))), LATENCY));
    }
    
    // RFIs
    async getRFIsByProject(projectId: number): Promise<RFI[]> {
        const rfis = this.db.rfis.filter(r => r.projectId === projectId);
        return new Promise(res => setTimeout(() => res(rfis.map(r => ({...r}))), LATENCY));
    }
    async createRFI(rfiData: Omit<RFI, 'id' | 'status' | 'createdAt'>, actorId: number): Promise<RFI> {
        const newRFI: RFI = {
            ...rfiData,
            id: Date.now(),
            status: RFIStatus.OPEN,
            createdAt: new Date(),
        };
        this.db.rfis.push(newRFI);
        this.logAction(actorId, AuditLogAction.RFI_CREATED, rfiData.projectId, { type: 'rfi', id: newRFI.id, name: newRFI.subject });
        return new Promise(res => setTimeout(() => res({...newRFI}), LATENCY));
    }
    async updateRFI(rfiId: number, updates: Partial<RFI>, actorId: number): Promise<RFI> {
        const rfi = this.db.rfis.find(r => r.id === rfiId);
        if (!rfi) throw new Error("RFI not found");
        if (updates.answer && !rfi.answer) {
            updates.status = RFIStatus.ANSWERED;
            updates.answeredAt = new Date();
            this.logAction(actorId, AuditLogAction.RFI_ANSWERED, rfi.projectId, { type: 'rfi', id: rfiId, name: rfi.subject });
        }
        Object.assign(rfi, updates);
        return new Promise(res => setTimeout(() => res({...rfi}), LATENCY));
    }

    // OPERATIVE REPORTS & PHOTOS
    async submitOperativeReport(reportData: { userId: number, projectId: number, notes: string, photoFile?: File }): Promise<OperativeReport> {
        const report: OperativeReport = {
            id: Date.now(),
            userId: reportData.userId,
            projectId: reportData.projectId,
            date: new Date(),
            notes: reportData.notes,
            photoUrl: reportData.photoFile ? URL.createObjectURL(reportData.photoFile) : undefined,
            status: 'Pending',
        };
        this.db.operativeReports.push(report);
        this.logAction(reportData.userId, AuditLogAction.OPERATIVE_REPORT_SUBMITTED, reportData.projectId);
        return new Promise(res => setTimeout(() => res({...report}), LATENCY));
    }
    async getOperativeReportsByProject(projectId: number): Promise<OperativeReport[]> {
        const reports = this.db.operativeReports.filter(r => r.projectId === projectId);
        return new Promise(res => setTimeout(() => res(reports.map(r => ({...r}))), LATENCY));
    }
    async getPhotosForProject(projectId: number): Promise<ProjectPhoto[]> {
        const photos = this.db.projectPhotos.filter(p => p.projectId === projectId);
        return new Promise(res => setTimeout(() => res(photos.map(p => ({...p}))), LATENCY));
    }
    async addProjectPhoto(photoData: Omit<ProjectPhoto, 'id' | 'createdAt'>, actorId: number): Promise<ProjectPhoto> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.MANAGE_DOCUMENTS)) { // Use MANAGE_DOCUMENTS permission for photos
            throw new Error("Permission Denied: Cannot add photos.");
        }
        const newPhoto: ProjectPhoto = {
            ...photoData,
            id: Date.now(),
            createdAt: new Date(),
        };
        this.db.projectPhotos.unshift(newPhoto);
        this.logAction(actorId, AuditLogAction.PROJECT_PHOTO_ADDED, photoData.projectId, { type: 'photo', id: newPhoto.id, name: newPhoto.caption });
        return new Promise(res => setTimeout(() => res({ ...newPhoto }), LATENCY * 2)); // Simulate upload
    }
    
    // CLIENTS, QUOTES, INVOICES
    async getClientsByCompany(companyId: number): Promise<Client[]> {
        return new Promise(res => setTimeout(() => res(this.db.clients.filter(c => c.companyId === companyId).map(c => ({...c}))), LATENCY));
    }
    async getQuotesByCompany(companyId: number): Promise<Quote[]> {
        return new Promise(res => setTimeout(() => res(this.db.quotes.filter(q => this.db.projects.find(p => p.id === q.projectId)?.companyId === companyId).map(q => ({...q}))), LATENCY));
    }
    async getInvoicesByCompany(companyId: number): Promise<Invoice[]> {
        return new Promise(res => setTimeout(() => res(this.db.invoices.filter(i => this.db.projects.find(p => p.id === i.projectId)?.companyId === companyId).map(i => ({...i}))), LATENCY));
    }
    async getFinancialKPIsForCompany(companyId: number, actorId: number): Promise<FinancialKPIs | null> {
        const actor = this.getActor(actorId);
        if (!hasPermission(actor, Permission.VIEW_FINANCES)) {
            throw new Error("Permission Denied: Cannot view financial KPIs.");
        }
        const kpi = this.db.financialKPIs.find(k => k.companyId === companyId) || null;
        return new Promise(res => setTimeout(() => res(kpi ? {...kpi} : null), LATENCY));
    }
    async getPendingApprovalsForCompany(companyId: number, actorId: number): Promise<PendingApproval[]> {
        const actor = this.getActor(actorId);
        // A simple check; a real app might have more granular permissions
        if (!hasPermission(actor, Permission.MANAGE_TIMESHEETS) && !hasPermission(actor, Permission.MANAGE_FINANCES)) {
             throw new Error("Permission Denied: Cannot view pending approvals.");
        }
        const approvals = this.db.pendingApprovals.filter(pa => pa.companyId === companyId);
        return new Promise(res => setTimeout(() => res(approvals.map(pa => ({...pa}))), LATENCY));
    }

    // ANNOUNCEMENTS
    async sendAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>, actorId: number): Promise<Announcement> {
        const actor = this.getActor(actorId);
        if (data.scope === 'company' && !hasPermission(actor, Permission.SEND_ANNOUNCEMENT)) throw new Error("Permission Denied.");
        if (data.scope === 'platform' && actor.role !== Role.PRINCIPAL_ADMIN) throw new Error("Permission Denied.");
        
        const newAnnouncement: Announcement = {
            ...data,
            id: Date.now(),
            createdAt: new Date(),
        };
        this.db.announcements.unshift(newAnnouncement);

        const action = data.scope === 'platform' ? AuditLogAction.PLATFORM_ANNOUNCEMENT_SENT : AuditLogAction.COMPANY_ANNOUNCEMENT_SENT;
        this.logAction(actorId, action, undefined, { type: 'announcement', id: newAnnouncement.id, name: data.title });

        return new Promise(res => setTimeout(() => res(newAnnouncement), LATENCY));
    }
    async getAnnouncementsForCompany(companyId: number): Promise<Announcement[]> {
        const announcements = this.db.announcements.filter(a => a.scope === 'platform' || a.companyId === companyId);
        return new Promise(res => setTimeout(() => res(announcements.map(a => ({...a}))), LATENCY));
    }
    async getPlatformAnnouncements(actorId: number): Promise<Announcement[]> {
        const actor = this.getActor(actorId);
        if (actor.role !== Role.PRINCIPAL_ADMIN) throw new Error("Permission Denied.");
        const announcements = this.db.announcements.filter(a => a.scope === 'platform');
        return new Promise(res => setTimeout(() => res(announcements.map(a => ({...a}))), LATENCY));
    }

    // DASHBOARD WIDGETS
    async getWeatherForProject(projectId: number): Promise<WeatherForecast> {
        // Mock weather based on project ID
        const project = this.db.projects.find(p => p.id === projectId);
        if (project && project.name.toLowerCase().includes('alpha')) { // London-like
            return { temperature: 18, condition: 'Partly Cloudy', icon: 'M3 12h1m8-9v1m8.61 1.39l-.7.7M12 21a9 9 0 110-18 9 9 0 010 18zm0 0v1' };
        }
        return { temperature: 22, condition: 'Sunny', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' };
    }


    // TOOLS
    async getTools(actorId: number): Promise<Tool[]> {
        const actor = this.getActor(actorId);
        const accessibleTools = this.db.tools.filter(tool => 
            !tool.requiredPermission || hasPermission(actor, tool.requiredPermission)
        );
        return new Promise(res => setTimeout(() => res([...accessibleTools]), LATENCY));
    }
    
    // --- AI POWERED FEATURES ---

    async generateDailySummary(projectId: number, date: Date, actorId: number): Promise<string> {
        const project = this.db.projects.find(p => p.id === projectId);
        if (!project) throw new Error("Project not found.");
        // Find data relevant to that day
        const prompt = `Generate a daily summary for project ${project.name} on ${date.toLocaleDateString()}. Data: ...`;
        const response = await this.gemini.generate(prompt);
        return response;
    }

    async findGrants(keywords: string, location: string): Promise<Grant[]> {
        await new Promise(res => setTimeout(res, LATENCY * 4));
        return [
            { id: 'g1', name: 'Green Retrofit Fund', agency: 'Gov.UK', amount: 'Up to £500,000', description: 'For projects improving energy efficiency in commercial buildings.', url: '#' },
            { id: 'g2', name: 'SME Construction Innovation Grant', agency: 'Innovate UK', amount: '£25,000 - £100,000', description: 'Supports small and medium-sized enterprises developing innovative construction methods or materials.', url: '#' },
        ];
    }

    async generateProjectHealthReport(project: Project, todos: Todo[], incidents: SafetyIncident[], logs: AuditLog[], personnel: User[], docs: Document[]): Promise<ProjectHealth> {
        const prompt = `Generate a health report for project "${project.name}". Budget: ${project.budget}, Actual Cost: ${project.actualCost}. Tasks: ${todos.length} total, ${todos.filter(t => t.status !== TodoStatus.DONE).length} open. Incidents: ${incidents.length} reported. Personnel: ${personnel.length} assigned. Focus on budget, schedule, safety, and team morale.`;
        const response = await this.gemini.generate(prompt);
        return JSON.parse(response) as ProjectHealth;
    }

    async estimateProjectCostsWithAi(project: Project, scope: string, actorId: number): Promise<CostEstimate[]> {
        const prompt = `Generate a cost estimate for the following scope of work for project "${project.name}": ${scope}`;
        this.logAction(actorId, AuditLogAction.COST_ESTIMATE_GENERATED, project.id);
        const response = await this.gemini.generate(prompt);
        return JSON.parse(response) as CostEstimate[];
    }

    async generateSafetyAnalysis(incidents: SafetyIncident[], projectId: number, actorId: number): Promise<{ report: string }> {
        const prompt = `Generate a safety analysis based on these incidents for project ID ${projectId}: ${JSON.stringify(incidents.map(i => i.description))}`;
        this.logAction(actorId, AuditLogAction.SAFETY_ANALYSIS_GENERATED, projectId);
        const response = await this.gemini.generate(prompt);
        return JSON.parse(response) as { report: string };
    }

    async analyzeForRisks(text: string): Promise<RiskAnalysis> {
        const prompt = `Analyze text for compliance and financial risks: ${text}`;
        const response = await this.gemini.generate(prompt);
        return JSON.parse(response) as RiskAnalysis;
    }

    async generateBidPackage(tenderUrl: string, strengths: string): Promise<BidPackage> {
        const prompt = `Generate a bid package. Tender URL: ${tenderUrl}, Company Strengths: ${strengths}`;
        const response = await this.gemini.generate(prompt);
        return JSON.parse(response) as BidPackage;
    }

    async searchAcrossDocuments(query: string, projectIds: number[], actorId: number): Promise<AISearchResult> {
        const docsToSearch = this.db.documents.filter(d => projectIds.includes(d.projectId) && d.indexedContent);
        
        // Simple mock search: find first doc with query in content
        const foundDoc = docsToSearch.find(d => d.indexedContent?.toLowerCase().includes(query.toLowerCase()));
        
        await new Promise(res => setTimeout(res, LATENCY * 5));

        if (foundDoc) {
            this.logAction(actorId, AuditLogAction.DOCUMENT_AI_QUERY);
            return {
                summary: `The term "${query}" was found in documents relating to structural specifications. It specifically mentions that all rebar should be Grade 60 and that personnel must wear hard hats in designated zones.`,
                sources: [
                    {
                        documentId: foundDoc.id,
                        snippet: foundDoc.indexedContent!,
                    }
                ]
            };
        } else {
            return {
                summary: `I couldn't find any documents that mention "${query}". Please try a different search term or ensure the relevant documents have been uploaded and processed.`,
                sources: []
            };
        }
    }
}

export const api = new MockApi();