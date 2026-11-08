"use client";

import React from "react";

export function Footer() {
  return (
    <footer
      className="relative z-30 w-full h-[var(--term-footer-height)] px-6 bg-[var(--term-dark-panel)] border-t border-[var(--term-outline-green)] flex items-center justify-center text-[12px] sm:text-[13px] text-[var(--term-green-text)] tracking-[0.18em] uppercase font-bold term-glow select-none"
      role="contentinfo"
      aria-label="Terminal Keybindings Help"
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center text-center">
        {/* Navigation Glyph + Label */}
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 fill-[var(--term-green-text)]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l-6 7h12l-6-7zm0 18l6-7H6l6 7z" />
          </svg>
          <span>UP / DOWN HIGHLIGHT</span>
        </div>

        {/* Dot Leader */}
        <span className="text-[var(--term-green-text-dim)] tracking-[0.3em]" aria-hidden="true">
          .....
        </span>

        {/* Select Glyph + Label */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded border border-[var(--term-green-text)] text-[10px] flex items-center justify-center font-black"
            aria-hidden="true"
          >
            E
          </span>
          <span>SELECT</span>
        </div>

        {/* Dot Leader */}
        <span className="text-[var(--term-green-text-dim)] tracking-[0.3em]" aria-hidden="true">
          .....
        </span>

        {/* Scroll Glyph + Label */}
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 fill-[var(--term-green-text)]" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="6" x2="12" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>PAGE UP / PAGE DOWN SCROLL</span>
        </div>

        {/* Dot Leader */}
        <span className="text-[var(--term-green-text-dim)] tracking-[0.3em]" aria-hidden="true">
          .....
        </span>

        {/* Back Glyph + Label */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded border border-[var(--term-green-text)] text-[10px] flex items-center justify-center font-black"
            aria-hidden="true"
          >
            Q
          </span>
          <span>BACK / EXIT</span>
        </div>

        {/* Dot Leader */}
        <span className="text-[var(--term-green-text-dim)] tracking-[0.3em]" aria-hidden="true">
          .....
        </span>

        {/* Delete Glyph + Label */}
        <div className="flex items-center gap-1.5 text-red-400">
          <span
            className="px-1 py-0.5 rounded border border-red-400 text-[10px] flex items-center justify-center font-black"
            aria-hidden="true"
          >
            DEL
          </span>
          <span>DELETE FILE</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
