import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  SpecialistFinancialDashboardResponse,
  SpecialistFinancialOperation
} from '../../core/models/specialist-financial-dashboard.model';

import {
  SpecialistFinancialDashboardService
} from '../../core/services/specialist-financial-dashboard.service';

@Component({
  selector: 'app-specialist-financial-dashboard',
  imports: [CommonModule],
  template: `
    <section class="financial-panel">

      <div class="financial-heading">
        <div>
          <p>Gestión financiera</p>
          <h3>Resumen económico del especialista</h3>
          <span>
            Pagos directos registrados por MedicDrive.
            La plataforma no custodia el dinero.
          </span>
        </div>

        <button
          type="button"
          (click)="load(page())"
          [disabled]="loading()"
        >
          {{ loading() ? 'Actualizando...' : 'Actualizar finanzas' }}
        </button>
      </div>

      @if (errorMessage()) {
        <div class="financial-error">
          {{ errorMessage() }}
        </div>
      }

      @if (summary(); as financial) {

        <div class="financial-kpis">

          <article class="financial-card primary">
            <span>Total cobrado confirmado</span>
            <strong>
              S/
              {{ financial.paidTotalAmount | number:'1.2-2' }}
            </strong>
            <small>
              {{ financial.paidOperations }}
              atención(es) con pago confirmado.
            </small>
          </article>

          <article class="financial-card">
            <span>Neto del especialista</span>
            <strong>
              S/
              {{ financial.specialistNetAmount | number:'1.2-2' }}
            </strong>
            <small>
              Total confirmado menos comisión MedicDrive.
            </small>
          </article>

          <article class="financial-card">
            <span>Comisión MedicDrive</span>
            <strong>
              S/
              {{ financial.platformCommissionAmount | number:'1.2-2' }}
            </strong>
            <small>
              {{ financial.platformCommissionPercent | number:'1.0-2' }}%
              solo sobre la consulta base.
            </small>
          </article>

          <article class="financial-card">
            <span>Consulta base confirmada</span>
            <strong>
              S/
              {{ financial.paidServiceAmount | number:'1.2-2' }}
            </strong>
            <small>
              Única base utilizada para calcular comisión.
            </small>
          </article>

        </div>

        <div class="financial-breakdown">

          <article>
            <span>Movilidad confirmada</span>
            <b>
              S/
              {{ financial.paidMobilityAmount | number:'1.2-2' }}
            </b>
          </article>

          <article>
            <span>Adicionales confirmados</span>
            <b>
              S/
              {{ financial.paidAdditionalAmount | number:'1.2-2' }}
            </b>
          </article>

          <article>
            <span>Pendientes</span>
            <b>{{ financial.pendingOperations }}</b>
          </article>

          <article>
            <span>Rechazados</span>
            <b>{{ financial.rejectedOperations }}</b>
          </article>

          <article>
            <span>Operaciones registradas</span>
            <b>{{ financial.totalOperations }}</b>
          </article>

        </div>
      }

      <div class="financial-note">
        <b>Modelo no custodial.</b>
        El paciente paga directamente al especialista.
        Los importes representan registros de negocio y trazabilidad;
        no una billetera administrada por MedicDrive.
      </div>

      <div class="ledger-heading">
        <div>
          <p>Ledger de atenciones</p>
          <h4>Detalle financiero</h4>
        </div>

        @if (dashboard(); as current) {
          <span>
            {{ current.totalElements }} operación(es)
          </span>
        }
      </div>

      @if (loading() && !dashboard()) {

        <div class="empty-state">
          Cargando información financiera...
        </div>

      } @else if (operations().length === 0) {

        <div class="empty-state">
          Aún no existen operaciones financieras para mostrar.
        </div>

      } @else {

        <div class="ledger-wrap">

          <table>
            <thead>
              <tr>
                <th>Solicitud</th>
                <th>Paciente / servicio</th>
                <th>Estado</th>
                <th>Base</th>
                <th>Movilidad</th>
                <th>Adicionales</th>
                <th>Total</th>
                <th>Comisión</th>
                <th>Neto</th>
                <th>Pago</th>
              </tr>
            </thead>

            <tbody>

              @for (
                operation of operations();
                track operation.paymentId
              ) {

                <tr>

                  <td>
                    <strong>{{ operation.requestCode }}</strong>
                    <small>#{{ operation.medicalRequestId }}</small>
                  </td>

                  <td>
                    <strong>{{ operation.patientFullName }}</strong>
                    <small>{{ operation.serviceName }}</small>
                  </td>

                  <td>
                    <span
                      class="payment-status"
                      [class.paid]="operation.paymentStatus === 'PAID'"
                      [class.pending]="operation.paymentStatus === 'PENDING'"
                      [class.rejected]="operation.paymentStatus === 'REJECTED'"
                    >
                      {{ statusLabel(operation.paymentStatus) }}
                    </span>
                  </td>

                  <td>
                    S/
                    {{ operation.serviceAmount | number:'1.2-2' }}
                  </td>

                  <td>
                    S/
                    {{ operation.mobilityAmount | number:'1.2-2' }}
                  </td>

                  <td>
                    S/
                    {{ operation.additionalAmount | number:'1.2-2' }}
                  </td>

                  <td class="money-strong">
                    S/
                    {{ operation.totalAmount | number:'1.2-2' }}
                  </td>

                  <td>
                    @if (operation.paymentStatus === 'PAID') {
                      S/
                      {{
                        operation.platformCommissionAmount
                          | number:'1.2-2'
                      }}
                    } @else {
                      <span class="not-consolidated">
                        No consolidado
                      </span>
                    }
                  </td>

                  <td>
                    @if (operation.paymentStatus === 'PAID') {
                      <strong>
                        S/
                        {{
                          operation.specialistNetAmount
                            | number:'1.2-2'
                        }}
                      </strong>
                    } @else {
                      <span class="not-consolidated">
                        No consolidado
                      </span>
                    }
                  </td>

                  <td>
                    <strong>
                      {{ paymentMethodLabel(operation.paymentMethod) }}
                    </strong>

                    @if (operation.externalTransactionId) {
                      <small>
                        Ref. {{ operation.externalTransactionId }}
                      </small>
                    }

                    <small>
                      {{
                        operationDate(operation)
                          | date:'dd/MM/yyyy HH:mm'
                      }}
                    </small>
                  </td>

                </tr>
              }

            </tbody>
          </table>

        </div>

        @if (dashboard(); as current) {

          <div class="pagination">

            <button
              type="button"
              [disabled]="loading() || current.page <= 0"
              (click)="previousPage()"
            >
              Anterior
            </button>

            <span>
              Página
              {{ current.page + 1 }}
              de
              {{ current.totalPages === 0 ? 1 : current.totalPages }}
            </span>

            <button
              type="button"
              [disabled]="
                loading()
                || current.totalPages === 0
                || current.page + 1 >= current.totalPages
              "
              (click)="nextPage()"
            >
              Siguiente
            </button>

          </div>
        }
      }

    </section>
  `,
  styles: [`
    .financial-panel {
      display: grid;
      gap: 18px;
      margin-top: 8px;
      padding: 24px;
      border: 1px solid #dbe7e5;
      border-radius: 24px;
      background: #fff;
      box-shadow: 0 16px 40px rgba(15, 118, 110, .08);
    }

    .financial-heading,
    .ledger-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
    }

    .financial-heading p,
    .ledger-heading p {
      margin: 0 0 6px;
      color: #0f766e;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .financial-heading h3,
    .ledger-heading h4 {
      margin: 0;
      color: #0f172a;
    }

    .financial-heading h3 {
      font-size: 28px;
    }

    .ledger-heading h4 {
      font-size: 21px;
    }

    .financial-heading span,
    .ledger-heading span,
    small {
      color: #64748b;
    }

    button {
      border: 0;
      border-radius: 12px;
      padding: 11px 16px;
      background: #0f766e;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    button:disabled {
      opacity: .5;
      cursor: default;
    }

    .financial-kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .financial-card {
      display: grid;
      gap: 8px;
      padding: 18px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #f8fafc;
    }

    .financial-card.primary {
      border-color: transparent;
      background: linear-gradient(135deg, #0f766e, #115e59);
      color: #fff;
    }

    .financial-card.primary span,
    .financial-card.primary small {
      color: rgba(255,255,255,.8);
    }

    .financial-card span {
      color: #475569;
      font-size: 13px;
      font-weight: 700;
    }

    .financial-card strong {
      font-size: 25px;
      letter-spacing: -.04em;
    }

    .financial-breakdown {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
    }

    .financial-breakdown article {
      padding: 13px;
      border-radius: 14px;
      background: #f1f5f9;
    }

    .financial-breakdown span,
    .financial-breakdown b {
      display: block;
    }

    .financial-breakdown span {
      margin-bottom: 5px;
      color: #64748b;
      font-size: 12px;
    }

    .financial-note {
      padding: 14px 16px;
      border-radius: 14px;
      background: #ecfeff;
      color: #155e75;
      line-height: 1.5;
    }

    .financial-error {
      padding: 13px 16px;
      border-radius: 14px;
      background: #fef2f2;
      color: #991b1b;
    }

    .ledger-wrap {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
    }

    table {
      width: 100%;
      min-width: 1120px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 13px 12px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
    }

    td {
      color: #334155;
      font-size: 13px;
    }

    td strong,
    td small {
      display: block;
    }

    td small {
      margin-top: 4px;
    }

    .money-strong {
      color: #0f172a;
      font-weight: 800;
    }

    .payment-status {
      display: inline-flex;
      padding: 6px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }

    .payment-status.paid {
      background: #dcfce7;
      color: #166534;
    }

    .payment-status.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .payment-status.rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .not-consolidated {
      color: #94a3b8;
      font-size: 12px;
    }

    .pagination {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
    }

    .empty-state {
      padding: 24px;
      border-radius: 16px;
      background: #f8fafc;
      color: #64748b;
      text-align: center;
    }

    @media (max-width: 1100px) {
      .financial-kpis {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .financial-breakdown {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .financial-panel {
        padding: 16px;
      }

      .financial-heading,
      .ledger-heading {
        flex-direction: column;
      }

      .financial-kpis,
      .financial-breakdown {
        grid-template-columns: 1fr;
      }

      .pagination {
        justify-content: space-between;
      }
    }
  `]
})
export class SpecialistFinancialDashboard {

