import cv2
import numpy as np
import os


def generate_brake_disc_sample(path: str, defect: str = "crack"):
    """
    Synthesizes a realistic automotive brake disc / rotor image
    with high-contrast machine-ground surface texture.
    """
    size = 640
    img = np.full((size, size, 3), 45, dtype=np.uint8)
    center = (size // 2, size // 2)

    # 1. Outer rotor friction disc ring
    cv2.circle(img, center, 270, (140, 145, 150), -1, lineType=cv2.LINE_AA)
    
    # Machine turn concentric lathe grooving texture
    for r in range(160, 268, 4):
        cv2.circle(img, center, r, (120 + (r % 15), 125 + (r % 15), 130 + (r % 15)), 1, lineType=cv2.LINE_AA)

    # Cross-drilled cooling holes common on sports brake rotors
    num_holes = 16
    for i in range(num_holes):
        angle = (2 * np.pi / num_holes) * i
        hx = int(center[0] + 210 * np.cos(angle))
        hy = int(center[1] + 210 * np.sin(angle))
        cv2.circle(img, (hx, hy), 7, (20, 20, 25), -1, lineType=cv2.LINE_AA)
        cv2.circle(img, (hx, hy), 9, (90, 95, 100), 1, lineType=cv2.LINE_AA)

    # 2. Rotor hat (center hub)
    cv2.circle(img, center, 140, (70, 75, 80), -1, lineType=cv2.LINE_AA)
    cv2.circle(img, center, 140, (100, 105, 110), 2, lineType=cv2.LINE_AA)

    # 3. Center bore
    cv2.circle(img, center, 55, (25, 25, 30), -1, lineType=cv2.LINE_AA)

    # 4. Wheel lug bolt holes (5-bolt pattern)
    for i in range(5):
        angle = (2 * np.pi / 5) * i - np.pi / 2
        bx = int(center[0] + 95 * np.cos(angle))
        by = int(center[1] + 95 * np.sin(angle))
        cv2.circle(img, (bx, by), 12, (20, 20, 25), -1, lineType=cv2.LINE_AA)
        cv2.circle(img, (bx, by), 15, (120, 125, 130), 1, lineType=cv2.LINE_AA)

    # Defect rendering
    if defect == "crack":
        # Draw realistic jagged fracture crack
        pts = [
            (240, 210), (255, 230), (268, 255), (280, 290),
            (295, 330), (300, 360)
        ]
        for j in range(len(pts) - 1):
            cv2.line(img, pts[j], pts[j+1], (20, 20, 25), 3, lineType=cv2.LINE_AA)
            cv2.line(img, (pts[j][0] + 1, pts[j][1]), (pts[j+1][0] + 1, pts[j+1][1]), (80, 80, 85), 1, lineType=cv2.LINE_AA)
    elif defect == "scratch":
        # Long circumferential scoring scratch
        cv2.ellipse(img, center, (225, 225), 0, 30, 85, (70, 70, 75), 2, lineType=cv2.LINE_AA)
    elif defect == "corrosion":
        # Oxidation patch on outer rim
        cv2.ellipse(img, (220, 380), (70, 50), 45, 0, 360, (50, 70, 110), -1)
    elif defect == "unknown_anomaly":
        # Irregular chemical stain / pit cluster
        cv2.circle(img, (310, 340), 25, (40, 60, 50), -1)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, img)


if __name__ == "__main__":
    out_dir = "backend/samples"
    generate_brake_disc_sample(f"{out_dir}/sample_rotor_crack.jpg", defect="crack")
    generate_brake_disc_sample(f"{out_dir}/sample_rotor_scratch.jpg", defect="scratch")
    generate_brake_disc_sample(f"{out_dir}/sample_rotor_clean.jpg", defect="none")
    generate_brake_disc_sample(f"{out_dir}/sample_rotor_corrosion.jpg", defect="corrosion")
    generate_brake_disc_sample(f"{out_dir}/sample_rotor_unknown_anomaly.jpg", defect="unknown_anomaly")
    print("Generated sample automotive component images in backend/samples/")
