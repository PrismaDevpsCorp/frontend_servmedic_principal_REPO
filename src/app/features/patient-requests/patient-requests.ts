import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  MedicalRequestAdditional
} from '../../core/models/medical-request-additional.model';
import {
  MedicalRequest
} from '../../core/models/medical-request.model';
import {
  MedicalRequestProposal
} from '../../core/models/medical-request-proposal.model';
import {
  PatientMedicalRequestAdditionalService
} from '../../core/services/patient-medical-request-additional.service';
import {
  PatientMedicalRequestProposalService
} from '../../core/services/patient-medical-request-proposal.service';
import {
  PatientMedicalRequestService
} from '../../core/services/patient-medical-request.service';

interface ProposalConfirmation {
  request: MedicalRequest;
  proposal: MedicalRequestProposal;
}
interface AdditionalApprovalConfirmation {
  request: MedicalRequest;
  additional: MedicalRequestAdditional;
}
@Component({
  selector: 'app-patient-requests',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule
  ],
  templateUrl: './patient-requests.html',
  styleUrl: './patient-requests.scss'
})
export class PatientRequests {
  private readonly patientRequestService =
    inject(PatientMedicalRequestService);

  private readonly additionalService =
    inject(PatientMedicalRequestAdditionalService);

  private readonly proposalService =
    inject(PatientMedicalRequestProposalService);

  requests = signal<MedicalRequest[]>([]);

  proposalsByRequestId =
    signal<Record<number, MedicalRequestProposal[]>>({});

  loadedProposalRequestIds =
    signal<Record<number, boolean>>({});

  expandedRequestId =
    signal<number | null>(null);

  proposalLoadingRequestId =
    signal<number | null>(null);

  acceptLoadingProposalId =
    signal<number | null>(null);

  proposalConfirmation =
    signal<ProposalConfirmation | null>(null);

  proposalConfirmationError = signal('');

  additionalsByRequestId =
    signal<Record<number, MedicalRequestAdditional[]>>({});

  expandedAdditionalRequestId =
    signal<number | null>(null);

  additionalLoadingRequestId =
    signal<number | null>(null);

  additionalActionLoadingId =
    signal<number | null>(null);

  additionalApprovalConfirmation =
    signal<AdditionalApprovalConfirmation | null>(null);

