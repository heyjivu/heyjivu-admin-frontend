import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  status = input.required<string>();
  isActive = input<boolean>(false);
  badgeClass = computed(() => {
    const map: Record<string, string> = {
      'Pending':   'badge badge--amber',
      'Approved':  'badge badge--blue',
      'Scheduled': 'badge badge--purple',
      'Published': 'badge badge--green',
      'Rejected':  'badge badge--red',
      'Failed':    'badge badge--red',
      'Active':    'badge badge--green',
      'Inactive':  'badge badge--gray',
    };
    return map[this.status()] ?? 'badge badge--gray';
  });
  statusColor = computed(() => {
    const map: Record<string, string> = {
      'Pending':   'var(--amber)',
      'Approved':  'var(--accent)',
      'Scheduled': 'var(--purple)',
      'Published': 'var(--green)',
      'Rejected':  'var(--red)',
      'Failed':    'var(--red)',
      'Active':    'var(--green)',
      'Inactive':  'var(--text3)',
    };
    return map[this.status()] ?? 'var(--text3)';
  });
}
