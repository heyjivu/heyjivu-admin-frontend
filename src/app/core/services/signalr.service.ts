import { Injectable, signal, computed, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BASE_API_URL } from '../constants/api.constants';
import { AuthStore } from '../../core/auth/state/auth.store';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection!: signalR.HubConnection;

  readonly isConnected = signal<boolean>(false);
  readonly connectionError = signal<string | null>(null);

  private readonly authStore = inject(AuthStore);

  constructor() {
    console.log('🚀 SignalR Service Initialized');
    this.initHubConnection();
  }

  private initHubConnection() {
    const hubUrl = BASE_API_URL.replace('/api', '') + '/hubs/dashboard';

    const options: signalR.IHttpConnectionOptions = {
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      skipNegotiation: false,
    };

    options.accessTokenFactory = () => {
      const token = this.authStore.token();
      return Promise.resolve(token || '');
    };

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, options)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.onclose((error) => {
      console.warn('⚠️ SignalR Connection Closed:', error);
      this.isConnected.set(false);
    });

    this.hubConnection.onreconnecting((error) => {
      console.warn('🔄 SignalR Reconnecting...', error);
      this.isConnected.set(false);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('✅ SignalR Reconnected! ConnectionId:', connectionId);
      this.isConnected.set(true);
      this.connectionError.set(null);
    });

    this.hubConnection.serverTimeoutInMilliseconds = 60000;
    this.hubConnection.keepAliveIntervalInMilliseconds = 15000;
  }

  startConnection() {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      console.log('📡 SignalR already connected.');
      return;
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
      console.log('📡 SignalR Starting connection...');
      this.hubConnection
        .start()
        .then(() => {
          console.log('🚀 SignalR CONNECTION ESTABLISHED! Listening for updates...');
          this.isConnected.set(true);
          this.connectionError.set(null);
        })
        .catch((err) => {
          console.error('❌ SignalR Connection Error: ', err);
          this.isConnected.set(false);
          this.connectionError.set(err.message || 'Connection failed');
        });
    }
  }

  stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(err => console.error('Error stopping connection:', err));
      this.isConnected.set(false);
    }
  }

  on<T>(eventName: string, callback: (data: T) => void) {
    if (!this.hubConnection) {
      console.warn(`SignalR: Cannot register listener for ${eventName} because hubConnection is not initialized.`);
      return;
    }

    this.hubConnection.on(eventName, callback as (...args: any[]) => void);
  }

  off<T>(eventName: string, callback: (data: T) => void) {
    if (this.hubConnection) {
      this.hubConnection.off(eventName, callback as (...args: any[]) => void);
    }
  }

  invoke<T>(methodName: string, ...args: any[]): Promise<T> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('SignalR: Cannot invoke - not connected');
      return Promise.reject(new Error('Not connected to SignalR hub'));
    }
    return this.hubConnection.invoke(methodName, ...args);
  }

  subscribeToJob(jobId: string): Promise<void> {
    return this.invoke<void>('SubscribeToJob', jobId);
  }

  unsubscribeFromJob(jobId: string): Promise<void> {
    return this.invoke<void>('UnsubscribeFromJob', jobId);
  }
}

