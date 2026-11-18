"use client";

import React, { useState, useEffect } from "react";
import DialogueBox from "../scenes/scene2/Dialogue";
import { taskStore } from "../ui/tasks/taskStore";

export const SECTION3_TRANSITION_LINES = [
  {
    id: "s3_scrap_1",
    speaker: "SCRAP",
    text: "Transmission beam locked! The carrier wave just punched clean through the storm into the upper atmosphere.",
    radio: true,
  },
  {
    id: "s3_oracle_2",
    speaker: "ORACLE",
    text: "Carrier wave confirmed. However, the antenna array is picking up secondary return echoes. Six unknown deep-space signals incoming.",
    radio: true,
  },
  {
    id: "s3_scrap_3",
    speaker: "SCRAP",
    text: "Secondary echoes? That could be our rescue transport trying to ping us! But natural radiation and space debris are drowning it out.",
    radio: true,
  },
  {
    id: "s3_oracle_4",
    speaker: "ORACLE",
    text: "The Avionics Command Core (CORE-B) in the forward cockpit is online. Proceed to the front of the ship and connect tools to isolate the signal.",
    radio: true,
  },
];

interface Section3CommsHUDProps {
  isUnlocked: boolean;
}

export function Section3CommsHUD({ isUnlocked }: Section3CommsHUDProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("neuro_scrap_section3_intro_seen") === "true";
    }
    return false;
  });
  const [currentStep, setCurrentStep] = useState(0);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("neuro_scrap_section3_intro_seen", "true");
      } catch {}
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      taskStore.registerTask({
        id: "section3-signals",
        title: "ANALYZE DEEP-SPACE SIGNALS",
        location: "FORWARD COCKPIT // CORE-B",
        state: "available",
        progress: 0,
        total: 1,
      });
    }
  }, [isUnlocked]);

  // Only render if Section 1 & Section 2 are both verified and dialogue has not been dismissed
  if (!isUnlocked || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-auto select-none">
      <DialogueBox
        currentLine={SECTION3_TRANSITION_LINES[currentStep]}
        onAdvance={() => {
          if (currentStep < SECTION3_TRANSITION_LINES.length - 1) {
            setCurrentStep((s) => s + 1);
          } else {
            handleDismiss();
          }
        }}
        onSkip={handleDismiss}
        isInteractive={true}
        showAdvancePrompt={true}
      />
    </div>
  );
}
