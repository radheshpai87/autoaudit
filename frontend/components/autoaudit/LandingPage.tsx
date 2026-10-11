"use client";

import React from "react";
import Image from "next/image";
import type { UserRole } from "../../lib/auth";
import {
  ShieldCheck,
  Disc3,
  Camera,
  Zap,
  Ruler,
  Smartphone,
  ArrowRight,
  Sparkles,
  Wrench,
  BarChart3,
  AlertTriangle,
  Cpu,
  FileCheck2,
} from "lucide-react";

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

  const pipelineSteps = [
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

  const personas = [
    {
      role: "operator" as UserRole,
      level: "Level 1",
      tag: "Tactical Gating",
      name: "Rajesh Kumar",
      title: "Plant Floor Operator",
      avatar: "RK",
      station: "Station 04 · High-Speed Optical Gate",
      summary: "Performs instant Go / No-Go triage at conveyor speed with high-visibility traffic lights and automated pneumatic scrap chutes.",
      kpis: [
        { label: "Station Takt", value: "< 1.2s" },
        { label: "Escape Rate", value: "0.0%" },
        { label: "Chute Accuracy", value: "99.9%" },
      ],
      icon: Disc3,
      color: "blue",
    },
    {
      role: "quality_engineer" as UserRole,
      level: "Level 2",
      tag: "Defect & Metrology Lab",
      name: "Priya Sharma",
      title: "Quality Assurance Engineer",
      avatar: "PS",
      station: "Station 06 · AI Metrology Studio",
      summary: "Analyzes deep polygon segmentations, validates micron-level disc thickness variation (DTV ≤ 5 µm), and signs off quarantine lots.",
      kpis: [
        { label: "First-Pass Yield", value: "≥ 95.0%" },
        { label: "Defect PPM", value: "< 50 PPM" },
        { label: "DTV Runout", value: "≤ 5.0 µm" },
      ],
      icon: ShieldCheck,
      color: "emerald",
    },
    {
      role: "maintenance" as UserRole,
      level: "Level 3",
      tag: "Tooling & Predictive Health",
      name: "Vikram Singh",
      title: "Lead Tooling & Maintenance",
      avatar: "VS",
      station: "Station 02 · CNC Lathe & Spindle Cell",
      summary: "Monitors spindle vibration drift and polar wear heatmaps. Receives early WhatsApp alerts to swap worn inserts before bulk failure.",
      kpis: [
        { label: "MTBF Target", value: "≥ 450 hrs" },
        { label: "Spindle Runout", value: "< 8.0 µm" },
        { label: "Tool Cycle Life", value: "98.5%" },
      ],
      icon: Wrench,
      color: "amber",
    },
    {
      role: "manager" as UserRole,
      level: "Level 4",
      tag: "Executive Governance",
      name: "Anand Verma",
      title: "Plant Operations Director",
      avatar: "AV",
      station: "Executive Control Room · Operations",
      summary: "Tracks plant-wide First-Pass Yield (FPY), cumulative scrap dollar savings, shift volume targets, and IATF 16949 audit compliance.",
      kpis: [
        { label: "Plant Target FPY", value: "≥ 95.0%" },
        { label: "Plant OEE Index", value: "≥ 88.0%" },
        { label: "Audit Compliance", value: "100.0%" },
      ],
      icon: BarChart3,
      color: "indigo",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Disc3 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">
                AutoAudit <span className="text-blue-600">AI</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Automated Quality Control
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#pipeline" className="hover:text-blue-600 transition-colors">
              Inspection Pipeline
            </a>
            <a href="#workstations" className="hover:text-blue-600 transition-colors">
              Plant Workstations
            </a>
            <a href="#specifications" className="hover:text-blue-600 transition-colors">
              Specifications
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{backendOnline ? `AI Online (${inferenceMode.toUpperCase()})` : "Standalone Edge Mode"}</span>
            </div>
            <button
              onClick={onGoToLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <span>Launch Workstation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 space-y-20">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>INDUSTRY 4.0 · AUTOMATED COMPUTER VISION GATE</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Sub-Second Optical Inspection for <br />
              <span className="text-blue-600">Automotive Brake Rotors</span>.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
              Real-time YOLOv8 neural defect segmentation, micron-level metrology validation (DTV ≤ 5 µm), and closed-loop plain-English WhatsApp dispatch across the plant hierarchy.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onGoToLogin}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all duration-150 cursor-pointer"
              >
                <span>Enter Plant Workstations</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#workstations"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-all duration-150"
              >
                <span>Explore Plant Roles</span>
              </a>
            </div>

            {/* Metric Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xl font-black text-slate-900">&lt; 1.0s</span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Inference Takt</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xl font-black text-slate-900">≤ 5 µm</span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">DTV Tolerance</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xl font-black text-slate-900">4 Tiers</span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Plant Personas</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xl font-black text-slate-900">100%</span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Digital Audit Trail</p>
              </div>
            </div>
          </div>

          {/* Right: Modern Inspection Terminal Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Terminal Window Header */}
              <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-300 ml-2">CAM-01 · HIGH-SPEED GATE</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>YOLOv8-SEG · 100 FPS</span>
                </div>
              </div>

              {/* Viewport with Rotor Inspection */}
              <div className="relative bg-slate-950 aspect-square max-h-[340px] flex items-center justify-center overflow-hidden">
                <Image
                  src="/samples/sample_rotor_scratch.jpg"
                  alt="Industrial Brake Rotor Optical Inspection Feed"
                  width={640}
                  height={640}
                  className="w-full h-full object-contain"
                  priority
                />

                {/* Simulated Laser Scan Line */}
                <div
                  className="absolute inset-x-0 h-0.5 bg-blue-400 shadow-[0_0_12px_#38bdf8] pointer-events-none opacity-80 animate-pulse"
                  style={{ top: "45%" }}
                />

                {/* Defect Bounding Tag */}
                <div
                  className="absolute border-2 border-rose-500 bg-rose-500/10 rounded-xs pointer-events-none flex flex-col justify-between"
                  style={{ left: "48%", top: "66%", width: "35%", height: "18%" }}
                >
                  <div className="bg-rose-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-br-xs self-start flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>SURFACE SCORING · 94.6%</span>
                  </div>
                </div>
              </div>

              {/* Telemetry Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">COMPONENT</span>
                  <span className="font-bold text-slate-800 font-mono text-[11px]">Rotor 340mm</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">QA VERDICT</span>
                  <span className="font-bold text-rose-600 font-mono text-[11px]">REJECT & STOP</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">DTV RUNOUT</span>
                  <span className="font-bold text-slate-800 font-mono text-[11px]">4.2 µm (≤ 5 µm)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Four-Step Quality Pipeline */}
        <section id="pipeline" className="space-y-6 pt-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              End-to-End Manufacturing Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Four-Step Brake Quality Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              From high-resolution optical capture on the line to automated plain-English alert dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pipelineSteps.map((step) => {
              const IconComp = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">{step.num}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold tracking-wider text-blue-600 uppercase block mb-1">
                        {step.tag}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plant Personas Section ("Engineered for Every Plant Tier") */}
        <section id="workstations" className="space-y-6 pt-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              ISA-95 Role-Based Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dedicated Workstations for Every Plant Tier
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Tailored views, defect tolerances, and alert dispatches engineered specifically for each factory persona.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {personas.map((p) => {
              const IconComp = p.icon;
              return (
                <div
                  key={p.role}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Pill & Level */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {p.level}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600">{p.tag}</span>
                    </div>

                    {/* Persona Identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {p.avatar}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{p.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{p.title}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{p.summary}</p>

                    {/* Owned KPIs */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assigned KPIs
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {p.kpis.map((kpi, idx) => (
                          <div key={idx} className="bg-slate-50 p-1.5 rounded-lg text-center border border-slate-100">
                            <span className="text-[9px] text-slate-500 block truncate">{kpi.label}</span>
                            <span className="text-[10px] font-bold text-slate-900">{kpi.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Launch Button */}
                  <button
                    onClick={() => onSelectRoleAndEnter(p.role)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-blue-600 text-white shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch as {p.name.split(" ")[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Specifications & Compliance Grid */}
        <section id="specifications" className="space-y-6 pt-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Enterprise Specifications
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Production-Grade Machine Standards
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Engineered for continuous automotive assembly lines operating at full line speed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Sub-Second Edge AI</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">YOLOv8 deep vision engine operating at full conveyor line speed.</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Micron Metrology</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">Precise DTV (≤ 5 µm) and lateral runout tolerance gating.</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Autonomous WhatsApp</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">Targeted zero-jargon directives dispatched directly to mobiles.</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">IATF 16949 / ISO 9001</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">Permanent digital traceability and tamper-proof calibration logs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Ready for High-Speed Automotive Manufacturing?</h3>
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

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900">AutoAudit AI</span>
            <span>— Automated Manufacturing Quality Intelligence</span>
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
