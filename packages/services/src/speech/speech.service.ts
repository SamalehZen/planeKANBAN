import { API_BASE_URL } from "@plane/constants";
import { APIService } from "../api.service";

export interface ISpeechTokenResponse {
  token: string;
}

export type TIntentType = "todo" | "note" | "planning" | "long_text";

export interface ISmartTranscriptRequest {
  transcript: string;
  language: "fr";
  intent?: TIntentType;
}

export interface ISmartTranscriptResponse {
  intent: TIntentType;
  confidence: number;
  secondary_intent?: TIntentType;
  formatted_content: string;
  formatted_todo?: string;
  formatted_note?: string;
  formatted_planning?: string;
  formatted_long_text?: string;
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
