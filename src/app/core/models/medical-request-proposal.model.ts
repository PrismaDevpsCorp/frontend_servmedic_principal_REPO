export type MedicalRequestProposalStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | string;

export type MedicalRequestProposalMobilityPolicy =
  | 'INCLUDED'
  | 'SEPARATE'
  | 'NOT_AVAILABLE'
  | string;

export interface CreateMedicalRequestProposalPayload {
  estimatedArrivalMinutes: number;
  validityMinutes: number;
  message: string | null;
}

export interface MedicalRequestProposal {
  proposalId: number;

  medicalRequestId: number;
  requestCode: string;
  requestStatus: string;

  specialistProfileId: number;
  specialistFullName: string;

  professionCode: string;
  professionName: string;

  serviceCode: string;
  serviceName: string;

  serviceAmount: number;
  mobilityPolicy: MedicalRequestProposalMobilityPolicy;
  mobilityAmount: number;
  totalAmount: number;
  currency: string;

  message: string | null;
  estimatedArrivalMinutes: number;

  status: MedicalRequestProposalStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
  withdrawnAt: string | null;
}