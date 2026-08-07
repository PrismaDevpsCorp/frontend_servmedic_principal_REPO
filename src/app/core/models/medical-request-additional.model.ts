export type MedicalRequestAdditionalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | string;

export interface CreateMedicalRequestAdditionalPayload {
  concept: string;
  justification: string;
  amount: number;
}

export interface MedicalRequestAdditional {
  additionalId: number;

  medicalRequestId: number;
  requestCode: string;
  requestStatus: string;

  specialistProfileId: number;
  specialistFullName: string;

  concept: string;
  justification: string;

  amount: number;
  currency: string;
  status: MedicalRequestAdditionalStatus;

  originalTotalAmount: number;
  approvedAdditionalsAmount: number;
  currentTotalAmount: number;

  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  withdrawnAt: string | null;
}