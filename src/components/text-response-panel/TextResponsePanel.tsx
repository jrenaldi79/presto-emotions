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

import { useEffect, useState, useRef, useMemo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ServerContent } from "../../multimodal-live-types";
import { Altair } from "../altair/Altair";
import { EmotionResponse, getStoredResponses, clearResponses } from "../../lib/response-store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  IconCloudRain
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
    setEmotionResponses(getStoredResponses());
    
    // Set up interval to check for new responses every 2 seconds
    const intervalId = setInterval(() => {
      const latestResponses = getStoredResponses();
      if (JSON.stringify(latestResponses) !== JSON.stringify(emotionResponses)) {
        setEmotionResponses(latestResponses);
      }
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [emotionResponses]);

  // Scroll to bottom when responses change
  useEffect(() => {
    if (emotionSectionRef.current) {
      const contentElement = emotionSectionRef.current.querySelector('.section-content');
      if (contentElement) {
        contentElement.scrollTop = contentElement.scrollHeight;
      }
    }
  }, [emotionResponses]);

  // Format confidence as percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Get emotion icon based on the emotion type
  const getEmotionIcon = (emotion: string): React.ReactNode => {
    const emotionToLucideIcon: Record<string, React.ReactNode> = {
      // Primary emotions
      happy: <IconHappy size={20} className="emotion-lucide-icon happy" />,
      sad: <IconSad size={20} className="emotion-lucide-icon sad" />,
      angry: <IconAngry size={20} className="emotion-lucide-icon angry" />,
      fearful: <IconHeartCrack size={20} className="emotion-lucide-icon fearful" />,
      disgusted: <IconThumbsDown size={20} className="emotion-lucide-icon disgusted" />,
      neutral: <IconNeutral size={20} className="emotion-lucide-icon neutral" />,
      
      // Secondary emotions
      amused: <IconLaugh size={20} className="emotion-lucide-icon amused" />,
      enthusiastic: <IconSparkles size={20} className="emotion-lucide-icon enthusiastic" />,
      playful: <IconPartyPopper size={20} className="emotion-lucide-icon playful" />,
      thoughtful: <IconBrain size={20} className="emotion-lucide-icon thoughtful" />,
      proud: <IconStar size={20} className="emotion-lucide-icon proud" />,
      grateful: <IconHeart size={20} className="emotion-lucide-icon grateful" />,
      bashful: <IconSnowflake size={20} className="emotion-lucide-icon bashful" />,
      reflective: <IconGlasses size={20} className="emotion-lucide-icon reflective" />,
      passionate: <IconFlame size={20} className="emotion-lucide-icon passionate" />,
      overwhelmed: <IconCloudRain size={20} className="emotion-lucide-icon overwhelmed" />,
      embarrassed: <IconSnowflake size={20} className="emotion-lucide-icon embarrassed" />,
      excited: <IconZap size={20} className="emotion-lucide-icon excited" />,
      agreeable: <IconAgree size={20} className="emotion-lucide-icon agreeable" />,
      joking: <IconLaugh size={20} className="emotion-lucide-icon joking" />,
      surprised: <IconZap size={20} className="emotion-lucide-icon surprised" />,
      apologetic: <IconHelpCircle size={20} className="emotion-lucide-icon apologetic" />,
      impressed: <IconSparkles size={20} className="emotion-lucide-icon impressed" />,
      exasperated: <IconClock size={20} className="emotion-lucide-icon exasperated" />,
      amazed: <IconSparkles size={20} className="emotion-lucide-icon amazed" />,
      disagree: <IconDisagree size={20} className="emotion-lucide-icon disagree" />,
      concerned: <IconHelpCircle size={20} className="emotion-lucide-icon concerned" />,
      disbelieve: <IconHelpCircle size={20} className="emotion-lucide-icon disbelieve" />,
      frustrated: <IconBomb size={20} className="emotion-lucide-icon frustrated" />,
      speculative: <IconHandMetal size={20} className="emotion-lucide-icon speculative" />,
      affectionate: <IconHeart size={20} className="emotion-lucide-icon affectionate" />,
      annoyed: <IconAngry size={20} className="emotion-lucide-icon annoyed" />,
      anxious: <IconClock size={20} className="emotion-lucide-icon anxious" />,
      arrogant: <IconThumbsUp size={20} className="emotion-lucide-icon arrogant" />,
      bored: <IconClock size={20} className="emotion-lucide-icon bored" />,
      calm: <IconNeutral size={20} className="emotion-lucide-icon calm" />,
      confident: <IconThumbsUp size={20} className="emotion-lucide-icon confident" />,
      confused: <IconHelpCircle size={20} className="emotion-lucide-icon confused" />,
      contemptuous: <IconThumbsDown size={20} className="emotion-lucide-icon contemptuous" />,
      content: <IconHappy size={20} className="emotion-lucide-icon content" />,
      curious: <IconLightbulb size={20} className="emotion-lucide-icon curious" />,
      dejected: <IconSad size={20} className="emotion-lucide-icon dejected" />,
      desperate: <IconHeartCrack size={20} className="emotion-lucide-icon desperate" />,
      eager: <IconZap size={20} className="emotion-lucide-icon eager" />,
      elated: <IconPartyPopper size={20} className="emotion-lucide-icon elated" />,
      excitable: <IconZap size={20} className="emotion-lucide-icon excitable" />,
      gloomy: <IconSad size={20} className="emotion-lucide-icon gloomy" />,
      guilty: <IconHeartCrack size={20} className="emotion-lucide-icon guilty" />,
      horrified: <IconHeartCrack size={20} className="emotion-lucide-icon horrified" />,
      hostile: <IconAngry size={20} className="emotion-lucide-icon hostile" />,
      humbled: <IconHeart size={20} className="emotion-lucide-icon humbled" />,
      impatient: <IconClock size={20} className="emotion-lucide-icon impatient" />,
      irritable: <IconAngry size={20} className="emotion-lucide-icon irritable" />,
      jealous: <IconAngry size={20} className="emotion-lucide-icon jealous" />,
      lazy: <IconClock size={20} className="emotion-lucide-icon lazy" />,
      melancholy: <IconSad size={20} className="emotion-lucide-icon melancholy" />,
      nostalgic: <IconHappy size={20} className="emotion-lucide-icon nostalgic" />,
      optimistic: <IconStar size={20} className="emotion-lucide-icon optimistic" />,
      pessimistic: <IconSad size={20} className="emotion-lucide-icon pessimistic" />,
      resentful: <IconAngry size={20} className="emotion-lucide-icon resentful" />,
      satisfied: <IconHappy size={20} className="emotion-lucide-icon satisfied" />,
      scornful: <IconThumbsDown size={20} className="emotion-lucide-icon scornful" />,
      sheepish: <IconSnowflake size={20} className="emotion-lucide-icon sheepish" />,
      shy: <IconHappy size={20} className="emotion-lucide-icon shy" />,
      skeptical: <IconHelpCircle size={20} className="emotion-lucide-icon skeptical" />,
      thrilled: <IconPartyPopper size={20} className="emotion-lucide-icon thrilled" />,
      timid: <IconHeartCrack size={20} className="emotion-lucide-icon timid" />,
    };
    
    return emotionToLucideIcon[emotion.toLowerCase()] || <IconHelpCircle size={20} className="emotion-lucide-icon unknown" />;
  };

  // Prepare data for emotion analysis chart
  const emotionAnalysisData = useMemo(() => {
    // Filter emotions with confidence >= 0.7
    const highConfidenceResponses = emotionResponses.filter(response => response.confidence >= 0.7);
    
    // Group by emotion and count by person
    const emotionData: Record<string, Record<string, number>> = {};
    const people = new Set<string>();
    
    highConfidenceResponses.forEach(response => {
      const emotion = response.emotion.toLowerCase();
      const person = response.person;
      
      // Add person to set of people
      people.add(person);
      
      // Initialize emotion entry if it doesn't exist
      if (!emotionData[emotion]) {
        emotionData[emotion] = {};
      }
      
      // Increment count for this person and emotion
      emotionData[emotion][person] = (emotionData[emotion][person] || 0) + 1;
    });
    
    // Convert to array format for Recharts
    return Object.entries(emotionData).map(([emotion, personCounts]) => {
      const result: any = {
        emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        icon: getEmotionIcon(emotion),
      };
      
      // Add counts for each person
      Array.from(people).forEach(person => {
        result[person] = personCounts[person] || 0;
      });
      
      return result;
    });
  }, [emotionResponses]);
  
  // Get unique people for the chart
  const uniquePeople = useMemo(() => {
    return Array.from(new Set(emotionResponses.map(response => response.person)));
  }, [emotionResponses]);

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
      
      <div className="panel-section emotion-section" ref={emotionSectionRef}>
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
              <p>No emotion responses yet</p>
            </div>
          ) : (
            // Reverse the array to display newest entries at the bottom
            [...emotionResponses].reverse().map((response) => (
              <div key={response.id} className="emotion-response-item">
                <div className="emotion-header">
                  <div className="emotion-icon">{getEmotionIcon(response.emotion)}</div>
                  <span className="emotion-type">{response.emotion}</span>
                  <span className="emotion-confidence">{formatConfidence(response.confidence)}</span>
                </div>
                <div className="emotion-details">
                  <div className="emotion-person">
                    <strong>{response.person}</strong> at <span className="timestamp">{response.timestamp}</span>
                  </div>
                  {response.quote && (
                    <div className="emotion-quote">
                      <p>"{response.quote}"</p>
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
            <span className="high-confidence-note">(confidence &gt;= 70%)</span>
          </div>
        </div>
        <div className="section-content">
          {emotionAnalysisData.length === 0 ? (
            <div className="empty-state">
              <p>No high-confidence emotion data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={emotionAnalysisData}
                layout="vertical"
                margin={{
                  top: 15,
                  right: 20,
                  left: 80, // Increased left margin for emotion labels
                  bottom: 35, // Increased bottom margin for legend separation
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  label={{ value: 'Count', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="category"
                  dataKey="emotion"
                  width={70}
                />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value} occurrences`, 
                    `${name} (${props.payload.emotion} ${props.payload.icon})`
                  ] as [string, string]}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: 15,
                    marginTop: 10,
                    borderTop: '1px solid var(--border-stroke)'
                  }} 
                />
                {uniquePeople.map((person, index) => {
                  // Generate different colors for each person
                  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];
                  const fill = colors[index % colors.length];
                  return (
                    <Bar key={person} dataKey={person} fill={fill} name={person} />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default TextResponsePanel;
