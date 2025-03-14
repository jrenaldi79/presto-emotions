/**
 * AssemblyAI Test Minimal Component
 * 
 * @description A minimal test component for verifying the AssemblyAI integration.
 * This component is designed to be embedded in the side panel.
 */

import { useState } from 'react';
import { AssemblyAIClient, ConnectionStatus } from '../../lib/assembly-ai-client';
import { useLoggerStore } from '../../lib/store-logger';

const SAMPLE_RATE = 16000;

interface AssemblyAITestMinimalProps {
  className?: string;
}

const AssemblyAITestMinimal: React.FC<AssemblyAITestMinimalProps> = ({ className = '' }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userId] = useState('test-user-' + Date.now().toString(36));
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
      
      setIsConnecting(false);
    }
  };

  return (
    <div className={`assembly-ai-test-minimal ${className}`}>
      <div className="test-button-container">
        <div className="status-indicator">
          <span className={`status-dot ${connectionStatus.toLowerCase()}`}></span>
        </div>
        <button 
          onClick={testConnection} 
          disabled={isConnecting}
          className="test-button"
        >
          {isConnecting ? 'Testing...' : 'Test AssemblyAI'}
        </button>
      </div>
    </div>
  );
};

export default AssemblyAITestMinimal;
