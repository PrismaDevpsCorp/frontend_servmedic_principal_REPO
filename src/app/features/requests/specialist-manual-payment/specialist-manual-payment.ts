import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { finalize } from 'rxjs';

import { ManualPayment } from '../../../core/models/manual-payment.model';

import {
  SpecialistManualPaymentService
} from '../../../core/services/specialist-manual-payment.service';

@Component({
  selector: 'app-specialist-manual-payment',

  imports: [
    CommonModule
  ],

  template: `
    <section class="payment-card">

      <div class="payment-heading">

        <div>
          <span>Pago de la atención</span>

          <h4>
            Verificación del pago directo
          </h4>

          <p>
            MedicDrive solo registra la evidencia.
            Usted debe comprobar externamente
            la recepción real del dinero.
          </p>
        </div>

        @if (payment(); as current) {

          <b
            class="status"
            [class.pending]="current.paymentStatus === 'PENDING'"
            [class.paid]="current.paymentStatus === 'PAID'"
            [class.rejected]="current.paymentStatus === 'REJECTED'">

            {{ statusLabel(current.paymentStatus) }}

          </b>
        }

      </div>

      @if (errorMessage()) {
        <div class="error-box">
          {{ errorMessage() }}
        </div>
      }

      @if (successMessage()) {
        <div class="success-box">
          {{ successMessage() }}
        </div>
      }

      @if (loading()) {

        <div class="notice-box">
          Consultando información de pago...
        </div>

      } @else if (payment(); as current) {

        <div class="economic-grid">

          <article>
            <span>Consulta / servicio</span>

            <strong>
              S/
              {{ current.serviceAmount | number:'1.2-2' }}
            </strong>
          </article>

          <article>
            <span>Movilidad</span>

            <strong>
              S/
              {{ current.mobilityAmount | number:'1.2-2' }}
            </strong>
          </article>

          <article>
            <span>Adicionales</span>

            <strong>
              S/
              {{ current.additionalAmount | number:'1.2-2' }}
            </strong>
          </article>

          <article class="total-card">
            <span>Total final</span>

            <strong>
              S/
              {{ current.totalAmount | number:'1.2-2' }}
            </strong>
          </article>

        </div>

        <div class="payment-info">

          <span>
            Método:
            <b>
              {{ methodLabel(current.paymentMethod) }}
            </b>
          </span>

          @if (current.externalTransactionId) {

            <span>
              Operación / referencia:
              <b>
                {{ current.externalTransactionId }}
              </b>
            </span>

          }

          <span>
            Evidencia:
            <b>
              {{ current.evidenceFileName || 'Registrada' }}
            </b>
          </span>

          @if (current.evidenceUploadedAt) {

            <span>
              Registrada:
              <b>
                {{
                  current.evidenceUploadedAt
                    | date:'dd/MM/yyyy HH:mm'
                }}
              </b>
            </span>

          }

          @if (current.verifiedAt) {

            <span>
              Verificada:
              <b>
                {{
                  current.verifiedAt
                    | date:'dd/MM/yyyy HH:mm'
                }}
              </b>
            </span>

          }

          @if (current.rejectedAt) {

            <span>
              Rechazada:
              <b>
                {{
                  current.rejectedAt
                    | date:'dd/MM/yyyy HH:mm'
                }}
              </b>
            </span>

          }

          @if (current.rejectionReason) {

            <span>
              Motivo:
              <b>
                {{ current.rejectionReason }}
              </b>
            </span>

          }

        </div>

        <div class="actions">

          <button
            type="button"
            class="secondary"
            (click)="viewEvidence()"
            [disabled]="evidenceLoading()">

            {{
              evidenceLoading()
                ? 'Cargando...'
                : 'Ver comprobante'
            }}

          </button>

          <button
            type="button"
            class="secondary"
            (click)="downloadEvidence()"
            [disabled]="evidenceLoading()">

            Descargar comprobante

          </button>

          @if (current.paymentStatus === 'PENDING') {

            <button
              type="button"
              (click)="openConfirmation()">

              Pago realizado

            </button>

            <button
              type="button"
              class="danger"
              (click)="openRejection()">

              Rechazar pago

            </button>

          }

        </div>

        @if (previewUrl()) {

          <div class="preview">

            <div>
              <b>
                Comprobante registrado
              </b>

              <button
                type="button"
                class="secondary"
                (click)="closePreview()">

                Cerrar

              </button>
            </div>

            <img
              [src]="previewUrl()"
              alt="Evidencia del pago"
            />

          </div>
        }

        @if (current.paymentStatus === 'PAID') {

          <div class="success-box">
            Pago confirmado. La confirmación quedó registrada
            con fecha y especialista responsable.
          </div>

        }

        @if (current.paymentStatus === 'REJECTED') {

          <div class="rejected-box">
            <b>Pago rechazado.</b>

            @if (current.rejectionReason) {
              <span>
                {{ current.rejectionReason }}
              </span>
            }

            <small>
              El paciente puede registrar una nueva evidencia
              para una nueva verificación.
            </small>
          </div>

        }

      } @else {

        <div class="notice-box">
          El paciente todavía no ha registrado
          una evidencia de pago.
        </div>

      }

    </section>

    @if (confirmationOpen() && payment(); as current) {

      <div
        class="modal-backdrop"
        (click)="closeConfirmation()">

        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-confirm-title"
          (click)="$event.stopPropagation()">

          <div class="warning-icon">
            !
          </div>

          <h3 id="payment-confirm-title">
            Confirmar pago realizado
          </h3>

          <div class="critical-warning">

            USTED DEBE VERIFICAR CORRECTAMENTE EL PAGO.
            MEDICDRIVE NO SE RESPONSABILIZA POR CONFIRMACIONES
            REALIZADAS SIN HABER COMPROBADO PREVIAMENTE
            LA RECEPCIÓN DEL DINERO.

          </div>

          <p>
            Verifique la imagen o comprobante contra la recepción
            real en Yape, Plin, banco, efectivo o el medio utilizado.
          </p>

          <div class="modal-total">

            <span>Total final</span>

            <strong>
              S/
              {{ current.totalAmount | number:'1.2-2' }}
            </strong>

            <small>
              {{ methodLabel(current.paymentMethod) }}
            </small>

          </div>

          <div class="actions">

            <button
              type="button"
              class="secondary"
              (click)="closeConfirmation()"
              [disabled]="confirming()">

              Cancelar

            </button>

            <button
              type="button"
              (click)="confirmPayment()"
              [disabled]="confirming()">

              {{
                confirming()
                  ? 'Confirmando...'
                  : 'Confirmar pago realizado'
              }}

            </button>

          </div>

        </section>

      </div>

    }

    @if (rejectionOpen() && payment(); as current) {

      <div
        class="modal-backdrop"
        (click)="closeRejection()">

        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-reject-title"
          (click)="$event.stopPropagation()">

          <div class="warning-icon">
            !
          </div>

          <h3 id="payment-reject-title">
            Rechazar pago
          </h3>

          <div class="critical-warning">
            RECHACE EL PAGO SOLO SI LA EVIDENCIA NO COINCIDE
            CON EL DINERO REALMENTE RECIBIDO.
          </div>

          <p>
            El paciente podrá registrar una nueva evidencia.
            El intento rechazado quedará conservado
            en el historial de auditoría.
          </p>

          <div class="modal-total">
            <span>Total declarado</span>

            <strong>
              S/
              {{ current.totalAmount | number:'1.2-2' }}
            </strong>

            <small>
              {{ methodLabel(current.paymentMethod) }}
            </small>
          </div>

          <label class="rejection-field">
            Motivo del rechazo

            <textarea
              maxlength="500"
              rows="4"
              [value]="rejectionReason()"
              (input)="onRejectionReasonInput($event)"
              placeholder="Explique por qué el comprobante o pago no puede ser validado."
            ></textarea>

            <small>
              {{ rejectionReason().length }}/500
            </small>
          </label>

          <div class="actions">

            <button
              type="button"
              class="secondary"
              (click)="closeRejection()"
              [disabled]="rejecting()">

              Cancelar

            </button>

            <button
              type="button"
              class="danger"
              (click)="rejectPayment()"
              [disabled]="
                rejecting()
                || !rejectionReason().trim()
              ">

              {{
                rejecting()
                  ? 'Rechazando...'
                  : 'Confirmar rechazo'
              }}

            </button>

          </div>

        </section>

      </div>

    }
  `,

  styles: [`
    .payment-card {
      display: grid;
      gap: 16px;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      padding: 18px;
      background: #f8fbff;
    }

    .payment-heading {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }

    .payment-heading span,
    .economic-grid span {
      color: #64748b;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .payment-heading h4 {
      margin: 5px 0;
      color: #102033;
      font-size: 20px;
    }

    .payment-heading p,
    .modal p {
      margin: 0;
      color: #475569;
      line-height: 1.5;
    }

    .status {
      border-radius: 999px;
      padding: 8px 12px;
      white-space: nowrap;
      font-size: 12px;
    }

    .pending {
      color: #92400e;
      background: #fef3c7;
    }

    .paid {
      color: #166534;
      background: #dcfce7;
    }

    .rejected {
      color: #991b1b;
      background: #fee2e2;
    }

    .economic-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .economic-grid article {
      border-radius: 14px;
      padding: 13px;
      background: white;
    }

    .economic-grid strong {
      display: block;
      margin-top: 5px;
      color: #102033;
      font-size: 18px;
    }

    .economic-grid .total-card {
      background: #dbeafe;
    }

    .economic-grid .total-card strong {
      color: #1d4ed8;
      font-size: 22px;
    }

    .payment-info {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      color: #475569;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    button {
      border: 0;
      border-radius: 14px;
      padding: 12px 15px;
      color: white;
      background: #0f766e;
      font-weight: 900;
      cursor: pointer;
    }

    button:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    .secondary {
      color: #0f766e;
      background: #ccfbf1;
    }

    .danger {
      color: white;
      background: #dc2626;
    }

    .danger:hover {
      background: #b91c1c;
    }

    .preview {
      display: grid;
      gap: 12px;
      border-radius: 16px;
      padding: 13px;
      color: white;
      background: #0f172a;
    }

    .preview > div {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
    }

    .preview img {
      display: block;
      max-width: 100%;
      max-height: 520px;
      margin: auto;
      border-radius: 12px;
      object-fit: contain;
      background: white;
    }

    .error-box,
    .success-box,
    .notice-box {
      border-radius: 14px;
      padding: 13px;
      font-weight: 800;
    }

    .error-box {
      color: #991b1b;
      background: #fee2e2;
    }

    .success-box {
      color: #166534;
      background: #dcfce7;
    }

    .notice-box {
      color: #64748b;
      background: #f1f5f9;
    }

    .modal-backdrop {
      position: fixed;
      z-index: 3000;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(15, 23, 42, .70);
    }

    .modal {
      display: grid;
      gap: 16px;
      width: min(560px, 100%);
      box-sizing: border-box;
      border-radius: 24px;
      padding: 26px;
      background: white;
      box-shadow: 0 30px 80px rgba(15, 23, 42, .30);
    }

    .modal h3 {
      margin: 0;
    }

    .warning-icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      color: #991b1b;
      background: #fee2e2;
      font-size: 26px;
      font-weight: 900;
    }

    .critical-warning {
      border-left: 5px solid #dc2626;
      border-radius: 12px;
      padding: 14px;
      color: #991b1b;
      background: #fef2f2;
      font-weight: 900;
      line-height: 1.55;
    }

    .modal-total {
      display: grid;
      gap: 4px;
      border-radius: 14px;
      padding: 14px;
      background: #f8fafc;
    }

    .modal-total strong {
      color: #0f766e;
      font-size: 25px;
    }

    .rejection-field {
      display: grid;
      gap: 7px;
      color: #334155;
      font-weight: 900;
    }

    .rejection-field textarea {
      box-sizing: border-box;
      width: 100%;
      resize: vertical;
      border: 1px solid #cbd5e1;
      border-radius: 13px;
      padding: 12px;
      font: inherit;
      background: white;
    }

    .rejection-field small {
      justify-self: end;
      color: #64748b;
    }

    .rejected-box {
      display: grid;
      gap: 6px;
      border-radius: 14px;
      padding: 13px;
      color: #991b1b;
      background: #fee2e2;
    }

    .rejected-box small {
      color: #7f1d1d;
      font-weight: 700;
    }

    @media (max-width: 850px) {

      .payment-heading {
        flex-direction: column;
      }

      .economic-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SpecialistManualPaymentComponent
  implements OnInit, OnDestroy {

  private readonly paymentService =
    inject(SpecialistManualPaymentService);

  @Input({ required: true })
  requestId!: number;

  payment = signal<ManualPayment | null>(null);

  loading = signal(false);
  evidenceLoading = signal(false);
  confirming = signal(false);
  rejecting = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  previewUrl = signal<string | null>(null);

  confirmationOpen = signal(false);
  rejectionOpen = signal(false);
  rejectionReason = signal('');

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  load(): void {

    this.loading.set(true);
    this.errorMessage.set('');

    this.paymentService
      .find(this.requestId)
      .pipe(
        finalize(
          () => this.loading.set(false)
        )
      )
      .subscribe({

        next: (payment) => {
          this.payment.set(payment);
        },

        error: (error: unknown) => {

          if (this.statusCode(error) === 404) {
            this.payment.set(null);
            return;
          }

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo consultar el pago.'
            )
          );
        }
      });
  }

  viewEvidence(): void {

    this.errorMessage.set('');
    this.evidenceLoading.set(true);

    this.paymentService
      .evidence(this.requestId)
      .pipe(
        finalize(
          () => this.evidenceLoading.set(false)
        )
      )
      .subscribe({

        next: (blob) => {

          this.revokePreview();

          this.previewUrl.set(
            URL.createObjectURL(blob)
          );
        },

        error: (error: unknown) => {

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo abrir el comprobante.'
            )
          );
        }
      });
  }

  closePreview(): void {
    this.revokePreview();
  }

  downloadEvidence(): void {

    const current = this.payment();

    if (!current) {
      return;
    }

    this.errorMessage.set('');
    this.evidenceLoading.set(true);

    this.paymentService
      .evidence(this.requestId)
      .pipe(
        finalize(
          () => this.evidenceLoading.set(false)
        )
      )
      .subscribe({

        next: (blob) => {

          const url =
            URL.createObjectURL(blob);

          const anchor =
            document.createElement('a');

          anchor.href = url;

          anchor.download =
            current.evidenceFileName
            || 'comprobante-pago';

          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();

          setTimeout(
            () => URL.revokeObjectURL(url),
            1000
          );
        },

        error: (error: unknown) => {

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo descargar el comprobante.'
            )
          );
        }
      });
  }

  openConfirmation(): void {

    const current = this.payment();

    if (
      !current
      || current.paymentStatus !== 'PENDING'
    ) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    this.confirmationOpen.set(true);
  }

  closeConfirmation(): void {

    if (this.confirming()) {
      return;
    }

    this.confirmationOpen.set(false);
  }

  confirmPayment(): void {

    const current = this.payment();

    if (
      !current
      || current.paymentStatus !== 'PENDING'
    ) {
      return;
    }

    this.confirming.set(true);
    this.errorMessage.set('');

    this.paymentService
      .confirm(this.requestId)
      .pipe(
        finalize(
          () => this.confirming.set(false)
        )
      )
      .subscribe({

        next: (updated) => {

          this.payment.set(updated);
          this.confirmationOpen.set(false);

          this.successMessage.set(
            'Pago realizado confirmado correctamente.'
          );
        },

        error: (error: unknown) => {

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo confirmar el pago.'
            )
          );
        }
      });
  }

  openRejection(): void {

    const current = this.payment();

    if (
      !current
      || current.paymentStatus !== 'PENDING'
    ) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.rejectionReason.set('');
    this.rejectionOpen.set(true);
  }

  closeRejection(): void {

    if (this.rejecting()) {
      return;
    }

    this.rejectionOpen.set(false);
    this.rejectionReason.set('');
  }

  onRejectionReasonInput(
    event: Event
  ): void {

    const textarea =
      event.target as HTMLTextAreaElement;

    this.rejectionReason.set(
      textarea.value.slice(0, 500)
    );
  }

  rejectPayment(): void {

    const current = this.payment();

    const reason =
      this.rejectionReason().trim();

    if (
      !current
      || current.paymentStatus !== 'PENDING'
    ) {
      return;
    }

    if (!reason) {

      this.errorMessage.set(
        'Ingrese el motivo del rechazo.'
      );

      return;
    }

    this.rejecting.set(true);
    this.errorMessage.set('');

    this.paymentService
      .reject(
        this.requestId,
        reason
      )
      .pipe(
        finalize(
          () => this.rejecting.set(false)
        )
      )
      .subscribe({

        next: (updated) => {

          this.payment.set(updated);

          this.rejectionOpen.set(false);
          this.rejectionReason.set('');

          this.successMessage.set(
            'Pago rechazado correctamente. El paciente puede registrar una nueva evidencia.'
          );
        },

        error: (error: unknown) => {

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo rechazar el pago.'
            )
          );
        }
      });
  }

  methodLabel(
    value?: string | null
  ): string {

    const labels: Record<string, string> = {
      YAPE: 'Yape',
      PLIN: 'Plin',
      TRANSFER: 'Transferencia bancaria',
      CASH: 'Efectivo'
    };

    return labels[value ?? '']
      ?? value
      ?? 'No definido';
  }

  statusLabel(
    value?: string | null
  ): string {

    if (value === 'PAID') {
      return 'Pago realizado';
    }

    if (value === 'PENDING') {
      return 'Pendiente de verificación';
    }

    if (value === 'REJECTED') {
      return 'Pago rechazado';
    }

    return value ?? 'Sin pago';
  }

  private revokePreview(): void {

    const current = this.previewUrl();

    if (current) {
      URL.revokeObjectURL(current);
    }

    this.previewUrl.set(null);
  }

  private statusCode(
    error: unknown
  ): number {

    const response =
      error as {
        status?: number;
      };

    return Number(
      response.status ?? 0
    );
  }

  private extractErrorMessage(
    error: unknown,
    fallback: string
  ): string {

    const response =
      error as {
        error?:
          | string
          | {
              message?: string;
              detail?: string;
            };
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
      && response.error
    ) {
      return (
        response.error.message
        ?? response.error.detail
        ?? fallback
      );
    }

    return response.message ?? fallback;
  }
}
