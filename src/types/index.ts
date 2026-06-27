// ── Auth ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  is_superadmin: boolean;
  status: string;
  avatar_url: string | null;
  must_change_password: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ── Tenant ────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  email: string;
  country: string;
  currency: string;
  timezone: string;
  pan_number: string | null;
  vat_number: string | null;
  logo_url: string | null;
  max_projects: number;
  max_users: number;
}

// ── Project ───────────────────────────────────────────────────────
export type ProjectStatus =
  | "draft"
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectType =
  | "residential"
  | "commercial"
  | "infrastructure"
  | "industrial"
  | "renovation"
  | "other";

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  client_name: string | null;
  city: string | null;
  district: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_budget: number | null;
  approved_budget: number | null;
  currency: string;
  progress_percentage: number;
  project_manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  total: number;
  by_status: Record<ProjectStatus, number>;
  active_budget_total: number;
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  code: string;
  status: string;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: string;
  planned_date: string | null;
  actual_date: string | null;
  completion_percentage: number;
  is_critical: boolean;
  sequence: number;
}

// ── BOQ ───────────────────────────────────────────────────────────
export interface BudgetVersion {
  id: string;
  project_id: string;
  version_number: number;
  name: string;
  status: "draft" | "submitted" | "approved" | "superseded";
  total_material_cost: number;
  total_labour_cost: number;
  total_equipment_cost: number;
  total_amount: number;
  contingency_percentage: number;
  contingency_amount: number;
  grand_total: number;
  currency: string;
}

export interface BOQItem {
  id: string;
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  amount: number;
  material_rate: number;
  labour_rate: number;
  equipment_rate: number;
  actual_quantity: number;
  actual_amount: number;
  is_section_header: boolean;
  status: string;
  parent_id: string | null;
  sort_order: number;
}

export interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  standard_rate: number | null;
}

export interface BOQSummary {
  version_id: string;
  grand_total: number;
  total_amount: number;
  contingency_amount: number;
  total_material_cost: number;
  total_labour_cost: number;
  total_equipment_cost: number;
  items_count: number;
  planned_total: number;
  actual_total: number;
  variance: number;
}

// ── Approvals Inbox ──────────────────────────────────────────────
export interface ApprovalInboxItem {
  id: string;
  module: "finance" | "procurement" | "inventory" | "boq" | "documents" | string;
  item_type: string;
  title: string;
  subtitle: string | null;
  status: string;
  project_id: string | null;
  project_name: string | null;
  project_code: string | null;
  created_at: string;
  action_url: string | null;
  meta: Record<string, string | number | null>;
}

export interface ApprovalInboxResponse {
  total: number;
  counts: Record<string, number>;
  items: ApprovalInboxItem[];
}

// ── Dashboard Overview ──────────────────────────────────────────
export interface MonthlyCashflow {
  month: string;
  invoiced: number;
  received: number;
  expenses: number;
  labour_cost: number;
}

export interface PipelineStatus {
  count: number;
  value: number;
}

export interface ProcurementPipeline {
  by_status: Record<string, PipelineStatus>;
  total_po_value: number;
  total_pos: number;
}

export interface ModuleActivity {
  projects: number;
  procurement: number;
  finance: number;
  site_ops: number;
  inventory: number;
  quality: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  label: string;
  created_at: string;
}

export interface DashboardOverview {
  project_stats: ProjectStats;
  procurement_pipeline: ProcurementPipeline;
  monthly_cashflow: MonthlyCashflow[];
  pending_approvals: number;
  recent_projects: Project[];
  low_stock_count: number;
  module_activity: ModuleActivity;
  recent_activity: RecentActivity[];
}

export interface ProjectSnapshot {
  id: string;
  name: string;
  code: string;
  status: string;
  progress_percentage: number;
  estimated_budget: number;
  approved_budget: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
}

export interface HealthScore {
  overall: number;
  label: string;
  schedule: number;
  financial: number;
  quality: number;
  procurement: number;
  safety: number;
}

export interface BurnRate {
  approved_budget: number;
  total_spent: number;
  remaining_budget: number;
  over_budget: boolean;
  daily_burn: number;
  expected_spend: number;
  planned_progress_pct: number;
  elapsed_days: number;
  total_days: number;
  variance: number;
}

