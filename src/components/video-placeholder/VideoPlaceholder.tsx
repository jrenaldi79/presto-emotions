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
 * VideoPlaceholder - Visual placeholder for when no video stream is available
 * 
 * @description Displays a visually appealing placeholder when no video stream is active
 * @functionality Provides visual feedback to users when no video is being shared
 */

import React from 'react';
import { IconCamera, IconCameraOff, IconScreenShare } from '../icons/LucideIcons';
import './VideoPlaceholder.scss';

interface VideoPlaceholderProps {
  isVisible: boolean;
}

const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="video-placeholder">
      <div className="placeholder-content">
        <div className="icon-container">
          <IconScreenShare size={64} className="monitor-icon" />
          <IconCameraOff size={32} className="video-off-icon" />
        </div>
        <h2>No Video Feed</h2>
        <p>Share your screen or enable your camera to begin emotion analysis</p>
        <div className="placeholder-instructions">
          <div className="instruction-step">
            <div className="step-number">1</div>
            <p>Click the camera or screen share button in the control panel below</p>
          </div>
          <div className="instruction-step">
            <div className="step-number">2</div>
            <p>Grant permission to access your camera or select a screen to share</p>
          </div>
          <div className="instruction-step">
            <div className="step-number">3</div>
            <p>Begin speaking to generate emotion analysis data</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlaceholder;
