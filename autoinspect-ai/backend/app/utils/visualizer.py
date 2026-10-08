import cv2
import numpy as np
from typing import List, Tuple
import base64
from io import BytesIO
from PIL import Image

from app.models.schemas import DefectDetection, SeverityLevel

# Color mapping by severity in BGR (for OpenCV)
# Critical -> Red, High -> Orange, Medium -> Yellow/Amber, Low -> Blue/Cyan, Unknown -> Purple
SEVERITY_COLORS_BGR = {
    SeverityLevel.CRITICAL: (0, 0, 220),       # Bright Red
    SeverityLevel.HIGH: (0, 140, 255),         # Orange
    SeverityLevel.MEDIUM: (0, 215, 255),       # Yellow/Amber
    SeverityLevel.LOW: (235, 160, 40),         # Azure / Light Blue
}
UNKNOWN_COLOR_BGR = (200, 50, 180)             # Magenta / Purple for Unknown Anomaly


def draw_inspection_overlay(
    image_bgr: np.ndarray,
    detections: List[DefectDetection],
    draw_masks: bool = True,
    draw_boxes: bool = True,
) -> np.ndarray:
    """
    Renders high-visibility industrial inspection overlays onto an image:
    - Translucent colored segmentation mask fill
    - Contrasting bounding boxes
    - Industrial HUD badge labels (Defect name + Confidence + Severity)
    """
    output = image_bgr.copy()
    overlay = image_bgr.copy()
    h, w = image_bgr.shape[:2]

    # 1. Draw segmentation mask overlays (translucent filled polygon)
    if draw_masks:
        for det in detections:
            color = UNKNOWN_COLOR_BGR if det.is_unknown_anomaly else SEVERITY_COLORS_BGR.get(det.severity, (0, 255, 0))
            if det.mask_polygon and len(det.mask_polygon) >= 3:
                pts = np.array(det.mask_polygon, dtype=np.int32).reshape((-1, 1, 2))
                cv2.fillPoly(overlay, [pts], color)
                cv2.polylines(output, [pts], isClosed=True, color=color, thickness=2, lineType=cv2.LINE_AA)
            else:
                # If no polygon provided, highlight bounding box interior slightly
                x1, y1, x2, y2 = [int(v) for v in det.bbox]
                cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)

        # Blend mask overlay with original
        alpha = 0.35
        cv2.addWeighted(overlay, alpha, output, 1 - alpha, 0, output)

    # 2. Draw crisp bounding boxes and badges
    if draw_boxes:
        for det in detections:
            color = UNKNOWN_COLOR_BGR if det.is_unknown_anomaly else SEVERITY_COLORS_BGR.get(det.severity, (0, 255, 0))
            x1, y1, x2, y2 = [int(v) for v in det.bbox]
            
            # Corner accents / high-tech industrial frame
            cv2.rectangle(output, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)
            corner_len = min(16, max(6, (x2 - x1) // 5))
            # Top-left corner
            cv2.line(output, (x1, y1), (x1 + corner_len, y1), color, 4, cv2.LINE_AA)
            cv2.line(output, (x1, y1), (x1, y1 + corner_len), color, 4, cv2.LINE_AA)
            # Bottom-right corner
            cv2.line(output, (x2, y2), (x2 - corner_len, y2), color, 4, cv2.LINE_AA)
            cv2.line(output, (x2, y2), (x2, y2 - corner_len), color, 4, cv2.LINE_AA)

            # Badge Label Text: e.g. "CRACK 96.4% [CRITICAL]"
            label = f"{det.defect_type.upper()} {det.confidence*100:.1f}% [{det.severity.value.upper()}]"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = max(0.45, min(0.65, w / 1200))
            thickness = 1
            (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)

            # Label background box
            label_y1 = max(0, y1 - text_h - 10)
            label_y2 = label_y1 + text_h + 8
            label_x2 = min(w, x1 + text_w + 12)
            cv2.rectangle(output, (x1, label_y1), (label_x2, label_y2), (15, 23, 42), -1)  # dark slate bg
            cv2.rectangle(output, (x1, label_y1), (label_x2, label_y2), color, 1, cv2.LINE_AA)  # border

            # Text
            text_pos = (x1 + 6, label_y2 - 5)
            cv2.putText(output, label, text_pos, font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

    return output


def generate_defect_heatmap_overlay(
    image_bgr: np.ndarray,
    detections: List[DefectDetection],
) -> np.ndarray:
    """
    Dynamically generates a thermal stress / defect intensity heatmap overlay
    from predicted defect contours and crack boundaries using OpenCV colormaps.
    Blooms outward from the crack fissure boundary with peak intensity
    at the structural fracture core.
    """
    h, w = image_bgr.shape[:2]
    if not detections:
        # For clean discs with 0 defects: return clean image with nominal HUD indicator
        out = image_bgr.copy()
        cv2.putText(
            out,
            "THERMAL / DEFECT HEATMAP: 0 HOTSPOTS (CONFORMING)",
            (24, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 230, 115),
            2,
            cv2.LINE_AA,
        )
        return out

    # Accumulate continuous float32 heat density
    heat_accum = np.zeros((h, w), dtype=np.float32)

    for det in detections:
        defect_mask = np.zeros((h, w), dtype=np.uint8)
        conf = float(det.confidence)

        if det.mask_polygon and len(det.mask_polygon) >= 3:
            pts = np.array(det.mask_polygon, dtype=np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(defect_mask, [pts], 255)
        else:
            x1, y1, x2, y2 = [int(v) for v in det.bbox]
            cv2.rectangle(defect_mask, (x1, y1), (x2, y2), 255, -1)

        # Distance transform creates highest intensity at the crack fissure core
        dist = cv2.distanceTransform(defect_mask, cv2.DIST_L2, 5)
        if dist.max() > 0:
            dist = dist / dist.max()
        else:
            dist = (defect_mask > 0).astype(np.float32)

        # Dilate and Gaussian blur to produce thermal dissipation bloom
        k_size = max(21, (min(w, h) // 18) | 1)
        blurred_bloom = cv2.GaussianBlur(defect_mask.astype(np.float32), (k_size, k_size), 0)
        if blurred_bloom.max() > 0:
            blurred_bloom = blurred_bloom / blurred_bloom.max()

        # Core fissure intensity + radiating bloom
        combined = (dist * 0.75 + blurred_bloom * 0.45) * conf
        heat_accum = np.maximum(heat_accum, combined)

    # Normalize accumulated heat to 0-255 uint8
    if heat_accum.max() > 0:
        heat_accum = (heat_accum / heat_accum.max() * 255.0).astype(np.uint8)
    else:
        heat_accum = np.zeros((h, w), dtype=np.uint8)

    # Apply JET colormap (blue -> cyan -> yellow -> orange -> fiery red)
    heatmap_colored = cv2.applyColorMap(heat_accum, cv2.COLORMAP_JET)

    # Create composite: apply heatmap where intensity > 12
    mask_active = (heat_accum > 12).astype(np.float32)[:, :, np.newaxis]
    alpha = 0.58 * mask_active
    composite = (image_bgr.astype(np.float32) * (1.0 - alpha) + heatmap_colored.astype(np.float32) * alpha).astype(np.uint8)

    # Outline the exact predicted crack boundaries on top of the heat bloom in crisp white/cyan
    for det in detections:
        x1, y1, x2, y2 = [int(v) for v in det.bbox]
        if det.mask_polygon and len(det.mask_polygon) >= 3:
            pts = np.array(det.mask_polygon, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(composite, [pts], isClosed=True, color=(255, 255, 255), thickness=2, lineType=cv2.LINE_AA)
        cv2.rectangle(composite, (x1, y1), (x2, y2), (0, 255, 255), 1, cv2.LINE_AA)

        # Hotspot label
        lbl = f"HOTSPOT: {det.defect_type.upper()} ({det.confidence*100:.1f}%)"
        cv2.putText(composite, lbl, (x1, max(18, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1, cv2.LINE_AA)

    return composite


def encode_image_to_base64(image_bgr: np.ndarray, ext: str = ".jpg") -> str:
    """Encodes an OpenCV image to base64 data URI."""
    success, buffer = cv2.imencode(ext, image_bgr)
    if not success:
        raise ValueError("Failed to encode image to base64")
    b64_str = base64.b64encode(buffer).decode("utf-8")
    mime = "image/png" if ext.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{b64_str}"

