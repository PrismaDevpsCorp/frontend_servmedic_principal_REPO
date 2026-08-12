import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ManualPayment } from '../models/manual-payment.model';

@Injectable({
  providedIn: 'root'
})
export class SpecialistManualPaymentService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    environment.apiUrl
    + '/specialist/medical-requests';

  find(
    requestId: number
  ): Observable<ManualPayment> {

    return this.http.get<ManualPayment>(
      this.baseUrl
      + '/'
      + requestId
      + '/payment'
    );
  }

  evidence(
    requestId: number
  ): Observable<Blob> {

    return this.http.get(
      this.baseUrl
      + '/'
      + requestId
      + '/payment/evidence',
      {
        responseType: 'blob'
      }
    );
  }

  confirm(
    requestId: number
  ): Observable<ManualPayment> {

    return this.http.patch<ManualPayment>(
      this.baseUrl
      + '/'
      + requestId
      + '/payment/confirm',
      {
        warningAcknowledged: true
      }
    );
  }
}
