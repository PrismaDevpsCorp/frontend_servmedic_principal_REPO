import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  SpecialistFinancialDashboardResponse
} from '../models/specialist-financial-dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class SpecialistFinancialDashboardService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    environment.apiUrl
    + '/specialist/financial-dashboard';

  find(
    page = 0,
    size = 10
  ): Observable<SpecialistFinancialDashboardResponse> {

    return this.http.get<SpecialistFinancialDashboardResponse>(
      this.baseUrl
      + '?page='
      + page
      + '&size='
      + size
    );
  }
}
