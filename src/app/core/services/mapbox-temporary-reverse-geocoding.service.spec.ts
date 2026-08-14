import { vi } from 'vitest';

import {
  MapboxTemporaryReverseGeocodingService
} from './mapbox-temporary-reverse-geocoding.service';

describe(
  'MapboxTemporaryReverseGeocodingService - H3',
  () => {

    afterEach(
      () => {

        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      }
    );

    it(
      'usa Mapbox reverse v6 en modo temporal y sin cache',
      async () => {

        const fetchMock =
          vi.fn()
          .mockResolvedValue({
            ok: true,

            json: async () => ({
              features: [
                {
                  properties: {
                    full_address:
                      'Av. Luzuriaga 123, Huaraz, Ancash'
                  }
                }
              ]
            })
          });

        vi.stubGlobal(
          'fetch',
          fetchMock
        );

        const service =
          new MapboxTemporaryReverseGeocodingService();

        const result =
          await service.reverse(
            -9.5278,
            -77.5278,
            'pk.test-token'
          );

        expect(result).toBe(
          'Av. Luzuriaga 123, Huaraz, Ancash'
        );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );

        const firstCall =
          fetchMock.mock.calls[0];

        const requestUrl =
          new URL(
            String(
              firstCall[0]
            )
          );

        const requestInit =
          firstCall[1] as RequestInit;

        expect(
          requestUrl.origin
          + requestUrl.pathname
        ).toBe(
          'https://api.mapbox.com/search/geocode/v6/reverse'
        );

        expect(
          requestUrl.searchParams.get(
            'longitude'
          )
        ).toBe(
          '-77.5278000'
        );

        expect(
          requestUrl.searchParams.get(
            'latitude'
          )
        ).toBe(
          '-9.5278000'
        );

        expect(
          requestUrl.searchParams.get(
            'language'
          )
        ).toBe(
          'es'
        );

        expect(
          requestUrl.searchParams.get(
            'limit'
          )
        ).toBe(
          '1'
        );

        expect(
          requestUrl.searchParams.get(
            'permanent'
          )
        ).toBe(
          'false'
        );

        expect(
          requestInit.method
        ).toBe(
          'GET'
        );

        expect(
          requestInit.cache
        ).toBe(
          'no-store'
        );
      }
    );

    it(
      'construye fallback con nombre y place_formatted',
      async () => {

        const fetchMock =
          vi.fn()
          .mockResolvedValue({
            ok: true,

            json: async () => ({
              features: [
                {
                  properties: {
                    name:
                      'Plaza de Armas',

                    place_formatted:
                      'Huaraz, Ancash, Peru'
                  }
                }
              ]
            })
          });

        vi.stubGlobal(
          'fetch',
          fetchMock
        );

        const service =
          new MapboxTemporaryReverseGeocodingService();

        const result =
          await service.reverse(
            -9.529,
            -77.528,
            'pk.test-token'
          );

        expect(result).toBe(
          'Plaza de Armas, Huaraz, Ancash, Peru'
        );
      }
    );

    it(
      'devuelve null ante HTTP 429 sin lanzar excepcion',
      async () => {

        const fetchMock =
          vi.fn()
          .mockResolvedValue({
            ok: false,
            status: 429,

            json: async () => ({})
          });

        vi.stubGlobal(
          'fetch',
          fetchMock
        );

        const service =
          new MapboxTemporaryReverseGeocodingService();

        await expect(
          service.reverse(
            -9.52,
            -77.52,
            'pk.test-token'
          )
        ).resolves.toBeNull();
      }
    );

    it(
      'devuelve null ante error de red sin bloquear',
      async () => {

        const fetchMock =
          vi.fn()
          .mockRejectedValue(
            new Error(
              'network unavailable'
            )
          );

        vi.stubGlobal(
          'fetch',
          fetchMock
        );

        const service =
          new MapboxTemporaryReverseGeocodingService();

        await expect(
          service.reverse(
            -9.52,
            -77.52,
            'pk.test-token'
          )
        ).resolves.toBeNull();
      }
    );

    it(
      'no realiza fetch con token o coordenadas invalidas',
      async () => {

        const fetchMock =
          vi.fn();

        vi.stubGlobal(
          'fetch',
          fetchMock
        );

        const service =
          new MapboxTemporaryReverseGeocodingService();

        await expect(
          service.reverse(
            Number.NaN,
            -77.52,
            'pk.test-token'
          )
        ).resolves.toBeNull();

        await expect(
          service.reverse(
            -9.52,
            -77.52,
            '   '
          )
        ).resolves.toBeNull();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);
