"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { TerminalShell } from "../ui/terminal/TerminalShell";
import { NeuralTopBar } from "./ui/NeuralTopBar";
import { DataColumn, type DatasetId } from "./ui/DataColumn";
import { FeaturesColumn } from "./ui/FeaturesColumn";
import { NetworkColumn } from "./ui/NetworkColumn";
import { OutputColumn } from "./ui/OutputColumn";
import { PacketSimulationControls } from "./math/PacketSimulationControls";
import { SimulationEventList } from "./math/SimulationEventList";
import { MathGlossaryModal } from "./math/MathGlossaryModal";
import { buildSimulationStages, type SimulationFrame, type TravelingPacket } from "./math/packetSimulation";
import { useSection4Store, section4Store } from "./section4Store";
import {
  createNetwork,
  step,
  trainEpoch,
  forward,
  backward,
  updateWeights,
  buildNodeMap,
  computeFeatures,
  SQUARE_LOSS,
  evaluateMetrics,
  generateSignalData,
  generateCircleData,
  generateXorData,
  generateGaussianData,
  generateSpiralData,
  splitDataset,
  type Network,
  type FeatureId,
  type ActivationType,
  type DataPoint,
  type Dataset,
} from "./nn/index";
import { terminalSound } from "../ui/terminal/sound";

export interface NeuralTerminalProps {
  open: boolean;
  onClose: () => void;
  mode?: "watch" | "lab";
  reducedMotion?: boolean;
  onFpsUpdate?: (fps: number, frameTimeMs: number) => void;
  onStartEndingCutscene?: () => void;
}

