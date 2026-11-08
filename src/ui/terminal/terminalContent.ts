/**
 * terminalContent.ts — Data-driven original content for Pendrive Terminal
 * =======================================================================
 * Adheres strictly to the CONTENT RULE:
 * Replicate layout, colors, shapes, and feel only.
 * All text, narrative names, and document files are 100% original.
 */

export interface TerminalFile {
  id: string;
  filename: string;
  title: string;
  author: string;
  subhead: string;
  date: string;
  bodyParagraphs: string[];
  category: "telemetry" | "log" | "image";
  imageTarget?: "black_hole" | "planet" | "stars";
  imageDataUrl?: string;
  canUpload?: boolean;
}

export interface TerminalFolder {
  id: string;
  label: string;
  files: TerminalFile[];
}

export const DEFAULT_TELEMETRY_FILES: TerminalFile[] = [
  {
    id: "scan_gargantua_01",
    filename: "SCAN_01_BLACK_HOLE.DAT",
    title: "Black Hole",
    author: "OPTICAL SENSOR",
    subhead: "GRAVITY: 0.98 G",
    date: "SCAN 01",
    bodyParagraphs: [
      "Black Hole with extremely strong gravity (0.98 G).",
    ],
    category: "image",
    imageTarget: "black_hole",
    canUpload: true,
  },
  {
    id: "scan_kronos_02",
    filename: "SCAN_02_PLANET.DAT",
    title: "Gas Giant",
    author: "OPTICAL SENSOR",
    subhead: "GRAVITY: 0.48 G",
    date: "SCAN 02",
    bodyParagraphs: [
      "Large gas planet with rings (0.48 G).",
    ],
    category: "image",
    imageTarget: "planet",
    canUpload: true,
  },
  {
    id: "scan_void_03",
    filename: "SCAN_03_STARS.DAT",
    title: "Distant Stars",
    author: "OPTICAL SENSOR",
    subhead: "GRAVITY: 0.02 G",
    date: "SCAN 03",
    bodyParagraphs: [
      "Distant stars with near-zero gravity (0.02 G).",
    ],
    category: "image",
    imageTarget: "stars",
    canUpload: true,
  },
];

export const AUDIO_LOG_FILES: TerminalFile[] = [
  {
    id: "audio_log_01",
    filename: "RADIO_LOG_01.DAT",
    title: "Radio Log",
    author: "AUDIO SENSOR",
    subhead: "STATUS REPORT",
    date: "CYCLE 4492",
    bodyParagraphs: [
      "Take a balanced mix of Black Hole, Planet, and Star scans before transmitting the signal.",
    ],
    category: "log",
    canUpload: false,
  },
];
