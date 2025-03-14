/**
 * Transcription Store - Speech-to-Text Data Management
 * 
 * @description Centralized store for managing transcription data from the AssemblyAI API.
 * Processes and stores transcription segments, providing utilities for managing transcription
 * data and integrating with emotion annotations.
 * 
 * @functionality
 * - Stores transcription segments with timestamps
 * - Supports both partial and final transcription segments
 * - Allows for emotion annotations to be added to transcription segments
 * - Provides utilities for retrieving and managing transcription data
 * 
 * @dataFlow Central store for transcription data that can be accessed by UI components
 * @dataProcessing Handles storage and retrieval of transcription data
 * @errorHandling Safely handles data operations with appropriate error logging
 * @persistence Uses localStorage to persist transcription data across browser refreshes
 */

export interface EmotionAnnotation {
  id: string;
  emotionId: string;
  emotionName: string;
  confidence: number;
  timestamp: number;
  position: number; // Character position in text
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  isFinal: boolean;
  emotions?: EmotionAnnotation[];
}

export interface TranscriptionSession {
  id: string;
  startTime: number;
  endTime?: number;
  segments: TranscriptionSegment[];
}

const STORAGE_KEY = 'assembly-ai-transcriptions';

// Helper to generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Get all stored transcription sessions
export const getStoredTranscriptionSessions = (): TranscriptionSession[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error retrieving stored transcription sessions:', error);
    return [];
  }
};

// Get the current active transcription session or create a new one
export const getCurrentSession = (): TranscriptionSession => {
  const sessions = getStoredTranscriptionSessions();
  
  // Check if there's an active session (no endTime)
  const activeSession = sessions.find(session => !session.endTime);
  
  if (activeSession) {
    return activeSession;
  }
  
  // Create a new session if none is active
  const newSession: TranscriptionSession = {
    id: generateId(),
    startTime: Date.now(),
    segments: []
  };
  
  // Store the new session
  const updatedSessions = [newSession, ...sessions];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
  
  return newSession;
};

// End the current session
export const endCurrentSession = (): void => {
  try {
    const sessions = getStoredTranscriptionSessions();
    const activeSessionIndex = sessions.findIndex(session => !session.endTime);
    
    if (activeSessionIndex !== -1) {
      // Mark the session as ended
      sessions[activeSessionIndex].endTime = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error ending current transcription session:', error);
  }
};

// Add or update a transcription segment
export const addOrUpdateSegment = (segment: TranscriptionSegment): TranscriptionSegment => {
  try {
    const sessions = getStoredTranscriptionSessions();
    const activeSessionIndex = sessions.findIndex(session => !session.endTime);
    
    if (activeSessionIndex === -1) {
      // No active session, create one
      const newSession: TranscriptionSession = {
        id: generateId(),
        startTime: Date.now(),
        segments: [segment]
      };
      
      const updatedSessions = [newSession, ...sessions];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
      return segment;
    }
    
    // Check if the segment already exists (for updating partial to final)
    const existingSegmentIndex = sessions[activeSessionIndex].segments.findIndex(
      s => s.id === segment.id
    );
    
    if (existingSegmentIndex !== -1) {
      // Update existing segment
      sessions[activeSessionIndex].segments[existingSegmentIndex] = segment;
    } else {
      // Add new segment
      sessions[activeSessionIndex].segments.push(segment);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return segment;
  } catch (error) {
    console.error('Error adding/updating transcription segment:', error);
    return segment;
  }
};

// Add emotion annotation to a transcription segment
export const addEmotionToSegment = (
  segmentId: string,
  emotion: EmotionAnnotation
): boolean => {
  try {
    const sessions = getStoredTranscriptionSessions();
    
    // Find the session and segment
    for (const session of sessions) {
      const segmentIndex = session.segments.findIndex(s => s.id === segmentId);
      
      if (segmentIndex !== -1) {
        // Initialize emotions array if it doesn't exist
        if (!session.segments[segmentIndex].emotions) {
          session.segments[segmentIndex].emotions = [];
        }
        
        // Add the emotion annotation
        session.segments[segmentIndex].emotions!.push(emotion);
        
        // Save the updated sessions
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        return true;
      }
    }
    
    return false; // Segment not found
  } catch (error) {
    console.error('Error adding emotion to transcription segment:', error);
    return false;
  }
};

// Get all segments from the current session
export const getCurrentSessionSegments = (): TranscriptionSegment[] => {
  const currentSession = getCurrentSession();
  return currentSession.segments;
};

// Clear all stored transcription sessions
export const clearTranscriptions = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing transcriptions:', error);
  }
};

// Delete a specific transcription session by ID
export const deleteTranscriptionSession = (sessionId: string): void => {
  try {
    const sessions = getStoredTranscriptionSessions();
    const filteredSessions = sessions.filter(session => session.id !== sessionId);
    
    // Update localStorage with the filtered sessions
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
  } catch (error) {
    console.error('Error deleting transcription session:', error);
  }
};

// Delete a specific segment by ID
export const deleteSegment = (segmentId: string): boolean => {
  try {
    const sessions = getStoredTranscriptionSessions();
    let segmentFound = false;
    
    // Find the session containing the segment
    for (const session of sessions) {
      const initialLength = session.segments.length;
      session.segments = session.segments.filter(s => s.id !== segmentId);
      
      if (session.segments.length < initialLength) {
        segmentFound = true;
      }
    }
    
    if (segmentFound) {
      // Save the updated sessions
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      return true;
    }
    
    return false; // Segment not found
  } catch (error) {
    console.error('Error deleting transcription segment:', error);
    return false;
  }
};

// Export transcription data as JSON
export const exportTranscriptionData = (): string => {
  try {
    const sessions = getStoredTranscriptionSessions();
    return JSON.stringify(sessions, null, 2);
  } catch (error) {
    console.error('Error exporting transcription data:', error);
    return '';
  }
};

// Import transcription data from JSON
export const importTranscriptionData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData) as TranscriptionSession[];
    
    // Validate the data structure
    if (!Array.isArray(data)) {
      console.error('Invalid transcription data format: not an array');
      return false;
    }
    
    // Basic validation of each session
    for (const session of data) {
      if (!session.id || !session.startTime || !Array.isArray(session.segments)) {
        console.error('Invalid transcription session format:', session);
        return false;
      }
    }
    
    // Store the imported data
    localStorage.setItem(STORAGE_KEY, jsonData);
    return true;
  } catch (error) {
    console.error('Error importing transcription data:', error);
    return false;
  }
};
