import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AttentionReport } from '../../core/models/attention-report.model';
import { AttentionReportService } from '../../core/services/attention-report.service';

@Component({
  selector: 'app-attention-report',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './attention-report.html',
  styleUrl: './attention-report.scss'
})
export class AttentionReportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly attentionReportService = inject(AttentionReportService);

  requestId = Number(this.route.snapshot.paramMap.get('requestId') ?? 0);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  report = signal<AttentionReport | null>(null);
  notFound = signal(false);

  form = this.fb.nonNullable.group({
    clinicalObservations: ['', [Validators.required]],
    diagnosticImpression: [''],
    recommendations: ['', [Validators.required]],
    indications: [''],
    vitalSigns: [''],
    attachmentUrl: ['']
  });

  constructor() {
    this.loadReport();
  }

  loadReport(): void {
    if (!this.requestId) {
      this.errorMessage.set('No se recibio el ID de solicitud medica.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.notFound.set(false);

    this.attentionReportService.findByMedicalRequestId(this.requestId).subscribe({
      next: (report) => {
        this.loading.set(false);
        this.report.set(report);

        if (!report) {
          this.notFound.set(true);
          this.form.reset({
            clinicalObservations: '',
            diagnosticImpression: '',
            recommendations: '',
            indications: '',
            vitalSigns: '',
            attachmentUrl: ''
          });
          return;
        }

        this.form.patchValue({
          clinicalObservations: report.clinicalObservations ?? '',
          diagnosticImpression: report.diagnosticImpression ?? '',
          recommendations: report.recommendations ?? '',
          indications: report.indications ?? '',
          vitalSigns: report.vitalSigns ?? '',
          attachmentUrl: report.attachmentUrl ?? ''
        });
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo consultar la ficha medica.');
      }
    });
  }

  saveReport(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Complete los campos obligatorios.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const value = this.form.getRawValue();

    this.attentionReportService.save(this.requestId, {
      clinicalObservations: value.clinicalObservations,
      diagnosticImpression: value.diagnosticImpression || null,
      recommendations: value.recommendations,
      indications: value.indications || null,
      vitalSigns: value.vitalSigns || null,
      attachmentUrl: value.attachmentUrl || null
    }).subscribe({
      next: (report) => {
        this.saving.set(false);
        this.report.set(report);
        this.notFound.set(false);
        this.successMessage.set('Ficha medica guardada correctamente.');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar la ficha medica.');
      }
    });
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}