export interface BudgetVsActual {
  budget: number;
  actual: number;
  variance: number;
  utilization_pct: number;
  budget_version_name: string;
  budget_version_number: number;
}

export interface ProjectDashboard {
  finance: Record<string, any>;
  procurement: Record<string, any>;
  site_ops: Record<string, any>;
  quality: Record<string, any>;
  documents: Record<string, any>;
  boq: Record<string, any> | null;
  project: ProjectSnapshot;
  health_score: HealthScore;
  burn_rate: BurnRate | null;
  budget_vs_actual: BudgetVsActual | null;
}

// ── Shared ────────────────────────────────────────────────────────
export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── Subcontractors ────────────────────────────────────────────────
export type SubcontractorStatus = "active" | "inactive" | "blacklisted";
export type SubcontractorSpecialty =
  | "structural" | "electrical" | "plumbing" | "hvac"
  | "finishing" | "roofing" | "painting" | "landscaping"
  | "general" | "other";

export interface Subcontractor {
  id: string;
  name: string;
  code: string;
  specialty: SubcontractorSpecialty;
  status: SubcontractorStatus;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  gst_number: string | null;
  pan_number: string | null;
  license_number: string | null;
  insurance_provider: string | null;
  insurance_valid_until: string | null;
  rating: number;
  notes: string | null;
  is_approved: boolean;
  created_at: string;
}

export type ContractStatus = "draft" | "active" | "completed" | "terminated" | "cancelled";

export interface SubcontractorContract {
  id: string;
  project_id: string;
  subcontractor_id: string;
  contract_number: string;
  title: string;
  description: string | null;
  status: ContractStatus;
  scope_of_work: string | null;
  contract_value: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  retention_percentage: number;
  signed_date: string | null;
  created_at: string;
}

export type WorkOrderStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface WorkOrder {
  id: string;
  project_id: string;
  contract_id: string;
  work_order_number: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  amount: number;
  currency: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

// ── Comments ──────────────────────────────────────────────────────
// ── Subcontractor BOQ Assignments ─────────────────────────────────
export type BOQItemAssignmentStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface SubcontractorBOQItem {
  id: string;
  contract_id: string;
  boq_item_id: string;
  assigned_quantity: number;
  unit_rate: number;
  contract_amount: number;
  status: BOQItemAssignmentStatus;
  notes: string | null;
  created_at: string;
}

export interface SubcontractorBOQItemDetail {
  id: string;
  boq_item_id: string;
  item_number: string;
  description: string;
  unit: string;
  boq_quantity: number;
  boq_unit_rate: number;
  assigned_quantity: number;
  unit_rate: number;
  contract_amount: number;
  status: BOQItemAssignmentStatus;
}

export interface ProjectSubcontractorResponse {
  contract_id: string;
  contract_number: string;
  contract_title: string;
  contract_status: ContractStatus;
  contract_value: number;
  currency: string;
  scope_of_work: string | null;
  start_date: string | null;
  end_date: string | null;
  retention_percentage: number;
  subcontractor_id: string;
  subcontractor_name: string;
  subcontractor_specialty: string;
  boq_items_count: number;
  boq_items_total_amount: number;
}

export interface SubcontractorContractDetail {
  id: string;
  project_id: string;
  contract_number: string;
  title: string;
  status: ContractStatus;
  contract_value: number;
  currency: string;
  scope_of_work: string | null;
  start_date: string | null;
  end_date: string | null;
  retention_percentage: number;
  created_at: string;
}

export interface SubcontractorWorkload {
  subcontractor_id: string;
  subcontractor_name: string;
  total_contracts: number;
  total_contract_value: number;
  active_contracts: number;
  active_contract_value: number;
  total_boq_items_assigned: number;
  total_assigned_amount: number;
  contracts: SubcontractorContractDetail[];
}

// ── Comments ──────────────────────────────────────────────────────
export interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  target_type: string;
  target_id: string;
  parent_id: string | null;
  replies: Comment[];
  created_at: string;
  updated_at: string;
}

export interface CommentListResponse {
  total: number;
  data: Comment[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
