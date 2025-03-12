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
 * MultimodalLiveClient - Gemini Live API WebSocket Client
 * 
 * @description Core client for connecting to the Gemini Live API via WebSocket.
 * Manages the WebSocket connection, handles message processing, and provides
 * automatic reconnection with exponential backoff when errors occur.
 * 
 * @functionality
 * - Establishes and manages WebSocket connection to Gemini Live API
 * - Processes incoming and outgoing messages in the proper format
 * - Handles tool calls and responses from the model
 * - Implements automatic reconnection with exponential backoff strategy
 * - Emits events for connection state changes and message processing
 * 
 * @dataFlow Handles bidirectional communication with the Gemini Live API
 * @errorHandling Detects connection errors and manages reconnection attempts
 * @reconnection Implements exponential backoff for reconnection attempts
 * @events Emits events for connection state changes and message processing
 */

import { Content, GenerativeContentBlob, Part } from "@google/generative-ai";
import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import {
  ClientContentMessage,
  isInterrupted,
  isModelTurn,
  isServerContentMessage,
  isSetupCompleteMessage,
  isToolCallCancellationMessage,
  isToolCallMessage,
  isTurnComplete,
  LiveIncomingMessage,
  ModelTurn,
  RealtimeInputMessage,
  ServerContent,
  SetupMessage,
  StreamingLog,
  ToolCall,
  ToolCallCancellation,
  ToolResponseMessage,
  type LiveConfig,
} from "../multimodal-live-types";
import { blobToJSON, base64ToArrayBuffer } from "./utils";

/**
 * the events that this client will emit
 */
interface MultimodalLiveClientEventTypes {
  open: () => void;
  log: (log: StreamingLog) => void;
  close: (event: CloseEvent) => void;
  audio: (data: ArrayBuffer) => void;
  content: (data: ServerContent) => void;
  interrupted: () => void;
  setupcomplete: () => void;
  turncomplete: () => void;
  toolcall: (toolCall: ToolCall) => void;
  toolcallcancellation: (toolcallCancellation: ToolCallCancellation) => void;
  "client.reconnect": (log: StreamingLog) => void;
}

export type MultimodalLiveAPIClientConnection = {
  url?: string;
  apiKey: string;
};

