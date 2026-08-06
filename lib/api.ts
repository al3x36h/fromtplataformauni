export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
export const MOODLE_BASE_URL = (process.env.NEXT_PUBLIC_MOODLE_BASE_URL ?? "").replace(/\/$/, "");

export function moodleCourseUrl(moodleId?: number | null) {
  return moodleId && MOODLE_BASE_URL ? `${MOODLE_BASE_URL}/course/view.php?id=${moodleId}` : null;
}

export type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  roles: string[];
  permissions: string[];
};

export type MoodleConnectionResult = {
  status: string;
  site_name?: string | null;
  release?: string | null;
  username?: string | null;
  latency_ms?: number | null;
  message?: string | null;
};

export type MoodleFunctionsResult = {
  available: string[];
  missing_required: string[];
  missing_optional: string[];
};

export type DataQuality = "complete" | "partial" | "estimated" | "stale" | "not_available";
export type DataSource = "moodle_rest" | "local_snapshot" | "not_available";

export type AnalyticsIndicator = {
  code: string;
  label: string;
  value?: number | null;
  unit: string;
  period: string;
  updated_at: string;
  source: DataSource;
  quality: DataQuality;
  status: "exact" | "derived" | "estimated" | "not_available";
  numerator?: number | null;
  denominator?: number | null;
  coverage?: number | null;
  cutoff_at?: string | null;
  formula?: string | null;
  unavailable_reason?: string | null;
  comparison?: number | null;
  previous_value?: number | null;
  detail_href?: string | null;
  explanation: string;
};

export type AttentionItem = {
  code: string;
  label: string;
  severity: "info" | "warning" | "critical";
  metric_code: string;
  reason: string;
};

export type CategoryAnalytics = {
  id: string;
  name: string;
  path: string[];
  depth: number;
  parent_id?: string | null;
  course_count: number;
  active_course_count: number;
  hidden_course_count: number;
  enrolled_user_count: number;
  teacher_count: number;
  student_count: number;
  users_without_access_count: number;
  last_activity_at?: string | null;
  source: DataSource;
  quality: DataQuality;
};

export type CourseFilterOption = {
  id: string;
  fullname: string;
  shortname: string;
  category_id?: string | null;
  category_path: string[];
  visible: boolean;
  moodle_url?: string | null;
};

export type CategoryNode = {
  id: string;
  moodle_id?: number | null;
  parent_moodle_id?: number | null;
  name: string;
  idnumber?: string | null;
  description?: string | null;
  visible: boolean;
  course_count: number;
  cumulative_course_count: number;
  path: string[];
  depth: number;
  has_children: boolean;
  source: string;
};

export type CategoryCreateRequest = {
  name: string;
  idnumber?: string | null;
  parent_moodle_id?: number | null;
  description?: string | null;
  visible: boolean;
};

export type CategoryValidationResult = {
  can_create: boolean;
  path: string[];
  duplicates: Array<{
    moodle_id?: number | null;
    name: string;
    idnumber?: string | null;
    path: string[];
    reason: string;
  }>;
  warnings: string[];
};

export type CategoryCreateResult = {
  status: string;
  category: CategoryNode;
  warnings: string[];
};

export type CourseCreateRequest = {
  fullname: string;
  shortname: string;
  idnumber?: string | null;
  category_moodle_id: number;
  summary?: string | null;
  format: string;
  startdate?: string | null;
  enddate?: string | null;
  visible: boolean;
  numsections: number;
  template_shortname?: string | null;
  modality?: string | null;
  activity_type?: string | null;
  academic_period?: string | null;
  cohort?: string | null;
  academic_load_code?: string | null;
  observations?: string | null;
};

export type CourseValidationResult = {
  can_create: boolean;
  duplicates: Array<{
    moodle_id?: number | null;
    fullname: string;
    shortname?: string | null;
    idnumber?: string | null;
    reason: string;
  }>;
  warnings: string[];
};

export type CourseCreateResult = {
  status: string;
  course: {
    id: string;
    moodle_id?: number | null;
    fullname: string;
    shortname: string;
    idnumber?: string | null;
    category_moodle_id: number;
    status: string;
  };
  warnings: string[];
};

export type CourseListItem = {
  moodle_id: number;
  fullname: string;
  shortname: string;
  idnumber?: string | null;
  category_moodle_id?: number | null;
  category_path: string[];
  visible: boolean;
  active: boolean;
  modality?: string | null;
  teacher_count: number;
  student_count: number;
  teacher_names: string[];
  teacher_emails: string[];
  last_activity_at?: string | null;
  captured_at: string;
  source: string;
  data_quality: string;
};

export type CourseParticipant = {
  moodle_id: number;
  fullname: string;
  email?: string | null;
  username?: string | null;
  auth_method?: string | null;
  roles: string[];
  last_site_access_at?: string | null;
  last_course_access_at?: string | null;
  has_access: boolean;
};

export type CourseDetail = CourseListItem & {
  participants: CourseParticipant[];
  access_message?: string | null;
};

export type CoursePasswordResetResult = {
  user_id: number;
  fullname: string;
  username?: string | null;
  temporary_password: string;
  email_sent: boolean;
  email_message?: string | null;
};

export type CourseEnrolmentPerson = {
  fullname: string;
  email: string;
};

export type CourseEnrolmentPreviewResult = {
  course_id: number;
  total: number;
  ready: number;
  existing: number;
  openid: number;
  will_create: number;
  already_enrolled: number;
  pending_identity: number;
  invalid: number;
  can_execute: boolean;
  items: Array<{
    fullname: string;
    email: string;
    action: string;
    can_process: boolean;
    moodle_user_id?: number | null;
    auth_method?: string | null;
    already_enrolled: boolean;
    message: string;
  }>;
};

