import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
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

export interface SpecialistMapLocation {
  latitude: number;
  longitude: number;
}

type DoctorLocation = SpecialistMapLocation;

type DoctorLocationMode = 'REAL' | 'DEMO_HUARAZ' | 'DEMO_LIMA';

@Component({
  selector: 'app-request-location-map',
  imports: [CommonModule],
  templateUrl: './request-location-map.html',
  styleUrl: './request-location-map.scss'
})
export class RequestLocationMap implements AfterViewInit, OnChanges, OnDestroy {
  @Input() requests: MedicalRequest[] = [];
  @Input() selectedRequest: MedicalRequest | null = null;
  @Input() nearestRequestId: number | null = null;

  @Output() requestSelected = new EventEmitter<MedicalRequest>();
  @Output() specialistLocationChanged =
    new EventEmitter<SpecialistMapLocation | null>();

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  private readonly locationModeStorageKey = 'medicdrive_specialist_location_mode';

  private renderRequestId = 0;
  private locationAttemptId = 0;
  private realLocationPromise?: Promise<DoctorLocation | null>;

  private readonly demoLocations: Record<
    Exclude<DoctorLocationMode, 'REAL'>,
    DoctorLocation
  > = {
    DEMO_HUARAZ: {
      latitude: -9.5268,
      longitude: -77.5270
    },
    DEMO_LIMA: {
      latitude: -12.0464,
      longitude: -77.0428
    }
  };

  private mapbox?: any;
  private map?: any;
  private requestMarkers: any[] = [];
  private doctorMarker?: any;
  private runtimeToken?: string;
  private doctorLocation?: DoctorLocation;

  locationMode: DoctorLocationMode = this.readStoredLocationMode();
  locationLoading = false;
  mapReady = false;

  statusMessage = 'Cargando mapa operativo de solicitudes pendientes...';
  locationMessage = 'Ubicacion del especialista pendiente de obtener.';