/**
 * A event-emitting class that manages the connection to the websocket and emits
 * events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
export class MultimodalLiveClient extends EventEmitter<MultimodalLiveClientEventTypes> {
  public ws: WebSocket | null = null;
  protected config: LiveConfig | null = null;
  public url: string = "";
  private reconnecting: boolean = false;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempt: number = 0;
  private reconnectDelay: number = 1000; // Start with 1 second delay
  private reconnectTimeoutId: number | null = null;
  
  public getConfig() {
    return { ...this.config };
  }

  constructor({ url, apiKey }: MultimodalLiveAPIClientConnection) {
    super();
    url =
      url ||
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
    url += `?key=${apiKey}`;
    this.url = url;
    this.send = this.send.bind(this);
  }

  log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
    
    // Also emit client.reconnect events for reconnection-related logs
    if (type === "client.reconnect") {
      this.emit("client.reconnect", log);
    }
  }

  connect(config: LiveConfig): Promise<boolean> {
    this.config = config;

    const ws = new WebSocket(this.url);

    ws.addEventListener("message", async (evt: MessageEvent) => {
      if (evt.data instanceof Blob) {
        this.receive(evt.data);
      } else {
        console.log("non blob message", evt);
      }
    });
    return new Promise((resolve, reject) => {
      const onError = (ev: Event) => {
        this.disconnect(ws);
        const message = `Could not connect to "${this.url}"`;
        this.log(`server.${ev.type}`, message);
        reject(new Error(message));
      };
      ws.addEventListener("error", onError);
      ws.addEventListener("open", (ev: Event) => {
        if (!this.config) {
          reject("Invalid config sent to `connect(config)`");
          return;
        }
        this.log(`client.${ev.type}`, `connected to socket`);
        this.emit("open");

        this.ws = ws;

        const setupMessage: SetupMessage = {
          setup: this.config,
        };
        this._sendDirect(setupMessage);
        this.log("client.send", "setup");

        ws.removeEventListener("error", onError);
        ws.addEventListener("close", (ev: CloseEvent) => {
          console.log(ev);
          
          // Don't disconnect if we're going to reconnect
          let shouldReconnect = false;
          
          let reason = ev.reason || "";
          if (reason.toLowerCase().includes("error")) {
            const prelude = "ERROR]";
            const preludeIndex = reason.indexOf(prelude);
            if (preludeIndex > 0) {
              reason = reason.slice(
                preludeIndex + prelude.length + 1,
                Infinity,
              );
            }
            // Attempt to reconnect on error
            shouldReconnect = true;
          }
          
          this.log(
            `server.${ev.type}`,
            `disconnected ${reason ? `with reason: ${reason}` : ``}`,
          );
          
          // If we should reconnect and we have a valid config
          if (shouldReconnect && this.config && !this.reconnecting) {
            this.attemptReconnect(ws);
          } else {
            // Otherwise just disconnect normally
            this.disconnect(ws);
            this.emit("close", ev);
          }
        });
        resolve(true);
      });
    });
  }

  /**
   * Attempts to reconnect to the server with exponential backoff
   * @param oldWs The WebSocket that was disconnected
   */
  private attemptReconnect(oldWs: WebSocket) {
    // Mark that we're in the process of reconnecting
    this.reconnecting = true;
    
    // Increment the reconnect attempt counter
    this.reconnectAttempt++;
    
    // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, 16s)
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1));
    
    this.log("client.reconnect", `Attempting to reconnect (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    // Close the old WebSocket if it's still open
    if (oldWs && oldWs.readyState !== WebSocket.CLOSED) {
      oldWs.close();
    }
    
    // Clear any existing WebSocket reference
    this.ws = null;
    
    // Schedule the reconnection attempt
    this.reconnectTimeoutId = window.setTimeout(() => {
      // If we've exceeded the maximum number of attempts, give up
      if (this.reconnectAttempt > this.maxReconnectAttempts) {
        this.log("client.reconnect", `Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
        this.reconnecting = false;
        this.reconnectAttempt = 0;
        this.emit("close", new CloseEvent("close", { reason: "Max reconnect attempts exceeded" }));
        return;
      }
      
      // Attempt to reconnect
      this.log("client.reconnect", `Reconnecting... (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts})`);
      
      // Use the stored config to reconnect
      if (this.config) {
        this.connect(this.config)
          .then(() => {
            this.log("client.reconnect", "Reconnection successful");
            this.reconnecting = false;
            this.reconnectAttempt = 0;
          })
          .catch((error) => {
            this.log("client.reconnect", `Reconnection failed: ${error.message}`);
            // Try again with the next backoff delay
            this.attemptReconnect(oldWs);
          });
      } else {
        this.log("client.reconnect", "Cannot reconnect: No config available");
        this.reconnecting = false;
        this.reconnectAttempt = 0;
        this.emit("close", new CloseEvent("close", { reason: "No config available for reconnection" }));
      }
    }, delay);
  }
  
  disconnect(ws?: WebSocket) {
    // Clear any pending reconnect attempts
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Reset reconnection state
    this.reconnecting = false;
    this.reconnectAttempt = 0;
    
    // could be that this is an old websocket and theres already a new instance
    // only close it if its still the correct reference
    if ((!ws || this.ws === ws) && this.ws) {
      this.ws.close();
      this.ws = null;
      this.log("client.close", `Disconnected`);
      return true;
    }
    return false;
  }

  protected async receive(blob: Blob) {
    const response: LiveIncomingMessage = (await blobToJSON(
      blob,
    )) as LiveIncomingMessage;
    if (isToolCallMessage(response)) {
      this.log("server.toolCall", response);
      this.emit("toolcall", response.toolCall);
      return;
    }
    if (isToolCallCancellationMessage(response)) {
      this.log("receive.toolCallCancellation", response);
      this.emit("toolcallcancellation", response.toolCallCancellation);
      return;
    }

    if (isSetupCompleteMessage(response)) {
      this.log("server.send", "setupComplete");
      this.emit("setupcomplete");
      return;
    }

    // this json also might be `contentUpdate { interrupted: true }`
    // or contentUpdate { end_of_turn: true }
    if (isServerContentMessage(response)) {
      const { serverContent } = response;
      if (isInterrupted(serverContent)) {
        this.log("receive.serverContent", "interrupted");
        this.emit("interrupted");
        return;
      }
      if (isTurnComplete(serverContent)) {
        this.log("server.send", "turnComplete");
        this.emit("turncomplete");
        //plausible theres more to the message, continue
      }

      if (isModelTurn(serverContent)) {
        let parts: Part[] = serverContent.modelTurn.parts;

        // when its audio that is returned for modelTurn
        const audioParts = parts.filter(
          (p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm"),
        );
        const base64s = audioParts.map((p) => p.inlineData?.data);

        // strip the audio parts out of the modelTurn
        const otherParts = difference(parts, audioParts);
        // console.log("otherParts", otherParts);

        base64s.forEach((b64) => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emit("audio", data);
            this.log(`server.audio`, `buffer (${data.byteLength})`);
          }
        });
        if (!otherParts.length) {
          return;
        }

        parts = otherParts;

        const content: ModelTurn = { modelTurn: { parts } };
        this.emit("content", content);
        this.log(`server.content`, response);
      }
    } else {
      console.log("received unmatched message", response);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: GenerativeContentBlob[]) {
    let hasAudio = false;
    let hasVideo = false;
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      if (ch.mimeType.includes("audio")) {
        hasAudio = true;
      }
      if (ch.mimeType.includes("image")) {
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
    }
    const message =
      hasAudio && hasVideo
        ? "audio + video"
        : hasAudio
          ? "audio"
          : hasVideo
            ? "video"
            : "unknown";

    const data: RealtimeInputMessage = {
      realtimeInput: {
        mediaChunks: chunks,
      },
    };
    this._sendDirect(data);
    this.log(`client.realtimeInput`, message);
  }

  /**
   *  send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: ToolResponseMessage["toolResponse"]) {
    const message: ToolResponseMessage = {
      toolResponse,
    };

    this._sendDirect(message);
    this.log(`client.toolResponse`, message);
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    parts = Array.isArray(parts) ? parts : [parts];
    const content: Content = {
      role: "user",
      parts,
    };

    const clientContentRequest: ClientContentMessage = {
      clientContent: {
        turns: [content],
        turnComplete,
      },
    };

    this._sendDirect(clientContentRequest);
    this.log(`client.send`, clientContentRequest);
  }

  /**
   *  used internally to send all messages
   *  don't use directly unless trying to send an unsupported message type
   */
  _sendDirect(request: object) {
    if (!this.ws) {
      throw new Error("WebSocket is not connected");
    }
    const str = JSON.stringify(request);
    this.ws.send(str);
  }
}
