import { useState, useRef, useCallback, useEffect } from "react";
import { SpeechService } from "@plane/services";

interface UseSpeechToTextOptions {
  workspaceSlug: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  silenceThreshold?: number;
  onVolumeChange?: (volume: number) => void;
  onRecordingTime?: (seconds: number) => void;
  microphoneSensitivity?: number;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

interface UseSpeechToTextReturn {
  isRecording: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recordingDuration: number;
  currentVolume: number;
}

const SILENCE_VOLUME_THRESHOLD = 2;
const DEFAULT_SENSITIVITY = 3.0;

const detectDevice = (): { isIpad: boolean; isMobile: boolean } => {
  if (typeof navigator === "undefined") return { isIpad: false, isMobile: false };
  const ua = navigator.userAgent.toLowerCase();
  const isIpad = ua.includes("ipad") || (ua.includes("macintosh") && "ontouchend" in document);
  const isMobile = /iphone|ipod|android|webos|blackberry|windows phone/i.test(ua);
  return { isIpad, isMobile };
};

export const useSpeechToText = (options: UseSpeechToTextOptions): UseSpeechToTextReturn => {
  const { 
    workspaceSlug, 
    onTranscript, 
    onError, 
    silenceThreshold = 5000, 
    onVolumeChange, 
    onRecordingTime,
    microphoneSensitivity,
    onRecordingStateChange
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0);

  const websocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const processedTurnsRef = useRef<Set<number>>(new Set());
  const recordingStartRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>("");
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCleaningUpRef = useRef(false);

  const calculateVolume = useCallback((inputData: Float32Array, sensitivity: number): number => {
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);
    return Math.min(100, Math.round(rms * sensitivity * 500));
  }, []);

  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    
    console.log("[Speech] Cleaning up...");
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch {}
      processorRef.current = null;
    }

    if (gainNodeRef.current) {
      try { gainNodeRef.current.disconnect(); } catch {}
      gainNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        try { websocketRef.current.send(JSON.stringify({ type: "Terminate" })); } catch {}
      }
      websocketRef.current.close();
      websocketRef.current = null;
    }

    setIsRecording(false);
    setIsConnecting(false);
    setIsProcessing(false);
    setCurrentVolume(0);
    setRecordingDuration(0);
    recordingStartRef.current = null;
    accumulatedTextRef.current = "";
    
    onRecordingStateChange?.(false);
    
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 100);
  }, [onRecordingStateChange]);

  const finishRecordingAndProcess = useCallback(() => {
    console.log("[Speech] Silence detected - finishing recording");
    const finalText = accumulatedTextRef.current.trim();
    
    cleanup();
    
    if (finalText) {
      onTranscript(finalText, true);
    }
  }, [cleanup, onTranscript]);

  useEffect(() => {
    if (isRecording && recordingStartRef.current) {
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartRef.current!) / 1000);
        setRecordingDuration(elapsed);
        onRecordingTime?.(elapsed);
      }, 1000);
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [isRecording, onRecordingTime]);

  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

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
    if (isRecording || isConnecting || isCleaningUpRef.current) {
      console.log("[Speech] Already recording or connecting, skipping...");
      return;
    }

    console.log("[Speech] Starting recording for workspace:", workspaceSlug);
    accumulatedTextRef.current = "";

    const { isIpad, isMobile } = detectDevice();
    const sensitivity = microphoneSensitivity ?? (isIpad ? 5.0 : isMobile ? 2.5 : DEFAULT_SENSITIVITY);
    const gainValue = isIpad ? 4.0 : isMobile ? 2.0 : 1.5;

    try {
      setIsConnecting(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Speech-to-text is not supported in this browser");
      }

      const speechService = new SpeechService();
      const tokenResponse = await speechService.getToken(workspaceSlug);

      if (!tokenResponse?.token) {
        throw new Error("No token received from backend.");
      }

      const audioConstraints: MediaTrackConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: !isIpad,
        autoGainControl: true,
      };

      if (!isIpad) {
        audioConstraints.sampleRate = 16000;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;

      processedTurnsRef.current.clear();
      const ws = new WebSocket(`wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&format_turns=true&speech_model=universal-streaming-multilingual&token=${tokenResponse.token}`);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("[Speech] WebSocket connected!");
        setIsConnecting(false);
        setIsRecording(true);
        recordingStartRef.current = Date.now();
        onRecordingStateChange?.(true);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = gainValue;
        gainNodeRef.current = gainNode;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          const volume = calculateVolume(inputData, sensitivity);
          setCurrentVolume(volume);
          onVolumeChange?.(volume);

          if (volume > SILENCE_VOLUME_THRESHOLD) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(finishRecordingAndProcess, silenceThreshold);
          }

          const amplifiedData = new Float32Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            amplifiedData[i] = Math.max(-1, Math.min(1, inputData[i] * gainValue));
          }
          ws.send(floatTo16BitPCM(amplifiedData));
        };

        source.connect(gainNode);
        gainNode.connect(processor);
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

          if (data.type === "Turn" && data.transcript) {
            const isFinal = data.end_of_turn && data.turn_is_formatted;
            if (isFinal && !processedTurnsRef.current.has(data.turn_order)) {
              processedTurnsRef.current.add(data.turn_order);
              accumulatedTextRef.current += (accumulatedTextRef.current ? " " : "") + data.transcript;
              onTranscript(data.transcript, false);
            } else if (!isFinal) {
              onTranscript(data.transcript, false);
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        onError?.(new Error("WebSocket connection failed."));
        cleanup();
      };

      ws.onclose = () => cleanup();
    } catch (error) {
      cleanup();
      const err = error instanceof Error ? error : new Error("Failed to start recording");
      onError?.(err);
    }
  }, [workspaceSlug, isRecording, isConnecting, onTranscript, onError, cleanup, calculateVolume, onVolumeChange, silenceThreshold, finishRecordingAndProcess, microphoneSensitivity, onRecordingStateChange]);

  const stopRecording = useCallback(() => {
    console.log("[Speech] Stop recording requested");
    const finalText = accumulatedTextRef.current.trim();
    cleanup();
    if (finalText) {
      onTranscript(finalText, true);
    }
  }, [cleanup, onTranscript]);

  return {
    isRecording,
    isConnecting,
    isProcessing,
    startRecording,
    stopRecording,
    recordingDuration,
    currentVolume,
  };
};
