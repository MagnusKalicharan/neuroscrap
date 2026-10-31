"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";

interface BackgroundMusicProps {
  src?: string;
  defaultVolume?: number;
  className?: string;
}

export function BackgroundMusic({
  src = "/audio/neuro-scrap-bgm.mp3",
  defaultVolume = 0.4,
  className = "",
}: BackgroundMusicProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(defaultVolume);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const prevVolumeRef = useRef<number>(defaultVolume);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize and guarantee playback starts from 0:00 on page load / refresh
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Always reset to the very beginning (0:00) on refresh/mount
    audio.currentTime = 0;
    audio.volume = defaultVolume;
    audio.loop = true;

    // Helper: start playback cleanly from 0:00
    const startFromBeginning = () => {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = 0;
      el.volume = defaultVolume;
      el.muted = false;

      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsMuted(false);
            cleanupGestureListeners();
          })
          .catch(() => {
            // Autoplay restricted until user gesture
            setIsPlaying(false);
          });
      }
    };

    // Attempt immediate autoplay on load/refresh
    startFromBeginning();

    // Fallback: unlock audio on ANY user activity across the window
    // Uses capture phase (true) so events are caught before any element can stopPropagation
    const onUserActivity = () => {
      const el = audioRef.current;
      if (el && (el.paused || el.currentTime === 0)) {
        startFromBeginning();
      }
    };

    const cleanupGestureListeners = () => {
      window.removeEventListener("pointerdown", onUserActivity, true);
      window.removeEventListener("click", onUserActivity, true);
      window.removeEventListener("keydown", onUserActivity, true);
      window.removeEventListener("touchstart", onUserActivity, true);
      window.removeEventListener("pointermove", onUserActivity, true);
      window.removeEventListener("wheel", onUserActivity, true);
    };

    window.addEventListener("pointerdown", onUserActivity, true);
    window.addEventListener("click", onUserActivity, true);
    window.addEventListener("keydown", onUserActivity, true);
    window.addEventListener("touchstart", onUserActivity, true);
    window.addEventListener("pointermove", onUserActivity, true);
    window.addEventListener("wheel", onUserActivity, true);

    return () => {
      cleanupGestureListeners();
    };
  }, [defaultVolume]);

  // Ensure seamless zero-gap loop back from 0:00 when track ends
  const handleEnded = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  // Toggle On / Off (Mute / Unmute / Play / Pause)
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted || volume === 0 || audio.muted || audio.paused) {
      // Turn ON: restore previous non-zero volume and ensure playback
      const targetVol = prevVolumeRef.current > 0 ? prevVolumeRef.current : defaultVolume;
      setIsMuted(false);
      setVolume(targetVol);
      audio.muted = false;
      audio.volume = targetVol;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      // Turn OFF: save current volume and mute
      prevVolumeRef.current = volume;
      setIsMuted(true);
      setVolume(0);
      audio.muted = true;
      audio.volume = 0;
      setIsPlaying(false);
    }
  };

  // Volume slider input change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const audio = audioRef.current;
    if (!audio) return;

    if (val === 0) {
      setIsMuted(true);
      audio.muted = true;
      audio.volume = 0;
      setIsPlaying(false);
    } else {
      setIsMuted(false);
      audio.muted = false;
      audio.volume = val;
      prevVolumeRef.current = val;
      if (audio.paused) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      } else {
        setIsPlaying(true);
      }
    }
  };

  // Mouse wheel volume scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const nextVal = Math.min(1, Math.max(0, Math.round((volume + delta) * 100) / 100));
    setVolume(nextVal);

    const audio = audioRef.current;
    if (!audio) return;

    if (nextVal === 0) {
      setIsMuted(true);
      audio.muted = true;
      audio.volume = 0;
      setIsPlaying(false);
    } else {
      setIsMuted(false);
      audio.muted = false;
      audio.volume = nextVal;
      prevVolumeRef.current = nextVal;
      if (audio.paused) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      } else {
        setIsPlaying(true);
      }
    }
  };

  const isAudible = isPlaying && !isMuted && volume > 0;
  const effectiveVol = isAudible ? volume : 0;

  if (!mounted) {
    return null;
  }

  return (
    <div className={`relative inline-flex items-center ${className}`} suppressHydrationWarning>
      {/* Underlying HTML5 Audio Element with autoPlay & Loop */}
      <audio
        ref={audioRef}
        src={src}
        autoPlay
        loop
        preload="auto"
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Small Solarpunk Audio Control Pill */}
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => {
          if (!isDraggingRef.current) setIsOpen(false);
        }}
        onWheel={handleWheel}
        className={`
          relative flex items-center justify-between
          h-9 rounded
          bg-black/60 hover:bg-black/85
          backdrop-blur-md
          border border-cyan-500/40 hover:border-cyan-400
          transition-all duration-300 ease-out
          shadow-[0_0_15px_rgba(0,255,255,0.15)]
          hover:shadow-[0_0_22px_rgba(0,255,255,0.35)]
          px-2
          ${isOpen ? "w-36 gap-2" : "w-10 gap-0"}
        `}
      >
        {/* Solarpunk Corner Cut Accents */}
        <div className="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-cyan-400 pointer-events-none" />
        <div className="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-cyan-400 pointer-events-none" />

        {/* Expandable Volume Slider */}
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-out flex items-center
            ${isOpen ? "w-20 opacity-100" : "w-0 opacity-0 pointer-events-none"}
          `}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={effectiveVol}
            onChange={handleVolumeChange}
            onMouseDown={() => {
              isDraggingRef.current = true;
            }}
            onMouseUp={() => {
              isDraggingRef.current = false;
            }}
            onTouchStart={() => {
              isDraggingRef.current = true;
            }}
            onTouchEnd={() => {
              isDraggingRef.current = false;
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            aria-label="Volume slider"
            className="
              w-20 h-1.5 rounded-lg appearance-none cursor-pointer
              bg-white/20 accent-cyan-400
              focus:outline-none focus:ring-1 focus:ring-cyan-400
            "
          />
        </div>

        {/* Speaker Toggle Button (On / Off) */}
        <button
          type="button"
          onClick={toggleMute}
          suppressHydrationWarning
          aria-label={isAudible ? "Mute audio" : "Unmute audio"}
          title={isAudible ? "Click to turn OFF" : "Click to turn ON"}
          className="
            w-6 h-6 flex items-center justify-center shrink-0
            text-cyan-400 hover:text-white
            transition-colors duration-200 cursor-pointer
            focus:outline-none select-none
          "
        >
          {!isAudible ? (
            <VolumeX
              className="w-4 h-4 text-amber-400/90 hover:text-amber-300 transition-transform active:scale-90"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,170,0,0.6))" }}
            />
          ) : effectiveVol < 0.5 ? (
            <Volume1
              className="w-4 h-4 text-cyan-400 hover:text-cyan-200 transition-transform active:scale-90"
              style={{ filter: "drop-shadow(0 0 8px rgba(0,255,255,0.7))" }}
            />
          ) : (
            <Volume2
              className="w-4 h-4 text-cyan-400 hover:text-cyan-200 transition-transform active:scale-90"
              style={{ filter: "drop-shadow(0 0 8px rgba(0,255,255,0.7))" }}
            />
          )}
        </button>
      </div>
    </div>
  );
}

export default BackgroundMusic;
