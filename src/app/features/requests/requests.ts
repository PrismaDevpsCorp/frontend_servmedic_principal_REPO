import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MedicalRequest } from '../../core/models/medical-request.model';
import { SpecialistMedicalRequestService } from '../../core/services/specialist-medical-request.service';

@Component({
  selector: 'app-requests',
  imports: [CommonModule, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class Requests {
  private readonly requestService = inject(SpecialistMedicalRequestService);

  pendingRequests = signal<MedicalRequest[]>([]);
  assignedRequests = signal<MedicalRequest[]>([]);
  loading = signal(false);
  actionLoadingId = signal<number | null>(null);
  errorMessage = signal('');

  totalRequests = computed(() => this.pendingRequests().length + this.assignedRequests().length);
  finishedRequests = computed(() => this.assignedRequests().filter((item) => item.status === 'FINALIZADO').length);
  activeRequests = computed(() =>
    this.assignedRequests().filter((item) => item.status !== 'FINALIZADO').length
  );

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

  private runAction(requestId: number, action: () => ReturnType<SpecialistMedicalRequestService['accept']>): void {
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
}