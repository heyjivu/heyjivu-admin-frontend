import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../state/auth.store';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  store = inject(AuthStore);

  registerForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, (control: AbstractControl) => this.confirmPasswordValidator(control)]],
  });

  constructor() {
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.registerForm.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  touchedFields = signal<Set<string>>(new Set());
  showPassword = false;
  showConfirmPassword = false;

  passwordValue = toSignal(
    this.registerForm.get('password')!.valueChanges,
    { initialValue: '' }
  );

  passwordStrength = computed(() => {
    const password = this.passwordValue() || '';
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  });

  passwordStrengthLevel = computed(() => {
    const s = this.passwordStrength();
    if (s <= 25) return 'weak';
    if (s <= 50) return 'fair';
    if (s <= 75) return 'good';
    return 'strong';
  });

  passwordStrengthText = computed(() => {
    const levels: Record<string, string> = {
      weak: 'Weak',
      fair: 'Fair',
      good: 'Good',
      strong: 'Strong'
    };
    return levels[this.passwordStrengthLevel()];
  });

  passwordRules = computed(() => {
    const password = this.passwordValue() || '';
    return {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password)
    };
  });

  passwordAllRulesPassed = computed(() => {
    const rules = this.passwordRules();
    return !!(rules.hasMinLength && rules.hasUppercase && rules.hasNumber && rules.hasSpecialChar);
  });

  confirmPasswordValidator(control: AbstractControl): ValidationErrors | null {
    if (!this.registerForm) return null;
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = control.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { mismatch: true };
    }
    return null;
  }

  onFieldBlur(fieldName: string): void {
    this.touchedFields.update(fields => {
      const newFields = new Set(fields);
      newFields.add(fieldName);
      return newFields;
    });
  }

  showValidation(fieldName: string): boolean {
    return this.touchedFields().has(fieldName);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    this.touchedFields.set(new Set(['displayName', 'email', 'password', 'confirmPassword']));
    
    if (this.registerForm.invalid) {
      return;
    }

    const { displayName, email, password, confirmPassword } = this.registerForm.value;
    
    this.store.register({ fullName: displayName, email, password, confirmPassword });
  }
}