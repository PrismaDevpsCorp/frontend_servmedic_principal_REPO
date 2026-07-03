export type MedicalRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'EN_CAMINO'
  | 'EN_ATENCION'
  | 'FINALIZADO'
  | string;

export interface MedicalRequest {
  id: number;
  requestCode: string;
  patientProfileId: number;
  patientFullName: string;
  patientDni?: string | null;
  serviceCode: string;
  serviceName: string;
  professionCode: string;
  professionName: string;
  requiresPrescription: boolean;
  status: MedicalRequestStatus;
  acceptedSpecialistProfileId?: number | null;
  acceptedSpecialistFullName?: string | null;
  addressText: string;
  addressReference?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  prescriptionImageUrl?: string | null;
  patientNotes?: string | null;
  estimatedAmount?: number | null;
  distanceKm?: number | null;
  createdAt?: string | null;
  acceptedAt?: string | null;
  startedRouteAt?: string | null;
  startedAttentionAt?: string | null;
  finishedAt?: string | null;
}