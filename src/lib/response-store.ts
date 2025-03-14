/**
 * Response Store - Emotion Data Management
 * 
 * @description Centralized store for managing emotion response data from the Gemini API.
 * Processes and stores emotion responses, providing utilities for extracting structured emotion
 * data from JSON text and mapping emotions to appropriate emoji representations.
 * 
 * @functionality
 * - Extracts emotion responses from JSON text (handles both single objects and arrays)
 * - Maps emotion names to corresponding emoji representations
 * - Stores emotion responses with timestamps for display in the UI
 * - Provides case-insensitive emotion matching for consistent emoji display
 * - Maintains a comprehensive mapping of emotions to emojis
 * 
 * @dataFlow Central store for emotion data that can be accessed by UI components
 * @dataProcessing Handles parsing, validation, and normalization of emotion data
 * @errorHandling Safely parses JSON with fallbacks for invalid formats
 * @persistence Uses localStorage to persist emotion data across browser refreshes
 */

export interface EmotionResponse {
  emotion: string;
  timestamp: string;
  confidence: number;
  quote: string;
  person: string;
  duration?: number; // Duration of the emotion in seconds
  notes?: string; // Additional observations about mixed emotions or context
  id?: string; // Unique identifier for each response
}

const STORAGE_KEY = 'gemini-emotion-responses';

// Helper to generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Get all stored responses
export const getStoredResponses = (): EmotionResponse[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error retrieving stored responses:', error);
    return [];
  }
};

// Add a new response to the store
export const addResponse = (response: EmotionResponse): EmotionResponse => {
  try {
    const responses = getStoredResponses();
    
    // Add unique ID and current timestamp if not provided
    const responseWithId = {
      ...response,
      id: response.id || generateId(),
      timestamp: response.timestamp || new Date().toISOString()
    };
    
    // Add to beginning of array to show newest first
    const updatedResponses = [responseWithId, ...responses];
    
    // Store in localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedResponses));
    
    return responseWithId;
  } catch (error) {
    console.error('Error storing response:', error);
    return response;
  }
};

// Clear all stored responses
export const clearResponses = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing responses:', error);
  }
};

// Delete a specific response by ID
export const deleteResponse = (id: string): void => {
  try {
    const responses = getStoredResponses();
    const filteredResponses = responses.filter(response => response.id !== id);
    
    // Update localStorage with the filtered responses
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredResponses));
  } catch (error) {
    console.error('Error deleting response:', error);
  }
};

// Enable or disable detailed logging for JSON parsing
const DEBUG_JSON_PARSING = true;

// Maximum length of text to log (to avoid console flooding)
const MAX_LOG_LENGTH = 100;

// Helper function to truncate text for logging
const truncateForLogging = (text: string): string => {
  if (text.length <= MAX_LOG_LENGTH) return text;
  return text.substring(0, MAX_LOG_LENGTH) + '...';
};

// Parse JSON from a string, safely handling invalid JSON
export const safeParseJSON = (text: string): any => {
  // Skip parsing for empty or obviously non-JSON text
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return null;
  }
  
  if (DEBUG_JSON_PARSING) {
    console.log('Attempting to parse text:', truncateForLogging(text));
  }
  
  try {
    // First attempt: Try direct parsing if it looks like complete JSON
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
      try {
        const result = JSON.parse(text);
        if (DEBUG_JSON_PARSING) console.log('Successfully parsed complete JSON');
        return result;
      } catch (e) {
        if (DEBUG_JSON_PARSING) console.log('Failed to parse as complete JSON, trying extraction');
        // Continue to extraction if direct parsing fails
      }
    }
    
    // Second attempt: Try to extract JSON object using regex
    // This regex looks for the outermost JSON object in the text
    const jsonMatch = text.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/);
    if (jsonMatch) {
      if (DEBUG_JSON_PARSING) {
        console.log('Found potential JSON match:', truncateForLogging(jsonMatch[0]));
      }
      try {
        const result = JSON.parse(jsonMatch[0]);
        if (DEBUG_JSON_PARSING) console.log('Successfully parsed extracted JSON');
        return result;
      } catch (innerError) {
        if (DEBUG_JSON_PARSING) {
          console.log('Failed to parse extracted JSON:', (innerError as Error).message);
        }
      }
    } else if (DEBUG_JSON_PARSING) {
      console.log('No JSON-like pattern found in text');
    }
    
    // If we get here, both parsing attempts failed
    return null;
  } catch (error) {
    // Only log warnings for text that might contain JSON to reduce noise
    if (text.includes('{') && text.includes('}')) {
      console.warn('Failed to parse potential JSON:', truncateForLogging(text));
      if (DEBUG_JSON_PARSING) {
        console.warn('Error details:', (error as Error).message);
      }
    }
    return null;
  }
};

// Try to extract emotion response(s) from text that might contain JSON
export const extractEmotionResponse = (text: string): EmotionResponse | EmotionResponse[] | null => {
  const jsonData = safeParseJSON(text);
  
  if (!jsonData) return null;
  
  // Check if it's an array of emotion responses
  if (Array.isArray(jsonData)) {
    if (DEBUG_JSON_PARSING) {
      console.log('Found array of potential emotion responses, length:', jsonData.length);
    }
    
    // Filter valid emotion responses from the array
    const validResponses = jsonData
      .filter(item => item && item.emotion && (item.confidence !== undefined) && item.person)
      .map(item => ({
        emotion: item.emotion,
        timestamp: item.timestamp || new Date().toLocaleTimeString(),
        confidence: item.confidence,
        quote: item.quote || '',
        person: item.person,
        duration: item.duration,
        notes: item.notes
      }));
    
    if (validResponses.length > 0) {
      if (DEBUG_JSON_PARSING) {
        console.log('Successfully extracted array of emotion responses:', validResponses);
      }
      return validResponses;
    }
    
    if (DEBUG_JSON_PARSING) {
      console.log('Array contained no valid emotion responses');
    }
    return null;
  }
  
  // Handle single emotion object
  // Debug validation of required fields for single object
  if (DEBUG_JSON_PARSING) {
    console.log('Validating parsed data as single object:', {
      hasEmotion: Boolean(jsonData.emotion),
      hasConfidence: jsonData.confidence !== undefined,
      hasPerson: Boolean(jsonData.person),
      emotion: jsonData.emotion,
      confidence: jsonData.confidence,
      person: jsonData.person
    });
  }
  
  // Check if the parsed object has the required fields
  if (jsonData.emotion && (jsonData.confidence !== undefined) && jsonData.person) {
    const response = {
      emotion: jsonData.emotion,
      timestamp: jsonData.timestamp || new Date().toLocaleTimeString(),
      confidence: jsonData.confidence,
      quote: jsonData.quote || '',
      person: jsonData.person,
      duration: jsonData.duration,
      notes: jsonData.notes
    };
    
    if (DEBUG_JSON_PARSING) {
      console.log('Successfully extracted single emotion response:', response);
    }
    
    return response;
  }
  
  if (DEBUG_JSON_PARSING && jsonData) {
    console.log('Parsed object missing required emotion fields');
  }
  
  return null;
};
