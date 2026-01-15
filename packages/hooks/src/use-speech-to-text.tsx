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
    if (isRecording || isConnecting) return;

    try {
      setIsConnecting(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Speech-to-text is not supported in this browser");
      }

      const speechService = new SpeechService();
      const { token } = await speechService.getToken(workspaceSlug);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const ws = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`);
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsRecording(true);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = floatTo16BitPCM(inputData);
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData)));
            ws.send(JSON.stringify({ audio_data: base64Audio }));
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            onError?.(new Error(data.error));
            cleanup();
            return;
          }

          if (data.message_type === "PartialTranscript" && data.text) {
            setInterimText(data.text);
            onTranscript(data.text, false);
          } else if (data.message_type === "FinalTranscript" && data.text) {
            setInterimText("");
            onTranscript(data.text, true);
          }
        } catch {}
      };

      ws.onerror = () => {
        onError?.(new Error("WebSocket connection failed"));
        cleanup();
      };

      ws.onclose = () => {
        cleanup();
      };
    } catch (error) {
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
