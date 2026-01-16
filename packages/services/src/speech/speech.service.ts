import { API_BASE_URL } from "@plane/constants";
import { APIService } from "../api.service";

export interface ISpeechTokenResponse {
  token: string;
}

export interface ISmartTranscriptRequest {
  transcript: string;
  language: "fr";
}

export interface ISmartTranscriptResponse {
  intent: "todo" | "note" | "planning" | "long_text";
  confidence: number;
  secondary_intent?: "todo" | "note" | "planning" | "long_text";
  formatted_content: string;
  original_transcript: string;
  corrections?: string[];
}

export class SpeechService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  async getToken(workspaceSlug: string): Promise<ISpeechTokenResponse> {
    return this.post(`/api/workspaces/${workspaceSlug}/speech-to-text/token/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async processSmartTranscript(
    workspaceSlug: string,
    data: ISmartTranscriptRequest
  ): Promise<ISmartTranscriptResponse> {
    return this.post(`/api/workspaces/${workspaceSlug}/speech-to-text/smart-process/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
