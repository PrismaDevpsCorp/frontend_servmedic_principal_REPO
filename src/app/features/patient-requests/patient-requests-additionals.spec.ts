import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  MedicalRequestAdditional
} from '../../core/models/medical-request-additional.model';

import {
  MedicalRequest
} from '../../core/models/medical-request.model';

import {
  PatientMedicalRequestAdditionalService
} from '../../core/services/patient-medical-request-additional.service';

import {
  PatientMedicalRequestProposalService
} from '../../core/services/patient-medical-request-proposal.service';

import {
  PatientMedicalRequestService
} from '../../core/services/patient-medical-request.service';

import {
  PatientRequests
} from './patient-requests';

describe(
  'PatientRequests - adicionales',
  () => {
    const request: MedicalRequest = {
      id: 16,
      requestCode: 'SM-3F72A61D',
      patientProfileId: 1,
      patientFullName: 'Paciente Demo',
      patientDni: '70000001',
      serviceCode: 'SALUD_CASA',
      serviceName: 'Salud en casa',
      professionCode: 'MED',
      professionName: 'Medicina',
      requiresPrescription: false,
      status: 'EN_ATENCION',
      acceptedSpecialistProfileId: 2,
      acceptedSpecialistFullName:
        'Medico Demo 2',
      addressText: 'Huaraz',
      estimatedAmount: 105
    };

    const pending:
      MedicalRequestAdditional = {
        additionalId: 1,
        medicalRequestId: 16,
        requestCode: 'SM-3F72A61D',
        requestStatus: 'EN_ATENCION',
        specialistProfileId: 2,
        specialistFullName:
          'Medico Demo 2',
        concept: 'Material clínico',
        justification:
          'Material adicional requerido durante la atención.',
        amount: 25.5,
        currency: 'PEN',
        status: 'PENDING',
        originalTotalAmount: 105,
        approvedAdditionalsAmount: 0,
        currentTotalAmount: 105,
        createdAt:
          '2026-08-06T19:00:00-05:00',
        updatedAt:
          '2026-08-06T19:00:00-05:00',
        respondedAt: null,
        withdrawnAt: null
      };

    const approved:
      MedicalRequestAdditional = {
        ...pending,
        status: 'APPROVED',
        approvedAdditionalsAmount: 25.5,
        currentTotalAmount: 130.5,
        respondedAt:
          '2026-08-06T19:10:00-05:00'
      };

    const rejected:
      MedicalRequestAdditional = {
        ...pending,
        status: 'REJECTED',
        approvedAdditionalsAmount: 0,
        currentTotalAmount: 105,
        respondedAt:
          '2026-08-06T19:11:00-05:00'
      };

    let listCalls: number[];
    let approveCalls: Array<{
      requestId: number;
      additionalId: number;
    }>;
    let rejectCalls: Array<{
      requestId: number;
      additionalId: number;
    }>;

    beforeEach(async () => {
      listCalls = [];
      approveCalls = [];
      rejectCalls = [];

      TestBed.configureTestingModule({
        imports: [
          PatientRequests
        ],
        providers: [
          {
            provide:
              PatientMedicalRequestService,
            useValue: {
              list: () =>
                of<MedicalRequest[]>([]),
              findById: () =>
                of(request),
              create: () =>
                of(request)
            }
          },
          {
            provide:
              PatientMedicalRequestProposalService,
            useValue: {
              list: () => of([]),
              accept: () => of(null)
            }
          },
          {
            provide:
              PatientMedicalRequestAdditionalService,
            useValue: {
              list: (
                requestId: number
              ) => {
                listCalls.push(
                  requestId
                );

                return of<
                  MedicalRequestAdditional[]
                >([pending]);
              },

              approve: (
                requestId: number,
                additionalId: number
              ) => {
                approveCalls.push({
                  requestId,
                  additionalId
                });

                return of(approved);
              },

              reject: (
                requestId: number,
                additionalId: number
              ) => {
                rejectCalls.push({
                  requestId,
                  additionalId
                });

                return of(rejected);
              }
            }
          }
        ]
      });

      TestBed.overrideComponent(
        PatientRequests,
        {
          set: {
            template: ''
          }
        }
      );

      await TestBed.compileComponents();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it(
      'carga adicionales y conserva el total original',
      () => {
        const fixture =
          TestBed.createComponent(
            PatientRequests
          );

        const component =
          fixture.componentInstance;

        component.toggleAdditionals(
          request
        );

        expect(
          component.expandedAdditionalRequestId()
        ).toBe(16);

        expect(
          listCalls
        ).toEqual([16]);

        expect(
          component.additionalsFor(16)
        ).toEqual([pending]);

        expect(
          component.requestOriginalTotal(
            request
          )
        ).toBe(105);

        expect(
          component.requestCurrentTotal(
            request
          )
        ).toBe(105);

        expect(
          component.pendingAdditionalsCount(
            16
          )
        ).toBe(1);
      }
    );

    it(
      'aprueba un adicional y actualiza el total vigente',
      () => {
        vi.spyOn(
          window,
          'confirm'
        ).mockReturnValue(true);

        const fixture =
          TestBed.createComponent(
            PatientRequests
          );

        const component =
          fixture.componentInstance;

        component.additionalsByRequestId.set({
          16: [pending]
        });

        component.approveAdditional(
          request,
          pending
        );

        component.confirmAdditionalApproval();

        expect(
          approveCalls
        ).toEqual([
          {
            requestId: 16,
            additionalId: 1
          }
        ]);

        expect(
          component.additionalsFor(16)[0]
            .status
        ).toBe('APPROVED');

        expect(
          component.requestApprovedAdditionalsAmount(
            16
          )
        ).toBe(25.5);

        expect(
          component.requestCurrentTotal(
            request
          )
        ).toBe(130.5);

        expect(
          component.hasPendingAdditionals(
            16
          )
        ).toBe(false);
      }
    );

    it(
      'rechaza un adicional sin alterar el total original',
      () => {
        vi.spyOn(
          window,
          'confirm'
        ).mockReturnValue(true);

        const fixture =
          TestBed.createComponent(
            PatientRequests
          );

        const component =
          fixture.componentInstance;

        component.additionalsByRequestId.set({
          16: [pending]
        });

        component.rejectAdditional(
          request,
          pending
        );

        expect(
          rejectCalls
        ).toEqual([
          {
            requestId: 16,
            additionalId: 1
          }
        ]);

        expect(
          component.additionalsFor(16)[0]
            .status
        ).toBe('REJECTED');

        expect(
          component.requestApprovedAdditionalsAmount(
            16
          )
        ).toBe(0);

        expect(
          component.requestCurrentTotal(
            request
          )
        ).toBe(105);

        expect(
          component.hasPendingAdditionals(
            16
          )
        ).toBe(false);
      }
    );

    it(
      'no permite decidir adicionales fuera de EN_ATENCION',
      () => {
        const fixture =
          TestBed.createComponent(
            PatientRequests
          );

        const component =
          fixture.componentInstance;

        const enCaminoRequest:
          MedicalRequest = {
            ...request,
            status: 'EN_CAMINO'
          };

        expect(
          component.canDecideAdditional(
            enCaminoRequest,
            pending
          )
        ).toBe(false);

        component.approveAdditional(
          enCaminoRequest,
          pending
        );

        component.rejectAdditional(
          enCaminoRequest,
          pending
        );

        expect(
          approveCalls
        ).toEqual([]);

        expect(
          rejectCalls
        ).toEqual([]);
      }
    );

    it(
      'abre el modal amigable antes de ejecutar la aprobacion',
      () => {
        const fixture =
          TestBed.createComponent(
            PatientRequests
          );

        const component =
          fixture.componentInstance;

        component.additionalsByRequestId.set({
          16: [pending]
        });

        component.approveAdditional(
          request,
          pending
        );

        expect(
          approveCalls
        ).toEqual([]);

        expect(
          component.additionalApprovalConfirmation()
        ).not.toBeNull();

        expect(
          component.additionalApprovalConfirmation()
            ?.additional.additionalId
        ).toBe(
          pending.additionalId
        );

        component.closeAdditionalApprovalConfirmation();

        expect(
          component.additionalApprovalConfirmation()
        ).toBeNull();

        expect(
          approveCalls
        ).toEqual([]);
      }
    );
  }
);