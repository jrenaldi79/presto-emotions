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
 * Media Stream Mux - Media Stream Type Definitions
 * 
 * @description Type definitions for media stream handling in the application.
 * Provides a common interface for different types of media streams (webcam, screen).
 * 
 * @functionality
 * - Defines the UseMediaStreamResult interface for consistent media stream handling
 * - Supports both webcam and screen capture streams
 * - Tracks streaming state and provides methods for starting/stopping streams
 * - Includes system audio detection for screen capture streams
 * 
 * @dataFlow Used by media stream hooks to provide a consistent interface
 * @typeDefinitions Provides type safety for media stream operations
 */

export type UseMediaStreamResult = {
  type: "webcam" | "screen";
  start: () => Promise<MediaStream>;
  stop: () => void;
  isStreaming: boolean;
  stream: MediaStream | null;
  hasSystemAudio?: boolean; // Optional for backward compatibility
};
