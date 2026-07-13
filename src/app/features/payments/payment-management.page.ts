import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import {
  AdminPaymentService,
  ManualPaymentMethodDto,
  ManualPaymentProofDto,
  ManualPaymentProofStatus,
  ManualPaymentReviewRowDto,
  ManualPaymentSmsReceiptDto,
  ManualReferralUserDto,
  PayFastStatusDto,
  PaymentSettingDto
} from './services/admin-payment.service';
import { AdminService, UserManagementDto } from '../users/services/admin.service';

type PaymentProvider = 'PayFast' | 'LemonSqueezy';
type PaymentSection = 'settings' | 'manual' | 'referrals';

@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe, SelectModule],
  templateUrl: './payment-management.page.html',
  styleUrl: './payment-management.page.scss'
})
export class PaymentManagementPage implements OnInit {
  private paymentService = inject(AdminPaymentService);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private settingsLoadRequestId = 0;
  private payFastStatusLoadRequestId = 0;
  private manualReviewLoadRequestId = 0;
  private referralUsersLoadRequestId = 0;
  private referralUserOptionsLoadRequestId = 0;

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
  activeSection = signal<PaymentSection>('settings');

  manualMethod = signal<ManualPaymentMethodDto | null>(null);
  manualMethodLoading = signal(false);
  manualMethodError = signal(false);
  qrUploading = signal(false);
  manualStatus = signal<ManualPaymentProofStatus>('pending');
  manualProofs = signal<ManualPaymentProofDto[]>([]);
  manualPage = signal(1);
  manualPageSize = 50;
  manualTotal = signal(0);
  manualProofsLoading = signal(false);
  manualProofsError = signal(false);
  manualActionId = signal<string | null>(null);
  manualBulkActivating = signal(false);
  selectedManualProofIds = signal<ReadonlySet<string>>(new Set<string>());
  selectedProof = signal<ManualPaymentProofDto | null>(null);
  selectedReviewReceipt = signal<ManualPaymentSmsReceiptDto | null>(null);
  selectedProofLoading = signal(false);
  rejectReason = signal('');

  manualSmsReceipts = signal<ManualPaymentSmsReceiptDto[]>([]);
  manualSmsStatus = signal<'pending' | 'approved'>('pending');
  manualSmsPage = signal(1);
  manualSmsPageSize = 50;
  manualSmsTotal = signal(0);
  manualSmsLoading = signal(false);
  manualSmsError = signal(false);
  manualReviewRows = signal<ManualPaymentReviewRowDto[]>([]);
  manualSmsActionId = signal<string | null>(null);
  draggedSmsReceiptId = signal<string | null>(null);

  referralUsers = signal<ManualReferralUserDto[]>([]);
  referralPage = signal(1);
  referralPageSize = 50;
  referralTotal = signal(0);
  referralUsersLoading = signal(false);
  referralUsersError = signal(false);
  referralActionId = signal<string | null>(null);
  referralSaving = signal(false);
  showReferralForm = signal(false);
  referralUserOptions = signal<UserManagementDto[]>([]);
  referralUserOptionsLoading = signal(false);
  selectedReferralUserId = signal('');
  referralCodeInput = signal('');

