import { debounce, set } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
import { v4 as uuidv4 } from "uuid";
// plane types
import type { TFileEntityInfo, TFileSignedURLResponse } from "@plane/types";
// services
import { FileService } from "@/services/file.service";
import type { TAttachmentUploadStatus } from "../issue/issue-details/attachment.store";

export interface IEditorAssetStore {
  // computed
  assetsUploadPercentage: Record<string, number>;
  // helper methods
  getAssetUploadStatusByEditorBlockId: (blockId: string) => TAttachmentUploadStatus | undefined;
  // actions
  uploadEditorAsset: ({
    blockId,
    data,
    file,
    projectId,
    workspaceSlug,
  }: {
    blockId: string;
    data: TFileEntityInfo;
    file: File;
    projectId?: string;
    workspaceSlug: string;
  }) => Promise<TFileSignedURLResponse>;
}

export class EditorAssetStore implements IEditorAssetStore {
  // observables
  assetsUploadStatus: Record<string, TAttachmentUploadStatus> = {};
  // services
  fileService: FileService;

  constructor() {
    makeObservable(this, {
      // observables
      assetsUploadStatus: observable,
      // computed
      assetsUploadPercentage: computed,
      // actions
      uploadEditorAsset: action,
    });
    // services
    this.fileService = new FileService();
  }

  get assetsUploadPercentage() {
    const assetsStatus = this.assetsUploadStatus;
    const assetsPercentage: Record<string, number> = {};
    Object.keys(assetsStatus).forEach((blockId) => {
      const asset = assetsStatus[blockId];
      if (asset) assetsPercentage[blockId] = asset.progress;
    });
    return assetsPercentage;
  }

  // helper methods
  getAssetUploadStatusByEditorBlockId: IEditorAssetStore["getAssetUploadStatusByEditorBlockId"] = computedFn(
    (blockId) => {
      const blockDetails = this.assetsUploadStatus[blockId];
      if (!blockDetails) return undefined;
      return blockDetails;
    }
  );

  // actions
  private debouncedUpdateProgress = debounce((blockId: string, progress: number) => {
    runInAction(() => {
      set(this.assetsUploadStatus, [blockId, "progress"], progress);
    });
  }, 16);

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 800
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
        }
      }
    }
    throw lastError;
  }

  uploadEditorAsset: IEditorAssetStore["uploadEditorAsset"] = async (args) => {
    const { blockId, data, file, projectId, workspaceSlug } = args;
    const tempId = uuidv4();

    try {
      runInAction(() => {
        set(this.assetsUploadStatus, [blockId], {
          id: tempId,
          name: file.name,
          progress: 0,
          size: file.size,
          type: file.type,
        });
      });

      return await this.withRetry(async () => {
        if (projectId) {
          return this.fileService.uploadProjectAsset(workspaceSlug, projectId, data, file, (progressEvent) => {
            this.debouncedUpdateProgress(blockId, Math.round((progressEvent.progress ?? 0) * 100));
          });
        }
        return this.fileService.uploadWorkspaceAsset(workspaceSlug, data, file, (progressEvent) => {
          this.debouncedUpdateProgress(blockId, Math.round((progressEvent.progress ?? 0) * 100));
        });
      });
    } catch (error) {
      console.error("Error uploading editor asset after retries:", error);
      throw error;
    } finally {
      runInAction(() => {
        delete this.assetsUploadStatus[blockId];
      });
    }
  };
}
