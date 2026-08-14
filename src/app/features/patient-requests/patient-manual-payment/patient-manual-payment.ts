import {
  CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ManualPayment } from '../../../core/models/manual-payment.model';

import {
  PatientManualPaymentService
} from '../../../core/services/patient-manual-payment.service';

@Component({
  selector: 'app-patient-manual-payment',

  imports: [
    CommonModule,
    FormsModule
  ],

  template: `
    <section
      class="payment-card"
      [class.payment-collapsed]="!paymentDetailsExpanded()">

      <div class="payment-heading">
        <div>
          <span>Pago de la atención</span>

          <h4>
            Pago directo al especialista
          </h4>

          <p>
            MedicDrive no recibe ni custodia su dinero.
            El pago se realiza directamente al especialista.
          </p>
        </div>

        @if (payment(); as current) {
          <b
            class="status"
            [class.pending]="current.paymentStatus === 'PENDING'"
            [class.paid]="current.paymentStatus === 'PAID'">

            {{ statusLabel(current.paymentStatus) }}

          </b>
        }
      </div>

            <button
        type="button"
        class="patient-payment-toggle"
        (click)="togglePaymentDetails()"
        [attr.aria-expanded]="paymentDetailsExpanded()"
        [attr.aria-controls]="
          'patient-payment-details-' + requestId
        ">

        {{
          paymentDetailsExpanded()
            ? 'OCULTAR PAGO'
            : payment()?.paymentStatus === 'PAID'
              ? 'VER PAGO REALIZADO'
              : 'VER PAGO'
        }}
      </button>
<div
        class="patient-payment-details"
        [attr.id]="
          'patient-payment-details-' + requestId
        ">


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
            <span>Adicionales aprobados</span>

            <strong>
              S/
              {{ current.additionalAmount | number:'1.2-2' }}
            </strong>
          </article>

          <article class="total-card">
            <span>Total pagado</span>

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

          @if (current.paidAt) {
            <span>
              Confirmada:
              <b>
                {{
                  current.paidAt
                    | date:'dd/MM/yyyy HH:mm'
                }}
              </b>
            </span>
          }

        </div>

        @if (current.paymentStatus === 'PENDING') {
          <div class="pending-box">
            Evidencia registrada. El especialista debe verificar
            realmente la recepción del dinero antes de confirmar.
          </div>
        }

        @if (current.paymentStatus === 'PAID') {
          <div class="success-box">
            Pago realizado y confirmado por el especialista.
          </div>
        }

      } @else {

        <div class="total-before-payment">

          <span>
            Total final de la atención
          </span>

          <strong>
            S/
            {{ expectedTotal | number:'1.2-2' }}
          </strong>

        </div>

        <p class="instruction">
          Realice el pago directamente a
          <b>
            {{ specialistName || 'su especialista' }}
          </b>
          y luego registre aquí la evidencia.
        </p>

        <div class="payment-form">

          <label>
            Método utilizado

            <select [(ngModel)]="paymentMethod">

              <option value="YAPE">
                Yape
              </option>

              <option value="PLIN">
                Plin
              </option>

              <option value="TRANSFER">
                Transferencia bancaria
              </option>

              <option value="CASH">
                Efectivo
              </option>

            </select>
          </label>

          <label>
            Número de operación / referencia

            <input
              type="text"
              maxlength="120"
              [(ngModel)]="externalTransactionId"
              placeholder="Opcional"
            />
          </label>

          <label class="evidence-field">
            Evidencia del pago

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              (change)="selectEvidence($event)"
            />

            <small>
              JPG, PNG o WEBP. Máximo 5 MB.
              Para efectivo adjunte una foto o constancia.
            </small>

            @if (selectedFileName()) {
              <b>
                {{ selectedFileName() }}
              </b>
            }

          </label>

          <button
            type="button"
            (click)="register()"
            [disabled]="saving() || !selectedFileName()">

            {{
              saving()
                ? 'Registrando pago...'
                : 'Registrar pago y evidencia'
            }}

          </button>

        </div>
      }


      </div>

</section>
  `,

  styles: [`
    .payment-card {
      display: grid;
      gap: 16px;
      border: 1px solid #99f6e4;
      border-radius: 20px;
      padding: 18px;
      background: #f8fffe;
    }

    .payment-heading {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }

    .payment-heading span,
    .economic-grid span,
    .total-before-payment span {
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
    .instruction {
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
      background: #ccfbf1;
    }

    .economic-grid .total-card strong {
      color: #0f766e;
      font-size: 22px;
    }

    .payment-info {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      color: #475569;
    }

    .total-before-payment {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      border-radius: 14px;
      padding: 14px;
      background: #ccfbf1;
    }

    .total-before-payment strong {
      color: #0f766e;
      font-size: 23px;
    }

    .payment-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .payment-form label {
      display: grid;
      gap: 7px;
      color: #334155;
      font-weight: 900;
    }

    .payment-form input,
    .payment-form select {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 13px;
      padding: 12px;
      background: white;
    }

    .evidence-field,
    .payment-form button {
      grid-column: 1 / -1;
    }

    .evidence-field small {
      color: #64748b;
      font-weight: 700;
    }

    .payment-form button {
      border: 0;
      border-radius: 14px;
      padding: 13px 16px;
      color: white;
      background: #0f766e;
      font-weight: 900;
      cursor: pointer;
    }

    .payment-form button:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    .error-box,
    .success-box,
    .notice-box,
    .pending-box {
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

    .pending-box {
      color: #92400e;
      background: #fef3c7;
    }

    @media (max-width: 850px) {

      .payment-heading {
        flex-direction: column;
      }

      .economic-grid,
      .payment-form {
        grid-template-columns: 1fr;
      }

      .evidence-field,
      .payment-form button {
        grid-column: auto;
      }
    }

/* B38.4-C3-H3-B1 - pago confirmado realmente colapsable */

.patient-payment-collapsed-summary {
  display: none;
}

.payment-card.payment-collapsed
  > .payment-heading,
.payment-card.payment-collapsed
  > .patient-payment-details {
  display: none;
}

.payment-card.payment-collapsed
  > .patient-payment-collapsed-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  background: #f0fdf4;
}

.patient-payment-summary-main {
  display: grid;
  gap: 4px;
}

.patient-payment-summary-main > span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
}

.patient-payment-summary-main > strong {
  color: #166534;
  font-size: 1.15rem;
}

.patient-payment-summary-main > small {
  color: #475569;
}

.patient-payment-summary-confirmation {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.patient-payment-summary-confirmation > b {
  padding: 6px 10px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 0.76rem;
}

.patient-payment-summary-confirmation > small {
  color: #64748b;
}

/* B38.4-C3-H6-R2B2 - pago compacto desktop, movil preservado */
.patient-payment-toggle {
  display: inline-flex;
  width: auto;
  min-width: 0;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  margin: 3px 0;
  border: 1px solid #0f766e;
  border-radius: 8px;
  padding: 5px 10px;
  background: #f0fdfa;
  color: #0f766e;
  font-size: 0.78rem;
  line-height: 1.2;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
}

.patient-payment-toggle:hover {
  background: #ccfbf1;
}

@media (max-width: 760px) {

  .payment-card.payment-collapsed
    > .patient-payment-collapsed-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .patient-payment-summary-confirmation {
    justify-items: start;
  }

  .patient-payment-toggle {
    width: 100%;
    min-height: 44px;
    margin: 10px 0;
    padding: 9px 14px;
    font-size: inherit;
    white-space: normal;
  }
}
`]
})
export class PatientManualPaymentComponent
  implements OnInit {

  paymentDetailsExpanded =
    signal(false);


  private readonly paymentService =
    inject(PatientManualPaymentService);

  @Input({ required: true })
  requestId!: number;

  @Input()
  expectedTotal = 0;

  @Input()
  specialistName = '';

  payment = signal<ManualPayment | null>(null);

  loading = signal(false);
  saving = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  selectedFileName = signal('');

  paymentMethod = 'YAPE';
  externalTransactionId = '';

  private selectedFile: File | null = null;

  ngOnInit(): void {
    this.load();
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

  selectEvidence(
    event: Event
  ): void {

    this.errorMessage.set('');

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ?? null;

    this.selectedFile = null;
    this.selectedFileName.set('');

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {

      input.value = '';

      this.errorMessage.set(
        'Seleccione una imagen JPG, PNG o WEBP.'
      );

      return;
    }

    if (file.size > 5 * 1024 * 1024) {

      input.value = '';

      this.errorMessage.set(
        'La evidencia no puede superar 5 MB.'
      );

      return;
    }

    this.selectedFile = file;
    this.selectedFileName.set(file.name);
  }

  register(): void {

    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.selectedFile) {

      this.errorMessage.set(
        'Adjunte la evidencia del pago.'
      );

      return;
    }

    this.saving.set(true);

    this.paymentService
      .register(
        this.requestId,
        this.paymentMethod,
        this.externalTransactionId,
        this.selectedFile
      )
      .pipe(
        finalize(
          () => this.saving.set(false)
        )
      )
      .subscribe({

        next: (payment) => {

          this.payment.set(payment);

          this.selectedFile = null;
          this.selectedFileName.set('');

          this.successMessage.set(
            'Pago registrado. Queda pendiente de verificación por el especialista.'
          );
        },

        error: (error: unknown) => {

          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'No se pudo registrar el pago.'
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

    return value ?? 'Sin pago';
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

  togglePaymentDetails(): void {

    this.paymentDetailsExpanded.update(
      (expanded) => !expanded
    );
  }

}
