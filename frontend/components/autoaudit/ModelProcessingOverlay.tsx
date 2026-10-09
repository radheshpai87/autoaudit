"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "./AppIcon";

interface ModelProcessingOverlayProps {
  active: boolean;
  title?: string;
  subtitle?: string;
}

export function ModelProcessingOverlay({
  active,
  title = "AutoAudit YOLOv8 Neural Inspection Running",
  subtitle = "AI is inspecting this brake component for safety defects and precision tolerances. Please wait a moment…",
}: ModelProcessingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  const steps = [
    "Receiving component image & normalizing geometry…",
    "Running YOLOv8 deep segmentation & defect bounding…",
    "Calculating DTV, lateral runout & FMEA Risk Priority (RPN)…",
    "Generating final QA disposition & traffic-light verdict…",
  ];

  // Live stopwatch timer while active
  useEffect(() => {
    if (!active) {
      setElapsedSec(0);
      return;
    }
    const start = performance.now();
    const timer = window.setInterval(() => {
      setElapsedSec(Number(((performance.now() - start) / 1000).toFixed(1)));
    }, 100);
    return () => window.clearInterval(timer);
  }, [active]);

  // Disable all scrolling and clicks on body when active
  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    const prevOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    if (lenis) lenis.stop();

    const blockScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });
    window.addEventListener("scroll", blockScroll, { passive: false });

    // Step cycle animation
    const interval = window.setInterval(() => {
      setStepIndex((curr) => (curr + 1) % steps.length);
    }, 900);

    return () => {
      if (lenis) lenis.start();
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.body.style.overscrollBehavior = prevOverscroll;
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      window.removeEventListener("scroll", blockScroll);
      window.clearInterval(interval);
    };
  }, [active, steps.length]);

  if (!active) return null;

  return (
    <div
      className="aa-fullscreen-processing-overlay"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="aa-processing-modal-card">
        {/* Animated Laser Scanning Radar */}
        <div className="aa-processing-scanner-wrap">
          <div className="aa-scanner-rotor-ring">
            <div className="aa-scanner-beam" />
            <div className="aa-scanner-crosshair-h" />
            <div className="aa-scanner-crosshair-v" />
            <div className="aa-scanner-pulse-core">
              <span className="aa-scanner-ai-icon"><AppIcon name="bolt" size={24} color="#0284c7" /></span>
            </div>
          </div>
        </div>

        {/* Text and status info */}
        <div className="aa-processing-content">
          <div className="aa-processing-badge">
            <span className="aa-processing-dot" />
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>MODEL PROCESSING ACTIVE · <AppIcon name="clock" size={13} style={{ marginLeft: "4px" }} /> <b>{elapsedSec.toFixed(1)}s elapsed</b></span>
          </div>

          <h2 className="aa-processing-title">{title}</h2>
          <p className="aa-processing-subtitle">{subtitle}</p>

          {/* Stepper progress */}
          <div className="aa-processing-step-bar">
            <div className="aa-processing-step-active">
              <span className="aa-spinner-small" />
              <b>{steps[stepIndex]}</b>
            </div>
            <div className="aa-processing-progress-track">
              <div
                className="aa-processing-progress-fill"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="aa-processing-lock-notice">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><AppIcon name="lock" size={13} color="#64748b" /> User input &amp; scrolling temporarily paused while AI analyzes the part</span>
          </div>
        </div>
      </div>
    </div>
  );
}
