
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  signal
} from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface PatientMapLocation {
  latitude: number;
  longitude: number;
  addressText?: string;
}

@Component({
  selector: 'app-patient-request-location-map',
  templateUrl: './patient-request-location-map.html',
  styleUrl: './patient-request-location-map.scss'
})
export class PatientRequestLocationMap
  implements AfterViewInit, OnDestroy {

  @ViewChild('mapContainer')
  mapContainer?: ElementRef<HTMLDivElement>;

  @Output()
  locationChange =
    new EventEmitter<PatientMapLocation>();

  statusMessage = signal('Preparando mapa...');
  helperMessage = signal(
    'Obtendremos su ubicacion actual. Tambien puede hacer clic en el mapa o mover el marcador.'
  );
  locating = signal(false);
  resolvingAddress = signal(false);

  private mapbox: any;
  private map: any;
  private marker: any;
  private runtimeToken: string | undefined;
  private accessToken = '';

  private readonly fallbackCenter: [number, number] = [
    -77.537964,
    -9.470093
  ];

  ngAfterViewInit(): void {
    void this.initializeMap();
  }

  ngOnDestroy(): void {
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
        'El navegador no permite obtener la ubicacion. Seleccione manualmente un punto en el mapa.'
      );
      return;
    }

    this.locating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);

        void this.selectLocation(
          position.coords.longitude,
          position.coords.latitude,
          true
        );
      },
      () => {
        this.locating.set(false);

        this.helperMessage.set(
          'No se pudo obtener su ubicacion actual. Seleccione manualmente el lugar de atencion en el mapa.'
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
      const token = await this.getMapboxToken();

      if (!token) {
        this.statusMessage.set(
          'Mapa pendiente: configure el token Mapbox en el archivo runtime del servidor.'
        );
        return;
      }

      const mapbox = await this.loadMapbox();

      mapbox.accessToken = token;
      this.accessToken = token;

      if (!this.mapContainer) {
        this.statusMessage.set(
          'No se pudo inicializar el contenedor del mapa.'
        );
        return;
      }

      this.map = new mapbox.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: this.fallbackCenter,
        zoom: 13
      });

      this.map.addControl(
        new mapbox.NavigationControl(),
        'top-right'
      );

      this.map.on(
        'click',
        (event: any) => {
          void this.selectLocation(
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
        'No se pudo cargar el mapa. Verifique la configuracion Mapbox.'
      );
    }
  }

  private async selectLocation(
    longitude: number,
    latitude: number,
    fromBrowser: boolean
  ): Promise<void> {
    if (
      !Number.isFinite(longitude)
      || !Number.isFinite(latitude)
    ) {
      return;
    }

    const normalizedLongitude =
      Number(longitude.toFixed(7));

    const normalizedLatitude =
      Number(latitude.toFixed(7));

    if (this.map && this.mapbox) {
      const coordinates: [number, number] = [
        normalizedLongitude,
        normalizedLatitude
      ];

      if (!this.marker) {
        this.marker = new this.mapbox.Marker({
          draggable: true
        })
          .setLngLat(coordinates)
          .addTo(this.map);

        this.marker.on(
          'dragend',
          () => {
            const position =
              this.marker.getLngLat();

            void this.selectLocation(
              Number(position.lng),
              Number(position.lat),
              false
            );
          }
        );
      }
      else {
        this.marker.setLngLat(coordinates);
      }

      this.map.flyTo({
        center: coordinates,
        zoom: 16,
        essential: true
      });
    }

    const addressText =
      await this.reverseGeocode(
        normalizedLongitude,
        normalizedLatitude
      );

    this.locationChange.emit({
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
      addressText
    });

    this.helperMessage.set(
      fromBrowser
        ? 'Ubicacion actual obtenida. Valide la direccion o mueva el marcador si la atencion sera en otro lugar.'
        : 'Lugar de atencion actualizado. Valide o corrija la direccion antes de crear la solicitud.'
    );
  }

  private async reverseGeocode(
    longitude: number,
    latitude: number
  ): Promise<string | undefined> {
    if (!this.accessToken) {
      return undefined;
    }

    this.resolvingAddress.set(true);

    try {
      const url = new URL(
        'https://api.mapbox.com/search/geocode/v6/reverse'
      );

      url.searchParams.set(
        'longitude',
        String(longitude)
      );

      url.searchParams.set(
        'latitude',
        String(latitude)
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
        'access_token',
        this.accessToken
      );

      const response = await fetch(
        url.toString(),
        {
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        return undefined;
      }

      const payload = await response.json() as {
        features?: Array<{
          properties?: {
            full_address?: string;
            name_preferred?: string;
            name?: string;
            place_formatted?: string;
          };
        }>;
      };

      const properties =
        payload.features?.[0]?.properties;

      const name =
        properties?.name_preferred
        ?? properties?.name
        ?? '';

      const place =
        properties?.place_formatted
        ?? '';

      const resolved =
        properties?.full_address
        ?? (
          name && place
            ? name + ', ' + place
            : name
        );

      return resolved?.trim() || undefined;
    }
    catch {
      return undefined;
    }
    finally {
      this.resolvingAddress.set(false);
    }
  }

  private async loadMapbox(): Promise<any> {
    if (this.mapbox) {
      return this.mapbox;
    }

    const module = await import('mapbox-gl');
    this.mapbox = module.default ?? module;

    return this.mapbox;
  }

  private async getMapboxToken(): Promise<string> {
    const localToken =
      localStorage.getItem(
        'medicdrive_mapbox_token'
      ) ?? '';

    if (localToken.trim()) {
      return localToken.trim();
    }

    const environmentToken =
      environment.mapboxAccessToken?.trim()
      ?? '';

    if (environmentToken) {
      return environmentToken;
    }

    return this.getRuntimeMapboxToken();
  }

  private async getRuntimeMapboxToken(): Promise<string> {
    if (this.runtimeToken !== undefined) {
      return this.runtimeToken;
    }

    try {
      const response = await fetch(
        this.runtimeConfigUrl(),
        {
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        this.runtimeToken = '';
        return '';
      }

      const config =
        await response.json() as {
          mapboxAccessToken?: string;
        };

      this.runtimeToken =
        (config.mapboxAccessToken ?? '').trim();

      return this.runtimeToken;
    }
    catch {
      this.runtimeToken = '';
      return '';
    }
  }

  private runtimeConfigUrl(): string {
    const baseHref =
      document
        .querySelector('base')
        ?.getAttribute('href')
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
