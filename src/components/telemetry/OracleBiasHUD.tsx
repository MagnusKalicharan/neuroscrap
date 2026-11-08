"use client";
/**
 * src/components/telemetry/OracleBiasHUD.tsx
 * ===========================================
 * Plays Oracle's radio comms transmission when sampling bias is detected:
 * Informs the player that the dataset was biased/rejected, explains that
 * all scans have been deleted from the pendrive, and instructs the player
 * to go out into the cargo bay and take screenshots again.
 */
import React, { useState, useEffect } from "react";
import { useTelemetryStore, telemetryStore } from "./telemetryStore";
import DialogueBox from "../../scenes/scene2/Dialogue";

export function OracleBiasHUD() {
  const telemetry = useTelemetryStore();
  const [step, setStep] = useState(0);

  // Reset step whenever activeDialogueKey changes to bias_failure
  useEffect(() => {
    if (telemetry.activeDialogueKey === "bias_failure") {
      setStep(0);
    }
  }, [telemetry.activeDialogueKey]);

  // Only render when activeDialogueKey is "bias_failure" and terminal is closed
  if (telemetry.activeDialogueKey !== "bias_failure" || telemetry.terminalOpen) {
    return null;
  }

  const lines = [
    {
      id: "bias_oracle_1",
      speaker: "ORACLE",
      text: `⚠️ SAMPLING BIAS DETECTED! ${telemetry.biasMessage || "Your telemetry dataset is heavily unbalanced."} The trajectory simulation model cannot calculate our escape vector with biased data.`,
      radio: true,
    },
    {
      id: "bias_oracle_2",
      speaker: "ORACLE",
      text: "I have deleted all scans from your pendrive cache. Go back out into the cargo bay, look up at the breach, and take screenshots again.",
      radio: true,
    },
    {
      id: "bias_oracle_3",
      speaker: "ORACLE",
      text: "REMEMBER: We need a balanced sample! Collect at least 2 scans of the Black Hole, 2 of the Planets, and 2 of the Distant Stars (10 scans total).",
      radio: true,
    },
  ];

  const handleDismiss = () => {
    setStep(0);
    telemetryStore.setDialogueKey(null);
  };

  return (
    <div className="pointer-events-none select-none font-mono text-xs">
      <div className="pointer-events-auto">
        <DialogueBox
          currentLine={lines[step]}
          onAdvance={() => {
            if (step < lines.length - 1) {
              setStep((s) => s + 1);
            } else {
              handleDismiss();
            }
          }}
          onSkip={handleDismiss}
          isInteractive={true}
          showAdvancePrompt={true}
        />
      </div>
    </div>
  );
}

export default OracleBiasHUD;
