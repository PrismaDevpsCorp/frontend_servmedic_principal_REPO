export type SpecialistMobilityPolicy =
  | 'INCLUDED'
  | 'SEPARATE'
  | 'NOT_AVAILABLE';

export interface SpecialistServicePrice {
  offeredServiceId: number;
  medicalServiceId: number;
  serviceCode: string;
  serviceName: string;
  requiresPrescription: boolean;
  basePrice: number;
  active: boolean;
}

export interface SpecialistPaymentMethod {
  paymentMethodId: number;
  code: string;
  name: string;
  requiresVoucher: boolean;
  selected: boolean;
}

export interface SpecialistCommercialProfile {
  specialistProfileId: number;
  professionCode: string;
  professionName: string;
  mobilityPolicy: SpecialistMobilityPolicy;
  mobilityReferenceAmount: number | null;
  commercialNotes: string | null;
  active: boolean;
  services: SpecialistServicePrice[];
  paymentMethods: SpecialistPaymentMethod[];
}

export interface UpdateSpecialistServicePriceRequest {
  offeredServiceId: number;
  basePrice: number;
  active: boolean;
}

export interface UpdateSpecialistCommercialProfileRequest {
  mobilityPolicy: SpecialistMobilityPolicy;
  mobilityReferenceAmount: number | null;
  commercialNotes: string | null;
  active: boolean;
  services: UpdateSpecialistServicePriceRequest[];
  paymentMethodCodes: string[];
}