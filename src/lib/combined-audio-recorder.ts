/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { audioContext } from "./utils";
import AudioRecordingWorklet from "./worklets/audio-processing";
import VolMeterWorket from "./worklets/vol-meter";
import { createWorketFromSrc } from "./audioworklet-registry";
import EventEmitter from "eventemitter3";
import { AudioMixer } from "./audio-mixer";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class CombinedAudioRecorder extends EventEmitter {
  private micStream: MediaStream | undefined;
  private systemAudioStream: MediaStream | undefined;
  private audioContext: AudioContext | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private recording: boolean = false;
  private recordingWorklet: AudioWorkletNode | undefined;
  private vuWorklet: AudioWorkletNode | undefined;
  private audioMixer: AudioMixer;
  private mixedStream: MediaStream | null = null;
  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 16000) {
    super();
    this.audioMixer = new AudioMixer(sampleRate);
  }

  /**
   * Start recording from microphone only
   */
  async startMicrophoneOnly(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    // Stop any existing recording
    this.stop();

    this.starting = new Promise(async (resolve, reject) => {
      try {
        // Get microphone stream with standard audio processing
        this.micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Initialize the audio mixer
        await this.audioMixer.initialize();
        
        // Add microphone to mixer at full volume
        this.audioMixer.addSource("microphone", this.micStream, 1.0);
        
        // Get the mixed stream
        this.mixedStream = this.audioMixer.getOutputStream();
        
        if (!this.mixedStream) {
          throw new Error("Failed to get mixed audio stream");
        }
        
        // Set up audio processing
        await this.setupAudioProcessing(this.mixedStream);
        
        this.recording = true;
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        this.starting = null;
      }
    });
    
    return this.starting;
  }

  /**
   * Start recording with both microphone and system audio
   * @param systemAudioStream The system audio stream from getDisplayMedia
   */
  async startCombined(systemAudioStream: MediaStream): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    // Stop any existing recording
    this.stop();

    this.starting = new Promise(async (resolve, reject) => {
      try {
        // Store system audio stream
        this.systemAudioStream = systemAudioStream;
        
        // Get microphone stream with echo cancellation enabled
        this.micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Initialize the audio mixer
        await this.audioMixer.initialize();
        
        // Add both sources to mixer with appropriate volumes
        // System audio at full volume
        this.audioMixer.addSource("system", this.systemAudioStream, 0.9);
        
        // Microphone at lower volume with filtering to prevent feedback
        this.audioMixer.addSource("microphone", this.micStream, 0.6, true);
        
        // Set initial balance between sources
        this.audioMixer.balanceAudioSources(0.9, 0.6);
        
        // Get the mixed stream
        this.mixedStream = this.audioMixer.getOutputStream();
        
        if (!this.mixedStream) {
          throw new Error("Failed to get mixed audio stream");
        }
        
        // Set up audio processing
        await this.setupAudioProcessing(this.mixedStream);
        
        this.recording = true;
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        this.starting = null;
      }
    });
    
    return this.starting;
  }

  /**
   * Set up audio processing for the given stream
   */
  private async setupAudioProcessing(stream: MediaStream): Promise<void> {
    this.audioContext = await audioContext({ sampleRate: this.sampleRate });
    this.source = this.audioContext.createMediaStreamSource(stream);

    // Set up recording worklet
    const workletName = "audio-recorder-worklet";
    const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

    await this.audioContext.audioWorklet.addModule(src);
    this.recordingWorklet = new AudioWorkletNode(
      this.audioContext,
      workletName,
    );

    this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
      // worklet processes recording floats and messages converted buffer
      const arrayBuffer = ev.data.data.int16arrayBuffer;

      if (arrayBuffer) {
        const arrayBufferString = arrayBufferToBase64(arrayBuffer);
        this.emit("data", arrayBufferString);
      }
    };
    this.source.connect(this.recordingWorklet);

    // Set up VU meter worklet
    const vuWorkletName = "vu-meter";
    await this.audioContext.audioWorklet.addModule(
      createWorketFromSrc(vuWorkletName, VolMeterWorket),
    );
    this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
    this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
      this.emit("volume", ev.data.volume);
    };

    this.source.connect(this.vuWorklet);
  }

  /**
   * Set the volume for a specific audio source
   */
  setSourceVolume(sourceId: "microphone" | "system", volume: number): boolean {
    return this.audioMixer.setVolume(sourceId, volume);
  }
  
  /**
   * Balance the audio between system audio and microphone
   * Useful for reducing echo by adjusting the mix
   */
  balanceAudioSources(systemVolume: number, micVolume: number): boolean {
    return this.audioMixer.balanceAudioSources(systemVolume, micVolume);
  }
  
  /**
   * Optimize for echo cancellation by reducing microphone volume
   * and increasing system audio volume
   */
  optimizeForEchoCancellation(): boolean {
    return this.audioMixer.balanceAudioSources(0.95, 0.5);
  }
  
  /**
   * Optimize for voice clarity by increasing microphone volume
   * and slightly reducing system audio volume
   */
  optimizeForVoiceClarity(): boolean {
    return this.audioMixer.balanceAudioSources(0.7, 0.9);
  }

  /**
   * Start recording (microphone only)
   * @deprecated Use startMicrophoneOnly() instead
   */
  async start(): Promise<void> {
    return this.startMicrophoneOnly();
  }

  /**
   * Stop recording and clean up resources
   */
  stop(): void {
    // Handle case where stop is called before start completes
    const handleStop = () => {
      // Disconnect and clean up audio processing
      this.source?.disconnect();
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
      
      // Stop and clean up streams
      this.micStream?.getTracks().forEach((track) => track.stop());
      this.micStream = undefined;
      
      this.systemAudioStream = undefined;
      this.mixedStream = null;
      
      // Clean up audio mixer
      this.audioMixer.dispose();
      
      this.recording = false;
    };
    
    if (this.starting) {
      this.starting.then(handleStop).catch(handleStop);
      return;
    }
    
    handleStop();
  }

  /**
   * Check if system audio is currently being recorded
   */
  hasSystemAudio(): boolean {
    return !!this.systemAudioStream;
  }

  /**
   * Check if recording is active
   */
  isRecording(): boolean {
    return this.recording;
  }
}
