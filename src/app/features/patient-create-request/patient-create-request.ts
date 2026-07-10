import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MedicalServiceOption } from '../../core/models/medical-service.model';
import { CatalogService } from '../../core/services/catalog.service';
import { PatientMedicalRequestService } from '../../core/services/patient-medical-request.service';

@Component({
  selector: 'app-patient-create-request',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-create-request.html',
  styleUrl: './patient-create-request.scss'
})
export class PatientCreateRequest {
  private readonly catalogService = inject(CatalogService);
  private readonly patientRequestService = inject(PatientMedicalRequestService);
  private readonly router = inject(Router);

  services = signal<MedicalServiceOption[]>([]);
  loadingCatalog = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  serviceCode = '';
  addressText = '';
  addressReference = '';
  latitude: number | null = -12.0464;
  longitude: number | null = -77.0428;
  prescriptionImageUrl = '';
  patientNotes = '';

  selectedService = computed(() => {
    return this.services().find((item) => item.code === this.serviceCode) ?? null;
  });

  constructor() {
    this.loadServices();
  }

  loadServices(): void {
    this.loadingCatalog.set(true);
    this.errorMessage.set('');

    this.catalogService.listServices().subscribe({
      next: (items) => {
        this.services.set(items);
        this.loadingCatalog.set(false);

        if (!this.serviceCode && items.length > 0) {
          this.serviceCode = items[0].code;
        }
      },
      error: () => {
        this.services.set([]);
        this.loadingCatalog.set(false);
        this.errorMessage.set('No se pudo cargar el catalogo de servicios medicos.');
      }
    });
  }

  useBrowserLocation(): void {
    this.errorMessage.set('');

    if (!navigator.geolocation) {
      this.errorMessage.set('El navegador no permite obtener ubicacion.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = Number(position.coords.latitude.toFixed(7));
        this.longitude = Number(position.coords.longitude.toFixed(7));
      },
      () => {
        this.errorMessage.set('No se pudo obtener la ubicacion. Puede ingresar las coordenadas manualmente.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  createRequest(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.serviceCode) {
      this.errorMessage.set('Seleccione un servicio medico.');
      return;
    }

    if (!this.addressText.trim()) {
      this.errorMessage.set('Ingrese la direccion de atencion.');
      return;
    }

    if (this.latitude === null || this.longitude === null) {
      this.errorMessage.set('Ingrese latitud y longitud.');
      return;
    }

    if (Number.isNaN(Number(this.latitude)) || Number.isNaN(Number(this.longitude))) {
      this.errorMessage.set('Las coordenadas no son validas.');
      return;
    }

    this.saving.set(true);

    this.patientRequestService.create({
      serviceCode: this.serviceCode,
      addressText: this.addressText.trim(),
      addressReference: this.cleanNullable(this.addressReference),
      latitude: Number(this.latitude),
      longitude: Number(this.longitude),
      prescriptionImageUrl: this.cleanNullable(this.prescriptionImageUrl),
      patientNotes: this.cleanNullable(this.patientNotes)
    }).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.successMessage.set('Solicitud creada correctamente: ' + created.requestCode);

        setTimeout(() => {
          this.router.navigate(['/patient-requests']);
        }, 900);
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message ?? 'No se pudo crear la solicitud medica.');
      }
    });
  }

  private cleanNullable(value: string): string | null {
    const clean = value.trim();
    return clean ? clean : null;
  }
}