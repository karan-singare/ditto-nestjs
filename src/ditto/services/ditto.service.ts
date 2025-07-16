import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Ditto } from '@dittolive/ditto';
import { BehaviorSubject } from 'rxjs';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class DittoService implements OnModuleInit, OnModuleDestroy {
  private ditto: Ditto;
  private isConnectedState: boolean = false;
  
  // RxJS BehaviorSubject to emit events when subscriptions are registered
  // Using BehaviorSubject so late subscribers can still receive the event
  public subscriptionsRegistered$ = new BehaviorSubject<boolean>(false);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async onModuleInit() {
    try {
      this.ditto = new Ditto({
        type: 'onlinePlayground',
        appID: process.env.DITTO_APP_ID || '',
        token: process.env.DITTO_PLAYGROUND_TOKEN || '',
        customAuthURL: process.env.DITTO_AUTH_URL || '',
      });

      // Set transport configuration with websocket URL
      this.setTransportConfig();

      this.ditto.startSync();
      this.isConnectedState = true;
      console.log('Ditto connection established successfully');

      // Register sync subscriptions for all collections after starting sync
      // this.subscriptionsService.registerAllSubscriptions(this.ditto);
      
      // Emit event that subscriptions are registered
      this.subscriptionsRegistered$.next(true);
      console.log('Subscriptions registered event emitted');
    } catch (error) {
      console.error('Failed to initialize Ditto:', error);
      this.isConnectedState = false;
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.ditto) {
      try {
        // Cancel all subscriptions before stopping sync
        this.subscriptionsService.cancelAllSubscriptions();
        this.ditto.stopSync();
        this.isConnectedState = false;
        console.log('Ditto connection stopped');
      } catch (error) {
        console.error('Error stopping Ditto:', error);
      }
    }
  }

  getDitto(): Ditto {
    return this.ditto;
  }

  // Helper method to get a collection
  getCollection(name: string) {
    return this.ditto.store.collection(name);
  }

  // Helper method to check if Ditto is connected
  isConnected(): boolean {
    return this.isConnectedState && !!this.ditto;
  }

  /**
   * Private method to set transport configuration with websocket URL
   * This configures Ditto to connect via websocket to the specified URL
   */
  private setTransportConfig(): void {
    try {
      // Get the current transport config and create a copy
      const currentConfig = this.ditto.transportConfig;
      const newConfig = currentConfig.copy();

      // Set the websocket URL for connection
      // You can add multiple websocket URLs if needed
      newConfig.connect.websocketURLs = [
        process.env.DITTO_WEBSOCKET_URL || '' // Replace with your actual websocket URL
      ];

      // Set the retry interval (in milliseconds) for failed connection attempts
      newConfig.connect.retryInterval = 5000; // 5 seconds

      // Apply the new transport configuration
      this.ditto.setTransportConfig(newConfig);
      
      console.log('Transport configuration set successfully');
    } catch (error) {
      console.error('Failed to set transport configuration:', error);
      throw error;
    }
  }
} 