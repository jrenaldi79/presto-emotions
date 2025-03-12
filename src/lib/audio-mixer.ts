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
import EventEmitter from "eventemitter3";

/**
 * AudioMixer combines multiple audio streams into a single output stream.
 * It allows controlling the volume of each input source independently and
 * implements echo cancellation to prevent feedback loops.
 */
export class AudioMixer extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private sources: Map<string, {
    source: MediaStreamAudioSourceNode;
    gain: GainNode;
    filter?: BiquadFilterNode; // Optional filter for echo reduction
  }> = new Map();
  private outputStream: MediaStream | null = null;
  private sampleRate: number;
  private echoReductionEnabled: boolean = false;

  constructor(sampleRate = 16000, enableEchoReduction = true) {
    super();
    this.sampleRate = sampleRate;
    this.echoReductionEnabled = enableEchoReduction;
  }

  /**
   * Initialize the audio context and destination node
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return;
    
    this.audioContext = await audioContext({ sampleRate: this.sampleRate });
    this.destination = this.audioContext.createMediaStreamDestination();
    this.outputStream = this.destination.stream;
    
    this.emit("initialized");
  }

  /**
   * Add an audio source to the mixer
   * @param id Unique identifier for this source
   * @param stream Media stream containing audio tracks
   * @param volume Initial volume (0.0 to 1.0)
   * @param applyFilter Whether to apply audio filtering (for echo reduction)
   * @returns true if added successfully
   */
  addSource(id: string, stream: MediaStream, volume = 1.0, applyFilter = false): boolean {
    if (!this.audioContext || !this.destination) {
      console.error("AudioMixer not initialized");
      return false;
    }

    if (this.sources.has(id)) {
      console.warn(`Source with id ${id} already exists`);
      return false;
    }

    // Check if the stream has audio tracks
    if (stream.getAudioTracks().length === 0) {
      console.warn(`Stream with id ${id} has no audio tracks`);
      return false;
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    // Apply echo reduction if this is a microphone and echo reduction is enabled
    if (this.echoReductionEnabled && id === "microphone" && applyFilter) {
      // Create a filter to reduce frequencies that commonly cause echo
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 4000; // Cut high frequencies that often cause echo
      
      // Connect source -> filter -> gain -> destination
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.destination);
      
      this.sources.set(id, { source, gain, filter });
    } else {
      // Standard connection: source -> gain -> destination
      source.connect(gain);
      gain.connect(this.destination);
      
      this.sources.set(id, { source, gain });
    }
    
    this.emit("sourceAdded", id);
    return true;
  }

  /**
   * Remove an audio source from the mixer
   * @param id Identifier of the source to remove
   * @returns true if removed successfully
   */
  removeSource(id: string): boolean {
    const source = this.sources.get(id);
    if (!source) return false;

    // Disconnect all nodes in the chain
    if (source.filter) {
      source.filter.disconnect();
    }
    source.gain.disconnect();
    source.source.disconnect();
    this.sources.delete(id);
    
    this.emit("sourceRemoved", id);
    return true;
  }

  /**
   * Set the volume for a specific audio source
   * @param id Identifier of the source
   * @param volume Volume level (0.0 to 1.0)
   * @returns true if volume was set successfully
   */
  setVolume(id: string, volume: number): boolean {
    const source = this.sources.get(id);
    if (!source) return false;

    // Clamp volume between 0 and 1
    volume = Math.max(0, Math.min(1, volume));
    
    // Apply a smooth transition to prevent clicks/pops
    const now = this.audioContext?.currentTime || 0;
    source.gain.gain.setTargetAtTime(volume, now, 0.1);
    
    this.emit("volumeChanged", { id, volume });
    return true;
  }

  /**
   * Get the combined output stream
   * @returns MediaStream containing the mixed audio
   */
  getOutputStream(): MediaStream | null {
    return this.outputStream;
  }
  
  /**
   * Balance the audio between system audio and microphone
   * Useful for reducing echo by dynamically adjusting the mix
   * @param systemVolume Volume for system audio (0.0 to 1.0)
   * @param micVolume Volume for microphone (0.0 to 1.0)
   * @returns true if balance was set successfully
   */
  balanceAudioSources(systemVolume: number, micVolume: number): boolean {
    let success = true;
    
    if (this.sources.has("system")) {
      success = this.setVolume("system", systemVolume) && success;
    }
    
    if (this.sources.has("microphone")) {
      success = this.setVolume("microphone", micVolume) && success;
    }
    
    if (success) {
      this.emit("balanceChanged", { systemVolume, micVolume });
    }
    
    return success;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.sources.forEach((source, id) => {
      this.removeSource(id);
    });
    
    this.destination = null;
    this.outputStream = null;
    
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.audioContext = null;
    
    this.emit("disposed");
  }
}
