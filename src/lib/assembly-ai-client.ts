/**
 * AssemblyAI Client - Real-time Transcription Service
 * 
 * @description Client for interacting with AssemblyAI's real-time transcription API.
 * Handles token exchange, WebSocket connection management, and audio streaming.
 * 
 * @functionality
 * - Manages authentication with AssemblyAI using token exchange
 * - Establishes and maintains WebSocket connections for real-time transcription
 * - Handles sending audio data to the API
 * - Processes transcription events and provides callbacks for handling results
 * 
 * @dataFlow Connects audio capture to AssemblyAI's real-time transcription service
 * @errorHandling Implements retry logic and connection status monitoring
 */

import { AssemblyAI, RealtimeTranscript } from 'assemblyai';
import { getLogger } from './logger';

// Initialize logger
const logger = getLogger('AssemblyAIClient');

// Connection status enum
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Configuration options for the AssemblyAI client
export interface AssemblyAIClientConfig {
  sampleRate: number;
  wordBoost?: string[];
  encoding?: 'pcm_s16le' | 'pcm_mulaw';
  endUtteranceOnSilence?: number; // Silence threshold in milliseconds
}

// Callback types for different events
export type TranscriptCallback = (transcript: RealtimeTranscript) => void;
export type ErrorCallback = (error: Error) => void;
export type ConnectionStatusCallback = (status: ConnectionStatus) => void;
export type SessionIdCallback = (sessionId: string) => void;

/**
 * AssemblyAI Client for real-time transcription
 */
export class AssemblyAIClient {
  private client: AssemblyAI | null = null;
  private transcriber: any = null; // Using any as the SDK doesn't export the RealtimeTranscriber type
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private config: AssemblyAIClientConfig;
  private sessionId: string | null = null;
  private maxRetries = 3;
  private retryCount = 0;
  private retryDelay = 2000; // Initial retry delay in ms
  
  // Callbacks
  private transcriptCallbacks: TranscriptCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private sessionIdCallbacks: SessionIdCallback[] = [];
  
  constructor(config: AssemblyAIClientConfig) {
    this.config = config;
  }
  
