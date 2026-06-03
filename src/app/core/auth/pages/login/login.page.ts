import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthStore } from '../../state/auth.store';
import { environment } from '../../../../../environments/environment';

// Declare google variable for typescript
declare var google: any;

let googleScriptPromise: Promise<void> | null = null;
let googleInitializedClientId: string | null = null;
let googleCredentialHandler: ((response: any) => void) | null = null;

const ensureGoogleScript = (): Promise<void> => {
  if (typeof google !== 'undefined' && google.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Identity script failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity script failed to load.'));
    document.body.appendChild(script);
  });

  return googleScriptPromise;
};

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
    const clientId = environment.googleClientId?.trim();
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      return;
    }

    ensureGoogleScript()
      .then(() => this.initializeGoogleAuth(clientId))
      .catch((error) => console.warn(error.message));
  }

  private initializeGoogleAuth(clientId: string) {
    const button = document.getElementById('googleButtonWrapper');
    if (!button || typeof google === 'undefined' || !google.accounts?.id) {
      return;
    }

    googleCredentialHandler = (response: any) => this.handleCredentialResponse(response);

    if (googleInitializedClientId !== clientId) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => googleCredentialHandler?.(response),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      googleInitializedClientId = clientId;
    }

    button.innerHTML = '';
    google.accounts.id.renderButton(
      button,
      { theme: 'outline', size: 'large', width: 350, shape: 'pill' }
    );
  }

  private handleCredentialResponse(response: any) {
    if (response.credential) {
      this.store.googleLogin({ idToken: response.credential });
    }
  }
}





