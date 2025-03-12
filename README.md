# Presto Emotions - Emotion Detection & Analysis Console

Presto Emotions is a specialized React application for real-time emotion detection and analysis using the [Multimodal Live API](https://ai.google.dev/api/multimodal-live) over a websocket. Originally based on Google's Multimodal Live API web console, this application has been transformed into a comprehensive emotion detection and visualization system that processes video/audio streams and extracts emotion data using Gemini's multimodal capabilities.

[![Multimodal Live API Demo](readme/thumbnail.png)](https://www.youtube.com/watch?v=J_q7JY1XxFE)

Watch the demo of the original Multimodal Live API [here](https://www.youtube.com/watch?v=J_q7JY1XxFE).

## Key Features

- **Real-time Emotion Detection**: Analyzes video and audio streams to detect emotions with confidence scores
- **Comprehensive Emotion Dashboard**: Visualizes detected emotions with charts, graphs, and filtering capabilities
- **Advanced Media Processing**: Enhanced webcam and audio recording with volume metering and visualization
- **Structured Data Management**: Stores and retrieves emotion data with timestamps and contextual quotes
- **Professional UI**: User-friendly interface with reconnection status indicators and emotion-specific Lucide icons
- **Visual Consistency**: Color-coded emotion categories for improved readability and intuitive understanding

## Usage

To get started, [create a free Gemini API key](https://aistudio.google.com/apikey) and add it to the `.env` file. Then:

```
$ npm install && npm start
```

## Project Modifications

This project has been significantly modified from the original Gemini Multimodal Live API web console:

1. **Emotion Detection System**:
   - Repurposed the Altair component to detect emotions from video/audio streams
   - Added specialized system instructions for non-verbal cue analysis
   - Implemented JSON response parsing for structured emotion data extraction

2. **Emotion Visualization Dashboard**:
   - Created a comprehensive emotion visualization system in TextResponsePanel
   - Added charts and graphs using Recharts for data visualization
   - Implemented filtering, sorting, and data management capabilities

3. **Enhanced Media Handling**:
   - Improved webcam hook with better documentation and error handling
   - Enhanced audio recording with advanced processing capabilities
   - Added support for volume metering and audio visualization

4. **UI Improvements**:
   - Added reconnection status indicators for API connection monitoring
   - Implemented a more user-friendly console interface
   - Enhanced emotion visualization with professional Lucide icons
   - Color-coded emotion categories for improved visual distinction

5. **Data Management**:
   - Created a response store system for emotion data persistence
   - Implemented timestamp tracking for emotion responses
   - Added support for both single emotion objects and arrays

6. **Lucide Icon Integration**:
   - Replaced emoji representations with professional Lucide React icons
   - Implemented emotion-specific icons for various emotional states
   - Created a consistent visual language with color-coded emotion categories
   - Enhanced user experience with visually distinct emotion representations


## Project Structure

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
│   │   ├── audio-pulse/        # Audio visualization components
│   │   ├── control-tray/       # User control interface components
│   │   ├── icons/              # Icon components and utilities
│   │   ├── logger/             # Logging and debug components
│   │   ├── side-panel/         # Side panel UI components
│   │   └── text-response-panel/ # Emotion visualization dashboard
│   ├── contexts/               # React context providers
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Core libraries and utilities
├── .env                        # Environment variables
├── README.md                   # Project documentation
└── package.json                # NPM package configuration
```

### Key Directories

- **/src/components**: React components organized by feature, including the emotion visualization dashboard and control interfaces
- **/src/contexts**: React context providers for state management across the application
- **/src/hooks**: Custom React hooks for media handling, API integration, and more
- **/src/lib**: Core libraries, utilities, and services used throughout the application

For a complete and detailed project structure, refer to [docs/structure.md](docs/structure.md).

## Example

Below is an example of an entire application that will use Google Search grounding and then render graphs using [vega-embed](https://github.com/vega/vega-embed):

```typescript
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

export function Altair() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}
```


## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

_This is an experiment showcasing the Multimodal Live API, not an official Google product. We’ll do our best to support and maintain this experiment but your mileage may vary. We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators' rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://developers.google.com/terms/site-policies)._
