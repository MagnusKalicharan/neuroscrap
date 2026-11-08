"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./terminal.css";
import { FolderColumn, type FolderSlotDef } from "./FolderColumn";
import { FileColumn } from "./FileColumn";
import { MessageBody } from "./MessageBody";
import { Connector } from "./Connector";
import { Footer } from "./Footer";
import {
  DEFAULT_TELEMETRY_FILES,
  AUDIO_LOG_FILES,
  type TerminalFile,
  type TerminalFolder,
} from "./terminalContent";
import { terminalSound } from "./sound";
import { usePendriveStore, pendriveStore } from "./pendriveStore";
import {
  useTelemetryStore,
  telemetryStore,
} from "../../components/telemetry/telemetryStore";
import { TransmissionTerminalSection } from "../../section2/diagnostic/TransmissionTerminalSection";
import { relayStore } from "../../section2/relayStore";
import { devSkipImagesAndUnlockSection2 } from "../../section2/section2Dev";

export interface PendriveTerminalProps {
  open: boolean;
  onClose: (reason: "back" | "eject" | "uploaded" | "bias_rejected") => void;
  onUpload?: (batchId: string) => void;
  content?: {
    folders?: TerminalFolder[];
  };
  unlocked?: {
    folders?: string[];
  };
  reducedMotion?: boolean;
}

type FocusZone = "folders" | "files" | "body";

