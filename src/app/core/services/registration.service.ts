import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CommonRegistrationPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dni: string;
  mobilePhone: string;
  landlinePhone: string;
  addressText: string;
  addressReference: string;
  latitude: number;
  longitude: number;
}

export interface PatientRegistrationPayload
  extends CommonRegistrationPayload {
  bloodType: string;
  allergies: string;
  preexistingConditions: string;
}

export interface SpecialistRegistrationPayload
  extends CommonRegistrationPayload {
  professionCode: string;
  collegeNumber: string;
  offeredServiceCodes: string[];
}

export interface PatientRegistrationResponse {
  userId: number;
  patientProfileId: number;
  roleCode: string;
  email: string;
  fullName: string;
  dni: string;
  message: string;
}

export interface SpecialistRegistrationResponse {
  userId: number;
  specialistProfileId: number;
  roleCode: string;
  professionCode: string;
  collegeNumber: string;
  status: string;
  email: string;
  fullName: string;
  dni: string;
  offeredServiceCodes: string[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    environment.apiUrl + '/public/register';

  registerPatient(
    payload: PatientRegistrationPayload
  ): Observable<PatientRegistrationResponse> {
    return this.http.post<PatientRegistrationResponse>(
      this.baseUrl + '/patient',
      payload
    );
  }

  registerSpecialist(
    payload: SpecialistRegistrationPayload
  ): Observable<SpecialistRegistrationResponse> {
    return this.http.post<SpecialistRegistrationResponse>(
      this.baseUrl + '/specialist',
      payload
    );
  }
}