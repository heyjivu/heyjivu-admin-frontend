import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '../../state/auth.store';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-container">
      <div class="login-card glass" role="main" aria-label="Set admin password">
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
          <h1>Set New Password</h1>
          <p>Enter the code sent to <strong>{{ email }}</strong>.</p>
        </div>

        <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="otp">Verification Code</label>
            <div class="input-wrapper">
              <i class="fas fa-key" aria-hidden="true"></i>
              <input
                type="text"
                id="otp"
                formControlName="otp"
                placeholder="Enter 6-digit code"
                autocomplete="one-time-code"
                maxlength="6"
              >
              <span class="focus-ring" aria-hidden="true"></span>
            </div>
          </div>

          <div class="form-group">
            <label for="newPassword">New Password</label>
            <div class="input-wrapper password-field">
              <i class="fas fa-lock" aria-hidden="true"></i>
              <input
                [type]="showNewPassword ? 'text' : 'password'"
                id="newPassword"
                formControlName="newPassword"
                placeholder="Enter new password"
                autocomplete="new-password"
              >
              <button
                type="button"
                class="password-toggle"
                (click)="showNewPassword = !showNewPassword"
                [attr.aria-label]="showNewPassword ? 'Hide password' : 'Show password'"
              >
                <i class="fas" [class.fa-eye]="!showNewPassword" [class.fa-eye-slash]="showNewPassword" aria-hidden="true"></i>
              </button>
              <span class="focus-ring" aria-hidden="true"></span>
            </div>
            <div class="validation-error" *ngIf="resetPasswordForm.controls.newPassword.invalid && resetPasswordForm.controls.newPassword.touched">
              Use at least 8 characters with uppercase, lowercase, and a number.
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <div class="input-wrapper password-field">
              <i class="fas fa-lock" aria-hidden="true"></i>
              <input
                [type]="showConfirmPassword ? 'text' : 'password'"
                id="confirmPassword"
                formControlName="confirmPassword"
                placeholder="Confirm new password"
                autocomplete="new-password"
              >
              <button
                type="button"
                class="password-toggle"
                (click)="showConfirmPassword = !showConfirmPassword"
                [attr.aria-label]="showConfirmPassword ? 'Hide password' : 'Show password'"
              >
                <i class="fas" [class.fa-eye]="!showConfirmPassword" [class.fa-eye-slash]="showConfirmPassword" aria-hidden="true"></i>
              </button>
              <span class="focus-ring" aria-hidden="true"></span>
            </div>
            <div class="validation-error" *ngIf="resetPasswordForm.controls.confirmPassword.hasError('mismatch') && resetPasswordForm.controls.confirmPassword.touched">
              Passwords do not match.
            </div>
          </div>

          <button type="submit" class="btn-login" [disabled]="resetPasswordForm.invalid || store.loading() || !email">
            <span *ngIf="!store.loading()">Reset Password</span>
            <span *ngIf="store.loading()"><i class="fas fa-spinner fa-spin"></i> Resetting...</span>
          </button>

          <div class="register-link">
            <a routerLink="/login">Back to login</a>
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
export class ResetPasswordPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly store = inject(AuthStore);

  email = '';
  showNewPassword = false;
  showConfirmPassword = false;

  readonly resetPasswordForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    newPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    ]],
    confirmPassword: ['', [Validators.required, (control: AbstractControl) => this.confirmPasswordValidator(control)]]
  });

  constructor() {
    this.resetPasswordForm.controls.newPassword.valueChanges.subscribe(() => {
      this.resetPasswordForm.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
    });
  }

  confirmPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = this.resetPasswordForm?.controls.newPassword.value;
    const confirmPassword = control.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.email) return;

    const { otp, newPassword } = this.resetPasswordForm.getRawValue();
    this.store.resetPassword({ email: this.email, otp: otp || '', newPassword: newPassword || '' });
  }
}
