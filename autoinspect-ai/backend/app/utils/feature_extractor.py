import cv2
import numpy as np


def extract_brake_rotor_features(image_bgr: np.ndarray) -> np.ndarray:
    """
    Extracts a 16-dimensional physical & texture feature vector specifically
    correlated with brake disc wear, grooving, cracking, and oxidation.
    """
    h, w = image_bgr.shape[:2]
    total_pixels = h * w
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)

    # Identify and segment plain background (e.g., pure white catalog or dark studio background)
    corners = np.concatenate([
        gray[:20, :20].flatten(),
        gray[:20, -20:].flatten(),
        gray[-20:, :20].flatten(),
        gray[-20:, -20:].flatten()
    ])
    bg_is_white = float(np.mean(corners)) > 210
    disc_mask = (gray < 225) if bg_is_white else np.ones((h, w), dtype=bool)
    disc_area = max(int(np.sum(disc_mask)), 1)
    disc_pixels = gray[disc_mask] if np.any(disc_mask) else gray

    # 1. Surface roughness and contrast
    mean_gray = np.mean(disc_pixels)
    std_gray = np.std(disc_pixels)
    contrast = np.percentile(disc_pixels, 95) - np.percentile(disc_pixels, 5)

    # 2. Edge / Grooving density (scoring)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum((edges > 0) & disc_mask) / disc_area

    # Horizontal vs Vertical directional gradients (concentric lathe vs transverse cracks)
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    grad_mag_disc = grad_mag[disc_mask] if np.any(disc_mask) else grad_mag
    mean_grad = np.mean(grad_mag_disc)
    grad_skew = np.std(grad_mag_disc)

    # 3. Micro-fracture / crack fissure energy (Black-Hat)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    crack_energy = np.sum((blackhat > 35) & disc_mask) / disc_area
    max_crack_val = np.max(blackhat[disc_mask]) if np.any(disc_mask) else np.max(blackhat)

    # 4. Thermal discoloration & Oxidation variance (LAB color space)
    l, a, b = cv2.split(lab)
    b_disc = b[disc_mask] if np.any(disc_mask) else b
    a_disc = a[disc_mask] if np.any(disc_mask) else a
    std_b = np.std(b_disc)  # Yellow/brown rust shift
    std_a = np.std(a_disc)  # Reddish rust / heat tint shift

    # 5. Annular swept zone variance (center disc vs friction track)
    center_y, center_x = h // 2, w // 2
    y_coords, x_coords = np.ogrid[:h, :w]
    dist_from_center = np.sqrt((x_coords - center_x)**2 + (y_coords - center_y)**2)
    max_r = min(w, h) * 0.44
    friction_mask = (dist_from_center > max_r * 0.4) & (dist_from_center < max_r * 0.95) & disc_mask
    friction_pixels = gray[friction_mask] if np.any(friction_mask) else disc_pixels
    swept_std = np.std(friction_pixels)
    swept_mean = np.mean(friction_pixels)

    # 6. Local dark pit count (cavitation / deep gouges)
    dark_pits = np.sum(friction_pixels < (swept_mean - 2.5 * swept_std)) / max(len(friction_pixels), 1)

    features = [
        mean_gray / 255.0,
        std_gray / 128.0,
        contrast / 255.0,
        edge_density * 100.0,
        mean_grad / 100.0,
        grad_skew / 100.0,
        crack_energy * 1000.0,
        max_crack_val / 255.0,
        std_b / 50.0,
        std_a / 50.0,
        swept_std / 128.0,
        swept_mean / 255.0,
        dark_pits * 1000.0,
        float(np.sum(edges > 0)) / max(float(np.sum(blackhat > 25)), 1.0),
        float(std_b) / max(float(std_a), 0.1),
        float(grad_skew) / max(float(mean_grad), 0.1),
    ]

    return np.array(features, dtype=np.float32)
