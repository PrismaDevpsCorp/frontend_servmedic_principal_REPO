import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import {
  MedicalRequestAdditional
} from '../../../core/models/medical-request-additional.model';

@Component({
  selector: 'app-additional-withdraw-modal',
  imports: [
    CommonModule
  ],
  templateUrl: './additional-withdraw-modal.html',
  styleUrl: './additional-withdraw-modal.scss'
})
export class AdditionalWithdrawModal {
  @Input()
  additional!: MedicalRequestAdditional;

  @Input()
  loading = false;

  @Input()
  errorMessage = '';

  @Output()
  cancelled = new EventEmitter<void>();

  @Output()
  confirmed = new EventEmitter<void>();

  requestCancel(): void {
    if (this.loading) {
      return;
    }

    this.cancelled.emit();
  }

  requestConfirm(): void {
    if (this.loading) {
      return;
    }

    this.confirmed.emit();
  }
}