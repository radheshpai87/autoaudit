from typing import Dict, Tuple

# Engineering explanations & workshop recommendations specific to Brake Disc Rotors
BRAKE_DISC_DEFECT_EXPLANATIONS: Dict[str, Dict[str, str]] = {
    "thermal crack": {
        "title": "Thermal Stress Fissure / Heat Checking",
        "explanation": "Severe cyclic thermal expansion and rapid cooling causes micro-cracking in the grey cast-iron friction ring. If neglected, cracks propagate to the outer cooling edge, risking catastrophic rotor shatter under heavy braking.",
        "recommendation": "IMMEDIATE REPLACEMENT REQUIRED. Do not machine or resurface. Inspect caliper slide pins and brake pad friction material for uneven thermal loading.",
    },
    "radial crack": {
        "title": "Radial Edge Fracture",
        "explanation": "High mechanical tensile stresses and thermal fatigue have initiated a structural fracture extending from the friction band toward the outer cooling edge. Represents critical structural compromise.",
        "recommendation": "CONDEMN ROTOR IMMEDIATELY. Vehicle is unsafe to operate. Replace rotors as an axle pair.",
    },
    "crack": {
        "title": "Friction Ring Surface Fracture",
        "explanation": "Localized structural fracture detected on the brake disc friction surface. Compromises brake torque uniformity, produces severe pedal pulsation, and risks complete rotor structural failure.",
        "recommendation": "CONDEMN ROTOR. Immediate replacement required. Check caliper pistons for seizing.",
    },
    "deep scoring": {
        "title": "Abrasive Scoring / Concentric Grooving",
        "explanation": "Hard debris, worn brake pad backing plates (metal-on-metal contact), or degraded friction compound have carved deep circumferential channels into the friction ring.",
        "recommendation": "Measure rotor thickness with micrometer. If above minimum discard thickness (Min TH), rotor may be turned on an on-car lathe; otherwise replace rotor and install new pads.",
    },
    "scratch": {
        "title": "Surface Scoring / Pad Abrasion",
        "explanation": "Light circular grooves caused by road grit, dust, or localized pad particulate abrasion along the rotor friction track.",
        "recommendation": "Check brake pad wear level. If groove depth is under 0.5mm and rotor exceeds minimum thickness specification, rotor remains serviceable.",
    },
    "corrosion": {
        "title": "Oxidation & Atmospheric Rust Scale",
        "explanation": "Severe iron oxide scale build-up along the friction track and cooling vents. Causes abrasive friction material degradation, harsh grinding noise, and prolonged stopping distances.",
        "recommendation": "Light surface film cleans off during normal bedding; deep pitted rust requires brake lathe resurfacing or rotor replacement if thickness is below minimum spec.",
    },
    "hot spot": {
        "title": "Thermal Hot Spot / Cementite Transformation",
        "explanation": "Extreme localized friction temperatures (exceeding 650°C) transformed grey iron into hard, brittle cementite patches. Causes severe high-speed brake shudder and steering wheel vibration.",
        "recommendation": "Replace rotor pair. Resurfacing will not cure cementite hot spots as the altered metallurgy runs deep into the disc matrix.",
    },
    "pitting": {
        "title": "Cavitation & Moisture Pitting",
        "explanation": "Localized chemical erosion from trapped moisture, road salt, and extended parked dormancy, creating micro-craters that accelerate pad wear.",
        "recommendation": "Measure remaining friction face depth. Skim on brake lathe if within tolerance, or replace if pits exceed 1.0mm depth.",
    },
    "deformation": {
        "title": "Lateral Runout / Rotor Hat Warpage",
        "explanation": "Excessive disc thickness variation (DTV) or distorted rotor mounting hat caused by uneven lug nut torque, hub face rust, or severe thermal shock.",
        "recommendation": "Check hub runout with dial indicator (must be < 0.05mm). Clean hub mating face and torque wheel bolts with calibrated torque wrench.",
    },
    "unknown anomaly": {
        "title": "Unclassified Surface Anomaly",
        "explanation": "Anomalous surface feature detected that does not match standard concentric wear or baseline cast-iron texture. Could indicate unverified metallurgical anomaly, casting porosity, chemical staining, or localized pad material transfer.",
        "recommendation": "Perform tactile and manual micrometer thickness inspection. Conduct dye penetrant testing (PT) or eddy-current check if fissure is suspected.",
    },
    # Surface-level steel & cast-iron defect classes (from GC10-DET & industrial finishing)
    "inclusion": {
        "title": "Surface Metallurgical Inclusion",
        "explanation": "Non-metallic slag or refractory particle entrapped in the metal matrix near the friction surface. Under high friction cycles, inclusions cause localized stress concentrations and micro-spalling of the pad interface.",
        "recommendation": "SURFACE LEVEL DEFECT. Measure depth with depth gauge. If shallow (< 0.2mm), resurface on precision brake lathe; if inclusion penetrates into core casting, replace rotor.",
    },
    "rolled pit": {
        "title": "Surface Rolled Pitting / Cavity",
        "explanation": "Mechanical indentation or rolled depression created during casting or surface finishing. Causes localized pad contact disruption and minor high-frequency brake squeal.",
        "recommendation": "SURFACE LEVEL DEFECT. Check if pitting depth exceeds maximum allowable resurfacing allowance. Skim rotor face if within tolerance.",
    },
    "oil spot": {
        "title": "Fluid / Oil Contamination",
        "explanation": "Hydrocarbon lubricant, brake fluid (DOT 3/4/5.1), or axle grease contamination spotted on the swept friction surface. Drastically reduces coefficient of friction (Mu), inducing dangerous brake pull and pad glazing.",
        "recommendation": "SURFACE LEVEL CONTAMINATION. Clean rotor thoroughly with residue-free brake cleaner spray. Inspect caliper piston seals and axle grease caps. Replace oil-soaked brake pads immediately.",
    },
    "water spot": {
        "title": "Surface Mineral Scale / Water Stain",
        "explanation": "Evaporated wash water or road spray mineral deposit residue on the rotor face. Typically cosmetic, but can cause temporary low-speed morning brake grab.",
        "recommendation": "SURFACE LEVEL BLEMISH. Harmless cosmetic surface mark. Cleans off automatically after 2-3 moderate brake bedding cycles.",
    },
    "welding line": {
        "title": "Surface Tooling / Seam Mark",
        "explanation": "Linear manufacturing mark, seam, or casting parting line on the rotor body. May disrupt airflow or indicate non-OEM fabrication standards.",
        "recommendation": "SURFACE LEVEL DEFECT. Verify component OEM dimensional tolerance and dynamic rotor balancing on bench balancing rig.",
    },
    "punching hole": {
        "title": "Perforation / Surface Void",
        "explanation": "Unintended void or manufacturing through-hole irregularity near the rotor flange or hat, disrupting heat dissipation uniformity.",
        "recommendation": "SURFACE LEVEL DEFECT. Inspect structural integrity of the rotor hat and ensure mounting face runout is within 0.05mm.",
    },
    "crescent gap": {
        "title": "Rim Crescent Notch / Edge Gouge",
        "explanation": "Mechanical notch or chip on the rotor outer circumference or cooling vane chamfer. Can initiate stress concentration cracks if subjected to intense thermal shock.",
        "recommendation": "SURFACE LEVEL DAMAGE. Deburr and inspect edge for crack propagation using non-destructive inspection. Replace if notch extends into swept track.",
    },
    "waist folding": {
        "title": "Surface Crease / Lamination Mark",
        "explanation": "Superficial fold or mechanical crease along the component profile from stamping or machining fixture clamps.",
        "recommendation": "SURFACE LEVEL DEFECT. Ensure runout and disc thickness variation (DTV) are within specification.",
    },
    "silk spot": {
        "title": "Superficial Scuff / Finish Streak",
        "explanation": "Very fine surface scratch or buffing streak along the rotor surface without material depth loss.",
        "recommendation": "SURFACE LEVEL BLEMISH. Cosmetic surface mark; normal brake pad friction will naturally burnish the swept ring.",
    },
}


