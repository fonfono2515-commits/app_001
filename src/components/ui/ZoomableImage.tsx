"use client";

import { useState } from "react";
import Image from "next/image";
import { isPdfUrl } from "@/lib/utils";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ZoomableImage({ src, alt, className }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  if (isPdfUrl(src)) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-col items-center justify-center gap-1 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors ${className || ""}`}
      >
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs text-slate-500">เปิดไฟล์ PDF</span>
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in">
        <Image src={src} alt={alt} width={300} height={200} className={className} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl leading-none"
            aria-label="ปิด"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
