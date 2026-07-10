export interface MedicalServiceOption {
  code: string;
  name: string;
  description?: string | null;
  professionCode?: string | null;
  professionName?: string | null;
  basePrice?: number | null;
  estimatedAmount?: number | null;
  requiresPrescription?: boolean;
  active?: boolean;
}