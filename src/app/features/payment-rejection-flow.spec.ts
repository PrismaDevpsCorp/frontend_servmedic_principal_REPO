import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { of } from 'rxjs';

import {
  ManualPayment
} from '../core/models/manual-payment.model';

import {
  PatientManualPaymentService
} from '../core/services/patient-manual-payment.service';

import {
  SpecialistManualPaymentService
} from '../core/services/specialist-manual-payment.service';

import {
  PatientManualPaymentComponent
} from './patient-requests/patient-manual-payment/patient-manual-payment';

import {
  SpecialistManualPaymentComponent
} from './requests/specialist-manual-payment/specialist-manual-payment';

function payment(
  status: 'PENDING' | 'REJECTED'
): ManualPayment {

  return {
    paymentId: 99,
    medicalRequestId: 16,
    requestCode: 'SM-B385-001',
    paymentFlow: 'DIRECT_EXTERNAL',
    paymentStatus: status,
    paymentMethod: 'PLIN',

    serviceAmount: 90,
    mobilityAmount: 0,
    additionalAmount: 25,
    totalAmount: 115,

    commissionableAmount: 90,
    platformCommissionPercent: 5,
    platformCommissionAmount: 0,
    specialistNetAmount: 115,

    currency: 'PEN',

    patientProfileId: 1,
    patientFullName: 'Paciente Demo',

    specialistProfileId: 2,
    specialistFullName: 'Especialista Demo',

    externalTransactionId: 'E2E-B385-OLD',

    evidenceAvailable: true,
    evidenceFileName: 'pago-anterior.png',
    evidenceContentType: 'image/png',
    evidenceSize: 4,
    evidenceUploadedAt:
      '2026-08-15T17:30:00-05:00',

    paidAt: null,
    verifiedAt: null,

    rejectedAt:
      status === 'REJECTED'
        ? '2026-08-15T18:00:00-05:00'
        : null,

    rejectionReason:
      status === 'REJECTED'
        ? 'El abono no aparece en la cuenta.'
        : null,

    verificationWarningAcknowledged: false,

    message: null
  };
}

class SpecialistPaymentServiceMock {

  rejectCalls = 0;
  rejectedReason = '';

  find(
    requestId: number
  ) {

    void requestId;

    return of(
      payment('PENDING')
    );
  }

  evidence(
    requestId: number
  ) {

    void requestId;

    return of(
      new Blob(
        [new Uint8Array([1, 2, 3, 4])],
        {
          type: 'image/png'
        }
      )
    );
  }

  confirm(
    requestId: number
  ) {

    void requestId;

    return of(
      payment('PENDING')
    );
  }

  reject(
    requestId: number,
    reason: string
  ) {

    void requestId;

    this.rejectCalls++;
    this.rejectedReason = reason;

    return of({
      ...payment('REJECTED'),
      rejectionReason: reason
    });
  }
}

class PatientPaymentServiceMock {

  registerCalls = 0;
  registeredMethod = '';
  registeredReference = '';
  registeredFileName = '';

  find(
    requestId: number
  ) {

    void requestId;

    return of(
      payment('REJECTED')
    );
  }

  register(
    requestId: number,
    paymentMethod: string,
    externalTransactionId: string,
    evidence: File
  ) {

    void requestId;

    this.registerCalls++;
    this.registeredMethod = paymentMethod;
    this.registeredReference =
      externalTransactionId;

    this.registeredFileName =
      evidence.name;

    return of({
      ...payment('PENDING'),
      paymentMethod,
      externalTransactionId,
      evidenceFileName: evidence.name,
      rejectedAt: null,
      rejectionReason: null
    });
  }
}

function findButton(
  fixture:
    ComponentFixture<
      SpecialistManualPaymentComponent
      | PatientManualPaymentComponent
    >,
  text: string
): HTMLButtonElement {

  const buttons =
    Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      )
    ) as HTMLButtonElement[];

  const found =
    buttons.find(
      (button) =>
        (button.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .includes(text)
    );

  if (!found) {
    throw new Error(
      'Boton no encontrado: ' + text
    );
  }

  return found;
}

