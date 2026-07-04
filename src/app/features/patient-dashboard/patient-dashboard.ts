import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MedicalRequest } from '../../core/models/medical-request.model';
import { PatientMedicalRequestService } from '../../core/services/patient-medical-request.service';

@Component({
  selector: 'app-patient-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-dashboard.html',
  styleUrl: './patient-dashboard.scss'
})
export class PatientDashboard {
  private readonly patientRequestService = inject(PatientMedicalRequestService);

  requests = signal<MedicalRequest[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  total = computed(() => this.requests().length);
  pending = computed(() => this.requests().filter((item) => item.status === 'PENDING').length);
  active = computed(() => this.requests().filter((item) => item.status !== 'PENDING' && item.status !== 'FINALIZADO').length);
  finished = computed(() => this.requests().filter((item) => item.status === 'FINALIZADO').length);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.patientRequestService.list().subscribe({
      next: (items) => {
        this.requests.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.requests.set([]);
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar el resumen del paciente.');
      }
    });
  }
}