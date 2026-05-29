import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminPaymentService, PaymentSettingDto } from './services/admin-payment.service';

@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './payment-management.page.html',
  styleUrl: './payment-management.page.scss'
})
export class PaymentManagementPage implements OnInit {
  private paymentService = inject(AdminPaymentService);
  
  settings = signal<PaymentSettingDto[]>([]);
  loading = signal(false);
  
  // For editing/creating
  selectedProvider = signal<string>('Safepay');
  form = signal<PaymentSettingDto>({
    providerName: 'Safepay',
    apiKey: '',
    webhookSecret: '',
    checkoutUrl: 'https://sandbox.api.getsafepay.com/checkout/pay',
    environment: 'sandbox',
    isActive: true
  });

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.paymentService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        const safepay = data.find(s => s.providerName === 'Safepay');
        if (safepay) {
          this.form.set({ ...safepay });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save() {
    this.loading.set(true);
    this.paymentService.updateSetting(this.form()).subscribe({
      next: () => {
        this.loadSettings();
        alert('Payment settings updated successfully!');
      },
      error: (err) => {
        alert('Failed to update settings');
        this.loading.set(false);
      }
    });
  }
}



