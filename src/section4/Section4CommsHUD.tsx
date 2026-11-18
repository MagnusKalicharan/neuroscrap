"use client";

import React, { useState, useEffect } from "react";
import DialogueBox from "../scenes/scene2/Dialogue";
import { taskStore } from "../ui/tasks/taskStore";
import { useSection3Store, section3Store } from "../section3/section3Store";

export const SECTION4_TRANSITION_LINES = [
  {
    id: "s4_scrap_1",
    speaker: "SCRAP",
    text: "Handshake ping acknowledged! The rescue shuttle answered our broadcast from the upper exosphere!",
    radio: true,
  },
  {
    id: "s4_oracle_2",
    speaker: "ORACLE",
    text: "Critical warning: The transmitter coils cannot hold the carrier lock. The incoming return signal is drowning in 80% geomagnetic storm noise and pulsar jitter.",
    radio: true,
  },
  {
    id: "s4_scrap_3",
    speaker: "SCRAP",
    text: "The crash melted our analog filters. But the primary Antenna Tower in the Cargo Bay has its own Neural Coprocessor terminal mounted directly on the mast!",
    radio: true,
  },
  {
    id: "s4_oracle_4",
    speaker: "ORACLE",
    text: "Sensor streams routed. Head down the spine corridor back to the Cargo Bay Antenna Tower. Access the terminal on the mast and tune the synaptic weights to 95% accuracy.",
    radio: true,
  },
  {
    id: "s4_scrap_5",
    speaker: "SCRAP",
    text: "On my way! Once the neural network locks onto the signal, the rescue vessel can track our carrier beam directly down to the surface!",
    radio: true,
  },
];

interface Section4CommsHUDProps {
  isUnlocked: boolean;
  onDismiss?: () => void;
}

export function Section4CommsHUD({ isUnlocked, onDismiss }: Section4CommsHUDProps) {
  const s3State = useSection3Store();
  const dismissed = Boolean(s3State.transitionDialogueSeen);
  const [currentStep, setCurrentStep] = useState(0);

  // If newly unlocked and not dismissed, ensure we start from step 0
  useEffect(() => {
    if (isUnlocked && !dismissed) {
      setCurrentStep(0);
    }
  }, [isUnlocked, dismissed]);

  const handleDismiss = () => {
    section3Store.markTransitionDialogueSeen();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("neuro_scrap_section4_intro_seen", "true");
      } catch {}
    }
    taskStore.registerTask({
      id: "section4-antenna-core",
      title: "TUNE ANTENNA TERMINAL // TRAIN NEURAL SYNAPSES",
      location: "CARGO BAY // ANTENNA MAST",
      state: "available",
      progress: 0,
      total: 1,
    });
    onDismiss?.();
  };

  useEffect(() => {
    if (isUnlocked) {
      taskStore.registerTask({
        id: "section4-antenna-core",
        title: "TUNE ANTENNA TERMINAL // TRAIN NEURAL SYNAPSES",
        location: "CARGO BAY // ANTENNA MAST",
        state: "available",
        progress: 0,
        total: 1,
      });
    }
  }, [isUnlocked]);

  // Only render if Section 4 is unlocked and dialogue has not been dismissed
  if (!isUnlocked || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-auto select-none">
      <DialogueBox
        currentLine={SECTION4_TRANSITION_LINES[currentStep]}
        onAdvance={() => {
          if (currentStep < SECTION4_TRANSITION_LINES.length - 1) {
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