  ngAfterViewInit(): void {
    this.renderOrUpdateMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['requests']
      || changes['selectedRequest']
      || changes['nearestRequestId']
    ) {
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

  visibleRequestsWithCoordinates(): MedicalRequest[] {
    const visibleRequests = [...this.pendingWithCoordinates()];
    const selected = this.selectedRequest;

    if (
      selected
      && this.hasCoordinates(selected)
      && !visibleRequests.some((request) => request.id === selected.id)
    ) {
      visibleRequests.push(selected);
    }

    return visibleRequests;
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

  locationModeLabel(): string {
    const labels: Record<DoctorLocationMode, string> = {
      REAL: 'Ubicacion real',
      DEMO_HUARAZ: 'Demo Huaraz',
      DEMO_LIMA: 'Demo Lima'
    };

    return labels[this.locationMode];
  }


  isRealLocationBlockedByHttp(): boolean {
    const isLocalhost =
      window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1';

    return this.locationMode === 'REAL'
      && !window.isSecureContext
      && !isLocalhost;
  }

  hasLocationWarning(): boolean {
    const waitingMessages = [
      'Ubicacion del especialista pendiente de obtener.',
      'Actualizando ubicacion del especialista...'
    ];

    return this.locationMode === 'REAL'
      && !this.locationLoading
      && !this.doctorLocation
      && !waitingMessages.includes(this.locationMessage);
  }
  changeLocationMode(value: string): void {
    if (!this.isValidLocationMode(value)) {
      return;
    }

    this.locationAttemptId++;
    this.locationLoading = false;

    this.locationMode = value;
    this.saveLocationMode(value);
    this.resetDoctorLocation();

    if (value === 'DEMO_HUARAZ') {
      this.locationMessage = 'Modo demo Huaraz activo.';
    } else if (value === 'DEMO_LIMA') {
      this.locationMessage = 'Modo demo Lima activo.';
    } else if (this.isRealLocationBlockedByHttp()) {
      this.locationMessage =
        'La ubicacion real no esta disponible por HTTP. Active HTTPS o seleccione Demo Huaraz o Demo Lima.';
    } else {
      this.locationMessage =
        'Solicitando ubicacion real al navegador...';
    }

    this.cdr.detectChanges();
    this.renderOrUpdateMap();
  }
  refreshDoctorLocation(): void {
    this.locationAttemptId++;
    this.locationLoading = false;
    this.resetDoctorLocation();

    if (this.locationMode === 'DEMO_HUARAZ') {
      this.locationMessage = 'Modo demo Huaraz activo.';
    } else if (this.locationMode === 'DEMO_LIMA') {
      this.locationMessage = 'Modo demo Lima activo.';
    } else if (this.isRealLocationBlockedByHttp()) {
      this.locationMessage =
        'La ubicacion real no esta disponible por HTTP. Active HTTPS o seleccione un modo demo.';
    } else {
      this.locationMessage =
        'Solicitando ubicacion real al navegador...';
    }

    this.cdr.detectChanges();
    this.renderOrUpdateMap();
  }
  selectRequest(request: MedicalRequest): void {
    this.requestSelected.emit(request);
    this.flyToRequest(request);
  }

  private renderOrUpdateMap(): void {
    const renderId = ++this.renderRequestId;

    setTimeout(() => {
      void this.renderMapAsync(renderId);
    });
  }

  private async renderMapAsync(renderId: number): Promise<void> {
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    const locatedRequests = this.visibleRequestsWithCoordinates();

    if (locatedRequests.length === 0) {
      this.statusMessage = 'No hay solicitudes con coordenadas para mostrar en el mapa.';
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

    if (renderId !== this.renderRequestId) {
      return;
    }

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

  private async resolveInitialCenter(
    requests: MedicalRequest[]
  ): Promise<[number, number]> {
    const doctorLocation = await this.resolveDoctorLocation();

    if (doctorLocation) {
      return [doctorLocation.longitude, doctorLocation.latitude];
    }

    const selected =
      this.selectedRequest && this.hasCoordinates(this.selectedRequest)
        ? this.selectedRequest
        : requests[0];

    const locationStillWaiting =
      this.locationMessage.includes('pendiente de obtener')
      || this.locationMessage.includes('Actualizando ubicacion')
      || this.locationMessage.includes('Solicitando ubicacion');

    if (locationStillWaiting) {
      this.locationMessage =
        'No se pudo obtener la ubicacion real. Se uso una solicitud como referencia.';
    }

    return [Number(selected.longitude), Number(selected.latitude)];
  }

  private async resolveDoctorLocation(): Promise<DoctorLocation | null> {
    let location: DoctorLocation | null = null;

    if (this.locationMode === 'DEMO_HUARAZ') {
      location = { ...this.demoLocations.DEMO_HUARAZ };
      this.doctorLocation = location;
      this.locationMessage = 'Modo demo Huaraz activo.';
    } else if (this.locationMode === 'DEMO_LIMA') {
      location = { ...this.demoLocations.DEMO_LIMA };
      this.doctorLocation = location;
      this.locationMessage = 'Modo demo Lima activo.';
    } else {
      location = await this.getRealDoctorLocation();
    }

    this.specialistLocationChanged.emit(location);
    return location;
  }
  private getRealDoctorLocation(): Promise<DoctorLocation | null> {
    if (this.doctorLocation) {
      return Promise.resolve(this.doctorLocation);
    }

    if (this.realLocationPromise) {
      return this.realLocationPromise;
    }

    if (!navigator.geolocation) {
      this.locationLoading = false;
      this.locationMessage =
        'El navegador no permite obtener la ubicacion del especialista.';
      this.cdr.detectChanges();

      return Promise.resolve(null);
    }

    const isLocalhost =
      window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1';

    if (!window.isSecureContext && !isLocalhost) {
      this.locationLoading = false;
      this.locationMessage =
        'La ubicacion real no esta disponible por HTTP. Active HTTPS o seleccione Demo Huaraz o Demo Lima.';
      this.cdr.detectChanges();

      return Promise.resolve(null);
    }

    this.locationLoading = true;
    this.locationMessage = 'Solicitando ubicacion real al navegador...';
    this.cdr.detectChanges();

    const attemptId = ++this.locationAttemptId;

    this.realLocationPromise = new Promise<DoctorLocation | null>((resolve) => {
      let completed = false;

      const safetyTimer = window.setTimeout(() => {
        finish(
          null,
          'La ubicacion esta tardando demasiado. Verifique el permiso de Chrome o seleccione un modo demo.'
        );
      }, 12000);

      const finish = (
        location: DoctorLocation | null,
        message: string
      ): void => {
        if (completed) {
          return;
        }

        completed = true;
        window.clearTimeout(safetyTimer);

        if (
          attemptId !== this.locationAttemptId
          || this.locationMode !== 'REAL'
        ) {
          resolve(null);
          return;
        }

        this.locationLoading = false;
        this.locationMessage = message;
        this.realLocationPromise = undefined;

        if (location) {
          this.doctorLocation = location;
        }

        this.cdr.detectChanges();
        resolve(location);
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          finish(
            {
              latitude: Number(position.coords.latitude.toFixed(7)),
              longitude: Number(position.coords.longitude.toFixed(7))
            },
            'Mapa referenciado desde la ubicacion real del especialista.'
          );
        },
        (error) => {
          const messages: Record<number, string> = {
            1: 'Chrome denego el permiso de ubicacion. Habilitelo o seleccione un modo demo.',
            2: 'La ubicacion real no esta disponible en este momento.',
            3: 'Se agoto el tiempo para obtener la ubicacion real.'
          };

          finish(
            null,
            messages[error.code]
              ?? 'No se pudo obtener la ubicacion real del especialista.'
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });

    return this.realLocationPromise;
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

      if (this.nearestRequestId === request.id) {
        markerElement.classList.add('nearest');
      }

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
    element.title = this.locationModeLabel();
    element.style.zIndex = '20';

    this.doctorMarker = new mapbox.Marker({
      element,
      anchor: 'center'
    })
      .setLngLat([
        this.doctorLocation.longitude,
        this.doctorLocation.latitude
      ])
      .setPopup(
        new mapbox.Popup({ offset: 24 }).setHTML(
          `<strong>${this.escapeHtml(this.locationModeLabel())}</strong>`
        )
      )
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
      bounds.extend([
        this.doctorLocation.longitude,
        this.doctorLocation.latitude
      ]);

      pointCount++;
    }

    for (const request of requests) {
      bounds.extend([
        Number(request.longitude),
        Number(request.latitude)
      ]);

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

  private resetDoctorLocation(): void {
    this.doctorLocation = undefined;
    this.realLocationPromise = undefined;
    this.doctorMarker?.remove();
    this.doctorMarker = undefined;
    this.specialistLocationChanged.emit(null);
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

      const config = await response.json() as {
        mapboxAccessToken?: string;
      };

      this.runtimeToken = (config.mapboxAccessToken ?? '').trim();

      return this.runtimeToken;
    } catch {
      this.runtimeToken = '';
      return '';
    }
  }

  private runtimeConfigUrl(): string {
    const baseHref =
      document.querySelector('base')?.getAttribute('href') ?? '/';

    const normalizedBaseHref = baseHref.endsWith('/')
      ? baseHref
      : `${baseHref}/`;

    return new URL(
      'assets/medicdrive-runtime-config.json',
      `${window.location.origin}${normalizedBaseHref}`
    ).toString();
  }

  private readStoredLocationMode(): DoctorLocationMode {
    try {
      const stored = localStorage.getItem(this.locationModeStorageKey);

      return this.isValidLocationMode(stored) ? stored : 'REAL';
    } catch {
      return 'REAL';
    }
  }

  private saveLocationMode(mode: DoctorLocationMode): void {
    try {
      localStorage.setItem(this.locationModeStorageKey, mode);
    } catch {
      // La aplicacion puede continuar aunque el navegador bloquee localStorage.
    }
  }

  private isValidLocationMode(
    value?: string | null
  ): value is DoctorLocationMode {
    return value === 'REAL'
      || value === 'DEMO_HUARAZ'
      || value === 'DEMO_LIMA';
  }

  private escapeHtml(value?: string | null): string {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }
}