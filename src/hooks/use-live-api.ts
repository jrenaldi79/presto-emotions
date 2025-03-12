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

/**
 * useLiveAPI Hook - Gemini Live API Connection Management
 * 
 * @description Custom React hook that manages the connection to the Gemini Live API.
 * Handles connection state, reconnection logic, and audio streaming functionality.
 * 
 * @functionality
 * - Creates and manages a MultimodalLiveClient instance
 * - Tracks connection state (connected, reconnecting)
 * - Handles automatic reconnection when the connection is interrupted with errors
 * - Manages audio streaming for input and output
 * - Provides volume metering for audio visualization
 * 
 * @dataFlow Bridges between React components and the MultimodalLiveClient
 * @errorHandling Detects connection errors and manages reconnection attempts
 * @cleanup Properly cleans up resources when unmounting
 * @reconnection Automatically attempts to reconnect with exponential backoff
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MultimodalLiveAPIClientConnection,
  MultimodalLiveClient,
} from "../lib/multimodal-live-client";
import { LiveConfig } from "../multimodal-live-types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { StreamingLog } from "../multimodal-live-types";
import { getStoredResponses } from "../lib/response-store";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  reconnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI({
  url,
  apiKey,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.0-flash-exp",
  });
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
      
    // Track reconnection attempts
    const onReconnectAttempt = () => {
      setReconnecting(true);
    };
    
    // Track successful reconnection
    const onReconnectSuccess = () => {
      setReconnecting(false);
      setConnected(true);
      
      try {
        // Get the most recent non-"Person 1" name from stored responses
        const responses = getStoredResponses();
        let intervieweeName = "Person 1";
        
        // Find the most recent response with a name that isn't "Person 1"
        for (let i = 0; i < responses.length; i++) {
          if (responses[i].person && 
              responses[i].person.toLowerCase() !== "person 1".toLowerCase()) {
            intervieweeName = responses[i].person;
            break;
          }
        }
        
        // Send context message to the API
        const contextMessage = `We are interviewing ${intervieweeName}. Please make sure to update your context accordingly with your responses`;
        console.log("Sending reconnection context message:", contextMessage);
        
        // Send the context message as a user message
        try {
          client.send([{ text: contextMessage }]);
          console.log("Successfully sent reconnection context message");
        } catch (error: unknown) {
          console.error("Error sending reconnection context message:", error);
        }
      } catch (error: unknown) {
        console.error("Error processing reconnection context:", error);
      }
    };

    // Add custom event listeners for reconnection events
    client.on("client.reconnect", (log: StreamingLog) => {
      const message = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
      
      if (message === "Reconnection successful") {
        onReconnectSuccess();
      } else if (message.includes("Attempting to reconnect") || 
                message.includes("Reconnecting...")) {
        onReconnectAttempt();
      }
    });

    client
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio);
      
      // Remove the log event listener
      client.off("log");
    };
  }, [client]);

  const connect = useCallback(async () => {
    console.log(config);
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    await client.connect(config);
    setConnected(true);
  }, [client, setConnected, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connected,
    reconnecting,
    connect,
    disconnect,
    volume,
  };
}
