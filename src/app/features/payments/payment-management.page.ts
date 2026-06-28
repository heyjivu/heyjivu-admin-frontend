import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private destroyRef = inject(DestroyRef);
  private settingsLoadRequestId = 0;
  
  settings = signal<PaymentSettingDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  settingsError = signal(false);
  formSubmitted = signal(false);
  
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
    if (this.isBusy()) return;
    const checkoutUrl = this.form().providerName === 'Safepay'
      ? environment === 'production'
        ? 'https://getsafepay.com/checkout/pay'
        : 'https://sandbox.api.getsafepay.com/checkout/pay'
      : this.form().checkoutUrl;

    this.patchForm({
      environment,
      checkoutUrl
    });
  }

  patchForm(patch: Partial<PaymentSettingDto>): void {
    if (this.isBusy()) return;
    this.form.update(current => ({ ...current, ...patch }));
  }

  selectProvider(providerName: string) {
    if (this.isBusy()) return;
    this.selectedProvider.set(providerName);
    const existing = this.settings().find((setting) => setting.providerName === providerName);
    this.form.set(existing ? this.toEditableForm(existing) : this.defaultForm(providerName));
    this.formSubmitted.set(false);
  }

  loadSettings() {
    if (this.saving()) return;
    const requestId = ++this.settingsLoadRequestId;
    this.loading.set(true);
    this.settingsError.set(false);
    this.paymentService.getSettings().pipe(
      finalize(() => {
        if (requestId === this.settingsLoadRequestId) {
          this.loading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        if (requestId !== this.settingsLoadRequestId) return;
        this.settings.set(data);
        const providerName = this.selectedProvider();
        const selected = data.find(s => s.providerName === providerName) || data.find(s => s.providerName === 'Safepay');
        if (selected) {
          this.selectedProvider.set(selected.providerName);
        }
        this.form.set(selected ? this.toEditableForm(selected) : this.defaultForm(providerName));
      },
      error: () => {
        if (requestId !== this.settingsLoadRequestId) return;
        this.settingsError.set(true);
        this.toast.error('Failed to load payment settings.');
      }
    });
  }

  save() {
    if (this.isBusy()) return;
    this.formSubmitted.set(true);
    const current = this.form();
    if (!this.isFormValid()) {
      this.toast.error('Provider, environment, and API key are required for new payment settings.');
      return;
    }

    const payload: PaymentSettingDto = {
      ...current,
      providerName: current.providerName.trim(),
      environment: current.environment.trim(),
      checkoutUrl: current.checkoutUrl?.trim() || undefined,
      apiKey: current.apiKey?.trim() || undefined,
      webhookSecret: current.webhookSecret?.trim() || undefined
    };

    this.saving.set(true);
    this.paymentService.updateSetting(payload).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.formSubmitted.set(false);
        this.loadSettings();
        this.toast.success('Payment settings updated successfully.');
      },
      error: () => this.toast.error('Failed to update payment settings.')
    });
  }

  isBusy(): boolean {
    return this.loading() || this.saving();
  }

  canSave(): boolean {
    return !this.isBusy() && this.isFormValid();
  }

  isProviderInvalid(): boolean {
    return this.formSubmitted() && !this.form().providerName.trim();
  }

  isEnvironmentInvalid(): boolean {
    return this.formSubmitted() && !this.form().environment.trim();
  }

  isApiKeyInvalid(): boolean {
    return this.formSubmitted() && this.isApiKeyRequired();
  }

  isApiKeyRequired(): boolean {
    const current = this.form();
    return !current.hasApiKey && !current.apiKey?.trim();
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

  private isFormValid(): boolean {
    const current = this.form();
    return !!current.providerName.trim() &&
      !!current.environment.trim() &&
      !this.isApiKeyRequired();
  }
}



