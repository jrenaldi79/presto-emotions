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
 * TextResponsePanel - Emotion Visualization Dashboard
 * 
 * @description Component that displays and visualizes emotion data detected by the Gemini API.
 * Provides a dashboard interface with emotion responses, charts, and filtering capabilities.
 * 
 * @functionality
 * - Displays emotion responses with timestamps, quotes, and emoji representations
 * - Visualizes emotion data using charts and graphs for trend analysis
 * - Provides filtering and sorting options for emotion responses
 * - Allows clearing of stored emotion data
 * - Maps emotion names to corresponding emoji representations
 * 
 * @dataFlow Consumes emotion data from the response store and visualizes it
 * @userInteraction Provides controls for filtering, sorting, and clearing data
 * @visualization Uses Recharts for data visualization
 */

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ServerContent } from "../../multimodal-live-types";
import { Altair } from "../altair/Altair";
import { EmotionResponse, getStoredResponses, clearResponses, deleteResponse } from "../../lib/response-store";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  IconTrash2, 
  IconChevronDown, 
  IconChevronUp, 
  IconX, 
  IconAlertTriangle,
  // Emotion-specific icons
  IconHappy,
  IconSad,
  IconAngry,
  IconNeutral,
  IconLaugh,
  IconSparkles,
  IconThumbsUp,
  IconThumbsDown,
  IconLightbulb,
  IconBarChart,
  IconChartPie,
  IconBrain,
  IconHelpCircle,
  IconHeartCrack,
  IconFlame,
  IconPartyPopper,
  IconAgree,
  IconDisagree,
  IconZap,
  IconGlasses,
  IconHandMetal,
  IconHeart,
  IconSnowflake,
  IconClock,
  IconStar,
  IconBomb,
  IconCloudRain,
  IconWaves
} from '../icons/LucideIcons';
import "./TextResponsePanel.scss";

// Confirmation Modal Component
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?'
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-button" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-icon">
            <IconAlertTriangle size={24} color="#f59e0b" />
          </div>
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-button confirm" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

