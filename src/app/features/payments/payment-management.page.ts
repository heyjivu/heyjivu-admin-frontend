import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminPaymentService, PaymentSettingDto } from './services/admin-payment.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './payment-management.page.html',
  styleUrl: './payment-management.page.scss'
})
export class PaymentManagementPage implements OnInit {
  private paymentService = inject(AdminPaymentService);
  private toast = inject(ToastService);
  
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

  setEnvironment(environment: 'sandbox' | 'production') {
    const checkoutUrl = environment === 'production'
      ? 'https://getsafepay.com/checkout/pay'
      : 'https://sandbox.api.getsafepay.com/checkout/pay';

    this.form.set({
      ...this.form(),
      environment,
      checkoutUrl
    });
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
        this.toast.success('Payment settings updated successfully.');
      },
      error: () => {
        this.toast.error('Failed to update payment settings.');
        this.loading.set(false);
      }
    });
  }
}