export type CourseEnrolmentResult = {
  course_id: number;
  total: number;
  created: number;
  enrolled: number;
  already_enrolled: number;
  skipped: number;
  failed: number;
  items: Array<{
    fullname: string;
    email: string;
    status: string;
    moodle_user_id?: number | null;
    auth_method?: string | null;
    password_sent: boolean;
    message: string;
  }>;
};

export type EmailTestResult = {
  status: string;
  message: string;
};

export type AcademicPlanningRow = {
  period: string;
  area?: string | null;
  career: string;
  semester?: string | null;
  anio?: string | null;
  subject: string;
  group: string;
  teacher_name?: string | null;
  teacher_firstname?: string | null;
  teacher_lastname?: string | null;
  teacher_email?: string | null;
  teacher_enrolment_key?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  student_username?: string | null;
  student_idnumber?: string | null;
  student_enrolment_key?: string | null;
  template_shortname?: string | null;
};

export type AutomationPreviewResult = {
  total_rows: number;
  categories: Array<{
    path: string[];
    moodle_id?: number | null;
    existing_path: string[];
    existing_moodle_id?: number | null;
    pending_path: string[];
    visible?: boolean | null;
    status: string;
  }>;
  proposed_categories: Array<{
    name: string;
    path: string[];
    parent_path: string[];
    parent_moodle_id?: number | null;
    can_create: boolean;
    reason?: string | null;
    status: string;
  }>;
  courses: Array<{
    key: string;
    fullname: string;
    shortname: string;
    idnumber: string;
    category_path: string[];
    category_moodle_id?: number | null;
    template_shortname: string;
    status: string;
    existing_reason?: string | null;
    warnings: string[];
  }>;
  teachers: Array<{ key: string; name?: string | null; email?: string | null; person_type: string; status: string }>;
  students: Array<{
    key: string;
    name?: string | null;
    email?: string | null;
    username?: string | null;
    idnumber?: string | null;
    person_type: string;
    status: string;
  }>;
  teacher_assignments: Array<{ course_key: string; person_key: string; role: string; enrolment_key?: string | null; status: string }>;
  student_enrolments: Array<{ course_key: string; person_key: string; role: string; enrolment_key?: string | null; status: string }>;
  warnings: string[];
};

export type AutomationCategoryExecutionResult = {
  status: string;
  created: AutomationPreviewResult["proposed_categories"];
  skipped: AutomationPreviewResult["proposed_categories"];
  preview: AutomationPreviewResult;
};

export type AutomationCourseExecutionResult = {
  status: string;
  created: Array<{ key: string; fullname: string; shortname: string; status: string; message?: string | null }>;
  skipped: Array<{ key: string; fullname: string; shortname: string; status: string; message?: string | null }>;
  preview: AutomationPreviewResult;
};

export type AutomationCourseJobStatus = {
  id: string;
  status: string;
  total: number;
  processed: number;
  created: number;
  skipped: number;
  failed: number;
  percent: number;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
  retry_of_job_id?: string | null;
  items: Array<{
    key: string;
    fullname: string;
    shortname: string;
    idnumber?: string | null;
    category_path: string[];
    category_moodle_id?: number | null;
    moodle_id?: number | null;
    status: string;
    message?: string | null;
    teacher_total: number;
    teacher_enrolled: number;
    teacher_skipped: number;
    teacher_failed: number;
  }>;
};

export type DuplicateCourseOption = {
  id: number;
  fullname: string;
  shortname: string;
  idnumber?: string | null;
  visible: boolean;
  teacher_names: string[];
};

export type BulkDuplicatePreviewRequest = {
  source_category_id: number;
  target_category_id: number;
  course_ids: number[];
  shortname_prefix: string;
  shortname_suffix: string;
  new_subcategory_name?: string | null;
  copy_fullnames: Record<number, string>;
};

export type BulkDuplicatePreviewItem = {
  course_id: number;
  moodle_id?: number | null;
  original_fullname: string;
  original_shortname: string;
  teacher_names: string[];
  copy_fullname: string;
  copy_shortname: string;
  destination_path: string[];
  status: string;
  message?: string | null;
};

export type BulkDuplicatePreviewResult = {
  can_execute: boolean;
  source_category_id: number;
  target_category_id: number;
  destination_path: string[];
  items: BulkDuplicatePreviewItem[];
  warnings: string[];
};

export type BulkDuplicateJobStatus = {
  id: string;
  status: string;
  total: number;
  processed: number;
  completed: number;
  failed: number;
  percent: number;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
  items: BulkDuplicatePreviewItem[];
};

export type TimelinePoint = {
  date: string;
  events: number;
  active_users: number;
  source: DataSource;
  quality: DataQuality;
};

export type SyncStatus = {
  id: string;
  sync_type: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  total_processed: number;
  total_failed: number;
  source: DataSource;
};

export type ExecutiveDashboard = {
  period: string;
  timezone: string;
  generated_at: string;
  indicators: AnalyticsIndicator[];
  courses_by_category: CategoryAnalytics[];
  activity_timeline: TimelinePoint[];
  last_sync?: SyncStatus | null;
};

export type AcademicAnalyticsDashboard = {
  title: string;
  description: string;
  period: string;
  timezone: string;
  generated_at: string;
  last_sync?: SyncStatus | null;
  coverage?: number | null;
  indicators: AnalyticsIndicator[];
  attention_items: AttentionItem[];
};

export type AnalyticsDetail = {
  metric: AnalyticsIndicator;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  empty_message: string;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}
