import { Injectable } from '@angular/core';

interface MapboxReverseFeature {
  place_name?: string;

  properties?: {
    full_address?: string;
    name?: string;
    name_preferred?: string;
    place_formatted?: string;
  };
}

interface MapboxReverseResponse {
  features?: MapboxReverseFeature[];
}

@Injectable({
  providedIn: 'root'
})
export class MapboxTemporaryReverseGeocodingService {

  private readonly endpoint =
    'https://api.mapbox.com/search/geocode/v6/reverse';

  async reverse(
    latitude: number,
    longitude: number,
    accessToken: string
  ): Promise<string | null> {

    if (
      !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || !accessToken.trim()
    ) {

      return null;
    }

    const url =
      new URL(this.endpoint);

    url.searchParams.set(
      'longitude',
      longitude.toFixed(7)
    );

    url.searchParams.set(
      'latitude',
      latitude.toFixed(7)
    );

    url.searchParams.set(
      'access_token',
      accessToken.trim()
    );

    url.searchParams.set(
      'language',
      'es'
    );

    url.searchParams.set(
      'limit',
      '1'
    );

    url.searchParams.set(
      'permanent',
      'false'
    );

    try {

      const response =
        await fetch(
          url.toString(),
          {
            method: 'GET',

            headers: {
              Accept: 'application/json'
            },

            cache: 'no-store'
          }
        );

      if (!response.ok) {

        return null;
      }

      const payload: MapboxReverseResponse =
        await response.json();

      const feature =
        payload.features?.[0];

      if (!feature) {

        return null;
      }

      const properties =
        feature.properties ?? {};

      const fullAddress =
        this.clean(
          properties.full_address
        );

      if (fullAddress) {

        return fullAddress;
      }

      const name =
        this.clean(
          properties.name_preferred
        )
        ?? this.clean(
          properties.name
        );

      const place =
        this.clean(
          properties.place_formatted
        );

      if (name && place) {

        return name + ', ' + place;
      }

      return (
        name
        ?? place
        ?? this.clean(
          feature.place_name
        )
      );
    }
    catch {

      return null;
    }
  }

  private clean(
    value?: string | null
  ): string | null {

    const cleaned =
      (value ?? '').trim();

    return cleaned
      ? cleaned
      : null;
  }
}
