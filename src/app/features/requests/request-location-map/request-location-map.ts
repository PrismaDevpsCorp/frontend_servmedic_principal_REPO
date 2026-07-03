import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MedicalRequest } from '../../../core/models/medical-request.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-request-location-map',
  imports: [CommonModule],
  templateUrl: './request-location-map.html',
  styleUrl: './request-location-map.scss'
})
export class RequestLocationMap implements AfterViewInit, OnChanges, OnDestroy {
  @Input() request: MedicalRequest | null = null;

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  private mapbox?: any;
  private map?: any;
  private marker?: any;

  mapReady = false;
  statusMessage = 'Seleccione una solicitud para visualizar su ubicacion.';

  ngAfterViewInit(): void {
    this.renderOrUpdateMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['request']) {
      this.renderOrUpdateMap();
    }
  }

  ngOnDestroy(): void {
    this.marker?.remove();
    this.map?.remove();
  }

  hasCoordinates(): boolean {
    return this.request?.latitude !== null
      && this.request?.latitude !== undefined
      && this.request?.longitude !== null
      && this.request?.longitude !== undefined;
  }

  coordinatesLabel(): string {
    if (!this.hasCoordinates()) {
      return 'Sin coordenadas';
    }

    return `${this.request?.latitude}, ${this.request?.longitude}`;
  }

  externalMapUrl(): string {
    if (!this.hasCoordinates()) {
      return '#';
    }

    return `https://www.google.com/maps/search/?api=1&query=${this.request?.latitude},${this.request?.longitude}`;
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

    if (!this.request) {
      this.statusMessage = 'Seleccione una solicitud para visualizar su ubicacion.';
      this.mapReady = false;
      return;
    }

    if (!this.hasCoordinates()) {
      this.statusMessage = 'La solicitud seleccionada no tiene coordenadas registradas.';
      this.mapReady = false;
      return;
    }

    const token = this.getMapboxToken();

    if (!token) {
      this.statusMessage = 'Mapa pendiente: configure el token Mapbox en localStorage para visualizar el mapa.';
      this.mapReady = false;
      return;
    }

    const longitude = Number(this.request.longitude);
    const latitude = Number(this.request.latitude);

    if (Number.isNaN(longitude) || Number.isNaN(latitude)) {
      this.statusMessage = 'Las coordenadas de la solicitud no son validas.';
      this.mapReady = false;
      return;
    }

    const center: [number, number] = [longitude, latitude];

    const mapbox = await this.loadMapbox();
    mapbox.accessToken = token;

    if (!this.map) {
      this.map = new mapbox.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 14
      });

      this.map.addControl(new mapbox.NavigationControl(), 'top-right');
    } else {
      this.map.flyTo({
        center,
        zoom: 14,
        essential: true
      });
    }

    if (!this.marker) {
      this.marker = new mapbox.Marker()
        .setLngLat(center)
        .addTo(this.map);
    } else {
      this.marker.setLngLat(center);
    }

    this.statusMessage = '';
    this.mapReady = true;

    setTimeout(() => this.map?.resize(), 250);
  }

  private async loadMapbox(): Promise<any> {
    if (this.mapbox) {
      return this.mapbox;
    }

    const module = await import('mapbox-gl');
    this.mapbox = module.default ?? module;

    return this.mapbox;
  }

  private getMapboxToken(): string {
    const localToken = localStorage.getItem('medicdrive_mapbox_token') ?? '';
    return localToken.trim() || environment.mapboxAccessToken.trim();
  }
}