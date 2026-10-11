"use client";

import React, { useState } from "react";
import { USERS, type UserRole } from "../../lib/auth";
import {
  Disc3,
  ArrowRight,
  ChevronLeft,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  BarChart3,
} from "lucide-react";

interface LoginPageProps {
  onLogin: (role: UserRole) => void;
  onBackToLanding: () => void;
  backendOnline: boolean;
  inferenceMode: string;
}

export function LoginPage({
  onLogin,
  onBackToLanding,
  backendOnline,
  inferenceMode,
}: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("operator");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectAndLogin = (role: UserRole) => {
    setIsSubmitting(true);
    setTimeout(() => {
      onLogin(role);
    }, 150);
  };

  const roleConfigs = [
    {
      key: "operator" as UserRole,
      level: "Level 1",
      icon: Disc3,
      badge: "Floor Triage",
      desc: "Traffic-light pass/fail triage, audible chute sorting, shift counter.",
    },
    {
      key: "quality_engineer" as UserRole,
      level: "Level 2",
      icon: ShieldCheck,
      badge: "Metrology & Defect Lab",
      desc: "Microscopic polygon segmentations, DTV runout tolerances, quarantine lots.",
    },
    {
      key: "maintenance" as UserRole,
      level: "Level 3",
      icon: Wrench,
      badge: "Tooling & Maintenance",
      desc: "Spindle vibration drift, polar wear heatmaps, proactive insert replacement.",
    },
    {
      key: "manager" as UserRole,
      level: "Level 4",
      icon: BarChart3,
      badge: "Executive Oversight",
      desc: "First-Pass Yield trends, scrap dollar calculations, IATF 16949 audit logs.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Disc3 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900">AutoAudit AI</span>
              <span className="text-xs text-slate-500 ml-2">Plant Access Portal</span>
            </div>
          </div>
          <button
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 py-10 space-y-8">
        <div className="text-center max-w-lg mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Lock className="w-3 h-3 text-blue-600" />
            <span>ROLE-BASED ACCESS CONTROL · ISO 9001</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Select Plant Workstation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose your assigned manufacturing role to enter your tailored quality workspace.
          </p>
        </div>

        {/* 4 Clean Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roleConfigs.map((cfg) => {
            const user = USERS[cfg.key];
            const isSelected = selectedRole === cfg.key;
            const IconComp = cfg.icon;

            return (
              <div
                key={cfg.key}
                onClick={() => setSelectedRole(cfg.key)}
                className={`bg-white rounded-2xl p-5 border transition-all duration-150 flex flex-col justify-between space-y-4 cursor-pointer ${
                  isSelected
                    ? "border-blue-600 ring-2 ring-blue-600/20 shadow-md bg-blue-50/10"
                    : "border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {cfg.level}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    ) : (
                      <IconComp className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {user.avatar}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {user.name}
                      </h3>
                      <p className="text-xs font-semibold text-blue-600 truncate">
                        {user.roleTitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed min-h-[38px]">
                    {cfg.desc}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAndLogin(cfg.key);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  <span>Sign In as {user.name.split(" ")[0]}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Persona Action Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
              {USERS[selectedRole].avatar}
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Active Selection:</span>
              <div className="font-bold text-sm text-slate-900">
                {USERS[selectedRole].name} — {USERS[selectedRole].roleTitle}
              </div>
            </div>
          </div>

          <button
            disabled={isSubmitting}
            onClick={() => handleSelectAndLogin(selectedRole)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Enter {USERS[selectedRole].roleTitle} Workstation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <span>AutoAudit AI · Automated Plant Quality Intelligence · </span>
        <span className="font-semibold text-slate-700">
          {backendOnline ? `Inference Backend Connected (${inferenceMode.toUpperCase()})` : "Standalone Edge Mode"}
        </span>
      </footer>
    </div>
  );
}
