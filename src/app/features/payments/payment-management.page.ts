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
    const checkoutUrl = this.form().providerName === 'Safepay'
      ? environment === 'production'
        ? 'https://getsafepay.com/checkout/pay'
        : 'https://sandbox.api.getsafepay.com/checkout/pay'
      : this.form().checkoutUrl;

    this.form.set({
      ...this.form(),
      environment,
      checkoutUrl
    });
  }

  selectProvider(providerName: string) {
    this.selectedProvider.set(providerName);
    const existing = this.settings().find((setting) => setting.providerName === providerName);
    this.form.set(existing ? this.toEditableForm(existing) : this.defaultForm(providerName));
  }

  loadSettings() {
    this.loading.set(true);
    this.paymentService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        const providerName = this.selectedProvider();
        const selected = data.find(s => s.providerName === providerName) || data.find(s => s.providerName === 'Safepay');
        if (selected) {
          this.selectedProvider.set(selected.providerName);
        }
        this.form.set(selected ? this.toEditableForm(selected) : this.defaultForm(providerName));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save() {
    const current = this.form();
    const payload: PaymentSettingDto = {
      ...current,
      apiKey: current.apiKey?.trim() || undefined,
      webhookSecret: current.webhookSecret?.trim() || undefined
    };

    this.loading.set(true);
    this.paymentService.updateSetting(payload).subscribe({
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

  private toEditableForm(setting: PaymentSettingDto): PaymentSettingDto {
    return {
      ...setting,
      apiKey: '',
      webhookSecret: ''
    };
  }

  private defaultForm(providerName: string): PaymentSettingDto {
    return {
      providerName,
      apiKey: '',
      webhookSecret: '',
      checkoutUrl: providerName === 'Safepay'
        ? 'https://sandbox.api.getsafepay.com/checkout/pay'
        : '',
      environment: 'sandbox',
      isActive: true
    };
  }
}



