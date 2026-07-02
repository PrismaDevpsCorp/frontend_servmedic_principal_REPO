export interface AttentionReport {
  id: number;
  medicalRequestId: number;
  requestCode: string;
  requestStatus: string;
  patientProfileId: number;
  patientFullName: string;
  specialistProfileId: number;
  specialistFullName: string;
  serviceCode: string;
  serviceName: string;
  clinicalObservations: string;
  diagnosticImpression?: string | null;
  recommendations: string;
  indications?: string | null;
  vitalSigns?: string | null;
  attachmentUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SaveAttentionReportRequest {
  clinicalObservations: string;
  diagnosticImpression?: string | null;
  recommendations: string;
  indications?: string | null;
  vitalSigns?: string | null;
  attachmentUrl?: string | null;
}