  /**
   * Connect to the AssemblyAI real-time transcription service
   * @param userId User ID for token exchange
   */
  async connect(userId: string): Promise<void> {
    try {
      logger.info(`Connecting to AssemblyAI with user ID: ${userId}`);
      this.updateStatus(ConnectionStatus.CONNECTING);
      
      // Exchange token with your existing endpoint
      logger.debug('Requesting token from token exchange service');
      const token = await this.getToken(userId);
      logger.debug('Token received successfully');
      
      // Initialize AssemblyAI client with empty config for browser environment
      logger.debug('Initializing AssemblyAI client for browser environment');
      this.client = new AssemblyAI({ apiKey: '' }); // Empty API key, we'll use token auth instead
      logger.debug('AssemblyAI client initialized');
      
      // Create transcriber with configuration and token
      logger.debug('Creating real-time transcriber with temporary token', this.config);
      this.transcriber = this.client.realtime.transcriber({
        sampleRate: this.config.sampleRate,
        wordBoost: this.config.wordBoost,
        encoding: this.config.encoding,
        token: token // Use token parameter instead of API key for browser environment
      });
      
      // Configure silence threshold if provided
      if (this.config.endUtteranceOnSilence !== undefined) {
        logger.debug(`Setting utterance silence threshold to ${this.config.endUtteranceOnSilence}`);
        this.transcriber.setEndUtteranceSilenceThreshold(this.config.endUtteranceOnSilence);
      }
      
      // Set up event handlers
      logger.debug('Setting up event handlers');
      this.setupEventHandlers();
      
      // Connect to the service
      logger.info('Connecting to AssemblyAI WebSocket');
      await this.transcriber.connect();
      logger.info('Successfully connected to AssemblyAI WebSocket');
      
      // Reset retry count on successful connection
      this.retryCount = 0;
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }
  
  /**
   * Disconnect from the AssemblyAI service
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from AssemblyAI WebSocket');
      if (this.transcriber) {
        await this.transcriber.close();
        logger.info('Successfully disconnected from AssemblyAI WebSocket');
      } else {
        logger.warn('Cannot disconnect: transcriber is not initialized');
      }
      this.updateStatus(ConnectionStatus.DISCONNECTED);
      this.sessionId = null;
    } catch (error) {
      console.error('Error disconnecting from AssemblyAI:', error);
    }
  }
  
  /**
   * Send audio data to the AssemblyAI service
   * @param audioData Audio data as Uint8Array
   */
  sendAudio(audioData: Uint8Array): void {
    if (this.transcriber && this.status === ConnectionStatus.CONNECTED) {
      try {
        logger.debug('Sending audio data', { length: audioData.length });
        this.transcriber.sendAudio(audioData);
      } catch (error) {
        logger.error('Error sending audio data', error);
        this.notifyError(error as Error);
      }
    } else {
      logger.warn('Cannot send audio: transcriber not initialized or not connected');
    }
  }
  
  /**
   * Force the end of the current utterance
   * This will cause AssemblyAI to immediately return a final transcript
   */
  endUtterance(): void {
    if (this.transcriber && this.status === ConnectionStatus.CONNECTED) {
      try {
        logger.debug('Ending utterance');
        this.transcriber.endUtterance();
      } catch (error) {
        logger.error('Error ending utterance', error);
        this.notifyError(error as Error);
      }
    } else {
      logger.warn('Cannot end utterance: transcriber not initialized or not connected');
    }
  }
  
  /**
   * Get the current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }
  
  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
  
  /**
   * Register a callback for transcript events
   * @param callback Function to call when a transcript is received
   */
  onTranscript(callback: TranscriptCallback): void {
    this.transcriptCallbacks.push(callback);
  }
  
  /**
   * Register a callback for error events
   * @param callback Function to call when an error occurs
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
  
  /**
   * Register a callback for connection status changes
   * @param callback Function to call when connection status changes
   */
  onConnectionStatus(callback: ConnectionStatusCallback): void {
    this.statusCallbacks.push(callback);
  }
  
  /**
   * Register a callback for session ID updates
   * @param callback Function to call when session ID is set
   */
  onSessionId(callback: SessionIdCallback): void {
    this.sessionIdCallbacks.push(callback);
  }
  
  /**
   * Remove a transcript callback
   * @param callback Callback to remove
   */
  offTranscript(callback: TranscriptCallback): void {
    this.transcriptCallbacks = this.transcriptCallbacks.filter(cb => cb !== callback);
  }
  
  /**
   * Remove an error callback
   * @param callback Callback to remove
   */
  offError(callback: ErrorCallback): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }
  
  /**
   * Remove a connection status callback
   * @param callback Callback to remove
   */
  offConnectionStatus(callback: ConnectionStatusCallback): void {
    this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
  }
  
  /**
   * Remove a session ID callback
   * @param callback Callback to remove
   */
  offSessionId(callback: SessionIdCallback): void {
    this.sessionIdCallbacks = this.sessionIdCallbacks.filter(cb => cb !== callback);
  }
  
