import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SpecialistCommercialProfile,
  SpecialistPaymentSetting,
  UpdateSpecialistCommercialProfileRequest,
  UpdateSpecialistPaymentSettingRequest
} from '../models/specialist-commercial-profile.model';

@Injectable({
  providedIn: 'root'
})
export class SpecialistCommercialProfileService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    environment.apiUrl + '/specialist/commercial-profile';

  private readonly paymentSettingsUrl =
    this.baseUrl + '/payment-settings';

  getProfile(): Observable<SpecialistCommercialProfile> {
    return this.http.get<SpecialistCommercialProfile>(
      this.baseUrl
    );
  }

  updateProfile(
    request: UpdateSpecialistCommercialProfileRequest
  ): Observable<SpecialistCommercialProfile> {
    return this.http.put<SpecialistCommercialProfile>(
      this.baseUrl,
      request
    );
  }

  getPaymentSettings(): Observable<SpecialistPaymentSetting[]> {
    return this.http.get<SpecialistPaymentSetting[]>(
      this.paymentSettingsUrl
    );
  }

  updatePaymentSettings(
    request: UpdateSpecialistPaymentSettingRequest[]
  ): Observable<SpecialistPaymentSetting[]> {
    return this.http.put<SpecialistPaymentSetting[]>(
      this.paymentSettingsUrl,
      request
    );
  }
}
