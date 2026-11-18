"use client";

import React, { useMemo } from "react";
import katex from "katex";

export interface KaTeXBlockProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export function KaTeXBlock({ math, displayMode = false, className = "" }: KaTeXBlockProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        output: "html",
        throwOnError: false,
        strict: false,
      });
    } catch (e) {
      return `<span style="color:#ffb700; font-family: monospace;">${math}</span>`;
    }
  }, [math, displayMode]);

  return (
    <span
      className={`inline-block select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