export function PendriveTerminal({
  open,
  onClose,
  onUpload,
  content,
  unlocked,
  reducedMotion = false,
}: PendriveTerminalProps) {
  const store = usePendriveStore();
  const telemetry = useTelemetryStore();

  // Scale factor calculation for uniform 1280x720 scaling
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);

  // Focus and Selection state
  const [focusZone, setFocusZone] = useState<FocusZone>("folders");
  const [activeFolderId, setActiveFolderId] = useState<string>(() => {
    const rState = relayStore.getState();
    if (rState.consoleUnlocked && !rState.diagnosticPassed) {
      return "transmission";
    }
    return "images";
  });
  const [selectedFileId, setSelectedFileId] = useState<string>("scan_gargantua_01");
  const [uploading, setUploading] = useState(false);
  const [booting, setBooting] = useState(true);

  // Sync active folder on open
  useEffect(() => {
    if (open) {
      const rState = relayStore.getState();
      if (rState.consoleUnlocked && !rState.diagnosticPassed) {
        setActiveFolderId("transmission");
      }
    }
  }, [open]);

  // Measured connector anchors
  const [folderAnchor, setFolderAnchor] = useState({ x: 0, y: 0 });
  const [fileAnchor, setFileAnchor] = useState({ x: 0, y: 0 });

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState("");

  const imagesDone =
    (telemetry.analysisOutcome === "representative_sample" ||
      store.uploadedBatches.includes("BATCH_DEV_AUTO")) &&
    telemetry.analysisOutcome !== "sampling_bias";

  // Build Folder list: 4 slots total (Slot 1: "IMAGES", Slot 2: "TRANSMISSION", Slot 3: "AUDIO", Slot 4: null)
  const folderSlots = useMemo<FolderSlotDef[]>(() => {
    const hasAudio = unlocked?.folders?.includes("AUDIO");
    return [
      { id: "images", label: "IMAGES" },
      {
        id: "transmission",
        label: imagesDone ? "TRANSMISSION" : "TRANSMISSION 🔒",
      },
      { id: "audio", label: hasAudio ? "AUDIO" : null },
      { id: "system", label: null },
    ];
  }, [unlocked, imagesDone]);

  // Active files in selected folder
  const currentFiles = useMemo<TerminalFile[]>(() => {
    let list: TerminalFile[] = [];
    if (activeFolderId === "images") {
      if (content?.folders?.find((f) => f.id === "images")?.files) {
        list = content.folders.find((f) => f.id === "images")!.files;
      } else if (telemetry.scans.length > 0) {
        list = telemetry.scans.map((s) => ({
          id: s.id,
          filename: s.filename,
          title: s.targetName,
          author: "TELEMETRY SCAN",
          subhead: `GRAVITY: ${s.gravity} G`,
          date: `SCAN ${s.id}`,
          category: "image" as const,
          imageTarget: s.category,
          imageDataUrl: s.imageDataUrl,
          bodyParagraphs: [
            s.category === "black_hole"
              ? "Black Hole. Extremely strong gravity (0.98 G)."
              : s.category === "planet"
              ? `${s.targetName}. Medium gravity (${s.gravity} G).`
              : "Distant Stars in deep space. Very low gravity (0.02 G).",
          ],
          canUpload: telemetry.scans.length >= 10,
        }));
      } else {
        list = [
          {
            id: "empty_pendrive",
            filename: "PENDRIVE.DAT",
            title: "Pendrive: 0 / 10 Scans",
            author: "SYSTEM",
            subhead: "AWAITING SKY SCANS",
            date: "READY",
            category: "telemetry" as const,
            bodyParagraphs: [
              "No scans on pendrive yet.",
              "Look up at the sky and press [E / F] to take pictures of the Black Hole, Planets, and Stars.",
              "Collect 10 scans total to run the simulation.",
            ],
            canUpload: false,
          },
        ];
      }
    } else if (activeFolderId === "audio") {
      list = content?.folders?.find((f) => f.id === "audio")?.files || AUDIO_LOG_FILES;
    }
    // Filter out deleted images
    return list.filter((f) => !store.deletedImageIds.includes(f.id));
  }, [activeFolderId, content, telemetry.scans, store.deletedImageIds]);

  // Keep selected file valid whenever currentFiles updates
  useEffect(() => {
    if (currentFiles.length > 0 && !currentFiles.some((f) => f.id === selectedFileId)) {
      setSelectedFileId(currentFiles[0].id);
    }
  }, [currentFiles, selectedFileId]);

  const activeFile = currentFiles.find((f) => f.id === selectedFileId) || currentFiles[0] || null;

  // Window resize handler: uniform scale clamped between 0.8 and 1.5
  useEffect(() => {
    function updateScale() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = vw / 1280;
      const scaleY = vh / 720;
      const s = Math.min(scaleX, scaleY);
      // Clamp between 0.8 and 1.5
      const clamped = Math.max(0.8, Math.min(1.5, s));
      setScale(clamped);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Boot sequence handling
  useEffect(() => {
    if (open) {
      setBooting(true);
      terminalSound.playPowerOnHum();

      const timer = setTimeout(
        () => {
          setBooting(false);
        },
        reducedMotion ? 100 : 350
      );

      return () => clearTimeout(timer);
    }
  }, [open, reducedMotion]);

  // Handle pointer lock & Player input lock on open/close
  useEffect(() => {
    if (open) {
      if (typeof document !== "undefined" && document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    }
  }, [open]);

  // Skip boot on any key
  const handleAnyKeyDown = useCallback(() => {
    if (booting) {
      setBooting(false);
    }
  }, [booting]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      handleAnyKeyDown();

      // If uploading, allow ESC to cancel
      if (uploading) {
        if (e.key === "Escape" || e.code === "KeyQ") {
          e.preventDefault();
          setUploading(false);
          terminalSound.playBackBlip();
        }
        return;
      }

      // Up / Down or W / S Navigation
      if (e.key === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        terminalSound.playKeyTick();

        if (focusZone === "folders") {
          // Switch between non-empty folders
          const valid = folderSlots.filter((f) => f.label !== null);
          const currentIdx = valid.findIndex((f) => f.id === activeFolderId);
          const nextIdx = currentIdx > 0 ? currentIdx - 1 : valid.length - 1;
          const target = valid[nextIdx];
          if (target) {
            setActiveFolderId(target.id);
            setAnnouncement(`Folder ${target.label} selected`);
          }
        } else if (focusZone === "files") {
          if (currentFiles.length > 1) {
            const currentIdx = currentFiles.findIndex((f) => f.id === selectedFileId);
            const nextIdx = currentIdx > 0 ? currentIdx - 1 : currentFiles.length - 1;
            setSelectedFileId(currentFiles[nextIdx].id);
            setAnnouncement(`File ${currentFiles[nextIdx].filename} selected`);
          }
        }
      } else if (e.key === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        terminalSound.playKeyTick();

        if (focusZone === "folders") {
          const valid = folderSlots.filter((f) => f.label !== null);
          const currentIdx = valid.findIndex((f) => f.id === activeFolderId);
          const nextIdx = currentIdx < valid.length - 1 ? currentIdx + 1 : 0;
          const target = valid[nextIdx];
          if (target) {
            setActiveFolderId(target.id);
            setAnnouncement(`Folder ${target.label} selected`);
          }
        } else if (focusZone === "files") {
          if (currentFiles.length > 1) {
            const currentIdx = currentFiles.findIndex((f) => f.id === selectedFileId);
            const nextIdx = currentIdx < currentFiles.length - 1 ? currentIdx + 1 : 0;
            setSelectedFileId(currentFiles[nextIdx].id);
            setAnnouncement(`File ${currentFiles[nextIdx].filename} selected`);
          }
        }
      }

      // Enter / E: Select and move forward through focus zones
      else if (e.key === "Enter" || e.code === "KeyE") {
        e.preventDefault();
        terminalSound.playSelectBlip();

        if (activeFolderId === "transmission") {
          setFocusZone("body");
          setAnnouncement("Transmission Diagnostic focused.");
          return;
        }

        if (focusZone === "folders") {
          setFocusZone("files");
          setAnnouncement("Focused files. Press E to read message or Enter upload.");
        } else if (focusZone === "files") {
          setFocusZone("body");
          setAnnouncement("Viewing message body. Press E on upload to send dataset.");
        } else if (focusZone === "body") {
          if (activeFile?.canUpload && !uploading) {
            setUploading(true);
            setAnnouncement("Uploading telemetry datastream...");
          }
        }
      }

      // Delete key: Remove current file if it's an image scan
      else if (e.key === "Delete" || e.code === "Delete") {
        if (activeFile && activeFile.id !== "empty_pendrive") {
          e.preventDefault();
          terminalSound.playErrorBuzz();
          handleDeleteImage(activeFile.id);
          setAnnouncement(`File ${activeFile.filename} deleted.`);
        }
      }

      // Q, Backspace, or Esc: Go back one level
      else if (e.key === "Escape" || e.code === "KeyQ" || e.key === "Backspace") {
        e.preventDefault();
        terminalSound.playBackBlip();

        if (activeFolderId === "transmission") {
          if (focusZone === "body") {
            setFocusZone("folders");
            setAnnouncement("Returned to folders list.");
          } else {
            onClose("back");
          }
          return;
        }

        if (focusZone === "body") {
          setFocusZone("files");
          setAnnouncement("Returned to file list.");
        } else if (focusZone === "files") {
          setFocusZone("folders");
          setAnnouncement("Returned to folders list.");
        } else if (focusZone === "folders") {
          onClose("back");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    focusZone,
    activeFolderId,
    selectedFileId,
    currentFiles,
    folderSlots,
    activeFile,
    uploading,
    onClose,
    handleAnyKeyDown,
  ]);

  const handleUploadComplete = useCallback(() => {
    const outcome = telemetryStore.evaluatePendriveData();
    if (outcome === "sampling_bias") {
      terminalSound.playErrorBuzz();
      setUploading(false);
      const biasMsg = telemetryStore.getState().biasMessage;
      // Per instructions: "if the sample is biased then the transmission should not unlock
      // and the texts said by oracle shpuld not be said instead he should delete all scans and again take screenshots"
      telemetryStore.purgeScansDueToBias(biasMsg || "Sampling bias detected.");
      pendriveStore.reset();
      onClose("bias_rejected");
      return;
    }

    const batchId = `BATCH_${Date.now()}`;
    pendriveStore.recordBatchUpload(batchId);
    onUpload?.(batchId);
    setUploading(false);
    onClose("uploaded");
  }, [onUpload, onClose]);

  const handleDeleteImage = (id: string) => {
    pendriveStore.deleteImage(id);
    telemetryStore.deleteScan(id);
    // Auto-select remaining file
    const remaining = currentFiles.filter((f) => f.id !== id);
    if (remaining.length > 0) {
      setSelectedFileId(remaining[0].id);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* ── Warning message for screens < 1024x600 ───────────────────── */}
      <div className="terminal-enlarge-warning" role="alert">
        <div>
          <div className="text-xl font-bold mb-2">ENLARGE THE WINDOW</div>
          <div className="text-sm opacity-80">
            Terminal interface requires at least 1024 x 600 viewport resolution.
          </div>
        </div>
      </div>

      {/* ── Main Scaled Stage Wrapper ─────────────────────────────────── */}
      <div
        ref={stageWrapperRef}
        className="terminal-stage-wrapper pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Salvage Terminal Interface"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Screen Reader Live Announcements */}
        <div className="sr-only" aria-live="assertive">
          {announcement}
        </div>

        {/* ── 1280x720 Scaled CRT Terminal Stage ───────────────────────── */}
        <div
          ref={stageRef}
          className={`terminal-stage ${!reducedMotion ? "flicker-active" : ""} ${
            booting ? "terminal-booting" : ""
          }`}
          style={{
            transform: `scale(${scale})`,
          }}
        >
          {/* Subtle CRT Scanlines Overlay (8% opacity) */}
          <div className="terminal-scanlines" aria-hidden="true" />

          {/* Soft Screen Vignette */}
          <div className="terminal-vignette" aria-hidden="true" />

          {/* ── 1. Top Header Bar (Solid bright green, cutout dark title, right square) ── */}
          <header className="relative z-30 w-full h-[var(--term-header-height)] px-5 bg-[var(--term-header-green)] flex items-center justify-between shadow-[0_0_20px_rgba(24,210,72,0.5)] select-none">
            {/* Cutout title at left: "SALVAGE TERMINAL" */}
            <span className="text-[var(--term-dark-text)] font-black text-[17px] tracking-[0.24em] uppercase font-mono">
              SALVAGE TERMINAL
            </span>

            {/* Right End: Exit / Eject Button & Small Solid Square */}
            <div className="flex items-center gap-3">
              {!imagesDone && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    terminalSound.playSelectBlip();
                    devSkipImagesAndUnlockSection2();
                    setActiveFolderId("transmission");
                  }}
                  className="text-[10px] font-black text-black bg-amber-400 hover:bg-amber-300 px-2.5 py-1 border border-black rounded uppercase font-mono cursor-pointer active:scale-95 shadow-sm transition-all"
                  title="Dev Skip: Complete Images and jump to Section 2"
                >
                  ⚡ [DEV] SKIP TO SEC 2
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  terminalSound.playEjectClick();
                  onClose("eject");
                }}
                className="text-[11px] font-black text-[var(--term-dark-text)] hover:bg-[var(--term-dark-text)] hover:text-[var(--term-header-green)] px-2.5 py-1 border-2 border-[var(--term-dark-text)] transition-all cursor-pointer font-mono uppercase flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="Eject Pendrive and Exit (Press Q or Esc)"
              >
                <span>✕</span>
                <span>EXIT / EJECT [Q]</span>
              </button>
              {/* The Small Solid Square at the far right edge from reference */}
              <div
                className="w-4 h-4 bg-[var(--term-dark-text)] cursor-pointer hover:opacity-75 active:scale-90 transition-all"
                title="Exit Terminal"
                onClick={(e) => {
                  e.stopPropagation();
                  terminalSound.playEjectClick();
                  onClose("eject");
                }}
                role="button"
                tabIndex={0}
                aria-label="Exit Terminal"
              />
            </div>
          </header>

          {/* ── 2. Middle Body Grid (Folders on left, Files & Message on right) ── */}
          <main className="relative z-10 flex-1 grid grid-cols-12 px-8 py-6 gap-[var(--term-col-gap)] overflow-hidden min-h-0 bg-[var(--term-dark-bg)]">
            {/* Dynamic SVG Connector Line */}
            <Connector
              startX={folderAnchor.x}
              startY={folderAnchor.y}
              endX={fileAnchor.x}
              endY={fileAnchor.y}
              reducedMotion={reducedMotion}
            />

            {/* ── Left Column: Folders Sidebar (4 Slots total) ────────── */}
            <div className="col-span-4 flex flex-col justify-start">
              <FolderColumn
                slots={folderSlots}
                activeId={activeFolderId}
                isFocused={focusZone === "folders"}
                onSelectFolder={(id) => {
                  setActiveFolderId(id);
                  setFocusZone("files");
                }}
                onReportAnchor={setFolderAnchor}
              />
            </div>

            {/* ── Right Column: File Slot & Message Body Panel or Transmission Section ── */}
            <div className="col-span-8 flex flex-col min-h-0 gap-4">
              {activeFolderId === "transmission" ? (
                !imagesDone ? (
                  <div className="flex-1 border-2 border-[var(--term-outline-green)] bg-[#040e07] p-8 flex flex-col justify-between font-mono">
                    <div>
                      <div className="text-[20px] font-bold text-[var(--term-green-text-bright)] tracking-wider mb-2">
                        TRANSMISSION LINE TELEMETRY // LOCKED
                      </div>
                      <div className="text-[13px] text-amber-400 mb-6 flex items-center gap-2">
                        <span>🔒</span>
                        <span>AWAITING DATA INTAKE VALIDATION</span>
                      </div>
                      <div className="text-[15px] text-[var(--term-green-text)] leading-relaxed space-y-4">
                        <p>
                          Transmission diagnostic subroutines require verified celestial gravity telemetry
                          from your pendrive before opening the transmission bus.
                        </p>
                        <p>
                          Select the IMAGES folder above, collect 10 celestial images with your pendrive,
                          and upload the verified dataset.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--term-outline-green)]/40 pt-4 flex-wrap gap-2">
                      <span className="text-xs text-[var(--term-green-text)] opacity-70">
                        PRESS [Q] OR ESC TO EXIT TERMINAL
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          terminalSound.playSelectBlip();
                          devSkipImagesAndUnlockSection2();
                          setActiveFolderId("transmission");
                        }}
                        className="px-3.5 py-2 text-xs font-black uppercase tracking-wider bg-[#143d20] hover:bg-[#1e582e] text-[#5dfa87] border-2 border-[#22d952] rounded shadow-[0_0_15px_rgba(34,217,82,0.4)] transition-all cursor-pointer active:scale-95"
                        title="Dev test shortcut: skip images part and unlock transmission"
                      >
                        ⚡ [DEV] SKIP IMAGES & UNLOCK SECTION 2
                      </button>
                    </div>
                  </div>
                ) : (
                  <TransmissionTerminalSection
                    onReportAnchor={setFileAnchor}
                    reducedMotion={reducedMotion}
                    onClose={() => onClose("back")}
                  />
                )
              ) : (
                <>
                  {/* Selected File Slot & Empty Box below it */}
                  <FileColumn
                    files={currentFiles}
                    selectedFileId={selectedFileId}
                    isFocused={focusZone === "files"}
                    onSelectFile={(id) => {
                      setSelectedFileId(id);
                      setFocusZone("body");
                    }}
                    onReportAnchor={setFileAnchor}
                  />

                  {/* Message Body Panel with thick green strip on top & phosphor green text */}
                  <MessageBody
                    file={activeFile}
                    isFocused={focusZone === "body"}
                    uploading={uploading}
                    onStartUpload={() => {
                      setUploading(true);
                      telemetryStore.evaluatePendriveData();
                    }}
                    onCancelUpload={() => setUploading(false)}
                    onUploadComplete={handleUploadComplete}
                    onDeleteImage={handleDeleteImage}
                    reducedMotion={reducedMotion}
                    analysisOutcome={telemetry.analysisOutcome}
                    biasMessage={telemetry.biasMessage}
                    onFormatPendrive={() => {
                      telemetryStore.formatPendrive();
                      terminalSound.playSelectBlip();
                    }}
                    totalScans={telemetry.scans.length}
                    maxScans={telemetry.maxScans}
                  />
                </>
              )}
            </div>
          </main>

          {/* ── 3. Bottom Footer Bar (Button glyphs & dot leaders) ────── */}
          <Footer />
        </div>
      </div>
    </>
  );
}

export default PendriveTerminal;
