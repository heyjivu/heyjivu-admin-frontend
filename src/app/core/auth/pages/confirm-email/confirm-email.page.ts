import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '../../state/auth.store';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="login-container">
      <div class="login-card glass" style="text-align: center; padding: 40px 30px;">
        <div class="hj-brand-mark hj-brand-mark--auth" aria-hidden="true" style="margin-bottom: 20px;">
          <span class="hj-brand-face">
            <span class="hj-brand-eye hj-brand-eye--left"></span>
            <span class="hj-brand-eye hj-brand-eye--right"></span>
            <span class="hj-brand-smile"></span>
            <span class="hj-brand-spark hj-brand-spark--one"></span>
            <span class="hj-brand-spark hj-brand-spark--two"></span>
          </span>
        </div>
        <h1 style="margin-bottom: 10px; font-size: 1.5rem;">Confirming Your Email</h1>

        <div *ngIf="store.loading()" style="color: var(--text2); margin: 20px 0;">
          <i class="fas fa-spinner fa-spin fa-2x"></i>
          <p style="margin-top: 15px;">Please wait while we verify your account...</p>
        </div>

        <div *ngIf="!store.loading() && !store.error()" style="color: var(--green); margin: 20px 0;">
          <i class="fas fa-check-circle fa-3x" style="margin-bottom: 15px;"></i>
          <p style="font-size: 1.1rem;">Your email has been confirmed successfully!</p>
          <p style="margin-top: 10px; color: var(--text2);">Redirecting you to your dashboard...</p>
        </div>

        <div *ngIf="!store.loading() && store.error()" style="color: var(--red); margin: 20px 0;">
          <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 15px;"></i>
          <p style="font-size: 1.1rem;">{{ store.error() }}</p>
          <a routerLink="/login" class="btn-login" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: var(--accent); color: white; border-radius: 6px; text-decoration: none;">
            Return to Login
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.page.scss']
})
export class ConfirmEmailPage implements OnInit {
  private route = inject(ActivatedRoute);
  store = inject(AuthStore);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.store.confirmEmail(token);
      } else {
        // Handle error: no token provided
      }
    });
  }
}
