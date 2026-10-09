"use client";

import { useState } from "react";
import { USERS, type UserProfile, type UserRole } from "../../lib/auth";
import { AppIcon } from "./AppIcon";

interface AuthModalProps {
  currentUser: UserProfile;
  onSelectRole: (role: UserRole) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function AuthModal({ currentUser, onSelectRole, onClose, isOpen }: AuthModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);

  if (!isOpen) return null;

  return (
    <div className="aa-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="aa-auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div className="aa-modal-head">
          <div>
            <span className="eyebrow"><span className="eyebrow-line"/>USER AUTHENTICATION & ROLE SWITCHER</span>
            <h2 id="auth-modal-title">Select Your Plant Workspace Role</h2>
            <p>Switch between the 4 plant personas to see customized views tailored to each responsibility.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close role switcher">
            <AppIcon name="cross" size={16} />
          </button>
        </div>

        <div className="aa-auth-grid">
          {(Object.keys(USERS) as UserRole[]).map((roleKey) => {
            const user = USERS[roleKey];
            const isActive = currentUser.role === roleKey;
            const isSelected = selectedRole === roleKey;

            return (
              <article
                key={roleKey}
                className={`aa-auth-role-card ${isSelected ? "selected" : ""} ${isActive ? "active-current" : ""}`}
                onClick={() => setSelectedRole(roleKey)}
              >
                <div className="aa-auth-card-top">
                  <div className={`avatar aa-role-avatar ${user.badgeTone}`}>
                    {user.avatar}
                  </div>
                  <div className="aa-auth-card-meta">
                    <b>{user.name}</b>
                    <span className="aa-auth-role-title">{user.roleTitle}</span>
                    <span style={{ fontSize: "11px", color: "#0d9488", fontWeight: "700" }}>{user.hierarchyTitle}</span>
                  </div>
                  {isActive && <span className="aa-badge passed">CURRENT USER</span>}
                </div>

                <div className="aa-auth-department" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{user.department}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#047857", background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AppIcon name="phone" size={12} color="#047857" /> {user.phone}
                  </span>
                </div>
                <p className="aa-auth-desc">{user.description}</p>
                <div className="aa-auth-plain-box">
                  <strong style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AppIcon name="sparkles" size={13} color="#d97706" /> What you see:
                  </strong>
                  <span>{user.simpleSummary}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="aa-auth-modal-foot">
          <div className="aa-auth-security-note">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <AppIcon name="lock" size={13} color="#475569" /> Session active for <b>{currentUser.name}</b> ({currentUser.roleTitle})
            </span>
            <small>Data permissions and dashboards adjust instantly to your chosen role.</small>
          </div>
          <div className="aa-modal-actions">
            <button className="button button-secondary" onClick={onClose}>Cancel</button>
            <button
              className="button button-primary"
              onClick={() => {
                onSelectRole(selectedRole);
                onClose();
              }}
            >
              Sign In as {USERS[selectedRole].name}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
