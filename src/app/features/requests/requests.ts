import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  forkJoin,
  map,
  of
} from 'rxjs';
import {
  CreateMedicalRequestAdditionalPayload,
  MedicalRequestAdditional
} from '../../core/models/medical-request-additional.model';
import { MedicalRequest } from '../../core/models/medical-request.model';
import {
  MedicalRequestProposal
} from '../../core/models/medical-request-proposal.model';
import {
  SpecialistCommercialProfile
} from '../../core/models/specialist-commercial-profile.model';
import {
  AttentionReportService
} from '../../core/services/attention-report.service';
import {
  SpecialistCommercialProfileService
} from '../../core/services/specialist-commercial-profile.service';
import {
  SpecialistMedicalRequestProposalService
} from '../../core/services/specialist-medical-request-proposal.service';
import {
  SpecialistMedicalRequestAdditionalService
} from '../../core/services/specialist-medical-request-additional.service';
import {
  SpecialistMedicalRequestService
} from '../../core/services/specialist-medical-request.service';
import {
  RequestLocationMap,
  SpecialistMapLocation
} from './request-location-map/request-location-map';
import { AdditionalWithdrawModal } from './additional-withdraw-modal/additional-withdraw-modal';

type ReportCompletionStatus =
  | 'LOADING'
  | 'PENDING'
  | 'COMPLETE'
  | 'ERROR';

interface ProposalPriceSummary {
  serviceAmount: number;
  mobilityAmount: number;
  totalAmount: number;
  currency: string;
}

