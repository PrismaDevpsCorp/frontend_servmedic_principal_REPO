import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MedicalRequestAdditional
} from '../models/medical-request-additional.model';

@Injectable({
  providedIn: 'root'
})
export class PatientMedicalRequestAdditionalService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    environment.apiUrl
    + '/patient/medical-requests';

  list(
    medicalRequestId: number
  ): Observable<MedicalRequestAdditional[]> {
    return this.http.get<MedicalRequestAdditional[]>(
      this.buildRequestUrl(medicalRequestId)
    );
  }

  approve(
    medicalRequestId: number,
    additionalId: number
  ): Observable<MedicalRequestAdditional> {
    return this.http.patch<MedicalRequestAdditional>(
      this.buildRequestUrl(medicalRequestId)
        + '/'
        + additionalId
        + '/approve',
      {}
    );
  }

  reject(
    medicalRequestId: number,
    additionalId: number
  ): Observable<MedicalRequestAdditional> {
    return this.http.patch<MedicalRequestAdditional>(
      this.buildRequestUrl(medicalRequestId)
        + '/'
        + additionalId
        + '/reject',
      {}
    );
  }

  private buildRequestUrl(
    medicalRequestId: number
  ): string {
    return (
      this.baseUrl
      + '/'
      + medicalRequestId
      + '/additionals'
    );
  }
}