# Presto Emotions - Project Structure

```
.
├── docs/                       # Project documentation
│   └── structure.md            # This file - project structure documentation
├── public/                     # Static assets served directly by the web server
│   ├── favicon.ico             # Application favicon
│   ├── index.html              # HTML entry point
│   └── robots.txt              # Robots crawling instructions
├── readme/                     # README assets
│   └── thumbnail.png           # Thumbnail image for README
├── src/                        # Source code
│   ├── components/             # React components organized by feature
│   │   ├── altair/             # Emotion detection visualization component
│   │   │   ├── Altair.scss     # Altair component styles
│   │   │   └── Altair.tsx      # Altair component implementation
│   │   ├── audio-pulse/        # Audio visualization components
│   │   │   ├── AudioPulse.tsx  # Audio pulse visualization component
│   │   │   └── audio-pulse.scss # Audio pulse styles
│   │   ├── control-tray/       # User control interface components
│   │   │   ├── ControlTray.tsx # Control tray component implementation
│   │   │   └── control-tray.scss # Control tray styles
│   │   ├── icons/              # Icon components and utilities
│   │   │   ├── LucideIcons.scss # Icon styles
│   │   │   └── LucideIcons.tsx # Lucide icon examples and exports
│   │   ├── logger/             # Logging and debug components
│   │   │   ├── Logger.tsx      # Logger component implementation
│   │   │   ├── logger.scss     # Logger styles
│   │   │   └── mock-logs.ts    # Mock log data for development
│   │   ├── side-panel/         # Side panel UI components
│   │   │   ├── SidePanel.tsx   # Side panel implementation
│   │   │   └── side-panel.scss # Side panel styles
│   │   └── text-response-panel/ # Emotion visualization dashboard
│   │       ├── TextResponsePanel.scss # Dashboard styles
│   │       └── TextResponsePanel.tsx  # Dashboard implementation
│   ├── contexts/               # React context providers
│   │   └── LiveAPIContext.tsx  # Gemini Live API context provider
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-live-api.ts     # Hook for Gemini Live API integration
│   │   ├── use-media-stream-mux.ts # Media stream multiplexing hook
│   │   ├── use-screen-capture.ts   # Screen capture functionality hook
│   │   └── use-webcam.ts       # Webcam access and management hook
│   ├── lib/                    # Core libraries and utilities
│   │   ├── worklets/           # Audio worklet processors
│   │   │   ├── audio-processing.ts # Audio processing worklet
│   │   │   └── vol-meter.ts    # Volume meter worklet
│   │   ├── audio-mixer.ts      # Audio mixing functionality
│   │   ├── audio-recorder.ts   # Audio recording functionality
│   │   ├── audio-streamer.ts   # Audio streaming functionality
│   │   ├── audioworklet-registry.ts # Audio worklet registration
│   │   ├── combined-audio-recorder.ts # Combined audio recording
│   │   ├── multimodal-live-client.ts # Gemini API client implementation
│   │   ├── response-store.ts   # Emotion response data store
│   │   ├── store-logger.ts     # Logging store implementation
│   │   └── utils.ts            # General utility functions
│   ├── App.scss                # Main application styles
│   ├── App.test.tsx            # Application tests
│   ├── App.tsx                 # Main application component
│   ├── index.css               # Global CSS styles
│   ├── index.tsx               # Application entry point
│   ├── multimodal-live-types.ts # Type definitions for Gemini API
│   ├── react-app-env.d.ts      # React environment type definitions
│   ├── reportWebVitals.ts      # Web vitals reporting
│   └── setupTests.ts           # Test setup configuration
├── .env                        # Environment variables
├── .gcloudignore               # Google Cloud ignore file
├── .gitignore                  # Git ignore file
├── .windsurfrules              # Windsurf IDE configuration
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # Project license
├── README.md                   # Project documentation
├── app.yaml                    # Google Cloud App Engine configuration
├── package-lock.json           # NPM package lock
├── package.json                # NPM package configuration
└── tsconfig.json               # TypeScript configuration
```

## Key Directories

### `/src`
Contains all the source code for the application, organized into subdirectories by functionality.

### `/src/components`
React components organized by feature. Each subdirectory contains components related to a specific feature or functionality:

- **altair/**: Emotion detection visualization component that processes video/audio streams and extracts emotion data using Gemini's multimodal capabilities.
- **audio-pulse/**: Audio visualization components that provide real-time feedback on audio input.
- **control-tray/**: User control interface components for managing application settings and inputs.
- **icons/**: Icon components and utilities, including Lucide React icon implementations.
- **logger/**: Logging and debug components for development and troubleshooting.
- **side-panel/**: Side panel UI components for console and user input.
- **text-response-panel/**: Emotion visualization dashboard that displays detected emotions with charts, filtering, and management capabilities.

### `/src/contexts`
React context providers for state management across the application:

- **LiveAPIContext.tsx**: Context provider for Gemini Live API integration, managing connection state and configuration.

### `/src/hooks`
Custom React hooks that encapsulate reusable logic:

- **use-live-api.ts**: Hook for interacting with the Gemini Live API.
- **use-media-stream-mux.ts**: Hook for multiplexing media streams.
- **use-screen-capture.ts**: Hook for capturing screen content.
- **use-webcam.ts**: Hook for managing webcam access and streaming.

### `/src/lib`
Core libraries, utilities, and services used throughout the application:

- **worklets/**: Audio worklet processors for efficient audio processing.
- **audio-*.ts**: Audio processing, recording, and streaming functionality.
- **multimodal-live-client.ts**: Client implementation for the Gemini Multimodal Live API.
- **response-store.ts**: Store for emotion response data with persistence capabilities.
- **store-logger.ts**: Logging store implementation for debugging and development.

### `/public`
Static assets served directly by the web server, including the HTML entry point and favicon.

### `/docs`
Project documentation, including this structure documentation.

## Application Flow

1. The application initializes in `index.tsx` and renders the main `App` component.
2. The `LiveAPIContext` provides Gemini API connectivity to all components.
3. Media inputs (webcam, audio) are captured using custom hooks (`use-webcam.ts`, etc.).
4. Audio is processed through audio worklets for efficient handling.
5. The Gemini API processes media streams and detects emotions.
6. Detected emotions are stored in the response store (`response-store.ts`).
7. The `TextResponsePanel` component visualizes the emotion data with charts and filtering options.
8. The `SidePanel` provides user input and console functionality.
9. The `ControlTray` allows users to manage application settings and inputs.

## Key Features

1. **Real-time Emotion Detection**: Analyzes video and audio streams to detect emotions with confidence scores.
2. **Comprehensive Emotion Dashboard**: Visualizes detected emotions with charts, graphs, and filtering capabilities.
3. **Advanced Media Processing**: Enhanced webcam and audio recording with volume metering and visualization.
4. **Structured Data Management**: Stores and retrieves emotion data with timestamps and contextual quotes.
5. **Interactive UI**: User-friendly interface with reconnection status indicators and emoji representations.
