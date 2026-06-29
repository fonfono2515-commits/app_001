"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  currentUrl?: string;
  label?: string;
}

export function ImageUpload({ onUpload, currentUrl, label = "อัปโหลดรูปสลิป" }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setPreview(url);
        onUpload(file);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
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
        {preview ? (
          <div className="relative">
            <Image
              src={preview}
              alt="slip preview"
              width={300}
              height={200}
              className="mx-auto rounded-lg object-contain max-h-48"
            />
            <p className="text-xs text-slate-500 mt-2">คลิกหรือลากไฟล์เพื่อเปลี่ยน</p>
          </div>
        ) : (
          <div className="py-4">
            <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-600 font-medium">{label}</p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG ขนาดไม่เกิน 5MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
