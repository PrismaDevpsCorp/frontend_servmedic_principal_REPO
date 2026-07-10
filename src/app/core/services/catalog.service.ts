import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalServiceOption } from '../models/medical-service.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/public/catalog';

  listServices(): Observable<MedicalServiceOption[]> {
    return this.http.get<MedicalServiceOption[]>(this.baseUrl + '/services')
      .pipe(
        map((items) => items.map((item) => this.normalizeService(item)))
      );
  }

  private normalizeService(item: MedicalServiceOption): MedicalServiceOption {
    return {
      ...item,
      code: item.code,
      name: item.name,
      description: item.description ?? null,
      professionCode: item.professionCode ?? null,
      professionName: item.professionName ?? null,
      requiresPrescription: item.requiresPrescription ?? false
    };
  }
}