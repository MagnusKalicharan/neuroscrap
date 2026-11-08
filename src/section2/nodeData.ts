/**
 * src/section2/nodeData.ts
 * ============================================================
 * Section 2: Relay Line Node Data
 * 
 * Defines the six physical relay nodes along the ship transmission line:
 * R1 (118 V), R2 (121 V), R3 (99,999 V surge), R4 (null / missing),
 * R5 (120 V), R6 (122 V).
 */

export type RelayNodeKind = "healthy" | "surge" | "missing";
export type RelayNodeId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | string;

export interface RelayNodeData {
  id: RelayNodeId;
  label: string;
  reading: number | null;
  kind: RelayNodeKind;
  scannerText: string;
}

export type RelayNodeDef = RelayNodeData;

export const RELAY_NODES: readonly RelayNodeData[] = [
  {
    id: "R1",
    label: "R1",
    reading: 118,
    kind: "healthy",
    scannerText: "118 V // STABLE",
  },
  {
    id: "R2",
    label: "R2",
    reading: 121,
    kind: "healthy",
    scannerText: "121 V // STABLE",
  },
  {
    id: "R3",
    label: "R3",
    reading: 99999,
    kind: "surge",
    scannerText: "99,999 V // SURGE WARNING",
  },
  {
    id: "R4",
    label: "R4",
    reading: null,
    kind: "missing",
    scannerText: "NULL // NO COMPONENT DETECTED",
  },
  {
    id: "R5",
    label: "R5",
    reading: 120,
    kind: "healthy",
    scannerText: "120 V // STABLE",
  },
  {
    id: "R6",
    label: "R6",
    reading: 122,
    kind: "healthy",
    scannerText: "122 V // STABLE",
  },
] as const;

/**
 * Quick lookup map by node ID ("R1".."R6")
 */
export const RELAY_NODES_BY_ID: Record<string, RelayNodeData> = Object.fromEntries(
  RELAY_NODES.map((node) => [node.id, node])
);
