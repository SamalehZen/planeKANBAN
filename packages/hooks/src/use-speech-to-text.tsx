import { useState, useRef, useCallback } from "react";
import { SpeechService } from "@plane/services";

interface UseSpeechToTextOptions {
  workspaceSlug: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
}

interface UseSpeechToTextReturn {
  isRecording: boolean;
  isConnecting: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  interimText: string;
}

export const useSpeechToText = (options: UseSpeechToTextOptions): UseSpeechToTextReturn => {
  const { workspaceSlug, onTranscript, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [interimText, setInterimText] = useState("");

  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanup = useCallback(() => {
    console.log("[Speech] Cleaning up...");
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ terminate_session: true }));
      }
      websocketRef.current.close();
      websocketRef.current = null;
    }

    setIsRecording(false);
    setIsConnecting(false);
    setInterimText("");
  }, []);

  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const startRecording = useCallback(async () => {
    if (isRecording || isConnecting) {
      console.log("[Speech] Already recording or connecting, skipping...");
      return;
    }

    console.log("[Speech] Starting recording for workspace:", workspaceSlug);

    try {
      setIsConnecting(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Speech-to-text is not supported in this browser");
      }

      console.log("[Speech] Getting token from backend...");
      const speechService = new SpeechService();
      const tokenResponse = await speechService.getToken(workspaceSlug);
      console.log("[Speech] Token received:", tokenResponse?.token ? "Yes (token exists)" : "No token!");

      if (!tokenResponse?.token) {
        throw new Error("No token received from backend. Check your AssemblyAI API key in admin settings.");
      }

      console.log("[Speech] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      console.log("[Speech] Microphone access granted");

      console.log("[Speech] Connecting to AssemblyAI WebSocket...");
      const ws = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tokenResponse.token}`);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("[Speech] WebSocket connected successfully!");
        setIsConnecting(false);
        setIsRecording(true);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        let audioChunkCount = 0;
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = floatTo16BitPCM(inputData);
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData)));
            ws.send(JSON.stringify({ audio_data: base64Audio }));
            audioChunkCount++;
            if (audioChunkCount % 50 === 0) {
              console.log(`[Speech] Sent ${audioChunkCount} audio chunks`);
            }
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        console.log("[Speech] Audio processing started");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[Speech] Received message:", data.message_type, data.text ? `"${data.text}"` : "");

          if (data.error) {
            console.error("[Speech] Error from AssemblyAI:", data.error);
            onError?.(new Error(data.error));
            cleanup();
            return;
          }

          if (data.message_type === "PartialTranscript" && data.text) {
            setInterimText(data.text);
            onTranscript(data.text, false);
          } else if (data.message_type === "FinalTranscript" && data.text) {
            console.log("[Speech] Final transcript:", data.text);
            setInterimText("");
            onTranscript(data.text, true);
          }
        } catch (parseError) {
          console.error("[Speech] Error parsing message:", parseError);
        }
      };

      ws.onerror = (error) => {
        console.error("[Speech] WebSocket error:", error);
        onError?.(new Error("WebSocket connection failed. Check your network and API key."));
        cleanup();
      };

      ws.onclose = (event) => {
        console.log("[Speech] WebSocket closed:", event.code, event.reason);
        cleanup();
      };
    } catch (error) {
      console.error("[Speech] Error starting recording:", error);
      cleanup();
      const err = error instanceof Error ? error : new Error("Failed to start recording");

      if (err.name === "NotAllowedError" || err.message.includes("Permission denied")) {
        onError?.(new Error("Microphone permission denied. Please allow microphone access."));
      } else if (err.name === "NotFoundError") {
        onError?.(new Error("No microphone found. Please connect a microphone."));
      } else {
        onError?.(err);
      }
    }
  }, [workspaceSlug, isRecording, isConnecting, onTranscript, onError, cleanup]);

  const stopRecording = useCallback(() => {
    console.log("[Speech] Stop recording requested");
    cleanup();
  }, [cleanup]);

  return {
    isRecording,
    isConnecting,
    startRecording,
    stopRecording,
    interimText,
  };
};
