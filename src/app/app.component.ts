import { CommonModule } from '@angular/common';
import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignalRService } from './core/services/signalr.service';
import { UIStore } from './core/services/ui.store';
import { ToastComponent } from './core/components/toast/toast.component';
import { AuthStore } from './core/auth/state/auth.store';
import { VoiceAssistantComponent } from './core/components/voice-assistant/voice-assistant.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastComponent, VoiceAssistantComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly signalR = inject(SignalRService);
  public readonly uiStore = inject(UIStore);
  public readonly authStore = inject(AuthStore);
  protected readonly title = signal('ai-content-generation-admin-fe');

  constructor() {
    // Reactively start/stop SignalR based on auth status
    effect(() => {
      const isAuthenticated = this.authStore.isAuthenticated();
      if (isAuthenticated) {
        this.signalR.startConnection();
      } else {
        this.signalR.stopConnection();
      }
    });
  }

  ngOnInit() {
    this.authStore.initializeFromStorage();
    this.uiStore.initializeTheme();
  }
}
