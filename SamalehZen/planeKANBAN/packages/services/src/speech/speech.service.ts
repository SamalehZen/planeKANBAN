import { API_BASE_URL } from "@plane/constants";
import { APIService } from "../api.service";

export interface ISpeechTokenResponse {
  token: string;
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
}
