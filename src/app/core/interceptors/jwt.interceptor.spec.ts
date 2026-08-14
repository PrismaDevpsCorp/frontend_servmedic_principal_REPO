import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import { jwtInterceptor } from './jwt.interceptor';

describe(
  'jwtInterceptor session expiry',
  () => {
    let http: HttpClient;
    let httpTesting: HttpTestingController;

    let navigateCalls: string[][];

    const routerStub = {
      url: '/patient-requests',

      navigate(
        commands: string[]
      ): Promise<boolean> {
        navigateCalls.push(commands);

        return Promise.resolve(true);
      }
    };

    beforeEach(() => {
      localStorage.clear();

      navigateCalls = [];
      routerStub.url = '/patient-requests';

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(
            withInterceptors([
              jwtInterceptor
            ])
          ),
          provideHttpClientTesting(),
          {
            provide: Router,
            useValue: routerStub
          }
        ]
      });

      http =
        TestBed.inject(HttpClient);

      httpTesting =
        TestBed.inject(
          HttpTestingController
        );
    });

    afterEach(() => {
      httpTesting.verify();
      localStorage.clear();
    });

    it(
      '401 autenticado limpia sesion, redirige y no propaga error tecnico',
      () => {
        localStorage.setItem(
          'medicdrive_services_session',
          JSON.stringify({
            sessionToken: 'expired-token'
          })
        );

        localStorage.setItem(
          'medicdrive_specialist_session',
          JSON.stringify({
            sessionToken: 'legacy-token'
          })
        );

        let completed = false;
        let receivedError = false;

        http
          .get('/api/patient/medical-requests')
          .subscribe({
            complete: () => {
              completed = true;
            },
            error: () => {
              receivedError = true;
            }
          });

        const request =
          httpTesting.expectOne(
            '/api/patient/medical-requests'
          );

        expect(
          request.request.headers.get(
            'Authorization'
          )
        ).toBe(
          'Bearer expired-token'
        );

        request.flush(
          {},
          {
            status: 401,
            statusText: 'Unauthorized'
          }
        );

        expect(
          localStorage.getItem(
            'medicdrive_services_session'
          )
        ).toBeNull();

        expect(
          localStorage.getItem(
            'medicdrive_specialist_session'
          )
        ).toBeNull();

        expect(
          localStorage.getItem(
            'medicdrive_session_expired_notice'
          )
        ).toBe('1');

        expect(
          localStorage.getItem(
            'medicdrive_session_expiry_redirecting'
          )
        ).toBe('1');

        expect(navigateCalls).toEqual([
          ['/login']
        ]);

        expect(receivedError).toBe(false);
        expect(completed).toBe(true);
      }
    );

    it(
      '401 del login publico conserva manejo normal de credenciales',
      () => {
        localStorage.setItem(
          'medicdrive_services_session',
          JSON.stringify({
            sessionToken: 'stale-token'
          })
        );

        let receivedStatus = 0;

        http
          .post(
            '/api/public/auth/patient/login',
            {
              username: 'bad',
              password: 'bad'
            }
          )
          .subscribe({
            error: (
              error: HttpErrorResponse
            ) => {
              receivedStatus =
                error.status;
            }
          });

        const request =
          httpTesting.expectOne(
            '/api/public/auth/patient/login'
          );

        expect(
          request.request.headers.has(
            'Authorization'
          )
        ).toBe(false);

        request.flush(
          {},
          {
            status: 401,
            statusText: 'Unauthorized'
          }
        );

        expect(receivedStatus).toBe(401);

        expect(
          localStorage.getItem(
            'medicdrive_services_session'
          )
        ).not.toBeNull();

        expect(navigateCalls).toEqual([]);
      }
    );

    it(
      '403 autenticado se propaga y no cierra la sesion',
      () => {
        localStorage.setItem(
          'medicdrive_services_session',
          JSON.stringify({
            sessionToken: 'valid-token'
          })
        );

        let receivedStatus = 0;

        http
          .get('/api/protected')
          .subscribe({
            error: (
              error: HttpErrorResponse
            ) => {
              receivedStatus =
                error.status;
            }
          });

        const request =
          httpTesting.expectOne(
            '/api/protected'
          );

        request.flush(
          {},
          {
            status: 403,
            statusText: 'Forbidden'
          }
        );

        expect(receivedStatus).toBe(403);

        expect(
          localStorage.getItem(
            'medicdrive_services_session'
          )
        ).not.toBeNull();

        expect(navigateCalls).toEqual([]);
      }
    );
  }
);