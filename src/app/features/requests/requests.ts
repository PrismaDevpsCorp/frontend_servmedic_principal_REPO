import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, finalize, forkJoin, map, of } from 'rxjs';
import { MedicalRequest } from '../../core/models/medical-request.model';
import { AttentionReportService } from '../../core/services/attention-report.service';
import { SpecialistMedicalRequestService } from '../../core/services/specialist-medical-request.service';
import { RequestLocationMap, SpecialistMapLocation } from './request-location-map/request-location-map';

type ReportCompletionStatus = 'LOADING' | 'PENDING' | 'COMPLETE' | 'ERROR';

@Component({
  selector: 'app-requests',
  imports: [CommonModule, DatePipe, RouterLink, FormsModule, RequestLocationMap],
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class Requests {
  private readonly requestService = inject(SpecialistMedicalRequestService);
  private readonly attentionReportService = inject(AttentionReportService);

  pendingRequests = signal<MedicalRequest[]>([]);
  assignedRequests = signal<MedicalRequest[]>([]);
  selectedMapRequest = signal<MedicalRequest | null>(null);
  specialistLocation = signal<SpecialistMapLocation | null>(null);

  statusFilter = signal('ALL');
  searchTerm = signal('');

  loading = signal(false);
  actionLoadingId = signal<number | null>(null);
  errorMessage = signal('');
  reportStatusByRequestId = signal<Record<number, ReportCompletionStatus>>({});

  totalRequests = computed(() => this.pendingRequests().length + this.assignedRequests().length);

  finishedRequests = computed(() =>
    this.assignedRequests().filter((item) => item.status === 'FINALIZADO').length
  );

  activeRequests = computed(() =>
    this.assignedRequests().filter((item) => item.status !== 'FINALIZADO').length
  );


  sortedPendingRequests = computed(() => {
    const location = this.specialistLocation();
    const requests = [...this.pendingRequests()];

    if (!location) {
      return requests;
    }

    return requests.sort((first, second) => {
      const firstDistance = this.calculateDistanceKm(first, location);
      const secondDistance = this.calculateDistanceKm(second, location);

      if (firstDistance === null && secondDistance === null) {
        return 0;
      }

      if (firstDistance === null) {
        return 1;
      }

      if (secondDistance === null) {
        return -1;
      }

      return firstDistance - secondDistance;
    });
  });

  nearestRequestId = computed<number | null>(() => {
    if (!this.specialistLocation()) {
      return null;
    }

    return this.sortedPendingRequests()
      .find((request) => this.hasCoordinates(request))
      ?.id ?? null;
  });
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
            this.loadAttentionReportStatuses(assigned);
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


  updateSpecialistLocation(
    location: SpecialistMapLocation | null
  ): void {
    this.specialistLocation.set(location);

    if (this.selectedMapRequest() || !location) {
      return;
    }

    const nearestId = this.nearestRequestId();
    const nearestRequest = this.pendingRequests()
      .find((request) => request.id === nearestId);

    if (nearestRequest) {
      this.selectedMapRequest.set(nearestRequest);
    }
  }

  calculatedDistanceKm(request: MedicalRequest): number | null {
    const location = this.specialistLocation();

    if (!location) {
      return null;
    }

    return this.calculateDistanceKm(request, location);
  }

  distanceLabel(request: MedicalRequest): string {
    const distance = this.calculatedDistanceKm(request);

    if (distance === null) {
      return 'Sin calcular';
    }

    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }

    return `${distance.toFixed(1)} km`;
  }

  isNearestRequest(request: MedicalRequest): boolean {
    return this.nearestRequestId() === request.id;
  }
  selectMapRequest(request: MedicalRequest): void {
    this.selectedMapRequest.set(request);
  }

  isSelectedMapRequest(request: MedicalRequest): boolean {
    return this.selectedMapRequest()?.id === request.id;
  }


  isReportPending(requestId: number): boolean {
    return this.reportStatusByRequestId()[requestId] === 'PENDING';
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


  private loadAttentionReportStatuses(requests: MedicalRequest[]): void {
    const finalized = requests.filter((request) => request.status === 'FINALIZADO');

    const loadingStatuses = finalized.reduce<Record<number, ReportCompletionStatus>>(
      (statuses, request) => {
        statuses[request.id] = 'LOADING';
        return statuses;
      },
      {}
    );

    this.reportStatusByRequestId.set(loadingStatuses);

    if (finalized.length === 0) {
      return;
    }

    const checks = finalized.map((request) =>
      this.attentionReportService.findByMedicalRequestId(request.id).pipe(
        map((report) => {
          const isComplete =
            !!report
            && !!report.clinicalObservations?.trim()
            && !!report.recommendations?.trim();

          return {
            requestId: request.id,
            status: (isComplete ? 'COMPLETE' : 'PENDING') as ReportCompletionStatus
          };
        }),
        catchError(() =>
          of({
            requestId: request.id,
            status: 'ERROR' as ReportCompletionStatus
          })
        )
      )
    );

    forkJoin(checks).subscribe((results) => {
      const statuses: Record<number, ReportCompletionStatus> = {};

      for (const result of results) {
        statuses[result.requestId] = result.status;
      }

      this.reportStatusByRequestId.set(statuses);
    });
  }

  private calculateDistanceKm(
    request: MedicalRequest,
    location: SpecialistMapLocation
  ): number | null {
    if (!this.hasCoordinates(request)) {
      return null;
    }

    const requestLatitude = Number(request.latitude);
    const requestLongitude = Number(request.longitude);

    if (
      !Number.isFinite(requestLatitude)
      || !Number.isFinite(requestLongitude)
    ) {
      return null;
    }

    const earthRadiusKm = 6371;
    const latitudeDifference =
      this.toRadians(requestLatitude - location.latitude);
    const longitudeDifference =
      this.toRadians(requestLongitude - location.longitude);

    const firstLatitude = this.toRadians(location.latitude);
    const secondLatitude = this.toRadians(requestLatitude);

    const haversine =
      Math.sin(latitudeDifference / 2) ** 2
      + Math.cos(firstLatitude)
      * Math.cos(secondLatitude)
      * Math.sin(longitudeDifference / 2) ** 2;

    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return earthRadiusKm * angularDistance;
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
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