export function NeuralTerminal({
  open,
  onClose,
  mode = "watch",
  reducedMotion = false,
  onFpsUpdate,
  onStartEndingCutscene,
}: NeuralTerminalProps) {
  const s4State = useSection4Store();

  // Mode: Cisco Packet Tracer Simulation vs Fast Continuous Playground
  const [activeSubMode, setActiveSubMode] = useState<"packet_tracer" | "playground">(
    mode === "lab" ? "playground" : "packet_tracer"
  );
  const [activeMode, setActiveMode] = useState<"watch" | "lab">(mode);

  // Section 4 Phases: "part1_visualization" (animation + heatmap + notation only) vs "training_lab" (interactive training)
  const [terminalPhase, setTerminalPhase] = useState<"part1_visualization" | "training_lab">(
    mode === "lab" ? "training_lab" : "part1_visualization"
  );

  // Dataset Category within Training Lab: "beacon_signal" (main mission to escape) vs "sandbox" (try different things + extra inputs)
  const [datasetCategory, setDatasetCategory] = useState<"beacon_signal" | "sandbox">(
    mode === "lab" ? "beacon_signal" : "sandbox"
  );
  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  // Hyperparameters
  const [epoch, setEpoch] = useState(0);
  const epochRef = useRef(0);
  const epochPointIndexRef = useRef(0);
  const epochBudgetRef = useRef(0);
  const lastLoopTimestampRef = useRef<number | null>(null);
  const epochsCompletedInWindowRef = useRef(0);
  const lastEpochsRateCalcRef = useRef(performance.now());
  const [realEpochsPerSec, setRealEpochsPerSec] = useState(0);

  const [isPlayingPlayground, setIsPlayingPlayground] = useState(false);
  const [playgroundSpeed, setPlaygroundSpeed] = useState<1 | 5 | 20>(1);
  const [learningRate, setLearningRate] = useState(0.03);
  const [activation, setActivation] = useState<ActivationType>("tanh");

  // Architecture: Part 1 has [2, 2] for rich mathematical packet tracer animation; Part 2 (Training Lab) starts empty []
  const [hiddenLayers, setHiddenLayers] = useState<number[]>(
    mode === "lab" ? [] : [2, 2]
  );
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureId[]>([
    "x1",
    "x2",
  ]);

  // Dataset options: circle is default in Part 1 for clear non-linear boundary on heatmap
  const [datasetId, setDatasetId] = useState<DatasetId>(
    mode === "lab" ? "signal" : "circle"
  );
  const [trainRatio, setTrainRatio] = useState(0.5);
  const [noise, setNoise] = useState(0);
  const [batchSize, setBatchSize] = useState(10);
  const [dataSeed, setDataSeed] = useState(42);

  // Output options
  const [showTestData, setShowTestData] = useState(true);
  const [discretizeOutput, setDiscretizeOutput] = useState(false);

  // Render tick for sync
  const [renderTick, setRenderTick] = useState(0);

  // Modal dialogs
  const [showGlossary, setShowGlossary] = useState(false);
  const [showEventList, setShowEventList] = useState(false);

  // ── Dataset Generation ───────────────────────────────────────────────────────
  const rawDataPoints = useMemo<DataPoint[]>(() => {
    switch (datasetId) {
      case "circle":
        return generateCircleData(200, noise, dataSeed);
      case "xor":
        return generateXorData(200, noise, dataSeed);
      case "gaussian":
        return generateGaussianData(200, noise, dataSeed);
      case "spiral":
        return generateSpiralData(200, noise, dataSeed);
      case "signal":
      default:
        return generateSignalData(dataSeed, noise);
    }
  }, [datasetId, noise, dataSeed]);

  const dataset = useMemo<Dataset>(() => {
    return splitDataset(rawDataPoints, trainRatio, dataSeed);
  }, [rawDataPoints, trainRatio, dataSeed]);

  // ── Network Instance ─────────────────────────────────────────────────────────
  const networkRef = useRef<Network>(
    createNetwork(
      {
        inputFeatures: selectedFeatures,
        hiddenLayers,
        activation,
        outputActivation: "tanh",
        problemType: "classification",
      },
      42
    )
  );

  const [network, setNetwork] = useState<Network>(networkRef.current);

  // Metrics & Loss History
  const [metrics, setMetrics] = useState(() =>
    evaluateMetrics(networkRef.current, dataset.train, dataset.test, 0)
  );

  const [lossHistory, setLossHistory] = useState<
    Array<{ epoch: number; trainLoss: number; testLoss: number }>
  >([
    {
      epoch: 0,
      trainLoss: metrics.trainLoss,
      testLoss: metrics.testLoss,
    },
  ]);

  // ── Cisco Packet Tracer Simulation State ─────────────────────────────────────
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const currentSample = dataset.train[currentSampleIndex % dataset.train.length] || null;

  const [simulationFrames, setSimulationFrames] = useState<SimulationFrame[]>(() => {
    const s = dataset.train[0] || { x: 0.5, y: 0.5, label: 1 };
    return buildSimulationStages(networkRef.current, s, 0.03);
  });

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [animProgress, setAnimProgress] = useState(0.0);
  const [isSimulating, setIsSimulating] = useState(mode !== "lab");
  const [simSpeed, setSimSpeed] = useState<0.25 | 0.5 | 1 | 2>(1);

  // Synchronization refs for 100% deterministic, un-skippable animation timing
  const lastSimTimeRef = useRef<number>(performance.now());
  const simulationFramesRef = useRef(simulationFrames);
  simulationFramesRef.current = simulationFrames;
  const stageIndexRef = useRef<number>(0);
  const animProgressRef = useRef<number>(0.0);
  const isSimulatingRef = useRef<boolean>(mode !== "lab");
  isSimulatingRef.current = isSimulating;
  const simSpeedRef = useRef<number>(1);
  simSpeedRef.current = simSpeed;

  // Re-build simulation frames when network, sample, or learning rate changes
  const refreshSimulation = useCallback(() => {
    if (!currentSample) return;
    const frames = buildSimulationStages(networkRef.current, currentSample, learningRate);
    setSimulationFrames(frames);
    stageIndexRef.current = 0;
    animProgressRef.current = 0.0;
    setCurrentStageIndex(0);
    setAnimProgress(0.0);
  }, [currentSample, learningRate]);

  useEffect(() => {
    refreshSimulation();
  }, [refreshSimulation]);

  const currentFrame = simulationFrames[currentStageIndex] || simulationFrames[0];

  // ── Synchronize Live Weights to Network so Heatmap & Small Neuron Models Morph in Real-Time ──
  useEffect(() => {
    if (activeSubMode === "packet_tracer" && simulationFrames[currentStageIndex]) {
      const frame = simulationFrames[currentStageIndex];
      frame.liveWeights.forEach((w, linkId) => {
        const link = networkRef.current.allLinks.find((l) => l.id === linkId);
        if (link) link.weight = w;
      });
      frame.liveBiases.forEach((b, nodeId) => {
        const node = networkRef.current.allNodes.find((n) => n.id === nodeId);
        if (node) node.bias = b;
      });
      setRenderTick((t) => t + 1);
    }
  }, [currentStageIndex, simulationFrames, activeSubMode]);

  // ── Packet Animation Loop (Cisco Packet Tracer Physical Travel) ───────────────
  useEffect(() => {
    if (!open || activeSubMode !== "packet_tracer") return;

    let animId: number;
    lastSimTimeRef.current = performance.now();

    const simLoop = (timestamp: number) => {
      const deltaMs = Math.min(100, Math.max(0, timestamp - lastSimTimeRef.current));
      lastSimTimeRef.current = timestamp;

      if (isSimulatingRef.current) {
        const frames = simulationFramesRef.current;
        const total = frames.length;
        if (total > 0) {
          const stg = stageIndexRef.current;
          const hasPackets = (frames[stg]?.packets?.length || 0) > 0;
          // Steady pace: 3.5s for packet gliding, 2.0s for input injection / loss verification
          const baseDuration = hasPackets ? 3500 : 2000;
          const stageDuration = baseDuration / simSpeedRef.current;
          const progressInc = deltaMs / stageDuration;

          const newProg = animProgressRef.current + progressInc;

          if (newProg >= 1.0) {
            // Advance EXACTLY one stage!
            const nextStage = (stageIndexRef.current + 1) % total;
            stageIndexRef.current = nextStage;
            animProgressRef.current = 0.0;

            setCurrentStageIndex(nextStage);
            setAnimProgress(0.0);

            if (nextStage === 0) {
              terminalSound.playSuccessChime();
              // Cycle to next sample on the dataset so different data is continuously trained
              setCurrentSampleIndex((idx) => (idx + 1) % Math.max(1, dataset.train.length));
            } else {
              terminalSound.playKeyTick();
            }
          } else {
            animProgressRef.current = newProg;
            setAnimProgress(newProg);
          }
        }
      }

      animId = requestAnimationFrame(simLoop);
    };

    animId = requestAnimationFrame(simLoop);
    return () => cancelAnimationFrame(animId);
  }, [open, activeSubMode, dataset.train.length]);

  // Stage Stepping Handlers
  const handleNextStage = useCallback(() => {
    terminalSound.playKeyTick();
    setIsSimulating(false);
    isSimulatingRef.current = false;
    const total = simulationFramesRef.current.length;
    if (total > 0) {
      const nextStg = (stageIndexRef.current + 1) % total;
      stageIndexRef.current = nextStg;
      animProgressRef.current = 0.5;
      setCurrentStageIndex(nextStg);
      setAnimProgress(0.5);
    }
  }, []);

  const handlePrevStage = useCallback(() => {
    terminalSound.playKeyTick();
    setIsSimulating(false);
    isSimulatingRef.current = false;
    const total = simulationFramesRef.current.length;
    if (total > 0) {
      const prevStg = stageIndexRef.current > 0 ? stageIndexRef.current - 1 : total - 1;
      stageIndexRef.current = prevStg;
      animProgressRef.current = 0.5;
      setCurrentStageIndex(prevStg);
      setAnimProgress(0.5);
    }
  }, []);

  const handleResetSimulation = useCallback(() => {
    terminalSound.playKeyTick();
    stageIndexRef.current = 0;
    animProgressRef.current = 0.0;
    setCurrentStageIndex(0);
    setAnimProgress(0.0);
  }, []);

  const handleTogglePlay = useCallback(() => {
    terminalSound.playKeyTick();
    setIsSimulating((prev) => {
      const next = !prev;
      isSimulatingRef.current = next;
      if (next) {
        lastSimTimeRef.current = performance.now();
      }
      return next;
    });
  }, []);

  const handleNextSample = useCallback(() => {
    setCurrentSampleIndex((i) => (i + 1) % dataset.train.length);
  }, [dataset.train.length]);

  // ── Reset Network Function ───────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const freshNet = createNetwork(
      {
        inputFeatures: selectedFeatures,
        hiddenLayers,
        activation,
        outputActivation: "tanh",
        problemType: "classification",
      },
      42
    );
    networkRef.current = freshNet;
    setNetwork(freshNet);
    epochRef.current = 0;
    epochPointIndexRef.current = 0;
    epochBudgetRef.current = 0;
    epochsCompletedInWindowRef.current = 0;
    lastEpochsRateCalcRef.current = performance.now();
    lastLoopTimestampRef.current = null;
    setRealEpochsPerSec(0);
    setEpoch(0);
    setIsPlayingPlayground(false);
    section4Store.updateLabState({ isComplete: false });
    const m = evaluateMetrics(freshNet, dataset.train, dataset.test, 0);
    setMetrics(m);
    setLossHistory([{ epoch: 0, trainLoss: m.trainLoss, testLoss: m.testLoss }]);
    setRenderTick((t) => t + 1);
    refreshSimulation();
  }, [selectedFeatures, hiddenLayers, activation, dataset, refreshSimulation]);

  // Architecture changes trigger clean re-init
  useEffect(() => {
    handleReset();
  }, [selectedFeatures, hiddenLayers, activation, datasetId, trainRatio, dataSeed, handleReset]);

  // Single step execution (Playground mode: one full epoch pass)
  const handleStepPlayground = useCallback(() => {
    const map = buildNodeMap(networkRef.current);
    trainEpoch(networkRef.current, dataset.train, learningRate, batchSize, "none", 0, SQUARE_LOSS, map);
    epochPointIndexRef.current = 0;
    const nextEpoch = epochRef.current + 1;
    epochRef.current = nextEpoch;

    const m = evaluateMetrics(
      networkRef.current,
      dataset.train,
      dataset.test,
      nextEpoch
    );
    setEpoch(nextEpoch);
    setMetrics(m);
    setLossHistory((h) => [
      ...h.slice(-299),
      { epoch: nextEpoch, trainLoss: m.trainLoss, testLoss: m.testLoss },
    ]);
    setRenderTick((t) => t + 1);
    refreshSimulation();
  }, [dataset, batchSize, learningRate, refreshSimulation]);

  // ── Continuous Training Loop (Playground Mode) ───────────────────────────────
  const fpsBufferRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isPlayingPlayground || !open || activeSubMode !== "playground") {
      lastLoopTimestampRef.current = null;
      setRealEpochsPerSec(0);
      return;
    }

    let animId: number;

    const loop = (timestamp: number) => {
      if (document.visibilityState === "hidden" && !navigator.webdriver) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const frameDelta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      if (frameDelta > 0 && frameDelta < 200) {
        const buf = fpsBufferRef.current;
        buf.push(frameDelta);
        if (buf.length > 30) buf.shift();
        if (buf.length >= 10 && onFpsUpdate) {
          const avgDelta = buf.reduce((a, b) => a + b, 0) / buf.length;
          const fps = Math.min(60, Math.round(1000 / avgDelta));
          onFpsUpdate(fps, Math.round(avgDelta * 10) / 10);
        }
      }

      if (lastLoopTimestampRef.current === null) {
        lastLoopTimestampRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastLoopTimestampRef.current) / 1000, 0.1);
      lastLoopTimestampRef.current = timestamp;

      // Accumulate target epoch budget based on speed (1, 5, 20 target epochs/sec)
      epochBudgetRef.current += dt * playgroundSpeed;
      if (epochBudgetRef.current > 5.0) {
        epochBudgetRef.current = 5.0; // Avoid unbounded lag buildup
      }

      const frameStart = performance.now();
      const net = networkRef.current;
      const map = buildNodeMap(net);
      const featureIds = net.config.inputFeatures;
      const trainData = dataset.train;
      const trainLen = trainData.length;

      let epochsCompletedThisFrame = 0;

      // Process samples while budget remains (or mid-epoch chunk) within 6ms frame budget
      while (
        (epochBudgetRef.current >= 1.0 || epochPointIndexRef.current > 0) &&
        performance.now() - frameStart < 6.0
      ) {
        const pt = trainData[epochPointIndexRef.current];
        const inputs = computeFeatures(featureIds, pt.x, pt.y);
        forward(net, inputs, map);
        backward(net, pt.label, SQUARE_LOSS, map);

        epochPointIndexRef.current += 1;
        const curIdx = epochPointIndexRef.current;

        // Minibatch weight update
        if (curIdx % batchSize === 0) {
          updateWeights(net, learningRate, batchSize, "none", 0);
        }

        // Full pass completed: increment epoch counter, deduct budget
        if (curIdx >= trainLen) {
          // Clear any trailing accumulation (< batchSize)
          for (let i = 0; i < net.allLinks.length; i++) {
            net.allLinks[i].errorDeriv = 0;
            net.allLinks[i].accErrorDeriv = 0;
            net.allLinks[i].numDerivs = 0;
          }
          for (let i = 0; i < net.allNodes.length; i++) {
            net.allNodes[i].biasDeriv = 0;
          }

          epochPointIndexRef.current = 0;
          epochRef.current += 1;
          epochBudgetRef.current = Math.max(0, epochBudgetRef.current - 1.0);
          epochsCompletedThisFrame += 1;
          epochsCompletedInWindowRef.current += 1;
        }
      }

      // Track real epochs per second over a 500ms sliding window
      const now = performance.now();
      if (now - lastEpochsRateCalcRef.current >= 500) {
        const elapsedSec = (now - lastEpochsRateCalcRef.current) / 1000;
        const realRate = epochsCompletedInWindowRef.current / Math.max(0.001, elapsedSec);
        setRealEpochsPerSec(Math.round(realRate * 10) / 10);
        epochsCompletedInWindowRef.current = 0;
        lastEpochsRateCalcRef.current = now;
      }

      // If at least one full epoch finished, compute metrics and update UI
      if (epochsCompletedThisFrame > 0) {
        const currentEpoch = epochRef.current;
        const m = evaluateMetrics(
          networkRef.current,
          dataset.train,
          dataset.test,
          currentEpoch
        );

        setEpoch(currentEpoch);
        setMetrics(m);
        setLossHistory((prev) => [
          ...prev.slice(-299),
          { epoch: currentEpoch, trainLoss: m.trainLoss, testLoss: m.testLoss },
        ]);
        setRenderTick((t) => t + 1);

        if (
          m.testLoss < 0.12 &&
          m.testAccuracy >= 0.95 &&
          datasetId === "signal"
        ) {
          section4Store.updateLabState({ isComplete: true });
          if (!s4State.captionsSeen.trainingComplete) {
            setIsPlayingPlayground(false);
            section4Store.markCaptionSeen("trainingComplete");
            terminalSound.playSuccessChime();
            return;
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlayingPlayground,
    open,
    activeSubMode,
    dataset,
    batchSize,
    learningRate,
    playgroundSpeed,
    onFpsUpdate,
    s4State.captionsSeen.trainingComplete,
  ]);

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (activeSubMode === "packet_tracer") {
          handleTogglePlay();
        } else {
          setIsPlayingPlayground((p) => !p);
        }
      } else if (e.key === "ArrowRight" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (activeSubMode === "packet_tracer") {
          handleNextStage();
        } else {
          handleStepPlayground();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeSubMode === "packet_tracer") {
          handlePrevStage();
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (activeSubMode === "packet_tracer") {
          handleResetSimulation();
        } else {
          handleReset();
        }
      } else if (e.key === "Enter" || e.key === "t" || e.key === "T") {
        if (terminalPhase === "part1_visualization") {
          e.preventDefault();
          terminalSound.playSuccessChime();
          setTerminalPhase("training_lab");
          setActiveMode("lab");
          setDatasetCategory("beacon_signal");
          setDatasetId("signal");
          setSelectedFeatures(["x1", "x2"]);
          setHiddenLayers([]);
          setIsSimulating(false);
          isSimulatingRef.current = false;
          setActiveSubMode("playground");
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (terminalPhase === "training_lab") {
          terminalSound.playSelectBlip();
          setTerminalPhase("part1_visualization");
          setActiveMode("watch");
          setActiveSubMode("packet_tracer");
          setDatasetId("circle");
          setSelectedFeatures(["x1", "x2"]);
          setHiddenLayers([2, 2]);
          setIsPlayingPlayground(false);
          setIsSimulating(true);
          isSimulatingRef.current = true;
          lastSimTimeRef.current = performance.now();
        } else {
          setActiveSubMode((prev) => (prev === "packet_tracer" ? "playground" : "packet_tracer"));
        }
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setShowEventList((l) => !l);
      } else if (e.key === "g" || e.key === "G" || e.key === "?") {
        e.preventDefault();
        setShowGlossary((g) => !g);
      } else if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
        e.preventDefault();
        if (showGlossary) {
          setShowGlossary(false);
        } else if (showEventList) {
          setShowEventList(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    activeSubMode,
    handleNextStage,
    handlePrevStage,
    handleResetSimulation,
    handleStepPlayground,
    handleReset,
    showGlossary,
    showEventList,
    onClose,
  ]);

  const isPart1 = terminalPhase === "part1_visualization";

  return (
    <TerminalShell
      open={open}
      onClose={onClose}
      title={
        isPart1
          ? "ANTENNA CORE // PART 1: MATHEMATICAL VISUALIZATION"
          : "ANTENNA CORE // NEURAL TRAINING LAB"
      }
      badge={isPart1 ? "PART 1: VISUALIZATION" : "TRAINING LAB"}
      reducedMotion={reducedMotion}
    >
      <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-[#04060B] relative">
        {/* ── Mode Controls & Top Bar ──────────────────────────────── */}
        {isPart1 ? (
          /* Part 1 Top Bar: Pure and uncluttered — only Notation & Train Antenna Option */
          <div className="h-[52px] px-4 bg-[#020a04] border-b border-[var(--term-outline-green)]/70 flex items-center justify-between w-full select-none shrink-0 font-mono">
            {/* Left: Mode Title & Current Stage Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2EE85C] animate-pulse shadow-[0_0_8px_#2EE85C]" />
                <span className="text-xs font-black text-[#4BFF7B] tracking-wider uppercase">
                  PART 1: MATHEMATICAL VISUALIZATION
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#010803] border border-[#2EE85C]/40 text-[10px] text-[#2EE85C] font-bold">
                <span>STAGE {currentStageIndex + 1}/{simulationFrames.length}:</span>
                <span className="text-white">{currentFrame.event.title}</span>
              </div>
            </div>

            {/* Right: [?] Notation & Prominent [TRAIN ANTENNA ▶] Option */}
            <div className="flex items-center gap-3">
              {/* Notation Glossary Option */}
              <button
                type="button"
                onClick={() => {
                  terminalSound.playSelectBlip();
                  setShowGlossary(true);
                }}
                className="px-3.5 py-1.5 rounded bg-[#020e05] border border-[var(--term-outline-green)] text-xs font-bold text-[var(--term-green-text-bright)] hover:bg-[#07250e] hover:border-[#4bff7b] transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_6px_rgba(46,232,92,0.2)]"
                title="Open Mathematical Notation Glossary [?]"
              >
                <span className="text-[#FFB700]">[?]</span>
                <span>NOTATION</span>
              </button>

              {/* TRAIN ANTENNA Option */}
              <button
                type="button"
                onClick={() => {
                  terminalSound.playSuccessChime();
                  setTerminalPhase("training_lab");
                  setActiveMode("lab");
                  setDatasetCategory("beacon_signal");
                  setDatasetId("signal");
                  setSelectedFeatures(["x1", "x2"]);
                  setHiddenLayers([]);
                  setIsSimulating(false);
                  isSimulatingRef.current = false;
                  setActiveSubMode("playground");
                }}
                className="px-4 py-1.5 rounded bg-[#04240c] border-2 border-[#2EE85C] text-xs font-black text-[#4BFF7B] hover:bg-[#084218] hover:shadow-[0_0_16px_rgba(46,232,92,0.7)] transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(46,232,92,0.4)]"
                title="Proceed to Interactive Training Lab [Enter]"
              >
                <span className="text-sm">📡</span>
                <span className="tracking-wider">TRAIN ANTENNA ▶</span>
              </button>
            </div>
          </div>
        ) : (
          /* Training Lab Top Bar: Full Playground Controls with back button to Part 1 */
          <div className="flex items-center w-full min-w-0">
            <button
              type="button"
              onClick={() => {
                terminalSound.playSelectBlip();
                setTerminalPhase("part1_visualization");
                setActiveMode("watch");
                setActiveSubMode("packet_tracer");
                setDatasetId("circle");
                setSelectedFeatures(["x1", "x2"]);
                setHiddenLayers([2, 2]);
                setIsPlayingPlayground(false);
                setIsSimulating(true);
                isSimulatingRef.current = true;
                lastSimTimeRef.current = performance.now();
              }}
              className="h-[52px] px-3 bg-[#020a04] border-b border-r border-[var(--term-outline-green)]/70 flex items-center gap-1.5 text-xs text-[#4BFF7B] hover:bg-[#07250e] transition-all font-mono font-bold shrink-0"
              title="Return to Part 1: Floating Mathematical Visualization [M]"
            >
              <span>◀</span>
              <span>PART 1 [M]</span>
            </button>

            <NeuralTopBar
              epoch={epoch}
              isPlaying={isPlayingPlayground}
              onTogglePlay={() => {
                setIsPlayingPlayground((p) => !p);
              }}
              onStep={handleStepPlayground}
              onReset={handleReset}
              learningRate={learningRate}
              onChangeLearningRate={setLearningRate}
              activation={activation}
              onChangeActivation={setActivation}
              mode={isPart1 ? "watch" : "lab"}
              speed={playgroundSpeed}
              onChangeSpeed={setPlaygroundSpeed}
              epochsPerSec={realEpochsPerSec}
              showEscapeButton={
                terminalPhase === "training_lab" &&
                datasetId === "signal" &&
                metrics.testAccuracy >= 0.95 &&
                epoch > 0
              }
              onEscape={() => {
                if (
                  terminalPhase !== "training_lab" ||
                  datasetId !== "signal" ||
                  metrics.testAccuracy < 0.95 ||
                  epoch <= 0
                ) {
                  return;
                }
                onClose();
                onStartEndingCutscene?.();
              }}
            />
          </div>
        )}

        {/* ── Main Neural Architecture Grid ────────────────────────── */}
        <div className="flex-1 w-full h-full flex min-h-0 overflow-hidden relative">
          {/* In Training Lab mode: show Data & Features columns */}
          {!isPart1 && (
            <>
              {/* Column 1: Data (Beacon Signal vs Try Others) */}
              <DataColumn
                datasetId={datasetId}
                onSelectDataset={setDatasetId}
                trainRatio={trainRatio}
                onChangeTrainRatio={setTrainRatio}
                noise={noise}
                onChangeNoise={setNoise}
                batchSize={batchSize}
                onChangeBatchSize={setBatchSize}
                onRegenerate={() => setDataSeed((s) => s + 1)}
                mode={isPart1 ? "watch" : "lab"}
                datasetCategory={datasetCategory}
                onChangeCategory={(cat) => {
                  setDatasetCategory(cat);
                  if (cat === "beacon_signal") {
                    setDatasetId("signal");
                    setSelectedFeatures(["x1", "x2"]);
                  }
                }}
              />

              {/* Column 2: Features (Only X1, X2 in beacon signal, all 7 in sandbox) */}
              <FeaturesColumn
                selectedFeatures={selectedFeatures}
                onToggleFeature={(fId) => {
                  if (selectedFeatures.includes(fId)) {
                    if (selectedFeatures.length <= 1) return;
                    setSelectedFeatures(selectedFeatures.filter((id) => id !== fId));
                  } else {
                    setSelectedFeatures([...selectedFeatures, fId]);
                  }
                }}
                datasetId={datasetId}
                mode={isPart1 ? "watch" : "lab"}
                datasetCategory={datasetCategory}
              />
            </>
          )}

          {/* Column 3: Network Architecture & Synapses */}
          <NetworkColumn
            key={terminalPhase}
            network={networkRef.current}
            renderTick={renderTick}
            hiddenLayers={hiddenLayers}
            onChangeHiddenLayers={setHiddenLayers}
            mode={isPart1 ? "watch" : "lab"}
            reducedMotion={reducedMotion}
            isPlaying={isPlayingPlayground}
            onEditWeight={(linkId, newWeight) => {
              const link = networkRef.current.allLinks.find((l) => l.id === linkId);
              if (link) {
                link.weight = newWeight;
                setRenderTick((t) => t + 1);
                refreshSimulation();
              }
            }}
            simulationActive={isPart1 || activeSubMode === "packet_tracer"}
            currentFrame={currentFrame}
            animProgress={animProgress}
          />

          {/* Column 4: Output Heatmap & Losses (Only in Training Lab) */}
          {!isPart1 && (
            <OutputColumn
              network={networkRef.current}
              renderTick={renderTick}
              trainData={dataset.train}
              testData={dataset.test}
              testLoss={metrics.testLoss}
              trainLoss={metrics.trainLoss}
              testAccuracy={metrics.testAccuracy}
              lossHistory={lossHistory}
              showTestData={showTestData}
              onToggleShowTestData={() => setShowTestData((s) => !s)}
              discretizeOutput={discretizeOutput}
              onToggleDiscretize={() => setDiscretizeOutput((d) => !d)}
              datasetId={datasetId}
            />
          )}

          {/* ── Cisco Simulation Event List Drawer ────────────────── */}
          {showEventList && (
            <SimulationEventList
              frames={simulationFrames}
              currentStageIndex={currentStageIndex}
              onSelectStage={(idx) => {
                terminalSound.playKeyTick();
                setIsSimulating(false);
                setCurrentStageIndex(idx);
                setAnimProgress(0.5);
              }}
              onClose={() => setShowEventList(false)}
            />
          )}

          {/* ── Math Notation Glossary Modal ──────────────────────── */}
          <MathGlossaryModal
            open={showGlossary}
            onClose={() => setShowGlossary(false)}
          />
        </div>
      </div>
    </TerminalShell>
  );
}
