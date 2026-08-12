export interface ManualPayment {
  paymentId: number;
  medicalRequestId: number;
  requestCode: string;
  paymentFlow: string;
  paymentStatus: string;
  paymentMethod: string;

  serviceAmount: number;
  mobilityAmount: number;
  additionalAmount: number;
  totalAmount: number;

  commissionableAmount: number;
  platformCommissionPercent: number;
  platformCommissionAmount: number;
  specialistNetAmount: number;

  currency: string;

  patientProfileId: number;
  patientFullName: string;

  specialistProfileId: number;
  specialistFullName: string;

  externalTransactionId?: string | null;

  evidenceAvailable: boolean;
  evidenceFileName?: string | null;
  evidenceContentType?: string | null;
  evidenceSize?: number | null;
  evidenceUploadedAt?: string | null;

  paidAt?: string | null;
  verifiedAt?: string | null;

  verificationWarningAcknowledged: boolean;

  message?: string | null;
}