  private readonly financialService =
    inject(SpecialistFinancialDashboardService);

  readonly dashboard =
    signal<SpecialistFinancialDashboardResponse | null>(
      null
    );

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly page = signal(0);
  readonly pageSize = 10;

  readonly summary = computed(
    () => this.dashboard()?.summary ?? null
  );

  readonly operations = computed(
    () => this.dashboard()?.operations ?? []
  );

  constructor() {
    this.load(0);
  }

  load(page: number): void {

    if (page < 0) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.financialService
      .find(
        page,
        this.pageSize
      )
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.page.set(response.page);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set(
            'No se pudo cargar la información financiera.'
          );

          this.loading.set(false);
        }
      });
  }

  previousPage(): void {
    this.load(
      Math.max(
        0,
        this.page() - 1
      )
    );
  }

  nextPage(): void {

    const current =
      this.dashboard();

    if (!current) {
      return;
    }

    const hasNext =
      current.page + 1 < current.totalPages;

    if (!hasNext) {
      return;
    }

    this.load(current.page + 1);
  }

  statusLabel(
    status: string
  ): string {

    switch (status) {
      case 'PAID':
        return 'Confirmado';

      case 'PENDING':
        return 'Pendiente';

      case 'REJECTED':
        return 'Rechazado';

      default:
        return status;
    }
  }

  paymentMethodLabel(
    method: string
  ): string {

    switch (method) {
      case 'YAPE':
        return 'Yape';

      case 'PLIN':
        return 'Plin';

      case 'TRANSFER':
        return 'Transferencia';

      case 'CASH':
        return 'Efectivo';

      default:
        return method;
    }
  }

  operationDate(
    operation: SpecialistFinancialOperation
  ): string {

    return operation.paidAt
      || operation.createdAt;
  }
}
