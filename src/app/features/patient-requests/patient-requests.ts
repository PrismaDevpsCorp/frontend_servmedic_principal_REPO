import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MedicalRequest } from '../../core/models/medical-request.model';
import { PatientMedicalRequestService } from '../../core/services/patient-medical-request.service';

@Component({
  selector: 'app-patient-requests',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './patient-requests.html',
  styleUrl: './patient-requests.scss'
})
export class PatientRequests {
  private readonly patientRequestService = inject(PatientMedicalRequestService);

  requests = signal<MedicalRequest[]>([]);
  searchTerm = signal('');
  statusFilter = signal('ALL');
  loading = signal(false);
  errorMessage = signal('');

  filteredRequests = computed(() => {
    const status = this.statusFilter();
    const search = this.normalizeText(this.searchTerm());

    return this.requests().filter((request) => {
      const statusMatches = status === 'ALL' || request.status === status;
      const searchMatches = !search || this.matchesSearch(request, search);

      return statusMatches && searchMatches;
    });
  });

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
        this.errorMessage.set('No se pudieron cargar sus solicitudes.');
      }
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updateStatusFilter(value: string): void {
    this.statusFilter.set(value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('ALL');
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      ACCEPTED: 'Aceptada',
      EN_CAMINO: 'En camino',
      EN_ATENCION: 'En atencion',
      FINALIZADO: 'Finalizada'
    };

    return labels[status] ?? status;
  }

  private matchesSearch(request: MedicalRequest, search: string): boolean {
    const values = [
      request.requestCode,
      request.serviceName,
      request.professionName,
      request.addressText,
      request.addressReference,
      request.patientNotes,
      this.statusLabel(request.status)
    ];

    return values.some((value) => this.normalizeText(value).includes(search));
  }

  private normalizeText(value?: string | number | null): string {
    return (value ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}