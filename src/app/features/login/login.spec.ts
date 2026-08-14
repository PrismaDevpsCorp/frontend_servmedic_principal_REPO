import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import {
  AuthService
} from '../../core/auth/auth.service';

import { Login } from './login';

describe(
  'Login session expiry notice',
  () => {
    const authStub = {
      loginAs: () => {
        throw new Error(
          'loginAs no esperado en esta prueba'
        );
      },

      homeRoute: () =>
        '/dashboard'
    };

    const routerStub = {
      navigate: () =>
        Promise.resolve(true)
    };

    beforeEach(() => {
      localStorage.clear();

      TestBed.configureTestingModule({
        imports: [
          Login
        ],
        providers: [
          {
            provide: AuthService,
            useValue: authStub
          },
          {
            provide: Router,
            useValue: routerStub
          }
        ]
      });
    });

    afterEach(() => {
      localStorage.clear();
    });

    it(
      'consume el aviso y muestra mensaje humano de sesion expirada',
      () => {
        localStorage.setItem(
          'medicdrive_session_expired_notice',
          '1'
        );

        localStorage.setItem(
          'medicdrive_session_expiry_redirecting',
          '1'
        );

        const fixture =
          TestBed.createComponent(Login);

        fixture.detectChanges();

        expect(
          fixture.componentInstance
            .errorMessage()
        ).toBe(
          'Tu sesión ha expirado. Inicia sesión nuevamente.'
        );

        expect(
          localStorage.getItem(
            'medicdrive_session_expired_notice'
          )
        ).toBeNull();

        expect(
          localStorage.getItem(
            'medicdrive_session_expiry_redirecting'
          )
        ).toBeNull();

        const message =
          fixture.nativeElement
            .querySelector(
              '.error-message'
            ) as HTMLElement | null;

        expect(message).not.toBeNull();

        expect(
          message?.textContent
        ).toContain(
          'Tu sesión ha expirado.'
        );
      }
    );

    it(
      'sin aviso previo mantiene el login sin mensaje',
      () => {
        const fixture =
          TestBed.createComponent(Login);

        fixture.detectChanges();

        expect(
          fixture.componentInstance
            .errorMessage()
        ).toBe('');
      }
    );
  }
);