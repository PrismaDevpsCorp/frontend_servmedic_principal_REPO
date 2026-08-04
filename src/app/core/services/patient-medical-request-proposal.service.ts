import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalRequestProposal } from '../models/medical-request-proposal.model';

@Injectable({
  providedIn: 'root'
})
export class PatientMedicalRequestProposalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    environment.apiUrl + '/patient/medical-requests';

  list(
    medicalRequestId: number
  ): Observable<MedicalRequestProposal[]> {
    return this.http.get<MedicalRequestProposal[]>(
      this.proposalUrl(medicalRequestId)
    );
  }

  accept(
    medicalRequestId: number,
    proposalId: number
  ): Observable<MedicalRequestProposal> {
    return this.http.patch<MedicalRequestProposal>(
      this.proposalUrl(medicalRequestId)
        + '/'
        + proposalId
        + '/accept',
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