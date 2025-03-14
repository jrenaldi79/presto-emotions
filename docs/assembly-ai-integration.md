# AssemblyAI Integration Plan

## Overview

This document outlines the implementation plan for integrating AssemblyAI's speech-to-text capabilities into the Presto Emotions project. The integration will allow for real-time transcription of audio streams in parallel with sending data to the Gemini API for emotion detection.

## Architecture

The integration follows a "Shared Audio Capture with Dual Output Streams" architecture:

1. **Audio Capture Layer**: Unified service that handles microphone access and processes raw audio
2. **Streaming Layer**: Separate services for Gemini and AssemblyAI streaming
3. **Data Management Layer**: Independent stores for transcription and emotion data
4. **UI Components**: New transcription panel and emotion integration controls
5. **Error Handling & Resilience**: Independent retry mechanisms for each service

## Implementation Phases

### Phase 1: Setup and Core Infrastructure

#### Step 1: Install AssemblyAI SDK ✅
- Add the AssemblyAI SDK as a project dependency
  ```bash
  npm install assemblyai
  ```
- Update package.json and lock files

**Documentation References:**
- AssemblyAI SDK Documentation: https://www.assemblyai.com/docs/getting-started/sdk-reference
- SDK Installation Guide: https://www.assemblyai.com/docs/getting-started/installation

#### Step 2: Create Transcription Data Store ✅
- Create a new file `src/lib/transcription-store.ts` similar to response-store.ts
- Implement functions for storing, retrieving, and managing transcription data
- Include support for inline emotion annotations

**Documentation References:**
- Real-time Transcription Data Structure: https://www.assemblyai.com/docs/models/real-time-transcription#transcript-object

#### Step 3: Create AssemblyAI Service ✅
- Create a new file `src/lib/assembly-ai-client.ts` to handle API interactions
- Implement token exchange with your existing endpoint:
  ```
  POST https://assembly-transcription-api-342936752541.us-central1.run.app/token
  Request Body: {
    "sampleRate": 16000,  // Required sample rate for audio
    "userId": "<user.id>" // Current authenticated user's ID
  }
  Response: {
    "token": "<assembly_ai_token>",
    "logs": [] // Optional debug logs
  }
  ```
- Create WebSocket connection management with retry logic

**Documentation References:**
- Real-time Transcription API: https://www.assemblyai.com/docs/models/real-time-transcription
- WebSocket API Reference: https://www.assemblyai.com/docs/models/real-time-transcription#websocket-api
- Authentication Guide: https://www.assemblyai.com/docs/getting-started/authentication

### Phase 2: Audio Integration

#### Step 4: Create Shared Audio Capture Service
- Create a new file `src/lib/shared-audio-capture.ts`
- Refactor existing audio capture to support dual streaming
- Implement audio buffer sharing between Gemini and AssemblyAI

**Documentation References:**
- Audio Requirements: https://www.assemblyai.com/docs/models/real-time-transcription#audio-requirements
- Sample Rate Guidelines: https://www.assemblyai.com/docs/models/real-time-transcription#sample-rate

#### Step 5: Create AssemblyAI Hook
- Create a new file `src/hooks/use-assembly-ai.ts`
- Implement connection management, transcription handling, and error recovery
- Ensure independent operation from the Gemini API connection

**Documentation References:**
- Real-time Transcription Events: https://www.assemblyai.com/docs/models/real-time-transcription#events
- Error Handling: https://www.assemblyai.com/docs/models/real-time-transcription#error-handling

#### Step 6: Create Transcription Context
- Create a new file `src/contexts/TranscriptionContext.tsx`
- Provide transcription data and functions to components
- Implement state management for transcription data

**Documentation References:**
- SDK React Integration Examples: https://www.assemblyai.com/docs/integrations/frontend-frameworks/react

### Phase 3: UI Components

#### Step 7: Create Transcription Panel Component
- Create a new directory `src/components/transcription-panel/`
- Implement `TranscriptionPanel.tsx` and `TranscriptionPanel.scss`
- Display real-time transcriptions below the video component

**Documentation References:**
- Partial vs. Final Results: https://www.assemblyai.com/docs/models/real-time-transcription#partial-vs-final-results
- UI Best Practices: https://www.assemblyai.com/docs/guides/real-time-transcription-ui-best-practices

#### Step 8: Create Emotion Integration UI
- Add buttons to emotion items in the TextResponsePanel
- Implement functionality to add emotions to transcriptions
- Create visual indicators for emotions in transcriptions

#### Step 9: Update App Layout
- Modify App.tsx to include the new TranscriptionPanel
- Adjust layout and styling for the new component

### Phase 4: Testing and Refinement

#### Step 10: Implement Error Handling
- Add comprehensive error handling throughout the new components
- Implement connection status indicators
- Create user-friendly error messages

