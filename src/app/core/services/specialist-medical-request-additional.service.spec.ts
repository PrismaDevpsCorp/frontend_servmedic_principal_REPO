import {
  provideHttpClient
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  CreateMedicalRequestAdditionalPayload,
  MedicalRequestAdditional
} from '../models/medical-request-additional.model';
import {
  SpecialistMedicalRequestAdditionalService
} from './specialist-medical-request-additional.service';

describe(
  'SpecialistMedicalRequestAdditionalService',
  () => {
    let service:
      SpecialistMedicalRequestAdditionalService;

    let httpTesting:
      HttpTestingController;

    const response: MedicalRequestAdditional = {
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

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting()
        ]
      });

      service = TestBed.inject(
        SpecialistMedicalRequestAdditionalService
      );

      httpTesting = TestBed.inject(
        HttpTestingController
      );
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it(
      'should list request additionals',
      () => {
        service.list(16).subscribe(
          (items) => {
            expect(items).toEqual([response]);
          }
        );

        const request = httpTesting.expectOne(
          '/api/specialist/medical-requests/16/additionals'
        );

        expect(request.request.method).toBe('GET');

        request.flush([response]);
      }
    );

    it(
      'should create a request additional',
      () => {
        const payload:
          CreateMedicalRequestAdditionalPayload = {
            concept: 'Material clínico',
            justification:
              'Material adicional requerido durante la atención.',
            amount: 25.5
          };

        service.create(
          16,
          payload
        ).subscribe(
          (item) => {
            expect(item).toEqual(response);
          }
        );

        const request = httpTesting.expectOne(
          '/api/specialist/medical-requests/16/additionals'
        );

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(payload);

        request.flush(response);
      }
    );

    it(
      'should withdraw a pending additional',
      () => {
        const withdrawn: MedicalRequestAdditional = {
          ...response,
          status: 'WITHDRAWN',
          withdrawnAt:
            '2026-08-06T19:05:00-05:00'
        };

        service.withdraw(
          16,
          1
        ).subscribe(
          (item) => {
            expect(item).toEqual(withdrawn);
          }
        );

        const request = httpTesting.expectOne(
          '/api/specialist/medical-requests/16'
          + '/additionals/1/withdraw'
        );

        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({});

        request.flush(withdrawn);
      }
    );
  }
);