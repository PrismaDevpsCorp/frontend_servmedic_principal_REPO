import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

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

import {
  Requests
} from './requests';

describe(
  'Requests - H3 oportunidades DOM',
  () => {

    const requestA: MedicalRequest = {
      id: 101,
      requestCode: 'SM-H3-A',

      patientProfileId: 1,
      patientFullName: 'Paciente Uno',
      patientDni: '70000001',

      serviceCode: 'SALUD_CASA',
      serviceName: 'Salud en casa',

      professionCode: 'MED',
      professionName: 'Medicina',

      requiresPrescription: false,

      status: 'PENDIENTE',

      acceptedSpecialistProfileId: 2,
      acceptedSpecialistFullName:
        'Especialista Demo',

      addressText:
        'Jr. Jose de Sucre 100, Huaraz',

      addressReference:
        'Frente al parque',

      patientNotes:
        'Paciente de prueba H3',

      estimatedAmount: 90
    };

    const requestB: MedicalRequest = {
      ...requestA,

      id: 102,
      requestCode: 'SM-H3-B',

      patientProfileId: 2,
      patientFullName: 'Paciente Dos',
      patientDni: '70000002',

      addressText:
        'Av. Luzuriaga 200, Huaraz',

      addressReference:
        'Segundo piso'
    };

    beforeEach(
      async () => {

        TestBed.configureTestingModule({
          imports: [
            Requests
          ],

          providers: [
            {
              provide:
                SpecialistMedicalRequestService,

              useValue: {
                listPending: () =>
                  of([
                    requestA,
                    requestB
                  ]),

                listAssigned: () =>
                  of([]),

                accept: () =>
                  of(requestA),

                startRoute: () =>
                  of(requestA),

                startAttention: () =>
                  of(requestA),

                finish: () =>
                  of(requestA)
              }
            },

            {
              provide:
                SpecialistMedicalRequestProposalService,

              useValue: {
                list: () =>
                  of([]),

                create: () =>
                  of(null),

                withdraw: () =>
                  of(null)
              }
            },

            {
              provide:
                SpecialistCommercialProfileService,

              useValue: {
                getProfile: () =>
                  of({
                    specialistProfileId: 2,

                    professionCode:
                      'MED',

                    professionName:
                      'Medicina',

                    mobilityPolicy:
                      'INCLUDED',

                    mobilityReferenceAmount:
                      null,

                    commercialNotes:
                      null,

                    active:
                      true,

                    services:
                      [],

                    paymentMethods:
                      []
                  })
              }
            },

            {
              provide:
                AttentionReportService,

              useValue: {
                findByMedicalRequestId: () =>
                  of(null)
              }
            },

            {
              provide:
                SpecialistMedicalRequestAdditionalService,

              useValue: {
                list: () =>
                  of([]),

                create: () =>
                  of(null),

                withdraw: () =>
                  of(null)
              }
            }
          ]
        });

        await TestBed.compileComponents();
      }
    );

    afterEach(
      () => {

        vi.restoreAllMocks();
      }
    );

    it(
      'DETALLES abre una sola oportunidad y mantiene aria-controls',
      () => {

        const fixture =
          TestBed.createComponent(
            Requests
          );

        const component =
          fixture.componentInstance;

        vi.spyOn(
          component,
          'calculatedDistanceKm'
        ).mockReturnValue(
          1.25
        );

        vi.spyOn(
          component,
          'distanceLabel'
        ).mockImplementation(
          (request: MedicalRequest) =>
            request.id === 101
              ? '1.3 km'
              : '2.1 km'
        );

        fixture.detectChanges();

        let cards =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              'article.opportunity-card'
            )
          ) as HTMLElement[];

        let toggles =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              '.opportunity-toggle'
            )
          ) as HTMLButtonElement[];

        expect(cards.length).toBe(2);
        expect(toggles.length).toBe(2);

        /*
         * Estado inicial.
         */
        expect(
          component.expandedOpportunityRequestId()
        ).toBeNull();

        expect(
          toggles[0].textContent
        ).toContain(
          'DETALLES'
        );

        expect(
          toggles[0].getAttribute(
            'aria-expanded'
          )
        ).toBe(
          'false'
        );

        expect(
          toggles[0].getAttribute(
            'aria-controls'
          )
        ).toBe(
          'opportunity-details-101'
        );

        expect(
          fixture.nativeElement.querySelector(
            '#opportunity-details-101'
          )
        ).not.toBeNull();

        expect(
          fixture.nativeElement.querySelector(
            '#opportunity-details-102'
          )
        ).not.toBeNull();

        /*
         * Distancia compacta visible en DOM.
         */
        const compactDistances =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              '.opportunity-compact-distance'
            )
          ) as HTMLElement[];

        expect(
          compactDistances.length
        ).toBe(2);

        expect(
          compactDistances[0].textContent
        ).toContain(
          '1.3 km'
        );

        /*
         * CLICK DOM REAL: abre primera.
         */
        toggles[0].click();

        fixture.detectChanges();

        cards =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              'article.opportunity-card'
            )
          ) as HTMLElement[];

        toggles =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              '.opportunity-toggle'
            )
          ) as HTMLButtonElement[];

        expect(
          component.expandedOpportunityRequestId()
        ).toBe(
          101
        );

        expect(
          cards[0].classList.contains(
            'opportunity-expanded'
          )
        ).toBe(true);

        expect(
          cards[1].classList.contains(
            'opportunity-expanded'
          )
        ).toBe(false);

        expect(
          toggles[0].getAttribute(
            'aria-expanded'
          )
        ).toBe(
          'true'
        );

        expect(
          toggles[0].textContent
        ).toContain(
          'OCULTAR DETALLES'
        );

        /*
         * CLICK DOM REAL: abre segunda.
         * La primera debe cerrarse.
         */
        toggles[1].click();

        fixture.detectChanges();

        cards =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              'article.opportunity-card'
            )
          ) as HTMLElement[];

        toggles =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              '.opportunity-toggle'
            )
          ) as HTMLButtonElement[];

        expect(
          component.expandedOpportunityRequestId()
        ).toBe(
          102
        );

        expect(
          cards[0].classList.contains(
            'opportunity-expanded'
          )
        ).toBe(false);

        expect(
          cards[1].classList.contains(
            'opportunity-expanded'
          )
        ).toBe(true);

        expect(
          toggles[0].getAttribute(
            'aria-expanded'
          )
        ).toBe(
          'false'
        );

        expect(
          toggles[1].getAttribute(
            'aria-expanded'
          )
        ).toBe(
          'true'
        );

        /*
         * CLICK DOM REAL nuevamente:
         * segunda se cierra.
         */
        toggles[1].click();

        fixture.detectChanges();

        cards =
          Array.from(
            fixture.nativeElement.querySelectorAll(
              'article.opportunity-card'
            )
          ) as HTMLElement[];

        expect(
          component.expandedOpportunityRequestId()
        ).toBeNull();

        expect(
          cards[0].classList.contains(
            'opportunity-expanded'
          )
        ).toBe(false);

        expect(
          cards[1].classList.contains(
            'opportunity-expanded'
          )
        ).toBe(false);
      }
    );
  }
);
