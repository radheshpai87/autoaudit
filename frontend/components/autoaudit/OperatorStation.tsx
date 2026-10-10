"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadAndInspectImage, type InspectApiResponse } from "../../lib/api";
import type { InspectionUploadLog } from "../../lib/types";
import type { ViewName } from "./Views";
import { WhatsAppDispatchAction } from "./WhatsAppDispatch";
import { ModelProcessingOverlay } from "./ModelProcessingOverlay";
import { AppIcon } from "./AppIcon";

interface OperatorStationProps {
  uploadLogs: InspectionUploadLog[];
  selectedPart: string;
  setSelectedPart: (id: string) => void;
  navigate: (view: ViewName, partId?: string) => void;
  backendOnline: boolean;
  inferenceMode: string;
  onInspectionCreated: (response: InspectApiResponse, thumbnailDataUrl: string, file: File) => void | Promise<void>;
  refreshAnalytics: () => void;
}

export function OperatorStation({
  uploadLogs,
  selectedPart,
  setSelectedPart,
  navigate,
  backendOnline,
  inferenceMode,
  onInspectionCreated,
  refreshAnalytics,
}: OperatorStationProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [latestResult, setLatestResult] = useState<InspectApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [checklist, setChecklist] = useState({
    lensClean: true,
    rotorSeated: true,
    lightingGood: true,
    binReady: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive stats from upload logs
  const shiftInspected = uploadLogs.length;
  const shiftPassed = uploadLogs.filter((l) => l.result === "PASS").length;
  const shiftFailed = uploadLogs.filter((l) => l.result === "REJECT").length;
  const shiftReview = uploadLogs.filter((l) => l.result === "REVIEW" || l.requiresHumanReview).length;

  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);

  const currentLog = uploadLogs.find((l) => l.id === selectedPart) ?? uploadLogs[0];

  const handleFileChange = async (selectedFile?: File) => {
    if (!selectedFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setErrorMsg("Please upload a JPG, PNG, or WEBP image of the brake rotor.");
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setPreview(previewUrl);
    setScanning(true);
    setErrorMsg("");

    const startTime = performance.now();
    try {
      const response = await uploadAndInspectImage(selectedFile, "LINE1-CURRENT-SHIFT");
      const elapsed = Math.round(performance.now() - startTime);
      setProcessingTimeMs(elapsed);
      setLatestResult(response);

      // Create thumbnail
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const thumbUrl = previewUrl;

      await onInspectionCreated(response, thumbUrl, selectedFile);
      setSelectedPart(response.image_id);
      refreshAnalytics();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Could not check image with backend. Please verify backend connection.");
    } finally {
      setScanning(false);
    }
  };

  const loadSampleImage = async (url: string, name: string) => {
    try {
      setScanning(true);
      setErrorMsg("");
      const res = await fetch(url);
      const blob = await res.blob();
      const sampleFile = new File([blob], name, { type: blob.type || "image/jpeg" });
      void handleFileChange(sampleFile);
    } catch {
      setErrorMsg("Could not load sample demo rotor.");
      setScanning(false);
    }
  };

  const getPlainEnglishDefectExplanation = (defectType: string) => {
    const lower = defectType.toLowerCase();
    if (lower.includes("crack")) {
      return {
        plainName: "Heat / Stress Crack",
        description: "A split or hairline crack in the rotor metal. The disc could shatter under hard braking on the road.",
        actionText: "QUARANTINE TO RED SCRAP BIN #3 IMMEDIATELY",
        binColor: "red",
      };
    }
    if (lower.includes("scor") || lower.includes("groov")) {
      return {
        plainName: "Deep Surface Grooving / Scratch",
        description: "Deep channels scratched into the friction ring. Will cause grinding noise, brake vibration, and premature pad failure.",
        actionText: "MOVE TO REWORK BIN #2 FOR RESURFACING",
        binColor: "amber",
      };
    }
    if (lower.includes("cavit") || lower.includes("pit") || lower.includes("corros")) {
      return {
        plainName: "Metal Surface Cavity / Porosity",
        description: "Small air pockets or corrosion voids formed during metal casting. Weakens the structural friction contact area.",
        actionText: "MOVE TO RED SCRAP BIN #3",
        binColor: "red",
      };
    }
    return {
      plainName: defectType || "Visual Anomaly",
      description: "An unusual surface irregularity was spotted by the camera. Needs confirmation by the quality engineering lab.",
      actionText: "PLACE IN YELLOW RACK FOR QUALITY ENGINEER",
      binColor: "yellow",
    };
  };

  const currentResult = latestResult || (currentLog ? {
    overall_status: currentLog.result,
    condition_classification: {
      condition: currentLog.condition,
      confidence: currentLog.conditionConfidence,
      wear_index_score: currentLog.wearIndex,
      triage_verdict: currentLog.result === "PASS" ? "ACCEPT_GOOD_PART" : currentLog.result === "REJECT" ? "SCRAP_DEFECTIVE" : "QUARANTINE_REVIEW",
    },
    defect_count: currentLog.defectCount,
    detections: currentLog.detections,
    image_id: currentLog.id,
  } : null);

  const isPass = currentResult?.overall_status === "PASS";
  const isFail = currentResult?.overall_status === "REJECT";
  const isReview = !isPass && !isFail && Boolean(currentResult);

  const firstDetection = currentResult?.detections?.[0];
  const topDefect = (firstDetection && ("defect_type" in firstDetection ? firstDetection.defect_type : (firstDetection as { defectType?: string }).defectType)) || "No defects detected";
  const defectDetails = getPlainEnglishDefectExplanation(topDefect);

  return (
    <div className="aa-operator-workspace">
      <ModelProcessingOverlay
        active={scanning}
        title="Floor AI Camera Scanning Active"
        subtitle="Analyzing brake rotor surface on Conveyor Line 1. Click and scroll are disabled until the safety verdict is ready."
      />
      {/* Header */}
      <div className="aa-page-heading aa-operator-header">
        <div>
          <div className="eyebrow"><span className="eyebrow-line"/>FLOOR OPERATOR WORKSPACE · CONVEYOR LINE 1</div>
          <h1>Operator Quality Station</h1>
          <p>Instant traffic-light results for factory floor workers. Clear instructions with zero technical jargon.</p>
        </div>
        <div className="aa-page-actions">
          <span className="aa-operator-user-pill" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <AppIcon name="operator" size={16} color="#0284c7" /> <b>Rajesh Kumar</b> · Operator on Shift 1
          </span>
          <span className={`aa-badge ${backendOnline ? "passed" : "neutral"}`}>
            {backendOnline ? `AI CAMERA ONLINE (${inferenceMode.toUpperCase()})` : "CAMERA OFFLINE"}
          </span>
          {processingTimeMs !== null && (
            <span className="aa-badge passed" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <AppIcon name="clock" size={13} /> {(processingTimeMs / 1000).toFixed(2)}s SCAN TIME
            </span>
          )}
        </div>
      </div>

      {/* Quick Shift Counter */}
      <div className="aa-operator-stats-grid">
        <div className="aa-operator-stat-card">
          <span>PARTS SCANNED THIS SHIFT</span>
          <b>{shiftInspected}</b>
          <small>Total inspected today</small>
        </div>
        <div className="aa-operator-stat-card pass">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><AppIcon name="check" size={14} color="#16a34a" /> GOOD TO SHIP</span>
          <b>{shiftPassed}</b>
          <small>{shiftInspected ? ((shiftPassed / shiftInspected) * 100).toFixed(1) : 100}% passed inspection</small>
        </div>
        <div className="aa-operator-stat-card fail">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><AppIcon name="cross" size={14} color="#dc2626" /> DEFECTIVE (SET ASIDE)</span>
          <b>{shiftFailed}</b>
          <small>Put in Red Scrap Bin #3</small>
        </div>
        <div className="aa-operator-stat-card review">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><AppIcon name="alert" size={14} color="#d97706" /> AWAITING QA REVIEW</span>
          <b>{shiftReview}</b>
          <small>In Yellow Quarantine Rack</small>
        </div>
      </div>

      {/* Main Floor Action Center */}
      <div className="aa-operator-main-grid">
        {/* Left: Traffic light verdict & Actions */}
        <div className="aa-operator-verdict-section">
          {scanning ? (
            <div className="panel aa-operator-verdict-box scanning">
              <div className="aa-operator-spinner"/>
              <h2>Scanning Rotor with AI Vision...</h2>
              <p>Checking surface friction ring, bolt holes, and cooling vanes for cracks or scratches.</p>
            </div>
          ) : currentResult ? (
            <div className={`panel aa-operator-verdict-box ${isPass ? "pass" : isFail ? "fail" : "review"}`}>
              <div className="aa-operator-verdict-badge">
                <span className="aa-verdict-icon">{isPass ? <AppIcon name="check" size={26} color="#16a34a" /> : isFail ? <AppIcon name="cross" size={26} color="#dc2626" /> : <AppIcon name="alert" size={26} color="#d97706" />}</span>
                <div>
                  <span className="aa-verdict-small">FINAL FLOOR VERDICT</span>
                  <h2>{isPass ? "PASS — APPROVED TO ASSEMBLE" : isFail ? "REJECT — DO NOT ASSEMBLE" : "QUARANTINE — HOLD FOR QA"}</h2>
                </div>
              </div>

              {processingTimeMs !== null && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#334155", background: "rgba(255,255,255,0.85)", padding: "4px 12px", borderRadius: "999px", marginBottom: "12px", border: "1px solid #cbd5e1" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><AppIcon name="clock" size={13} /> <b>Model Scan Duration:</b></span>
                  <span>{(processingTimeMs / 1000).toFixed(2)}s ({processingTimeMs} ms)</span>
                </div>
              )}

              <div className="aa-operator-action-banner">
                <strong>OPERATOR ACTION REQUIRED:</strong>
                <span>{isPass ? "Place this part into GREEN FINISHED GOODS BIN #1 for vehicle packaging." : defectDetails.actionText}</span>
              </div>

              <div className="aa-operator-plain-explanation">
                <h3>What the camera saw:</h3>
                {isPass ? (
                  <p>
                    This brake disc is <b>smooth, clean, and in perfect condition</b>.
                    No cracks, scoring grooves, or casting voids were found. Friction surfaces meet automotive safety tolerances.
                  </p>
                ) : (
                  <div>
                    <p><b>Problem Found: {defectDetails.plainName}</b></p>
                    <p>{defectDetails.description}</p>
                    <p className="aa-operator-why-bad">
                      <b>Why this matters:</b> Defective rotors cause brake shudder, pedal pulsing, and can fail under heavy stopping pressure on the road.
                    </p>
                  </div>
                )}
              </div>

              {/* Maintenance Callout */}
              {!isPass && (
                <div className="aa-operator-alert-actions">
                  <WhatsAppDispatchAction
                    details={{
                      station: "ST-02 CNC Lathe",
                      failureMode: topDefect,
                      rpn: 180,
                      action: `Operator Rajesh Kumar quarantined part ${currentResult.image_id}. Please inspect cutting tooling insert.`,
                      partId: currentResult.image_id,
                      dispatchKey: `operator:${currentResult.image_id}`,
                    }}
                    thresholdLabel="Call Maintenance Technician to Station 2"
                  />
                  <button className="button button-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => navigate("Human Review", currentResult.image_id)}>
                    <AppIcon name="quality" size={14} color="#0284c7" /> Send to Quality Engineer Lab
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="panel aa-operator-verdict-box empty">
              <span className="aa-operator-big-icon"><AppIcon name="camera" size={38} color="#94a3b8" /></span>
              <h2>Ready for Next Brake Rotor</h2>
              <p>Place the component on the turntable fixture and scan or upload an inspection photo below.</p>
            </div>
          )}

          {/* Quick upload drop zone */}
          <section
            className={`panel aa-operator-scan-card ${scanning ? "scanning" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!scanning && e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                e.currentTarget.value = "";
              }}
            />
            <div className="aa-operator-scan-content">
              <span className="aa-scan-camera-icon"><AppIcon name="camera" size={24} color="#0284c7" /></span>
              <div>
                <b>{scanning ? "Processing Brake Disc..." : "Scan or Choose Brake Rotor Photo"}</b>
                <span>Click here or drag a rotor photo taken at the inspection station</span>
              </div>
              <button
                className="button button-primary aa-operator-scan-btn"
                disabled={scanning}
                onClick={() => fileInputRef.current?.click()}
              >
                {scanning ? "Analyzing…" : "+ Take / Choose Photo"}
              </button>
            </div>
            {errorMsg && <div className="aa-operator-error" role="alert" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><AppIcon name="alert" size={14} color="#dc2626" /> {errorMsg}</div>}
          </section>

          <div className="aa-sample-quick-bar">
            <span className="aa-sample-quick-title">Test Demo Rotor:</span>
            <button type="button" className="aa-sample-quick-chip" disabled={scanning} onClick={() => void loadSampleImage("/samples/sample_rotor_crack.jpg", "sample_rotor_crack.jpg")}>
              <span className="sample-chip-indicator red" /> Load Defective Rotor (Red Bin #3)
            </button>
            <button type="button" className="aa-sample-quick-chip" disabled={scanning} onClick={() => void loadSampleImage("/samples/sample_rotor_clean.jpg", "sample_rotor_clean.jpg")}>
              <span className="sample-chip-indicator green" /> Load Conforming Rotor (Green Ship)
            </button>
          </div>
        </div>

        {/* Right: Preview & Shift Safety Checklist */}
        <div className="aa-operator-side-panel">
          {/* Visual Preview */}
          <div className="panel aa-operator-preview-card">
            <div className="panel-heading">
              <div>
                <h2>Part Camera View</h2>
                <p>{file ? file.name : currentLog ? currentLog.fileName : "No image loaded yet"}</p>
              </div>
              {currentResult && (
                <span className={`aa-badge ${isPass ? "passed" : isFail ? "reject" : isReview ? "review" : "neutral"}`}>
                  {isPass ? "GOOD" : isFail ? "DEFECTIVE" : isReview ? "AWAITING QA" : "STANDBY"}
                </span>
              )}
            </div>

            <div className="aa-operator-img-wrap">
              {preview ? (
                <Image unoptimized src={preview} width={400} height={400} alt="Brake component preview" className="aa-operator-img"/>
              ) : currentLog?.thumbnailDataUrl ? (
                <Image unoptimized src={currentLog.thumbnailDataUrl} width={400} height={400} alt="Brake component thumbnail" className="aa-operator-img"/>
              ) : (
                <div className="aa-operator-img-placeholder">
                  <span><AppIcon name="disc" size={36} color="#cbd5e1" /></span>
                  <small>Camera preview appears here</small>
                </div>
              )}
            </div>
          </div>

          {/* Shift Safety Checklist */}
          <div className="panel aa-operator-checklist-card">
            <div className="panel-heading">
              <div>
                <h2>Station Shift Checklist</h2>
                <p>Standard operating procedure (SOP) before starting</p>
              </div>
            </div>
            <div className="aa-operator-checklist">
              <label className="aa-maintenance-check">
                <input
                  type="checkbox"
                  checked={checklist.lensClean}
                  onChange={(e) => setChecklist({ ...checklist, lensClean: e.target.checked })}
                />
                <span>Camera lens wiped clean of oil & metal dust</span>
              </label>
              <label className="aa-maintenance-check">
                <input
                  type="checkbox"
                  checked={checklist.rotorSeated}
                  onChange={(e) => setChecklist({ ...checklist, rotorSeated: e.target.checked })}
                />
                <span>Rotor seated flat on magnetic fixture</span>
              </label>
              <label className="aa-maintenance-check">
                <input
                  type="checkbox"
                  checked={checklist.lightingGood}
                  onChange={(e) => setChecklist({ ...checklist, lightingGood: e.target.checked })}
                />
                <span>Ring light illumination steady & calibrated</span>
              </label>
              <label className="aa-maintenance-check">
                <input
                  type="checkbox"
                  checked={checklist.binReady}
                  onChange={(e) => setChecklist({ ...checklist, binReady: e.target.checked })}
                />
                <span>Red Bin #3 (Scrap) and Green Bin #1 in place</span>
              </label>
            </div>
          </div>

          {/* Navigation link for advanced analysis */}
          <div className="panel aa-operator-help-card">
            <b>Need Help or Detailed Engineering Data?</b>
            <p>If you suspect an unclassified anomaly or need deeper analysis, open the Quality Lab.</p>
            <div className="aa-operator-help-actions">
              <button className="button button-secondary" onClick={() => navigate("AI Inspection Studio", currentResult?.image_id)}>
                Open Full AI Studio →
              </button>
              <button className="button button-secondary" onClick={() => navigate("Inspection History")}>
                View Shift Log →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
