import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalRequest } from '../models/medical-request.model';

type MedicalRequestApiResponse = MedicalRequest[] | MedicalRequest | null;

@Injectable({
  providedIn: 'root'
})
export class SpecialistMedicalRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/specialist/medical-requests';

  listPending(): Observable<MedicalRequest[]> {
    return this.http
      .get<MedicalRequestApiResponse>(this.baseUrl + '/pending')
      .pipe(map((response) => this.toArray(response)));
  }

  listAssigned(status?: string): Observable<MedicalRequest[]> {
    const url = status
      ? this.baseUrl + '/assigned?status=' + encodeURIComponent(status)
      : this.baseUrl + '/assigned';

    return this.http
      .get<MedicalRequestApiResponse>(url)
      .pipe(map((response) => this.toArray(response)));
  }

  accept(requestId: number): Observable<MedicalRequest> {
    return this.http.patch<MedicalRequest>(this.baseUrl + '/' + requestId + '/accept', {});
  }

  startRoute(requestId: number): Observable<MedicalRequest> {
    return this.http.patch<MedicalRequest>(this.baseUrl + '/' + requestId + '/start-route', {});
  }

  startAttention(requestId: number): Observable<MedicalRequest> {
    return this.http.patch<MedicalRequest>(this.baseUrl + '/' + requestId + '/start-attention', {});
  }

  finish(requestId: number): Observable<MedicalRequest> {
    return this.http.patch<MedicalRequest>(this.baseUrl + '/' + requestId + '/finish', {});
  }

  private toArray(response: MedicalRequestApiResponse): MedicalRequest[] {
    if (!response) {
      return [];
    }

    return Array.isArray(response) ? response : [response];
  }
}