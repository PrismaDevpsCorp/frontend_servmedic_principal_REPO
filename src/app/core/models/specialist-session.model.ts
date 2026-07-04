export type MedicDriveRole = 'PACIENTE' | 'ESPECIALISTA' | 'ADMIN' | string;

export interface MedicDriveSession {
  sessionToken: string;
  tokenType?: string;
  userId: number;
  username?: string;
  email: string;
  fullName: string;
  role?: MedicDriveRole;
  roleCode?: MedicDriveRole;
  patientProfileId?: number | null;
  specialistProfileId?: number | null;
  specialistStatus?: string | null;
  startedAt?: string;
}

export type SpecialistSession = MedicDriveSession;