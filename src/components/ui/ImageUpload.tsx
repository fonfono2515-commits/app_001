"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  currentUrl?: string;
  label?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export function ImageUpload({
  onUpload,
  currentUrl,
  label = "อัปโหลดรูปสลิป",
  multiple = false,
  maxFiles = 10,
}: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(currentUrl ? [currentUrl] : []);

  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const nextFiles = multiple ? [...files, ...acceptedFiles].slice(0, maxFiles) : [acceptedFiles[0]];
      setFiles(nextFiles);
      setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
      onUpload(nextFiles);
    },
    [files, multiple, maxFiles, onUpload]
  );

  function removeAt(index: number) {
    const nextFiles = files.filter((_, i) => i !== index);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
    onUpload(nextFiles);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: multiple ? maxFiles : 1,
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        }`}
      >
        <input {...getInputProps()} />
        {previews.length > 0 ? (
          <div>
            <div className="flex flex-wrap gap-2 justify-center">
              {previews.map((url, i) => (
                <div key={i} className="relative">
                  <Image
                    src={url}
                    alt={`slip preview ${i + 1}`}
                    width={multiple ? 120 : 300}
                    height={multiple ? 120 : 200}
                    className={`rounded-lg object-contain ${multiple ? "h-24 w-24" : "mx-auto max-h-48"}`}
                  />
                  {multiple && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAt(i);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      aria-label="ลบรูปนี้"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {multiple ? "คลิกหรือลากไฟล์เพื่อเพิ่มรูปเพิ่มเติม" : "คลิกหรือลากไฟล์เพื่อเปลี่ยน"}
            </p>
          </div>
        ) : (
          <div className="py-4">
            <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-600 font-medium">{label}</p>
            <p className="text-xs text-slate-400 mt-1">
              PNG, JPG ขนาดไม่เกิน 5MB{multiple ? ` (แนบได้สูงสุด ${maxFiles} รูป)` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
