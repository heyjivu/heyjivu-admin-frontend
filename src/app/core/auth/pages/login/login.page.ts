import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthStore } from '../../state/auth.store';
import { environment } from '../../../../../environments/environment';

// Declare google variable for typescript
declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage implements OnInit, OnDestroy {
  store = inject(AuthStore);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  showPassword = false;

  ngOnInit() {
    this.loadGoogleScript();
  }

  ngOnDestroy() {
    // Optional: cleanup script if desired, but usually safe to leave
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.value;
    this.store.login({ username, password });
  }

  private loadGoogleScript() {
    if (typeof google !== 'undefined' && google.accounts) {
      this.initializeGoogleAuth();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initializeGoogleAuth();
    };
    document.body.appendChild(script);
  }

  private initializeGoogleAuth() {
    const clientId = environment.googleClientId || 'YOUR_GOOGLE_CLIENT_ID';

    google.accounts.id.initialize({
      client_id: clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.renderButton(
      document.getElementById('googleButtonWrapper'),
      { theme: 'outline', size: 'large', width: 350, shape: 'pill' }
    );
  }

  private handleCredentialResponse(response: any) {
    if (response.credential) {
      this.store.googleLogin({ idToken: response.credential });
    }
  }
}