  /**
   * Set up event handlers for the transcriber
   * @private
   */
  private setupEventHandlers(): void {
    if (!this.transcriber) {
      logger.warn('Cannot set up event handlers: transcriber is not initialized');
      return;
    }
    
    this.transcriber.on('open', ({ sessionId, expiresAt }: { sessionId: string, expiresAt: string }) => {
      logger.info(`WebSocket connection opened. Session ID: ${sessionId}, Expires at: ${expiresAt}`);
      this.sessionId = sessionId;
      this.updateStatus(ConnectionStatus.CONNECTED);
      this.notifySessionId(sessionId);
    });
    
    this.transcriber.on('error', (error: Error) => {
      logger.error('WebSocket error', error);
      this.notifyError(error);
    });
    
    this.transcriber.on('close', (code: number, reason: string) => {
      logger.info(`WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
      this.updateStatus(ConnectionStatus.DISCONNECTED);
      
      // Attempt to reconnect if not a normal closure
      if (code !== 1000) {
        logger.info(`Abnormal closure (${code}), attempting to reconnect`);
        this.attemptReconnect();
      }
    });
    
    this.transcriber.on('transcript', (transcript: RealtimeTranscript) => {
      logger.debug('Transcript received', transcript);
      this.notifyTranscript(transcript);
    });
    
    this.transcriber.on('transcript.partial', (transcript: any) => {
      logger.debug('Partial transcript received', transcript);
    });
    
    this.transcriber.on('transcript.final', (transcript: any) => {
      logger.debug('Final transcript received', transcript);
    });
  }
  
  /**
   * Exchange token with your existing endpoint
   * @param userId User ID for token exchange
   * @private
   */
  private async getToken(userId: string): Promise<string> {
    try {
      logger.debug(`Getting token for user: ${userId}`);
      
      const requestData = {
        sampleRate: this.config.sampleRate,
        userId: userId
      };
      
      logger.debug('Token exchange request data', requestData);
      
      const response = await fetch('https://assembly-transcription-api-342936752541.us-central1.run.app/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorMessage = `Token exchange failed with status: ${response.status}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      const { token, logs } = responseData;
      
      // Log the response data (excluding sensitive information)
      logger.debug('Token exchange response received', { hasToken: !!token, logs });
      
      // Optional: Handle debug logs
      if (logs && logs.length > 0) {
        logger.debug('AssemblyAI token exchange logs', logs);
      }
      
      if (!token) {
        const errorMessage = 'No token received from token exchange endpoint';
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      logger.debug('Token retrieved successfully');
      return token;
    } catch (error) {
      logger.error('Error exchanging token', error);
      throw error;
    }
  }
  
  /**
   * Update the connection status and notify callbacks
   * @param status New connection status
   * @private
   */
  private updateStatus(status: ConnectionStatus): void {
    logger.info(`Connection status changed to: ${status}`);
    this.status = status;
    this.notifyStatus(status);
  }
  
  /**
   * Notify all transcript callbacks
   * @param transcript Transcript to notify about
   * @private
   */
  private notifyTranscript(transcript: RealtimeTranscript): void {
    this.transcriptCallbacks.forEach(callback => {
      try {
        callback(transcript);
      } catch (error) {
        logger.error('Error in transcript callback', error);
      }
    });
  }
  
  /**
   * Notify all error callbacks
   * @param error Error to notify about
   * @private
   */
  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        logger.error('Error in error callback', callbackError);
      }
    });
  }
  
  /**
   * Notify all status callbacks
   * @param status Status to notify about
   * @private
   */
  private notifyStatus(status: ConnectionStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in status callback', error);
      }
    });
  }
  
  /**
   * Notify all session ID callbacks
   * @param sessionId Session ID to notify about
   * @private
   */
  private notifySessionId(sessionId: string): void {
    this.sessionIdCallbacks.forEach(callback => {
      try {
        callback(sessionId);
      } catch (error) {
        logger.error('Error in session ID callback', error);
      }
    });
  }
  
  /**
   * Handle connection errors
   * @param error Error that occurred during connection
   * @private
   */
  private handleConnectionError(error: Error): void {
    logger.error('AssemblyAI connection error', error);
    this.updateStatus(ConnectionStatus.ERROR);
    this.notifyError(error);
    
    // Attempt to reconnect
    logger.info('Initiating reconnection process');
    this.attemptReconnect();
  }
  
  /**
   * Attempt to reconnect to the service with exponential backoff
   * @private
   */
  private attemptReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      logger.error(`Failed to reconnect after ${this.maxRetries} attempts`);
      return;
    }
    
    this.updateStatus(ConnectionStatus.RECONNECTING);
    
    // Calculate delay with exponential backoff
    const delay = this.retryDelay * Math.pow(2, this.retryCount);
    
    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);
    
    setTimeout(async () => {
      this.retryCount++;
      
      try {
        if (this.transcriber) {
          logger.debug('Closing existing transcriber connection before reconnect');
          await this.transcriber.close();
        }
        
        // Reconnect with the same user ID
        if (this.sessionId) {
          const userId = this.sessionId.split('-')[0]; // Use first part of session ID as user ID
          logger.debug(`Reconnecting with user ID: ${userId}`);
          await this.connect(userId);
          logger.info('Reconnection successful');
        } else {
          logger.warn('Cannot reconnect: no session ID available');
        }
      } catch (error) {
        logger.error('Error during reconnection attempt', error);
        this.attemptReconnect();
      }
    }, delay);
  }
}
