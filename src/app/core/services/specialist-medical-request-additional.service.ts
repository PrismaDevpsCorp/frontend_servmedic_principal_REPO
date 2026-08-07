import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMedicalRequestAdditionalPayload,
  MedicalRequestAdditional
} from '../models/medical-request-additional.model';

@Injectable({
  providedIn: 'root'
})
export class SpecialistMedicalRequestAdditionalService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    environment.apiUrl
    + '/specialist/medical-requests';

  list(
    medicalRequestId: number
  ): Observable<MedicalRequestAdditional[]> {
    return this.http.get<MedicalRequestAdditional[]>(
      this.buildRequestUrl(medicalRequestId)
    );
  }

  create(
    medicalRequestId: number,
    payload: CreateMedicalRequestAdditionalPayload
  ): Observable<MedicalRequestAdditional> {
    return this.http.post<MedicalRequestAdditional>(
      this.buildRequestUrl(medicalRequestId),
      payload
    );
  }

  withdraw(
    medicalRequestId: number,
    additionalId: number
  ): Observable<MedicalRequestAdditional> {
    return this.http.patch<MedicalRequestAdditional>(
      this.buildRequestUrl(medicalRequestId)
        + '/'
        + additionalId
        + '/withdraw',
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