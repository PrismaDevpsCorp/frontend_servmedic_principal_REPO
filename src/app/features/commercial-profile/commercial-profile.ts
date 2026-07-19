import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SpecialistCommercialProfile,
  SpecialistMobilityPolicy,
  SpecialistPaymentMethod,
  SpecialistServicePrice,
  UpdateSpecialistCommercialProfileRequest
} from '../../core/models/specialist-commercial-profile.model';
import { SpecialistCommercialProfileService } from '../../core/services/specialist-commercial-profile.service';

@Component({
  selector: 'app-commercial-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './commercial-profile.html',
  styleUrl: './commercial-profile.scss'
})
export class CommercialProfile {
  private readonly commercialProfileService =
    inject(SpecialistCommercialProfileService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  services = signal<SpecialistServicePrice[]>([]);
  paymentMethods = signal<SpecialistPaymentMethod[]>([]);

  specialistProfileId: number | null = null;
  professionCode = '';
  professionName = '';
  mobilityPolicy: SpecialistMobilityPolicy = 'INCLUDED';
  mobilityReferenceAmount: number | null = null;
  commercialNotes = '';
  active = true;

  constructor() {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.commercialProfileService.getProfile().subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(
            error,
            'No se pudo cargar el perfil comercial del especialista.'
          )
        );
      }
    });
  }

  saveProfile(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const validationMessage = this.validateForm();

    if (validationMessage) {
      this.errorMessage.set(validationMessage);
      return;
    }

    const request: UpdateSpecialistCommercialProfileRequest = {
      mobilityPolicy: this.mobilityPolicy,
      mobilityReferenceAmount:
        this.mobilityPolicy === 'SEPARATE'
          ? Number(this.mobilityReferenceAmount)
          : null,
      commercialNotes: this.cleanNullable(this.commercialNotes),
      active: this.active,
      services: this.services().map((service) => ({
        offeredServiceId: service.offeredServiceId,
        basePrice: Number(service.basePrice),
        active: service.active
      })),
      paymentMethodCodes: this.paymentMethods()
        .filter((method) => method.selected)
        .map((method) => method.code)
    };

    this.saving.set(true);

    this.commercialProfileService.updateProfile(request).subscribe({
      next: (updatedProfile) => {
        this.applyProfile(updatedProfile);
        this.saving.set(false);
        this.successMessage.set(
          'Perfil comercial actualizado correctamente.'
        );
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(
            error,
            'No se pudo actualizar el perfil comercial.'
          )
        );
      }
    });
  }

  onMobilityPolicyChange(
    policy: SpecialistMobilityPolicy
  ): void {
    this.mobilityPolicy = policy;

    if (policy !== 'SEPARATE') {
      this.mobilityReferenceAmount = null;
    }
  }

  mobilityPolicyDescription(): string {
    const descriptions: Record<
      SpecialistMobilityPolicy,
      string
    > = {
      INCLUDED:
        'La movilidad está incluida dentro del precio base del servicio.',
      SEPARATE:
        'La movilidad se cobrará como un concepto separado del servicio.',
      NOT_AVAILABLE:
        'Actualmente no se ofrece movilidad para la atención.'
    };

    return descriptions[this.mobilityPolicy];
  }

  selectedPaymentMethodCount(): number {
    return this.paymentMethods().filter(
      (method) => method.selected
    ).length;
  }

  activeServiceCount(): number {
    return this.services().filter(
      (service) => service.active
    ).length;
  }

  private applyProfile(
    profile: SpecialistCommercialProfile
  ): void {
    this.specialistProfileId = profile.specialistProfileId;
    this.professionCode = profile.professionCode;
    this.professionName = profile.professionName;
    this.mobilityPolicy = profile.mobilityPolicy;
    this.mobilityReferenceAmount =
      profile.mobilityReferenceAmount === null
        ? null
        : Number(profile.mobilityReferenceAmount);
    this.commercialNotes = profile.commercialNotes ?? '';
    this.active = profile.active;

    this.services.set(
      profile.services.map((service) => ({
        ...service,
        basePrice: Number(service.basePrice)
      }))
    );

    this.paymentMethods.set(
      profile.paymentMethods.map((method) => ({
        ...method
      }))
    );
  }

  private validateForm(): string | null {
    if (this.services().length === 0) {
      return 'El especialista no tiene servicios configurados.';
    }

    const invalidService = this.services().find(
      (service) =>
        !Number.isFinite(Number(service.basePrice)) ||
        Number(service.basePrice) <= 0
    );

    if (invalidService) {
      return (
        'Ingrese un precio base mayor que cero para el servicio ' +
        invalidService.serviceName +
        '.'
      );
    }

    if (this.activeServiceCount() === 0) {
      return 'Debe mantener al menos un servicio comercial activo.';
    }

    if (this.selectedPaymentMethodCount() === 0) {
      return 'Seleccione al menos un método de pago.';
    }

    if (this.mobilityPolicy === 'SEPARATE') {
      const amount = Number(this.mobilityReferenceAmount);

      if (
        this.mobilityReferenceAmount === null ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return (
          'Ingrese un monto de movilidad mayor que cero ' +
          'cuando el cobro sea separado.'
        );
      }
    }

    if (this.commercialNotes.trim().length > 1000) {
      return 'Las notas comerciales no pueden superar 1000 caracteres.';
    }

    return null;
  }

  private cleanNullable(value: string): string | null {
    const cleanValue = value.trim();
    return cleanValue ? cleanValue : null;
  }

  private extractErrorMessage(
    error: unknown,
    fallbackMessage: string
  ): string {
    const response = error as {
      error?: {
        message?: string;
      };
    };

    return response.error?.message ?? fallbackMessage;
  }
}