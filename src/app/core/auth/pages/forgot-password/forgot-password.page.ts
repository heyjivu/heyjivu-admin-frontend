import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../state/auth.store';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-container">
      <div class="login-card glass" role="main" aria-label="Reset admin password">
        <div class="login-header">
          <div class="hj-brand-mark hj-brand-mark--auth" aria-hidden="true">
            <span class="hj-brand-face">
              <span class="hj-brand-eye hj-brand-eye--left"></span>
              <span class="hj-brand-eye hj-brand-eye--right"></span>
              <span class="hj-brand-smile"></span>
              <span class="hj-brand-spark hj-brand-spark--one"></span>
              <span class="hj-brand-spark hj-brand-spark--two"></span>
            </span>
          </div>
          <h1>Reset Password</h1>
          <p>Enter your admin email and we will send a verification code.</p>
        </div>

        <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <div class="input-wrapper">
              <i class="fas fa-envelope" aria-hidden="true"></i>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="Enter your email"
                autocomplete="email"
                autocapitalize="none"
              >
              <span class="focus-ring" aria-hidden="true"></span>
            </div>
          </div>

          <button type="submit" class="btn-login" [disabled]="forgotPasswordForm.invalid || store.loading()">
            <span *ngIf="!store.loading()">Send Code</span>
            <span *ngIf="store.loading()"><i class="fas fa-spinner fa-spin"></i> Sending...</span>
          </button>

          <div class="register-link">
            Remembered it? <a routerLink="/login">Back to login</a>
          </div>
        </form>

        <div class="server-error" role="alert" *ngIf="store.error()" [attr.aria-live]="'polite'">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          {{ store.error() }}
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.page.scss']
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(AuthStore);

  readonly forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) return;

    const email = this.forgotPasswordForm.controls.email.value || '';
    this.store.forgotPassword({ email });
  }
}
