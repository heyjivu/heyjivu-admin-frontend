import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import {
  AdminPaymentService,
  PayFastStatusDto,
  PaymentSettingDto
} from './services/admin-payment.service';

type PaymentProvider = 'PayFast' | 'LemonSqueezy';

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
  private payFastStatusLoadRequestId = 0;

  settings = signal<PaymentSettingDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  settingsError = signal(false);
  formSubmitted = signal(false);

  payFastStatus = signal<PayFastStatusDto | null>(null);
  payFastLoading = signal(false);
  payFastError = signal(false);

  selectedProvider = signal<PaymentProvider>('PayFast');
  form = signal<PaymentSettingDto>(this.defaultLemonSqueezyForm());

  isPayFastSelected = computed(() => this.selectedProvider() === 'PayFast');
  activeEnvironment = computed(() => {
    if (this.isPayFastSelected()) {
      return this.payFastStatus()?.environment?.trim().toLowerCase() || 'unknown';
    }

    return this.form().environment?.trim().toLowerCase() || 'unknown';
  });
  activeProviderEnabled = computed(() =>
    this.isPayFastSelected()
      ? this.payFastStatus()?.enabled === true
      : this.form().isActive
  );

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    if (this.saving()) return;
    this.loadSettings();
    this.loadPayFastStatus();
  }

  setEnvironment(environment: 'sandbox' | 'production'): void {
    if (this.isPayFastSelected() || this.isBusy()) return;
    this.patchForm({ environment });
  }

  patchForm(patch: Partial<PaymentSettingDto>): void {
    if (this.isPayFastSelected() || this.isBusy()) return;
    this.form.update(current => ({ ...current, ...patch }));
  }

  selectProvider(providerName: string): void {
    if (this.isBusy()) return;

    const provider: PaymentProvider = providerName === 'LemonSqueezy'
      ? 'LemonSqueezy'
      : 'PayFast';

    this.selectedProvider.set(provider);
    if (provider === 'LemonSqueezy') {
      const existing = this.settings().find(setting => setting.providerName === provider);
      this.form.set(existing ? this.toEditableForm(existing) : this.defaultLemonSqueezyForm());
    }
    this.formSubmitted.set(false);
  }

  loadSettings(): void {
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
      next: data => {
        if (requestId !== this.settingsLoadRequestId) return;
        this.settings.set(data);
        const lemonSqueezy = data.find(setting => setting.providerName === 'LemonSqueezy');
        this.form.set(lemonSqueezy
          ? this.toEditableForm(lemonSqueezy)
          : this.defaultLemonSqueezyForm());
      },
      error: () => {
        if (requestId !== this.settingsLoadRequestId) return;
        this.settingsError.set(true);
        this.toast.error('Failed to load Lemon Squeezy settings.');
      }
    });
  }

  loadPayFastStatus(): void {
    if (this.saving()) return;
    const requestId = ++this.payFastStatusLoadRequestId;
    this.payFastLoading.set(true);
    this.payFastError.set(false);
    this.paymentService.getPayFastStatus().pipe(
      finalize(() => {
        if (requestId === this.payFastStatusLoadRequestId) {
          this.payFastLoading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: status => {
        if (requestId !== this.payFastStatusLoadRequestId) return;
        this.payFastStatus.set(status);
      },
      error: () => {
        if (requestId !== this.payFastStatusLoadRequestId) return;
        this.payFastError.set(true);
        this.toast.error('Failed to load secure PayFast configuration status.');
      }
    });
  }

  save(): void {
    if (this.isPayFastSelected() || this.isBusy()) return;
    this.formSubmitted.set(true);
    const current = this.form();
    if (!this.isFormValid()) {
      this.toast.error('Provider, environment, and API key are required for new payment settings.');
      return;
    }

    const payload: PaymentSettingDto = {
      ...current,
      providerName: 'LemonSqueezy',
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
        this.toast.success('Lemon Squeezy settings updated successfully.');
      },
      error: () => this.toast.error('Failed to update Lemon Squeezy settings.')
    });
  }

  isBusy(): boolean {
    return this.loading() || this.payFastLoading() || this.saving();
  }

  canSave(): boolean {
    return !this.isPayFastSelected() && !this.isBusy() && this.isFormValid();
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
      providerName: 'LemonSqueezy',
      apiKey: '',
      webhookSecret: ''
    };
  }

  private defaultLemonSqueezyForm(): PaymentSettingDto {
    return {
      providerName: 'LemonSqueezy',
      apiKey: '',
      webhookSecret: '',
      checkoutUrl: '',
      environment: 'sandbox',
      isActive: true
    };
  }

  private isFormValid(): boolean {
    const current = this.form();
    return current.providerName === 'LemonSqueezy' &&
      !!current.environment.trim() &&
      !this.isApiKeyRequired();
  }
}
