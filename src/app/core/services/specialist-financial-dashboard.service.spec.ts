import { TestBed } from '@angular/core/testing';

import {
  provideHttpClient
} from '@angular/common/http';

import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import {
  SpecialistFinancialDashboardService
} from './specialist-financial-dashboard.service';

import {
  SpecialistFinancialDashboardResponse
} from '../models/specialist-financial-dashboard.model';

import {
  environment
} from '../../../environments/environment';

describe(
  'SpecialistFinancialDashboardService',
  () => {

    let service:
      SpecialistFinancialDashboardService;

    let httpMock:
      HttpTestingController;

    beforeEach(() => {

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting()
        ]
      });

      service =
        TestBed.inject(
          SpecialistFinancialDashboardService
        );

      httpMock =
        TestBed.inject(
          HttpTestingController
        );
    });

    afterEach(() => {
      httpMock.verify();
    });

    it(
      'loads specialist financial dashboard with pagination',
      () => {

        const response:
          SpecialistFinancialDashboardResponse = {
            summary: {
              totalOperations: 3,
              paidOperations: 1,
              pendingOperations: 1,
              rejectedOperations: 1,
              paidServiceAmount: 100,
              paidMobilityAmount: 20,
              paidAdditionalAmount: 30,
              paidTotalAmount: 150,
              platformCommissionPercent: 5,
              platformCommissionAmount: 5,
              specialistNetAmount: 145,
              currency: 'PEN'
            },
            operations: [],
            page: 2,
            size: 10,
            totalElements: 21,
            totalPages: 3
          };

        service
          .find(
            2,
            10
          )
          .subscribe((result) => {

            expect(
              result.summary.paidTotalAmount
            ).toBe(150);

            expect(
              result.summary.platformCommissionAmount
            ).toBe(5);

            expect(
              result.summary.specialistNetAmount
            ).toBe(145);

            expect(
              result.page
            ).toBe(2);
          });

        const request =
          httpMock.expectOne(
            environment.apiUrl
            + '/specialist/financial-dashboard'
            + '?page=2&size=10'
          );

        expect(
          request.request.method
        ).toBe('GET');

        request.flush(response);
      }
    );
  }
);