@Component({
  selector: 'app-requests',
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    FormsModule,
    RequestLocationMap,
    AdditionalWithdrawModal
  ],
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class Requests {
  private readonly requestService =
    inject(SpecialistMedicalRequestService);

  private readonly additionalService =
    inject(SpecialistMedicalRequestAdditionalService);

  private readonly proposalService =
    inject(SpecialistMedicalRequestProposalService);

  private readonly commercialProfileService =
    inject(SpecialistCommercialProfileService);

  private readonly attentionReportService =
    inject(AttentionReportService);

  pendingRequests = signal<MedicalRequest[]>([]);
  assignedRequests = signal<MedicalRequest[]>([]);

  additionalsByRequestId =
    signal<Record<number, MedicalRequestAdditional[]>>({});

  loadedAdditionalRequestIds =
    signal<Record<number, boolean>>({});

  expandedAdditionalRequestId =
    signal<number | null>(null);

  additionalLoadingRequestId =
    signal<number | null>(null);

  additionalActionLoadingId =
    signal<number | null>(null);

  additionalEditorRequestId =
    signal<number | null>(null);

  additionalConcept = '';
  additionalJustification = '';
  additionalAmount: number | null = null;

  selectedMapRequest =
    signal<MedicalRequest | null>(null);

  specialistLocation =
    signal<SpecialistMapLocation | null>(null);

  commercialProfile =
    signal<SpecialistCommercialProfile | null>(null);

  proposalsByRequestId =
    signal<Record<number, MedicalRequestProposal[]>>({});

  proposalEditorRequestId =
    signal<number | null>(null);

  statusFilter = signal('ALL');
  searchTerm = signal('');

  loading = signal(false);
  actionLoadingId = signal<number | null>(null);

  proposalLoadingRequestId =
    signal<number | null>(null);

  errorMessage = signal('');
  successMessage = signal('');
  commercialProfileError = signal('');

  reportStatusByRequestId =
    signal<Record<number, ReportCompletionStatus>>({});

  proposalEstimatedArrivalMinutes = 30;
  proposalValidityMinutes = 30;
  proposalMessage = '';

  totalRequests = computed(
    () =>
      this.pendingRequests().length
      + this.assignedRequests().length
  );

  finishedRequests = computed(
    () =>
      this.assignedRequests()
        .filter(
          (item) => item.status === 'FINALIZADO'
        )
        .length
  );

  activeRequests = computed(
    () =>
      this.assignedRequests()
        .filter(
          (item) => item.status !== 'FINALIZADO'
        )
        .length
  );

  sortedPendingRequests = computed(() => {
    const location = this.specialistLocation();
    const requests = [...this.pendingRequests()];

    if (!location) {
      return requests;
    }

    return requests.sort((first, second) => {
      const firstDistance =
        this.calculateDistanceKm(first, location);

      const secondDistance =
        this.calculateDistanceKm(second, location);

      if (
        firstDistance === null
        && secondDistance === null
      ) {
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

    return (
      this.sortedPendingRequests()
        .find(
          (request) => this.hasCoordinates(request)
        )
        ?.id
      ?? null
    );
  });

  filteredAssignedRequests = computed(() => {
    const status = this.statusFilter();
    const search =
      this.normalizeText(this.searchTerm());

    return this.assignedRequests().filter(
      (request) => {
        const statusMatches =
          status === 'ALL'
          || request.status === status;

        const searchMatches =
          !search
          || this.matchesSearch(request, search);

        return statusMatches && searchMatches;
      }
    );
  });

  constructor() {
    this.loadCommercialProfile();
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.requestService.listPending().subscribe({
      next: (pending) => {
        this.pendingRequests.set(pending);
        this.loadSpecialistProposals(pending);

        this.requestService
          .listAssigned()
          .subscribe({
            next: (assigned) => {
              this.assignedRequests.set(assigned);

              this.loadAttentionReportStatuses(
                assigned
              );

              this.ensureSelectedMapRequest(
                pending,
                assigned
              );

              this.loading.set(false);
            },
            error: (error: unknown) => {
              this.loading.set(false);

              this.errorMessage.set(
                this.extractErrorMessage(
                  error,
                  'No se pudieron cargar las solicitudes asignadas.'
                )
              );
            }
          });
      },
      error: (error: unknown) => {
        this.loading.set(false);

        this.errorMessage.set(
          this.extractErrorMessage(
            error,
            'No se pudieron cargar las solicitudes pendientes.'
          )
        );
      }
    });
  }

  loadCommercialProfile(): void {
    this.commercialProfileError.set('');

    this.commercialProfileService
      .getProfile()
      .subscribe({
        next: (profile) => {
          this.commercialProfile.set(profile);
        },
        error: (error: unknown) => {
          this.commercialProfile.set(null);

          this.commercialProfileError.set(
            this.extractErrorMessage(
              error,
              'No se pudo cargar el perfil comercial. Revíselo antes de enviar propuestas.'
            )
          );
        }
      });
  }

  openProposalEditor(
    request: MedicalRequest
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const proposal =
      this.currentProposal(request.id);

    if (
      proposal
      && !this.canCreateAnotherProposal(proposal)
    ) {
      this.errorMessage.set(
        'Ya existe una propuesta activa para esta solicitud.'
      );

      return;
    }

    if (!this.proposalPriceSummary(request)) {
      this.errorMessage.set(
        'El servicio solicitado no tiene un precio comercial activo en su perfil.'
      );

      return;
    }

    this.proposalEstimatedArrivalMinutes = 30;
    this.proposalValidityMinutes = 30;
    this.proposalMessage = '';

    this.proposalEditorRequestId.set(
      request.id
    );
  }

  closeProposalEditor(): void {
    this.proposalEditorRequestId.set(null);
  }

  submitProposal(
    request: MedicalRequest
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const arrival =
      Number(this.proposalEstimatedArrivalMinutes);

    const validity =
      Number(this.proposalValidityMinutes);

    const message =
      this.proposalMessage.trim();

    if (
      !Number.isInteger(arrival)
      || arrival < 1
      || arrival > 1440
    ) {
      this.errorMessage.set(
        'El tiempo estimado de llegada debe estar entre 1 y 1440 minutos.'
      );

      return;
    }

    if (
      !Number.isInteger(validity)
      || validity < 5
      || validity > 120
    ) {
      this.errorMessage.set(
        'La vigencia de la propuesta debe estar entre 5 y 120 minutos.'
      );

      return;
    }

    if (message.length > 500) {
      this.errorMessage.set(
        'El mensaje no puede superar 500 caracteres.'
      );

      return;
    }

    this.proposalLoadingRequestId.set(
      request.id
    );

    this.proposalService
      .create(
        request.id,
        {
          estimatedArrivalMinutes: arrival,
          validityMinutes: validity,
          message: message || null
        }
      )
      .pipe(
        finalize(
          () =>
            this.proposalLoadingRequestId.set(
              null
            )
        )
      )
      .subscribe({
        next: (proposal) => {
          const current =
            this.proposalsByRequestId();

          const existing =
            current[request.id] ?? [];

          this.proposalsByRequestId.set({
            ...current,
            [request.id]: [
              proposal,
              ...existing.filter(
                (item) =>
                  item.proposalId
                  !== proposal.proposalId
              )
            ]
          });

          this.proposalEditorRequestId.set(
            null
          );

          this.successMessage.set(
            'Propuesta enviada correctamente. El paciente ya puede compararla y elegirla.'
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo enviar la propuesta.'
            )
          );
        }
      });
  }

  withdrawProposal(
    request: MedicalRequest,
    proposal: MedicalRequestProposal
  ): void {
    const confirmed = window.confirm(
      '¿Desea retirar esta propuesta?'
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    this.proposalLoadingRequestId.set(
      request.id
    );

    this.proposalService
      .withdraw(
        request.id,
        proposal.proposalId
      )
      .pipe(
        finalize(
          () =>
            this.proposalLoadingRequestId.set(
              null
            )
        )
      )
      .subscribe({
        next: (updated) => {
          const current =
            this.proposalsByRequestId();

          const existing =
            current[request.id] ?? [];

          this.proposalsByRequestId.set({
            ...current,
            [request.id]: existing.map(
              (item) =>
                item.proposalId
                  === updated.proposalId
                ? updated
                : item
            )
          });

          this.successMessage.set(
            'La propuesta fue retirada correctamente.'
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo retirar la propuesta.'
            )
          );
        }
      });
  }

  currentProposal(
    requestId: number
  ): MedicalRequestProposal | null {
    const proposals = [
      ...(this.proposalsByRequestId()[requestId]
        ?? [])
    ].sort(
      (first, second) =>
        this.dateValue(second.createdAt)
        - this.dateValue(first.createdAt)
    );

    const accepted = proposals.find(
      (proposal) =>
        proposal.status === 'ACCEPTED'
    );

    if (accepted) {
      return accepted;
    }

    const pending = proposals.find(
      (proposal) =>
        proposal.status === 'PENDING'
        && !this.isProposalExpired(proposal)
    );

    return pending ?? proposals[0] ?? null;
  }

  canCreateAnotherProposal(
    proposal: MedicalRequestProposal
  ): boolean {
    return (
      proposal.status === 'REJECTED'
      || proposal.status === 'WITHDRAWN'
      || proposal.status === 'EXPIRED'
      || this.isProposalExpired(proposal)
    );
  }

  proposalPriceSummary(
    request: MedicalRequest
  ): ProposalPriceSummary | null {
    const profile = this.commercialProfile();

    if (!profile || !profile.active) {
      return null;
    }

    const service = profile.services.find(
      (item) =>
        item.serviceCode === request.serviceCode
        && item.active
    );

    if (!service) {
      return null;
    }

    const serviceAmount =
      Number(service.basePrice);

    const mobilityAmount =
      profile.mobilityPolicy === 'SEPARATE'
        ? Number(
            profile.mobilityReferenceAmount
            ?? 0
          )
        : 0;

    return {
      serviceAmount,
      mobilityAmount,
      totalAmount:
        serviceAmount + mobilityAmount,
      currency: 'PEN'
    };
  }

  mobilityPolicyLabel(): string {
    const policy =
      this.commercialProfile()?.mobilityPolicy;

    const labels: Record<string, string> = {
      INCLUDED: 'Movilidad incluida',
      SEPARATE: 'Movilidad separada',
      NOT_AVAILABLE: 'Movilidad no disponible'
    };

    return labels[policy ?? ''] ?? 'Sin política';
  }

  proposalStatusLabel(
    status: string
  ): string {
    const labels: Record<string, string> = {
      PENDING: 'Esperando elección',
      ACCEPTED: 'Elegida por el paciente',
      REJECTED: 'No elegida',
      WITHDRAWN: 'Retirada',
      EXPIRED: 'Vencida'
    };

    return labels[status] ?? status;
  }

  proposalStatusClass(
    status: string
  ): string {
    return (
      'proposal-status-'
      + status.toLowerCase()
    );
  }

  isProposalExpired(
    proposal: MedicalRequestProposal
  ): boolean {
    const expiration =
      this.dateValue(proposal.expiresAt);

    return (
      expiration > 0
      && expiration <= Date.now()
    );
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

    if (
      this.selectedMapRequest()
      || !location
    ) {
      return;
    }

    const nearestId =
      this.nearestRequestId();

    const nearestRequest =
      this.pendingRequests().find(
        (request) =>
          request.id === nearestId
      );

    if (nearestRequest) {
      this.selectedMapRequest.set(
        nearestRequest
      );
    }
  }

  calculatedDistanceKm(
    request: MedicalRequest
  ): number | null {
    const location =
      this.specialistLocation();

    if (!location) {
      return null;
    }

    return this.calculateDistanceKm(
      request,
      location
    );
  }

  distanceLabel(
    request: MedicalRequest
  ): string {
    const distance =
      this.calculatedDistanceKm(request);

    if (distance === null) {
      return 'Sin calcular';
    }

    if (distance < 1) {
      return (
        Math.round(distance * 1000)
        + ' m'
      );
    }

    return distance.toFixed(1) + ' km';
  }

  isNearestRequest(
    request: MedicalRequest
  ): boolean {
    return (
      this.nearestRequestId()
      === request.id
    );
  }

  selectMapRequest(
    request: MedicalRequest
  ): void {
    this.selectedMapRequest.set(request);
  }

  isSelectedMapRequest(
    request: MedicalRequest
  ): boolean {
    return (
      this.selectedMapRequest()?.id
      === request.id
    );
  }

  isReportPending(
    requestId: number
  ): boolean {
    return (
      this.reportStatusByRequestId()[
        requestId
      ] === 'PENDING'
    );
  }

  hasCoordinates(
    request: MedicalRequest
  ): boolean {
    return (
      request.latitude !== null
      && request.latitude !== undefined
      && request.longitude !== null
      && request.longitude !== undefined
    );
  }

  startRoute(
    request: MedicalRequest
  ): void {
    this.runAction(
      request.id,
      () =>
        this.requestService.startRoute(
          request.id
        )
    );
  }

  startAttention(
    request: MedicalRequest
  ): void {
    this.runAction(
      request.id,
      () =>
        this.requestService.startAttention(
          request.id
        )
    );
  }

  finish(
    request: MedicalRequest
  ): void {
    this.runAction(
      request.id,
      () =>
        this.requestService.finish(
          request.id
        )
    );
  }

  canStartRoute(
    request: MedicalRequest
  ): boolean {
    return request.status === 'ACCEPTED';
  }

  canStartAttention(
    request: MedicalRequest
  ): boolean {
    return request.status === 'EN_CAMINO';
  }

  canFinish(
    request: MedicalRequest
  ): boolean {
    return request.status === 'EN_ATENCION';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      ACCEPTED: 'Aceptada',
      EN_CAMINO: 'En camino',
      EN_ATENCION: 'En atención',
      FINALIZADO: 'Finalizada'
    };

    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    return (
      'status-'
      + status
        .toLowerCase()
        .replace('_', '-')
    );
  }

  private loadSpecialistProposals(
    requests: MedicalRequest[]
  ): void {
    if (requests.length === 0) {
      this.proposalsByRequestId.set({});
      return;
    }

    const checks = requests.map(
      (request) =>
        this.proposalService
          .list(request.id)
          .pipe(
            map(
              (proposals) => ({
                requestId: request.id,
                proposals
              })
            ),
            catchError(
              () =>
                of({
                  requestId: request.id,
                  proposals:
                    [] as MedicalRequestProposal[]
                })
            )
          )
    );

    forkJoin(checks).subscribe(
      (results) => {
        const proposalMap: Record<
          number,
          MedicalRequestProposal[]
        > = {};

        for (const result of results) {
          proposalMap[result.requestId] =
            result.proposals;
        }

        this.proposalsByRequestId.set(
          proposalMap
        );
      }
    );
  }

  private runAction(
    requestId: number,
    action: () => Observable<MedicalRequest>
  ): void {
    this.actionLoadingId.set(requestId);
    this.errorMessage.set('');
    this.successMessage.set('');

    action()
      .pipe(
        finalize(
          () =>
            this.actionLoadingId.set(null)
        )
      )
      .subscribe({
        next: () => this.loadRequests(),
        error: (error: unknown) => {
          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo ejecutar la acción solicitada.'
            )
          );
        }
      });
  }

  private ensureSelectedMapRequest(
    pending: MedicalRequest[],
    assigned: MedicalRequest[]
  ): void {
    const current =
      this.selectedMapRequest();

    const visibleRequests = [
      ...pending,
      ...assigned
    ];

    if (
      current
      && visibleRequests.some(
        (item) =>
          item.id === current.id
          && this.hasCoordinates(item)
      )
    ) {
      return;
    }

    const firstPendingWithLocation =
      pending.find(
        (item) => this.hasCoordinates(item)
      );

    const firstAssignedWithLocation =
      assigned.find(
        (item) => this.hasCoordinates(item)
      );

    this.selectedMapRequest.set(
      firstPendingWithLocation
      ?? firstAssignedWithLocation
      ?? null
    );
  }

  private loadAttentionReportStatuses(
    requests: MedicalRequest[]
  ): void {
    const finalized = requests.filter(
      (request) =>
        request.status === 'FINALIZADO'
    );

    const loadingStatuses =
      finalized.reduce<
        Record<number, ReportCompletionStatus>
      >(
        (statuses, request) => {
          statuses[request.id] = 'LOADING';
          return statuses;
        },
        {}
      );

    this.reportStatusByRequestId.set(
      loadingStatuses
    );

    if (finalized.length === 0) {
      return;
    }

    const checks = finalized.map(
      (request) =>
        this.attentionReportService
          .findByMedicalRequestId(request.id)
          .pipe(
            map((report) => {
              const isComplete =
                !!report
                && !!report.clinicalObservations
                  ?.trim()
                && !!report.recommendations
                  ?.trim();

              return {
                requestId: request.id,
                status: (
                  isComplete
                    ? 'COMPLETE'
                    : 'PENDING'
                ) as ReportCompletionStatus
              };
            }),
            catchError(
              () =>
                of({
                  requestId: request.id,
                  status: 'ERROR' as ReportCompletionStatus
                })
            )
          )
    );

    forkJoin(checks).subscribe(
      (results) => {
        const statuses: Record<
          number,
          ReportCompletionStatus
        > = {};

        for (const result of results) {
          statuses[result.requestId] =
            result.status;
        }

        this.reportStatusByRequestId.set(
          statuses
        );
      }
    );
  }

  private calculateDistanceKm(
    request: MedicalRequest,
    location: SpecialistMapLocation
  ): number | null {
    if (!this.hasCoordinates(request)) {
      return null;
    }

    const requestLatitude =
      Number(request.latitude);

    const requestLongitude =
      Number(request.longitude);

    if (
      !Number.isFinite(requestLatitude)
      || !Number.isFinite(requestLongitude)
    ) {
      return null;
    }

    const earthRadiusKm = 6371;

    const latitudeDifference =
      this.toRadians(
        requestLatitude
        - location.latitude
      );

    const longitudeDifference =
      this.toRadians(
        requestLongitude
        - location.longitude
      );

    const firstLatitude =
      this.toRadians(location.latitude);

    const secondLatitude =
      this.toRadians(requestLatitude);

    const haversine =
      Math.sin(
        latitudeDifference / 2
      ) ** 2
      + Math.cos(firstLatitude)
      * Math.cos(secondLatitude)
      * Math.sin(
        longitudeDifference / 2
      ) ** 2;

    const angularDistance =
      2
      * Math.atan2(
        Math.sqrt(haversine),
        Math.sqrt(1 - haversine)
      );

    return earthRadiusKm * angularDistance;
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
  }

  private matchesSearch(
    request: MedicalRequest,
    search: string
  ): boolean {
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

    return values.some(
      (value) =>
        this.normalizeText(value)
          .includes(search)
    );
  }

  private normalizeText(
    value?: string | number | null
  ): string {
    return (value ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      );
  }

  private dateValue(
    value?: string | null
  ): number {
    if (!value) {
      return 0;
    }

    const parsed = Date.parse(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  private extractErrorMessage(
    error: unknown,
    fallbackMessage: string
  ): string {
    const response = error as {
      error?:
        | {
            message?: string;
          }
        | string;
      message?: string;
    };

    if (
      typeof response.error === 'string'
      && response.error.trim()
    ) {
      return response.error;
    }

    if (
      typeof response.error === 'object'
      && response.error?.message
    ) {
      return response.error.message;
    }

    return (
      response.message
      ?? fallbackMessage
    );
  }

  supportsAdditionals(
    request: MedicalRequest
  ): boolean {
    return [
      'ACCEPTED',
      'EN_CAMINO',
      'EN_ATENCION',
      'FINALIZADO'
    ].includes(request.status);
  }

  canCreateAdditional(
    request: MedicalRequest
  ): boolean {
    return request.status === 'EN_ATENCION';
  }

  canWithdrawAdditional(
    request: MedicalRequest,
    additional: MedicalRequestAdditional
  ): boolean {
    return (
      request.status === 'EN_ATENCION'
      && additional.status === 'PENDING'
    );
  }

  toggleAdditionals(
    request: MedicalRequest
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (
      this.expandedAdditionalRequestId()
      === request.id
    ) {
      this.expandedAdditionalRequestId.set(null);
      this.closeAdditionalEditor();
      return;
    }

    this.expandedAdditionalRequestId.set(
      request.id
    );

    this.loadAdditionalList(
      request.id,
      true
    );
  }

  additionalsFor(
    requestId: number
  ): MedicalRequestAdditional[] {
    return (
      this.additionalsByRequestId()[requestId]
      ?? []
    );
  }

  hasPendingAdditionals(
    requestId: number
  ): boolean {
    return this.additionalsFor(requestId)
      .some(
        (additional) =>
          additional.status === 'PENDING'
      );
  }

  requestOriginalTotal(
    request: MedicalRequest
  ): number {
    const first =
      this.additionalsFor(request.id)[0];

    return Number(
      first?.originalTotalAmount
      ?? request.estimatedAmount
      ?? 0
    );
  }

  requestApprovedAdditionalsAmount(
    requestId: number
  ): number {
    const first =
      this.additionalsFor(requestId)[0];

    return Number(
      first?.approvedAdditionalsAmount
      ?? 0
    );
  }

  requestCurrentTotal(
    request: MedicalRequest
  ): number {
    const first =
      this.additionalsFor(request.id)[0];

    return Number(
      first?.currentTotalAmount
      ?? request.estimatedAmount
      ?? 0
    );
  }

  openAdditionalEditor(
    request: MedicalRequest
  ): void {
    if (!this.canCreateAdditional(request)) {
      this.errorMessage.set(
        'Los adicionales solo pueden registrarse durante la atención.'
      );

      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    this.additionalConcept = '';
    this.additionalJustification = '';
    this.additionalAmount = null;

    this.additionalEditorRequestId.set(
      request.id
    );
  }

  closeAdditionalEditor(): void {
    this.additionalEditorRequestId.set(null);
    this.additionalConcept = '';
    this.additionalJustification = '';
    this.additionalAmount = null;
  }

  submitAdditional(
    request: MedicalRequest
  ): void {
    if (!this.canCreateAdditional(request)) {
      this.errorMessage.set(
        'La solicitud debe estar en atención para registrar adicionales.'
      );

      return;
    }

    const concept =
      this.additionalConcept.trim();

    const justification =
      this.additionalJustification.trim();

    const amount =
      Number(this.additionalAmount);

    if (
      concept.length < 3
      || concept.length > 120
    ) {
      this.errorMessage.set(
        'El concepto debe tener entre 3 y 120 caracteres.'
      );

      return;
    }

    if (
      justification.length < 10
      || justification.length > 1000
    ) {
      this.errorMessage.set(
        'La justificación debe tener entre 10 y 1000 caracteres.'
      );

      return;
    }

    if (
      !Number.isFinite(amount)
      || amount < 0.01
      || amount > 99999999.99
    ) {
      this.errorMessage.set(
        'El importe debe estar entre S/ 0.01 y S/ 99,999,999.99.'
      );

      return;
    }

    const amountInCents = amount * 100;

    if (
      Math.abs(
        amountInCents
        - Math.round(amountInCents)
      ) > 0.00000001
    ) {
      this.errorMessage.set(
        'El importe admite como máximo dos decimales.'
      );

      return;
    }

    const payload:
      CreateMedicalRequestAdditionalPayload = {
        concept,
        justification,
        amount
      };

    this.errorMessage.set('');
    this.successMessage.set('');

    this.additionalActionLoadingId.set(
      request.id
    );

    this.additionalService
      .create(
        request.id,
        payload
      )
      .pipe(
        finalize(
          () =>
            this.additionalActionLoadingId.set(
              null
            )
        )
      )
      .subscribe({
        next: (additional) => {
          this.upsertAdditional(additional);
          this.closeAdditionalEditor();

          this.successMessage.set(
            'El cargo adicional fue enviado al paciente para su decisión.'
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo registrar el cargo adicional.'
            )
          );
        }
      });
  }

  readonly withdrawAdditionalConfirmation = signal<{
    request: MedicalRequest;
    additional: MedicalRequestAdditional;
  } | null>(null);

  openWithdrawAdditionalConfirmation(
    request: MedicalRequest,
    additional: MedicalRequestAdditional
  ): void {
    if (
      !this.canWithdrawAdditional(
        request,
        additional
      )
    ) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    this.withdrawAdditionalConfirmation.set({
      request,
      additional
    });
  }

  closeWithdrawAdditionalConfirmation(): void {
    const confirmation =
      this.withdrawAdditionalConfirmation();

    if (
      confirmation
      && this.additionalActionLoadingId()
        === confirmation.request.id
    ) {
      return;
    }

    this.withdrawAdditionalConfirmation.set(null);
  }

  confirmWithdrawAdditional(): void {
    const confirmation =
      this.withdrawAdditionalConfirmation();

    if (!confirmation) {
      return;
    }

    this.withdrawAdditional(
      confirmation.request,
      confirmation.additional
    );
  }

  withdrawAdditional(
    request: MedicalRequest,
    additional: MedicalRequestAdditional
  ): void {
    if (
      !this.canWithdrawAdditional(
        request,
        additional
      )
    ) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    this.additionalActionLoadingId.set(
      request.id
    );

    this.additionalService
      .withdraw(
        request.id,
        additional.additionalId
      )
      .pipe(
        finalize(
          () =>
            this.additionalActionLoadingId.set(
              null
            )
        )
      )
      .subscribe({
        next: (updated) => {
          this.upsertAdditional(updated);

          this.withdrawAdditionalConfirmation.set(
            null
          );

          this.successMessage.set(
            'El cargo adicional fue retirado correctamente.'
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo retirar el cargo adicional.'
            )
          );
        }
      });
  }

  finishWithAdditionalGuard(
    request: MedicalRequest
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    this.loadAdditionalList(
      request.id,
      true,
      (items) => {
        if (
          items.some(
            (additional) =>
              additional.status === 'PENDING'
          )
        ) {
          this.expandedAdditionalRequestId.set(
            request.id
          );

          this.errorMessage.set(
            'No se puede finalizar mientras exista un cargo adicional pendiente.'
          );

          return;
        }

        this.finish(request);
      }
    );
  }

  additionalStatusLabel(
    status: string
  ): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente de decisión',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      WITHDRAWN: 'Retirado'
    };

    return labels[status] ?? status;
  }

  additionalStatusClass(
    status: string
  ): string {
    return (
      'additional-status-'
      + status.toLowerCase()
    );
  }

  private loadAdditionalList(
    requestId: number,
    force = false,
    afterLoad?: (
      items: MedicalRequestAdditional[]
    ) => void
  ): void {
    if (
      !force
      && this.loadedAdditionalRequestIds()[
        requestId
      ]
    ) {
      return;
    }

    this.additionalLoadingRequestId.set(
      requestId
    );

    this.additionalService
      .list(requestId)
      .pipe(
        finalize(
          () =>
            this.additionalLoadingRequestId.set(
              null
            )
        )
      )
      .subscribe({
        next: (items) => {
          const sorted = [...items].sort(
            (first, second) =>
              this.additionalDateValue(
                first.createdAt
              )
              - this.additionalDateValue(
                second.createdAt
              )
          );

          this.additionalsByRequestId.set({
            ...this.additionalsByRequestId(),
            [requestId]: sorted
          });

          this.loadedAdditionalRequestIds.set({
            ...this.loadedAdditionalRequestIds(),
            [requestId]: true
          });

          afterLoad?.(sorted);
        },
        error: (error: unknown) => {
          this.additionalsByRequestId.set({
            ...this.additionalsByRequestId(),
            [requestId]: []
          });

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudieron cargar los cargos adicionales.'
            )
          );
        }
      });
  }

  private upsertAdditional(
    additional: MedicalRequestAdditional
  ): void {
    const requestId =
      additional.medicalRequestId;

    const current =
      this.additionalsByRequestId()[
        requestId
      ] ?? [];

    const updated = [
      ...current.filter(
        (item) =>
          item.additionalId
          !== additional.additionalId
      ),
      additional
    ].sort(
      (first, second) =>
        this.additionalDateValue(
          first.createdAt
        )
        - this.additionalDateValue(
          second.createdAt
        )
    );

    this.additionalsByRequestId.set({
      ...this.additionalsByRequestId(),
      [requestId]: updated
    });

    this.loadedAdditionalRequestIds.set({
      ...this.loadedAdditionalRequestIds(),
      [requestId]: true
    });
  }

  private additionalDateValue(
    value?: string | null
  ): number {
    const parsed = Date.parse(
      value ?? ''
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }
}
