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
 * ControlTray Component - Media Control Interface
 * 
 * @description User interface component that provides controls for managing media streams
 * and connection to the Gemini Live API. Handles microphone, video, and screen sharing controls.
 * 
 * @functionality
 * - Manages connection state visualization (connected, reconnecting)
 * - Controls for microphone muting/unmuting
 * - Controls for webcam and screen sharing activation/deactivation
 * - Audio visualization with volume metering
 * - System audio capture controls and balance adjustment
 * - Video frame capture and transmission to the Gemini API
 * 
 * @dataFlow Interacts with the LiveAPI client to manage connection state
 * @mediaHandling Manages video and audio streams from different sources
 * @userInteraction Provides intuitive controls for media management
 * @reconnection Visually indicates when reconnection is in progress
 */

import cn from "classnames";

import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { CombinedAudioRecorder } from "../../lib/combined-audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import { 
  IconMic, 
  IconMicOff, 
  IconCamera, 
  IconCameraOff, 
  IconScreenShare, 
  IconScreenShareOff, 
  IconX,
  IconWifi,
  IconMusic,
  IconPlay,
  IconPause 
} from "../icons/LucideIcons";
import "./control-tray.scss";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * Button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) => {
    // Render Lucide icons based on the icon name
    const renderIcon = (iconName: string) => {
      switch (iconName) {
        case "videocam":
          return <IconCamera size={20} />;
        case "videocam_off":
          return <IconCameraOff size={20} />;
        case "present_to_all":
          return <IconScreenShare size={20} />;
        case "cancel_presentation":
          return <IconScreenShareOff size={20} />;
        default:
          return null;
      }
    };
    
    return isStreaming ? (
      <button className="action-button" onClick={stop}>
        {renderIcon(onIcon)}
      </button>
    ) : (
      <button className="action-button" onClick={start}>
        {renderIcon(offIcon)}
      </button>
    );
  }
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new CombinedAudioRecorder());
  const [muted, setMuted] = useState(false);
  const [systemAudioActive, setSystemAudioActive] = useState(false);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    
    if (connected && !muted && audioRecorder) {
      // If screen capture is active and has system audio, use combined recording
      if (activeVideoStream && screenCapture.isStreaming && screenCapture.hasSystemAudio) {
        audioRecorder
          .on("data", onData)
          .on("volume", setInVolume)
          .startCombined(activeVideoStream);
        setSystemAudioActive(true);
      } else {
        // Otherwise just use microphone
        audioRecorder
          .on("data", onData)
          .on("volume", setInVolume)
          .startMicrophoneOnly();
        setSystemAudioActive(false);
      }
    } else {
      audioRecorder.stop();
      setSystemAudioActive(false);
    }
    
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder, activeVideoStream, screenCapture.isStreaming, screenCapture.hasSystemAudio]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
      
      // Mute the video element when screen sharing with system audio is active
      // This prevents the echo caused by audio playing from both the original source and the app
      if (screenCapture.isStreaming && screenCapture.hasSystemAudio) {
        videoRef.current.muted = true;
      } else {
        videoRef.current.muted = false;
      }
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef, screenCapture.isStreaming, screenCapture.hasSystemAudio]);

  //handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
      
      // If we're switching to screen capture and it has system audio, make sure the video is muted
      if (next.type === "screen" && next.hasSystemAudio && videoRef.current) {
        videoRef.current.muted = true;
      }
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className="control-tray">
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      <nav className={cn("actions-nav", { disabled: !connected, "with-audio-controls": showAudioControls && systemAudioActive })}>
        <button
          className={cn("action-button mic-button")}
          onClick={() => setMuted(!muted)}
        >
          {!muted ? (
            <IconMic size={20} />
          ) : (
            <IconMicOff size={20} />
          )}
        </button>

        <div className="action-button no-action outlined">
          <AudioPulse volume={volume} active={connected} hover={false} />
        </div>

        {supportsVideo && (
          <>
            <div className="stream-button-container">
              <MediaStreamButton
                isStreaming={screenCapture.isStreaming}
                start={changeStreams(screenCapture)}
                stop={changeStreams()}
                onIcon="cancel_presentation"
                offIcon="present_to_all"
              />
              {screenCapture.isStreaming && screenCapture.hasSystemAudio && (
                <div 
                  className="system-audio-indicator" 
                  title="System audio is being captured. Click to adjust audio balance."
                  onClick={() => setShowAudioControls(!showAudioControls)}
                >
                  <IconMusic size={16} />
                </div>
              )}
            </div>
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon="videocam_off"
              offIcon="videocam"
            />
          </>
        )}
        {children}
      </nav>

      <div className={cn("connection-container", { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn("action-button connect-toggle", { connected })}
            onClick={connected ? disconnect : connect}
          >
            {connected ? <IconPause size={20} /> : <IconPlay size={20} />}
          </button>
        </div>
        <span className="text-indicator">
          Streaming
          {systemAudioActive && (
            <span className="system-audio-text"> (with system audio)</span>
          )}
        </span>
        
        {/* Audio balance controls */}
        {showAudioControls && systemAudioActive && (
          <div className="audio-balance-controls">
            <div className="audio-balance-header">
              <h4>Audio Balance</h4>
              <button 
                className="close-button" 
                onClick={() => setShowAudioControls(false)}
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="audio-balance-presets">
              <button 
                className="preset-button" 
                onClick={() => audioRecorder.optimizeForEchoCancellation()}
                title="Reduce echo by prioritizing system audio"
              >
                <IconWifi size={18} />
                <span>Reduce Echo</span>
              </button>
              <button 
                className="preset-button" 
                onClick={() => audioRecorder.optimizeForVoiceClarity()}
                title="Prioritize your voice over system audio"
              >
                <IconMic size={18} />
                <span>Voice Priority</span>
              </button>
            </div>
            <div className="audio-balance-sliders">
              <div className="slider-group">
                <label>
                  <IconMusic size={16} />
                  System
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  defaultValue="0.9"
                  onChange={(e) => {
                    const systemVol = parseFloat(e.target.value);
                    const micVol = 1 - systemVol;
                    audioRecorder.balanceAudioSources(systemVol, micVol);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(ControlTray);
