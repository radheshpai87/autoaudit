"""
Brake Disc Fissures Dataset Converter:
Converts binary mask segmentation masks into standard YOLO segmentation format:
    <class_id> x1 y1 x2 y2 ... xn yn (normalized coordinates)

Dataset Source: /home/radz/Downloads/Thermal Brake Disc Fissures/dataset
"""

import os
import cv2
import numpy as np
import random
import shutil
from pathlib import Path


def convert_mask_to_yolo_polygon(mask: np.ndarray, min_area: float = 15.0):
    """
    Extracts normalized polygon contours from binary mask for YOLO segmentation.
    Returns list of formatted polygon strings.
    """
    h, w = mask.shape[:2]
    # In this dataset, mask foreground is 1 (or 255)
    bin_mask = (mask > 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    polygons = []
    for cnt in contours:
        if cv2.contourArea(cnt) < min_area:
            continue

        # Simplify contour to reduce vertex count while retaining fracture geometry
        epsilon = 0.005 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        if len(approx) < 3:
            continue

        # Class 0: thermal_crack / fissure
        poly_str = ["0"]
        for pt in approx:
            px = max(0.0, min(1.0, float(pt[0][0]) / w))
            py = max(0.0, min(1.0, float(pt[0][1]) / h))
            poly_str.append(f"{px:.5f} {py:.5f}")

        polygons.append(" ".join(poly_str))

    return polygons


def prepare_thermal_brake_yolo_dataset(
    source_dir: str = "/home/radz/Downloads/Thermal Brake Disc Fissures/dataset",
    output_dir: str = "dataset_thermal_brake",
    max_samples: int = 1500,
    train_ratio: float = 0.8,
    val_ratio: float = 0.2,
):
    print(f"[*] Reading Thermal Brake Disc Fissures from: {source_dir}")
    images_dir = os.path.join(source_dir, "images")
    masks_dir = os.path.join(source_dir, "masks")

    if not os.path.exists(images_dir) or not os.path.exists(masks_dir):
        raise FileNotFoundError(f"Source dataset directories not found in {source_dir}")

    # Gather matching image and mask pairs
    img_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    random.seed(42)
    random.shuffle(img_files)

    selected_files = img_files[:max_samples]
    print(f"[*] Selected {len(selected_files)} brake disc fissure specimens for YOLO conversion...")

    # Create destination directories
    for split in ["train", "val"]:
        os.makedirs(os.path.join(output_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "labels", split), exist_ok=True)

    n_train = int(len(selected_files) * train_ratio)
    train_files = selected_files[:n_train]
    val_files = selected_files[n_train:]

    for split, flist in [("train", train_files), ("val", val_files)]:
        count = 0
        for fname in flist:
            base_stem = Path(fname).stem
            img_path = os.path.join(images_dir, fname)

            # Try matching mask extensions (.png or .jpg)
            mask_path = os.path.join(masks_dir, base_stem + ".png")
            if not os.path.exists(mask_path):
                mask_path = os.path.join(masks_dir, base_stem + ".jpg")
            if not os.path.exists(mask_path):
                continue

            mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
            if mask is None:
                continue

            polygons = convert_mask_to_yolo_polygon(mask)
            if not polygons:
                continue

            # Copy image
            dest_img = os.path.join(output_dir, "images", split, fname)
            shutil.copyfile(img_path, dest_img)

            # Write YOLO segmentation label
            label_name = base_stem + ".txt"
            dest_label = os.path.join(output_dir, "labels", split, label_name)
            with open(dest_label, "w") as lf:
                lf.write("\n".join(polygons) + "\n")

            count += 1

        print(f"[+] Prepared {count} valid YOLO segmentation samples for {split} split.")

    # Write data.yaml for YOLO
    yaml_content = f"""path: {os.path.abspath(output_dir)}
train: images/train
val: images/val

names:
  0: thermal_crack
"""
    yaml_path = os.path.join(output_dir, "data.yaml")
    with open(yaml_path, "w") as yf:
        yf.write(yaml_content)

    print(f"\n[SUCCESS] YOLO Segmentation Dataset created at: {output_dir}")
    print(f"[*] Configuration YAML: {yaml_path}")
    return yaml_path


if __name__ == "__main__":
    prepare_thermal_brake_yolo_dataset()