describe(
  'B38.5 payment rejection flow',
  () => {

    afterEach(() => {
      TestBed.resetTestingModule();
    });

    it(
      'especialista rechaza un pago pendiente con motivo obligatorio',
      async () => {

        const paymentService =
          new SpecialistPaymentServiceMock();

        await TestBed.configureTestingModule({
          imports: [
            SpecialistManualPaymentComponent
          ],
          providers: [
            {
              provide:
                SpecialistManualPaymentService,
              useValue:
                paymentService
            }
          ]
        }).compileComponents();

        const fixture =
          TestBed.createComponent(
            SpecialistManualPaymentComponent
          );

        fixture.componentRef.setInput(
          'requestId',
          16
        );

        fixture.detectChanges();

        const rejectButton =
          findButton(
            fixture,
            'Rechazar pago'
          );

        rejectButton.click();
        fixture.detectChanges();

        const textarea =
          fixture.nativeElement.querySelector(
            'textarea'
          ) as HTMLTextAreaElement | null;

        expect(textarea).not.toBeNull();

        if (!textarea) {
          throw new Error(
            'Textarea de rechazo ausente.'
          );
        }

        textarea.value =
          'El abono no aparece en la cuenta.';

        textarea.dispatchEvent(
          new Event(
            'input',
            {
              bubbles: true
            }
          )
        );

        fixture.detectChanges();

        const confirmReject =
          findButton(
            fixture,
            'Confirmar rechazo'
          );

        expect(confirmReject.disabled)
          .toBe(false);

        confirmReject.click();
        fixture.detectChanges();

        expect(paymentService.rejectCalls)
          .toBe(1);

        expect(paymentService.rejectedReason)
          .toBe(
            'El abono no aparece en la cuenta.'
          );

        expect(
          fixture.componentInstance
            .payment()
            ?.paymentStatus
        ).toBe('REJECTED');

        expect(
          fixture.nativeElement.textContent
        ).toContain(
          'Pago rechazado'
        );

        expect(
          fixture.nativeElement.textContent
        ).toContain(
          'El abono no aparece en la cuenta.'
        );
      }
    );

    it(
      'paciente ve rechazo abierto y registra nueva evidencia',
      async () => {

        const paymentService =
          new PatientPaymentServiceMock();

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
        }).compileComponents();

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
          115
        );

        fixture.componentRef.setInput(
          'specialistName',
          'Especialista Demo'
        );

        fixture.detectChanges();

        expect(
          fixture.componentInstance
            .paymentDetailsExpanded()
        ).toBe(true);

        expect(
          fixture.nativeElement.textContent
        ).toContain(
          'El especialista rechazó este pago.'
        );

        expect(
          fixture.nativeElement.textContent
        ).toContain(
          'El abono no aparece en la cuenta.'
        );

        expect(
          fixture.nativeElement.textContent
        ).toContain(
          'Registrar nueva evidencia'
        );

        const fileInput =
          fixture.nativeElement.querySelector(
            'input[type="file"]'
          ) as HTMLInputElement | null;

        expect(fileInput).not.toBeNull();

        if (!fileInput) {
          throw new Error(
            'Input de evidencia ausente.'
          );
        }

        const correctedEvidence =
          new File(
            [
              new Uint8Array(
                [9, 8, 7, 6]
              )
            ],
            'pago-corregido.png',
            {
              type: 'image/png'
            }
          );

        Object.defineProperty(
          fileInput,
          'files',
          {
            configurable: true,
            value: [
              correctedEvidence
            ]
          }
        );

        fileInput.dispatchEvent(
          new Event(
            'change',
            {
              bubbles: true
            }
          )
        );

        fixture.detectChanges();

        const methodSelect =
          fixture.nativeElement.querySelector(
            'select'
          ) as HTMLSelectElement | null;

        expect(methodSelect).not.toBeNull();

        if (!methodSelect) {
          throw new Error(
            'Selector de metodo ausente.'
          );
        }

        methodSelect.value = 'PLIN';

        methodSelect.dispatchEvent(
          new Event(
            'change',
            {
              bubbles: true
            }
          )
        );

        const referenceInput =
          fixture.nativeElement.querySelector(
            'input[type="text"]'
          ) as HTMLInputElement | null;

        expect(referenceInput).not.toBeNull();

        if (!referenceInput) {
          throw new Error(
            'Input de referencia ausente.'
          );
        }

        referenceInput.value =
          'E2E-B385-NEW';

        referenceInput.dispatchEvent(
          new Event(
            'input',
            {
              bubbles: true
            }
          )
        );

        await fixture.whenStable();

        fixture.detectChanges();

        const registerButton =
          findButton(
            fixture,
            'Registrar nueva evidencia'
          );

        expect(registerButton.disabled)
          .toBe(false);

        registerButton.click();
        fixture.detectChanges();

        expect(paymentService.registerCalls)
          .toBe(1);

        expect(paymentService.registeredMethod)
          .toBe('PLIN');

        expect(
          paymentService.registeredReference
        ).toBe(
          'E2E-B385-NEW'
        );

        expect(
          paymentService.registeredFileName
        ).toBe(
          'pago-corregido.png'
        );

        expect(
          fixture.componentInstance
            .payment()
            ?.paymentStatus
        ).toBe('PENDING');

        expect(
          fixture.componentInstance
            .payment()
            ?.rejectionReason
        ).toBeNull();

        expect(
          fixture.nativeElement.textContent
        ).toContain(
          'Pendiente de verificación'
        );
      }
    );
  }
);
