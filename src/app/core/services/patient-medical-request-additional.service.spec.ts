import {
  provideHttpClient
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  MedicalRequestAdditional
} from '../models/medical-request-additional.model';
import {
  PatientMedicalRequestAdditionalService
} from './patient-medical-request-additional.service';

describe(
  'PatientMedicalRequestAdditionalService',
  () => {
    let service:
      PatientMedicalRequestAdditionalService;

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
        PatientMedicalRequestAdditionalService
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
          '/api/patient/medical-requests/16/additionals'
        );

        expect(request.request.method).toBe('GET');

        request.flush([response]);
      }
    );

    it(
      'should approve a pending additional',
      () => {
        const approved: MedicalRequestAdditional = {
          ...response,
          status: 'APPROVED',
          approvedAdditionalsAmount: 25.5,
          currentTotalAmount: 130.5,
          respondedAt:
            '2026-08-06T19:05:00-05:00'
        };

        service.approve(
          16,
          1
        ).subscribe(
          (item) => {
            expect(item).toEqual(approved);
          }
        );

        const request = httpTesting.expectOne(
          '/api/patient/medical-requests/16'
          + '/additionals/1/approve'
        );

        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({});

        request.flush(approved);
      }
    );

    it(
      'should reject a pending additional',
      () => {
        const rejected: MedicalRequestAdditional = {
          ...response,
          status: 'REJECTED',
          respondedAt:
            '2026-08-06T19:05:00-05:00'
        };

        service.reject(
          16,
          1
        ).subscribe(
          (item) => {
            expect(item).toEqual(rejected);
          }
        );

        const request = httpTesting.expectOne(
          '/api/patient/medical-requests/16'
          + '/additionals/1/reject'
        );

        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({});

        request.flush(rejected);
      }
    );
  }
);