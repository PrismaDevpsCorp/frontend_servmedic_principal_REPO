import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import {
  MapboxTemporaryReverseGeocodingService
} from '../../../core/services/mapbox-temporary-reverse-geocoding.service';

import {
  PatientRequestLocationMap
} from './patient-request-location-map';

describe(
  'PatientRequestLocationMap - H3 stale reverse response',
  () => {

    let resolvers:
      Array<
        (value: string | null) => void
      >;

    const reverse =
      vi.fn();

    beforeEach(
      async () => {

        resolvers = [];

        reverse.mockReset();

        reverse.mockImplementation(
          () =>
            new Promise<string | null>(
              (resolve) => {
                resolvers.push(resolve);
              }
            )
        );

        await TestBed.configureTestingModule({
          imports: [
            PatientRequestLocationMap
          ],

          providers: [
            {
              provide:
                MapboxTemporaryReverseGeocodingService,

              useValue: {
                reverse
              }
            }
          ]
        })
        .compileComponents();
      }
    );

    afterEach(
      () => {

        vi.restoreAllMocks();
      }
    );

    it(
      'ignora una respuesta antigua cuando una ubicacion nueva ya resolvio',
      async () => {

        const fixture =
          TestBed.createComponent(
            PatientRequestLocationMap
          );

        const component =
          fixture.componentInstance as any;

        /*
         * No hacemos detectChanges():
         * evitamos iniciar Mapbox real.
         */
        component.reverseGeocodingToken =
          'pk.test-token';

        const firstRequest =
          component.resolveApproximateAddress(
            -9.5270,
            -77.5270
          );

        const secondRequest =
          component.resolveApproximateAddress(
            -9.5280,
            -77.5280
          );

        expect(
          reverse
        ).toHaveBeenCalledTimes(
          2
        );

        expect(
          resolvers.length
        ).toBe(
          2
        );

        expect(
          component.reverseGeocodingLoading()
        ).toBe(
          true
        );

        /*
         * La SEGUNDA solicitud termina primero.
         */
        resolvers[1](
          'Direccion nueva - Huaraz'
        );

        await secondRequest;

        expect(
          component.approximateAddress()
        ).toBe(
          'Direccion nueva - Huaraz'
        );

        expect(
          component.reverseGeocodingLoading()
        ).toBe(
          false
        );

        /*
         * La PRIMERA solicitud responde tarde.
         * Debe ser descartada por reverseRequestId.
         */
        resolvers[0](
          'Direccion antigua - NO DEBE GANAR'
        );

        await firstRequest;

        expect(
          component.approximateAddress()
        ).toBe(
          'Direccion nueva - Huaraz'
        );

        expect(
          component.approximateAddress()
        ).not.toBe(
          'Direccion antigua - NO DEBE GANAR'
        );

        expect(
          component.reverseGeocodingLoading()
        ).toBe(
          false
        );

        expect(
          reverse.mock.calls[0][0]
        ).toBe(
          -9.5270
        );

        expect(
          reverse.mock.calls[0][1]
        ).toBe(
          -77.5270
        );

        expect(
          reverse.mock.calls[1][0]
        ).toBe(
          -9.5280
        );

        expect(
          reverse.mock.calls[1][1]
        ).toBe(
          -77.5280
        );
      }
    );
  }
);