def get_brake_disc_explanation(defect_type: str) -> Tuple[str, str]:
    """Returns (engineering_explanation, workshop_recommendation) for brake disc defect."""
    key = defect_type.lower()
    for pattern, info in BRAKE_DISC_DEFECT_EXPLANATIONS.items():
        if pattern in key:
            return info["explanation"], info["recommendation"]

    # Fallback explanation
    return (
        f"Surface anomaly detected on brake disc ({defect_type}). May affect friction coefficient and pad contact.",
        "Inspect rotor surface visually and verify disc thickness complies with manufacturer minimum specifications.",
    )


def classify_anomaly_origin(defect_type: str, is_unknown: bool = False) -> str:
    """
    Categorizes the defect into:
    - 'thermal': Cracks, fissures, heat checking, cementite hot spots
    - 'surface_level': Inclusions, rolled pits, oil/water spots, streaks, scratches, light corrosion
    - 'unknown': Unrecognized geometric anomalies
    """
    if is_unknown or "unknown" in defect_type.lower():
        return "unknown"

    lower = defect_type.lower()
    thermal_keywords = ["crack", "fissure", "hot spot", "thermal", "radial", "heat"]
    if any(k in lower for k in thermal_keywords):
        return "thermal"

    surface_keywords = [
        "inclusion", "pit", "oil", "water", "spot", "welding", "punching",
        "crescent", "waist", "folding", "silk", "scratch", "scoring", "corrosion", "rust"
    ]
    if any(k in lower for k in surface_keywords):
        return "surface_level"

    return "unknown"

