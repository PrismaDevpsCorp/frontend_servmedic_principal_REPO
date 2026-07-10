import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MedicalRequest } from '../../../core/models/medical-request.model';
import { environment } from '../../../../environments/environment';

interface DoctorLocation {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-request-location-map',
  imports: [CommonModule],
  templateUrl: './request-location-map.html',
  styleUrl: './request-location-map.scss'
})
export class RequestLocationMap implements AfterViewInit, OnChanges, OnDestroy {
  @Input() requests: MedicalRequest[] = [];
  @Input() selectedRequest: MedicalRequest | null = null;
  @Output() requestSelected = new EventEmitter<MedicalRequest>();

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  private mapbox?: any;
  private map?: any;
  private requestMarkers: any[] = [];
  private doctorMarker?: any;
  private runtimeToken?: string;
  private doctorLocation?: DoctorLocation;

  mapReady = false;
  statusMessage = 'Cargando mapa operativo de solicitudes pendientes...';
  locationMessage = 'Ubicacion del medico pendiente de obtener.';

  ngAfterViewInit(): void {
    this.renderOrUpdateMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requests'] || changes['selectedRequest']) {
      this.renderOrUpdateMap();
    }
  }

  ngOnDestroy(): void {
    this.clearRequestMarkers();
    this.doctorMarker?.remove();
    this.map?.remove();
  }

  pendingWithCoordinates(): MedicalRequest[] {
    return this.requests.filter((request) => this.hasCoordinates(request));
  }

  hasCoordinates(request?: MedicalRequest | null): boolean {
    return request?.latitude !== null
      && request?.latitude !== undefined
      && request?.longitude !== null
      && request?.longitude !== undefined;
  }

  coordinatesLabel(): string {
    if (!this.hasCoordinates(this.selectedRequest)) {
      return 'Sin coordenadas';
    }

    return `${this.selectedRequest?.latitude}, ${this.selectedRequest?.longitude}`;
  }

  externalMapUrl(): string {
    if (!this.hasCoordinates(this.selectedRequest)) {
      return '#';
    }

    return `https://www.google.com/maps/search/?api=1&query=${this.selectedRequest?.latitude},${this.selectedRequest?.longitude}`;
  }

  selectRequest(request: MedicalRequest): void {
    this.requestSelected.emit(request);
    this.flyToRequest(request);
  }

  private renderOrUpdateMap(): void {
    setTimeout(() => {
      void this.renderMapAsync();
    });
  }

  private async renderMapAsync(): Promise<void> {
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    const locatedRequests = this.pendingWithCoordinates();

    if (locatedRequests.length === 0) {
      this.statusMessage = 'No hay solicitudes pendientes con coordenadas para mostrar en el mapa.';
      this.mapReady = false;
      return;
    }

    const token = await this.getMapboxToken();

    if (!token) {
      this.statusMessage = 'Mapa pendiente: configure el token Mapbox en el archivo runtime del servidor.';
      this.mapReady = false;
      return;
    }

    const mapbox = await this.loadMapbox();
    mapbox.accessToken = token;

    const center = await this.resolveInitialCenter(locatedRequests);

    if (!this.map) {
      this.map = new mapbox.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 12
      });

      this.map.addControl(new mapbox.NavigationControl(), 'top-right');

      this.map.once('load', () => {
        this.drawMarkers(mapbox, locatedRequests);
        this.fitMapToVisiblePoints(locatedRequests);
      });
    } else {
      this.drawMarkers(mapbox, locatedRequests);
      this.fitMapToVisiblePoints(locatedRequests);
    }

    this.statusMessage = '';
    this.mapReady = true;

    setTimeout(() => this.map?.resize(), 250);
  }

  private async resolveInitialCenter(requests: MedicalRequest[]): Promise<[number, number]> {
    const doctorLocation = await this.getDoctorLocation();

    if (doctorLocation) {
      this.locationMessage = 'Mapa referenciado desde la ubicacion actual del medico.';
      return [doctorLocation.longitude, doctorLocation.latitude];
    }

    const selected = this.selectedRequest && this.hasCoordinates(this.selectedRequest)
      ? this.selectedRequest
      : requests[0];

    this.locationMessage = 'No se pudo obtener la ubicacion del medico. Se uso la primera solicitud pendiente como referencia.';

    return [Number(selected.longitude), Number(selected.latitude)];
  }

  private getDoctorLocation(): Promise<DoctorLocation | null> {
    if (this.doctorLocation) {
      return Promise.resolve(this.doctorLocation);
    }

    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.doctorLocation = {
            latitude: Number(position.coords.latitude.toFixed(7)),
            longitude: Number(position.coords.longitude.toFixed(7))
          };

          resolve(this.doctorLocation);
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  private drawMarkers(mapbox: any, requests: MedicalRequest[]): void {
    this.clearRequestMarkers();

    if (this.doctorLocation) {
      this.drawDoctorMarker(mapbox);
    }

    for (const request of requests) {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'service-request-marker';
      markerElement.textContent = 'S';
      markerElement.title = `${request.requestCode} - ${request.addressText}`;

      if (this.selectedRequest?.id === request.id) {
        markerElement.classList.add('selected');
      }

      markerElement.addEventListener('click', () => {
        this.requestSelected.emit(request);
        this.flyToRequest(request);
      });

      const popup = new mapbox.Popup({
        offset: 24,
        closeButton: false
      }).setHTML(`
        <strong>${this.escapeHtml(request.requestCode)}</strong><br>
        ${this.escapeHtml(request.patientFullName)}<br>
        <small>${this.escapeHtml(request.addressText)}</small>
      `);

      const marker = new mapbox.Marker({
        element: markerElement,
        anchor: 'center'
      })
        .setLngLat([Number(request.longitude), Number(request.latitude)])
        .setPopup(popup)
        .addTo(this.map);

      this.requestMarkers.push(marker);
    }
  }

  private drawDoctorMarker(mapbox: any): void {
    if (!this.doctorLocation) {
      return;
    }

    this.doctorMarker?.remove();

    const element = document.createElement('div');
    element.className = 'doctor-location-marker';
    element.textContent = '+';
    element.title = 'Ubicacion actual del medico';

    this.doctorMarker = new mapbox.Marker({
      element,
      anchor: 'center'
    })
      .setLngLat([this.doctorLocation.longitude, this.doctorLocation.latitude])
      .setPopup(new mapbox.Popup({ offset: 24 }).setHTML('<strong>Ubicacion actual del medico</strong>'))
      .addTo(this.map);
  }

  private fitMapToVisiblePoints(requests: MedicalRequest[]): void {
    if (!this.map || requests.length === 0) {
      return;
    }

    const mapbox = this.mapbox;
    const bounds = new mapbox.LngLatBounds();
    let pointCount = 0;

    if (this.doctorLocation) {
      bounds.extend([this.doctorLocation.longitude, this.doctorLocation.latitude]);
      pointCount++;
    }

    for (const request of requests) {
      bounds.extend([Number(request.longitude), Number(request.latitude)]);
      pointCount++;
    }

    if (pointCount <= 1) {
      const first = requests[0];

      this.map.flyTo({
        center: [Number(first.longitude), Number(first.latitude)],
        zoom: 14,
        essential: true
      });

      return;
    }

    this.map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 14,
      duration: 700
    });
  }

  private flyToRequest(request: MedicalRequest): void {
    if (!this.map || !this.hasCoordinates(request)) {
      return;
    }

    this.map.flyTo({
      center: [Number(request.longitude), Number(request.latitude)],
      zoom: 14,
      essential: true
    });
  }

  private clearRequestMarkers(): void {
    for (const marker of this.requestMarkers) {
      marker.remove();
    }

    this.requestMarkers = [];
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
    const localToken = localStorage.getItem('medicdrive_mapbox_token') ?? '';

    if (localToken.trim()) {
      return localToken.trim();
    }

    const environmentToken = environment.mapboxAccessToken?.trim() ?? '';

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
      const response = await fetch(this.runtimeConfigUrl(), {
        cache: 'no-store'
      });

      if (!response.ok) {
        this.runtimeToken = '';
        return '';
      }

      const config = await response.json() as { mapboxAccessToken?: string };
      this.runtimeToken = (config.mapboxAccessToken ?? '').trim();

      return this.runtimeToken;
    } catch {
      this.runtimeToken = '';
      return '';
    }
  }

  private runtimeConfigUrl(): string {
    const baseHref = document.querySelector('base')?.getAttribute('href') ?? '/';
    const normalizedBaseHref = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;

    return new URL(
      'assets/medicdrive-runtime-config.json',
      `${window.location.origin}${normalizedBaseHref}`
    ).toString();
  }

  private escapeHtml(value?: string | null): string {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }
}