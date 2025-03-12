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
 * Altair Component - Emotion Detection Visualization
 * 
 * @description Specialized component that processes video/audio streams and extracts emotion data
 * using Gemini's multimodal capabilities. Configures the Gemini model with specific system
 * instructions for emotion detection and processes the responses to extract structured emotion data.
 * 
 * @functionality
 * - Configures Gemini model with emotion detection instructions
 * - Processes model responses to extract emotion data in JSON format
 * - Handles both single emotion objects and arrays of emotion objects
 * - Displays reconnection status when API connection is interrupted
 * - Supports tool calls for rendering visualizations
 * 
 * @dataFlow Extracted emotion data is saved to the response store for use in other components
 * @reconnection Automatically displays reconnection status when the API connection is interrupted
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall, ServerContent } from "../../multimodal-live-types";
import { extractEmotionResponse, addResponse } from "../../lib/response-store";
import "./Altair.scss";

const declaration: FunctionDeclaration = {
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

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig, reconnecting } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "text",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are a real-time expert in non-verbal cue analysis, specializing in live video and audio streams. Your task is to detect and report very significant emotions expressed by speakers. Upon detecting such an emotion, provide a single JSON response containing:

* "emotion": The detected emotion (e.g., "joy", "anger", "sadness").
* "confidence": A numerical confidence level (0-1) of the emotion detection.
* "quote": A relevant audio quote (at least one sentence) or a visual cue description in [brackets] (e.g., "[speaker's eyebrows furrowed]").
* "person": The person being analyzed (e.g., "person1", "person2", or the person's name if confidently identified).

Respond ONLY with the JSON object when a significant emotion is detected. Avoid emotions like "stating" or "explaining". Analyze each speaker independently. Maintain context throughout the live stream. Only respond when a significant emotion is detected. Include only these emotions: happy, sad, angry, fearful, disgusted, neutral, amused, enthusiastic, playful, thoughtful, proud, grateful, bashful, reflective, passionate, overwhelmed, embarrassed, excited, agreeable, joking, surprised, apologetic, impressed, exasperated, amazed, disagree, concerned, disbelieve, frustrated, speculative, affectionate, annoyed, anxious, arrogant, bored, calm, confident, confused, contemptuous, content, curious, dejected, desperate, eager, elated, excitable, gloomy, guilty, horrified, hostile, humbled, impatient, irritable, jealous, lazy, melancholy, nostalgic, optimistic, pessimistic, resentful, satisfied, scornful, sheepish, shy, skeptical, thrilled, timid`,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
              })),
            }),
          200,
        );
      }
    };
    
    // Process model responses to extract and save emotion data
    const onContent = (content: ServerContent) => {
      if ('modelTurn' in content && content.modelTurn?.parts) {
        const parts = content.modelTurn.parts;
        for (const part of parts) {
          if (part.text) {
            // Try to extract emotion response(s) from the text
            const result = extractEmotionResponse(part.text);
            if (result) {
              const now = new Date();
              const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
              
              // Handle array of emotion responses
              if (Array.isArray(result)) {
                console.log('Extracted array of emotion responses:', result);
                // Process each response in the array
                result.forEach(response => {
                  // Add timestamp if not present
                  if (!response.timestamp) {
                    response.timestamp = timeString;
                  }
                  // Save to data store
                  addResponse(response);
                });
              } else {
                // Handle single emotion response
                console.log('Extracted single emotion response:', result);
                // Add timestamp if not present
                if (!result.timestamp) {
                  result.timestamp = timeString;
                }
                // Save to data store
                addResponse(result);
              }
            }
          }
        }
      }
    };
    
    client.on("toolcall", onToolCall);
    client.on("content", onContent);
    
    return () => {
      client.off("toolcall", onToolCall);
      client.off("content", onContent);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return (
    <div className="altair-container">
      {reconnecting && (
        <div className="reconnection-status">
          <span className="reconnecting-indicator">⟳</span> Reconnecting to Gemini API...
        </div>
      )}
      <div className="vega-embed" ref={embedRef} />
    </div>
  );
}

export const Altair = memo(AltairComponent);
