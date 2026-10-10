"use client";

import { USERS, type UserRole } from "../../lib/auth";
import type { ViewName } from "./Views";
import { AppIcon, type AppIconName } from "./AppIcon";

interface LandingPageProps {
  onGoToLogin: () => void;
  onSelectRoleAndEnter: (role: UserRole) => void;
  backendOnline: boolean;
  inferenceMode: string;
}

export function LandingPage({
  onGoToLogin,
  onSelectRoleAndEnter,
  backendOnline,
  inferenceMode,
}: LandingPageProps) {
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

  const roles = [
    {
      key: "operator" as UserRole,
      title: "Plant Floor Operator",
      name: "Rajesh Kumar",
      phone: "+9190251763336",
      iconName: "operator" as AppIconName,
      badge: "passed",
      targetView: "Operator Station" as ViewName,
      highlight: "Unmistakable Green/Red traffic lights and physical bin guidance.",
    },
    {
      key: "quality_engineer" as UserRole,
      title: "Quality Assurance Engineer",
      name: "Priya Sharma",
      phone: "+917736831052",
      iconName: "quality" as AppIconName,
      badge: "neutral",
      targetView: "AI Inspection Studio" as ViewName,
      highlight: "YOLO segmentation masks, DTV runout tolerances & quarantine queue.",
    },
    {
      key: "maintenance" as UserRole,
      title: "Tooling & Maintenance",
      name: "Vikram Singh",
      phone: "+918951349166",
      iconName: "maintenance" as AppIconName,
      badge: "review",
      targetView: "Fault Intelligence Board" as ViewName,
      highlight: "Machine vibration drift alerts, polar heatmaps & tooling insert checklists.",
    },
    {
      key: "manager" as UserRole,
      title: "Plant Operations Director",
      name: "Anand Verma",
      phone: "+918296102292",
      iconName: "manager" as AppIconName,
      badge: "reject",
      targetView: "Main Dashboard" as ViewName,
      highlight: "Plain-language shift briefing, First-Pass Yield vs 95% target & scrap costs.",
    },
  ];

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
              Intelligent Quality Gate &amp; Vision Inspection for Automotive Brake Discs
            </h1>
            <p className="aa-landing-subhead">
              Sub-second YOLO neural defect detection, micron-level metrology checks, and zero-jargon WhatsApp dispatch across the manufacturing hierarchy.
            </p>

            <div className="aa-hero-cta-group">
              <button className="button button-primary aa-hero-primary-btn" onClick={onGoToLogin}>
                <AppIcon name="rocket" size={17} /> Enter Plant Workstation
              </button>
              <a href="#personas" className="button button-secondary aa-hero-secondary-btn">
                <AppIcon name="operator" size={15} /> Select Your Persona
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
                <b>4 Roles</b>
                <span>Plant Personas</span>
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
              <div className="aa-visual-live-tag">
                <span className="live-ping" />
                <span>LIVE VISION PIPELINE</span>
              </div>
              <span className="aa-visual-model-tag">YOLOv8-SEG · 100 FPS</span>
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

        {/* 4 Steps Section */}
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

        {/* 4 Roles Section */}
        <section id="personas" className="aa-landing-section">
          <div className="aa-section-title-wrap">
            <div className="eyebrow"><span className="eyebrow-line"/>PLANT ROLES</div>
            <h2>Choose Your Workstation Persona</h2>
            <p>Select any persona to open your tailored dashboard with role-specific views and metrics</p>
          </div>

          <div className="aa-roles-grid">
            {roles.map((r) => {
              const user = USERS[r.key];
              return (
                <article className="aa-role-card" key={r.key}>
                  <div className="aa-role-card-header">
                    <div className={`avatar aa-role-avatar-lg ${r.badge}`}>
                      {user.avatar}
                    </div>
                    <div>
                      <span className="aa-role-lvl-badge">{user.hierarchyTitle}</span>
                      <h3>{r.name}</h3>
                      <b>{r.title}</b>
                    </div>
                  </div>

                  <div className="aa-role-card-phone">
                    <AppIcon name="phone" size={12} color="#059669" />
                    <span>WhatsApp: {r.phone}</span>
                  </div>

                  <p className="aa-role-card-highlight">{r.highlight}</p>

                  <div className="aa-role-card-actions">
                    <button
                      className="button button-primary aa-role-enter-btn"
                      onClick={() => onSelectRoleAndEnter(r.key)}
                    >
                      Sign In as {user.name.split(" ")[0]} →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* System Specs Section */}
        <section id="specs" className="aa-landing-specs-banner">
          <div>
            <h3>Built for High-Speed Automotive Manufacturing</h3>
            <p>Ready for brake discs, drums, clutch plates, and precision rotational castings.</p>
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