  additionalApprovalError = signal('');
  searchTerm = signal('');
  statusFilter = signal('ALL');

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  filteredRequests = computed(() => {
    const status = this.statusFilter();

    const search =
      this.normalizeText(this.searchTerm());

    return this.requests().filter(
      (request) => {
        const statusMatches =
          status === 'ALL'
          || request.status === status;

        const searchMatches =
          !search
          || this.matchesSearch(
            request,
            search
          );

        return statusMatches && searchMatches;
      }
    );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.patientRequestService
      .list()
      .subscribe({
        next: (items) => {
          this.requests.set(items);
          this.loading.set(false);

          items
            .filter(
              (item) =>
                this.supportsAdditionals(
                  item
                )
            )
            .forEach(
              (item) =>
                this.loadAdditionalList(
                  item.id
                )
            );

          const expanded =
            this.expandedRequestId();

          if (
            expanded !== null
            && items.some(
              (item) => item.id === expanded
            )
          ) {
            this.loadProposalList(
              expanded,
              true
            );
          }
        },
        error: (error: unknown) => {
          this.requests.set([]);
          this.loading.set(false);

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudieron cargar sus solicitudes.'
            )
          );
        }
      });
  }

  toggleProposals(
    request: MedicalRequest
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (
      this.expandedRequestId()
      === request.id
    ) {
      this.expandedRequestId.set(null);
      return;
    }

    this.expandedRequestId.set(request.id);

    if (
      !this.loadedProposalRequestIds()[
        request.id
      ]
    ) {
      this.loadProposalList(
        request.id,
        false
      );
    }
  }

  sortedProposals(
    requestId: number
  ): MedicalRequestProposal[] {
    const priority: Record<string, number> = {
      ACCEPTED: 0,
      PENDING: 1,
      REJECTED: 2,
      WITHDRAWN: 3,
      EXPIRED: 4
    };

    return [
      ...(this.proposalsByRequestId()[
        requestId
      ] ?? [])
    ].sort((first, second) => {
      const statusDifference =
        (priority[first.status] ?? 9)
        - (priority[second.status] ?? 9);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      const amountDifference =
        Number(first.totalAmount)
        - Number(second.totalAmount);

      if (amountDifference !== 0) {
        return amountDifference;
      }

      return (
        first.estimatedArrivalMinutes
        - second.estimatedArrivalMinutes
      );
    });
  }

  acceptProposal(
    request: MedicalRequest,
    proposal: MedicalRequestProposal
  ): void {
    if (
      !this.canAcceptProposal(
        request,
        proposal
      )
    ) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.proposalConfirmationError.set('');

    this.proposalConfirmation.set({
      request,
      proposal
    });
  }

  closeProposalConfirmation(): void {
    if (
      this.acceptLoadingProposalId()
      !== null
    ) {
      return;
    }

    this.proposalConfirmationError.set('');
    this.proposalConfirmation.set(null);
  }

  confirmProposalSelection(): void {
    const confirmation =
      this.proposalConfirmation();

    if (!confirmation) {
      return;
    }

    const request = confirmation.request;
    const proposal = confirmation.proposal;

    this.errorMessage.set('');
    this.successMessage.set('');
    this.proposalConfirmationError.set('');

    this.acceptLoadingProposalId.set(
      proposal.proposalId
    );

    this.proposalService
      .accept(
        request.id,
        proposal.proposalId
      )
      .pipe(
        finalize(
          () =>
            this.acceptLoadingProposalId.set(
              null
            )
        )
      )
      .subscribe({
        next: (acceptedProposal) => {
          const current =
            this.proposalsByRequestId();

          const existing =
            current[request.id] ?? [];

          this.proposalsByRequestId.set({
            ...current,
            [request.id]: existing.map(
              (item) => {
                if (
                  item.proposalId
                  === acceptedProposal.proposalId
                ) {
                  return acceptedProposal;
                }

                if (
                  item.status === 'PENDING'
                ) {
                  return {
                    ...item,
                    status: 'REJECTED'
                  };
                }

                return item;
              }
            )
          });

          this.proposalConfirmationError.set('');
          this.proposalConfirmation.set(null);

          this.successMessage.set(
            'Especialista elegido correctamente. La solicitud quedó asignada y el costo acordado fue confirmado.'
          );

          this.load();
        },
        error: (error: unknown) => {
          this.proposalConfirmationError.set(
            this.extractErrorMessage(
              error,
              'No se pudo confirmar la elección del especialista.'
            )
          );
        }
      });
  }
  canAcceptProposal(
    request: MedicalRequest,
    proposal: MedicalRequestProposal
  ): boolean {
    return (
      request.status === 'PENDING'
      && proposal.status === 'PENDING'
      && !this.isProposalExpired(proposal)
    );
  }

  isProposalExpired(
    proposal: MedicalRequestProposal
  ): boolean {
    const expiration =
      Date.parse(proposal.expiresAt);

    return (
      Number.isFinite(expiration)
      && expiration <= Date.now()
    );
  }

  requestStatusLabel(
    status: string
  ): string {
    const labels: Record<string, string> = {
      PENDING: 'Esperando propuestas',
      ACCEPTED: 'Especialista elegido',
      EN_CAMINO: 'Especialista en camino',
      EN_ATENCION: 'Atención en curso',
      FINALIZADO: 'Atención finalizada'
    };

    return labels[status] ?? status;
  }

  requestStatusClass(
    status: string
  ): string {
    return (
      'status-'
      + status
        .toLowerCase()
        .replace('_', '-')
    );
  }

  proposalStatusLabel(
    status: string
  ): string {
    const labels: Record<string, string> = {
      PENDING: 'Disponible para elegir',
      ACCEPTED: 'Propuesta elegida',
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

  mobilityPolicyLabel(
    policy: string
  ): string {
    const labels: Record<string, string> = {
      INCLUDED: 'Movilidad incluida',
      SEPARATE: 'Movilidad separada',
      NOT_AVAILABLE: 'Sin movilidad'
    };

    return labels[policy] ?? policy;
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

  private loadProposalList(
    requestId: number,
    force: boolean
  ): void {
    if (
      !force
      && this.loadedProposalRequestIds()[
        requestId
      ]
    ) {
      return;
    }

    this.proposalLoadingRequestId.set(
      requestId
    );

    this.proposalService
      .list(requestId)
      .pipe(
        finalize(
          () =>
            this.proposalLoadingRequestId.set(
              null
            )
        )
      )
      .subscribe({
        next: (proposals) => {
          this.proposalsByRequestId.set({
            ...this.proposalsByRequestId(),
            [requestId]: proposals
          });

          this.loadedProposalRequestIds.set({
            ...this.loadedProposalRequestIds(),
            [requestId]: true
          });
        },
        error: (error: unknown) => {
          this.proposalsByRequestId.set({
            ...this.proposalsByRequestId(),
            [requestId]: []
          });

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudieron cargar las propuestas de la solicitud.'
            )
          );
        }
      });
  }

  private matchesSearch(
    request: MedicalRequest,
    search: string
  ): boolean {
    const values = [
      request.requestCode,
      request.serviceName,
      request.professionName,
      request.addressText,
      request.addressReference,
      request.patientNotes,
      request.acceptedSpecialistFullName,
      this.requestStatusLabel(
        request.status
      )
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

  canDecideAdditional(
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
      return;
    }

    this.expandedAdditionalRequestId.set(
      request.id
    );

    this.loadAdditionalList(
      request.id
    );
  }

  additionalsFor(
    requestId: number
  ): MedicalRequestAdditional[] {
    return (
      this.additionalsByRequestId()[
        requestId
      ] ?? []
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

  pendingAdditionalsCount(
    requestId: number
  ): number {
    return this.additionalsFor(requestId)
      .filter(
        (additional) =>
          additional.status === 'PENDING'
      )
      .length;
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
    return this.additionalsFor(requestId)
      .filter(
        (additional) =>
          additional.status === 'APPROVED'
      )
      .reduce(
        (total, additional) =>
          total + Number(additional.amount),
        0
      );
  }
  requestCurrentTotal(
    request: MedicalRequest
  ): number {
    return (
      this.requestOriginalTotal(request)
      + this.requestApprovedAdditionalsAmount(
        request.id
      )
    );
  }
  approveAdditional(
    request: MedicalRequest,
    additional: MedicalRequestAdditional
  ): void {
    if (
      !this.canDecideAdditional(
        request,
        additional
      )
    ) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.additionalApprovalError.set('');

    this.additionalApprovalConfirmation.set({
      request,
      additional
    });
  }

  closeAdditionalApprovalConfirmation(): void {
    const confirmation =
      this.additionalApprovalConfirmation();

    if (
      confirmation
      && this.additionalActionLoadingId()
        === confirmation.additional.additionalId
    ) {
      return;
    }

    this.additionalApprovalError.set('');
    this.additionalApprovalConfirmation.set(null);
  }

  confirmAdditionalApproval(): void {
    const confirmation =
      this.additionalApprovalConfirmation();

    if (!confirmation) {
      return;
    }

    const request = confirmation.request;
    const additional = confirmation.additional;

    if (
      !this.canDecideAdditional(
        request,
        additional
      )
    ) {
      this.additionalApprovalConfirmation.set(null);
      return;
    }

    this.additionalApprovalError.set('');

    this.additionalActionLoadingId.set(
      additional.additionalId
    );

    this.additionalService
      .approve(
        request.id,
        additional.additionalId
      )
      .pipe(
        finalize(() => {
          this.additionalActionLoadingId.set(null);
        })
      )
      .subscribe({
        next: (updated) => {
          this.upsertAdditional(updated);

          this.additionalApprovalConfirmation.set(null);

          this.successMessage.set(
            'Cargo adicional aprobado correctamente.'
          );
        },

        error: (error) => {
          this.additionalApprovalError.set(
            this.extractErrorMessage(
              error,
              'No se pudo aprobar el cargo adicional.'
            )
          );
        }
      });
  }
  rejectAdditional(
    request: MedicalRequest,
    additional: MedicalRequestAdditional
  ): void {
    if (
      !this.canDecideAdditional(
        request,
        additional
      )
    ) {
      return;
    }

    const confirmed = window.confirm(
      '¿Confirma que desea rechazar este cargo adicional?'
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    this.additionalActionLoadingId.set(
      additional.additionalId
    );

    this.additionalService
      .reject(
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

          this.successMessage.set(
            'Cargo adicional rechazado correctamente.'
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo rechazar el cargo adicional.'
            )
          );
        }
      });
  }

  additionalStatusLabel(
    status: string
  ): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente de su decisión',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      WITHDRAWN: 'Retirado por el especialista'
    };

    return labels[status] ?? status;
  }

  additionalStatusClass(
    status: string
  ): string {
    return (
      'patient-additional-status-'
      + status.toLowerCase()
    );
  }

  private loadAdditionalList(
    requestId: number
  ): void {
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

    const existing =
      this.additionalsByRequestId()[
        requestId
      ] ?? [];

    const updated = [
      ...existing.filter(
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
