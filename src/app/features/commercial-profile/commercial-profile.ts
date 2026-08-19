import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  SpecialistCommercialProfile,
  SpecialistMobilityPolicy,
  SpecialistPaymentSetting,
  SpecialistServicePrice,
  UpdateSpecialistCommercialProfileRequest,
  UpdateSpecialistPaymentSettingRequest
} from '../../core/models/specialist-commercial-profile.model';
import { SpecialistCommercialProfileService } from '../../core/services/specialist-commercial-profile.service';

@Component({
  selector: 'app-commercial-profile',
  imports: [
    CommonModule,
    FormsModule
  ],
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

  services =
    signal<SpecialistServicePrice[]>([]);

  paymentMethods =
    signal<SpecialistPaymentSetting[]>([]);

  specialistProfileId: number | null = null;

  professionCode = '';
  professionName = '';

  mobilityPolicy: SpecialistMobilityPolicy =
    'INCLUDED';

  mobilityReferenceAmount: number | null =
    null;

  commercialNotes = '';

  active = true;

  constructor() {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    forkJoin({
      profile:
        this.commercialProfileService
          .getProfile(),

      paymentSettings:
        this.commercialProfileService
          .getPaymentSettings()
    }).subscribe({
      next: ({
        profile,
        paymentSettings
      }) => {
        this.applyProfile(profile);

        this.paymentMethods.set(
          paymentSettings.map(
            (method) => ({
              ...method
            })
          )
        );

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

    const validationMessage =
      this.validateForm();

    if (validationMessage) {
      this.errorMessage.set(
        validationMessage
      );

      return;
    }

    const selectedPaymentCodes =
      this.paymentMethods()
        .filter(
          (method) =>
            method.selected
        )
        .map(
          (method) =>
            method.code
        );

    const profileRequest:
      UpdateSpecialistCommercialProfileRequest = {
        mobilityPolicy:
          this.mobilityPolicy,

        mobilityReferenceAmount:
          this.mobilityPolicy === 'SEPARATE'
            ? Number(
                this.mobilityReferenceAmount
              )
            : null,

        commercialNotes:
          this.cleanNullable(
            this.commercialNotes
          ),

        active:
          this.active,

        services:
          this.services().map(
            (service) => ({
              offeredServiceId:
                service.offeredServiceId,

              basePrice:
                Number(
                  service.basePrice
                ),

              active:
                service.active
            })
          ),

        paymentMethodCodes:
          selectedPaymentCodes
      };

    const paymentRequest:
      UpdateSpecialistPaymentSettingRequest[] =
        this.paymentMethods().map(
          (method) => ({
            code:
              method.code,

            selected:
              method.selected,

            mobilePhone:
              this.cleanNullable(
                method.mobilePhone
              ),

            accountHolder:
              this.cleanNullable(
                method.accountHolder
              ),

            bankName:
              this.cleanNullable(
                method.bankName
              ),

            accountNumber:
              this.cleanNullable(
                method.accountNumber
              ),

            cci:
              this.cleanNullable(
                method.cci
              )
          })
        );

    this.saving.set(true);

    this.commercialProfileService
      .updateProfile(
        profileRequest
      )
      .subscribe({
        next: (profile) => {
          this.applyProfile(profile);

          this.commercialProfileService
            .updatePaymentSettings(
              paymentRequest
            )
            .subscribe({
              next: (paymentSettings) => {
                this.paymentMethods.set(
                  paymentSettings.map(
                    (method) => ({
                      ...method
                    })
                  )
                );

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
                    'El perfil se actualizo, pero no se pudo guardar la configuracion detallada de cobranza.'
                  )
                );
              }
            });
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

  activeServiceCount(): number {
    return this.services().filter(
      (service) =>
        service.active
    ).length;
  }

  selectedPaymentMethodCount(): number {
    return this.paymentMethods().filter(
      (method) =>
        method.selected
    ).length;
  }

  isWallet(
    method: SpecialistPaymentSetting
  ): boolean {
    return (
      method.code === 'YAPE'
      ||
      method.code === 'PLIN'
    );
  }

  isBankTransfer(
    method: SpecialistPaymentSetting
  ): boolean {
    return method.code === 'TRANSFER';
  }

  isCash(
    method: SpecialistPaymentSetting
  ): boolean {
    return method.code === 'CASH';
  }

  mobilityLabel(): string {
    const labels:
      Record<
        SpecialistMobilityPolicy,
        string
      > = {
        INCLUDED:
          'Movilidad incluida',

        SEPARATE:
          'Movilidad separada',

        NOT_AVAILABLE:
          'No disponible'
      };

    return labels[
      this.mobilityPolicy
    ];
  }

  private applyProfile(
    profile: SpecialistCommercialProfile
  ): void {
    this.specialistProfileId =
      profile.specialistProfileId;

    this.professionCode =
      profile.professionCode;

    this.professionName =
      profile.professionName;

    this.mobilityPolicy =
      profile.mobilityPolicy;

    this.mobilityReferenceAmount =
      profile.mobilityReferenceAmount === null
        ? null
        : Number(
            profile.mobilityReferenceAmount
          );

    this.commercialNotes =
      profile.commercialNotes ?? '';

    this.active =
      profile.active;

    this.services.set(
      profile.services.map(
        (service) => ({
          ...service,
          basePrice:
            Number(
              service.basePrice
            )
        })
      )
    );
  }

  private validateForm(): string | null {
    if (
      this.services().length === 0
    ) {
      return (
        'No existen servicios configurados para su profesion.'
      );
    }

    if (
      this.activeServiceCount() === 0
    ) {
      return (
        'Debe mantener al menos un servicio habilitado.'
      );
    }

    for (
      const service of this.services()
    ) {
      const price =
        Number(
          service.basePrice
        );

      if (
        !Number.isFinite(price)
        ||
        price <= 0
      ) {
        return (
          'Todos los servicios deben conservar un precio base mayor que cero.'
        );
      }
    }

    if (
      this.mobilityPolicy ===
        'SEPARATE'
    ) {
      const amount =
        Number(
          this.mobilityReferenceAmount
        );

      if (
        this.mobilityReferenceAmount === null
        ||
        !Number.isFinite(amount)
        ||
        amount <= 0
      ) {
        return (
          'Ingrese un monto referencial de movilidad mayor que cero.'
        );
      }
    }

    if (
      this.selectedPaymentMethodCount()
        === 0
    ) {
      return (
        'Seleccione al menos un metodo de pago.'
      );
    }

    for (
      const method of
      this.paymentMethods()
    ) {
      if (!method.selected) {
        continue;
      }

      if (
        this.isWallet(method)
      ) {
        if (
          !this.cleanNullable(
            method.mobilePhone
          )
        ) {
          return (
            'Ingrese el numero de celular de '
            + method.name
            + '.'
          );
        }

        if (
          !this.cleanNullable(
            method.accountHolder
          )
        ) {
          return (
            'Ingrese el titular de '
            + method.name
            + '.'
          );
        }
      }

      if (
        this.isBankTransfer(method)
      ) {
        if (
          !this.cleanNullable(
            method.bankName
          )
        ) {
          return (
            'Ingrese el banco para transferencia.'
          );
        }

        if (
          !this.cleanNullable(
            method.accountHolder
          )
        ) {
          return (
            'Ingrese el titular de la cuenta bancaria.'
          );
        }

        if (
          !this.cleanNullable(
            method.accountNumber
          )
        ) {
          return (
            'Ingrese el numero de cuenta bancaria.'
          );
        }

        const cci =
          this.cleanNullable(
            method.cci
          );

        if (
          !cci
          ||
          !/^\d{20}$/.test(
            cci
          )
        ) {
          return (
            'El CCI debe contener exactamente 20 digitos.'
          );
        }
      }
    }

    if (
      this.commercialNotes.length
        > 500
    ) {
      return (
        'Las notas comerciales no pueden superar 500 caracteres.'
      );
    }

    return null;
  }

  private cleanNullable(
    value: string | null | undefined
  ): string | null {
    if (
      value === null
      ||
      value === undefined
    ) {
      return null;
    }

    const cleaned =
      value.trim();

    return cleaned
      ? cleaned
      : null;
  }

  private extractErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    if (
      typeof error !== 'object'
      ||
      error === null
    ) {
      return fallback;
    }

    const candidate =
      error as {
        error?: unknown;
        message?: unknown;
      };

    if (
      typeof candidate.error
        === 'string'
      &&
      candidate.error.trim()
    ) {
      return candidate.error.trim();
    }

    if (
      typeof candidate.error
        === 'object'
      &&
      candidate.error !== null
    ) {
      const body =
        candidate.error as {
          message?: unknown;
          reason?: unknown;
          error?: unknown;
        };

      if (
        typeof body.message
          === 'string'
        &&
        body.message.trim()
      ) {
        return body.message.trim();
      }

      if (
        typeof body.reason
          === 'string'
        &&
        body.reason.trim()
      ) {
        return body.reason.trim();
      }

      if (
        typeof body.error
          === 'string'
        &&
        body.error.trim()
      ) {
        return body.error.trim();
      }
    }

    if (
      typeof candidate.message
        === 'string'
      &&
      candidate.message.trim()
    ) {
      return candidate.message.trim();
    }

    return fallback;
  }
}
