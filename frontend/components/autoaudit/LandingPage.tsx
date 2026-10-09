"use client";

import { USERS, type UserRole } from "../../lib/auth";
import type { ViewName } from "./Views";
import { AppIcon, type AppIconName } from "./AppIcon";

interface LandingPageProps {
  onEnterApp: () => void;
  onSwitchRole: (role: UserRole) => void;
  onNavigate: (view: ViewName) => void;
  backendOnline: boolean;
  inferenceMode: string;
}

export function LandingPage({
  onEnterApp,
  onSwitchRole,
  onNavigate,
  backendOnline,
  inferenceMode,
}: LandingPageProps) {
  const steps: Array<{ num: string; iconName: AppIconName; title: string; desc: string }> = [
    {
      num: "01",
      iconName: "camera",
      title: "Floor Camera Capture",
      desc: "Industrial cameras photograph brake rotors moving along the production conveyor line.",
    },
    {
      num: "02",
      iconName: "bolt",
      title: "YOLOv8 AI Defect Detection",
      desc: "Our neural vision model scans the surface for micro-cracks, deep scoring grooves, and metal porosity in under 1 second.",
    },
    {
      num: "03",
      iconName: "ruler",
      title: "Metrology & Safety Check",
      desc: "Measures disc thickness variation (DTV) and lateral runout against strict automotive safety limits (≤ 5 µm).",
    },
    {
      num: "04",
      iconName: "phone",
      title: "Plain-English WhatsApp Alert",
      desc: "Sends tailored, zero-jargon instructions directly to the operator, QA, maintenance, or plant management.",
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
      whatTheySee: "Clear Green/Red traffic lights. Tells the operator which bin to put the part in and whether to pause the line.",
    },
    {
      key: "quality_engineer" as UserRole,
      title: "Quality Assurance Engineer",
      name: "Priya Sharma",
      phone: "+917736831052",
      iconName: "quality" as AppIconName,
      badge: "neutral",
      targetView: "AI Inspection Studio" as ViewName,
      whatTheySee: "Defect bounding boxes, segmentation polygons, tolerance deviations, and human review quarantine queue.",
    },
    {
      key: "maintenance" as UserRole,
      title: "Maintenance & Tooling",
      name: "Vikram Singh",
      phone: "+918951349166",
      iconName: "maintenance" as AppIconName,
      badge: "review",
      targetView: "Fault Intelligence Board" as ViewName,
      whatTheySee: "Early warning for machine vibration, polar heatmaps, and tooling repair checklists to prevent breakdowns.",
    },
    {
      key: "manager" as UserRole,
      title: "Plant Operations Director",
      name: "Anand Verma",
      phone: "+918296102292",
      iconName: "manager" as AppIconName,
      badge: "reject",
      targetView: "Main Dashboard" as ViewName,
      whatTheySee: "Executive shift briefing in plain English, First-Pass Yield (FPY %) vs 95% SLA target, and scrap cost impact in ₹ INR.",
    },
  ];

  return (
    <div className="aa-landing-container">
      {/* Hero Section */}
      <section className="aa-landing-hero">
        <div className="aa-landing-badge">
          <span className="aa-landing-badge-dot" />
          <span>AUTOAUDIT · INDUSTRIAL QUALITY INTELLIGENCE</span>
        </div>
        <h1 className="aa-landing-hero-title">
          Automated Vision &amp; Quality Inspection for Brake Discs
        </h1>
        <p className="aa-landing-hero-desc">
          AutoAudit combines high-speed YOLOv8 computer vision and metrology sensors to inspect automotive brake rotors in real time. We replace complex engineering jargon with clear, traffic-light actions that anyone in the factory can understand immediately.
        </p>

        <div className="aa-landing-hero-actions">
          <button className="button button-primary aa-landing-cta" onClick={onEnterApp}>
            <AppIcon name="rocket" size={16} /> Launch Plant Workstation
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigate("Operator Station")}
          >
            <AppIcon name="operator" size={15} /> Operator Station (Floor View)
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigate("Main Dashboard")}
          >
            <AppIcon name="manager" size={15} /> Executive Dashboard (Management)
          </button>
        </div>

        <div className="aa-landing-system-pills">
          <span className="aa-sys-pill">
            <span className={`status-dot ${backendOnline ? "online" : "offline"}`} />
            YOLOv8 Engine: <b>{backendOnline ? inferenceMode.toUpperCase() : "STANDBY"}</b>
          </span>
          <span className="aa-sys-pill">
            <span className="status-dot online" />
            WhatsApp Dispatch: <b>LIVE GATEWAY</b>
          </span>
          <span className="aa-sys-pill">
            <span className="status-dot online" />
            Database: <b>RDS POSTGRESQL</b>
          </span>
          <span className="aa-sys-pill">
            <span className="status-dot online" />
            Yield Target: <b>95.0% FPY</b>
          </span>
        </div>
      </section>

      {/* How it Works / What We Are Doing */}
      <section className="panel aa-landing-pipeline-panel">
        <div className="aa-section-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line"/>HOW IT WORKS</div>
            <h2>What We Are Doing in 4 Simple Steps</h2>
            <p>From camera capture on the conveyor line to instant hierarchy dispatch</p>
          </div>
        </div>

        <div className="aa-landing-steps-grid">
          {steps.map((s) => (
            <div className="aa-landing-step-card" key={s.num}>
              <div className="aa-step-card-head">
                <span className="aa-step-num">{s.num}</span>
                <span className="aa-step-icon"><AppIcon name={s.iconName} size={20} color="#0284c7" /></span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Roles Section */}
      <section className="panel aa-landing-roles-panel">
        <div className="aa-section-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line"/>4 ROLE WORKSPACES</div>
            <h2>Customized Views for Every Plant Responsibility</h2>
            <p>Click any persona to enter their specialized dashboard with tailored data and permissions</p>
          </div>
        </div>

        <div className="aa-landing-roles-grid">
          {roles.map((r) => {
            const user = USERS[r.key];
            return (
              <div
                className="aa-landing-role-card"
                key={r.key}
                onClick={() => {
                  onSwitchRole(r.key);
                  onNavigate(r.targetView);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="aa-landing-role-head">
                  <div className={`avatar aa-role-avatar ${r.badge}`}>{user.avatar}</div>
                  <div>
                    <b>{r.name}</b>
                    <span>{r.title}</span>
                  </div>
                  <span className="aa-role-phone-badge" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AppIcon name="phone" size={11} color="#047857" /> {r.phone}
                  </span>
                </div>
                <div className="aa-landing-role-desc">
                  <small>WHAT THEY SEE:</small>
                  <p>{r.whatTheySee}</p>
                </div>
                <button
                  type="button"
                  className="button button-secondary aa-landing-role-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchRole(r.key);
                    onNavigate(r.targetView);
                  }}
                >
                  Enter as {user.name} →
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="aa-landing-footer-cta">
        <div>
          <h3>Ready to start inspecting brake discs?</h3>
          <p>Drop a component image or run real-time camera inspection on Conveyor Line 1.</p>
        </div>
        <button className="button button-primary" onClick={onEnterApp}>
          Open AI Inspection Studio →
        </button>
      </div>
    </div>
  );
}
