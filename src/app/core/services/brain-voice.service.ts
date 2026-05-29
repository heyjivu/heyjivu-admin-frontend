import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BrainVoiceService {
  private http = inject(HttpClient);
  
  isRecording = signal(false);
  isProcessing = signal(false);
  isSpeaking = signal(false);
  
  lastTranscription = signal('');
  lastTranslation = signal('');
  lastReply = signal('');

  private recognition: any;

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'ur-PK'; // Default to Urdu for regional support

      this.recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        this.lastTranscription.set(transcript);
      };

      this.recognition.onend = () => {
        if (this.isRecording()) {
          this.submitText(this.lastTranscription());
        }
      };
    }
  }

  startListening() {
    this.isRecording.set(true);
    this.lastTranscription.set('');
    if (this.recognition) {
      this.recognition.start();
    }
  }

  stopListening() {
    this.isRecording.set(false);
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  submitText(text: string) {
    if (!text.trim()) return;
    
    this.isProcessing.set(true);
    this.http.post<any>(`${environment.apiUrl}/api/brain/text`, JSON.stringify(text), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(finalize(() => this.isProcessing.set(false)))
      .subscribe(res => {
        this.lastTranslation.set(res.englishTranslation);
        this.lastReply.set(res.replyText);
        this.speak(res.replyText);
      });
  }

  speak(text: string) {
    if (!window.speechSynthesis) return;

    this.isSpeaking.set(true);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to find an Urdu or Punjabi voice
    const voices = window.speechSynthesis.getVoices();
    const regionalVoice = voices.find(v => v.lang.startsWith('ur') || v.lang.startsWith('pa'));
    if (regionalVoice) {
      utterance.voice = regionalVoice;
    }
    
    utterance.onend = () => this.isSpeaking.set(false);
    window.speechSynthesis.speak(utterance);
  }
}
