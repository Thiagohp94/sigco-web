export type UserRole = "admin" | "dentist" | "secretary" | "assistant" | "financial" | "patient";

export interface User {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  cpf: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Clinic {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export type Gender = "male" | "female" | "other";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "other";

export interface PatientContact {
  id: string;
  patient_id: string;
  name: string;
  contact_relationship: string | null;
  phone: string | null;
  whatsapp: string | null;
}

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: Gender | null;
  marital_status: MaritalStatus | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  whatsapp: string | null;
  email: string | null;
  allergies: string | null;
  medications: string | null;
  chronic_diseases: string | null;
  medical_history: string | null;
  observations: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contacts: PatientContact[];
}

export interface PatientListItem {
  id: string;
  name: string;
  cpf: string | null;
  phone_primary: string | null;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  is_active: boolean;
}

export interface PaginatedPatients {
  total: number;
  page: number;
  page_size: number;
  items: PatientListItem[];
}

export type AppointmentStatus =
  | "scheduled" | "confirmed" | "in_progress"
  | "completed" | "cancelled" | "rescheduled" | "no_show";

export interface Procedure {
  id: string;
  clinic_id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  color: string;
  is_active: boolean;
}

export interface Room {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  dentist_id: string;
  room_id: string | null;
  procedure_id: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  patient_name: string | null;
  dentist_name: string | null;
  procedure_name: string | null;
  procedure_duration_minutes: number | null;
  room_name: string | null;
}

// ── Materials ───────────────────────────────────────────────
export interface Material {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  unit: string;
  min_stock: number;
  is_active: boolean;
  current_stock: number;
  created_at: string;
}

export interface ProcedureMaterial {
  id: string;
  material_id: string;
  material_name: string;
  unit: string;
  quantity_required: number;
}

// ── Logs ────────────────────────────────────────────────────
export type AppointmentLogAction =
  | "scheduled" | "confirmed" | "cancelled" | "rescheduled"
  | "attended" | "no_show" | "started" | "finished";

export type ContactType =
  | "charge" | "schedule" | "confirm" | "reminder" | "follow_up" | "other";

export type LogBookActionType =
  | "sterilization" | "stock_in" | "stock_out" | "cleaning" | "maintenance" | "other";

export interface AppointmentLog {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  patient_name: string | null;
  performed_by: string;
  performed_by_name: string | null;
  action: AppointmentLogAction;
  procedure_id: string | null;
  procedure_name: string | null;
  cancellation_reason: string | null;
  rescheduled_to: string | null;
  notes: string | null;
  created_at: string;
}

export interface DelayLog {
  id: string;
  appointment_id: string;
  patient_arrived_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  was_patient_late: boolean | null;
  was_dentist_late: boolean | null;
  marked_by: string;
  notes: string | null;
  created_at: string;
}

export interface ContactLog {
  id: string;
  patient_id: string;
  patient_name: string | null;
  contacted_by: string;
  contacted_by_name: string | null;
  contact_type: ContactType;
  was_successful: boolean;
  channel: string | null;
  notes: string | null;
  contacted_at: string;
}

export interface LogBookEntry {
  id: string;
  user_id: string;
  user_name: string | null;
  action_type: LogBookActionType;
  description: string;
  material_id: string | null;
  material_name: string | null;
  quantity: number | null;
  created_at: string;
}

export type ToothCondition =
  | "healthy" | "extraction" | "implant" | "root_canal"
  | "restoration" | "crown" | "missing" | "caries" | "fracture";

export interface MedicalRecord {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  dentist_id: string;
  dentist_name: string | null;
  record_date: string;
  procedure_description: string | null;
  evolution: string | null;
  observations: string | null;
  created_at: string;
}

export interface OdontogramEntry {
  id: string;
  patient_id: string;
  tooth_number: number;
  condition: ToothCondition;
  surface: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
