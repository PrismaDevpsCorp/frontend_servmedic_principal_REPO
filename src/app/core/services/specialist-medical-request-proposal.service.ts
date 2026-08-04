import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMedicalRequestProposalPayload,
  MedicalRequestProposal
} from '../models/medical-request-proposal.model';

@Injectable({
  providedIn: 'root'
})
export class SpecialistMedicalRequestProposalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    environment.apiUrl + '/specialist/medical-requests';

  list(
    medicalRequestId: number
  ): Observable<MedicalRequestProposal[]> {
    return this.http.get<MedicalRequestProposal[]>(
      this.proposalUrl(medicalRequestId)
    );
  }

  create(
    medicalRequestId: number,
    payload: CreateMedicalRequestProposalPayload
  ): Observable<MedicalRequestProposal> {
    return this.http.post<MedicalRequestProposal>(
      this.proposalUrl(medicalRequestId),
      payload
    );
  }

  withdraw(
    medicalRequestId: number,
    proposalId: number
  ): Observable<MedicalRequestProposal> {
    return this.http.patch<MedicalRequestProposal>(
      this.proposalUrl(medicalRequestId)
        + '/'
        + proposalId
        + '/withdraw',
      {}
    );
  }

  private proposalUrl(
    medicalRequestId: number
  ): string {
    return (
      this.baseUrl
      + '/'
      + medicalRequestId
      + '/proposals'
    );
  }
}