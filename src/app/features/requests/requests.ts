import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { MedicalRequest } from '../../core/models/medical-request.model';
import { SpecialistMedicalRequestService } from '../../core/services/specialist-medical-request.service';
import { RequestLocationMap } from './request-location-map/request-location-map';

@Component({
  selector: 'app-requests',
  imports: [CommonModule, DatePipe, RouterLink, FormsModule, RequestLocationMap],
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class Requests {
  private readonly requestService = inject(SpecialistMedicalRequestService);

  pendingRequests = signal<MedicalRequest[]>([]);
  assignedRequests = signal<MedicalRequest[]>([]);
  selectedMapRequest = signal<MedicalRequest | null>(null);

  statusFilter = signal('ALL');
  searchTerm = signal('');

  loading = signal(false);
  actionLoadingId = signal<number | null>(null);
  errorMessage = signal('');

  totalRequests = computed(() => this.pendingRequests().length + this.assignedRequests().length);

  finishedRequests = computed(() =>
    this.assignedRequests().filter((item) => item.status === 'FINALIZADO').length
  );

  activeRequests = computed(() =>
    this.assignedRequests().filter((item) => item.status !== 'FINALIZADO').length
  );

  filteredAssignedRequests = computed(() => {
    const status = this.statusFilter();
    const search = this.normalizeText(this.searchTerm());

    return this.assignedRequests().filter((request) => {
      const statusMatches = status === 'ALL' || request.status === status;
      const searchMatches = !search || this.matchesSearch(request, search);

      return statusMatches && searchMatches;
    });
  });

  constructor() {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.requestService.listPending().subscribe({
      next: (pending) => {
        this.pendingRequests.set(pending);

        this.requestService.listAssigned().subscribe({
          next: (assigned) => {
            this.assignedRequests.set(assigned);
            this.ensureSelectedMapRequest(pending, assigned);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.errorMessage.set('No se pudieron cargar las solicitudes asignadas.');
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudieron cargar las solicitudes pendientes.');
      }
    });
  }

  updateStatusFilter(value: string): void {
    this.statusFilter.set(value);
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  clearFilters(): void {
    this.statusFilter.set('ALL');
    this.searchTerm.set('');
  }

  selectMapRequest(request: MedicalRequest): void {
    this.selectedMapRequest.set(request);
  }

  isSelectedMapRequest(request: MedicalRequest): boolean {
    return this.selectedMapRequest()?.id === request.id;
  }

  hasCoordinates(request: MedicalRequest): boolean {
    return request.latitude !== null
      && request.latitude !== undefined
      && request.longitude !== null
      && request.longitude !== undefined;
  }

  accept(request: MedicalRequest): void {
    this.runAction(request.id, () => this.requestService.accept(request.id));
  }

  startRoute(request: MedicalRequest): void {
    this.runAction(request.id, () => this.requestService.startRoute(request.id));
  }

  startAttention(request: MedicalRequest): void {
    this.runAction(request.id, () => this.requestService.startAttention(request.id));
  }

  finish(request: MedicalRequest): void {
    this.runAction(request.id, () => this.requestService.finish(request.id));
  }

  canAccept(request: MedicalRequest): boolean {
    return request.status === 'PENDING';
  }

  canStartRoute(request: MedicalRequest): boolean {
    return request.status === 'ACCEPTED';
  }

  canStartAttention(request: MedicalRequest): boolean {
    return request.status === 'EN_CAMINO';
  }

  canFinish(request: MedicalRequest): boolean {
    return request.status === 'EN_ATENCION';
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

  statusClass(status: string): string {
    return 'status-' + status.toLowerCase().replace('_', '-');
  }

  private runAction(requestId: number, action: () => Observable<MedicalRequest>): void {
    this.actionLoadingId.set(requestId);
    this.errorMessage.set('');

    action()
      .pipe(finalize(() => this.actionLoadingId.set(null)))
      .subscribe({
        next: () => this.loadRequests(),
        error: () => {
          this.errorMessage.set('No se pudo ejecutar la accion solicitada.');
        }
      });
  }

  private ensureSelectedMapRequest(pending: MedicalRequest[], assigned: MedicalRequest[]): void {
    const current = this.selectedMapRequest();
    const visibleRequests = [...pending, ...assigned];

    if (current && visibleRequests.some((item) => item.id === current.id && this.hasCoordinates(item))) {
      return;
    }

    const firstPendingWithLocation = pending.find((item) => this.hasCoordinates(item));
    const firstAssignedWithLocation = assigned.find((item) => this.hasCoordinates(item));

    this.selectedMapRequest.set(firstPendingWithLocation ?? firstAssignedWithLocation ?? null);
  }

  private matchesSearch(request: MedicalRequest, search: string): boolean {
    const values = [
      request.requestCode,
      request.patientFullName,
      request.patientDni,
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