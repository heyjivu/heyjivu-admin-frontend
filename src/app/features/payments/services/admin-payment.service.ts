import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PaymentSettingDto {
  id?: string;
  providerName: string;
  apiKey?: string;
  webhookSecret?: string;
  checkoutUrl?: string;
  environment: string;
  isActive: boolean;
  hasApiKey?: boolean;
  hasWebhookSecret?: boolean;
}

export interface PayFastStatusDto {
  enabled: boolean;
  environment: string;
  merchantIdConfigured: boolean;
  securedKeyConfigured: boolean;
  accessTokenUrl: string;
  postTransactionUrl: string;
  successUrl: string;
  failureUrl: string;
  checkoutCallbackUrl: string;
}

export interface ManualPaymentMethodDto {
  isActive: boolean;
  qrImageUrl?: string | null;
  qrImageKey?: string | null;
  plans: ManualPaymentPlanQrDto[];
}

export interface ManualPaymentPlanQrDto {
  planKey: string;
  planName: string;
  pricePkr: number;
  priceUsd: number;
  qrImageUrl?: string | null;
  qrImageKey?: string | null;
}

export type ManualPaymentProofStatus = 'pending' | 'approved' | 'rejected';

export interface ManualPaymentProofDto {
  id: string;
  providerOrderId: string;
  status: ManualPaymentProofStatus;
  rawStatus: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  planKey?: string | null;
  planName?: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt?: string | null;
  fulfilledAt?: string | null;
  proofImageUrl?: string | null;
  proofImageKey?: string | null;
  proofFileName?: string | null;
  paymentReference?: string | null;
  referralCode?: string | null;
  rejectionReason?: string | null;
}

export interface ManualPaymentProofPageDto {
  items: ManualPaymentProofDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ManualPaymentSmsReceiptDto {
  id: string;
  eventId: string;
  deviceId: string;
  sender: string;
  message: string;
  receivedAt: string;
  ingestedAt: string;
  amount?: number | null;
  currency?: string | null;
  reference?: string | null;
  status: string;
}

export interface ManualPaymentSmsReceiptPageDto {
  items: ManualPaymentSmsReceiptDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ManualPaymentReviewRowDto {
  key: string;
  proof?: ManualPaymentProofDto | null;
  receipt?: ManualPaymentSmsReceiptDto | null;
  matched: boolean;
  differenceSeconds?: number | null;
  matchSource?: 'automatic' | 'manual' | null;
}

export interface ManualPaymentReviewPageDto {
  rows: ManualPaymentReviewRowDto[];
  proofTotal: number;
  proofPage: number;
  proofPageSize: number;
  smsTotal: number;
  smsPage: number;
  smsPageSize: number;
}

export interface ManualReferralUserDto {
  userId: string;
  userName: string;
  userEmail: string;
  referralCode: string;
  createdAt: string;
  lastEmailSentAt?: string | null;
  signupCount: number;
  approvedPaymentCount: number;
  approvedAmountPkr: number;
  approvedAmountUsd: number;
}

export interface ManualReferralUserPageDto {
  items: ManualReferralUserDto[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/payments`;

  getSettings(): Observable<PaymentSettingDto[]> {
    return this.http.get<PaymentSettingDto[]>(`${this.apiUrl}/settings`);
  }

  getPayFastStatus(): Observable<PayFastStatusDto> {
    return this.http.get<PayFastStatusDto>(`${this.apiUrl}/payfast/status`);
  }

  updateSetting(dto: PaymentSettingDto): Observable<PaymentSettingDto> {
    return this.http.post<PaymentSettingDto>(`${this.apiUrl}/settings`, dto);
  }

  getRecentPayments(limit: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent?limit=${limit}`);
  }

  getManualPaymentMethod(): Observable<ManualPaymentMethodDto> {
    return this.http.get<ManualPaymentMethodDto>(`${this.apiUrl}/manual/method`);
  }

  uploadManualPaymentQr(planId: string, file: File): Observable<ManualPaymentMethodDto> {
    const form = new FormData();
    form.append('planId', planId);
    form.append('qrImage', file);
    return this.http.post<ManualPaymentMethodDto>(`${this.apiUrl}/manual/method/qr`, form);
  }

  getManualPaymentProofs(
    status: ManualPaymentProofStatus,
    page = 1,
    pageSize = 50
  ): Observable<ManualPaymentProofPageDto> {
    return this.http.get<ManualPaymentProofPageDto>(
      `${this.apiUrl}/manual/proofs?status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}`
    );
  }

  getManualPaymentProof(id: string): Observable<ManualPaymentProofDto> {
    return this.http.get<ManualPaymentProofDto>(`${this.apiUrl}/manual/proofs/${encodeURIComponent(id)}`);
  }

  getManualPaymentSmsReceipts(page = 1, pageSize = 50): Observable<ManualPaymentSmsReceiptPageDto> {
    return this.http.get<ManualPaymentSmsReceiptPageDto>(
      `${this.apiUrl}/manual/sms-receipts?page=${page}&pageSize=${pageSize}`
    );
  }

  getManualPaymentReview(
    status: ManualPaymentProofStatus,
    smsStatus: 'pending' | 'approved',
    proofPage = 1,
    proofPageSize = 50,
    smsPage = 1,
    smsPageSize = 50
  ): Observable<ManualPaymentReviewPageDto> {
    return this.http.get<ManualPaymentReviewPageDto>(
      `${this.apiUrl}/manual/review?status=${encodeURIComponent(status)}` +
      `&smsStatus=${encodeURIComponent(smsStatus)}` +
      `&proofPage=${proofPage}&proofPageSize=${proofPageSize}` +
      `&smsPage=${smsPage}&smsPageSize=${smsPageSize}`
    );
  }

  setManualPaymentSmsMatch(receiptId: string, proofId: string | null): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/manual/sms-receipts/${encodeURIComponent(receiptId)}/match`,
      { proofId }
    );
  }

  deleteManualPaymentSmsReceipt(receiptId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/manual/sms-receipts/${encodeURIComponent(receiptId)}`
    );
  }

  approveManualPaymentProof(id: string): Observable<ManualPaymentProofDto> {
    return this.http.post<ManualPaymentProofDto>(`${this.apiUrl}/manual/proofs/${encodeURIComponent(id)}/approve`, {});
  }

  rejectManualPaymentProof(id: string, reason?: string): Observable<ManualPaymentProofDto> {
    return this.http.post<ManualPaymentProofDto>(
      `${this.apiUrl}/manual/proofs/${encodeURIComponent(id)}/reject`,
      { reason: reason?.trim() || null }
    );
  }

  getManualReferralUsers(page = 1, pageSize = 50): Observable<ManualReferralUserPageDto> {
    return this.http.get<ManualReferralUserPageDto>(
      `${this.apiUrl}/manual/referrals?page=${page}&pageSize=${pageSize}`
    );
  }

  upsertManualReferralUser(userId: string, referralCode: string): Observable<ManualReferralUserDto> {
    return this.http.post<ManualReferralUserDto>(
      `${this.apiUrl}/manual/referrals`,
      { userId, referralCode }
    );
  }

  sendManualReferralCodeEmail(userId: string): Observable<ManualReferralUserDto> {
    return this.http.post<ManualReferralUserDto>(
      `${this.apiUrl}/manual/referrals/${encodeURIComponent(userId)}/send-email`,
      {}
    );
  }
}


