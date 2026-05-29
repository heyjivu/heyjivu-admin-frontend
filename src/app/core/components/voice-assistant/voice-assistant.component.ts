import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UIStore } from '../../services/ui.store';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-assistant.component.html',
  styleUrl: './voice-assistant.component.scss'
})
export class VoiceAssistantComponent implements OnInit, OnDestroy {
  readonly uiStore = inject(UIStore);
  private readonly http = inject(HttpClient);

  status = signal<VoiceState>('idle');
  transcript = signal('');
  aiResponse = signal('');
  errorMessage = signal('');

  private recognition: any;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private autoRestart = true;

  ngOnInit() {
    this.startSession();
  }

  ngOnDestroy() {
    this.autoRestart = false;
    this.stopListening();
    this.stopSpeaking();
  }

  startSession() {
    this.transcript.set('');
    this.aiResponse.set('');
    this.errorMessage.set('');
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.status.set('error');
      this.errorMessage.set('Speech recognition is not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    const lang = this.uiStore.brainLanguage();
    this.recognition.lang = lang === 'ur' ? 'ur-PK' : 'en-US';

    this.recognition.onstart = () => {
      this.status.set('listening');
      this.errorMessage.set('');
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText) {
        this.transcript.set(activeText);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('STT Error', event);
      if (event.error === 'no-speech') {
        // Just ignore and let it stay in listening or restart
      } else {
        this.status.set('error');
        this.errorMessage.set(`Speech recognition failed: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      // If we clicked send, or cancelled, do not auto-restart
      if (this.status() === 'listening' && this.autoRestart) {
        // Auto-restart to keep listening if they paused
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }

  sendToBrain() {
    const textToSend = this.transcript().trim();
    if (!textToSend) return;

    this.autoRestart = false;
    this.stopListening();
    this.status.set('processing');

    this.http.post<{ response: string }>(`${environment.apiUrl}/settings/brain/chat`, { message: textToSend })
      .pipe(finalize(() => {
        this.autoRestart = true;
      }))
      .subscribe({
        next: (res) => {
          if (res && res.response) {
            this.aiResponse.set(res.response);
            this.speakResponse(res.response);
          } else {
            this.status.set('error');
            this.errorMessage.set('Main Brain returned empty response.');
          }
        },
        error: (err) => {
          console.error('Brain chat error', err);
          this.status.set('error');
          this.errorMessage.set('Failed to connect to Brain. Please check API settings.');
        }
      });
  }

  private speakResponse(text: string) {
    if (!('speechSynthesis' in window)) {
      this.status.set('idle');
      return;
    }

    this.stopSpeaking();
    this.status.set('speaking');

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const lang = this.uiStore.brainLanguage();

    if (lang === 'ur') {
      const voice = voices.find(v => v.lang.startsWith('ur')) || voices.find(v => v.lang.startsWith('hi'));
      if (voice) {
        this.currentUtterance.voice = voice;
        this.currentUtterance.lang = voice.lang;
      }
    } else {
      const voice = voices.find(v => v.lang === 'en-GB' || v.name.includes('Google UK English')) || 
                    voices.find(v => v.lang.startsWith('en'));
      if (voice) {
        this.currentUtterance.voice = voice;
        this.currentUtterance.lang = voice.lang;
      }
    }

    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      // Start listening again for a continuous dialogue
      if (this.autoRestart) {
        this.transcript.set('');
        this.aiResponse.set('');
        this.initSpeechRecognition();
      } else {
        this.status.set('idle');
      }
    };

    this.currentUtterance.onerror = (e) => {
      console.error('TTS Speak Error', e);
      this.status.set('idle');
    };

    window.speechSynthesis.speak(this.currentUtterance);
  }

  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  close() {
    this.autoRestart = false;
    this.stopSpeaking();
    this.stopListening();
    this.uiStore.toggleGlobalMic();
  }
}
