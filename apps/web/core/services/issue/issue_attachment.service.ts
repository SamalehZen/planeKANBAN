import type { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@plane/constants";
import type { TIssueAttachment, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { APIService } from "@/services/api.service";

export class IssueAttachmentService extends APIService {
  private serviceType: TIssueServiceType;

  constructor(serviceType: TIssueServiceType = EIssueServiceType.ISSUES) {
    super(API_BASE_URL);
    this.serviceType = serviceType;
  }

  async uploadIssueAttachment(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    file: File,
    uploadProgressHandler?: AxiosRequestConfig["onUploadProgress"]
  ): Promise<TIssueAttachment> {
    const formData = new FormData();
    formData.append("file", file);

    console.log("[AttachmentUpload] Using proxy upload for file:", file.name);

    return this.post(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${issueId}/attachments/proxy-upload/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: uploadProgressHandler,
      }
    )
      .then((response) => {
        console.log("[AttachmentUpload] Proxy upload successful:", response?.data);
        return response?.data?.attachment;
      })
      .catch((error) => {
        console.error("[AttachmentUpload] Proxy upload failed:", error?.response?.status, error?.response?.data);
        throw error?.response?.data || error;
      });
  }

  async getIssueAttachments(workspaceSlug: string, projectId: string, issueId: string): Promise<TIssueAttachment[]> {
    return this.get(
      `/api/assets/v2/workspaces/${workspaceSlug}/projects/${projectId}/${this.serviceType}/${issueId}/attachments/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteIssueAttachment(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    assetId: string
  ): Promise<TIssueAttachment> {
    return this.delete(
      `/api/assets/v2/workspaces/${workspaceSlug}/projects/${projectId}/${this.serviceType}/${issueId}/attachments/${assetId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
