"use client";
import { useState } from "react";
import axios from "axios";
import axiosClientInstance from "../../../lib/axiosInstance";
import { UploadCloud } from "lucide-react";

export default function GroupVideoUpload({
  groupId,
  onUploadComplete,
}: {
  groupId: string;
  onUploadComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk

  async function uploadFile(file: File) {
    setStatus("بداية التحميل...");
    setProgress(0);
    setFileName(file.name);

    try {
      console.log(groupId)
      const startRes = await axiosClientInstance.post("/groups/videos/start/", {
        file_name: file.name,
        groupId: groupId,              
        title: file.name,      
      });
      const { uploadId, object_key } = startRes.data;

      let partNumber = 1;
      const parts: { ETag: string; PartNumber: number }[] = [];

      for (let start = 0; start < file.size; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // Step 2: Ask backend for presigned URL
        const presignRes = await axiosClientInstance.post("/groups/videos/presign/", {
            object_key,
            uploadId,
            partNumber,
        });

        const url = presignRes.data.url;

        // Step 3: Upload chunk directly to R2
        const uploadRes = await axios.put(url, chunk, {
          headers: { "Content-Type": "application/octet-stream" },
          onUploadProgress: (evt) => {
            const totalUploaded = Math.min(end, start + evt.loaded);
            setProgress(Math.round((totalUploaded / file.size) * 100));
          },
        });

        const rawETag = uploadRes.headers.etag || uploadRes.headers.ETag;
        if (!rawETag) throw new Error("ETag missing from upload response");

        parts.push({
          ETag: rawETag.replace(/"/g, ""),
          PartNumber: partNumber,
        });

        partNumber++;
      }

      // Step 4: Tell backend to complete upload
      const completeRes = await axiosClientInstance.post("/groups/videos/complete/", {
          object_key,
          uploadId,
          parts,
      });

      setStatus(`✅ تم رفع الملف`);
    } catch (err: any) {
      console.error("فشل رفع الملف:", err);
      setStatus("❌ فشل رفع الملف حاول مرة اخرى.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="max-w-md mx-auto p-6 border border-gray-200 rounded-2xl shadow-lg bg-white">
      {/* Upload box */}
      <label
        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragActive ? "bg-orange-50 border-orange-500" : "bg-gray-50 hover:bg-gray-100 border-gray-300"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
        <p className="mb-1 text-sm text-gray-600">
          <span className="font-semibold">Click to upload</span> or drag & drop
        </p>
        <p className="text-xs text-gray-400">MP4, AVI, MOV — max 2GB</p>
        <input
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {/* Progress & status */}
      {status && (
        <div className="mt-4 text-sm">
          {fileName && <p className="font-medium text-gray-800 truncate">{fileName}</p>}
          <p
            className={`mt-1 ${
              status.includes("failed") ? "text-red-600" : "text-gray-600"
            }`}
          >
            {status}
          </p>

          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div
                className="bg-orange-600 h-3 rounded-full text-xs text-white flex items-center justify-center transition-all duration-300"
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
