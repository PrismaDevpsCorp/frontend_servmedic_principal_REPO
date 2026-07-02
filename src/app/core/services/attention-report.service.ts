import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttentionReport, SaveAttentionReportRequest } from '../models/attention-report.model';

@Injectable({
  providedIn: 'root'
})
export class AttentionReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/specialist/medical-requests';

  findByMedicalRequestId(requestId: number): Observable<AttentionReport | null> {
    return this.http
      .get<AttentionReport>(this.baseUrl + '/' + requestId + '/attention-report')
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }

          return throwError(() => error);
        })
      );
  }

  save(requestId: number, body: SaveAttentionReportRequest): Observable<AttentionReport> {
    return this.http.put<AttentionReport>(
      this.baseUrl + '/' + requestId + '/attention-report',
      body
    );
  }
}