**Documentation References:**
- Troubleshooting Guide: https://www.assemblyai.com/docs/models/real-time-transcription#troubleshooting
- Connection Status Management: https://www.assemblyai.com/docs/models/real-time-transcription#connection-status

#### Step 11: Optimize Performance
- Review and optimize audio processing
- Ensure efficient rendering of transcription updates
- Test with various audio inputs and network conditions

**Documentation References:**
- Performance Optimization: https://www.assemblyai.com/docs/guides/optimizing-real-time-transcription-performance
- Browser Compatibility: https://www.assemblyai.com/docs/models/real-time-transcription#browser-compatibility

#### Step 12: Add Local Storage
- Implement persistence for transcription data
- Add export/import functionality for transcriptions
- Ensure data synchronization between sessions

## Detailed Implementation Specifications

### Transcription Data Structure
```typescript
interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  isFinal: boolean;
  emotions?: EmotionAnnotation[];
}

interface EmotionAnnotation {
  id: string;
  emotionId: string;
  emotionName: string;
  confidence: number;
  timestamp: number;
  position: number; // Character position in text
}

interface TranscriptionSession {
  id: string;
  startTime: number;
  endTime?: number;
  segments: TranscriptionSegment[];
}
```

### AssemblyAI Client Implementation
```typescript
class AssemblyAIClient {
  // Connection management
  async connect(userId: string): Promise<void> {
    // Token exchange with your existing endpoint
    const response = await fetch('https://assembly-transcription-api-342936752541.us-central1.run.app/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sampleRate: 16000,
        userId: userId
      }),
    });
    
    const { token, logs } = await response.json();
    
    // Optional: Handle debug logs
    if (logs && logs.length > 0) {
      console.debug('AssemblyAI token exchange logs:', logs);
    }
    
    // Initialize AssemblyAI client with token
    this.client = new AssemblyAI.RealtimeClient({ token });
    // Additional setup...
  }
  
  async disconnect(): Promise<void>;
  
  // Audio streaming
  sendAudio(audioData: Uint8Array): void;
  
  // Event handling
  onTranscript(callback: (transcript: TranscriptionSegment) => void): void;
  onError(callback: (error: Error) => void): void;
  onConnectionStatus(callback: (status: ConnectionStatus) => void): void;
  
  // Retry logic
  private handleReconnection(): void;
}
```

### Shared Audio Capture Implementation
```typescript
class SharedAudioCapture {
  // Initialization
  async initialize(): Promise<void>;
  
  // Stream management
  startCapture(): void;
  stopCapture(): void;
  
  // Dual output streams
  connectGeminiOutput(processor: (data: Uint8Array) => void): void;
  connectAssemblyAIOutput(processor: (data: Uint8Array) => void): void;
  
  // Resource management
  releaseResources(): void;
}
```

### TranscriptionPanel Component Structure
```typescript
const TranscriptionPanel: React.FC = () => {
  // State management
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Context usage
  const { client, status } = useTranscriptionContext();
  
  // Rendering
  return (
    <div className="transcription-panel">
      <div className="transcription-header">
        <h3>Live Transcription</h3>
        <ConnectionStatus status={status} />
      </div>
      <div className="transcription-content">
        {transcriptions.map(segment => (
          <TranscriptionSegment 
            key={segment.id} 
            segment={segment} 
          />
        ))}
      </div>
    </div>
  );
};
```

### Emotion Integration Implementation
```typescript
const addEmotionToTranscription = (
  transcriptionId: string, 
  emotionId: string
): void => {
  // Find the appropriate transcription segment
  // Create an emotion annotation
  // Update the transcription store
};

// Button in emotion list
<button 
  className="add-to-transcript-button"
  onClick={() => addEmotionToTranscription(activeTranscriptionId, emotion.id)}
>
  Add to Transcript
</button>
```

## Additional AssemblyAI Documentation Resources

1. **Core Documentation**
   - Main Documentation: https://www.assemblyai.com/docs
   - API Reference: https://www.assemblyai.com/docs/api-reference

2. **Real-time Transcription**
   - Real-time Concepts: https://www.assemblyai.com/docs/models/real-time-transcription#concepts
   - WebSocket Protocol: https://www.assemblyai.com/docs/models/real-time-transcription#websocket-protocol

3. **Advanced Features**
   - Speaker Diarization: https://www.assemblyai.com/docs/models/real-time-transcription#speaker-diarization
   - Word-level Timestamps: https://www.assemblyai.com/docs/models/real-time-transcription#word-timestamps

4. **SDK-specific Resources**
   - SDK GitHub Repository: https://github.com/AssemblyAI/assemblyai-node-sdk
   - SDK Examples: https://www.assemblyai.com/docs/getting-started/sdk-examples

5. **Tutorials and Guides**
   - Real-time Transcription Tutorial: https://www.assemblyai.com/docs/tutorials/real-time-transcription
   - Integration Patterns: https://www.assemblyai.com/docs/guides/integration-patterns