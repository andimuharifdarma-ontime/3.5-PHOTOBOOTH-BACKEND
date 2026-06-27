export type UploadItemStatus = "pending" | "uploading" | "done" | "error";

export type UploadItem = {
  id: string;
  label: string;
  status: UploadItemStatus;
};

export type UploadPhase = "compiling" | "uploading" | "complete" | "error";

export type PrintStatus = "idle" | "printing" | "sent" | "error";

export function countUploadProgress(items: UploadItem[]) {
  const total = items.length;
  const completed = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;
  return { total, completed, failed };
}
