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
  AttentionReportService
} from '../../core/services/attention-report.service';

import {
  SpecialistCommercialProfileService
} from '../../core/services/specialist-commercial-profile.service';

import {
  SpecialistMedicalRequestAdditionalService
} from '../../core/services/specialist-medical-request-additional.service';

import {
  SpecialistMedicalRequestProposalService
} from '../../core/services/specialist-medical-request-proposal.service';

import {
  SpecialistMedicalRequestService
} from '../../core/services/specialist-medical-request.service';

import { Requests } from './requests';

describe(
  'Requests - adicionales especialista',
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
      acceptedSpecialistFullName: 'Medico Demo 2',
      addressText: 'Huaraz',
      estimatedAmount: 105
    };

    const pendingAdditional:
      MedicalRequestAdditional = {
        additionalId: 1,
        medicalRequestId: 16,
        requestCode: 'SM-3F72A61D',
        requestStatus: 'EN_ATENCION',
        specialistProfileId: 2,
        specialistFullName: 'Medico Demo 2',
        concept: 'Material clínico',
        justification:
          'Material adicional requerido durante la atención.',
        amount: 25.5,
        currency: 'PEN',
        status: 'PENDING',
        originalTotalAmount: 105,
        approvedAdditionalsAmount: 0,
        currentTotalAmount: 105,
        createdAt: '2026-08-06T19:00:00-05:00',
        updatedAt: '2026-08-06T19:00:00-05:00',
        respondedAt: null,
        withdrawnAt: null
      };

    let listedAdditionals:
      MedicalRequestAdditional[];

    let listCalls: number[];
    let createCalls: Array<{
      requestId: number;
      concept: string;
      justification: string;
      amount: number;
    }>;

    let withdrawCalls: Array<{
      requestId: number;
      additionalId: number;
    }>;

    let finishCalls: number[];

    beforeEach(async () => {
      listedAdditionals = [
        pendingAdditional
      ];

      listCalls = [];
      createCalls = [];
      withdrawCalls = [];
      finishCalls = [];

      TestBed.configureTestingModule({
        imports: [Requests],
        providers: [
          {
            provide: SpecialistMedicalRequestService,
            useValue: {
              listPending: () => of([]),
              listAssigned: () => of([]),
              accept: () => of(request),
              startRoute: () => of(request),
              startAttention: () => of(request),

              finish: (requestId: number) => {
                finishCalls.push(requestId);

                return of({
                  ...request,
                  status: 'FINALIZADO'
                });
              }
            }
          },

          {
            provide: SpecialistMedicalRequestProposalService,
            useValue: {
              list: () => of([]),
              create: () => of(null),
              withdraw: () => of(null)
            }
          },

          {
            provide: SpecialistCommercialProfileService,
            useValue: {
              getProfile: () =>
                of({
                  specialistProfileId: 2,
                  professionCode: 'MED',
                  professionName: 'Medicina',
                  mobilityPolicy: 'INCLUDED',
                  mobilityReferenceAmount: null,
                  commercialNotes: null,
                  active: true,
                  services: [],
                  paymentMethods: []
                })
            }
          },

          {
            provide: AttentionReportService,
            useValue: {
              findByMedicalRequestId: () =>
                of(null)
            }
          },

          {
            provide: SpecialistMedicalRequestAdditionalService,
            useValue: {
              list: (requestId: number) => {
                listCalls.push(requestId);
                return of(listedAdditionals);
              },

              create: (
                requestId: number,
                payload: {
                  concept: string;
                  justification: string;
                  amount: number;
                }
              ) => {
                createCalls.push({
                  requestId,
                  ...payload
                });

                return of(pendingAdditional);
              },

              withdraw: (
                requestId: number,
                additionalId: number
              ) => {
                withdrawCalls.push({
                  requestId,
                  additionalId
                });

                return of({
                  ...pendingAdditional,
                  status: 'WITHDRAWN',
                  withdrawnAt:
                    '2026-08-06T19:10:00-05:00'
                });
              }
            }
          }
        ]
      });

      TestBed.overrideComponent(
        Requests,
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
      'carga los adicionales al expandir',
      () => {
        const fixture =
          TestBed.createComponent(Requests);

        const component =
          fixture.componentInstance;

        component.toggleAdditionals(request);

        expect(
          component.expandedAdditionalRequestId()
        ).toBe(16);

        expect(listCalls).toEqual([16]);

        expect(
          component.additionalsFor(16)
        ).toEqual([pendingAdditional]);
      }
    );

    it(
      'crea un adicional válido',
      () => {
        const fixture =
          TestBed.createComponent(Requests);

        const component =
          fixture.componentInstance;

        component.openAdditionalEditor(request);

        component.additionalConcept =
          'Material clínico';

        component.additionalJustification =
          'Material adicional requerido durante la atención.';

        component.additionalAmount = 25.5;

        component.submitAdditional(request);

        expect(createCalls).toEqual([
          {
            requestId: 16,
            concept: 'Material clínico',
            justification:
              'Material adicional requerido durante la atención.',
            amount: 25.5
          }
        ]);

        expect(
          component.hasPendingAdditionals(16)
        ).toBe(true);

        expect(
          component.additionalEditorRequestId()
        ).toBeNull();
      }
    );

    it(
      'retira un adicional pendiente',
      () => {
        vi.spyOn(
          window,
          'confirm'
        ).mockReturnValue(true);

        const fixture =
          TestBed.createComponent(Requests);

        const component =
          fixture.componentInstance;

        component.additionalsByRequestId.set({
          16: [pendingAdditional]
        });

        component.withdrawAdditional(
          request,
          pendingAdditional
        );

        expect(withdrawCalls).toEqual([
          {
            requestId: 16,
            additionalId: 1
          }
        ]);

        expect(
          component.additionalsFor(16)[0].status
        ).toBe('WITHDRAWN');

        expect(
          component.hasPendingAdditionals(16)
        ).toBe(false);
      }
    );

    it(
      'consulta adicionales frescos antes de finalizar',
      () => {
        const fixture =
          TestBed.createComponent(Requests);

        const component =
          fixture.componentInstance;

        component.additionalsByRequestId.set({
          16: []
        });

        component.finishWithAdditionalGuard(
          request
        );

        expect(listCalls).toEqual([16]);
        expect(finishCalls).toEqual([]);

        expect(
          component.errorMessage()
        ).toContain(
          'cargo adicional pendiente'
        );

        expect(
          component.hasPendingAdditionals(16)
        ).toBe(true);

        listedAdditionals = [];

        component.errorMessage.set('');

        component.finishWithAdditionalGuard(
          request
        );

        expect(listCalls).toEqual([
          16,
          16
        ]);

        expect(finishCalls).toEqual([16]);

        expect(
          component.hasPendingAdditionals(16)
        ).toBe(false);
      }
    );
  }
);
