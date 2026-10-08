import cv2
import numpy as np
import os


def generate_car_bonnet_sample(path: str, defect: str = "none"):
    """
    Synthesizes a realistic automotive Car Bonnet / Hood stamped sheet-metal panel
    with Class-A stamping character lines, cowl flanges, headlamp scoops, and defects.
    """
    width = 720
    height = 600
    img = np.full((height, width, 3), 32, dtype=np.uint8)  # Dark factory inspection background

    # 1. Car Bonnet Contour (Top-down view)
    # Front nose (top, y=80..110), Cowl/Hinges (bottom, y=520)
    # Contoured hood perimeter polygon
    bonnet_pts = np.array([
        [240, 85],   # Front Center-Left (radiator grille)
        [480, 85],   # Front Center-Right
        [580, 125],  # Front Right Headlamp Corner
        [630, 240],  # Right Fender Shoulder
        [650, 420],  # Right Rear Side
        [630, 515],  # Right Cowl Hinge Corner
        [560, 525],  # Right Cowl Indent
        [160, 525],  # Left Cowl Indent
        [90, 515],   # Left Cowl Hinge Corner
        [70, 420],   # Left Rear Side
        [90, 240],   # Left Fender Shoulder
        [140, 125],  # Front Left Headlamp Corner
    ], dtype=np.int32)

    # Base sheet metal stamped panel (metallic silver/grey with subtle gradient)
    panel_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(panel_mask, [bonnet_pts], 255)

    # Shading across the panel
    for y in range(height):
        for x in range(width):
            if panel_mask[y, x] > 0:
                # Vertical stamping curvature lighting
                base_lum = int(145 + 35 * np.cos((y - 280) / 220.0) - 25 * abs(x - 360) / 360.0)
                base_lum = max(90, min(210, base_lum))
                img[y, x] = [base_lum - 5, base_lum, base_lum + 8]

    # Stamped Character Lines (Sculpted hood ridges from cowl to front)
    # Left ridge
    left_ridge = np.array([
        [260, 95], [250, 200], [230, 360], [210, 515]
    ], dtype=np.int32)
    cv2.polylines(img, [left_ridge], False, (215, 220, 225), 3, lineType=cv2.LINE_AA)
    cv2.polylines(img, [left_ridge], False, (95, 100, 105), 1, lineType=cv2.LINE_AA)

    # Right ridge
    right_ridge = np.array([
        [460, 95], [470, 200], [490, 360], [510, 515]
    ], dtype=np.int32)
    cv2.polylines(img, [right_ridge], False, (215, 220, 225), 3, lineType=cv2.LINE_AA)
    cv2.polylines(img, [right_ridge], False, (95, 100, 105), 1, lineType=cv2.LINE_AA)

    # Center Spine
    center_spine = np.array([
        [360, 90], [360, 520]
    ], dtype=np.int32)
    cv2.polylines(img, [center_spine], False, (190, 195, 200), 2, lineType=cv2.LINE_AA)

    # Headlamp Pockets (Deep draw stamp recesses)
    cv2.ellipse(img, (160, 140), (45, 28), -25, 0, 360, (110, 115, 120), 2, lineType=cv2.LINE_AA)
    cv2.ellipse(img, (560, 140), (45, 28), 25, 0, 360, (110, 115, 120), 2, lineType=cv2.LINE_AA)

    # Front Hemming / Hood Latch Stamping
    cv2.rectangle(img, (340, 100), (380, 125), (105, 110, 115), 2)
    cv2.circle(img, (360, 112), 6, (60, 65, 70), -1)

    # Rear Cowl Hinge Mounting Holes
    cv2.circle(img, (130, 490), 8, (50, 55, 60), -1)
    cv2.circle(img, (590, 490), 8, (50, 55, 60), -1)

    # Perimeter Hemming Flange Highlight
    cv2.polylines(img, [bonnet_pts], True, (190, 195, 200), 2, lineType=cv2.LINE_AA)

    # Add Defects if requested
    if defect == "dent":
        # Localized mechanical impact dent on left character ridge (x=245, y=260)
        cx, cy = 245, 260
        cv2.circle(img, (cx, cy), 22, (80, 85, 90), -1)
        cv2.circle(img, (cx, cy), 22, (50, 55, 60), 2)
        cv2.circle(img, (cx - 5, cy - 5), 12, (180, 185, 190), 2)  # Dent reflection highlight
        cv2.circle(img, (cx + 6, cy + 6), 14, (60, 65, 70), 2)   # Dent shadow ring
    elif defect == "split":
        # Stamping draw split tear in left deep draw headlamp pocket (x=165, y=145)
        pts = [
            (145, 130), (155, 140), (168, 142), (180, 155), (192, 162)
        ]
        for j in range(len(pts) - 1):
            cv2.line(img, pts[j], pts[j+1], (15, 15, 20), 4, lineType=cv2.LINE_AA)
            cv2.line(img, (pts[j][0], pts[j][1] + 1), (pts[j+1][0], pts[j+1][1] + 1), (220, 220, 225), 1, lineType=cv2.LINE_AA)
    elif defect == "pimple":
        # Die contamination pimple on right spine / character line (x=475, y=230)
        cx, cy = 475, 230
        cv2.circle(img, (cx, cy), 14, (225, 230, 235), -1)
        cv2.circle(img, (cx, cy), 14, (75, 80, 85), 2)
        cv2.circle(img, (cx, cy), 6, (255, 255, 255), -1)
    elif defect == "burr":
        # Hemming edge burr / tear on front left hemming perimeter (x=120, y=130)
        pts = [
            (115, 125), (120, 135), (128, 140), (135, 148)
        ]
        for j in range(len(pts) - 1):
            cv2.line(img, pts[j], pts[j+1], (30, 30, 35), 3, lineType=cv2.LINE_AA)
            cv2.line(img, (pts[j][0] + 2, pts[j][1]), (pts[j+1][0] + 2, pts[j+1][1]), (230, 230, 235), 1, lineType=cv2.LINE_AA)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, img)


if __name__ == "__main__":
    out_dir = "backend/samples"
    generate_car_bonnet_sample(f"{out_dir}/sample_bonnet_good.jpg", defect="none")
    generate_car_bonnet_sample(f"{out_dir}/sample_bonnet_dent.jpg", defect="dent")
    generate_car_bonnet_sample(f"{out_dir}/sample_bonnet_split.jpg", defect="split")
    generate_car_bonnet_sample(f"{out_dir}/sample_bonnet_pimple.jpg", defect="pimple")
    generate_car_bonnet_sample(f"{out_dir}/sample_bonnet_burr.jpg", defect="burr")
    print("Generated sample Car Bonnet panels in backend/samples/")
