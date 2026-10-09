export type UserRole = "operator" | "quality_engineer" | "maintenance" | "manager";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  phone: string;
  cleanPhone: string;
  hierarchyLevel: 1 | 2 | 3 | 4;
  hierarchyTitle: string;
  department: string;
  avatar: string;
  badgeTone: "passed" | "neutral" | "review" | "reject";
  description: string;
  simpleSummary: string;
  defaultView: string;
  accessibleViews: string[];
}

export const USERS: Record<UserRole, UserProfile> = {
  operator: {
    id: "user-operator",
    name: "Rajesh Kumar",
    email: "operator@autoaudit.plant",
    role: "operator",
    roleTitle: "Plant Floor Operator",
    phone: "+9190251763336",
    cleanPhone: "9190251763336",
    hierarchyLevel: 1,
    hierarchyTitle: "Level 1 · Shop Floor Operations",
    department: "Production Line 1 · Final Assembly",
    avatar: "RK",
    badgeTone: "passed",
    description: "Floor operations: Fast 1-click brake inspection, unmistakable green/red visual verdicts, shift counters, and zero-jargon actions.",
    simpleSummary: "Simple traffic-light pass/fail results. Tells you immediately which bin to put the part in and what to do next.",
    defaultView: "Operator Station",
    accessibleViews: ["Operator Station", "AI Inspection Studio", "Inspection History", "Batch Data"],
  },
  quality_engineer: {
    id: "user-quality",
    name: "Priya Sharma",
    email: "quality@autoaudit.plant",
    role: "quality_engineer",
    roleTitle: "Quality Assurance Engineer",
    phone: "+917736831052",
    cleanPhone: "917736831052",
    hierarchyLevel: 2,
    hierarchyTitle: "Level 2 · Quality Assurance & Metrology",
    department: "Metrology & Standards Lab",
    avatar: "PS",
    badgeTone: "neutral",
    description: "Quality engineering: Deep YOLO segmentation analysis, Human Review Quarantine Queue, SPC tolerance limits, and FMEA root causes.",
    simpleSummary: "Detailed defect polygons, confidence percentages, tolerance limits (DTV, runout), and human review queue to quarantine or release parts.",
    defaultView: "AI Inspection Studio",
    accessibleViews: ["AI Inspection Studio", "Human Review", "Main Dashboard", "Inspection History", "Batch Data", "Historical Data & Prediction", "Fault Intelligence Board"],
  },
  maintenance: {
    id: "user-maintenance",
    name: "Vikram Singh",
    email: "maintenance@autoaudit.plant",
    role: "maintenance",
    roleTitle: "Lead Tooling & Maintenance Specialist",
    phone: "+918951349166",
    cleanPhone: "918951349166",
    hierarchyLevel: 3,
    hierarchyTitle: "Level 3 · Machine Maintenance & Tooling",
    department: "Plant Reliability & Tooling",
    avatar: "VS",
    badgeTone: "review",
    description: "Equipment maintenance: Machine drift early warnings, polar rotor heatmaps, station-specific corrective actions, and instant WhatsApp alerts.",
    simpleSummary: "Shows which machine is drifting or vibrating before parts get damaged. Instant WhatsApp alert dispatch to maintenance technicians.",
    defaultView: "Fault Intelligence Board",
    accessibleViews: ["Fault Intelligence Board", "Historical Data & Prediction", "Main Dashboard", "AI Inspection Studio", "Inspection History"],
  },
  manager: {
    id: "user-manager",
    name: "Anand Verma",
    email: "manager@autoaudit.plant",
    role: "manager",
    roleTitle: "Plant Operations Director",
    phone: "+918296102292",
    cleanPhone: "918296102292",
    hierarchyLevel: 4,
    hierarchyTitle: "Level 4 · Executive Plant Management",
    department: "Executive Plant Operations",
    avatar: "AV",
    badgeTone: "reject",
    description: "Plant management: Plain-language operational briefing, First-Pass Yield vs 95% target, scrap & rework financial impact, and station risk.",
    simpleSummary: "High-level plant health in plain English. Track first-pass yield, scrap costs, and which stations need management attention.",
    defaultView: "Main Dashboard",
    accessibleViews: ["Main Dashboard", "Batch Data", "Fault Intelligence Board", "Historical Data & Prediction", "Human Review", "AI Inspection Studio", "Inspection History", "Operator Station"],
  },
};

const STORAGE_KEY = "autoaudit-current-user-role";

export function getCurrentUserRole(): UserRole {
  if (typeof window === "undefined") return "manager";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as UserRole | null;
    if (saved && USERS[saved]) return saved;
  } catch {
    // ignore
  }
  return "operator"; // Default to Operator so non-technical users get friendly experience immediately
}

export function setCurrentUserRole(role: UserRole): UserProfile {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // ignore
    }
  }
  return USERS[role];
}
