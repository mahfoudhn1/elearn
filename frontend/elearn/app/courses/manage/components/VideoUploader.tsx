"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileVideo, Pause, Play, RotateCcw, Upload, X } from "lucide-react";

import {
  completeVideoUpload,
  initVideoUpload,
  presignVideoParts,
} from "../../../api/courses";
import type { VideoUploadInit } from "../../../types/course";

const DEFAULT_PART_SIZE = 8 * 1024 * 1024;
const PARALLEL_UPLOADS = 3;

type UploadState = "idle" | "uploading" | "paused" | "completing" | "done" | "error" | "canceled";

interface UploadPart {
  part_number: number;
  url: string;
}

export interface VideoUploaderProps {
  onUploaded: (assetId: string, previewUrl: string) => void;
  onRemoved?: () => void;
  initialAssetId?: string | null;
  initialPreviewUrl?: string | null;
}

export default function VideoUploader({
  onUploaded,
  onRemoved,
  initialAssetId = null,
  initialPreviewUrl = null,
}: VideoUploaderProps) {
  const [state, setState] = useState<UploadState>(initialAssetId ? "done" : "idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(initialAssetId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl);
  const [dragOver, setDragOver] = useState(false);

  const initRef = useRef<VideoUploadInit | null>(null);
  const completedRef = useRef<Map<number, string>>(new Map());
  const pausedRef = useRef(false);
  const canceledRef = useRef(false);
  const activeXhrsRef = useRef<Set<XMLHttpRequest>>(new Set());
  const partProgressRef = useRef<Map<number, number>>(new Map());
  // The server decides the multipart part size; the client must slice to match.
  const partSizeRef = useRef(DEFAULT_PART_SIZE);

  const recomputeProgress = useCallback(() => {
    let loaded = 0;
    let total = 0;
    const partSize = partSizeRef.current;
    Array.from(partProgressRef.current.entries()).forEach(([partNumber, bytes]) => {
      if (completedRef.current.has(partNumber)) {
        loaded += partSize;
        total += partSize;
      } else {
        loaded += bytes;
        total += partSize;
      }
    });
    if (total > 0) setProgress(Math.min(Math.round((loaded / total) * 95), 95));
  }, []);

  const uploadSinglePart = useCallback(
    (part: UploadPart, blob: Blob): Promise<void> =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhrsRef.current.add(xhr);
        partProgressRef.current.set(part.part_number, 0);

        xhr.open("PUT", part.url);
        xhr.upload.onprogress = (event) => {
          partProgressRef.current.set(part.part_number, event.loaded);
          recomputeProgress();
        };
        xhr.onload = () => {
          activeXhrsRef.current.delete(xhr);
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = (xhr.getResponseHeader("ETag") ?? "").replace(/"/g, "");
            completedRef.current.set(part.part_number, etag);
            resolve();
          } else {
            reject(new Error(`Part ${part.part_number} failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => {
          activeXhrsRef.current.delete(xhr);
          reject(new Error(`Part ${part.part_number} failed due to a network error.`));
        };
        xhr.onabort = () => {
          activeXhrsRef.current.delete(xhr);
          reject(new DOMException("Aborted", "AbortError"));
        };
        xhr.send(blob);
      }),
    [recomputeProgress],
  );

  const uploadRemainingMultipartParts = useCallback(
    async (selected: File, parts: UploadPart[]) => {
      const queue = parts.filter((part) => !completedRef.current.has(part.part_number));
      let paused = false;

      const worker = async (): Promise<void> => {
        while (queue.length > 0) {
          if (canceledRef.current) throw new DOMException("Canceled", "AbortError");
          if (pausedRef.current) {
            paused = true;
            return;
          }
          const part = queue.shift();
          if (!part) break;
          const partSize = partSizeRef.current;
          const start = (part.part_number - 1) * partSize;
          const end = Math.min(start + partSize, selected.size);
          await uploadSinglePart(part, selected.slice(start, end));
        }
      };

      try {
        await Promise.all(
          Array.from({ length: Math.min(PARALLEL_UPLOADS, Math.max(queue.length, 1)) }, worker),
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError" && (pausedRef.current || canceledRef.current)) {
          return;
        }
        throw err;
      }
      if (paused && !canceledRef.current) {
        throw new DOMException("Paused", "AbortError");
      }
    },
    [uploadSinglePart],
  );

  const runUpload = useCallback(
    async (selected: File, resumeInit?: VideoUploadInit | null) => {
      setError(null);
      setState("uploading");

      try {
        let init = resumeInit ?? null;
        if (!init) {
          completedRef.current = new Map();
          partProgressRef.current = new Map();
          init = await initVideoUpload({
            filename: selected.name,
            mime_type: selected.type || "video/mp4",
            size_bytes: selected.size,
          });
          initRef.current = init;
        }
        if (!init) throw new Error("Upload initialization failed.");

        if (init.part_size && init.part_size > 0) {
          partSizeRef.current = init.part_size;
        }

        // On resume the cached presigned URLs may be stale; ask for fresh ones.
        if (init.upload_id && (resumeInit || !init.part_urls?.length)) {
          try {
            const fresh = await presignVideoParts(init.id, init.upload_id);
            init = { ...init, part_urls: fresh.part_urls };
            initRef.current = init;
          } catch {
            /* fall back to the cached URLs below */
          }
        }

        if (init.upload_id && init.part_urls && init.part_urls.length > 0) {
          // Use exactly the part URLs the server planned; slicing must match
          // the server's part size.
          partProgressRef.current = new Map(
            init.part_urls.map((part) => [part.part_number, 0]),
          );
          await uploadRemainingMultipartParts(selected, init.part_urls);
        } else if (init.upload_url) {
          partProgressRef.current = new Map([[1, 0]]);
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            activeXhrsRef.current.add(xhr);
            xhr.open("PUT", init!.upload_url!);
            xhr.setRequestHeader("Content-Type", selected.type || "video/mp4");
            xhr.upload.onprogress = (event) => {
              partProgressRef.current.set(1, event.loaded);
              if (selected.size > 0) {
                setProgress(Math.min(Math.round((event.loaded / selected.size) * 95), 95));
              }
            };
            xhr.onload = () => {
              activeXhrsRef.current.delete(xhr);
              if (xhr.status >= 200 && xhr.status < 300) {
                completedRef.current.set(1, "");
                resolve();
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            };
            xhr.onerror = () => {
              activeXhrsRef.current.delete(xhr);
              reject(new Error("Network error during upload."));
            };
            xhr.onabort = () => {
              activeXhrsRef.current.delete(xhr);
              reject(new DOMException("Aborted", "AbortError"));
            };
            xhr.send(selected);
          });
        } else {
          throw new Error("The server did not return upload URLs.");
        }

        if (canceledRef.current) throw new DOMException("Canceled", "AbortError");

        setState("completing");
        const complete = await completeVideoUpload(
          init.id,
          init.upload_id,
          Array.from(completedRef.current.entries()).map(([part_number, etag]) => ({
            part_number,
            etag,
          })),
        );
        setProgress(100);
        setAssetId(init.id);
        setPreviewUrl(complete.url);
        setState("done");
        onUploaded(init.id, complete.url);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          if (canceledRef.current) {
            setState("canceled");
          } else {
            setState("paused");
          }
          return;
        }
        setError(err instanceof Error ? err.message : "Upload failed.");
        setState("error");
      }
    },
    [onUploaded, uploadRemainingMultipartParts],
  );

  const handlePick = (selected: File | undefined | null) => {
    if (!selected) return;
    canceledRef.current = false;
    pausedRef.current = false;
    setFile(selected);
    void runUpload(selected);
  };

  const handlePauseResume = () => {
    if (state === "uploading") {
      pausedRef.current = true;
      activeXhrsRef.current.forEach((xhr) => xhr.abort());
      setState("paused");
    } else if (state === "paused" && file) {
      pausedRef.current = false;
      void runUpload(file, initRef.current);
    }
  };

  const handleCancel = () => {
    canceledRef.current = true;
    pausedRef.current = false;
    activeXhrsRef.current.forEach((xhr) => xhr.abort());
    setState("canceled");
  };

  const handleRetry = () => {
    if (!file) return;
    canceledRef.current = false;
    pausedRef.current = false;
    if (initRef.current?.upload_id) {
      void runUpload(file, initRef.current);
    } else {
      void runUpload(file);
    }
  };

  const handleClear = () => {
    handleCancel();
    initRef.current = null;
    completedRef.current = new Map();
    partProgressRef.current = new Map();
    setFile(null);
    setAssetId(null);
    setPreviewUrl(null);
    setProgress(0);
    setError(null);
    setState("idle");
    onRemoved?.();
  };

  const busy = state === "uploading" || state === "completing";

  if (state === "done" && assetId) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4" dir="auto">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
            <CheckCircle2 className="h-4 w-4" /> تم رفع الفيديو بنجاح
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-1.5 text-green-700 transition hover:bg-green-100"
            aria-label="إزالة الفيديو"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {previewUrl ? (
          <video controls src={previewUrl} className="mt-3 max-h-64 w-full rounded-lg bg-black" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4" dir="auto">
      {state === "idle" || state === "canceled" ? (
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            handlePick(event.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition ${
            dragOver ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-400"
          }`}
        >
          <Upload className="h-6 w-6 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            اختر ملف فيديو أو أفلته هنا
          </span>
          <span className="text-xs text-gray-400">MP4 / WebM / MOV</span>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(event) => handlePick(event.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <FileVideo className="h-4 w-4 text-gray-500" />
            <span className="truncate">{file?.name}</span>
          </p>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-all ${
                state === "error" ? "bg-red-500" : "bg-orange-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-gray-500">
              {state === "completing"
                ? "جارٍ إنهاء الرفع..."
                : state === "paused"
                  ? "متوقف مؤقتًا"
                  : state === "error"
                    ? "فشل الرفع"
                    : `${progress}%`}
            </span>

            <div className="flex items-center gap-1.5">
              {state === "uploading" ? (
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Pause className="h-3.5 w-3.5" /> إيقاف مؤقت
                </button>
              ) : null}
              {state === "paused" ? (
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Play className="h-3.5 w-3.5" /> متابعة
                </button>
              ) : null}
              {state === "error" ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-1 rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> إعادة المحاولة
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" /> إلغاء
              </button>
            </div>
          </div>

          {error ? (
            <p className="flex items-center gap-1.5 text-xs text-red-600" role="alert">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
