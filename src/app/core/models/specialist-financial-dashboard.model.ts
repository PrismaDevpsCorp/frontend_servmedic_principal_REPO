export interface SpecialistFinancialSummary {
  totalOperations: number;
  paidOperations: number;
  pendingOperations: number;
  rejectedOperations: number;

  paidServiceAmount: number;
  paidMobilityAmount: number;
  paidAdditionalAmount: number;
  paidTotalAmount: number;

  platformCommissionPercent: number;
  platformCommissionAmount: number;
  specialistNetAmount: number;

  currency: string;
}

export interface SpecialistFinancialOperation {
  paymentId: number;
  medicalRequestId: number;
  requestCode: string;
  serviceName: string;
  patientFullName: string;

  paymentStatus: string;
  paymentMethod: string;

  serviceAmount: number;
  mobilityAmount: number;
  additionalAmount: number;
  totalAmount: number;

  platformCommissionPercent: number;
  platformCommissionAmount: number;
  specialistNetAmount: number;

  currency: string;
  externalTransactionId?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface SpecialistFinancialDashboardResponse {
  summary: SpecialistFinancialSummary;
  operations: SpecialistFinancialOperation[];

  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
