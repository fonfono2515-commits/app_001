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

interface Preview {
  url: string;
  isPdf: boolean;
}

function toPreview(file: File): Preview {
  return { url: URL.createObjectURL(file), isPdf: file.type === "application/pdf" };
}

export function ImageUpload({
  onUpload,
  currentUrl,
  label = "อัปโหลดรูปสลิปหรือ PDF",
  multiple = false,
  maxFiles = 10,
}: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Preview[]>(
    currentUrl ? [{ url: currentUrl, isPdf: currentUrl.toLowerCase().split("?")[0].endsWith(".pdf") }] : []
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const nextFiles = multiple ? [...files, ...acceptedFiles].slice(0, maxFiles) : [acceptedFiles[0]];
      setFiles(nextFiles);
      setPreviews(nextFiles.map(toPreview));
      onUpload(nextFiles);
    },
    [files, multiple, maxFiles, onUpload]
  );

  function removeAt(index: number) {
    const nextFiles = files.filter((_, i) => i !== index);
    setFiles(nextFiles);
    setPreviews(nextFiles.map(toPreview));
    onUpload(nextFiles);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"], "application/pdf": [".pdf"] },
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
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  {p.isPdf ? (
                    <div
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white ${
                        multiple ? "h-24 w-24" : "mx-auto h-32 w-40"
                      }`}
                    >
                      <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-[10px] text-slate-500">ไฟล์ PDF</span>
                    </div>
                  ) : (
                    <Image
                      src={p.url}
                      alt={`slip preview ${i + 1}`}
                      width={multiple ? 120 : 300}
                      height={multiple ? 120 : 200}
                      className={`rounded-lg object-contain ${multiple ? "h-24 w-24" : "mx-auto max-h-48"}`}
                    />
                  )}
                  {multiple && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAt(i);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      aria-label="ลบไฟล์นี้"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {multiple ? "คลิกหรือลากไฟล์เพื่อเพิ่มไฟล์เพิ่มเติม" : "คลิกหรือลากไฟล์เพื่อเปลี่ยน"}
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
              PNG, JPG, PDF ขนาดไม่เกิน 5MB{multiple ? ` (แนบได้สูงสุด ${maxFiles} ไฟล์)` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
