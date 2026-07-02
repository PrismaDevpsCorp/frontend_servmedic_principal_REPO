import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-attention-report',
  imports: [RouterLink],
  templateUrl: './attention-report.html',
  styleUrl: './attention-report.scss'
})
export class AttentionReport {
  private readonly route = inject(ActivatedRoute);

  requestId = computed(() => this.route.snapshot.paramMap.get('requestId'));
}