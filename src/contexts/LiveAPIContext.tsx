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
 * LiveAPIContext - Gemini Live API Connection Management
 * 
 * @description React context that provides access to the Gemini Live API client throughout the application.
 * Manages the connection state, configuration, and provides methods for connecting/disconnecting.
 * 
 * @functionality
 * - Creates and provides a LiveAPI client instance to all child components
 * - Manages connection state (connected, reconnecting) and configuration
 * - Exposes methods for connecting to and disconnecting from the Gemini API
 * - Handles automatic reconnection when the connection is interrupted with errors
 * 
 * @dataFlow Central hub for all components to access the Gemini Live API client
 * @errorHandling Automatically attempts to reconnect when the connection is interrupted
 * @stateManagement Maintains connection state and exposes it to the application
 */

import { createContext, FC, ReactNode, useContext } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../hooks/use-live-api";

const LiveAPIContext = createContext<UseLiveAPIResults | undefined>(undefined);

export type LiveAPIProviderProps = {
  children: ReactNode;
  url?: string;
  apiKey: string;
};

export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  url,
  apiKey,
  children,
}) => {
  const liveAPI = useLiveAPI({ url, apiKey });

  return (
    <LiveAPIContext.Provider value={liveAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
};

export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used wihin a LiveAPIProvider");
  }
  return context;
};
