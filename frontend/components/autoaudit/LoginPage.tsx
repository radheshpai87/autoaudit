"use client";

import { useState } from "react";
import { USERS, type UserRole } from "../../lib/auth";
import { AppIcon } from "./AppIcon";

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
    }, 200);
  };

  const rolesList = Object.keys(USERS) as UserRole[];

  return (
    <div className="aa-login-viewport">
      {/* Background ambient industrial lighting */}
      <div className="aa-login-bg-glow" />

      {/* Top Bar with brand & back button */}
      <header className="aa-login-topbar">
        <div className="aa-login-brand">
          <span className="aa-login-logo-icon">
            <AppIcon name="shield" size={18} color="#2563eb" />
          </span>
          <div>
            <b>AutoAudit Quality Gate</b>
            <span>Plant Operations Portal</span>
          </div>
        </div>
        <button
          className="button button-secondary aa-login-back-btn"
          onClick={onBackToLanding}
          title="Return to the product overview landing page"
        >
          <AppIcon name="chevronLeft" size={14} /> Back to Overview
        </button>
      </header>

      {/* Main Login Card Container */}
      <main className="aa-login-main">
        <div className="aa-login-header-text">
          <div className="aa-login-pill">
            <span className="aa-landing-badge-dot" />
            <span>ROLE-BASED ACCESS CONTROL · ISO 9001 COMPLIANT</span>
          </div>
          <h1>Select Your Plant Workspace Persona</h1>
          <p>
            Choose your designated station below. Dashboards, metric thresholds, and alert dispatches automatically tailor to your plant responsibilities.
          </p>
        </div>

        {/* 4 Role Persona Cards */}
        <div className="aa-login-cards-grid">
          {rolesList.map((roleKey) => {
            const user = USERS[roleKey];
            const isSelected = selectedRole === roleKey;

            return (
              <article
                key={roleKey}
                className={`aa-login-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedRole(roleKey)}
              >
                <div className="aa-login-card-header">
                  <div className={`avatar aa-login-avatar ${user.badgeTone}`}>
                    {user.avatar}
                  </div>
                  <div className="aa-login-card-titles">
                    <span className="aa-login-role-tag">{user.hierarchyTitle}</span>
                    <h3>{user.name}</h3>
                    <b>{user.roleTitle}</b>
                  </div>
                </div>

                <div className="aa-login-card-info-row">
                  <span className="aa-login-dept">{user.department}</span>
                  <span className="aa-login-phone">
                    <AppIcon name="phone" size={12} color="#059669" />
                    {user.phone}
                  </span>
                </div>

                <div className="aa-login-summary-box">
                  <div className="aa-login-summary-label">
                    <AppIcon name="sparkles" size={13} color="#2563eb" />
                    <strong>Workspace Focus:</strong>
                  </div>
                  <p>{user.simpleSummary}</p>
                </div>

                <button
                  type="button"
                  className={`button ${isSelected ? "button-primary" : "button-secondary"} aa-login-action-btn`}
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAndLogin(roleKey);
                  }}
                >
                  <AppIcon name="bolt" size={14} /> Sign In as {user.name.split(" ")[0]}
                </button>
              </article>
            );
          })}
        </div>

        {/* Direct One-Click Sign In Footnote */}
        <div className="aa-login-footer-card">
          <div className="aa-login-active-preview">
            <div className={`avatar aa-login-avatar-sm ${USERS[selectedRole].badgeTone}`}>
              {USERS[selectedRole].avatar}
            </div>
            <div>
              <span>Ready to enter as:</span>
              <b>{USERS[selectedRole].name} — {USERS[selectedRole].roleTitle}</b>
            </div>
          </div>

          <div className="aa-login-footer-actions">
            <button
              className="button button-primary aa-login-submit-btn"
              disabled={isSubmitting}
              onClick={() => handleSelectAndLogin(selectedRole)}
            >
              <AppIcon name="rocket" size={16} /> Enter {USERS[selectedRole].roleTitle} Dashboard →
            </button>
          </div>
        </div>
      </main>

      <footer className="aa-login-system-bar">
        <span>AutoAudit Intelligent Manufacturing Pipeline · Secure Plant Session</span>
        <span className="aa-login-status-tag">
          {backendOnline ? `Connected (${inferenceMode.toUpperCase()})` : "Local Demonstration Mode"}
        </span>
      </footer>
    </div>
  );
}
