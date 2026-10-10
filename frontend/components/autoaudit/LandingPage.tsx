"use client";

import React, { useState } from "react";
import Image from "next/image";
import { USERS, type UserRole } from "../../lib/auth";
import type { ViewName } from "./Views";
import {
  ShieldCheck,
  Disc3,
  Camera,
  Zap,
  Ruler,
  Smartphone,
  ArrowRight,
  ChevronRight,
  Factory,
  Sparkles,
  User,
} from "lucide-react";

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
  phone: string;
  mission: string;
  ownedKpis: Array<{ label: string; target: string }>;
  workstationView: ViewName;
  workstationTitle: string;
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

  const steps = [
    {
      num: "01",
      icon: Camera,
      title: "Optical Conveyor Scan",
      tag: "HIGH RESOLUTION",
      desc: "Synchronized industrial cameras capture high-resolution imagery as rotors transit the conveyor line at line speed.",
    },
    {
      num: "02",
      icon: Zap,
      title: "Neural Defect Detection",
      tag: "< 1.0s LATENCY",
      desc: "Edge-accelerated YOLOv8 vision isolates micro-cracks, scoring grooves, and casting porosities in real time.",
    },
    {
      num: "03",
      icon: Ruler,
      title: "Metrology & Runout Limits",
      tag: "≤ 5 µm PRECISION",
      desc: "Verifies disc thickness variation (DTV) and lateral runout against strict automotive safety standards.",
    },
    {
      num: "04",
      icon: Smartphone,
      title: "Plain-English Dispatch",
      tag: "INSTANT ESCALATION",
      desc: "Sends zero-jargon WhatsApp instructions directly to the floor operator, QA engineer, or maintenance lead.",
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
      phone: "+91 90251 76336",
      mission: "Executes continuous conveyor throughput, performs sub-second Go / No-Go optical triage, and routes non-conforming parts into automated sorting chutes.",
      ownedKpis: [
        { label: "Station Takt Time", target: "< 1.2s" },
        { label: "Zero-Defect Escapes", target: "100.0%" },
        { label: "Chute Accuracy", target: "99.9%" },
      ],
      workstationView: "Operator Station",
      workstationTitle: "Operator Station (Go / No-Go Traffic Lights & Audible Chutes)",
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
      phone: "+91 77368 31052",
      mission: "Performs deep AI defect classification, inspects microscopic crack segmentations, validates disc thickness variation (DTV) against micron tolerances, and dispatches quarantine dispositions.",
      ownedKpis: [
        { label: "First-Pass Yield (FPY)", target: "≥ 95.0%" },
        { label: "Defect PPM", target: "< 50 PPM" },
        { label: "Metrology Runout (DTV)", target: "≤ 5.0 µm" },
      ],
      workstationView: "AI Inspection Studio",
      workstationTitle: "AI Inspection Studio & Human Review Quarantine Queue",
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
      phone: "+91 89513 49166",
      mission: "Monitors spindle vibration drift, analyzes polar rotor wear heatmaps, and executes preventative tool insert changes before mechanical drift causes defective batches.",
      ownedKpis: [
        { label: "MTBF (Mean Time Between Failures)", target: "> 450 hrs" },
        { label: "Spindle Runout Drift", target: "< 8.0 µm" },
        { label: "Tool Insert Cycle Life", target: "98.5%" },
      ],
      workstationView: "Fault Intelligence Board",
      workstationTitle: "Fault Intelligence Board & Spindle Vibration Diagnostics",
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
      phone: "+91 82961 02292",
      mission: "Directs multi-line manufacturing performance, monitors plant-wide OEE and First-Pass Yield vs 95% SLA, mitigates scrap financial loss, and verifies IATF 16949 audit compliance.",
      ownedKpis: [
        { label: "Overall Plant FPY", target: "≥ 95.0% Target" },
        { label: "Plant OEE Index", target: "≥ 88.0%" },
        { label: "Audit Trail Compliance", target: "100.0%" },
      ],
      workstationView: "Main Dashboard",
      workstationTitle: "Executive Operations Dashboard & Shift Briefing Matrix",
      sampleEscalation: {
        trigger: "Shift Completion & Yield Wrap-up",
        message: "SHIFT BRIEF: Shift A finished. 1,420 rotors inspected. Plant FPY: 96.4%. Scrap cost avoided: $1,840. All lines nominal.",
      },
    },
  ];

  const closedLoopStages = [
    {
      step: "01",
      roleTitle: "Line Operator",
      stageTitle: "Floor Triage & Gating",
      tag: "TAKT TIME < 1.2s",
      desc: "Optical conveyor camera captures rotor; sub-second YOLO inference renders green/red traffic light. Suspect part is diverted into physical quarantine chute without stopping line.",
    },
    {
      step: "02",
      roleTitle: "QA Engineer",
      stageTitle: "Deep Metrology & Verification",
      tag: "≤ 5.0 µm DTV CHECK",
      desc: "Microscopic defect polygons and Disc Thickness Variation (DTV) are measured. Structural crack severity is graded, and disposition (Scrap vs Rework vs Release) is officially logged.",
    },
    {
      step: "03",
      roleTitle: "Maintenance Lead",
      stageTitle: "Predictive Tool Recalibration",
      tag: "EARLY VIBRATION WARNING",
      desc: "Polar wear heatmaps correlate recurring defects with Spindle #4 vibration drift. Technician receives instant WhatsApp dispatch to swap worn carbide insert before bulk failure.",
    },
    {
      step: "04",
      roleTitle: "Plant Director",
      stageTitle: "Executive Yield & Governance",
      tag: "FPY ≥ 95% SLA AUDIT",
      desc: "Plain-language shift briefing calculates total scrap dollars saved, First-Pass Yield trends across all lines, and generates tamper-proof IATF 16949 compliance audit certificates.",
    },
  ];

  const displayedPersonas =
    selectedRoleFilter === "all"
      ? plantPersonas
      : plantPersonas.filter((p) => p.key === selectedRoleFilter);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Floating Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Disc3 className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">
                AutoAudit <span className="text-blue-600">AI</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                Brake Quality Gate
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#pipeline" className="hover:text-blue-600 transition-colors">
              Quality Pipeline
            </a>
            <a href="#personas" className="hover:text-blue-600 transition-colors">
              Plant Personas
            </a>
            <a href="#closed-loop" className="hover:text-blue-600 transition-colors">
              Closed-Loop Flow
            </a>
            <a href="#specs" className="hover:text-blue-600 transition-colors">
              Specifications
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{backendOnline ? `AI Online (${inferenceMode.toUpperCase()})` : "Standalone Edge"}</span>
            </div>
            <button
              onClick={onGoToLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all duration-150 cursor-pointer"
            >
              <span>Sign In to Portal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-20">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>INDUSTRY 4.0 · AUTOMATED COMPUTER VISION</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Automated Vision Inspection. <br />
              <span className="text-blue-600">Intelligent Quality Gate</span> for Brake Discs.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Sub-second neural defect segmentation, micron-level metrology checks, and instant zero-jargon WhatsApp dispatch across the plant hierarchy.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onGoToLogin}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Enter Plant Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#personas"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Explore Plant Personas</span>
              </a>
            </div>

            {/* 4 Micro Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-lg font-black text-slate-900">&lt; 1.0s</div>
                <div className="text-[11px] font-medium text-slate-600">Inference Time</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-lg font-black text-slate-900">≤ 5 µm</div>
                <div className="text-[11px] font-medium text-slate-600">DTV Tolerance</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-lg font-black text-slate-900">4 Tiers</div>
                <div className="text-[11px] font-medium text-slate-600">Plant Roles</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-lg font-black text-slate-900">100%</div>
                <div className="text-[11px] font-medium text-slate-600">Audit Trail</div>
              </div>
            </div>
          </div>

          {/* Interactive Inspection Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-slate-600">cam-01 / live_stream</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-blue-100 text-blue-700">
                  YOLOv8-SEG · 100 FPS
                </span>
              </div>

              {/* Real Sample Rotor Image Preview */}
              <div className="relative aspect-4/3 bg-slate-900 overflow-hidden flex items-center justify-center">
                <Image
                  src="/samples/sample_rotor_crack.jpg"
                  alt="Live Brake Rotor Inspection"
                  width={600}
                  height={450}
                  className="w-full h-full object-cover opacity-90"
                  priority
                />

                {/* Laser Sweep Overlay */}
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-blue-500/20 to-transparent pointer-events-none animate-pulse" />

                {/* Simulated YOLO Detection Box */}
                <div className="absolute top-1/4 right-1/4 border-2 border-rose-500 bg-rose-500/20 rounded px-2 py-1 shadow-lg">
                  <span className="text-[10px] font-mono font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded">
                    THERMAL CRACK · 94.2%
                  </span>
                </div>
              </div>

              <div className="p-4 grid grid-cols-3 gap-2 bg-white text-xs border-t border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Part Type</div>
                  <div className="font-semibold text-slate-900">Rotor 340mm</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Verdict</div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                    REJECT · CRACK
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Metrology</div>
                  <div className="font-mono font-semibold text-slate-900">DTV 4.8 µm</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Steps Quality Pipeline */}
        <section id="pipeline" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold font-mono tracking-wider text-blue-600 uppercase">
              End-to-End Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Four-Step Brake Quality Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              From high-resolution optical capture on the line to automated plain-English alert dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((st) => {
              const IconComp = st.icon;
              return (
                <div
                  key={st.num}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {st.num}
                      </span>
                    </div>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-slate-100 text-slate-600 mb-1">
                        {st.tag}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {st.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plant Personas Section */}
        <section id="personas" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold font-mono tracking-wider text-blue-600 uppercase">
              ISA-95 Plant Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Role-Based Plant Governance Hierarchy
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Tailored workspaces, role-specific KPI ownership, strict access boundaries, and direct WhatsApp escalation channels.
            </p>
          </div>

          {/* Interactive Hierarchy Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedRoleFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedRoleFilter === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All 4 Operational Tiers
            </button>
            {plantPersonas.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedRoleFilter(p.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedRoleFilter === p.key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.tierLevel}: {p.name.split(" ")[0]} ({p.title.replace("Plant ", "").replace("Lead ", "")})
              </button>
            ))}
          </div>

          {/* 4 Persona Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayedPersonas.map((p) => {
              const user = USERS[p.key];
              return (
                <div
                  key={p.key}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        {p.tierLevel}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 truncate">
                        {p.station.split("·")[0]}
                      </span>
                    </div>

                    {/* Profile */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {user.avatar}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {p.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-blue-600 truncate">
                          {p.title}
                        </p>
                        <p className="text-[10px] text-slate-600 truncate">
                          {p.department.split("·")[0]}
                        </p>
                      </div>
                    </div>

                    {/* Mission */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                      <strong className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        Operational Mandate
                      </strong>
                      {p.mission}
                    </div>

                    {/* KPIs */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Owned Plant KPIs
                      </span>
                      <div className="space-y-1">
                        {p.ownedKpis.map((kpi, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <span className="text-slate-600 text-[11px]">{kpi.label}</span>
                            <span className="font-mono font-bold text-slate-900 text-[11px]">{kpi.target}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp Channel */}
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between text-xs text-emerald-800">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp Alert</span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-700">{p.phone}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-emerald-100 text-[11px] font-mono text-slate-800 leading-snug">
                        <span className="block text-[9px] font-bold text-amber-700 mb-0.5">
                          TRIGGER: {p.sampleEscalation.trigger}
                        </span>
                        &ldquo;{p.sampleEscalation.message}&rdquo;
                      </div>
                    </div>
                  </div>

                  {/* Launch CTA */}
                  <div className="pt-2">
                    <button
                      onClick={() => onSelectRoleAndEnter(p.key)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Sign In as {p.name.split(" ")[0]} ({p.title.split(" ")[0]})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Closed-Loop Quality Control Flow */}
        <section id="closed-loop" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold font-mono tracking-wider text-blue-600 uppercase">
              Closed-Loop Control
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              How Roles Interlock in Real Time
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              When a defect occurs, AutoAudit triggers an automated closed-loop escalation chain connecting floor execution directly to executive governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {closedLoopStages.map((stage) => (
              <div
                key={stage.step}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-700">
                    Stage {stage.step}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {stage.tag}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    {stage.roleTitle}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {stage.stageTitle}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Standards Banner */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">ISA-95 Architecture</h4>
              <p className="text-[11px] text-slate-600">Full vertical enterprise integration from floor sensors to ERP.</p>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Autonomous WhatsApp</h4>
              <p className="text-[11px] text-slate-600">Targeted zero-jargon directives dispatched directly to mobiles.</p>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">IATF 16949 / ISO 9001</h4>
              <p className="text-[11px] text-slate-600">Permanent digital traceability and tamper-proof calibration logs.</p>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Sub-Second Edge AI</h4>
              <p className="text-[11px] text-slate-600">YOLOv8 deep vision engine operating at full conveyor line speed.</p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section id="specs" className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Ready for High-Speed Automotive Manufacturing?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Precision quality gating engineered for brake discs, drums, clutch plates, and rotational castings.
            </p>
          </div>
          <button
            onClick={onGoToLogin}
            className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg transition-all shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span>Launch Workstation Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900">AutoAudit AI</span>
            <span>— Automated Manufacturing Quality Intelligence · 2026</span>
          </div>
          <button
            onClick={onGoToLogin}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Sign In to Portal →
          </button>
        </div>
      </footer>
    </div>
  );
}
