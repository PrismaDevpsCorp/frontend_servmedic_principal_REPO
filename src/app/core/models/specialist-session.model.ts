export interface SpecialistSession {
  sessionToken: string;
  tokenType?: string;
  userId: number;
  username?: string;
  email: string;
  fullName: string;
  role?: string;
  roleCode?: string;
  patientProfileId?: number | null;
  specialistProfileId?: number | null;
  specialistStatus?: string | null;
  startedAt?: string;
}