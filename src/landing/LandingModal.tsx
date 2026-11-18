"use client";

import React, { useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";

export interface LandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  triggerId?: string;
  children: React.ReactNode;
}

export function LandingModal({
  isOpen,
  onClose,
  title,
  triggerId,
  children,
}: LandingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button initially
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);

      // Return focus to trigger button
      if (triggerId) {
        const triggerEl = document.getElementById(triggerId);
        triggerEl?.focus();
      }
    };
  }, [isOpen, onClose, triggerId]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        // Close when clicking directly on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-[#04060B]/85 transition-opacity duration-180 landing-backdrop-enter"
    >
      {/* Modal Chamfered Panel / Bottom Sheet on mobile */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-modal-title"
        className={`
          relative w-full max-w-[640px] bg-[#04060B] border border-[#19F0FF]/40
          shadow-[0_0_40px_rgba(4,6,11,0.9),0_0_20px_rgba(25,240,255,0.15)]
          flex flex-col max-h-[90vh] sm:max-h-[82vh] overflow-hidden
          fixed bottom-0 inset-x-0 sm:relative sm:bottom-auto
          landing-modal-panel
        `}
        style={{
          // Chamfered corners on desktop: top-right & bottom-left cut
          clipPath:
            "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
        }}
      >
        {/* ── Header Row ── */}
        <div className="h-14 min-h-[56px] px-5 flex items-center justify-between border-b border-[#1A2733] bg-[#0B1F2A]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 bg-[#19F0FF] shadow-[0_0_6px_#19F0FF]"
            />
            <h2
              id="landing-modal-title"
              className="font-mono text-sm md:text-base font-bold tracking-[0.16em] uppercase text-white"
              style={{ textShadow: "0 0 10px rgba(25, 240, 255, 0.5)" }}
            >
              {title}
            </h2>
          </div>

          {/* Close button with min 44px hit area */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8BA0B2] hover:text-white hover:bg-[#1A2733]/50 focus:text-white focus:bg-[#1A2733]/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#19F0FF] transition-colors rounded-none cursor-pointer"
          >
            <X className="w-5 h-5 text-[#19F0FF]/80 hover:text-[#19F0FF]" />
          </button>
        </div>

        {/* ── Content Area (Scrolls inside panel if needed, never the page) ── */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-4 text-left">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Reusable 56px Hairline Row Component ─────────────────────────────
export interface ModalRowProps {
  title: string;
  description?: string;
  url: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export function ModalRow({
  title,
  description,
  url,
  badge,
  icon,
}: ModalRowProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title}${description ? ` - ${description}` : ""} (opens in a new tab)`}
      onClick={(e) => e.stopPropagation()}
      className="group min-h-[56px] py-2.5 px-3 flex items-center justify-between border-b border-[#1A2733] hover:bg-[#0B1F2A]/50 focus:bg-[#0B1F2A]/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#19F0FF] transition-colors duration-150 block text-left select-none cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {icon && (
          <span className="text-[#19F0FF]/70 group-hover:text-[#19F0FF] transition-colors shrink-0">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] md:text-[15px] font-bold text-[#FFF4E0] group-hover:text-[#19F0FF] transition-colors truncate">
              {title}
            </span>
            {badge}
          </div>
          {description && (
            <p className="text-[12px] md:text-[13px] text-[#8BA0B2] group-hover:text-[#C9D6E2] transition-colors leading-relaxed font-sans line-clamp-2 md:line-clamp-1">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1 text-[#8BA0B2] group-hover:text-[#19F0FF] transition-colors">
        <ExternalLink className="w-4 h-4" />
      </div>
    </a>
  );
}
