import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MedicalRequest } from '../../core/models/medical-request.model';
import { SpecialistMedicalRequestService } from '../../core/services/specialist-medical-request.service';

@Component({
  selector: 'app-medical-records',
  imports: [CommonModule, DatePipe, FormsModule, RouterLink],
  templateUrl: './medical-records.html',
  styleUrl: './medical-records.scss'
})
export class MedicalRecords {
  private readonly requestService = inject(SpecialistMedicalRequestService);

  records = signal<MedicalRequest[]>([]);
  searchTerm = signal('');
  loading = signal(false);
  errorMessage = signal('');

  filteredRecords = computed(() => {
    const search = this.normalizeText(this.searchTerm());

    if (!search) {
      return this.records();
    }

    return this.records().filter((record) => this.matchesSearch(record, search));
  });

  constructor() {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.requestService.listAssigned().subscribe({
      next: (items) => {
        this.records.set(items.filter((item) => item.status === 'FINALIZADO'));
        this.loading.set(false);
      },
      error: () => {
        this.records.set([]);
        this.loading.set(false);
        this.errorMessage.set('No se pudieron cargar las fichas medicas.');
      }
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  private matchesSearch(record: MedicalRequest, search: string): boolean {
    const values = [
      record.requestCode,
      record.patientFullName,
      record.patientDni,
      record.serviceName,
      record.professionName,
      record.addressText,
      record.addressReference,
      record.patientNotes
    ];

    return values.some((value) => this.normalizeText(value).includes(search));
  }

  private normalizeText(value?: string | number | null): string {
    return (value ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}