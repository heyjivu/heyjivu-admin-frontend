import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './metric-card.html',
  styleUrl: './metric-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricCard {
  label = input.required<string>();
  value = input.required<string | number>();
  color = input<string>('var(--text)');
  subText = input<string>('');
  subValue = input<string | number>('');
  subPrefix = input<string>('+');
  isPositive = input<boolean>(true);
}
