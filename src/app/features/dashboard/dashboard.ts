import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MedicalRequest } from '../../core/models/medical-request.model';
import { AttentionReportService } from '../../core/services/attention-report.service';
import { SpecialistMedicalRequestService } from '../../core/services/specialist-medical-request.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  private readonly requestService = inject(SpecialistMedicalRequestService);
  private readonly attentionReportService = inject(AttentionReportService);

  pendingRequests = signal<MedicalRequest[]>([]);
  assignedRequests = signal<MedicalRequest[]>([]);
  reportsCreated = signal(0);

  loading = signal(false);
  errorMessage = signal('');

  totalRequests = computed(() => this.pendingRequests().length + this.assignedRequests().length);

  activeRequests = computed(() =>
    this.assignedRequests().filter((item) => item.status !== 'FINALIZADO').length
  );

  finishedRequests = computed(() =>
    this.assignedRequests().filter((item) => item.status === 'FINALIZADO').length
  );

  estimatedFinishedAmount = computed(() =>
    this.assignedRequests()
      .filter((item) => item.status === 'FINALIZADO')
      .reduce((total, item) => total + Number(item.estimatedAmount ?? 0), 0)
  );

  latestRequests = computed(() => {
    const all = [...this.pendingRequests(), ...this.assignedRequests()];

    return all
      .sort((a, b) => {
        const dateA = new Date(a.createdAt ?? '').getTime() || 0;
        const dateB = new Date(b.createdAt ?? '').getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  });

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      pending: this.requestService.listPending(),
      assigned: this.requestService.listAssigned()
    }).subscribe({
      next: ({ pending, assigned }) => {
        this.pendingRequests.set(pending);
        this.assignedRequests.set(assigned);
        this.loadReportCounter(assigned);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar el dashboard del especialista.');
      }
    });
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

  private loadReportCounter(assigned: MedicalRequest[]): void {
    const finished = assigned.filter((item) => item.status === 'FINALIZADO');

    if (finished.length === 0) {
      this.reportsCreated.set(0);
      this.loading.set(false);
      return;
    }

    const reportRequests = finished.map((item) =>
      this.attentionReportService.findByMedicalRequestId(item.id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(reportRequests).subscribe({
      next: (reports) => {
        this.reportsCreated.set(reports.filter((item) => !!item).length);
        this.loading.set(false);
      },
      error: () => {
        this.reportsCreated.set(0);
        this.loading.set(false);
      }
    });
  }
}