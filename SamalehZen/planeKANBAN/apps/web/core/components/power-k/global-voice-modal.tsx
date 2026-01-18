import React from 'react';
import { DynamicNotchController } from '@plane/ui';

export const GlobalVoiceModal: React.FC = () => {
  const handleVoiceStart = () => {
    console.log('Voice recording started');
  };

  const handleVoiceEnd = (audioBlob: Blob) => {
    console.log('Voice recording ended, blob size:', audioBlob.size);
    // Send to backend for transcription
  };

  const handleAIResponse = (text: string) => {
    console.log('AI response:', text);
    // Inject text at mouse cursor position
  };

  return (
    <DynamicNotchController
      onVoiceStart={handleVoiceStart}
      onVoiceEnd={handleVoiceEnd}
      onAIResponse={handleAIResponse}
    />
  );
};
