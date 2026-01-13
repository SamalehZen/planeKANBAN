import type { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@plane/constants";
// plane types
import { getFileMetaDataForUpload, generateFileUploadPayload } from "@plane/services";
import type { TIssueAttachment, TIssueAttachmentUploadResponse, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// services
import { APIService } from "@/services/api.service";
import { FileUploadService } from "@/services/file-upload.service";

export class IssueAttachmentService extends APIService {
  private fileUploadService: FileUploadService;
  private serviceType: TIssueServiceType;

  constructor(serviceType: TIssueServiceType = EIssueServiceType.ISSUES) {
    super(API_BASE_URL);
    // upload service
    this.fileUploadService = new FileUploadService();
    this.serviceType = serviceType;
  }

  private async updateIssueAttachmentUploadStatus(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    attachmentId: string
  ): Promise<void> {
    return this.patch(
      `/api/assets/v2/workspaces/${workspaceSlug}/projects/${projectId}/${this.serviceType}/${issueId}/attachments/${attachmentId}/`
    )
      .then((response) => {
        console.log("[AttachmentUpload] PATCH response:", response);
        return response?.data;
      })
      .catch((error) => {
        console.error("[AttachmentUpload] PATCH failed:", error?.response?.status, error?.response?.data);
        throw error?.response?.data;
      });
  }

  async uploadIssueAttachment(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    file: File,
    uploadProgressHandler?: AxiosRequestConfig["onUploadProgress"]
  ): Promise<TIssueAttachment> {
    const fileMetaData = await getFileMetaDataForUpload(file);
    return this.post(
      `/api/assets/v2/workspaces/${workspaceSlug}/projects/${projectId}/${this.serviceType}/${issueId}/attachments/`,
      fileMetaData
    )
      .then(async (response) => {
        console.log("[AttachmentUpload] Step 1: Received presigned URL response", response?.data);
        const signedURLResponse: TIssueAttachmentUploadResponse = response?.data;
        
        if (!signedURLResponse?.upload_data?.url) {
          console.error("[AttachmentUpload] Error: Missing upload_data.url in response", signedURLResponse);
          throw new Error("Invalid response: missing upload_data.url");
        }
        
        if (!signedURLResponse?.attachment) {
          console.error("[AttachmentUpload] Error: Missing attachment in response", signedURLResponse);
          throw new Error("Invalid response: missing attachment");
        }
        
        console.log("[AttachmentUpload] Step 2: Generating upload payload");
        const fileUploadPayload = generateFileUploadPayload(signedURLResponse, file);
        
        console.log("[AttachmentUpload] Step 3: Uploading file to storage", signedURLResponse.upload_data.url);
        await this.fileUploadService.uploadFile(
          signedURLResponse.upload_data.url,
          fileUploadPayload,
          uploadProgressHandler
        );
        
        console.log("[AttachmentUpload] Step 4: Updating attachment status", signedURLResponse.asset_id);
        await this.updateIssueAttachmentUploadStatus(workspaceSlug, projectId, issueId, signedURLResponse.asset_id);
        
        console.log("[AttachmentUpload] Step 5: Upload complete", signedURLResponse.attachment);
        return signedURLResponse.attachment;
      })
      .catch((error) => {
        console.error("[AttachmentUpload] Upload failed with error:", error);
        console.error("[AttachmentUpload] Error response status:", error?.response?.status);
        console.error("[AttachmentUpload] Error data:", error?.response?.data);
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
