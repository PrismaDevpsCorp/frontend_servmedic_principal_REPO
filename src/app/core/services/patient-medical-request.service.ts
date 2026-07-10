import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalRequest } from '../models/medical-request.model';

export interface CreatePatientMedicalRequestPayload {
  serviceCode: string;
  addressText: string;
  addressReference?: string | null;
  latitude: number;
  longitude: number;
  prescriptionImageUrl?: string | null;
  patientNotes?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PatientMedicalRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/patient/medical-requests';

  list(status?: string): Observable<MedicalRequest[]> {
    let params = new HttpParams();

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<MedicalRequest[] | { value: MedicalRequest[] }>(this.baseUrl, { params })
      .pipe(map((response) => Array.isArray(response) ? response : response.value ?? []));
  }

  findById(id: number): Observable<MedicalRequest> {
    return this.http.get<MedicalRequest>(this.baseUrl + '/' + id);
  }

  create(payload: CreatePatientMedicalRequestPayload): Observable<MedicalRequest> {
    return this.http.post<MedicalRequest>(this.baseUrl, payload);
  }
}