function TextResponsePanel() {
  const { client } = useLiveAPIContext();
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [emotionResponses, setEmotionResponses] = useState<EmotionResponse[]>([]);
  const [isToolSectionExpanded, setIsToolSectionExpanded] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const emotionSectionRef = useRef<HTMLDivElement>(null);
  const emotionAnalysisRef = useRef<HTMLDivElement>(null);
  
  // Function to open delete confirmation modal
  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };
  
  // Function to close delete confirmation modal
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };
  
  // Function to handle clearing all emotion data
  const handleClearEmotionData = () => {
    clearResponses();
    setEmotionResponses([]);
    closeDeleteModal();
  };
  
  // Function to handle deleting a specific emotion response
  const handleDeleteResponse = (id: string) => {
    deleteResponse(id);
    setEmotionResponses(prev => prev.filter(response => response.id !== id));
  };
  
  // Function to toggle tool section expansion
  const toggleToolSection = () => {
    setIsToolSectionExpanded(prev => !prev);
  };

  useEffect(() => {
    const onContent = (content: ServerContent) => {
      if ('modelTurn' in content && content.modelTurn?.parts) {
        const parts = content.modelTurn.parts;
        for (const part of parts) {
          if (part.text) {
            setCurrentResponse((prev) => prev + part.text);
          }
        }
      }
    };

    const onTurnComplete = () => {
      if (currentResponse) {
        setCurrentResponse("");
      }
    };

    client
      .on("content", onContent)
      .on("turncomplete", onTurnComplete);

    return () => {
      client
        .off("content", onContent)
        .off("turncomplete", onTurnComplete);
    };
  }, [client, currentResponse]);

  // Load emotion responses from localStorage on component mount
  useEffect(() => {
    // Initial load
    setEmotionResponses(getStoredResponses());
    
    // Set up interval to check for new responses every 5 seconds (increased from 2s)
    const intervalId = setInterval(() => {
      const latestResponses = getStoredResponses();
      // Only update if there's actually new data
      if (JSON.stringify(latestResponses) !== JSON.stringify(emotionResponses)) {
        setEmotionResponses(latestResponses);
      }
    }, 5000); // Increased to 5 seconds to reduce frequency of updates
    
    return () => clearInterval(intervalId);
  }, []); // Removed emotionResponses from dependency array to prevent constant re-renders

  // State to track if mouse is over the emotion section
  const [isMouseOverEmotionSection, setIsMouseOverEmotionSection] = useState(false);
  
  // State to track the previous count of emotion responses
  const prevEmotionResponsesCountRef = useRef(0);

  // Scroll to bottom only for the Emotions section, never for Analysis
  useEffect(() => {
    const currentCount = emotionResponses.length;
    const hasNewItem = currentCount > prevEmotionResponsesCountRef.current;
    
    // Update the previous count reference
    prevEmotionResponsesCountRef.current = currentCount;
    
    // Only auto-scroll when: 
    // 1. Mouse is not over the section AND
    // 2. A new item has been added
    if (emotionSectionRef.current && !isMouseOverEmotionSection && hasNewItem) {
      const contentElement = emotionSectionRef.current.querySelector('.section-content');
      if (contentElement) {
        contentElement.scrollTop = contentElement.scrollHeight;
      }
    }
    
    // Explicitly do NOT auto-scroll the analysis section
  }, [emotionResponses, isMouseOverEmotionSection]);
  
  // Mouse event handlers for the emotion section
  const handleMouseEnter = useCallback(() => {
    setIsMouseOverEmotionSection(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsMouseOverEmotionSection(false);
  }, []);

  // Format confidence as percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Get emotion icon based on the emotion type
  const getEmotionIcon = (emotion: string): React.ReactNode => {
    // Helper function to get the color for an emotion
    const getEmotionColor = (emotion: string): string => {
      const emotionLower = emotion.toLowerCase();
      
      // Happy emotions - green
      if (['happy', 'content', 'satisfied', 'nostalgic', 'shy', 'agreeable', 'grateful'].includes(emotionLower)) {
        return '#0d9c53'; // Green-500 direct hex value
      }
      // Sad emotions - blue
      else if (['sad', 'gloomy', 'dejected', 'melancholy', 'pessimistic'].includes(emotionLower)) {
        return '#1f94ff'; // Blue-500 direct hex value
      }
      // Angry emotions - red
      else if (['angry', 'hostile', 'irritable', 'annoyed', 'resentful', 'jealous', 'frustrated', 'contemptuous', 'disagree'].includes(emotionLower)) {
        return '#e03c00'; // Red-600 direct hex value
      }
      // Fearful emotions - purple
      else if (['fearful', 'anxious', 'horrified', 'timid', 'guilty', 'desperate'].includes(emotionLower)) {
        return '#8a4fff'; // Purple-500 direct hex value
      }
      // Excited emotions - yellow/orange
      else if (['enthusiastic', 'excited', 'excitable', 'eager', 'surprised', 'amazed', 'thrilled', 'elated'].includes(emotionLower)) {
        return '#ffcc00'; // Yellow-500 direct hex value
      }
      // Thoughtful emotions - cyan
      else if (['thoughtful', 'reflective', 'speculative', 'curious'].includes(emotionLower)) {
        return '#00b8d4'; // Cyan-500 direct hex value
      }
      // Confident emotions - bright orange
      else if (['confident', 'proud'].includes(emotionLower)) {
        return '#ff8c00'; // Orange-500 direct hex value
      }
      // Optimistic emotions - gold
      else if (['optimistic', 'hopeful', 'inspired'].includes(emotionLower)) {
        return '#ffa000'; // Yellow-600 direct hex value
      }
      // Arrogant emotions - deep orange
      else if (['arrogant', 'smug', 'boastful'].includes(emotionLower)) {
        return '#e65100'; // Orange-600 direct hex value
      }
      // Calm emotions - teal
      else if (['calm', 'neutral', 'humbled'].includes(emotionLower)) {
        return '#009688'; // Teal-500 direct hex value
      }
      // Confused emotions - purple
      else if (['confused', 'concerned', 'disbelieve', 'skeptical'].includes(emotionLower)) {
        return '#ab47bc'; // Purple-400 direct hex value
      }
      // Passionate emotions - deep red
      else if (['passionate', 'determined', 'focused'].includes(emotionLower)) {
        return '#bd3000'; // Red-700 direct hex value
      }
      // Impressed emotions - bright cyan
      else if (['impressed', 'amazed', 'awestruck'].includes(emotionLower)) {
        return '#00acc1'; // Cyan-600 direct hex value
      }
      // Default color - use a more visible gray instead of light gray
      return '#5f6368'; // gray-500 direct hex value
    };
    
    const emotionLower = emotion.toLowerCase();
    const color = getEmotionColor(emotionLower);
    
    // Create a default icon with the appropriate color
    const defaultIcon = <IconHappy size={20} className={`emotion-lucide-icon ${emotionLower}`} style={{ color: color }} />;
    
    // Map of emotion types to their corresponding icons
    const emotionToIconMap: Record<string, React.ReactNode> = {
      // Primary emotions
      happy: <IconHappy size={20} className="emotion-lucide-icon happy" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      sad: <IconSad size={20} className="emotion-lucide-icon sad" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      angry: <IconAngry size={20} className="emotion-lucide-icon angry" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      fearful: <IconHeartCrack size={20} className="emotion-lucide-icon fearful" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      disgusted: <IconThumbsDown size={20} className="emotion-lucide-icon disgusted" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      neutral: <IconNeutral size={20} className="emotion-lucide-icon neutral" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      
      // Secondary emotions
      amused: <IconLaugh size={20} className="emotion-lucide-icon amused" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      enthusiastic: <IconSparkles size={20} className="emotion-lucide-icon enthusiastic" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      playful: <IconPartyPopper size={20} className="emotion-lucide-icon playful" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      thoughtful: <IconBrain size={20} className="emotion-lucide-icon thoughtful" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      proud: <IconStar size={20} className="emotion-lucide-icon proud" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      confident: <IconStar size={20} className="emotion-lucide-icon confident" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      grateful: <IconHeart size={20} className="emotion-lucide-icon grateful" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      bashful: <IconSnowflake size={20} className="emotion-lucide-icon bashful" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      reflective: <IconGlasses size={20} className="emotion-lucide-icon reflective" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      passionate: <IconFlame size={20} className="emotion-lucide-icon passionate" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      overwhelmed: <IconCloudRain size={20} className="emotion-lucide-icon overwhelmed" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      embarrassed: <IconSnowflake size={20} className="emotion-lucide-icon embarrassed" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      excited: <IconZap size={20} className="emotion-lucide-icon excited" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      agreeable: <IconAgree size={20} className="emotion-lucide-icon agreeable" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      joking: <IconLaugh size={20} className="emotion-lucide-icon joking" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      surprised: <IconZap size={20} className="emotion-lucide-icon surprised" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      apologetic: <IconHelpCircle size={20} className="emotion-lucide-icon apologetic" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      impressed: <IconSparkles size={20} className="emotion-lucide-icon impressed" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      exasperated: <IconClock size={20} className="emotion-lucide-icon exasperated" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      optimistic: <IconStar size={20} className="emotion-lucide-icon optimistic" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      arrogant: <IconStar size={20} className="emotion-lucide-icon arrogant" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      calm: <IconWaves size={20} className="emotion-lucide-icon calm" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      confused: <IconHelpCircle size={20} className="emotion-lucide-icon confused" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      determined: <IconStar size={20} className="emotion-lucide-icon determined" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      
      // Additional emotion icons
      amazed: <IconSparkles size={20} className="emotion-lucide-icon amazed" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      disagree: <IconDisagree size={20} className="emotion-lucide-icon disagree" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      concerned: <IconHelpCircle size={20} className="emotion-lucide-icon concerned" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      disbelieve: <IconHelpCircle size={20} className="emotion-lucide-icon disbelieve" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      frustrated: <IconBomb size={20} className="emotion-lucide-icon frustrated" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      speculative: <IconBrain size={20} className="emotion-lucide-icon speculative" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      affectionate: <IconHeart size={20} className="emotion-lucide-icon affectionate" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      annoyed: <IconAngry size={20} className="emotion-lucide-icon annoyed" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      anxious: <IconClock size={20} className="emotion-lucide-icon anxious" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      bored: <IconClock size={20} className="emotion-lucide-icon bored" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      contemptuous: <IconThumbsDown size={20} className="emotion-lucide-icon contemptuous" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      dejected: <IconSad size={20} className="emotion-lucide-icon dejected" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      desperate: <IconHeartCrack size={20} className="emotion-lucide-icon desperate" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      eager: <IconZap size={20} className="emotion-lucide-icon eager" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      elated: <IconPartyPopper size={20} className="emotion-lucide-icon elated" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      excitable: <IconZap size={20} className="emotion-lucide-icon excitable" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      gloomy: <IconSad size={20} className="emotion-lucide-icon gloomy" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      guilty: <IconHeartCrack size={20} className="emotion-lucide-icon guilty" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      horrified: <IconHeartCrack size={20} className="emotion-lucide-icon horrified" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      hostile: <IconAngry size={20} className="emotion-lucide-icon hostile" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      humbled: <IconHeart size={20} className="emotion-lucide-icon humbled" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      impatient: <IconClock size={20} className="emotion-lucide-icon impatient" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      irritable: <IconAngry size={20} className="emotion-lucide-icon irritable" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      jealous: <IconAngry size={20} className="emotion-lucide-icon jealous" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      lazy: <IconClock size={20} className="emotion-lucide-icon lazy" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      melancholy: <IconSad size={20} className="emotion-lucide-icon melancholy" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      pessimistic: <IconSad size={20} className="emotion-lucide-icon pessimistic" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      resentful: <IconAngry size={20} className="emotion-lucide-icon resentful" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      scornful: <IconThumbsDown size={20} className="emotion-lucide-icon scornful" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      thrilled: <IconPartyPopper size={20} className="emotion-lucide-icon thrilled" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />,
      timid: <IconHeartCrack size={20} className="emotion-lucide-icon timid" style={{ color: color, fill: 'none', stroke: color, strokeWidth: 2 }} />
    };
    
    // Return the icon for the emotion, or a default icon if not found
    // This ensures all emotions get colored, even if they don't have a specific icon
    return emotionToIconMap[emotionLower] || defaultIcon;
  };

  // Prepare data for emotion analysis pie chart
  const emotionAnalysisData = useMemo(() => {
    // Use all emotion responses without filtering by confidence
    
    // Count total occurrences of each emotion
    const emotionCounts: Record<string, number> = {};
    
    emotionResponses.forEach((response) => {
      const emotion = response.emotion.toLowerCase();
      const formattedEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1);
      
      if (!emotionCounts[formattedEmotion]) {
        emotionCounts[formattedEmotion] = 0;
      }
      
      emotionCounts[formattedEmotion]++;
    });
    
    // Convert to pie chart data format
    return Object.entries(emotionCounts).map(([emotion, count]) => ({
      name: emotion,
      value: count,
      icon: getEmotionIcon(emotion.toLowerCase())
    }));
  }, [emotionResponses]);
  
  // Colors for the pie chart slices
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1'];
  
  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
          <p><strong>{data.name} {data.icon}</strong></p>
          <p>Count: {data.value}</p>
          <p>Percentage: {`${(payload[0].percent * 100).toFixed(2)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="text-response-panel" ref={panelRef}>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleClearEmotionData}
        title="Delete Emotion Data"
        message="Are you sure you want to delete all emotion data? This action cannot be undone."
      />
      <div className={`panel-section tool-section ${isToolSectionExpanded ? 'expanded' : 'minimized'}`}>
        <div className="section-header">
          <h2>Tool Responses</h2>
          <div className="header-actions">
            <button 
              className="toggle-section-button" 
              onClick={toggleToolSection} 
              title={isToolSectionExpanded ? "Minimize section" : "Expand section"}
            >
              {isToolSectionExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
            </button>
          </div>
        </div>
        <div className="section-content">
          <div className="altair-container">
            <Altair />
          </div>
        </div>
      </div>
      
      <div 
        className="panel-section emotion-section" 
        ref={emotionSectionRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="section-header">
          <h2>Emotion Analysis</h2>
          <div className="header-actions">
            <span className="response-count">{emotionResponses.length} entries</span>
            {emotionResponses.length > 0 && (
              <button 
                className="clear-data-button" 
                onClick={openDeleteModal} 
                title="Clear all emotion data"
              >
                <IconTrash2 size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="section-content">
          {emotionResponses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconBrain size={48} />
                <IconZap size={24} className="secondary-icon" />
              </div>
              <h3>Waiting for emotions</h3>
              <p>Waiting for emotions to buffer... humans are complicated!</p>
            </div>
          ) : (
            // Reverse the array to display newest entries at the bottom
            [...emotionResponses].reverse().map((response) => (
              <div key={response.id} className="emotion-response-item">
                <div className="emotion-header">
                  <div className="emotion-icon">{getEmotionIcon(response.emotion)}</div>
                  <span className="emotion-type">{response.emotion}</span>
                  <span className="emotion-confidence">{formatConfidence(response.confidence)}</span>
                  <button 
                    className="delete-response-button" 
                    onClick={() => handleDeleteResponse(response.id || '')}
                    title="Delete this emotion entry"
                  >
                    <IconX size={14} />
                  </button>
                </div>
                <div className="emotion-details">
                  <div className="emotion-person">
                    <strong>{response.person}</strong> at <span className="timestamp">{response.timestamp}</span>
                    {response.duration && (
                      <span className="emotion-duration"> for {response.duration}s</span>
                    )}
                  </div>
                  {response.quote && (
                    <div className="emotion-quote">
                      <p>"{response.quote}"</p>
                    </div>
                  )}
                  {response.notes && (
                    <div className="emotion-notes">
                      <p><em>Notes: {response.notes}</em></p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="panel-section emotion-analysis-section" ref={emotionAnalysisRef}>
        <div className="section-header">
          <h2>Emotion Analysis Summary</h2>
          <div className="header-actions">
          </div>
        </div>
        <div className="section-content">
          {emotionAnalysisData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconChartPie size={48} />
                <IconLightbulb size={24} className="secondary-icon" />
              </div>
              <h3>Confidence Level: ¯\_(ツ)_/¯</h3>
              <p>Our AI is still learning to read the room... just like most engineers!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400} className="pie-chart-container">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={emotionAnalysisData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {emotionAnalysisData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default TextResponsePanel;
