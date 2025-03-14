/**
 * AssemblyAI Test Component
 * 
 * @description A simplified test component for verifying the AssemblyAI integration.
 * This component tests the token exchange and WebSocket connection with AssemblyAI.
 * Logs are sent to the central logging system in the side panel.
 */

import { useState } from 'react';
import { AssemblyAIClient, ConnectionStatus } from '../../lib/assembly-ai-client';
import { useLoggerStore } from '../../lib/store-logger';
import './AssemblyAITest.scss';

const SAMPLE_RATE = 16000;

const AssemblyAITest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userId, setUserId] = useState('test-user-' + Date.now().toString(36));
  const { log } = useLoggerStore();

  // Test the AssemblyAI connection
  const testConnection = async () => {
    try {      
      setIsConnecting(true);
      log({ 
        date: new Date(), 
        type: 'assembly-ai', 
        message: `Starting AssemblyAI connection test with user ID: ${userId}` 
      });

      // Create a new AssemblyAI client
      const client = new AssemblyAIClient({
        sampleRate: SAMPLE_RATE
      });

      // Set up event listeners
      client.onConnectionStatus((status) => {
        setConnectionStatus(status);
        log({ 
          date: new Date(), 
          type: 'assembly-ai', 
          message: `Connection status changed: ${status}` 
        });
      });

      client.onSessionId((id) => {
        setSessionId(id);
        log({ 
          date: new Date(), 
          type: 'assembly-ai', 
          message: `Session ID received: ${id}` 
        });
      });

      client.onError((error) => {
        log({ 
          date: new Date(), 
          type: 'assembly-ai-error', 
          message: `Error: ${error.message}` 
        });
      });

      client.onTranscript((transcript) => {
        log({ 
          date: new Date(), 
          type: 'assembly-ai-transcript', 
          message: `Transcript received: ${JSON.stringify(transcript)}` 
        });
      });

      // Connect to AssemblyAI
      await client.connect(userId);
      log({ 
        date: new Date(), 
        type: 'assembly-ai', 
        message: 'Connection established successfully' 
      });

      // Disconnect after 10 seconds
      setTimeout(async () => {
        log({ 
          date: new Date(), 
          type: 'assembly-ai', 
          message: 'Disconnecting after 10 seconds...' 
        });
        await client.disconnect();
        log({ 
          date: new Date(), 
          type: 'assembly-ai', 
          message: 'Disconnected' 
        });
        setIsConnecting(false);
      }, 10000);
    } catch (error) {
      const errorMessage = (error as Error).message;
      log({ 
        date: new Date(), 
        type: 'assembly-ai-error', 
        message: `Connection test failed: ${errorMessage}` 
      });
      
      // Add more helpful messages for common errors
      if (errorMessage.includes('Token exchange failed') || errorMessage.includes('No token received')) {
        log({ 
          date: new Date(), 
          type: 'assembly-ai-error', 
          message: 'Token exchange failed. This could be due to network issues or the token service being unavailable.' 
        });
        log({ 
          date: new Date(), 
          type: 'assembly-ai-error', 
          message: 'Check the network tab in your browser developer tools for more details.' 
        });
      } else if (errorMessage.includes('WebSocket')) {
        log({ 
          date: new Date(), 
          type: 'assembly-ai-error', 
          message: 'WebSocket connection failed. This could be due to network issues or firewall restrictions.' 
        });
      }
      
      setIsConnecting(false);
    }
  };

  return (
    <div className="assembly-ai-test">
      <h2>AssemblyAI Integration Test</h2>
      
      <div className="connection-status">
        <div className="status-indicator">
          <span className={`status-dot ${connectionStatus.toLowerCase()}`}></span>
          <span className="status-text">{connectionStatus}</span>
        </div>
        {sessionId && (
          <div className="session-id">
            Session ID: <code>{sessionId}</code>
          </div>
        )}
      </div>
      
      <div className="test-controls">
        <div className="input-group">
          <label htmlFor="user-id">User ID:</label>
          <input 
            id="user-id"
            type="text" 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            disabled={isConnecting}
          />
        </div>
        
        <div className="button-group">
          <button 
            onClick={testConnection} 
            disabled={isConnecting}
            className="primary"
          >
            {isConnecting ? 'Connecting...' : 'Test Connection'}
          </button>
        </div>
      </div>
      
      <div className="info-message">
        <p>All logs are displayed in the side panel. Open the side panel to view detailed logs.</p>
      </div>
    </div>
  );
};

export default AssemblyAITest;
