import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  ManualPayment
} from '../../../core/models/manual-payment.model';

import {
  PatientManualPaymentService
} from '../../../core/services/patient-manual-payment.service';

import {
  PatientManualPaymentComponent
} from './patient-manual-payment';

describe(
  'PatientManualPaymentComponent - H3 DOM',
  () => {

    const paidPayment: ManualPayment = {
      paymentId: 501,
      medicalRequestId: 16,
      requestCode: 'SM-H3-001',

      paymentFlow: 'DIRECT_TO_SPECIALIST',
      paymentStatus: 'PAID',
      paymentMethod: 'YAPE',

      serviceAmount: 80,
      mobilityAmount: 10,
      additionalAmount: 0,
      totalAmount: 90,

      commissionableAmount: 80,
      platformCommissionPercent: 5,
      platformCommissionAmount: 4,
      specialistNetAmount: 86,

      currency: 'PEN',

      patientProfileId: 1,
      patientFullName: 'Paciente H3',

      specialistProfileId: 2,
      specialistFullName: 'Especialista H3',

      externalTransactionId: 'OP-H3-001',

      evidenceAvailable: true,
      evidenceFileName: 'pago-h3.jpg',
      evidenceContentType: 'image/jpeg',
      evidenceSize: 1024,
      evidenceUploadedAt:
        '2026-08-13T23:00:00Z',

      paidAt:
        '2026-08-13T23:01:00Z',

      verifiedAt:
        '2026-08-13T23:02:00Z',

      verificationWarningAcknowledged: true,

      message: 'Pago confirmado'
    };

    const pendingPayment: ManualPayment = {
      ...paidPayment,

      paymentId: 502,
      medicalRequestId: 17,
      requestCode: 'SM-H3-002',

      paymentStatus: 'PENDING',
      verifiedAt: null,

      verificationWarningAcknowledged: false
    };

    const paymentService = {
      find: vi.fn(),
      register: vi.fn()
    };

    beforeEach(
      async () => {

        paymentService.find.mockReset();
        paymentService.register.mockReset();

        await TestBed.configureTestingModule({
          imports: [
            PatientManualPaymentComponent
          ],

          providers: [
            {
              provide:
                PatientManualPaymentService,

              useValue:
                paymentService
            }
          ]
        })
        .compileComponents();
      }
    );

    afterEach(
      () => {

        vi.restoreAllMocks();
      }
    );

    it(
      'PAID inicia colapsado y VER PAGO / OCULTAR PAGO funcionan con click DOM',
      () => {

        paymentService.find.mockReturnValue(
          of(paidPayment)
        );

        const fixture =
          TestBed.createComponent(
            PatientManualPaymentComponent
          );

        fixture.componentRef.setInput(
          'requestId',
          16
        );

        fixture.componentRef.setInput(
          'expectedTotal',
          90
        );

        fixture.componentRef.setInput(
          'specialistName',
          'Especialista H3'
        );

        fixture.detectChanges();

        const card =
          fixture.nativeElement.querySelector(
            '.payment-card'
          ) as HTMLElement | null;

        expect(card).not.toBeNull();

        expect(
          card?.classList.contains(
            'payment-collapsed'
          )
        ).toBe(true);

        const summary =
          fixture.nativeElement.querySelector(
            '.patient-payment-collapsed-summary'
          ) as HTMLElement | null;

        expect(summary).not.toBeNull();

        const summaryText =
          (
            summary?.textContent
            ?? ''
          ).replace(
            /\s+/g,
            ' '
          );

        expect(
          summaryText
        ).toContain(
          'Pago realizado y confirmado'
        );

        expect(
          summaryText
        ).toContain(
          '90.00'
        );

        expect(
          summaryText.toUpperCase()
        ).toContain(
          'YAPE'
        );

        expect(
          summaryText
        ).toContain(
          'CONFIRMADO'
        );

        const details =
          fixture.nativeElement.querySelector(
            '#patient-payment-details-16'
          ) as HTMLElement | null;

        expect(details).not.toBeNull();

        let toggle =
          fixture.nativeElement.querySelector(
            '.patient-payment-toggle'
          ) as HTMLButtonElement | null;

        expect(toggle).not.toBeNull();

        expect(
          toggle?.textContent
        ).toContain(
          'VER PAGO'
        );

        expect(
          toggle?.getAttribute(
            'aria-expanded'
          )
        ).toBe(
          'false'
        );

        expect(
          toggle?.getAttribute(
            'aria-controls'
          )
        ).toBe(
          'patient-payment-details-16'
        );

        /*
         * CLICK REAL: abrir.
         */
        toggle?.click();

        fixture.detectChanges();

        expect(
          card?.classList.contains(
            'payment-collapsed'
          )
        ).toBe(false);

        toggle =
          fixture.nativeElement.querySelector(
            '.patient-payment-toggle'
          ) as HTMLButtonElement | null;

        expect(
          toggle?.textContent
        ).toContain(
          'OCULTAR PAGO'
        );

        expect(
          toggle?.getAttribute(
            'aria-expanded'
          )
        ).toBe(
          'true'
        );

        /*
         * CLICK REAL: cerrar.
         */
        toggle?.click();

        fixture.detectChanges();

        expect(
          card?.classList.contains(
            'payment-collapsed'
          )
        ).toBe(true);

        toggle =
          fixture.nativeElement.querySelector(
            '.patient-payment-toggle'
          ) as HTMLButtonElement | null;

        expect(
          toggle?.textContent
        ).toContain(
          'VER PAGO'
        );

        expect(
          toggle?.getAttribute(
            'aria-expanded'
          )
        ).toBe(
          'false'
        );
      }
    );

    it(
      'PENDING permanece expandido y no muestra boton de colapso',
      () => {

        paymentService.find.mockReturnValue(
          of(pendingPayment)
        );

        const fixture =
          TestBed.createComponent(
            PatientManualPaymentComponent
          );

        fixture.componentRef.setInput(
          'requestId',
          17
        );

        fixture.componentRef.setInput(
          'expectedTotal',
          90
        );

        fixture.detectChanges();

        const card =
          fixture.nativeElement.querySelector(
            '.payment-card'
          ) as HTMLElement | null;

        expect(card).not.toBeNull();

        expect(
          card?.classList.contains(
            'payment-collapsed'
          )
        ).toBe(false);

        const toggle =
          fixture.nativeElement.querySelector(
            '.patient-payment-toggle'
          ) as HTMLButtonElement | null;

        expect(toggle).toBeNull();

        const details =
          fixture.nativeElement.querySelector(
            '#patient-payment-details-17'
          ) as HTMLElement | null;

        expect(details).not.toBeNull();

        const pendingBox =
          fixture.nativeElement.querySelector(
            '.pending-box'
          ) as HTMLElement | null;

        expect(pendingBox).not.toBeNull();
      }
    );
  }
);
