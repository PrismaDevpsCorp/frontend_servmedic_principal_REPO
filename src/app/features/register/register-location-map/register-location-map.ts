import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal
} from '@angular/core';

import {
  MapboxTemporaryReverseGeocodingService
} from '../../../core/services/mapbox-temporary-reverse-geocoding.service';

import {
  environment
} from '../../../../environments/environment';

export interface RegisterMapLocation {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-register-location-map',
  standalone: true,
  templateUrl: './register-location-map.html',
  styleUrl: './register-location-map.scss'
})
export class RegisterLocationMap
  implements AfterViewInit, OnDestroy {

  private readonly reverseGeocodingService =
    inject(
      MapboxTemporaryReverseGeocodingService
    );

  @ViewChild('mapContainer')
  mapContainer?: ElementRef<HTMLDivElement>;

  @Output()
  locationChange =
    new EventEmitter<RegisterMapLocation>();

  locating =
    signal(false);

  statusMessage =
    signal('Preparando mapa...');

  helperMessage =
    signal(
      'Puede usar su ubicación actual, hacer clic sobre el mapa o mover el marcador.'
    );

  approximateAddress =
    signal('');

  reverseGeocodingLoading =
    signal(false);

  private mapbox: any;
  private map: any;
  private marker: any;

  private runtimeToken:
    string | undefined;

  private reverseGeocodingToken = '';

  private reverseRequestId = 0;

  private readonly fallbackCenter:
    [number, number] = [
      -77.5278,
      -9.5278
    ];

  ngAfterViewInit(): void {
    void this.initializeMap();
  }

  ngOnDestroy(): void {

    this.reverseRequestId++;

    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  useCurrentLocation(): void {

    if (!navigator.geolocation) {

      this.helperMessage.set(
        'El navegador no permite obtener su ubicación. Seleccione manualmente su ubicación en el mapa.'
      );

      return;
    }

    this.locating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {

        this.locating.set(false);

        this.selectLocation(
          Number(position.coords.longitude),
          Number(position.coords.latitude),
          true
        );
      },
      () => {

        this.locating.set(false);

        this.helperMessage.set(
          'No fue posible obtener su ubicación actual. Puede seleccionar manualmente el punto correcto en el mapa.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }

  private async initializeMap(): Promise<void> {

    try {

      const token =
        await this.getMapboxToken();

      if (!token) {

        this.statusMessage.set(
          'Mapa pendiente: no se encontró el token Mapbox configurado.'
        );

        return;
      }

      const mapbox =
        await this.loadMapbox();

      mapbox.accessToken =
        token;

      this.reverseGeocodingToken =
        token;

      if (!this.mapContainer) {

        this.statusMessage.set(
          'No se pudo inicializar el contenedor del mapa.'
        );

        return;
      }

      this.map =
        new mapbox.Map({
          container:
            this.mapContainer.nativeElement,

          style:
            'mapbox://styles/mapbox/streets-v12',

          center:
            this.fallbackCenter,

          zoom:
            13
        });

      this.map.addControl(
        new mapbox.NavigationControl(),
        'top-right'
      );

      this.map.on(
        'click',
        (event: any) => {

          this.selectLocation(
            Number(event.lngLat.lng),
            Number(event.lngLat.lat),
            false
          );
        }
      );

      this.map.on(
        'load',
        () => {

          this.statusMessage.set('');

          this.map.resize();

          this.useCurrentLocation();
        }
      );
    }
    catch {

      this.statusMessage.set(
        'No se pudo cargar el mapa. Verifique la configuración Mapbox.'
      );
    }
  }

  private selectLocation(
    longitude: number,
    latitude: number,
    fromBrowser: boolean
  ): void {

    if (
      !Number.isFinite(longitude)
      || !Number.isFinite(latitude)
    ) {
      return;
    }

    const normalizedLongitude =
      Number(
        longitude.toFixed(7)
      );

    const normalizedLatitude =
      Number(
        latitude.toFixed(7)
      );

    if (
      normalizedLatitude < -90
      || normalizedLatitude > 90
      || normalizedLongitude < -180
      || normalizedLongitude > 180
    ) {
      return;
    }

    const coordinates:
      [number, number] = [
        normalizedLongitude,
        normalizedLatitude
      ];

    if (
      this.map
      && this.mapbox
    ) {

      if (!this.marker) {

        this.marker =
          new this.mapbox.Marker({
            draggable: true
          })
          .setLngLat(
            coordinates
          )
          .addTo(
            this.map
          );

        this.marker.on(
          'dragend',
          () => {

            const position =
              this.marker.getLngLat();

            this.selectLocation(
              Number(position.lng),
              Number(position.lat),
              false
            );
          }
        );
      }
      else {

        this.marker.setLngLat(
          coordinates
        );
      }

      this.map.flyTo({
        center:
          coordinates,

        zoom:
          16,

        essential:
          true
      });
    }

    this.locationChange.emit({
      latitude:
        normalizedLatitude,

      longitude:
        normalizedLongitude
    });

    void this.resolveApproximateAddress(
      normalizedLatitude,
      normalizedLongitude
    );

    this.helperMessage.set(
      fromBrowser
        ? 'Ubicación actual obtenida. Mueva el marcador si su domicilio corresponde a otro punto.'
        : 'Ubicación actualizada. Verifique visualmente que el punto seleccionado corresponda a su domicilio.'
    );
  }

  private async resolveApproximateAddress(
    latitude: number,
    longitude: number
  ): Promise<void> {

    const requestId =
      ++this.reverseRequestId;

    this.reverseGeocodingLoading.set(
      true
    );

    this.approximateAddress.set(
      ''
    );

    try {

      const address =
        await this.reverseGeocodingService.reverse(
          latitude,
          longitude,
          this.reverseGeocodingToken
        );

      if (
        requestId !==
        this.reverseRequestId
      ) {
        return;
      }

      this.approximateAddress.set(
        address
        ?? 'No se encontró una dirección aproximada para este punto.'
      );
    }
    finally {

      if (
        requestId ===
        this.reverseRequestId
      ) {

        this.reverseGeocodingLoading.set(
          false
        );
      }
    }
  }

  private async loadMapbox():
    Promise<any> {

    if (this.mapbox) {
      return this.mapbox;
    }

    const module =
      await import(
        'mapbox-gl'
      );

    this.mapbox =
      module.default
      ?? module;

    return this.mapbox;
  }

  private async getMapboxToken():
    Promise<string> {

    const localToken =
      localStorage.getItem(
        'medicdrive_mapbox_token'
      )
      ?? '';

    if (localToken.trim()) {
      return localToken.trim();
    }

    const environmentToken =
      environment
        .mapboxAccessToken
        ?.trim()
      ?? '';

    if (environmentToken) {
      return environmentToken;
    }

    return this.getRuntimeMapboxToken();
  }

  private async getRuntimeMapboxToken():
    Promise<string> {

    if (
      this.runtimeToken !==
      undefined
    ) {
      return this.runtimeToken;
    }

    try {

      const response =
        await fetch(
          this.runtimeConfigUrl(),
          {
            cache:
              'no-store'
          }
        );

      if (!response.ok) {

        this.runtimeToken =
          '';

        return '';
      }

      const config =
        await response.json() as {
          mapboxAccessToken?: string;
        };

      this.runtimeToken =
        (
          config.mapboxAccessToken
          ?? ''
        ).trim();

      return this.runtimeToken;
    }
    catch {

      this.runtimeToken =
        '';

      return '';
    }
  }

  private runtimeConfigUrl():
    string {

    const baseHref =
      document
        .querySelector(
          'base'
        )
        ?.getAttribute(
          'href'
        )
      ?? '/';

    const normalizedBaseHref =
      baseHref.endsWith('/')
        ? baseHref
        : baseHref + '/';

    return new URL(
      'assets/medicdrive-runtime-config.json',
      window.location.origin
        + normalizedBaseHref
    ).toString();
  }
}