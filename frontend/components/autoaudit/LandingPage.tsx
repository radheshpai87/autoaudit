"use client";

import { useState } from "react";
import { USERS, type UserRole } from "../../lib/auth";
import type { ViewName } from "./Views";
import { AppIcon, type AppIconName } from "./AppIcon";

interface LandingPageProps {
  onGoToLogin: () => void;
  onSelectRoleAndEnter: (role: UserRole) => void;
  backendOnline: boolean;
  inferenceMode: string;
}

interface PlantPersona {
  key: UserRole;
  tierLevel: string;
  tierTag: string;
  department: string;
  station: string;
  name: string;
  title: string;
  avatar: string;
  badgeTone: "passed" | "neutral" | "review" | "reject";
  iconName: AppIconName;
  phone: string;
  mission: string;
  ownedKpis: Array<{ label: string; target: string }>;
  workstationView: ViewName;
  workstationTitle: string;
  permissions: string[];
  sampleEscalation: {
    trigger: string;
    message: string;
  };
}

export function LandingPage({
  onGoToLogin,
  onSelectRoleAndEnter,
  backendOnline,
  inferenceMode,
}: LandingPageProps) {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | "all">("all");

  const steps: Array<{ num: string; iconName: AppIconName; title: string; tag: string; desc: string }> = [
    {
      num: "01",
      iconName: "camera",
      title: "Optical Conveyor Scan",
      tag: "HIGH RESOLUTION",
      desc: "Synchronized industrial cameras capture high-resolution imagery as rotors transit the conveyor line.",
    },
    {
      num: "02",
      iconName: "bolt",
      title: "Neural Defect Detection",
      tag: "< 1.0s LATENCY",
      desc: "YOLOv8 deep vision identifies micro-cracks, scoring grooves, and casting porosities in real time.",
    },
    {
      num: "03",
      iconName: "ruler",
      title: "Metrology & Runout Limits",
      tag: "≤ 5 µm PRECISION",
      desc: "Verifies disc thickness variation (DTV) and lateral runout against strict automotive safety limits.",
    },
    {
      num: "04",
      iconName: "phone",
      title: "Plain-English Dispatch",
      tag: "INSTANT ESCALATION",
      desc: "Sends zero-jargon WhatsApp instructions directly to the floor operator, QA engineer, or maintenance.",
    },
  ];

  const plantPersonas: PlantPersona[] = [
    {
      key: "operator",
      tierLevel: "LEVEL 1",
      tierTag: "TACTICAL FLOOR EXECUTION",
      department: "Production Line 1 · Final Assembly",
      station: "Station 04 · High-Speed Optical Gate",
      name: "Rajesh Kumar",
      title: "Plant Floor Operator",
      avatar: "RK",
      badgeTone: "passed",
      iconName: "operator",
      phone: "+91 90251 76336",
      mission: "Executes continuous conveyor throughput, performs sub-second Go / No-Go optical triage, and routes non-conforming parts into automated sorting chutes.",
      ownedKpis: [
        { label: "Station Takt Time", target: "< 1.2s" },
        { label: "Zero-Defect Escapes", target: "100.0%" },
        { label: "Chute Accuracy", target: "99.9%" },
      ],
      workstationView: "Operator Station",
      workstationTitle: "Operator Station (Go / No-Go Traffic Lights & Audible Chutes)",
      permissions: ["High-Throughput Optical Scanning", "Pneumatic Chute Divert", "Shift Takt Counter"],
      sampleEscalation: {
        trigger: "Consecutive Reject Spike",
        message: "DISPATCH [STN-04]: 3 consecutive rotors flagged for surface scoring. Check pneumatic conveyor guides immediately.",
      },
    },
    {
      key: "quality_engineer",
      tierLevel: "LEVEL 2",
      tierTag: "METROLOGY & DEFECT ASSURANCE",
      department: "Metrology & Standards Laboratory",
      station: "Station 06 · AI Vision Inspection Studio",
      name: "Priya Sharma",
      title: "Quality Assurance Engineer",
      avatar: "PS",
      badgeTone: "neutral",
      iconName: "quality",
      phone: "+91 77368 31052",
      mission: "Performs deep AI defect classification, inspects microscopic crack segmentations, validates disc thickness variation (DTV) against micron tolerances, and dispatches quarantine dispositions.",
      ownedKpis: [
        { label: "First-Pass Yield (FPY)", target: "≥ 95.0%" },
        { label: "Defect PPM", target: "< 50 PPM" },
        { label: "Metrology Runout (DTV)", target: "≤ 5.0 µm" },
      ],
      workstationView: "AI Inspection Studio",
      workstationTitle: "AI Inspection Studio & Human Review Quarantine Queue",
      permissions: ["Defect Mask & Confidence Triage", "Quarantine Disposition / Release", "SPC Tolerance Calibration"],
      sampleEscalation: {
        trigger: "Critical Structural Defect Flagged",
        message: "QA ESCALATION: Severe Thermal Crack (94.2% conf) on Rotor #340-9281. Quarantined in Bin C for metrology sign-off.",
      },
    },
    {
      key: "maintenance",
      tierLevel: "LEVEL 3",
      tierTag: "PLANT RELIABILITY & ASSET CARE",
      department: "Plant Reliability & CNC Tooling Bay",
      station: "Station 02 · Rough & Finish CNC Lathe Bay",
      name: "Vikram Singh",
      title: "Lead Tooling & Maintenance Specialist",
      avatar: "VS",
      badgeTone: "review",
      iconName: "maintenance",
      phone: "+91 89513 49166",
      mission: "Monitors spindle vibration drift, analyzes polar rotor wear heatmaps, and executes preventative tool insert changes before mechanical drift causes defective batches.",
      ownedKpis: [
        { label: "MTBF (Mean Time to Failure)", target: "> 450 hrs" },
        { label: "Spindle Runout Drift", target: "< 8.0 µm" },
        { label: "Tool Insert Cycle Life", target: "98.5%" },
      ],
      workstationView: "Fault Intelligence Board",
      workstationTitle: "Fault Intelligence Board & Spindle Vibration Diagnostics",
      permissions: ["Polar Heatmap Vibration Diagnostics", "Machine Offset Recalibration", "Tooling Replacement Sign-Off"],
      sampleEscalation: {
        trigger: "Predictive Tool Wear Drift Anomaly",
        message: "PREDICTIVE ALERT: Lathe CNC-04 lateral runout drifting (+8.4µm). Replace carbide insert #C-2 at next cycle.",
      },
    },
    {
      key: "manager",
      tierLevel: "LEVEL 4",
      tierTag: "STRATEGIC PLANT GOVERNANCE",
      department: "Executive Plant Operations",
      station: "Central Plant Command Center",
      name: "Anand Verma",
      title: "Plant Operations Director",
      avatar: "AV",
      badgeTone: "reject",
      iconName: "manager",
      phone: "+91 82961 02292",
      mission: "Directs multi-line manufacturing performance, monitors plant-wide OEE and First-Pass Yield vs 95% SLA, mitigates scrap financial loss, and verifies IATF 16949 audit compliance.",
      ownedKpis: [
        { label: "Overall Plant FPY", target: "≥ 95.0% Target" },
        { label: "Plant OEE Index", target: "≥ 88.0%" },
        { label: "Audit Trail Compliance", target: "100.0%" },
      ],
      workstationView: "Main Dashboard",
      workstationTitle: "Executive Operations Dashboard & Shift Briefing Matrix",
      permissions: ["Plant-Wide Operational Governance", "Financial Scrap Analysis", "IATF 16949 Audit Export"],
      sampleEscalation: {
        trigger: "Shift Completion & Yield Wrap-up",
        message: "SHIFT BRIEF: Shift A finished. 1,420 rotors inspected. Plant FPY: 96.4%. Scrap cost avoided: $1,840. All lines nominal.",
      },
    },
  ];

  const closedLoopStages = [
    {
      step: "01",
      roleKey: "operator" as UserRole,
      roleTitle: "Line Operator",
      stageTitle: "Floor Triage & Gating",
      tag: "TAKT TIME < 1.2s",
      desc: "Optical conveyor camera captures rotor; sub-second YOLO inference renders green/red traffic light. Suspect part is diverted into physical quarantine chute without stopping line.",
    },
    {
      step: "02",
      roleKey: "quality_engineer" as UserRole,
      roleTitle: "QA Engineer",
      stageTitle: "Deep Metrology & Verification",
      tag: "≤ 5.0 µm DTV CHECK",
      desc: "Microscopic defect polygons and Disc Thickness Variation (DTV) are measured. Structural crack severity is graded, and disposition (Scrap vs Rework vs Release) is officially logged.",
    },
    {
      step: "03",
      roleKey: "maintenance" as UserRole,
      roleTitle: "Maintenance Lead",
      stageTitle: "Predictive Tool Recalibration",
      tag: "EARLY VIBRATION WARNING",
      desc: "Polar wear heatmaps correlate recurring defects with Spindle #4 vibration drift. Technician receives instant WhatsApp dispatch to swap worn carbide insert before bulk failure.",
    },
    {
      step: "04",
      roleKey: "manager" as UserRole,
      roleTitle: "Plant Director",
      stageTitle: "Executive Yield & Governance",
      tag: "FPY ≥ 95% SLA AUDIT",
      desc: "Plain-language shift briefing calculates total scrap dollars saved, First-Pass Yield trends across all lines, and generates tamper-proof IATF 16949 compliance audit certificates.",
    },
  ];

  const industrialStandards = [
    {
      title: "ISA-95 Hierarchy",
      desc: "Seamless enterprise integration from Level 1 sensor triage to Level 4 ERP operations.",
      icon: "factory" as AppIconName,
    },
    {
      title: "Autonomous WhatsApp Dispatch",
      desc: "Zero-jargon, role-targeted directives dispatched in <1s directly to responsible staff.",
      icon: "phone" as AppIconName,
    },
    {
      title: "IATF 16949 / ISO 9001",
      desc: "Complete digital traceability, tamper-proof logs, and automated compliance certificates.",
      icon: "shield" as AppIconName,
    },
    {
      title: "Sub-Second Edge Vision",
      desc: "Edge-accelerated YOLOv8 deep vision engine operating at full conveyor line speed.",
      icon: "bolt" as AppIconName,
    },
  ];

  const displayedPersonas =
    selectedRoleFilter === "all"
      ? plantPersonas
      : plantPersonas.filter((p) => p.key === selectedRoleFilter);

  return (
    <div className="aa-landing-page-root">
      {/* Top Navbar */}
      <nav className="aa-landing-navbar">
        <div className="aa-landing-nav-brand">
          <span className="aa-brand-symbol">
            <AppIcon name="disc" size={20} color="#2563eb" />
          </span>
          <div>
            <b>AutoAudit AI</b>
            <small>Brake Quality Gate</small>
          </div>
        </div>

        <div className="aa-landing-nav-links">
          <a href="#pipeline">Quality Pipeline</a>
          <a href="#personas">Plant Personas</a>
          <a href="#closed-loop">Closed-Loop Flow</a>
          <a href="#specs">Specifications</a>
        </div>

        <div className="aa-landing-nav-cta">
          <span className="aa-landing-status-badge">
            <span className={`status-dot ${backendOnline ? "online" : "offline"}`} />
            {backendOnline ? `AI Online (${inferenceMode.toUpperCase()})` : "Standalone Mode"}
          </span>
          <button className="button button-primary aa-nav-signin-btn" onClick={onGoToLogin}>
            Sign In to Portal <AppIcon name="chevronRight" size={14} />
          </button>
        </div>
      </nav>

      <main className="aa-landing-main-wrap">
        {/* Hero Section */}
        <section className="aa-landing-hero-section">
          <div className="aa-hero-content">
            <div className="aa-landing-badge">
              <span className="aa-landing-badge-dot" />
              <span>INDUSTRY 4.0 · AUTOMATED COMPUTER VISION</span>
            </div>
            <h1 className="aa-landing-headline">
              Automated Vision Inspection. <br />
              <span style={{ color: "#334155", fontWeight: 750 }}>Intelligent Quality Gate for Brake Discs.</span>
            </h1>
            <p className="aa-landing-subhead">
              Sub-second neural defect segmentation, micron-level metrology checks, and instant zero-jargon WhatsApp dispatch across the plant hierarchy.
            </p>

            <div className="aa-hero-cta-group">
              <button className="button button-primary aa-hero-primary-btn" onClick={onGoToLogin}>
                <AppIcon name="rocket" size={15} /> Enter Plant Workstation
              </button>
              <a href="#personas" className="button button-secondary aa-hero-secondary-btn">
                <AppIcon name="operator" size={14} /> Explore Plant Personas
              </a>
            </div>

            <div className="aa-hero-stats-row">
              <div className="aa-hero-stat">
                <b>&lt; 1.0s</b>
                <span>Inference Time</span>
              </div>
              <div className="aa-hero-stat">
                <b>≤ 5 µm</b>
                <span>DTV Tolerance</span>
              </div>
              <div className="aa-hero-stat">
                <b>4 Tiers</b>
                <span>Plant Roles</span>
              </div>
              <div className="aa-hero-stat">
                <b>100%</b>
                <span>Audit Trail</span>
              </div>
            </div>
          </div>

          {/* Visual Interactive Rotor Card */}
          <div className="aa-hero-visual-card">
            <div className="aa-hero-visual-top">
              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444" }} />
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f59e0b" }} />
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#a1a1aa", marginLeft: "5px" }}>cam-01/rotor_stream</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span className="live-ping" />
                <span className="aa-visual-model-tag">YOLOv8-SEG · 100 FPS</span>
              </div>
            </div>

            <div className="aa-visual-preview-stage">
              <div className="aa-visual-scan-sweep" />
              <div className="aa-visual-rotor-graphic">
                <div className="aa-rotor-disc-circle">
                  <div className="aa-rotor-hat-circle">
                    <div className="aa-rotor-center-bore" />
                    <div className="aa-rotor-bolt bolt-1" />
                    <div className="aa-rotor-bolt bolt-2" />
                    <div className="aa-rotor-bolt bolt-3" />
                    <div className="aa-rotor-bolt bolt-4" />
                    <div className="aa-rotor-bolt bolt-5" />
                  </div>
                  <div className="aa-detection-sample-box">
                    <span>THERMAL CRACK · 94% CONF</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="aa-visual-meta-bar">
              <div>
                <small>COMPONENT TYPE</small>
                <b>Ventilated Rotor 340mm</b>
              </div>
              <div>
                <small>VERDICT</small>
                <span className="aa-badge passed">PASS · ROAD READY</span>
              </div>
              <div>
                <small>METROLOGY</small>
                <b>DTV 2.1 µm (PASS)</b>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Steps Pipeline Section */}
        <section id="pipeline" className="aa-landing-section">
          <div className="aa-section-title-wrap">
            <div className="eyebrow"><span className="eyebrow-line"/>END-TO-END FLOW</div>
            <h2>Four-Step Brake Quality Pipeline</h2>
            <p>From camera capture on the conveyor line to instant hierarchy alert dispatch</p>
          </div>

          <div className="aa-pipeline-grid">
            {steps.map((step) => (
              <div className="aa-pipeline-card" key={step.num}>
                <div className="aa-pipeline-card-head">
                  <span className="aa-pipeline-num">{step.num}</span>
                  <span className="aa-pipeline-icon">
                    <AppIcon name={step.iconName} size={20} color="#2563eb" />
                  </span>
                  <span className="aa-pipeline-tag">{step.tag}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Industry-Grade Plant Personas Section */}
        <section id="personas" className="aa-landing-section aa-personas-section">
          <div className="aa-section-title-wrap">
            <div className="eyebrow"><span className="eyebrow-line"/>PLANT OPERATIONAL HIERARCHY · ISA-95</div>
            <h2>Role-Based Plant Governance & Operational Hierarchy</h2>
            <p>
              AutoAudit aligns each layer of the manufacturing plant with purpose-built workstations, role-specific KPI ownership, strict access boundaries, and direct WhatsApp escalation channels.
            </p>
          </div>

          {/* Plant Operational Filter Strip */}
          <div className="aa-persona-filter-strip">
            <span className="aa-filter-label">Filter Hierarchy:</span>
            <button
              className={`aa-filter-chip ${selectedRoleFilter === "all" ? "active" : ""}`}
              onClick={() => setSelectedRoleFilter("all")}
            >
              All 4 Operational Tiers
            </button>
            {plantPersonas.map((p) => (
              <button
                key={p.key}
                className={`aa-filter-chip ${selectedRoleFilter === p.key ? "active" : ""}`}
                onClick={() => setSelectedRoleFilter(p.key)}
              >
                <AppIcon name={p.iconName} size={13} />
                {p.tierLevel}: {p.name.split(" ")[0]} ({p.title.replace("Plant ", "").replace("Lead ", "")})
              </button>
            ))}
          </div>

          {/* 4 Persona Cards Grid */}
          <div className="aa-roles-grid">
            {displayedPersonas.map((p) => {
              const user = USERS[p.key];
              return (
                <article className="aa-persona-card" key={p.key}>
                  {/* Card Header: Tier Badge & Station Location */}
                  <div className="aa-persona-card-top">
                    <div className="aa-persona-tier-pill">
                      <span className={`aa-tier-dot ${p.badgeTone}`} />
                      <b>{p.tierLevel}</b>
                      <span>·</span>
                      <small>{p.tierTag}</small>
                    </div>
                    <span className="aa-persona-station-tag">{p.station}</span>
                  </div>

                  {/* Profile Block: Avatar, Name, Official Plant Title */}
                  <div className="aa-persona-profile-row">
                    <div className={`avatar aa-persona-avatar ${p.badgeTone}`}>
                      {user.avatar}
                    </div>
                    <div className="aa-persona-profile-info">
                      <h3>{p.name}</h3>
                      <b>{p.title}</b>
                      <span className="aa-persona-dept">{p.department}</span>
                    </div>
                  </div>

                  {/* Operational Mandate / Mission */}
                  <div className="aa-persona-mandate">
                    <strong>Operational Mandate:</strong>
                    <p>{p.mission}</p>
                  </div>

                  {/* Owned KPIs Row */}
                  <div className="aa-persona-kpi-panel">
                    <div className="aa-kpi-panel-title">
                      <AppIcon name="target" size={12} color="#2563eb" />
                      <span>OWNED PLANT KPIS</span>
                    </div>
                    <div className="aa-kpi-chips-grid">
                      {p.ownedKpis.map((kpi, idx) => (
                        <div className="aa-kpi-chip" key={idx}>
                          <span className="aa-kpi-label">{kpi.label}</span>
                          <b className="aa-kpi-target">{kpi.target}</b>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dedicated Cockpit Workstation */}
                  <div className="aa-persona-workstation-row">
                    <div className="aa-ws-label">
                      <AppIcon name="factory" size={12} color="#475569" />
                      <span>PRIMARY WORKSTATION</span>
                    </div>
                    <div className="aa-ws-badge">
                      <span className="aa-ws-dot" />
                      <b>{p.workstationTitle}</b>
                    </div>
                  </div>

                  {/* Real-Time WhatsApp Escalation Channel */}
                  <div className="aa-persona-whatsapp-box">
                    <div className="aa-wa-head">
                      <div className="aa-wa-id">
                        <AppIcon name="phone" size={12} color="#059669" />
                        <b>WhatsApp Escalation Channel</b>
                      </div>
                      <span className="aa-wa-phone">{p.phone}</span>
                    </div>
                    <div className="aa-wa-preview-bubble">
                      <div className="aa-wa-trigger-tag">
                        <span className="live-ping" />
                        <span>TRIGGER: {p.sampleEscalation.trigger.toUpperCase()}</span>
                      </div>
                      <p className="aa-wa-msg-text">&ldquo;{p.sampleEscalation.message}&rdquo;</p>
                    </div>
                  </div>

                  {/* Sign In CTA */}
                  <div className="aa-persona-card-footer">
                    <button
                      className="button button-primary aa-persona-launch-btn"
                      onClick={() => onSelectRoleAndEnter(p.key)}
                      title={`Launch tailored workstation as ${p.name}`}
                    >
                      <AppIcon name={p.iconName} size={14} />
                      Sign In as {p.name.split(" ")[0]} ({p.title.split(" ")[0]}) →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Closed-Loop Manufacturing Governance Flow */}
        <section id="closed-loop" className="aa-landing-section aa-closed-loop-section">
          <div className="aa-section-title-wrap">
            <div className="eyebrow"><span className="eyebrow-line"/>CLOSED-LOOP QUALITY CONTROL</div>
            <h2>How Plant Roles Interlock in Real Time</h2>
            <p>
              When a defect occurs on the conveyor line, AutoAudit triggers an automated, closed-loop escalation chain connecting floor execution directly to executive governance.
            </p>
          </div>

          <div className="aa-closed-loop-grid">
            {closedLoopStages.map((stage, idx) => (
              <div className="aa-closed-loop-card" key={stage.step}>
                <div className="aa-cl-step-head">
                  <span className="aa-cl-num">{stage.step}</span>
                  <span className="aa-cl-role-tag">{stage.roleTitle}</span>
                  <span className="aa-cl-metric-tag">{stage.tag}</span>
                </div>
                <h3>{stage.stageTitle}</h3>
                <p>{stage.desc}</p>
                {idx < closedLoopStages.length - 1 && (
                  <div className="aa-cl-connector-arrow">
                    <AppIcon name="chevronRight" size={14} color="#94a3b8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Industrial Standards & Architectural Compliance */}
        <section className="aa-landing-section aa-standards-section">
          <div className="aa-standards-grid">
            {industrialStandards.map((item, idx) => (
              <div className="aa-standard-item" key={idx}>
                <div className="aa-standard-icon-wrap">
                  <AppIcon name={item.icon} size={18} color="#2563eb" />
                </div>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* System Specs Section */}
        <section id="specs" className="aa-landing-specs-banner">
          <div>
            <h3>Built for High-Speed Automotive Manufacturing</h3>
            <p>Precision quality gating engineered for brake discs, drums, clutch plates, and critical rotational castings.</p>
          </div>
          <button className="button button-primary aa-specs-cta" onClick={onGoToLogin}>
            Launch Workstation Now <AppIcon name="rocket" size={15} />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="aa-landing-footer">
        <div>
          <b>AutoAudit AI</b>
          <span>Automated Manufacturing Quality Intelligence · 2026</span>
        </div>
        <div>
          <button className="button button-secondary small-button" onClick={onGoToLogin}>
            Sign In to Portal
          </button>
        </div>
      </footer>
    </div>
  );
}
