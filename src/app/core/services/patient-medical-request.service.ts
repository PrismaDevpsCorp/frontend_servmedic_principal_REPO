import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalRequest } from '../models/medical-request.model';

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
}