import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ManualPayment } from '../models/manual-payment.model';

@Injectable({
  providedIn: 'root'
})
export class PatientManualPaymentService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    environment.apiUrl
    + '/patient/medical-requests';

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

  register(
    requestId: number,
    paymentMethod: string,
    externalTransactionId: string,
    evidence: File
  ): Observable<ManualPayment> {

    const formData = new FormData();

    formData.append(
      'paymentMethod',
      paymentMethod
    );

    if (externalTransactionId.trim()) {
      formData.append(
        'externalTransactionId',
        externalTransactionId.trim()
      );
    }

    formData.append(
      'evidence',
      evidence,
      evidence.name
    );

    return this.http.post<ManualPayment>(
      this.baseUrl
      + '/'
      + requestId
      + '/payment',
      formData
    );
  }
}
