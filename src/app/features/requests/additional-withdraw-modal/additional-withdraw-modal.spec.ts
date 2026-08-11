import { describe, expect, it, vi } from 'vitest';
import {
  MedicalRequestAdditional
} from '../../../core/models/medical-request-additional.model';
import {
  AdditionalWithdrawModal
} from './additional-withdraw-modal';

function additionalFixture(): MedicalRequestAdditional {
  return {
    additionalId: 7,
    concept: 'Validación UX final 38.3',
    amount: 0.01,
    status: 'PENDING'
  } as MedicalRequestAdditional;
}

describe(
  'AdditionalWithdrawModal',
  () => {
    it(
      'emite cancelar y confirmar cuando no esta procesando',
      () => {
        const component =
          new AdditionalWithdrawModal();

        component.additional =
          additionalFixture();

        const cancelSpy = vi.fn();
        const confirmSpy = vi.fn();

        component.cancelled.subscribe(
          cancelSpy
        );

        component.confirmed.subscribe(
          confirmSpy
        );

        component.requestCancel();
        component.requestConfirm();

        expect(cancelSpy).toHaveBeenCalledTimes(1);
        expect(confirmSpy).toHaveBeenCalledTimes(1);
      }
    );

    it(
      'bloquea cancelar y confirmar mientras procesa',
      () => {
        const component =
          new AdditionalWithdrawModal();

        component.additional =
          additionalFixture();

        component.loading = true;

        const cancelSpy = vi.fn();
        const confirmSpy = vi.fn();

        component.cancelled.subscribe(
          cancelSpy
        );

        component.confirmed.subscribe(
          confirmSpy
        );

        component.requestCancel();
        component.requestConfirm();

        expect(cancelSpy).not.toHaveBeenCalled();
        expect(confirmSpy).not.toHaveBeenCalled();
      }
    );
  }
);