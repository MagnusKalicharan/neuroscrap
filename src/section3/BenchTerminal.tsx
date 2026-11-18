"use client";

/**
 * Section 3: CORE-B Detective Bench Terminal
 * ============================================
 * Full-screen overlay for studying the 10 known scans from Section 1 and
 * learning what each measuring tool reads on them.
 *
 * Visual design matches the SALVAGE TERMINAL:
 * - Green phosphor CRT aesthetic calibrated to 1280x720 canvas.
 * - Top header with exit button [Q].
 * - 4 Folders: EXAMPLES, TOOLS, NOTEBOOK, CHANNELS (padlocked).
 * - Thick selected highlight with scanline shimmer and angular connector line.
 * - Cycle Next slot.
 * - Body panel with bright green strip across the top.
 * - EXAMPLES: Shows user's scanned celestial images and pure light curves (no applied readings).
 * - TOOLS: Physical measuring equipment shelf with 7 tools, high-contrast amber/yellow overlays.
 * - Unclamped layout with dedicated amber phosphor calculated reading displays.
 * - Replay (H), Esc cancel (200ms), Reduce Motion (instant).
 * - Footer key hints with dot leaders.
 * - Zero banned words.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "../ui/terminal/terminal.css";
import { FolderColumn, type FolderSlotDef } from "../ui/terminal/FolderColumn.tsx";
import { Connector } from "../ui/terminal/Connector.tsx";
import { terminalSound } from "../ui/terminal/sound.ts";
import { ToolHint } from "../ui/ToolHint.tsx";
import {
  MEASUREMENT_GLOSSARY,
  getGlossaryEntry,
  SECTION3_BRIEFING,
  type MeasurementGlossaryEntry,
} from "./glossary.ts";
import { MEASUREMENT_MODULES, getMeasurementById } from "./measurements.ts";
import { section3Store, useSection3Store } from "./section3Store.ts";
import { recordsFromScans } from "./signals.ts";
import { createCandidates } from "./candidates.ts";
import { evaluatePair } from "./rules.ts";
import { computeMapLayout, type PlacedKnown, type PlacedCandidate, type CountBadge } from "./layout.ts";
import { generateSampleSnapshot } from "../section2/section2Dev.ts";
import type { MeasurementId, SectionThreeRecord, PreviewMark } from "./types.ts";

export interface BenchTerminalProps {
  open: boolean;
  onClose: () => void;
  records?: SectionThreeRecord[];
  reducedMotion?: boolean;
  unknownReadings?: Array<{ id: string; value: number }>;
  initialFolder?: BenchFolder;
  initialNotebookView?: "table" | "compare";
}

type BenchFolder = "examples" | "tools" | "notebook" | "channels";

interface ToolShelfItem {
  id: MeasurementId;
  shelfName: string; // e.g. "PEAK PIN"
  plainName: string;
  shortName: string;
  icon: string;
}

export const SHELF_TOOLS: ToolShelfItem[] = [
  { id: "brightness", shelfName: "MEAN LINE", plainName: "Brightness", shortName: "BRIGHTNESS", icon: "━" },
  { id: "beat", shelfName: "RHYTHM GAUGE", plainName: "Steady beat", shortName: "BEAT", icon: "⏱" },
  { id: "colour", shelfName: "COLOUR PROBE", plainName: "Colour", shortName: "COLOUR", icon: "◐" },
  { id: "jumpiness", shelfName: "JUMP COUNTER", plainName: "Jumpiness", shortName: "JUMPINESS", icon: "↯" },
];

// Static folder slot definitions
const FOLDER_SLOTS: FolderSlotDef[] = [
  { id: "examples", label: "EXAMPLES" },
  { id: "tools", label: "TOOLS" },
  { id: "notebook", label: "NOTEBOOK" },
  { id: "channels", label: "CHANNELS" },
];

export function BenchTerminal({
  open,
  onClose,
  records: externalRecords,
  reducedMotion = false,
  unknownReadings,
  initialFolder = "examples",
  initialNotebookView = "table",
}: BenchTerminalProps) {
  const section3State = useSection3Store();

  // Scale state for 1280x720 canvas
  const [scale, setScale] = useState(1);

  // Active folder: "examples" | "tools" | "notebook"
  const [activeFolder, setActiveFolder] = useState<BenchFolder>(initialFolder);
  // Active known scan index [0..9]
  const [selectedScanIdx, setSelectedScanIdx] = useState(0);
  // Highlighted tool on shelf [0..6]
  const [selectedToolIdx, setSelectedToolIdx] = useState(0);

  // Tool currently active/displayed on curve per scan (used in TOOLS view)
  const [activeToolForScan, setActiveToolForScan] = useState<Record<string, MeasurementId>>({});
  const [animNonce, setAnimNonce] = useState(0);

  // Drag-and-drop state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    toolId: MeasurementId | null;
    clientX: number;
    clientY: number;
    cancelling: boolean;
    pointerId: number | null;
  }>({
    isDragging: false,
    toolId: null,
    clientX: 0,
    clientY: 0,
    cancelling: false,
    pointerId: null,
  });

  const [curveHovered, setCurveHovered] = useState(false);
  const [showReplayIndicator, setShowReplayIndicator] = useState(false);
  const [ariaAnnouncement, setAriaAnnouncement] = useState("");
  const [booting, setBooting] = useState(true);

  // Notebook states: table vs compare view
  const [notebookView, setNotebookView] = useState<"table" | "compare">(initialNotebookView);
  const [compareMode, setCompareMode] = useState<"lanes" | "single">("lanes");
  const [showClassOutlines, setShowClassOutlines] = useState(true);
  const [showUnknowns, setShowUnknowns] = useState(true);
  const [focusedDotIdx, setFocusedDotIdx] = useState(0);
  const [isMeasuringAll, setIsMeasuringAll] = useState(false);
  const [measureAllProgress, setMeasureAllProgress] = useState(0);
  const measureAllRef = useRef<number | null>(null);

  // Timer refs — stored so we can cancel all pending timeouts on unmount / close
  const jumpTickTimersRef = useRef<number[]>([]);
  const snapTickTimerRef = useRef<number | null>(null);
  const replayIndicatorTimerRef = useRef<number | null>(null);
  const cancelDragTimerRef = useRef<number | null>(null);
  const latchAnimTimerRef = useRef<number | null>(null);

  // Channels state
  const [activeSocket, setActiveSocket] = useState<0 | 1>(0); // 0 = CH1, 1 = CH2
  const [isToolPickerOpen, setIsToolPickerOpen] = useState(false);
  const [pickerToolIdx, setPickerToolIdx] = useState(0);
  const [latchingSocket, setLatchingSocket] = useState<0 | 1 | null>(null);
  const [focusedMapDotIdx, setFocusedMapDotIdx] = useState(0);
  const [hoveredMapDot, setHoveredMapDot] = useState<{
    id: string;
    type: "known" | "unknown";
    name: string;
    subtitle: string;
    reading1: string;
    reading2?: string;
    x: number;
    y: number;
  } | null>(null);

  // Refs
  const stageRef = useRef<HTMLDivElement>(null);
  const curveRef = useRef<HTMLDivElement>(null);
  const selectedHeaderRef = useRef<HTMLDivElement>(null);

  // Connector anchor points
  const [folderAnchor, setFolderAnchor] = useState({ x: 0, y: 0 });
  const [fileAnchor, setFileAnchor] = useState({ x: 0, y: 0 });

  const handleFolderAnchor = useCallback((pt: { x: number; y: number }) => {
    setFolderAnchor((prev) => (prev.x === pt.x && prev.y === pt.y ? prev : pt));
  }, []);

  // Fallback records if none passed
  const records = useMemo<SectionThreeRecord[]>(() => {
    if (externalRecords && externalRecords.length >= 10) {
      return externalRecords.slice(0, 10);
    }
    return recordsFromScans([
      { id: "bh_1", category: "black_hole", targetName: "Black Hole Singularity", imageDataUrl: generateSampleSnapshot("black_hole", "Black Hole Singularity") },
      { id: "bh_2", category: "black_hole", targetName: "Black Hole Core", imageDataUrl: generateSampleSnapshot("black_hole", "Black Hole Core") },
      { id: "bh_3", category: "black_hole", targetName: "Event Horizon", imageDataUrl: generateSampleSnapshot("black_hole", "Event Horizon") },
      { id: "pl_1", category: "planet", targetName: "Gas Giant", imageDataUrl: generateSampleSnapshot("planet", "Gas Giant") },
      { id: "pl_2", category: "planet", targetName: "Gas Giant Rings", imageDataUrl: generateSampleSnapshot("planet", "Gas Giant Rings") },
      { id: "pl_3", category: "planet", targetName: "Lava Planet", imageDataUrl: generateSampleSnapshot("planet", "Lava Planet") },
      { id: "st_1", category: "stars", targetName: "Distant Star Cluster Alpha", imageDataUrl: generateSampleSnapshot("stars", "Distant Star Cluster Alpha") },
      { id: "st_2", category: "stars", targetName: "Distant Star Cluster Beta", imageDataUrl: generateSampleSnapshot("stars", "Distant Star Cluster Beta") },
      { id: "st_3", category: "stars", targetName: "Deep Space Stars", imageDataUrl: generateSampleSnapshot("stars", "Deep Space Stars") },
      { id: "st_4", category: "stars", targetName: "Stellar Cloud", imageDataUrl: generateSampleSnapshot("stars", "Stellar Cloud") },
    ]);
  }, [externalRecords]);

  const activeRecord = records[selectedScanIdx] || records[0];
  const nextScanIdx = (selectedScanIdx + 1) % records.length;
  const nextRecord = records[nextScanIdx];

  // Active tool on curve for currently selected scan
  const currentActiveToolId = activeToolForScan[activeRecord.scanId] || null;

  // Mark scan viewed when displayed in EXAMPLES
  useEffect(() => {
    if (open && activeRecord && activeFolder === "examples") {
      section3Store.markExampleViewed(activeRecord.scanId);
    }
  }, [open, activeRecord, activeFolder]);

  useEffect(() => {
    if (open && activeFolder === "channels") {
      section3Store.setPassed(true);
    }
  }, [open, activeFolder]);

  // Measure right column top slot anchor for connector line in 1280x720 stage space
  useEffect(() => {
    if (selectedHeaderRef.current && stageRef.current) {
      const stageRect = stageRef.current.getBoundingClientRect();
      const rect = selectedHeaderRef.current.getBoundingClientRect();
      const s = stageRect.width / 1280;
      if (s > 0) {
        setFileAnchor({
          x: Math.round((rect.left - stageRect.left) / s),
          y: Math.round((rect.top + rect.height / 2 - stageRect.top) / s),
        });
      }
    }
  }, [activeFolder, selectedScanIdx, open, scale]);

  // Window resize handler: uniform scale clamped between 0.75 and 1.5
  useEffect(() => {
    function updateScale() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = vw / 1280;
      const scaleY = vh / 720;
      const s = Math.min(scaleX, scaleY);
      setScale(Math.max(0.75, Math.min(1.5, s)));
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
      const timer = setTimeout(() => setBooting(false), reducedMotion ? 50 : 300);
      return () => clearTimeout(timer);
    }
  }, [open, reducedMotion]);

  // ── Clear all pending animation timers ──────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    jumpTickTimersRef.current.forEach(clearTimeout);
    jumpTickTimersRef.current = [];
    if (snapTickTimerRef.current !== null) {
      clearTimeout(snapTickTimerRef.current);
      snapTickTimerRef.current = null;
    }
    if (replayIndicatorTimerRef.current !== null) {
      clearTimeout(replayIndicatorTimerRef.current);
      replayIndicatorTimerRef.current = null;
    }
    if (cancelDragTimerRef.current !== null) {
      clearTimeout(cancelDragTimerRef.current);
      cancelDragTimerRef.current = null;
    }
    if (latchAnimTimerRef.current !== null) {
      clearTimeout(latchAnimTimerRef.current);
      latchAnimTimerRef.current = null;
    }
    if (measureAllRef.current !== null) {
      clearTimeout(measureAllRef.current);
      measureAllRef.current = null;
    }
  }, []);

  // Reset transient UI state whenever overlay closes; cancels all pending timers
  useEffect(() => {
    if (!open) {
      clearAllTimers();
      setDragState({
        isDragging: false,
        toolId: null,
        clientX: 0,
        clientY: 0,
        cancelling: false,
        pointerId: null,
      });
      setCurveHovered(false);
      setIsMeasuringAll(false);
      setShowReplayIndicator(false);
      setIsToolPickerOpen(false);
      setLatchingSocket(null);
    }
  }, [open, clearAllTimers]);

  // Apply a tool to the active record
  const applyTool = useCallback(
    (toolId: MeasurementId) => {
      if (!activeRecord) return;
      const mod = getMeasurementById(toolId);
      const reading = mod.compute(activeRecord);
      const entry = getGlossaryEntry(toolId);

      // Procedural audio — store timer IDs for cleanup
      terminalSound.playToolClunk(toolId);
      if (toolId === "jumpiness") {
        // Clear any leftover jump-tick timers from a rapid re-apply
        jumpTickTimersRef.current.forEach(clearTimeout);
        jumpTickTimersRef.current = [];
        for (let i = 0; i < 5; i++) {
          const tid = window.setTimeout(() => {
            terminalSound.playJumpTick(i);
            jumpTickTimersRef.current = jumpTickTimersRef.current.filter((t) => t !== tid);
          }, reducedMotion ? 0 : 30 * (i + 1)) as unknown as number;
          jumpTickTimersRef.current.push(tid);
        }
      }
      if (snapTickTimerRef.current !== null) clearTimeout(snapTickTimerRef.current);
      snapTickTimerRef.current = window.setTimeout(() => {
        terminalSound.playSnapTick();
        snapTickTimerRef.current = null;
      }, reducedMotion ? 0 : 450) as unknown as number;

      // Save reading to reactive store
      section3Store.markToolApplied(activeRecord.scanId, toolId, reading);

      // Set active tool for this scan & increment anim nonce to trigger smooth snap
      setActiveToolForScan((prev) => ({
        ...prev,
        [activeRecord.scanId]: toolId,
      }));
      setAnimNonce((n) => n + 1);

      // Format reading for neutral announcement
      let formattedReading = "";
      if (toolId === "colour") formattedReading = reading.toFixed(2);
      else formattedReading = reading.toFixed(3);

      // Aria live neutral announcement: zero banned words
      setAriaAnnouncement(`${entry.plainName}. Reading ${formattedReading}.`);
    },
    [activeRecord, reducedMotion]
  );

  // Replay animation for the active or highlighted tool (H key)
  const handleReplay = useCallback(() => {
    if (!activeRecord) return;
    const toolToReplay = currentActiveToolId || SHELF_TOOLS[selectedToolIdx].id;
    if (toolToReplay) {
      applyTool(toolToReplay);
      setShowReplayIndicator(true);
      if (replayIndicatorTimerRef.current !== null) clearTimeout(replayIndicatorTimerRef.current);
      replayIndicatorTimerRef.current = window.setTimeout(() => {
        setShowReplayIndicator(false);
        replayIndicatorTimerRef.current = null;
      }, 800) as unknown as number;
    }
  }, [activeRecord, currentActiveToolId, selectedToolIdx, applyTool]);

  // Cancel an in-progress drag (Esc key)
  const cancelDrag = useCallback(() => {
    if (!dragState.isDragging) return;
    setDragState((prev) => ({ ...prev, cancelling: true }));
    terminalSound.playBackBlip();
    if (cancelDragTimerRef.current !== null) clearTimeout(cancelDragTimerRef.current);
    cancelDragTimerRef.current = window.setTimeout(() => {
      setDragState({
        isDragging: false,
        toolId: null,
        clientX: 0,
        clientY: 0,
        cancelling: false,
        pointerId: null,
      });
      setCurveHovered(false);
      cancelDragTimerRef.current = null;
    }, reducedMotion ? 0 : 200) as unknown as number;
  }, [dragState.isDragging, reducedMotion]);

  // Measure All: applies highlighted tool to all 10 scans (350ms each, skippable with Space)
  const runMeasureAll = useCallback(() => {
    if (isMeasuringAll) return;
    const toolId = SHELF_TOOLS[selectedToolIdx].id;
    terminalSound.playSelectBlip();

    if (reducedMotion) {
      records.forEach((rec) => {
        const mod = getMeasurementById(toolId);
        const val = mod.compute(rec);
        section3Store.markToolApplied(rec.scanId, toolId, val);
      });
      terminalSound.playSnapTick();
      setIsMeasuringAll(false);
      setMeasureAllProgress(records.length);
      return;
    }

    setIsMeasuringAll(true);
    setMeasureAllProgress(0);

    let currentIdx = 0;
    function step() {
      if (currentIdx >= records.length) {
        setIsMeasuringAll(false);
        setMeasureAllProgress(records.length);
        terminalSound.playSuccessChime();
        return;
      }
      const rec = records[currentIdx];
      const mod = getMeasurementById(toolId);
      const val = mod.compute(rec);
      section3Store.markToolApplied(rec.scanId, toolId, val);
      terminalSound.playSnapTick();
      setMeasureAllProgress(currentIdx + 1);
      currentIdx++;
      measureAllRef.current = window.setTimeout(step, 350);
    }

    step();
  }, [isMeasuringAll, selectedToolIdx, reducedMotion, records]);

  // Skip / Instant-complete Measure All sequence (Space key)
  const skipMeasureAll = useCallback(() => {
    if (!isMeasuringAll) return;
    if (measureAllRef.current) {
      clearTimeout(measureAllRef.current);
      measureAllRef.current = null;
    }
    const toolId = SHELF_TOOLS[selectedToolIdx].id;
    records.forEach((rec) => {
      const mod = getMeasurementById(toolId);
      const val = mod.compute(rec);
      section3Store.markToolApplied(rec.scanId, toolId, val);
    });
    terminalSound.playSnapTick();
    setIsMeasuringAll(false);
    setMeasureAllProgress(records.length);
  }, [isMeasuringAll, selectedToolIdx, records]);

  // Clean up ALL pending timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Drag start handler on shelf tools
  const handlePointerDownTool = (e: React.PointerEvent, toolId: MeasurementId, idx: number) => {
    if (e.button !== 0) return;
    setSelectedToolIdx(idx);
    terminalSound.playKeyTick();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    setDragState({
      isDragging: true,
      toolId,
      clientX: e.clientX,
      clientY: e.clientY,
      cancelling: false,
      pointerId: e.pointerId,
    });
  };

  const handlePointerMoveTool = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    setDragState((prev) => ({
      ...prev,
      clientX: e.clientX,
      clientY: e.clientY,
    }));

    if (curveRef.current) {
      const rect = curveRef.current.getBoundingClientRect();
      const isOver =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setCurveHovered(isOver);
    }
  };

  const handlePointerUpTool = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const toolToApply = dragState.toolId;
    setDragState({
      isDragging: false,
      toolId: null,
      clientX: 0,
      clientY: 0,
      cancelling: false,
      pointerId: null,
    });
    setCurveHovered(false);

    if (toolToApply && !dragState.cancelling) {
      applyTool(toolToApply);
    }
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (booting) {
        setBooting(false);
        return;
      }

      // Escape key cancels drag first, closes tool picker, or closes terminal
      if (e.key === "Escape") {
        e.preventDefault();
        if (dragState.isDragging) {
          cancelDrag();
        } else if (isToolPickerOpen) {
          terminalSound.playBackBlip();
          setIsToolPickerOpen(false);
        } else {
          terminalSound.playBackBlip();
          onClose();
        }
        return;
      }

      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        if (isToolPickerOpen) {
          terminalSound.playBackBlip();
          setIsToolPickerOpen(false);
          return;
        }
        terminalSound.playBackBlip();
        onClose();
        return;
      }

      // Folder switching: numbers 1, 2, 3, 4
      if (e.key === "1") {
        e.preventDefault();
        terminalSound.playSelectBlip();
        setActiveFolder("examples");
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        terminalSound.playSelectBlip();
        setActiveFolder("tools");
        return;
      }
      if (e.key === "3") {
        e.preventDefault();
        terminalSound.playSelectBlip();
        setActiveFolder("notebook");
        return;
      }
      if (e.key === "4") {
        e.preventDefault();
        terminalSound.playSelectBlip();
        setActiveFolder("channels");
        return;
      }

      // Space key skips measure-all if active
      if (e.key === " ") {
        if (isMeasuringAll) {
          e.preventDefault();
          skipMeasureAll();
          return;
        }
      }

      // Measure All shortcut (M)
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        runMeasureAll();
        return;
      }

      // Compare View shortcut (C)
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        terminalSound.playSelectBlip();
        if (activeFolder !== "notebook") {
          setActiveFolder("notebook");
          setNotebookView("compare");
        } else {
          setNotebookView((cur) => (cur === "table" ? "compare" : "table"));
        }
        return;
      }

      // Toggle group lanes shortcut (L) in Compare view
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        terminalSound.playKeyTick();
        setCompareMode((cur) => (cur === "lanes" ? "single" : "lanes"));
        return;
      }

      // Toggle group outlines shortcut (G) in Compare view
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        terminalSound.playKeyTick();
        setShowClassOutlines((cur) => !cur);
        return;
      }

      // Toggle unknown candidate signals shortcut (U) in Compare view
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        terminalSound.playKeyTick();
        setShowUnknowns((cur) => !cur);
        return;
      }

      // Replay shortcut (H)
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        handleReplay();
        return;
      }

      // Up / Down navigation
      if (e.key === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        terminalSound.playKeyTick();
        if (activeFolder === "channels" && isToolPickerOpen) {
          setPickerToolIdx((prev) => (prev > 0 ? prev - 1 : SHELF_TOOLS.length - 1));
        } else if (activeFolder === "channels") {
          setActiveSocket((prev) => (prev === 1 ? 0 : 1));
        } else if (activeFolder === "notebook" && notebookView === "compare") {
          setSelectedToolIdx((prev) => (prev > 0 ? prev - 1 : SHELF_TOOLS.length - 1));
        } else {
          setSelectedScanIdx((prev) => (prev > 0 ? prev - 1 : records.length - 1));
        }
        return;
      }

      if (e.key === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        terminalSound.playKeyTick();
        if (activeFolder === "channels" && isToolPickerOpen) {
          setPickerToolIdx((prev) => (prev + 1) % SHELF_TOOLS.length);
        } else if (activeFolder === "channels") {
          setActiveSocket((prev) => (prev === 0 ? 1 : 0));
        } else if (activeFolder === "notebook" && notebookView === "compare") {
          setSelectedToolIdx((prev) => (prev + 1) % SHELF_TOOLS.length);
        } else {
          setSelectedScanIdx((prev) => (prev + 1) % records.length);
        }
        return;
      }

      // Left / Right navigation on shelf tools or folders
      if (e.key === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        terminalSound.playKeyTick();
        if (activeFolder === "channels" && isToolPickerOpen) {
          // Inside tool picker, left/right does nothing or can wrap
        } else if (activeFolder === "channels") {
          // In channels, arrow keys cycle focus through map dots (10 knowns + 6 unknowns = 16)
          const ch1 = section3State.channels[0];
          const ch2 = section3State.channels[1];
          if (ch1 || ch2) {
            setFocusedMapDotIdx((prev) => (prev > 0 ? prev - 1 : 15));
          } else {
            setActiveSocket(0);
          }
        } else if (activeFolder === "notebook" && notebookView === "compare") {
          setFocusedDotIdx((prev) => (prev > 0 ? prev - 1 : records.length - 1));
        } else if (activeFolder === "tools" || activeFolder === "notebook") {
          setSelectedToolIdx((prev) => (prev > 0 ? prev - 1 : SHELF_TOOLS.length - 1));
        } else {
          setActiveFolder((cur) => (cur === "tools" ? "examples" : cur === "notebook" ? "tools" : "examples"));
        }
        return;
      }

      if (e.key === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        terminalSound.playKeyTick();
        if (activeFolder === "channels" && isToolPickerOpen) {
          // Inside tool picker
        } else if (activeFolder === "channels") {
          const ch1 = section3State.channels[0];
          const ch2 = section3State.channels[1];
          if (ch1 || ch2) {
            setFocusedMapDotIdx((prev) => (prev + 1) % 16);
          } else {
            setActiveSocket(1);
          }
        } else if (activeFolder === "notebook" && notebookView === "compare") {
          setFocusedDotIdx((prev) => (prev + 1) % records.length);
        } else if (activeFolder === "tools" || activeFolder === "notebook") {
          setSelectedToolIdx((prev) => (prev + 1) % SHELF_TOOLS.length);
        } else {
          setActiveFolder((cur) => (cur === "examples" ? "tools" : cur === "tools" ? "notebook" : "channels"));
        }
        return;
      }

      // Apply / Select tool (E key)
      if (e.key === "e" || e.key === "E" || e.key === "Enter") {
        e.preventDefault();
        if (activeFolder === "channels") {
          if (!isToolPickerOpen) {
            // Open tool picker for highlighted socket
            terminalSound.playSelectBlip();
            setIsToolPickerOpen(true);
          } else {
            // Install selected tool into activeSocket
            const chosenTool = SHELF_TOOLS[pickerToolIdx].id;
            const currentChannels = section3State.channels;
            const nextCh1 = activeSocket === 0 ? chosenTool : currentChannels[0];
            const nextCh2 = activeSocket === 1 ? chosenTool : currentChannels[1];
            
            // Background evaluatePair if both channels set
            if (nextCh1 && nextCh2) {
              const modA = getMeasurementById(nextCh1);
              const modB = getMeasurementById(nextCh2);
              evaluatePair(modA, modB, records, createCandidates());
            }

            section3Store.setChannels(nextCh1, nextCh2);
            terminalSound.playToolClunk(chosenTool);
            terminalSound.playSnapTick();

            setLatchingSocket(activeSocket);
            if (latchAnimTimerRef.current !== null) clearTimeout(latchAnimTimerRef.current);
            if (!reducedMotion) {
              latchAnimTimerRef.current = window.setTimeout(() => {
                setLatchingSocket(null);
                latchAnimTimerRef.current = null;
              }, 400) as unknown as number;
            } else {
              setLatchingSocket(null);
            }

            setIsToolPickerOpen(false);
          }
        } else if (activeFolder === "tools") {
          applyTool(SHELF_TOOLS[selectedToolIdx].id);
        } else if (activeFolder === "notebook") {
          const toolId = SHELF_TOOLS[selectedToolIdx].id;
          const rec = records[selectedScanIdx];
          const mod = getMeasurementById(toolId);
          const val = mod.compute(rec);
          section3Store.markToolApplied(rec.scanId, toolId, val);
          terminalSound.playToolClunk(toolId);
          terminalSound.playSnapTick();
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    booting,
    activeFolder,
    notebookView,
    records,
    selectedScanIdx,
    selectedToolIdx,
    activeSocket,
    isToolPickerOpen,
    pickerToolIdx,
    section3State.channels,
    reducedMotion,
    dragState.isDragging,
    isMeasuringAll,
    cancelDrag,
    handleReplay,
    applyTool,
    runMeasureAll,
    skipMeasureAll,
    onClose,
  ]);

  // ── Focus Trap (Accessibility) ───────────────────────────────────────────────
  // Trap Tab/Shift+Tab inside the dialog while open; restore focus on close.
  useEffect(() => {
    if (!open) return;

    // Restore focus to whatever had it before the overlay opened
    const prevFocus = document.activeElement as HTMLElement | null;

    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const container = stageRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.closest("[aria-hidden='true']") && el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleFocusTrap);
    return () => {
      document.removeEventListener("keydown", handleFocusTrap);
      // Restore focus to previously focused element when overlay closes
      prevFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const appliedForActive = section3State.toolsApplied[activeRecord.scanId] || {};

  // Min and Max per tool across known records for mini-bar scaling
  const toolMinMax = useMemo(() => {
    const map: Record<string, { min: number; max: number }> = {};
    SHELF_TOOLS.forEach((tool) => {
      const mod = getMeasurementById(tool.id);
      const vals = records.map((r) => mod.compute(r));
      map[tool.id] = {
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    });
    return map;
  }, [records]);

  // Total measured cells across all 10 records x 7 tools (70 total)
  const totalMeasuredCount = useMemo(() => {
    let count = 0;
    records.forEach((r) => {
      SHELF_TOOLS.forEach((t) => {
        if (section3State.toolsApplied[r.scanId]?.[t.id] !== undefined) {
          count++;
        }
      });
    });
    return count;
  }, [records, section3State.toolsApplied]);

  // Class shape icon & text
  const classShape = getClassShape(activeRecord.category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Command Core B"
    >
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" role="status">
        {ariaAnnouncement}
      </div>

      {/* Embedded CSS animations for 500ms smooth tool snapping */}
      <style>{`
        @keyframes benchPinDrop {
          0% { transform: translateY(-40px); opacity: 0; }
          60% { transform: translateY(0); opacity: 1; }
          80% { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
        @keyframes benchSweepDown {
          0% { transform: translateY(-60px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes benchBracketStretch {
          0% { transform: scaleX(0.1); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes benchTickPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes benchBarRise {
          0% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        .bench-anim-pin {
          animation: benchPinDrop 500ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
        }
        .bench-anim-sweep {
          animation: benchSweepDown 500ms ease-out forwards;
        }
        .bench-anim-bracket {
          transform-origin: center;
          animation: benchBracketStretch 500ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
        }
        .bench-anim-tick {
          animation: benchTickPop 240ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .bench-anim-bar {
          transform-origin: bottom;
          animation: benchBarRise 500ms ease-out forwards;
        }
        .bench-reduced-motion * {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      {/* Floating Drag Avatar */}
      {dragState.isDragging && dragState.toolId && (
        <div
          style={{
            position: "fixed",
            left: dragState.clientX - 45,
            top: dragState.clientY - 45,
            width: 90,
            height: 90,
            pointerEvents: "none",
            zIndex: 99999,
            transform: dragState.cancelling ? "scale(0.4) opacity(0)" : "scale(1.08)",
            transition: dragState.cancelling
              ? reducedMotion
                ? "none"
                : "all 200ms ease-out"
              : "none",
          }}
          className="bg-[#1a1102]/95 border-2 border-[#ffb700] rounded shadow-[0_0_24px_rgba(255,183,0,0.85)] flex flex-col items-center justify-center p-1.5 text-[#ffb700] ring-2 ring-[#ffb700]/50"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <svg viewBox="0 0 70 50" className="w-full h-full" role="img" aria-hidden="true">
              {renderShelfToolArt(dragState.toolId)}
            </svg>
          </div>
          <span className="text-[10px] font-bold tracking-wider mt-1 uppercase text-center font-mono">
            {SHELF_TOOLS.find((t) => t.id === dragState.toolId)?.shelfName}
          </span>
          <span className="text-[8px] text-[#ffb700]/70">DRAG TO CURVE</span>
        </div>
      )}

      {/* Main Scaled Stage Canvas */}
      <div className={`terminal-stage-wrapper pointer-events-auto ${reducedMotion ? "bench-reduced-motion" : ""}`}>
        <div
          ref={stageRef}
          className={`terminal-stage ${!reducedMotion ? "flicker-active" : ""} ${
            booting ? "terminal-booting" : ""
          }`}
          style={{
            transform: `scale(${scale})`,
          }}
        >
          {/* CRT Scanlines Overlay */}
          <div className="scanlines pointer-events-none" />

          {/* CRT Screen Glow Shimmer */}
          <div
            className={`terminal-flicker pointer-events-none absolute inset-0 ${
              reducedMotion ? "hidden" : ""
            }`}
          />

          {/* Top Header Bar */}
          <header className="terminal-header flex items-center justify-between px-4 h-[38px] bg-[var(--term-header-green)] text-[#020a04] font-black tracking-wider select-none">
            <div className="flex items-center gap-3">
              <span className="text-[18px] tracking-[0.18em]">COMMAND CORE B</span>
            </div>

            <div className="flex items-center gap-3">
              {showReplayIndicator && (
                <span className={`px-2 py-0.5 bg-[#020a04] text-[#ffb700] text-[11px] font-bold rounded${reducedMotion ? "" : " animate-pulse"}`}>
                  REPLAYING ANIMATION
                </span>
              )}
              {/* Small Solid Square Exit Dot matching Salvage Terminal */}
              <div
                className="w-4 h-4 bg-[#020a04] cursor-pointer hover:opacity-75 active:scale-90 transition-all"
                title="Exit Terminal (Press Q or Esc)"
                onClick={(e) => {
                  e.stopPropagation();
                  terminalSound.playBackBlip();
                  onClose();
                }}
                role="button"
                tabIndex={0}
                aria-label="Exit Terminal"
              />
            </div>
          </header>

          {/* Main Workspace Body */}
          <main className="terminal-body relative flex-1 flex p-4 gap-4 overflow-hidden min-h-0">
            {/* Left Column: Folders */}
            <FolderColumn
              slots={FOLDER_SLOTS}
              activeId={activeFolder}
              isFocused={true}
              onSelectFolder={(id) => {
                terminalSound.playSelectBlip();
                setActiveFolder(id as BenchFolder);
              }}
              onReportAnchor={handleFolderAnchor}
            />

            {/* Angular Connector Line */}
            <Connector
              startX={folderAnchor.x}
              startY={folderAnchor.y}
              endX={fileAnchor.x}
              endY={fileAnchor.y}
              reducedMotion={reducedMotion}
            />

            {/* Right Column: Active Context + Body Panel */}
            <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${activeFolder === "channels" ? "gap-2" : "gap-3"}`}>
              {/* Slot 1: Active Context Banner */}
              <div
                ref={selectedHeaderRef}
                className={`${activeFolder === "channels" ? "h-[38px]" : "h-[46px]"} bg-[#020a04] border border-[var(--term-outline-green)] rounded px-4 flex items-center justify-between text-[var(--term-green-text-bright)] select-none shrink-0`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-[16px] tracking-wider truncate">
                    {activeFolder === "examples" && `SCAN_${selectedScanIdx + 1}.DAT`}
                    {activeFolder === "tools" &&
                      `TOOL SHELF // ${SHELF_TOOLS[selectedToolIdx].shelfName}`}
                    {activeFolder === "notebook" &&
                      (notebookView === "table" ? (
                        "DATA LOG // ALL KNOWN SCANS"
                      ) : (
                        <div className="flex items-baseline gap-3 truncate">
                          <span className="font-bold text-[18px] text-[var(--term-green-text-bright)] tracking-wide">
                            {SHELF_TOOLS[selectedToolIdx].plainName}
                          </span>
                          <span className="text-[12px] text-[var(--term-green-text-dim)] font-mono uppercase tracking-wider">
                            {SHELF_TOOLS[selectedToolIdx].shelfName} / {SHELF_TOOLS[selectedToolIdx].shortName}
                          </span>
                        </div>
                      ))}
                    {activeFolder === "channels" && "CHANNELS // AUXILIARY REACTOR"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[var(--term-green-text-dim)] shrink-0">
                  {activeFolder === "examples" && `[${selectedScanIdx + 1}/10] SELECTED`}
                  {activeFolder === "tools" && "[7 TOOLS] READY"}
                  {activeFolder === "notebook" &&
                    (notebookView === "table" ? "[10 SCANS × 7 TOOLS] TABLE" : "[1D NUMBER LINE]")}
                  {activeFolder === "channels" && "[REACTOR 12%] 2 PORTS"}
                </div>
              </div>

              {/* Slot 2: Cycle Next Bar (Examples, Tools, Notebook) */}
              {activeFolder !== "channels" && (
                <div
                  onClick={() => {
                    terminalSound.playSelectBlip();
                    if (activeFolder === "examples") {
                      setSelectedScanIdx(nextScanIdx);
                    } else if (activeFolder === "tools") {
                      setSelectedToolIdx((i) => (i + 1) % SHELF_TOOLS.length);
                    } else if (activeFolder === "notebook") {
                      setNotebookView((v) => (v === "table" ? "compare" : "table"));
                    }
                  }}
                  className="h-[34px] bg-[#020a04] border border-[var(--term-outline-green)]/70 hover:border-[var(--term-header-green)] rounded px-4 flex items-center justify-between text-[13px] text-[var(--term-green-text)] cursor-pointer select-none transition-colors shrink-0"
                >
                  {activeFolder === "examples" && (
                    <span className="truncate">
                      CYCLE NEXT: {nextRecord.targetName} ({nextRecord.category?.toUpperCase() || "SCAN"})
                    </span>
                  )}
                  {activeFolder === "tools" && (
                    <span className="truncate">
                      NEXT TOOL: {SHELF_TOOLS[(selectedToolIdx + 1) % SHELF_TOOLS.length].shelfName}
                    </span>
                  )}
                  {activeFolder === "notebook" && (
                    <div className="w-full flex items-center justify-between">
                      <span className="truncate font-bold text-[13px] text-[var(--term-green-text)]">
                        {notebookView === "table"
                          ? `ACTIVE TOOL: ${SHELF_TOOLS[selectedToolIdx].plainName} (${SHELF_TOOLS[selectedToolIdx].shelfName})`
                          : `CYCLE TOOL: ${SHELF_TOOLS[(selectedToolIdx + 1) % SHELF_TOOLS.length].plainName}`}
                      </span>
                      <span className="text-[12px] text-[var(--term-green-text-dim)] font-mono">
                        {notebookView === "table" ? "[C] COMPARE READINGS" : "[C] DATA TABLE"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Slot 3: Main Body Panel */}
              <div className="flex-1 bg-[#020a04] border border-[var(--term-outline-green)] rounded flex flex-col overflow-hidden min-h-0 relative">
                {/* 22px Solid Bright Green Strip */}
                <div
                  className="w-full h-[22px] bg-[var(--term-strip-green)] shadow-[0_0_12px_rgba(28,229,66,0.6)] shrink-0"
                  aria-hidden="true"
                />

                {/* ════════════════════════════════════════════════════════════════ */}
                {/* VIEW CONTENT: EXAMPLES (User's Scanned Photos + Clean Graph)    */}
                {/* ════════════════════════════════════════════════════════════════ */}
                {activeFolder === "examples" && (
                  <div className="flex-1 w-full p-4 flex flex-col justify-between overflow-y-auto font-mono min-h-0 gap-3">
                    {/* Header: Scan info */}
                    <div className="flex items-center justify-between border-b border-[var(--term-outline-green)]/40 pb-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[18px] font-bold text-[var(--term-green-text-bright)] term-glow">
                          RECORD #{selectedScanIdx + 1}: {activeRecord.targetName}
                        </span>
                        <span className="px-2 py-0.5 rounded border border-[var(--term-outline-green)] text-[12px] font-bold bg-[#041608] text-[var(--term-green-text-bright)]">
                          {classShape.shape} {classShape.word}
                        </span>
                      </div>
                    </div>

                    {/* Side-by-Side: Scanned Image Photo (Left) + Pure Telemetry Graph (Right) */}
                    <div className="flex-1 flex gap-4 min-h-[220px]">
                      {/* Left: Scanned Image Photo */}
                      <div className="w-[280px] flex flex-col bg-[#020a04] border border-[var(--term-outline-green)]/80 rounded p-3 shrink-0">
                        <div className="flex items-center justify-between text-[11px] text-[var(--term-green-text-dim)] pb-2 mb-2 border-b border-[var(--term-outline-green)]/30">
                          <span className="font-bold text-[var(--term-green-text-bright)] tracking-wider">
                            SCANNED IMAGE
                          </span>
                          <span>OPTICAL CAPTURE</span>
                        </div>
                        <div className="flex-1 w-full relative min-h-[170px]">
                          {renderCelestialImage(activeRecord, reducedMotion)}
                        </div>
                        <div className="mt-2 text-[10px] text-[var(--term-green-text-dim)] flex items-center justify-between">
                          <span>TARGET: {activeRecord.targetName}</span>
                          <span className="text-[var(--term-green-text)] font-bold">{classShape.word}</span>
                        </div>
                      </div>

                      {/* Right: Pure Light Curve Graph (Zero tool marks, clean waveform) */}
                      <div className="flex-1 flex flex-col bg-[#020a04] border border-[var(--term-outline-green)]/80 rounded p-3 min-w-0">
                        <div className="flex items-center justify-between text-[11px] text-[var(--term-green-text-dim)] pb-2 mb-2 border-b border-[var(--term-outline-green)]/30">
                          <span className="font-bold text-[var(--term-green-text-bright)] tracking-wider">
                            PHOTOMETRIC LIGHT CURVE
                          </span>
                          <span>64 SAMPLE POINTS</span>
                        </div>
                        <div className="relative flex-1 w-full min-h-[170px] flex items-center justify-center">
                          <WaveformWithMarks
                            record={activeRecord}
                            toolId={null}
                            animNonce={0}
                            reducedMotion={reducedMotion}
                          />

                          {/* Y-Axis Legend Overlay */}
                          <div className="absolute left-1 top-2 text-[10px] text-[var(--term-green-text-dim)] font-mono">
                            1.00
                          </div>
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-[var(--term-green-text-dim)] font-mono">
                            0.50
                          </div>
                          <div className="absolute left-1 bottom-2 text-[10px] text-[var(--term-green-text-dim)] font-mono">
                            0.00
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clean Status Note (No applied readings) */}
                    <div className="p-2.5 bg-[#031106] border border-[var(--term-outline-green)]/60 rounded flex items-center justify-between text-xs text-[var(--term-green-text-dim)] shrink-0 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--term-green-text-bright)] font-bold">TELEMETRY:</span>
                        <span>NATURAL CELESTIAL RECORDING</span>
                      </div>
                      <div>
                        RECORD {selectedScanIdx + 1} OF {records.length}
                      </div>
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════════════════ */}
                {/* VIEW CONTENT: TOOLS (Physical Equipment Shelf + Active Curve)  */}
                {/* ════════════════════════════════════════════════════════════════ */}
                {activeFolder === "tools" && (
                  <div className="flex-1 w-full p-3 flex flex-col justify-between overflow-y-auto font-mono min-h-0 gap-2">
                    {/* Top Control Bar: Target info and record details */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#031106] border border-[var(--term-outline-green)]/70 rounded text-xs shrink-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[var(--term-green-text-bright)]">
                          TARGET #{selectedScanIdx + 1}: {activeRecord.targetName}
                        </span>
                        <span className="px-2 py-0.5 rounded border border-[var(--term-outline-green)] bg-[#041608] text-[var(--term-green-text-bright)] text-[11px] font-bold">
                          {classShape.shape} {classShape.word}
                        </span>
                      </div>

                      {/* Headless/Screen-reader attribute for verifier tests */}
                      {currentActiveToolId && (
                        <div
                          data-testid="tool-readout"
                          data-tool={currentActiveToolId}
                          data-value={getMeasurementById(currentActiveToolId).compute(activeRecord)}
                          data-display-reading={formatReadingValue(
                            currentActiveToolId,
                            appliedForActive[currentActiveToolId] ?? getMeasurementById(currentActiveToolId).compute(activeRecord)
                          )}
                          className="sr-only"
                        />
                      )}
                    </div>

                    {/* Active Target Waveform Curve with Drop Zone */}
                    <div
                      ref={curveRef}
                      className={`relative w-full bg-[#020a04] border rounded p-2 flex flex-col justify-center min-h-[190px] max-h-[215px] overflow-hidden transition-all ${
                        curveHovered
                          ? "border-[#ffb700] ring-2 ring-[#ffb700]/50 shadow-[0_0_16px_rgba(255,183,0,0.4)]"
                          : "border-[var(--term-outline-green)]/80"
                      }`}
                    >
                      {/* Drop Target Guide Indicator */}
                      {dragState.isDragging && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#020a04]/70 pointer-events-none">
                          <div className={`border-2 border-dashed border-[#ffb700] bg-[#1a1102]/80 px-5 py-2.5 rounded text-[13px] font-bold text-[#ffb700] tracking-wider shadow-[0_0_16px_rgba(255,183,0,0.5)]${reducedMotion ? "" : " animate-pulse"}`}>
                            RELEASE TO SNAP TOOL ONTO CURVE
                          </div>
                        </div>
                      )}

                      {/* Waveform with Active Marks */}
                      <WaveformWithMarks
                        record={activeRecord}
                        toolId={currentActiveToolId}
                        animNonce={animNonce}
                        reducedMotion={reducedMotion}
                      />

                      {/* Y-Axis Legend Overlay */}
                      <div className="absolute left-2 top-2 text-[9px] text-[var(--term-green-text-dim)] font-mono">
                        1.00
                      </div>
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-[var(--term-green-text-dim)] font-mono">
                        0.50
                      </div>
                      <div className="absolute left-2 bottom-2 text-[9px] text-[var(--term-green-text-dim)] font-mono">
                        0.00
                      </div>
                    </div>

                    {/* Shelf Header */}
                    <div className="flex items-center justify-between border-b border-[var(--term-outline-green)]/40 pb-1">
                      <span className="text-[13px] font-bold text-[var(--term-green-text-bright)] tracking-wider">
                        MEASURING EQUIPMENT SHELF
                      </span>
                    </div>

                    {/* Tools Shelf Grid */}
                    <div className="grid grid-cols-4 gap-3">
                      {SHELF_TOOLS.map((tool, idx) => {
                        const isSelected = selectedToolIdx === idx;
                        const isApplied = appliedForActive[tool.id] !== undefined;
                        const readingVal = appliedForActive[tool.id];

                        return (
                          <div
                            key={tool.id}
                            data-testid={`shelf-tool-${tool.id}`}
                            onPointerDown={(e) => handlePointerDownTool(e, tool.id, idx)}
                            onPointerMove={handlePointerMoveTool}
                            onPointerUp={handlePointerUpTool}
                            onClick={() => {
                              setSelectedToolIdx(idx);
                              terminalSound.playSelectBlip();
                            }}
                            className={`flex flex-col justify-between p-2 rounded border transition-all cursor-grab active:cursor-grabbing select-none ${
                              isSelected
                                ? "bg-[var(--term-dark-bg)] border-[var(--term-header-green)] shadow-[0_0_14px_rgba(38,214,73,0.4)] ring-1 ring-[var(--term-header-green)] font-black"
                                : "bg-[#031106] border-[var(--term-outline-green)]/70 hover:border-[var(--term-header-green)] text-[var(--term-green-text)]/90"
                            }`}
                          >
                            {/* Physical Equipment Line-Art Graphic */}
                            <div className="w-full h-11 bg-[#020a04] border border-[var(--term-outline-green)]/50 rounded flex items-center justify-center p-1 mb-1 overflow-hidden">
                              <svg viewBox="0 0 70 50" className="w-full h-full" role="img" aria-hidden="true">
                                {renderShelfToolArt(tool.id)}
                              </svg>
                            </div>

                            {/* Plain Name — Up to 2 lines, NO truncation ellipsis */}
                            <div className="min-h-[28px] flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[12px] font-bold leading-tight text-[var(--term-green-text-bright)]">
                                {tool.plainName}
                              </span>
                              <span className="text-sm shrink-0">{tool.icon}</span>
                            </div>

                            {/* Calculated Reading in High-Contrast Amber Phosphor */}
                            <div className="my-1">
                              {isApplied ? (
                                <div className="w-full py-1 px-1 rounded bg-[#1e1302] border border-[#ffb700]/80 text-[#ffb700] text-[11px] font-bold text-center tracking-wider shadow-[0_0_6px_rgba(255,183,0,0.25)]">
                                  {formatReadingValue(tool.id, readingVal)}
                                </div>
                              ) : (
                                <div className="w-full py-1 px-1 rounded bg-[#020a04] border border-[var(--term-outline-green)]/30 text-[var(--term-green-text-dim)] text-[10px] text-center font-mono">
                                  --
                                </div>
                              )}
                            </div>

                            {/* Footer: Info Link */}
                            <div className="flex items-center justify-between pt-1 border-t border-[var(--term-outline-green)]/30 mt-auto text-[10px]">
                              <ToolHint toolId={tool.id} variant="terminal" showInfoButton={true}>
                                <span className="text-[9px] text-[var(--term-green-text-dim)] hover:underline cursor-pointer">
                                  Info
                                </span>
                              </ToolHint>
                              <span className="text-[9px] text-[var(--term-green-text-dim)] font-mono">
                                #{idx + 1}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════════════════ */}
                {/* VIEW CONTENT: NOTEBOOK (Data Table & 1D Compare Number Line)  */}
                {/* ════════════════════════════════════════════════════════════════ */}
                {activeFolder === "notebook" && (
                  notebookView === "table" ? (
                    /* ── Sub-View A: 10 Scans x 7 Tools Data Table ── */
                    <div className="flex-1 w-full p-3 flex flex-col justify-between overflow-hidden font-mono min-h-0 gap-2">
                      {/* Top Bar inside Table */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#031106] border border-[var(--term-outline-green)]/70 rounded text-xs shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--term-green-text-bright)]">
                            DATA LOG // ALL KNOWN SCANS
                          </span>
                          <span className="text-[11px] text-[var(--term-green-text-dim)]">
                            10 SCANS × 7 PHYSICAL INSTRUMENTS
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid="btn-compare-view"
                            onClick={() => {
                              terminalSound.playSelectBlip();
                              setNotebookView("compare");
                            }}
                            className="px-2.5 py-0.5 rounded border border-[var(--term-outline-green)] hover:border-[#ffb700] text-[11px] text-[var(--term-green-text-bright)] hover:text-[#ffb700] font-bold transition-all"
                          >
                            COMPARE READINGS [C] ►
                          </button>
                          <button
                            type="button"
                            onClick={runMeasureAll}
                            className="px-2.5 py-0.5 rounded border border-[#ffb700] bg-[#1e1302] text-[#ffb700] hover:bg-[#2b1b04] text-[11px] font-bold shadow-[0_0_8px_rgba(255,183,0,0.3)] transition-all"
                          >
                            MEASURE ALL [M]
                          </button>
                        </div>
                      </div>

                      {/* Main Scrollable Data Table Container */}
                      <div className="flex-1 border border-[var(--term-outline-green)]/70 rounded overflow-auto bg-[#020a04] select-none min-h-0">
                        <table className="w-full border-collapse text-left font-mono">
                          <thead>
                            <tr className="border-b border-[var(--term-outline-green)]/60 bg-[#031106] sticky top-0 z-10">
                              <th className="py-2 px-3 text-[10px] uppercase font-bold text-[var(--term-green-text-dim)] w-[145px]">
                                KNOWN SCAN
                              </th>
                              {SHELF_TOOLS.map((tool, tIdx) => {
                                const isColActive = selectedToolIdx === tIdx;
                                return (
                                  <th
                                    key={tool.id}
                                    onClick={() => {
                                      setSelectedToolIdx(tIdx);
                                      terminalSound.playKeyTick();
                                    }}
                                    className={`py-2 px-2 text-center cursor-pointer transition-colors ${
                                      isColActive
                                        ? "bg-[#061e0b] border-b-2 border-b-[#ffb700] text-[var(--term-green-text-bright)]"
                                        : "hover:bg-[#041608] text-[var(--term-green-text-dim)]"
                                    }`}
                                  >
                                    <div className="text-[10px] font-bold leading-tight truncate">
                                      {tool.plainName}
                                    </div>
                                    <div className="flex items-center justify-center gap-1.5 text-[9px] mt-0.5 text-[var(--term-green-text-dim)]">
                                      <span>{tool.icon}</span>
                                      <span>{tool.shortName}</span>
                                      <ToolHint toolId={tool.id} variant="terminal" showInfoButton={true}>
                                        <span className="text-[8px] hover:underline cursor-pointer">
                                          (i)
                                        </span>
                                      </ToolHint>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((rec, rIdx) => {
                              const isRowSelected = selectedScanIdx === rIdx;
                              const cShape = getClassShape(rec.category);
                              return (
                                <tr
                                  key={rec.scanId}
                                  onClick={() => {
                                    setSelectedScanIdx(rIdx);
                                    terminalSound.playKeyTick();
                                  }}
                                  className={`border-b border-[var(--term-outline-green)]/20 transition-colors cursor-pointer ${
                                    isRowSelected ? "bg-[#06240d] font-bold" : "hover:bg-[#031407]"
                                  }`}
                                >
                                  {/* Row Header Cell */}
                                  <td className="py-1.5 px-3 border-r border-[var(--term-outline-green)]/30">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] text-[var(--term-green-text-bright)]">
                                        {cShape.shape}
                                      </span>
                                      <span className="text-[11px] text-[var(--term-green-text-bright)] tracking-wider">
                                        {rec.targetName}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-[var(--term-green-text-dim)] pl-4 uppercase font-mono">
                                      {cShape.word}
                                    </div>
                                  </td>

                                  {/* 7 Tool Cells */}
                                  {SHELF_TOOLS.map((tool, cIdx) => {
                                    const isCellActive = isRowSelected && selectedToolIdx === cIdx;
                                    const applied = section3State.toolsApplied[rec.scanId]?.[tool.id];
                                    const mod = getMeasurementById(tool.id);
                                    const numVal = typeof applied === "number" ? applied : mod.compute(rec);
                                    const { min, max } = toolMinMax[tool.id] || { min: 0, max: 1 };
                                    const pct =
                                      max > min
                                        ? Math.max(8, Math.min(100, Math.round(((numVal - min) / (max - min)) * 100)))
                                        : 50;

                                    return (
                                      <td
                                        key={tool.id}
                                        data-testid={`notebook-cell-${rec.scanId}-${tool.id}`}
                                        data-measured={true}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedScanIdx(rIdx);
                                          setSelectedToolIdx(cIdx);
                                          terminalSound.playKeyTick();
                                        }}
                                        className={`py-1.5 px-2 text-center border-r border-[var(--term-outline-green)]/20 transition-all ${
                                          isCellActive
                                            ? "ring-1 ring-[#ffb700] bg-[#1a1202]/50"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex flex-col items-center justify-center">
                                          <span className="text-[#ffb700] font-bold text-[11px] leading-none">
                                            {formatReadingValue(tool.id, numVal)}
                                          </span>
                                          {/* Mini-bar */}
                                          <div className="w-14 h-1 bg-[#031106] border border-[var(--term-outline-green)]/40 rounded-full mt-1.5 overflow-hidden">
                                            <div
                                              className="h-full bg-[#ffb700]"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Bottom Status Strip in Table */}
                      <div className="p-2 bg-[#031106] border border-[var(--term-outline-green)]/60 rounded flex items-center justify-between text-xs text-[var(--term-green-text-dim)] shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--term-green-text-bright)] font-bold">
                            SELECTED:
                          </span>
                          <span>
                            {records[selectedScanIdx].targetName} ({getClassShape(records[selectedScanIdx].category).word}) × {SHELF_TOOLS[selectedToolIdx].shelfName}
                          </span>
                        </div>
                        <div>
                          {isMeasuringAll ? (
                            <span className={`text-[#ffb700] font-bold${reducedMotion ? "" : " animate-pulse"}`}>
                              MEASURING ALL: {measureAllProgress}/10 [SPACE] SKIP
                            </span>
                          ) : (
                            <span>MEASURED: {totalMeasuredCount}/70 CELLS</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Sub-View B: 1D Compare Number Line & Group Lanes ── */
                    <div className="flex-1 w-full p-3 flex flex-col justify-between overflow-hidden font-mono min-h-0 gap-2">
                      {/* Top Control Bar inside Compare View */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#031106] border border-[var(--term-outline-green)]/70 rounded shrink-0">
                        {/* Neutral Caption (At least 14 px) */}
                        <div className="text-[15px] font-bold text-[var(--term-green-text-bright)] tracking-wide">
                          Readings by group
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Lanes Toggle (L key) */}
                          <button
                            type="button"
                            onClick={() => {
                              terminalSound.playKeyTick();
                              setCompareMode((cur) => (cur === "lanes" ? "single" : "lanes"));
                            }}
                            className={`px-3 py-1 rounded border text-[14px] font-bold transition-all ${
                              compareMode === "lanes"
                                ? "border-[#ffb700] bg-[#1e1302] text-[#ffb700]"
                                : "border-[var(--term-outline-green)] hover:border-[#ffb700] text-[var(--term-green-text-bright)] hover:text-[#ffb700]"
                            }`}
                          >
                            LANES: [L] {compareMode === "lanes" ? "THREE" : "SINGLE"}
                          </button>

                          {/* Group Outlines Toggle (G key) */}
                          <button
                            type="button"
                            onClick={() => {
                              terminalSound.playKeyTick();
                              setShowClassOutlines((cur) => !cur);
                            }}
                            className={`px-3 py-1 rounded border text-[14px] font-bold transition-all ${
                              showClassOutlines
                                ? "border-[#ffb700] bg-[#1e1302] text-[#ffb700]"
                                : "border-[var(--term-outline-green)] hover:border-[#ffb700] text-[var(--term-green-text-bright)] hover:text-[#ffb700]"
                            }`}
                          >
                            GROUP OUTLINES: [G] {showClassOutlines ? "ON" : "OFF"}
                          </button>

                          {/* Unknown Signals Toggle (U key) */}
                          <button
                            type="button"
                            onClick={() => {
                              terminalSound.playKeyTick();
                              setShowUnknowns((cur) => !cur);
                            }}
                            className={`px-3 py-1 rounded border text-[14px] font-bold transition-all ${
                              showUnknowns
                                ? "border-[#ffb700] bg-[#1e1302] text-[#ffb700]"
                                : "border-[var(--term-outline-green)] hover:border-[#ffb700] text-[var(--term-green-text-bright)] hover:text-[#ffb700]"
                            }`}
                          >
                            UNKNOWNS: [U] {showUnknowns ? "ON" : "OFF"}
                          </button>

                          {/* Return to Table (C key) */}
                          <button
                            type="button"
                            onClick={() => {
                              terminalSound.playSelectBlip();
                              setNotebookView("table");
                            }}
                            className="px-3 py-1 rounded border border-[var(--term-outline-green)] hover:border-[#ffb700] text-[14px] text-[var(--term-green-text-bright)] hover:text-[#ffb700] font-bold transition-all"
                          >
                            ◄ DATA TABLE [C]
                          </button>
                        </div>
                      </div>

                      {/* 1D Number Line / Lanes SVG Plot Panel */}
                      {(() => {
                        const activeTool = SHELF_TOOLS[selectedToolIdx];
                        const mod = getMeasurementById(activeTool.id);

                        // Effective Unknown Readings from candidate signals (use prop if provided, else compute from candidate signals pool)
                        const candidates = createCandidates();
                        const effectiveUnknowns: Array<{ id: string; value: number }> =
                          unknownReadings && unknownReadings.length > 0
                            ? unknownReadings
                            : candidates.map((c) => ({ id: c.id, value: mod.compute(c) }));

                        const knownVals = records.map((r) => mod.compute(r));
                        const allValsToFit = [
                          ...knownVals,
                          ...(showUnknowns ? effectiveUnknowns.map((u) => u.value) : []),
                        ];
                        const rawMin = Math.min(...allValsToFit);
                        const rawMax = Math.max(...allValsToFit);
                        const span = rawMax - rawMin || 1;

                        // Fit axis to known + unknown readings with 10% margin so no ring can fall off
                        const plotMin = rawMin - span * 0.10;
                        const plotMax = rawMax + span * 0.10;
                        const plotSpan = plotMax - plotMin;

                        const svgW = 860;
                        const svgH = 260;
                        const padLeft = 145; // Generous space for lane labels like "● BLACK HOLE" at 14px
                        const padRight = 50;
                        const plotW = svgW - padLeft - padRight;
                        const toPlotX = (v: number) => padLeft + ((v - plotMin) / plotSpan) * plotW;

                        // Group info for the 3 classes
                        const classes = [
                          { key: "black_hole", name: "BLACK HOLE", shape: "●", laneY: 65 },
                          { key: "planet", name: "PLANET", shape: "■", laneY: 120 },
                          { key: "stars", name: "STAR", shape: "▲", laneY: 175 },
                        ];

                        // Collect plotted dots with beeswarm stacking inside lanes or single line
                        interface PlottedDot {
                          rec: SectionThreeRecord;
                          val: number;
                          x: number;
                          y: number;
                          isMeasured: boolean;
                          cInfo: ReturnType<typeof getClassShape>;
                          clusterSize: number;
                          clusterIdx: number;
                        }

                        const plottedDots: PlottedDot[] = [];
                        const yOffsets = [0, -14, 14, -26, 26];

                        if (compareMode === "lanes") {
                          for (const cls of classes) {
                            const cRecs = records.filter(
                              (r) => getClassShape(r.category, r.kind).key === cls.key
                            );
                            cRecs.sort((a, b) => mod.compute(a) - mod.compute(b));

                            // Cluster close/identical readings within 14px
                            const clusters: Array<Array<{ rec: SectionThreeRecord; val: number; x: number }>> = [];
                            for (const rec of cRecs) {
                              const val = mod.compute(rec);
                              const x = toPlotX(val);
                              let placed = false;
                              for (const cluster of clusters) {
                                if (Math.abs(cluster[0].x - x) < 14) {
                                  cluster.push({ rec, val, x });
                                  placed = true;
                                  break;
                                }
                              }
                              if (!placed) clusters.push([{ rec, val, x }]);
                            }

                            for (const cluster of clusters) {
                              cluster.forEach((item, cIdx) => {
                                const y = cls.laneY + yOffsets[cIdx % yOffsets.length];
                                plottedDots.push({
                                  rec: item.rec,
                                  val: item.val,
                                  x: item.x,
                                  y,
                                  isMeasured: true,
                                  cInfo: getClassShape(item.rec.category, item.rec.kind),
                                  clusterSize: cluster.length,
                                  clusterIdx: cIdx,
                                });
                              });
                            }
                          }
                        } else {
                          // Single line mode: axisY = 120
                          const singleAxisY = 120;
                          const sorted = [...records].sort((a, b) => mod.compute(a) - mod.compute(b));
                          const clusters: Array<Array<{ rec: SectionThreeRecord; val: number; x: number }>> = [];
                          for (const rec of sorted) {
                            const val = mod.compute(rec);
                            const x = toPlotX(val);
                            let placed = false;
                            for (const cluster of clusters) {
                              if (Math.abs(cluster[0].x - x) < 14) {
                                cluster.push({ rec, val, x });
                                placed = true;
                                break;
                              }
                            }
                            if (!placed) clusters.push([{ rec, val, x }]);
                          }

                          for (const cluster of clusters) {
                            cluster.forEach((item, cIdx) => {
                              const y = singleAxisY + yOffsets[cIdx % yOffsets.length];
                              plottedDots.push({
                                rec: item.rec,
                                val: item.val,
                                x: item.x,
                                y,
                                isMeasured: true,
                                cInfo: getClassShape(item.rec.category, item.rec.kind),
                                clusterSize: cluster.length,
                                clusterIdx: cIdx,
                              });
                            });
                          }
                        }

                        // Active focused dot (wrapped within range)
                        const focusedDot = plottedDots[focusedDotIdx % Math.max(1, plottedDots.length)];

                        return (
                          <div
                            data-testid="compare-number-line"
                            data-compare-mode={compareMode}
                            data-tool-id={activeTool.id}
                            className="relative flex-1 w-full bg-[#020a04] border border-[var(--term-outline-green)]/80 rounded p-2 flex flex-col justify-center min-h-[220px] overflow-hidden"
                          >
                            <svg
                              viewBox={`0 0 ${svgW} ${svgH}`}
                              className="w-full h-full select-none"
                              preserveAspectRatio="xMidYMid meet"
                            >
                              {/* 1. GROUP LANES / SINGLE LINE GUIDES & LABELS */}
                              {compareMode === "lanes" ? (
                                <g data-testid="group-lanes">
                                  {classes.map((cls) => (
                                    <g key={`lane-${cls.key}`} data-testid={`lane-${cls.key}`}>
                                      {/* One word label per lane on the left (at least 14 px) */}
                                      <text
                                        x={18}
                                        y={cls.laneY + 5}
                                        textAnchor="start"
                                        fill="var(--term-green-text-bright)"
                                        fontSize="14"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                      >
                                        {cls.shape} {cls.name}
                                      </text>
                                      {/* Thin horizontal lane axis line */}
                                      <line
                                        x1={padLeft}
                                        y1={cls.laneY}
                                        x2={svgW - padRight}
                                        y2={cls.laneY}
                                        stroke="var(--term-outline-green)"
                                        strokeWidth="1"
                                        strokeDasharray="3,3"
                                        opacity="0.35"
                                      />
                                    </g>
                                  ))}
                                </g>
                              ) : (
                                <g data-testid="single-axis">
                                  <line
                                    x1={padLeft}
                                    y1={120}
                                    x2={svgW - padRight}
                                    y2={120}
                                    stroke="var(--term-outline-green)"
                                    strokeWidth="1.5"
                                    opacity="0.7"
                                  />
                                </g>
                              )}

                              {/* 3. GROUP OUTLINES / ENVELOPES (G key toggle) */}
                              {showClassOutlines && (() => {
                                const envData = classes
                                  .map((cls) => {
                                    const cRecs = records.filter(
                                      (r) => getClassShape(r.category, r.kind).key === cls.key
                                    );
                                    if (cRecs.length === 0) return null;
                                    const cVals = cRecs.map((r) => mod.compute(r));
                                    const cMin = Math.min(...cVals);
                                    const cMax = Math.max(...cVals);
                                    const x1 = toPlotX(cMin);
                                    const x2 = toPlotX(cMax);
                                    const w = Math.max(6, x2 - x1);
                                    const midX = (x1 + x2) / 2;
                                    return { cls, cMin, cMax, x1, x2, w, midX };
                                  })
                                  .filter((e): e is NonNullable<typeof e> => e !== null);

                                if (compareMode === "lanes") {
                                  // In lanes mode, bracket hugs each lane
                                  return envData.map(({ cls, x1, x2, w }) => (
                                    <g key={`env-${cls.key}`} data-testid={`outline-${cls.key}`}>
                                      <rect
                                        x={x1}
                                        y={cls.laneY - 20}
                                        width={w}
                                        height={40}
                                        fill="#ffb700"
                                        fillOpacity="0.05"
                                        stroke="#ffb700"
                                        strokeWidth="1.2"
                                        strokeDasharray="4,4"
                                        rx="2"
                                      />
                                      <line x1={x1} y1={cls.laneY - 20} x2={x1} y2={cls.laneY + 20} stroke="#ffb700" strokeWidth="2" />
                                      <line x1={x2} y1={cls.laneY - 20} x2={x2} y2={cls.laneY + 20} stroke="#ffb700" strokeWidth="2" />
                                    </g>
                                  ));
                                }

                                // In single line mode, stagger labels to prevent collision
                                envData.sort((a, b) => a.midX - b.midX);
                                const tiered: Array<typeof envData[0] & { tier: number }> = [];
                                for (let i = 0; i < envData.length; i++) {
                                  const item = envData[i];
                                  let tier = 0;
                                  if (i > 0 && Math.abs(item.midX - envData[i - 1].midX) < 100) {
                                    tier = (tiered[i - 1]?.tier === 0) ? 1 : 0;
                                  }
                                  tiered.push({ ...item, tier });
                                }

                                const bandY = 75;
                                const bandH = 90;
                                return tiered.map(({ cls, x1, x2, w, midX, tier }) => {
                                  const labelY = tier === 0 ? bandY - 8 : bandY - 24;
                                  return (
                                    <g key={`env-${cls.key}`} data-testid={`outline-${cls.key}`}>
                                      <rect
                                        x={x1}
                                        y={bandY}
                                        width={w}
                                        height={bandH}
                                        fill="#ffb700"
                                        fillOpacity="0.05"
                                        stroke="#ffb700"
                                        strokeWidth="1.2"
                                        strokeDasharray="4,4"
                                        rx="3"
                                      />
                                      <line x1={x1} y1={bandY} x2={x1} y2={bandY + bandH} stroke="#ffb700" strokeWidth="2" />
                                      <line x1={x2} y1={bandY} x2={x2} y2={bandY + bandH} stroke="#ffb700" strokeWidth="2" />
                                      <text
                                        x={midX}
                                        y={labelY}
                                        textAnchor="middle"
                                        fill="#ffb700"
                                        fontSize="14"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                      >
                                        {cls.shape} {cls.name}
                                      </text>
                                    </g>
                                  );
                                });
                              })()}

                              {/* 4. CLASS MEDIAN TICKS */}
                              {classes.map((cls) => {
                                const cRecs = records.filter(
                                  (r) => getClassShape(r.category, r.kind).key === cls.key
                                );
                                if (cRecs.length === 0) return null;
                                const cVals = cRecs.map((r) => mod.compute(r)).sort((a, b) => a - b);
                                const mid = Math.floor(cVals.length / 2);
                                const med = cVals.length % 2 === 0 ? (cVals[mid - 1] + cVals[mid]) / 2 : cVals[mid];
                                const mx = toPlotX(med);
                                const y1 = compareMode === "lanes" ? cls.laneY - 20 : 80;
                                const y2 = compareMode === "lanes" ? cls.laneY + 20 : 160;

                                return (
                                  <g key={`med-${cls.key}`} data-testid={`median-${cls.key}`}>
                                    <line
                                      x1={mx}
                                      y1={y1}
                                      x2={mx}
                                      y2={y2}
                                      stroke="#ffb700"
                                      strokeWidth="1.6"
                                      strokeDasharray="3,3"
                                      opacity="0.8"
                                    />
                                    <title>{`${cls.name} median: ${formatReadingValue(activeTool.id, med)}`}</title>
                                  </g>
                                );
                              })}

                              {/* 5. SHARED HORIZONTAL AXIS & 5 EVENLY SPACED TICKS */}
                              <line
                                x1={padLeft}
                                y1={215}
                                x2={svgW - padRight}
                                y2={215}
                                stroke="var(--term-outline-green)"
                                strokeWidth="2"
                              />

                              {/* 5 Labelled Major Ticks + Minor Ticks */}
                              {[0, 1, 2, 3, 4].map((k) => {
                                const tickVal = plotMin + k * (plotSpan / 4);
                                const tickX = padLeft + k * (plotW / 4);
                                const minorX = k < 4 ? padLeft + (k + 0.5) * (plotW / 4) : null;

                                return (
                                  <g key={`tick-${k}`}>
                                    {/* Major Tick */}
                                    <line
                                      x1={tickX}
                                      y1={215}
                                      x2={tickX}
                                      y2={223}
                                      stroke="var(--term-outline-green)"
                                      strokeWidth="1.5"
                                    />
                                    {/* Tick Label (at least 14 px) */}
                                    <text
                                      x={tickX}
                                      y={242}
                                      textAnchor="middle"
                                      fill="var(--term-green-text-dim)"
                                      fontSize="14"
                                      fontFamily="monospace"
                                    >
                                      {formatReadingValue(activeTool.id, tickVal)}
                                    </text>

                                    {/* Intermediate Minor Tick */}
                                    {minorX !== null && (
                                      <line
                                        x1={minorX}
                                        y1={215}
                                        x2={minorX}
                                        y2={219}
                                        stroke="var(--term-outline-green)"
                                        strokeWidth="1"
                                        strokeDasharray="1,1"
                                        opacity="0.5"
                                      />
                                    )}
                                  </g>
                                );
                              })}

                              {/* 6. UNKNOWN SIGNALS HOLLOW RINGS (When provided or toggled) */}
                              {showUnknowns && (() => {
                                const clusterKey = (val: number) => Math.round(toPlotX(val) / 14);
                                const clusterTotals: Record<number, number> = {};
                                effectiveUnknowns.forEach((u) => {
                                  const k = clusterKey(u.value);
                                  clusterTotals[k] = (clusterTotals[k] || 0) + 1;
                                });
                                const clusterIndex: Record<number, number> = {};

                                return effectiveUnknowns.map((u, uIdx) => {
                                  const baseUx = toPlotX(u.value);
                                  const k = clusterKey(u.value);
                                  const totalInCluster = clusterTotals[k] || 1;
                                  const idxInCluster = clusterIndex[k] || 0;
                                  clusterIndex[k] = idxInCluster + 1;

                                  // Spread overlapping rings horizontally (20px pitch) so all numbers 1..6 are visible
                                  const ux =
                                    totalInCluster > 1
                                      ? baseUx + (idxInCluster - (totalInCluster - 1) / 2) * 20
                                      : baseUx;

                                  return (
                                    <g key={`unknown-${u.id}`} data-testid={`unknown-ring-${uIdx + 1}`}>
                                      {/* Hollow Ring (18 px minimum diameter: r=10 => diameter 20px) */}
                                      <circle
                                        cx={ux}
                                        cy={215}
                                        r={10}
                                        fill="#020a04"
                                        stroke="#ffb700"
                                        strokeWidth="2.5"
                                        style={{ filter: "drop-shadow(0 0 6px rgba(255,183,0,0.8))" }}
                                      />
                                      {/* Number 1 to 6 inside ring (at least 14 px) */}
                                      <text
                                        x={ux}
                                        y={220}
                                        textAnchor="middle"
                                        fill="#ffb700"
                                        fontSize="14"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                      >
                                        {uIdx + 1}
                                      </text>
                                      <title>{`Unknown signal ${uIdx + 1}: ${formatReadingValue(activeTool.id, u.value)}`}</title>
                                    </g>
                                  );
                                });
                              })()}

                              {/* 7. PLOTTED KNOWN SCAN DOTS */}
                              {plottedDots.map((pt, pIdx) => {
                                const isFocused = focusedDot?.rec.scanId === pt.rec.scanId;
                                return (
                                  <g
                                    key={`dot-${pt.rec.scanId}`}
                                    data-testid={`compare-dot-${pt.rec.scanId}`}
                                    data-measured={pt.isMeasured}
                                    data-category={pt.cInfo.key}
                                    data-value={pt.val}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`${pt.rec.targetName}. ${pt.cInfo.name}. ${formatReadingValue(activeTool.id, pt.val)}.`}
                                    onClick={() => {
                                      setFocusedDotIdx(pIdx);
                                      terminalSound.playKeyTick();
                                    }}
                                    onFocus={() => setFocusedDotIdx(pIdx)}
                                    className="cursor-pointer outline-none"
                                  >
                                    {/* Active Focused Outer Ring */}
                                    {isFocused && (
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={14}
                                        fill="none"
                                        stroke="#ffb700"
                                        strokeWidth="2"
                                        strokeDasharray="3,2"
                                      />
                                    )}

                                    {/* Glyph rendering based on category: 16-18 px size */}
                                    {pt.cInfo.key === "black_hole" && (
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={8.5}
                                        fill="#ffb700"
                                        stroke="#ffb700"
                                        strokeWidth="2"
                                        style={{ filter: "drop-shadow(0 0 6px rgba(255,183,0,0.7))" }}
                                      />
                                    )}

                                    {pt.cInfo.key === "planet" && (
                                      <rect
                                        x={pt.x - 8.5}
                                        y={pt.y - 8.5}
                                        width={17}
                                        height={17}
                                        fill="#ffb700"
                                        stroke="#ffb700"
                                        strokeWidth="2"
                                        style={{ filter: "drop-shadow(0 0 6px rgba(255,183,0,0.7))" }}
                                      />
                                    )}

                                    {pt.cInfo.key === "stars" && (
                                      <polygon
                                        points={`${pt.x},${pt.y - 9} ${pt.x - 8.5},${pt.y + 8} ${pt.x + 8.5},${pt.y + 8}`}
                                        fill="#ffb700"
                                        stroke="#ffb700"
                                        strokeWidth="2"
                                        style={{ filter: "drop-shadow(0 0 6px rgba(255,183,0,0.7))" }}
                                      />
                                    )}

                                    {/* Center Core Dot: always marked */}
                                    <circle cx={pt.x} cy={pt.y} r="2.5" fill="#1e1302" />

                                    {/* Stacking Count Badge: ONLY beyond four identical dots */}
                                    {pt.clusterSize > 4 && pt.clusterIdx === 0 && (
                                      <text
                                        x={pt.x + 13}
                                        y={pt.y - 12}
                                        fill="#ffb700"
                                        fontSize="14"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                      >
                                        x{pt.clusterSize}
                                      </text>
                                    )}

                                    <title>{`${pt.rec.targetName}: ${pt.cInfo.shape} ${pt.cInfo.name} — ${formatReadingValue(activeTool.id, pt.val)}`}</title>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        );
                      })()}

                      {/* Legend Footer (All text at least 14 px) */}
                      <div className="p-2.5 bg-[#031106] border border-[var(--term-outline-green)]/60 rounded flex items-center justify-between text-[14px] text-[var(--term-green-text-dim)] shrink-0 font-mono">
                        <div className="flex items-center gap-5">
                          <span className="flex items-center gap-1.5 text-[var(--term-green-text-bright)]">
                            <span className="text-[16px]">●</span>
                            <span>BLACK HOLE</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-[var(--term-green-text-bright)]">
                            <span className="text-[16px]">■</span>
                            <span>PLANET</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-[var(--term-green-text-bright)]">
                            <span className="text-[16px]">▲</span>
                            <span>STAR</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-[#ffb700]/80">
                            <span className="font-bold">╎</span>
                            <span>median tick</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          {showUnknowns && (
                            <span className="flex items-center gap-1.5 text-[#ffb700] font-bold">
                              <span className="inline-block w-4 h-4 rounded-full border-2 border-[#ffb700] text-center text-[12px] leading-3 font-bold">?</span>
                              <span>Unknowns (1–6)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Focused Dot Details & Measure All Status Bar (At least 14 px) */}
                      <div className="flex items-center justify-between px-3 py-2 bg-[#020a04] border border-[var(--term-outline-green)]/60 rounded shrink-0 text-[14px] font-mono">
                        {(() => {
                          const activeTool = SHELF_TOOLS[selectedToolIdx];
                          const mod = getMeasurementById(activeTool.id);
                          const activeRecordForDot = records[focusedDotIdx % records.length];
                          const val = mod.compute(activeRecordForDot);
                          const cInfo = getClassShape(activeRecordForDot.category, activeRecordForDot.kind);
                          return (
                            <div className="flex items-center gap-3 text-[var(--term-green-text-bright)]">
                              <span className="font-bold text-[#ffb700]">{activeRecordForDot.targetName}</span>
                              <span className="text-[var(--term-green-text-dim)]">
                                {cInfo.shape} {cInfo.name}
                              </span>
                              <span className="bg-[#1e1302] px-2.5 py-0.5 rounded border border-[#ffb700]/70 text-[#ffb700] font-bold">
                                {formatReadingValue(activeTool.id, val)}
                              </span>
                              <span className="text-[14px] text-[var(--term-green-text-dim)]">
                                [◄ ► ARROW KEYS MOVE]
                              </span>
                            </div>
                          );
                        })()}

                        <div>
                          <button
                            type="button"
                            onClick={runMeasureAll}
                            className="px-3 py-1 rounded border border-[#ffb700] bg-[#1e1302] text-[#ffb700] font-bold text-[14px] hover:bg-[#2b1b04] shadow-[0_0_8px_rgba(255,183,0,0.3)] transition-all"
                          >
                            MEASURE ALL [M]
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* ════════════════════════════════════════════════════════════════ */}
                {/* VIEW CONTENT: CHANNELS (Reactor Gauge + CH1/CH2 Sockets)        */}
                {/* ════════════════════════════════════════════════════════════════ */}
                {activeFolder === "channels" && (
                  <div className="flex-1 w-full p-2 flex flex-col justify-between overflow-hidden font-mono min-h-0 gap-1.5">
                    {/* Top Controls Row: Reactor Line-art Gauge + Physical Sockets in ONE clean compact row */}
                    <div className="flex items-stretch gap-2 shrink-0 h-[34px]">
                      {/* Reactor 12% Phosphor Gauge Box */}
                      <div className="bg-[#031106] border border-[var(--term-outline-green)]/80 rounded px-2 py-0.5 flex items-center gap-2 shadow-inner shrink-0">
                        <svg
                          width="110"
                          height="20"
                          viewBox="0 0 110 20"
                          className="shrink-0"
                          role="img"
                          aria-label="Reactor level gauge: 12 percent"
                        >
                          <rect
                            x="1"
                            y="1"
                            width="108"
                            height="18"
                            rx="2"
                            fill="#010602"
                            stroke="var(--term-outline-green)"
                            strokeWidth="1.2"
                          />
                          <line x1="28" y1="1" x2="28" y2="19" stroke="var(--term-outline-green)" strokeWidth="0.8" opacity="0.3" />
                          <line x1="55" y1="1" x2="55" y2="19" stroke="var(--term-outline-green)" strokeWidth="0.8" opacity="0.3" />
                          <line x1="82" y1="1" x2="82" y2="19" stroke="var(--term-outline-green)" strokeWidth="0.8" opacity="0.3" />
                          <rect x="3" y="3" width="13" height="14" rx="1" fill="#ffb700" opacity="0.85" />
                          <text x="20" y="14" fill="var(--term-green-text-bright)" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                            REACTOR 12%
                          </text>
                        </svg>
                        <span className="text-[10px] text-[var(--term-green-text-bright)] whitespace-nowrap">
                          The reactor can power two channels.
                        </span>
                      </div>

                      {/* Sockets: CH1 & CH2 (horizontal compact cards) */}
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {[0, 1].map((sIdx) => {
                          const socketNum = (sIdx + 1) as 1 | 2;
                          const isSelected = activeSocket === sIdx;
                          const toolId = section3State.channels[sIdx];
                          const toolEntry = toolId ? getGlossaryEntry(toolId) : null;
                          const isLatching = latchingSocket === sIdx;

                          return (
                            <div
                              key={`socket-${sIdx}`}
                              onClick={() => {
                                setActiveSocket(sIdx as 0 | 1);
                                setIsToolPickerOpen(true);
                                terminalSound.playSelectBlip();
                              }}
                              className={`relative px-2 py-0.5 rounded border transition-all cursor-pointer select-none flex items-center justify-between gap-1.5 ${
                                isSelected
                                  ? "border-[#ffb700] bg-[#1a1102]/90 shadow-[0_0_8px_rgba(255,183,0,0.35)]"
                                  : "border-[var(--term-outline-green)] bg-[#031106]/80 hover:border-[#ffb700]/70"
                              } ${isLatching && !reducedMotion ? "animate-pulse scale-[1.01]" : ""}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`Channel ${socketNum} Port: ${toolEntry ? toolEntry.plainName : "Empty"}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-5 h-5 rounded border border-[#ffb700]/80 bg-[#0d0901] flex items-center justify-center text-[11px] text-[#ffb700] font-bold shrink-0">
                                  {toolEntry ? toolEntry.icon : "⬚"}
                                </div>
                                <div className="flex flex-col truncate">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-[var(--term-green-text-dim)] font-mono">CH{socketNum}:</span>
                                    <span className="text-[11px] font-bold text-[#ffb700] truncate">
                                      {toolEntry ? toolEntry.plainName : "EMPTY"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[9px] text-[var(--term-green-text-bright)] font-mono shrink-0">
                                {isSelected ? "[SELECTED]" : "CHANGE"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Briefing Strip (Constant: SECTION3_BRIEFING - No tool names) */}
                    <div className="w-full px-3 py-1 bg-[#020a04] border border-[var(--term-outline-green)]/70 rounded text-[11.5px] text-[var(--term-green-text-bright)] flex items-center justify-center text-center font-mono shrink-0 shadow-sm tracking-wide">
                      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 mr-2" fill="none" role="img" aria-hidden="true">
                        <circle cx="6" cy="6" r="4.5" stroke="#ffb700" strokeWidth="1.3" fill="#140d02" />
                        <circle cx="6" cy="6" r="1.8" fill="#ffb700" />
                      </svg>
                      <span>{SECTION3_BRIEFING}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 ml-2" fill="none" role="img" aria-hidden="true">
                        <circle cx="6" cy="6" r="4.5" stroke="#ffb700" strokeWidth="1.3" fill="#140d02" />
                        <circle cx="6" cy="6" r="1.8" fill="#ffb700" />
                      </svg>
                    </div>

                    {/* Lower Area: 2D Evidence Map & Scatter Plot */}
                    {(() => {
                      const validIds: MeasurementId[] = ["brightness", "beat", "colour", "jumpiness"];
                      const rawCh1 = section3State.channels[0];
                      const rawCh2 = section3State.channels[1];
                      const ch1 = rawCh1 && validIds.includes(rawCh1) ? rawCh1 : null;
                      const ch2 = rawCh2 && validIds.includes(rawCh2) ? rawCh2 : null;

                      if (!ch1 && !ch2) {
                        return (
                          <div className="flex-1 bg-[#010703] border border-[var(--term-outline-green)]/60 rounded p-4 flex flex-col items-center justify-center text-center min-h-[300px]">
                            <div className="text-[17px] text-[var(--term-green-text-bright)] font-bold mb-2 tracking-wide">
                              Install a tool to see the map.
                            </div>
                            <div className="text-[13px] text-[var(--term-green-text-dim)]">
                              Select socket CH1 or CH2 above and press [E] to install a measurement tool.
                            </div>
                          </div>
                        );
                      }

                      const modX = ch1 ? getMeasurementById(ch1) : getMeasurementById(ch2!);
                      const modY = ch1 && ch2 ? getMeasurementById(ch2) : null;
                      const entryX = getGlossaryEntry(modX.id);
                      const entryY = modY ? getGlossaryEntry(modY.id) : null;

                      // Full candidate records for unknown signals
                      const candidates = createCandidates();
                      const layout = computeMapLayout(records, candidates, modX, modY);
                      const { placedKnown, placedCands, countBadges, plotBounds } = layout;

                      // Focusable items order: known scans first, then unknown signals
                      const allFocusable = [
                        ...placedKnown.map((k, i) => ({ type: "known" as const, index: i, item: k })),
                        ...placedCands.map((u, i) => ({ type: "unknown" as const, index: i, item: u })),
                      ];
                      const activeFocus = allFocusable[focusedMapDotIdx % allFocusable.length];

                      return (
                        <div className="flex-1 bg-[#010703] border border-[var(--term-outline-green)]/80 rounded p-1.5 flex flex-col justify-between overflow-hidden relative select-none font-mono min-h-0">
                          {/* SVG Canvas Plot Area (Square, at least 420px on 1280x720) */}
                          <div className="relative flex-1 w-full flex items-center justify-center min-h-[420px] overflow-visible">
                            <svg
                              viewBox="-80 15 560 560"
                              style={{ width: "420px", height: "420px" }}
                              className="aspect-square max-h-full overflow-visible"
                              role="img"
                              aria-label={modY ? `Evidence map scatter: X ${entryX.plainName}, Y ${entryY?.plainName}` : `Evidence map number line: ${entryX.plainName}`}
                            >
                              {/* Background Grid Lines & Light Crosshairs */}
                              <rect x="60" y="60" width="380" height="380" fill="#020904" stroke="var(--term-outline-green)" strokeWidth="1.2" opacity="0.6" />
                              
                              {/* Diagonal Reference line if same tool in both sockets */}
                              {modY && modX.id === modY.id && (
                                <line x1="60" y1="440" x2="440" y2="60" stroke="#ffb700" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
                              )}

                              {/* Round Ticks: 0, 0.25, 0.5, 0.75, 1 (Axes fit data with 10% margin, ticks stay round, 14px min text) */}
                              {[0, 0.25, 0.5, 0.75, 1].map((tickVal) => {
                                const pxX = 60 + ((tickVal - plotBounds.plotMinX) / (plotBounds.plotMaxX - plotBounds.plotMinX)) * 380;
                                const pxY = 440 - ((tickVal - plotBounds.plotMinY) / (plotBounds.plotMaxY - plotBounds.plotMinY)) * 380;
                                const tickStr = tickVal === 0 ? "0" : tickVal === 1 ? "1" : tickVal.toString();

                                return (
                                  <g key={`round-tick-${tickVal}`}>
                                    {/* X Tick (if within plot bounds) */}
                                    {pxX >= 58 && pxX <= 442 && (
                                      <>
                                        <line x1={pxX} y1="440" x2={pxX} y2="447" stroke="var(--term-outline-green)" strokeWidth="1.5" />
                                        <text
                                          x={pxX}
                                          y="464"
                                          fill="var(--term-green-text-bright)"
                                          fontSize="14"
                                          fontFamily="monospace"
                                          fontWeight="bold"
                                          textAnchor="middle"
                                        >
                                          {tickStr}
                                        </text>
                                        <line x1={pxX} y1="60" x2={pxX} y2="440" stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.25" />
                                      </>
                                    )}

                                    {/* Y Tick if 2D (if within plot bounds) */}
                                    {modY && pxY >= 58 && pxY <= 442 && (
                                      <>
                                        <line x1="53" y1={pxY} x2="60" y2={pxY} stroke="var(--term-outline-green)" strokeWidth="1.5" />
                                        <text
                                          x="48"
                                          y={pxY + 5}
                                          fill="var(--term-green-text-bright)"
                                          fontSize="14"
                                          fontFamily="monospace"
                                          fontWeight="bold"
                                          textAnchor="end"
                                        >
                                          {tickStr}
                                        </text>
                                        <line x1="60" y1={pxY} x2="440" y2={pxY} stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.25" />
                                      </>
                                    )}
                                  </g>
                                );
                              })}

                              {/* Axis Words at both ends of each axis with direction arrow (Neutral glossary labels) */}
                              {/* X Axis Words: low at 60, high at 440 */}
                              <text
                                x="60"
                                y="488"
                                fill="var(--term-green-text-dim)"
                                fontSize="14"
                                fontFamily="monospace"
                                textAnchor="start"
                              >
                                {AXIS_WORDS[modX.id].low}
                              </text>
                              <text
                                x="440"
                                y="488"
                                fill="var(--term-green-text-dim)"
                                fontSize="14"
                                fontFamily="monospace"
                                textAnchor="end"
                              >
                                {AXIS_WORDS[modX.id].high} ➔
                              </text>

                              {/* X Axis Title (18px, bold, prominent) */}
                              <text
                                x="250"
                                y="518"
                                fill="var(--term-green-text-bright)"
                                fontSize="18"
                                fontFamily="monospace"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {entryX.icon} {entryX.plainName}
                              </text>

                              {/* Y Axis Words & Title if 2D (Separated into outer column at X = -36, parallel to Y axis, ZERO overlap) */}
                              {modY && (
                                <>
                                  {/* Low End Word: at bottom of Y axis */}
                                  <text
                                    x="-435"
                                    y="-36"
                                    transform="rotate(-90)"
                                    fill="var(--term-green-text-dim)"
                                    fontSize="13"
                                    fontFamily="monospace"
                                    textAnchor="start"
                                  >
                                    {AXIS_WORDS[modY.id].low}
                                  </text>

                                  {/* Y Axis Title: centered in middle of Y axis */}
                                  <text
                                    x="-250"
                                    y="-36"
                                    transform="rotate(-90)"
                                    fill="var(--term-green-text-bright)"
                                    fontSize="18"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {entryY?.icon} {entryY?.plainName}
                                  </text>

                                  {/* High End Word: at top of Y axis */}
                                  <text
                                    x="-65"
                                    y="-36"
                                    transform="rotate(-90)"
                                    fill="var(--term-green-text-dim)"
                                    fontSize="13"
                                    fontFamily="monospace"
                                    textAnchor="end"
                                  >
                                    {AXIS_WORDS[modY.id].high} ▲
                                  </text>
                                </>
                              )}

                              {/* ── Layer 1: Known Scans (Class-shaped filled amber dots, 16-18px) ── */}
                              {placedKnown.map((k, kIdx) => {
                                const rec = records.find((r) => r.scanId === k.id);
                                const cInfo = rec ? getClassShape(rec.category, rec.kind) : { shape: "●", word: "UNKNOWN", shapeType: "circle", name: "UNKNOWN" };
                                const isFocused = activeFocus?.type === "known" && activeFocus.index === kIdx;
                                const rx = k.cx;
                                const ry = k.cy;
                                const r1Str = formatReadingInWordsAndNumbers(modX.id, k.rawX);
                                const r2Str = modY && k.rawY !== undefined ? formatReadingInWordsAndNumbers(modY.id, k.rawY) : undefined;

                                return (
                                  <g
                                    key={k.id}
                                    style={{
                                      transition: reducedMotion ? "none" : "transform 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                    }}
                                    className="cursor-pointer"
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredMapDot({
                                        id: k.id,
                                        type: "known",
                                        name: `${k.targetName} (${cInfo.name})`,
                                        subtitle: `${cInfo.shape} ${cInfo.word}`,
                                        reading1: r2Str ? `${r1Str}, ${r2Str}` : r1Str,
                                        reading2: undefined,
                                        x: rect.x + rect.width / 2,
                                        y: rect.y,
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredMapDot(null)}
                                    onClick={() => {
                                      setFocusedMapDotIdx(kIdx);
                                      terminalSound.playKeyTick();
                                    }}
                                  >
                                    {/* Focus Ring */}
                                    {isFocused && (
                                      <circle
                                        cx={rx}
                                        cy={ry}
                                        r="13"
                                        fill="none"
                                        stroke="#2ee85c"
                                        strokeWidth="2"
                                        strokeDasharray="2 2"
                                        className={reducedMotion ? "" : "animate-spin"}
                                        style={{ transformOrigin: `${rx}px ${ry}px` }}
                                      />
                                    )}

                                    {/* Class Shapes (16-18px bounding box) */}
                                    {cInfo.shapeType === "circle" && (
                                      <circle
                                        cx={rx}
                                        cy={ry}
                                        r="8"
                                        fill="#ffb700"
                                        stroke="#1a1102"
                                        strokeWidth="1.5"
                                        filter="drop-shadow(0 0 3px rgba(255,183,0,0.7))"
                                      />
                                    )}
                                    {cInfo.shapeType === "square" && (
                                      <rect
                                        x={rx - 8}
                                        y={ry - 8}
                                        width="16"
                                        height="16"
                                        rx="1.5"
                                        fill="#ffb700"
                                        stroke="#1a1102"
                                        strokeWidth="1.5"
                                        filter="drop-shadow(0 0 3px rgba(255,183,0,0.7))"
                                      />
                                    )}
                                    {cInfo.shapeType === "triangle" && (
                                      <polygon
                                        points={`${rx},${ry - 9} ${rx + 9},${ry + 7} ${rx - 9},${ry + 7}`}
                                        fill="#ffb700"
                                        stroke="#1a1102"
                                        strokeWidth="1.5"
                                        filter="drop-shadow(0 0 3px rgba(255,183,0,0.7))"
                                      />
                                    )}
                                  </g>
                                );
                              })}

                              {/* ── Layer 2: Count Badges for dense stacked clusters (> 4 stacked) ── */}
                              {countBadges.filter((b) => b.count > 4).map((b) => (
                                <g key={b.id} pointerEvents="none">
                                  <rect
                                    x={b.bbox.x}
                                    y={b.bbox.y}
                                    width={b.bbox.w}
                                    height={b.bbox.h}
                                    rx="2"
                                    fill="#041206"
                                    stroke="#ffb700"
                                    strokeWidth="1"
                                    opacity="0.9"
                                  />
                                  <text
                                    x={b.cx}
                                    y={b.cy + 4}
                                    fill="#ffb700"
                                    fontSize="10"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {b.text}
                                  </text>
                                </g>
                              ))}

                              {/* ── Layer 3: Unknown Signals (Thick rings with NUMBER 1 to 6 inside, ALWAYS ON TOP, IDENTICAL STYLING) ── */}
                              {placedCands.map((u, uIdx) => {
                                const isFocused = activeFocus?.type === "unknown" && activeFocus.index === uIdx;
                                const r1Str = formatReadingInWordsAndNumbers(modX.id, u.rawX);
                                const r2Str = modY && u.rawY !== undefined ? formatReadingInWordsAndNumbers(modY.id, u.rawY) : undefined;
                                const ux = u.cx;
                                const uy = u.cy;

                                return (
                                  <g
                                    key={u.id}
                                    style={{
                                      transition: reducedMotion ? "none" : "transform 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                    }}
                                    className="cursor-pointer"
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredMapDot({
                                        id: u.id,
                                        type: "unknown",
                                        name: `Unknown signal ${u.number}`,
                                        subtitle: `SIGNAL ${u.number}`,
                                        reading1: r2Str ? `${r1Str}, ${r2Str}` : r1Str,
                                        reading2: undefined,
                                        x: rect.x + rect.width / 2,
                                        y: rect.y,
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredMapDot(null)}
                                    onClick={() => {
                                      setFocusedMapDotIdx(placedKnown.length + uIdx);
                                      terminalSound.playKeyTick();
                                    }}
                                  >
                                    {/* Focus Ring */}
                                    {isFocused && (
                                      <circle
                                        cx={ux}
                                        cy={uy}
                                        r="20"
                                        fill="none"
                                        stroke="#2ee85c"
                                        strokeWidth="2"
                                        strokeDasharray="3 3"
                                        className={reducedMotion ? "" : "animate-spin"}
                                        style={{ transformOrigin: `${ux}px ${uy}px` }}
                                      />
                                    )}

                                    {/* Ring Body: Outer ring with Number inside (Identical styling for ALL 6 rings, zero bias) */}
                                    <circle
                                      cx={ux}
                                      cy={uy}
                                      r="14"
                                      fill="#051608"
                                      stroke="#ffb700"
                                      strokeWidth="2.8"
                                      filter="drop-shadow(0 0 5px rgba(255,183,0,0.85))"
                                    />
                                    {/* Number Inside */}
                                    <text
                                      x={ux}
                                      y={uy + 4.5}
                                      fill="#ffb700"
                                      fontSize="13"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                      pointerEvents="none"
                                    >
                                      {u.number}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>

                            {/* Floating Tooltip upon Dot Hover */}
                            {hoveredMapDot && (
                              <div
                                className="absolute pointer-events-none z-30 bg-[#020a04] border border-[#ffb700] p-2.5 rounded shadow-2xl text-left text-xs min-w-[190px]"
                                style={{
                                  left: "50%",
                                  bottom: "12px",
                                  transform: "translateX(-50%)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-3 border-b border-[var(--term-outline-green)]/40 pb-1 mb-1">
                                  <span className="font-bold text-[#ffb700] text-[13px]">
                                    {hoveredMapDot.name}
                                  </span>
                                  <span className="text-[var(--term-green-text-dim)] font-mono text-[11px]">
                                    {hoveredMapDot.subtitle}
                                  </span>
                                </div>
                                <div className="text-[var(--term-green-text-bright)] text-[12px] font-mono">
                                  <span>{hoveredMapDot.name}: {hoveredMapDot.reading1}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── Bottom Legend ── */}
                          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#031106] border-t border-[var(--term-outline-green)]/50 text-[12px] text-[var(--term-green-text)] shrink-0 gap-3">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="font-bold text-[var(--term-green-text-bright)]">LEGEND:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#ffb700]">●</span>
                                <span>Black hole</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#ffb700]">■</span>
                                <span>Planet</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#ffb700]">▲</span>
                                <span>Star</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full border-2 border-[#ffb700] inline-flex items-center justify-center text-[10px] text-[#ffb700] font-bold">#</span>
                                <span className="font-bold text-[#ffb700]">Unknown signal (1–6)</span>
                              </div>
                            </div>

                            {/* Active Dot Aria / Focus Announcement Box */}
                            {activeFocus && (
                              <div className="text-[12px] text-[var(--term-green-text-bright)]">
                                {activeFocus.type === "known" ? (
                                  <span>
                                    FOCUS: {activeFocus.item.targetName} ({activeFocus.item.kind}): {formatReadingInWordsAndNumbers(modX.id, activeFocus.item.rawX)}
                                    {modY && activeFocus.item.rawY !== undefined && `, ${formatReadingInWordsAndNumbers(modY.id, activeFocus.item.rawY)}`}
                                  </span>
                                ) : (
                                  <span>
                                    FOCUS: Unknown signal {activeFocus.item.number}: {formatReadingInWordsAndNumbers(modX.id, activeFocus.item.rawX)}
                                    {modY && activeFocus.item.rawY !== undefined && `, ${formatReadingInWordsAndNumbers(modY.id, activeFocus.item.rawY)}`}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Tool Selection Dialog Modal ────────────────────────────── */}
                    {isToolPickerOpen && (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        role="dialog"
                        aria-labelledby="tool-picker-title"
                        aria-modal="true"
                      >
                        <div className="w-full max-w-[620px] bg-[#020e04] border-2 border-[#ffb700] rounded p-4 font-mono shadow-[0_0_24px_rgba(255,183,0,0.35)] flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-[var(--term-outline-green)] pb-2">
                            <span id="tool-picker-title" className="text-[16px] font-bold text-[#ffb700]">
                              INSTALL TOOL // PORT CH{activeSocket + 1}
                            </span>
                            <span className="text-[12px] text-[var(--term-green-text-dim)]">
                              [Q] BACK / CANCEL
                            </span>
                          </div>

                          <div className="text-[13px] text-[var(--term-green-text-bright)]">
                            Select one of the 7 measurement tools to install into socket CH{activeSocket + 1}:
                          </div>

                          {/* List of 7 tools */}
                          <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                            {SHELF_TOOLS.map((tool, idx) => {
                              const entry = getGlossaryEntry(tool.id);
                              const isHighlighted = pickerToolIdx === idx;
                              const isInstalledHere = section3State.channels[activeSocket] === tool.id;

                              return (
                                <div
                                  key={tool.id}
                                  onClick={() => {
                                    setPickerToolIdx(idx);
                                    const chosenTool = tool.id;
                                    const currentChannels = section3State.channels;
                                    const nextCh1 = activeSocket === 0 ? chosenTool : currentChannels[0];
                                    const nextCh2 = activeSocket === 1 ? chosenTool : currentChannels[1];
                                    
                                    if (nextCh1 && nextCh2) {
                                      const modA = getMeasurementById(nextCh1);
                                      const modB = getMeasurementById(nextCh2);
                                      evaluatePair(modA, modB, records, createCandidates());
                                    }

                                    section3Store.setChannels(nextCh1, nextCh2);
                                    terminalSound.playToolClunk(chosenTool);
                                    terminalSound.playSnapTick();

                                    setLatchingSocket(activeSocket);
                                    if (latchAnimTimerRef.current !== null) clearTimeout(latchAnimTimerRef.current);
                                    if (!reducedMotion) {
                                      latchAnimTimerRef.current = window.setTimeout(() => {
                                        setLatchingSocket(null);
                                        latchAnimTimerRef.current = null;
                                      }, 400) as unknown as number;
                                    } else {
                                      setLatchingSocket(null);
                                    }

                                    setIsToolPickerOpen(false);
                                  }}
                                  onMouseEnter={() => setPickerToolIdx(idx)}
                                  className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isHighlighted
                                      ? "border-[#ffb700] bg-[#1a1102] text-[#ffb700] shadow-[0_0_8px_rgba(255,183,0,0.3)]"
                                      : "border-[var(--term-outline-green)]/60 bg-[#031106] hover:border-[var(--term-outline-green)] text-[var(--term-green-text-bright)]"
                                  }`}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${entry.plainName}. ${entry.oneLiner}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded border border-current flex items-center justify-center font-bold text-[14px]">
                                      {entry.icon}
                                    </span>
                                    <div className="flex flex-col">
                                      <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-[15px]">{entry.plainName}</span>
                                        <span className="text-[11px] opacity-75">[{entry.shortName}]</span>
                                      </div>
                                      <span className="text-[12px] opacity-80">{entry.oneLiner}</span>
                                    </div>
                                  </div>

                                  <div className="text-[12px] font-mono shrink-0">
                                    {isInstalledHere ? (
                                      <span className="px-2 py-0.5 rounded bg-[#ffb700]/20 text-[#ffb700] border border-[#ffb700]/50 font-bold">
                                        CURRENT
                                      </span>
                                    ) : (
                                      <span className="opacity-60">[E] INSTALL</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Hover ToolHint Box */}
                          <div className="mt-1 p-2 rounded bg-[#010602] border border-[var(--term-outline-green)]/60 text-[12px] text-[var(--term-green-text-dim)]">
                            <span className="font-bold text-[var(--term-green-text-bright)]">TOOL HINT: </span>
                            <span>{getGlossaryEntry(SHELF_TOOLS[pickerToolIdx].id).hoverText}</span>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 border-t border-[var(--term-outline-green)]/40">
                            <button
                              type="button"
                              onClick={() => {
                                terminalSound.playBackBlip();
                                setIsToolPickerOpen(false);
                              }}
                              className="px-3 py-1 rounded border border-[var(--term-outline-green)] text-[var(--term-green-text)] hover:bg-[#041608] text-[13px]"
                            >
                              CANCEL [Q]
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Footer Bar */}
          <footer className="terminal-footer h-[32px] bg-[#020a04] border-t border-[var(--term-outline-green)] flex items-center justify-between px-4 text-[12px] text-[var(--term-green-text)] select-none">
            <div className="flex items-center gap-2">
              <span className="text-[var(--term-green-text-bright)]">▲▼</span>
              <span>UP / DOWN HIGHLIGHT</span>
              <span className="text-[var(--term-outline-green)]/50">.....</span>
              <span className="text-[var(--term-green-text-bright)]">E</span>
              <span>SELECT / APPLY</span>
              <span className="text-[var(--term-outline-green)]/50">.....</span>
              <span className="text-[var(--term-green-text-bright)]">H</span>
              <span>REPLAY ANIMATION</span>
              <span className="text-[var(--term-outline-green)]/50">.....</span>
              <span className="text-[var(--term-green-text-bright)]">M</span>
              <span>MEASURE ALL</span>
              <span className="text-[var(--term-outline-green)]/50">.....</span>
              <span className="text-[var(--term-green-text-bright)]">C</span>
              <span>COMPARE</span>
              {activeFolder === "notebook" && notebookView === "compare" && (
                <>
                  <span className="text-[var(--term-outline-green)]/50">.....</span>
                  <span className="text-[var(--term-green-text-bright)]">U</span>
                  <span>TOGGLE UNKNOWNS</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[var(--term-green-text-bright)]">Q</span>
              <span>BACK / EXIT</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Component: WaveformWithMarks (Renders 64-point curve + Tool Snapping Marks)
// ─────────────────────────────────────────────────────────────────────────────

interface WaveformWithMarksProps {
  record: SectionThreeRecord;
  toolId: MeasurementId | null;
  animNonce: number;
  reducedMotion: boolean;
}

function WaveformWithMarks({
  record,
  toolId,
  animNonce,
  reducedMotion,
}: WaveformWithMarksProps) {
  const signal = record.signal;
  const width = 640;
  const height = 180;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 18;
  const padBottom = 18;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Coordinate mapping functions
  const toX = (i: number) => padLeft + (i / 63) * plotW;
  const toY = (v: number) => padTop + (1 - Math.max(0, Math.min(1, v))) * plotH;

  // Compute tool marks if a tool is active
  const toolMarks = useMemo(() => {
    if (!toolId) return null;
    const mod = getMeasurementById(toolId);
    return {
      id: toolId,
      value: mod.compute(record),
      marks: mod.previewMarks(record),
    };
  }, [toolId, record, animNonce]);

  return (
    <svg
      key={`curve-${record.scanId}-${toolId || "none"}-${animNonce}`}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full select-none"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Glow Filter */}
        <filter id="benchGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Double-ended dimension arrow markers */}
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ffb700" />
        </marker>
      </defs>

      {/* Faint Horizontal Grid Lines */}
      <line x1={padLeft} y1={toY(1.0)} x2={width - padRight} y2={toY(1.0)} stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.3" />
      <line x1={padLeft} y1={toY(0.5)} x2={width - padRight} y2={toY(0.5)} stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.3" />
      <line x1={padLeft} y1={toY(0.0)} x2={width - padRight} y2={toY(0.0)} stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.3" />

      {/* Faint Vertical Grid Lines */}
      <line x1={toX(16)} y1={padTop} x2={toX(16)} y2={padTop + plotH} stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.25" />
      <line x1={toX(32)} y1={padTop} x2={toX(32)} y2={padTop + plotH} stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.25" />
      <line x1={toX(48)} y1={padTop} x2={toX(48)} y2={padTop + plotH} stroke="var(--term-outline-green)" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.25" />

      {/* Area Fill */}
      <path
        d={pointsToAreaPath(signal, width, height, padLeft, padRight, padTop, padBottom)}
        fill="var(--term-outline-green)"
        opacity="0.12"
      />

      {/* Main Phosphor Waveform Path */}
      <path
        d={pointsToLinePath(signal, width, height, padLeft, padRight, padTop, padBottom)}
        fill="none"
        stroke="var(--term-green-text-bright)"
        strokeWidth="2.5"
        className="term-glow"
      />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TOOL 1: BRIGHTNESS (Amber Horizontal Level Line)                   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {toolMarks && toolMarks.id === "brightness" && (() => {
        const meanY = toY(toolMarks.value);

        return (
          <g data-testid="tool-marks-brightness" className={reducedMotion ? "" : "bench-anim-sweep"}>
            {/* Level band fill */}
            <rect
              x={padLeft}
              y={meanY}
              width={plotW}
              height={padTop + plotH - meanY}
              fill="#ffb700"
              opacity="0.08"
            />
            {/* Mean Horizontal Level Line in Amber */}
            <line
              x1={padLeft}
              y1={meanY}
              x2={padLeft + plotW}
              y2={meanY}
              stroke="#ffb700"
              strokeWidth="2.4"
              strokeDasharray="6,3"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,183,0,0.6))" }}
            />
            {/* Axis Indicator Tick */}
            <line x1={padLeft - 6} y1={meanY} x2={padLeft} y2={meanY} stroke="#ffb700" strokeWidth="2.5" />
            <text x={padLeft - 8} y={meanY + 3} textAnchor="end" fill="#ffb700" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
              {toolMarks.value.toFixed(2)}
            </text>
          </g>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TOOL 2: JUMPINESS (High-Visibility Amber Jump Ticks)               */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {toolMarks && toolMarks.id === "jumpiness" && (() => {
        // Find top jump moments
        const diffs: Array<{ idx: number; diff: number; y1: number; y2: number }> = [];
        for (let i = 1; i < signal.length; i++) {
          diffs.push({ idx: i, diff: Math.abs(signal[i] - signal[i - 1]), y1: signal[i - 1], y2: signal[i] });
        }
        diffs.sort((a, b) => b.diff - a.diff);
        const topJumps = diffs.slice(0, 6);

        return (
          <g data-testid="tool-marks-jumpiness">
            {topJumps.map((jump, jIdx) => {
              const jx = toX(jump.idx);
              const jy1 = toY(jump.y1);
              const jy2 = toY(jump.y2);
              const delay = reducedMotion ? 0 : jIdx * 30;

              return (
                <g
                  key={`jump-${jump.idx}`}
                  className={reducedMotion ? "" : "bench-anim-tick"}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  {/* Vertical Jump Tick Line in Vivid Amber */}
                  <line
                    x1={jx}
                    y1={jy1}
                    x2={jx}
                    y2={jy2}
                    stroke="#ffb700"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 6px rgba(255,183,0,0.6))" }}
                  />
                  {/* Horizontal Cross-Tick Marker */}
                  <line
                    x1={jx - 5}
                    y1={(jy1 + jy2) / 2}
                    x2={jx + 5}
                    y2={(jy1 + jy2) / 2}
                    stroke="#ffb700"
                    strokeWidth="2"
                  />
                  {/* Spark Center Dot */}
                  <circle cx={jx} cy={(jy1 + jy2) / 2} r="2.5" fill="#ffffff" stroke="#ffb700" strokeWidth="1" />
                </g>
              );
            })}
          </g>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TOOL 3: BEAT (Vivid Amber Interval Ruler & Arrows)                 */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {toolMarks && toolMarks.id === "beat" && (() => {
        const beatVal = toolMarks.value;

        if (beatVal <= 0.05) {
          return (
            <g data-testid="tool-marks-beat">
              <line
                x1={padLeft}
                y1={padTop + plotH / 2}
                x2={padLeft + plotW}
                y2={padTop + plotH / 2}
                stroke="#ffb700"
                strokeWidth="1.5"
                strokeDasharray="6,4"
                opacity="0.6"
              />
              <text x={padLeft + plotW / 2} y={padTop + plotH / 2 - 6} textAnchor="middle" fill="#ffb700" fontSize="10" fontWeight="bold" fontFamily="monospace">
                NO STEADY BEAT DETECTED
              </text>
            </g>
          );
        }

        const xStart = toX(8);
        const xStep = (8 / 63) * plotW;
        const xEnd = Math.min(width - padRight, xStart + xStep);
        const rulerY = padTop + plotH - 10;

        return (
          <g data-testid="tool-marks-beat" className={reducedMotion ? "" : "bench-anim-sweep"}>
            <line
              x1={xStart}
              y1={rulerY}
              x2={xEnd}
              y2={rulerY}
              stroke="#ffb700"
              strokeWidth="2.2"
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
            />
            <line x1={xStart} y1={rulerY - 8} x2={xStart} y2={rulerY + 8} stroke="#ffb700" strokeWidth="2.2" />
            <line x1={xEnd} y1={rulerY - 8} x2={xEnd} y2={rulerY + 8} stroke="#ffb700" strokeWidth="2.2" />
            <text x={(xStart + xEnd) / 2} y={rulerY - 6} textAnchor="middle" fill="#ffb700" fontSize="10" fontWeight="bold" fontFamily="monospace">
              BEAT {beatVal.toFixed(2)}
            </text>
          </g>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TOOL 4: COLOUR PROBE (Dual-Spectra Chamber with High Contrast)     */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {toolMarks && toolMarks.id === "colour" && (() => {
        const [r, g] = record.color;

        const boxX = width - padRight - 85;
        const boxY = padTop + 8;
        const boxW = 80;
        const boxH = plotH - 16;

        const maxBand = Math.max(r, g, 0.01);
        const rH = Math.min(boxH - 32, (r / (maxBand * 1.2)) * (boxH - 32));
        const gH = Math.min(boxH - 32, (g / (maxBand * 1.2)) * (boxH - 32));
        const leanAngle = r > g ? -24 : g > r ? 24 : 0;

        return (
          <g data-testid="tool-marks-colour">
            <rect
              x={boxX}
              y={boxY}
              width={boxW}
              height={boxH}
              rx="3"
              fill="#020e04"
              stroke="var(--term-outline-green)"
              strokeWidth="1.6"
            />
            <text x={boxX + boxW / 2} y={boxY + 12} textAnchor="middle" fill="var(--term-green-text-bright)" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
              DUAL SPECTRA
            </text>

            <g className={reducedMotion ? "" : "bench-anim-bar"}>
              <rect
                x={boxX + 10}
                y={boxY + boxH - 14 - rH}
                width="22"
                height={rH}
                fill="#f59e0b"
                opacity="0.95"
                stroke="#d97706"
                strokeWidth="1"
              />
              <text x={boxX + 21} y={boxY + boxH - 3} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">
                RED
              </text>
            </g>

            <g className={reducedMotion ? "" : "bench-anim-bar"}>
              <rect
                x={boxX + 48}
                y={boxY + boxH - 14 - gH}
                width="22"
                height={gH}
                fill="#10b981"
                opacity="0.95"
                stroke="#059669"
                strokeWidth="1"
              />
              <text x={boxX + 59} y={boxY + boxH - 3} textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="monospace">
                GREEN
              </text>
            </g>

            <g transform={`translate(${boxX + boxW / 2}, ${boxY + 28}) rotate(${leanAngle})`}>
              <line x1="0" y1="8" x2="0" y2="-8" stroke="#fde047" strokeWidth="2.6" markerEnd="url(#arrow)" />
            </g>
          </g>
        );
      })()}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis Words & Descriptors for Evidence Map (Words + Numbers)
// ─────────────────────────────────────────────────────────────────────────────
const AXIS_WORDS: Record<MeasurementId, { low: string; high: string }> = {
  brightness: { low: "faint", high: "bright" },
  beat: { low: "no beat", high: "perfect beat" },
  colour: { low: "red", high: "blue" },
  jumpiness: { low: "smooth", high: "jumpy" },
};

function formatReadingInWordsAndNumbers(toolId: MeasurementId, value: number): string {
  const words = AXIS_WORDS[toolId];
  if (!words) return value.toFixed(2);
  const word = value < 0.5 ? words.low : words.high;
  return `${word} ${value.toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Format Reading Values for Displays & Tables
// ─────────────────────────────────────────────────────────────────────────────
function formatReadingValue(toolId: MeasurementId, value: unknown): string {
  if (typeof value !== "number") return "OK";
  switch (toolId) {
    case "brightness":
    case "beat":
    case "jumpiness":
      return value.toFixed(3);
    case "colour":
      return value.toFixed(2);
    default:
      return `${value}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Category Shapes & Words (Never colour-only: shape + word)
// ─────────────────────────────────────────────────────────────────────────────
function getClassShape(category?: string, kind?: string) {
  const c = (category || kind || "").toLowerCase();
  if (c.includes("bh") || c.includes("black")) {
    return { shape: "●", word: "BLACK HOLE", name: "BLACK HOLE", key: "black_hole", shapeType: "circle" as const };
  }
  if (c.includes("pl") || c.includes("planet")) {
    return { shape: "■", word: "PLANET", name: "PLANET", key: "planet", shapeType: "square" as const };
  }
  return { shape: "▲", word: "STARS", name: "STARS", key: "stars", shapeType: "triangle" as const };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Render Scanned Celestial Image Photo for EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────
function renderCelestialImage(record: SectionThreeRecord & { imageDataUrl?: string }, reducedMotion = false) {
  let imgSrc = record.imageDataUrl || record.thumbnail;
  if (!imgSrc && typeof document !== "undefined" && record.category) {
    imgSrc = generateSampleSnapshot(record.category, record.targetName);
  }
  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={record.targetName}
        className="w-full h-full object-cover rounded border border-[var(--term-outline-green)]"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#010703] rounded border border-[var(--term-outline-green)] font-mono text-[11px] text-[var(--term-green-text-dim)]">
      [OPTICAL SENSOR ACQUIRING]
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Physical Tool Equipment SVG Phosphor Line-Art
// ─────────────────────────────────────────────────────────────────────────────
export function renderShelfToolArt(toolId: MeasurementId) {
  const stroke = "var(--term-green-text)";
  const strokeBright = "var(--term-green-text-bright)";

  switch (toolId) {
    case "brightness":
      return (
        <g stroke={stroke} strokeWidth="1.5" fill="none">
          <rect x="14" y="21" width="42" height="8" rx="2" stroke={strokeBright} strokeWidth="1.8" />
          <line x1="8" y1="25" x2="62" y2="25" stroke={stroke} strokeWidth="1" strokeDasharray="3,2" />
          <circle cx="35" cy="25" r="2.5" fill={strokeBright} />
        </g>
      );
    case "beat":
      return (
        <g stroke={stroke} strokeWidth="1.5" fill="none">
          <circle cx="35" cy="10" r="3.5" stroke={strokeBright} strokeWidth="1.8" />
          <line x1="35" y1="13" x2="20" y2="44" stroke={stroke} strokeWidth="1.8" />
          <line x1="35" y1="13" x2="50" y2="44" stroke={stroke} strokeWidth="1.8" />
          <path d="M 24 32 A 16 16 0 0 1 46 32" stroke={strokeBright} strokeWidth="1.2" strokeDasharray="2,2" />
        </g>
      );
    case "colour":
      return (
        <g stroke={stroke} strokeWidth="1.5" fill="none">
          <rect x="18" y="12" width="14" height="26" rx="2" stroke={strokeBright} strokeWidth="1.6" />
          <rect x="38" y="12" width="14" height="26" rx="2" stroke={strokeBright} strokeWidth="1.6" />
          <line x1="25" y1="38" x2="25" y2="46" stroke={stroke} strokeWidth="1.5" />
          <line x1="45" y1="38" x2="45" y2="46" stroke={stroke} strokeWidth="1.5" />
          <circle cx="25" cy="25" r="2.5" fill={stroke} />
          <circle cx="45" cy="25" r="2.5" fill={stroke} />
        </g>
      );
    case "jumpiness":
      return (
        <g stroke={stroke} strokeWidth="1.5" fill="none">
          <rect x="15" y="10" width="40" height="30" rx="2" stroke={strokeBright} strokeWidth="1.8" />
          <path d="M 23 25 L 31 16 L 39 34 L 47 25" stroke={stroke} strokeWidth="1.8" />
          <circle cx="23" cy="25" r="1.5" fill={stroke} />
          <circle cx="47" cy="25" r="1.5" fill={stroke} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * Convert 64 signal values into an SVG polyline string with responsive padding.
 */
function pointsToLinePath(
  signal: number[],
  totalWidth: number,
  totalHeight: number,
  padLeft: number,
  padRight: number,
  padTop: number,
  padBottom: number
): string {
  const n = signal.length;
  const plotW = totalWidth - padLeft - padRight;
  const plotH = totalHeight - padTop - padBottom;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = padLeft + (i / (n - 1)) * plotW;
    const y = padTop + plotH * (1 - Math.max(0, Math.min(1, signal[i])));
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/**
 * Convert 64 signal values into a closed SVG area path string with responsive padding.
 */
function pointsToAreaPath(
  signal: number[],
  totalWidth: number,
  totalHeight: number,
  padLeft: number,
  padRight: number,
  padTop: number,
  padBottom: number
): string {
  const lineD = pointsToLinePath(signal, totalWidth, totalHeight, padLeft, padRight, padTop, padBottom);
  const bottomY = totalHeight - padBottom;
  const endX = totalWidth - padRight;
  return `${lineD} L ${endX.toFixed(1)} ${bottomY.toFixed(1)} L ${padLeft.toFixed(1)} ${bottomY.toFixed(1)} Z`;
}
