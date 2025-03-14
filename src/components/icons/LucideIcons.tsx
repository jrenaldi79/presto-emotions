/**
 * LucideIcons Component - Icon Usage Examples
 * 
 * @description Provides examples of how to use Lucide React icons in the application.
 * This component demonstrates various ways to import and use icons from the Lucide React library.
 */

import React from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  X,
  AlertTriangle,
  Activity,
  Heart,
  Smile,
  Frown,
  Meh,
  PanelLeftClose,
  PanelLeftOpen,
  Wifi,
  WifiOff,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ScreenShare,
  ChartBar,
  ChartPie,
  ScreenShareOff,
  Send,
  Music,
  Volume2,
  Play,
  Pause,
  // Emotion-specific icons
  ThumbsUp,
  ThumbsDown,
  Angry,
  Laugh,
  Lightbulb,
  Flame,
  PartyPopper,
  ThumbsUp as Agree,
  ThumbsDown as Disagree,
  HelpCircle,
  Zap,
  Sparkles,
  Frown as Sad,
  Smile as Happy,
  Meh as Neutral,
  HeartCrack,
  Brain,
  Glasses,
  HandMetal,
  Snowflake,
  Skull,
  Clover,
  Coffee,
  Bomb,
  Clock,
  Hourglass,
  Star,
  Sunset,
  Sunrise,
  Waves,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog
} from 'lucide-react';

// Example of how to use Lucide icons with custom props
export const LucideIconsExample: React.FC = () => {
  return (
    <div className="lucide-icons-example">
      <h3>Lucide Icons Usage Examples</h3>
      
      <div className="icon-grid">
        {/* Basic usage */}
        <div className="icon-item">
          <AlertCircle />
          <span>AlertCircle</span>
        </div>
        
        {/* With custom size */}
        <div className="icon-item">
          <ArrowRight size={24} />
          <span>ArrowRight (size 24)</span>
        </div>
        
        {/* With custom color */}
        <div className="icon-item">
          <Check color="green" />
          <span>Check (green)</span>
        </div>
        
        {/* With custom stroke width */}
        <div className="icon-item">
          <ChevronDown strokeWidth={3} />
          <span>ChevronDown (stroke 3)</span>
        </div>
        
        {/* With multiple custom props */}
        <div className="icon-item">
          <Trash2 size={20} color="red" strokeWidth={1.5} />
          <span>Trash2 (custom props)</span>
        </div>
        
        {/* With className for custom styling */}
        <div className="icon-item">
          <X className="custom-icon" />
          <span>X (with className)</span>
        </div>
        
        {/* Emotion-related icons */}
        <div className="icon-item">
          <Heart color="#ff6b6b" />
          <span>Heart</span>
        </div>
        
        <div className="icon-item">
          <Smile color="#2ecc71" />
          <span>Smile</span>
        </div>
        
        <div className="icon-item">
          <Frown color="#f39c12" />
          <span>Frown</span>
        </div>
        
        <div className="icon-item">
          <Meh color="#95a5a6" />
          <span>Meh</span>
        </div>
      </div>
      
      <div className="usage-notes">
        <h4>How to Use:</h4>
        <pre>
          {`
// 1. Import the icons you need
import { AlertCircle, Check, X } from 'lucide-react';

// 2. Use them in your component
return (
  <div>
    <AlertCircle size={24} color="red" />
    <Check color="green" />
    <X strokeWidth={2} />
  </div>
);
          `}
        </pre>
      </div>
    </div>
  );
};

// Export individual icons for direct use in other components
export const IconAlertCircle = AlertCircle;
export const IconArrowRight = ArrowRight;
export const IconCheck = Check;
export const IconChevronDown = ChevronDown;
export const IconChevronUp = ChevronUp;
export const IconTrash2 = Trash2;
export const IconX = X;
export const IconAlertTriangle = AlertTriangle;
export const IconActivity = Activity;
export const IconHeart = Heart;
export const IconSmile = Smile;
export const IconFrown = Frown;
export const IconMeh = Meh;
export const IconPanelLeftClose = PanelLeftClose;
export const IconPanelLeftOpen = PanelLeftOpen;
export const IconWifi = Wifi;
export const IconWifiOff = WifiOff;
export const IconMic = Mic;
export const IconMicOff = MicOff;
export const IconCamera = Camera;
export const IconCameraOff = CameraOff;
export const IconScreenShare = ScreenShare;
export const IconScreenShareOff = ScreenShareOff;
export const IconSend = Send;
export const IconMusic = Music;
export const IconVolume2 = Volume2;
export const IconPlay = Play;
export const IconPause = Pause;

// Emotion-specific icons
export const IconThumbsUp = ThumbsUp;
export const IconThumbsDown = ThumbsDown;
export const IconAngry = Angry;
export const IconLaugh = Laugh;
export const IconLightbulb = Lightbulb;
export const IconFlame = Flame;
export const IconPartyPopper = PartyPopper;
export const IconAgree = Agree;
export const IconDisagree = Disagree;
export const IconHelpCircle = HelpCircle;
export const IconZap = Zap;
export const IconSparkles = Sparkles;
export const IconSad = Sad;
export const IconHappy = Happy;
export const IconNeutral = Neutral;
export const IconHeartCrack = HeartCrack;
export const IconBrain = Brain;
export const IconGlasses = Glasses;
export const IconHandMetal = HandMetal;
export const IconSnowflake = Snowflake;
export const IconSkull = Skull;
export const IconClover = Clover;
export const IconCoffee = Coffee;
export const IconBomb = Bomb;
export const IconClock = Clock;
export const IconHourglass = Hourglass;
export const IconStar = Star;
export const IconSunset = Sunset;
export const IconSunrise = Sunrise;
export const IconWaves = Waves;
export const IconCloudRain = CloudRain;
export const IconCloudSnow = CloudSnow;
export const IconCloudLightning = CloudLightning;
export const IconCloudFog = CloudFog;
export const IconBarChart = ChartBar;
export const IconChartPie = ChartPie;

export default LucideIconsExample;