  isPayFastSelected = computed(() => this.selectedProvider() === 'PayFast');
  isManualSection = computed(() => this.activeSection() === 'manual');
  isReferralSection = computed(() => this.activeSection() === 'referrals');
  screenTitle = computed(() => {
    if (this.isManualSection()) return 'Manual Plan Payments';
    if (this.isReferralSection()) return 'Referral Code Users';
    return 'Payment Settings';
  });
  screenSubtitle = computed(() => {
    if (this.isManualSection()) return 'Review QR proof uploads and activate paid plans';
    if (this.isReferralSection()) return 'Assign marketer codes, email them, and track approved payment usage';
    return 'Review secure PayFast deployment status or edit Lemon Squeezy';
  });
  activeEnvironment = computed(() => {
    if (this.isManualSection()) {
      return 'manual';
    }
    if (this.isReferralSection()) {
      return 'referrals';
    }

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
  manualPageCount = computed(() =>
    Math.max(1, Math.ceil(this.manualTotal() / this.manualPageSize))
  );
  manualRangeLabel = computed(() => {
    const total = this.manualTotal();
    if (total === 0) {
      return '0 of 0';
    }

    const start = ((this.manualPage() - 1) * this.manualPageSize) + 1;
    const end = Math.min(total, this.manualPage() * this.manualPageSize);
    return `${start}-${end} of ${total}`;
  });
  canPreviousManualPage = computed(() => this.manualPage() > 1 && !this.manualProofsLoading());
  canNextManualPage = computed(() =>
    this.manualPage() < this.manualPageCount() && !this.manualProofsLoading()
  );
  manualSmsPageCount = computed(() =>
    Math.max(1, Math.ceil(this.manualSmsTotal() / this.manualSmsPageSize))
  );
  manualSmsRangeLabel = computed(() => {
    const total = this.manualSmsTotal();
    if (total === 0) return '0 of 0';
    const start = ((this.manualSmsPage() - 1) * this.manualSmsPageSize) + 1;
    const end = Math.min(total, this.manualSmsPage() * this.manualSmsPageSize);
    return `${start}-${end} of ${total}`;
  });
  canPreviousManualSmsPage = computed(() =>
    this.manualSmsPage() > 1 && !this.manualSmsLoading()
  );
  canNextManualSmsPage = computed(() =>
    this.manualSmsPage() < this.manualSmsPageCount() && !this.manualSmsLoading()
  );
  selectableManualProofs = computed(() =>
    this.manualProofs().filter(proof => proof.status === 'pending')
  );
  selectedManualProofCount = computed(() => {
    const selected = this.selectedManualProofIds();
    return this.selectableManualProofs().filter(proof => selected.has(proof.id)).length;
  });
  allSelectableManualProofsSelected = computed(() => {
    const proofs = this.selectableManualProofs();
    const selected = this.selectedManualProofIds();
    return proofs.length > 0 && proofs.every(proof => selected.has(proof.id));
  });
  referralPageCount = computed(() =>
    Math.max(1, Math.ceil(this.referralTotal() / this.referralPageSize))
  );
  referralRangeLabel = computed(() => {
    const total = this.referralTotal();
    if (total === 0) {
      return '0 of 0';
    }

    const start = ((this.referralPage() - 1) * this.referralPageSize) + 1;
    const end = Math.min(total, this.referralPage() * this.referralPageSize);
    return `${start}-${end} of ${total}`;
  });
  canPreviousReferralPage = computed(() => this.referralPage() > 1 && !this.referralUsersLoading());
  canNextReferralPage = computed(() =>
    this.referralPage() < this.referralPageCount() && !this.referralUsersLoading()
  );

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      const rawSection = params.get('section');
      const section: PaymentSection = rawSection === 'manual'
        ? 'manual'
        : rawSection === 'referrals'
          ? 'referrals'
          : 'settings';
      this.activeSection.set(section);
      this.refresh();
    });
  }

  refresh(): void {
    if (this.saving() || this.qrUploading() || this.manualActionId() || this.manualBulkActivating() || this.manualSmsActionId() || this.referralActionId() || this.referralSaving()) return;
    if (this.isManualSection()) {
      this.loadManualPaymentMethod();
      this.loadManualPaymentReview();
      return;
    }

    if (this.isReferralSection()) {
      this.loadManualReferralUsers();
      return;
    }

    this.loadSettings();
    this.loadPayFastStatus();
  }

  selectSection(section: PaymentSection): void {
    if (this.activeSection() === section) return;
    this.activeSection.set(section);
    if (section === 'manual') {
      this.loadManualPaymentMethod();
      this.loadManualPaymentReview();
    } else if (section === 'referrals') {
      this.loadManualReferralUsers();
    } else {
      this.loadSettings();
      this.loadPayFastStatus();
    }
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

  loadManualPaymentMethod(): void {
    this.manualMethodLoading.set(true);
    this.manualMethodError.set(false);
    this.paymentService.getManualPaymentMethod().pipe(
      finalize(() => this.manualMethodLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: method => this.manualMethod.set(method),
      error: () => {
        this.manualMethodError.set(true);
        this.toast.error('Failed to load manual payment QR.');
      }
    });
  }

  loadManualPaymentProofs(): void {
    this.loadManualPaymentReview();
  }

  loadManualPaymentReview(): void {
    const requestId = ++this.manualReviewLoadRequestId;
    this.manualProofsLoading.set(true);
    this.manualSmsLoading.set(true);
    this.manualProofsError.set(false);
    this.manualSmsError.set(false);
    this.paymentService.getManualPaymentReview(
      this.manualStatus(),
      this.manualSmsStatus(),
      this.manualPage(),
      this.manualPageSize,
      this.manualSmsPage(),
      this.manualSmsPageSize
    ).pipe(
      finalize(() => {
        if (requestId === this.manualReviewLoadRequestId) {
          this.manualProofsLoading.set(false);
          this.manualSmsLoading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: page => {
        if (requestId !== this.manualReviewLoadRequestId) return;
        const proofs = page.rows.flatMap(row => row.proof ? [row.proof] : []);
        const receipts = page.rows.flatMap(row => row.receipt ? [row.receipt] : []);
        this.manualReviewRows.set(page.rows);
        this.manualProofs.set(proofs);
        this.manualSmsReceipts.set(receipts);
        this.manualTotal.set(page.proofTotal);
        this.manualPage.set(page.proofPage);
        this.manualSmsTotal.set(page.smsTotal);
        this.manualSmsPage.set(page.smsPage);
        const currentIds = new Set(proofs.filter(proof => proof.status === 'pending').map(proof => proof.id));
        this.selectedManualProofIds.update(selected =>
          new Set([...selected].filter(id => currentIds.has(id)))
        );
      },
      error: () => {
        if (requestId !== this.manualReviewLoadRequestId) return;
        this.manualProofsError.set(true);
        this.manualSmsError.set(true);
        this.manualReviewRows.set([]);
        this.manualProofs.set([]);
        this.manualSmsReceipts.set([]);
        this.manualTotal.set(0);
        this.manualSmsTotal.set(0);
        this.toast.error('Failed to load the manual payment review queue.');
      }
    });
  }

  setManualStatus(status: ManualPaymentProofStatus): void {
    if (this.manualStatus() === status && this.manualProofs().length > 0) return;
    this.manualStatus.set(status);
    this.manualSmsStatus.set(status === 'approved' ? 'approved' : 'pending');
    this.manualPage.set(1);
    this.selectedManualProofIds.set(new Set<string>());
    this.loadManualPaymentProofs();
  }

  previousManualPage(): void {
    if (!this.canPreviousManualPage()) return;
    this.selectedManualProofIds.set(new Set<string>());
    this.manualPage.update(page => Math.max(1, page - 1));
    this.loadManualPaymentProofs();
  }

  nextManualPage(): void {
    if (!this.canNextManualPage()) return;
    this.selectedManualProofIds.set(new Set<string>());
    this.manualPage.update(page => page + 1);
    this.loadManualPaymentProofs();
  }

  loadManualPaymentSmsReceipts(): void {
    this.loadManualPaymentReview();
  }

  previousManualSmsPage(): void {
    if (!this.canPreviousManualSmsPage()) return;
    this.manualSmsPage.update(page => Math.max(1, page - 1));
    this.loadManualPaymentSmsReceipts();
  }

  nextManualSmsPage(): void {
    if (!this.canNextManualSmsPage()) return;
    this.manualSmsPage.update(page => page + 1);
    this.loadManualPaymentSmsReceipts();
  }

  loadManualReferralUsers(): void {
    const requestId = ++this.referralUsersLoadRequestId;
    this.referralUsersLoading.set(true);
    this.referralUsersError.set(false);
    this.paymentService.getManualReferralUsers(this.referralPage(), this.referralPageSize).pipe(
      finalize(() => {
        if (requestId === this.referralUsersLoadRequestId) {
          this.referralUsersLoading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: page => {
        if (requestId !== this.referralUsersLoadRequestId) return;
        this.referralUsers.set(page.items);
        this.referralTotal.set(page.total);
        this.referralPage.set(page.page);
      },
      error: () => {
        if (requestId !== this.referralUsersLoadRequestId) return;
        this.referralUsersError.set(true);
        this.referralUsers.set([]);
        this.referralTotal.set(0);
        this.toast.error('Failed to load referral code users.');
      }
    });
  }

  previousReferralPage(): void {
    if (!this.canPreviousReferralPage()) return;
    this.referralPage.update(page => Math.max(1, page - 1));
    this.loadManualReferralUsers();
  }

  nextReferralPage(): void {
    if (!this.canNextReferralPage()) return;
    this.referralPage.update(page => page + 1);
    this.loadManualReferralUsers();
  }

  openReferralForm(): void {
    this.showReferralForm.set(true);
    this.selectedReferralUserId.set('');
    this.referralCodeInput.set('');
    this.loadReferralUserOptions();
  }

  closeReferralForm(): void {
    if (this.referralSaving()) return;
    this.showReferralForm.set(false);
    this.selectedReferralUserId.set('');
    this.referralCodeInput.set('');
  }

  loadReferralUserOptions(): void {
    const requestId = ++this.referralUserOptionsLoadRequestId;
    this.referralUserOptionsLoading.set(true);
    this.adminService.getUsers({
      pageNumber: 1,
      pageSize: 250,
      isActive: true
    }).pipe(
      finalize(() => {
        if (requestId === this.referralUserOptionsLoadRequestId) {
          this.referralUserOptionsLoading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: page => {
        if (requestId !== this.referralUserOptionsLoadRequestId) return;
        this.referralUserOptions.set(page.items);
      },
      error: () => this.toast.error('Failed to load users for referral code assignment.')
    });
  }

  saveReferralUser(): void {
    const userId = this.selectedReferralUserId();
    const referralCode = this.referralCodeInput().trim();
    if (!userId || !referralCode || this.referralSaving()) {
      this.toast.error('Select a user and enter a referral code.');
      return;
    }

    this.referralSaving.set(true);
    this.paymentService.upsertManualReferralUser(userId, referralCode).pipe(
      finalize(() => this.referralSaving.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success('Referral code user saved.');
        this.closeReferralForm();
        this.referralPage.set(1);
        this.loadManualReferralUsers();
      },
      error: err => this.toast.error(err?.error?.error ?? 'Failed to save referral code user.')
    });
  }

  sendReferralCodeEmail(row: ManualReferralUserDto): void {
    if (this.referralActionId()) return;
    this.referralActionId.set(row.userId);
    this.paymentService.sendManualReferralCodeEmail(row.userId).pipe(
      finalize(() => this.referralActionId.set(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success('Referral code email sent.');
        this.loadManualReferralUsers();
      },
      error: err => this.toast.error(err?.error?.error ?? 'Failed to send referral code email.')
    });
  }

  onQrSelected(event: Event, planId: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.qrUploading()) return;

    this.qrUploading.set(true);
    this.paymentService.uploadManualPaymentQr(planId, file).pipe(
      finalize(() => {
        this.qrUploading.set(false);
        input.value = '';
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: method => {
        this.manualMethod.set(method);
        this.toast.success('Plan payment QR updated.');
      },
      error: () => this.toast.error('Failed to upload QR image. Use PNG, JPG, or WebP up to 8 MB.')
    });
  }

  openProof(proof: ManualPaymentProofDto, receipt: ManualPaymentSmsReceiptDto | null = null): void {
    this.selectedReviewReceipt.set(receipt);
    this.selectedProof.set(proof);
    this.rejectReason.set(proof.rejectionReason ?? '');
    this.selectedProofLoading.set(true);
    this.paymentService.getManualPaymentProof(proof.id).pipe(
      finalize(() => this.selectedProofLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: detail => {
        if (this.selectedProof()?.id !== proof.id) return;
        this.selectedProof.set(detail);
        this.rejectReason.set(detail.rejectionReason ?? '');
      },
      error: () => this.toast.error('Failed to load the selected payment proof.')
    });
  }

  closeProof(): void {
    if (this.manualActionId()) return;
    this.selectedProof.set(null);
    this.selectedReviewReceipt.set(null);
    this.selectedProofLoading.set(false);
    this.rejectReason.set('');
  }

  openReviewDetails(row: ManualPaymentReviewRowDto): void {
    if (row.proof) {
      this.openProof(row.proof, row.receipt ?? null);
      return;
    }

    this.selectedReviewReceipt.set(row.receipt ?? null);
    this.selectedProof.set(null);
    this.selectedProofLoading.set(false);
    this.rejectReason.set('');
  }

  approveProof(proof: ManualPaymentProofDto | null = this.selectedProof()): void {
    if (!proof || proof.status !== 'pending' || this.manualActionId() || this.manualBulkActivating()) return;
    this.manualActionId.set(proof.id);
    this.paymentService.approveManualPaymentProof(proof.id).pipe(
      finalize(() => this.manualActionId.set(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success('Plan activated for the selected user.');
        this.selectedProof.set(null);
        this.selectedReviewReceipt.set(null);
        this.loadManualPaymentProofs();
      },
      error: () => this.toast.error('Failed to activate the selected payment.')
    });
  }

  rejectProof(proof: ManualPaymentProofDto | null = this.selectedProof()): void {
    if (!proof || proof.status !== 'pending' || this.manualActionId() || this.manualBulkActivating()) return;
    this.manualActionId.set(proof.id);
    this.paymentService.rejectManualPaymentProof(proof.id, this.rejectReason()).pipe(
      finalize(() => this.manualActionId.set(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success('Payment proof rejected.');
        this.selectedProof.set(null);
        this.selectedReviewReceipt.set(null);
        this.loadManualPaymentProofs();
      },
      error: () => this.toast.error('Failed to reject the selected payment.')
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
    return this.loading() || this.payFastLoading() || this.saving() ||
      this.manualMethodLoading() || this.manualProofsLoading() ||
      this.manualSmsLoading() ||
      this.qrUploading() || !!this.manualActionId() || this.manualBulkActivating() || !!this.manualSmsActionId() ||
      this.referralUsersLoading() || this.referralSaving() || !!this.referralActionId();
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

  formatMoney(proof: ManualPaymentProofDto): string {
    const amount = Number(proof.amount ?? 0);
    return `${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })} ${proof.currency || 'PKR'}`;
  }

  formatSmsAmount(receipt: ManualPaymentSmsReceiptDto): string {
    if (receipt.amount === null || receipt.amount === undefined) return 'Amount not detected';
    return `${Number(receipt.amount).toLocaleString('en-PK', { maximumFractionDigits: 2 })} ${receipt.currency || 'PKR'}`;
  }

  isManualProofSelected(proofId: string): boolean {
    return this.selectedManualProofIds().has(proofId);
  }

  toggleManualProofSelection(proof: ManualPaymentProofDto): void {
    if (proof.status !== 'pending' || this.manualBulkActivating() || !!this.manualActionId()) return;
    this.selectedManualProofIds.update(current => {
      const next = new Set(current);
      if (next.has(proof.id)) {
        next.delete(proof.id);
      } else {
        next.add(proof.id);
      }
      return next;
    });
  }

  toggleAllManualProofs(): void {
    if (this.manualBulkActivating() || !!this.manualActionId()) return;
    if (this.allSelectableManualProofsSelected()) {
      this.selectedManualProofIds.set(new Set<string>());
      return;
    }
    this.selectedManualProofIds.set(new Set(this.selectableManualProofs().map(proof => proof.id)));
  }

  activateSelectedProofs(): void {
    if (this.manualBulkActivating() || !!this.manualActionId()) return;
    const selected = this.selectedManualProofIds();
    const ids = this.selectableManualProofs()
      .filter(proof => selected.has(proof.id))
      .map(proof => proof.id);
    if (ids.length === 0) return;

    this.manualBulkActivating.set(true);
    forkJoin(ids.map(id =>
      this.paymentService.approveManualPaymentProof(id).pipe(
        map(() => ({ id, success: true })),
        catchError(() => of({ id, success: false }))
      )
    )).pipe(
      finalize(() => this.manualBulkActivating.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      const failedIds = results.filter(result => !result.success).map(result => result.id);
      const activated = results.length - failedIds.length;
      this.selectedManualProofIds.set(new Set(failedIds));
      if (activated > 0) {
        this.toast.success(`${activated} plan${activated === 1 ? '' : 's'} activated.`);
      }
      if (failedIds.length > 0) {
        this.toast.error(`${failedIds.length} selected payment${failedIds.length === 1 ? '' : 's'} could not be activated.`);
      }
      this.loadManualPaymentProofs();
    });
  }

  manualMatchLabel(row: ManualPaymentReviewRowDto): string {
    if (!row.matched || row.differenceSeconds === null || row.differenceSeconds === undefined) return '';
    const totalSeconds = row.differenceSeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `Matched ${minutes}m ${seconds}s` : `Matched ${seconds}s`;
  }

  startSmsDrag(event: DragEvent, receipt: ManualPaymentSmsReceiptDto): void {
    if (this.manualSmsActionId()) return;
    this.draggedSmsReceiptId.set(receipt.id);
    event.dataTransfer?.setData('text/plain', receipt.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  endSmsDrag(): void {
    this.draggedSmsReceiptId.set(null);
  }

  allowSmsDrop(event: DragEvent): void {
    if (!this.draggedSmsReceiptId() || this.manualSmsActionId()) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  dropSmsOnProof(event: DragEvent, proof: ManualPaymentProofDto): void {
    event.preventDefault();
    const receiptId = event.dataTransfer?.getData('text/plain') || this.draggedSmsReceiptId();
    this.draggedSmsReceiptId.set(null);
    if (!receiptId || this.manualSmsActionId()) return;
    this.setSmsMatch(receiptId, proof.id);
  }

  disconnectSms(row: ManualPaymentReviewRowDto): void {
    if (!row.receipt || !row.matched || this.manualSmsActionId()) return;
    this.setSmsMatch(row.receipt.id, null);
  }

  deleteSmsReceipt(receipt: ManualPaymentSmsReceiptDto): void {
    if (this.manualSmsActionId()) return;
    if (!window.confirm('Delete this SMS receipt from the Admin payment review queue?')) return;
    this.manualSmsActionId.set(receipt.id);
    this.paymentService.deleteManualPaymentSmsReceipt(receipt.id).pipe(
      finalize(() => this.manualSmsActionId.set(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success('SMS receipt deleted.');
        this.loadManualPaymentReview();
      },
      error: () => this.toast.error('Failed to delete the SMS receipt.')
    });
  }

  isSmsActionBusy(receipt: ManualPaymentSmsReceiptDto): boolean {
    return this.manualSmsActionId() === receipt.id;
  }

  statusLabel(status: ManualPaymentProofStatus): string {
    return status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected';
  }

  proofKindLabel(proof: ManualPaymentProofDto): string {
    if (proof.proofImageKey) return 'Shot';
    if (proof.paymentReference) return 'Legacy Ref';
    return 'Proof';
  }

  proofIconClass(proof: ManualPaymentProofDto): string {
    if (proof.proofImageKey) return 'fa-image';
    if (proof.paymentReference) return 'fa-hashtag';
    return 'fa-receipt';
  }

  formatReferralAmount(row: ManualReferralUserDto): string {
    const parts: string[] = [];
    if (Number(row.approvedAmountPkr ?? 0) > 0) {
      parts.push(`${Number(row.approvedAmountPkr).toLocaleString('en-PK', { maximumFractionDigits: 0 })} PKR`);
    }
    if (Number(row.approvedAmountUsd ?? 0) > 0) {
      parts.push(`${Number(row.approvedAmountUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD`);
    }

    return parts.length > 0 ? parts.join(' / ') : '0 PKR';
  }

  isReferralActionBusy(row: ManualReferralUserDto): boolean {
    return this.referralActionId() === row.userId;
  }

  isProofActionBusy(proof: ManualPaymentProofDto): boolean {
    return this.manualBulkActivating() || this.manualActionId() === proof.id;
  }

  private setSmsMatch(receiptId: string, proofId: string | null): void {
    this.manualSmsActionId.set(receiptId);
    this.paymentService.setManualPaymentSmsMatch(receiptId, proofId).pipe(
      finalize(() => this.manualSmsActionId.set(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success(proofId ? 'SMS receipt linked to the payment proof.' : 'SMS receipt disconnected.');
        this.loadManualPaymentReview();
      },
      error: () => this.toast.error('Failed to update the SMS receipt match.')
    });
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
