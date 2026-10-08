"""
Train YOLOv8-Seg on Thermal Brake Disc Fissures Dataset.
Fast, production-optimized fine-tuning.
"""
import os
import shutil
from ultralytics import YOLO

def main():
    data_yaml = os.path.abspath("dataset_thermal_brake/data.yaml")
    print(f"[*] Starting YOLO segmentation training on: {data_yaml}")

    # Load pretrained YOLOv8 nano segmentation weights
    model = YOLO("yolov8n-seg.pt")

    # Train for 5 focused epochs with 256x256 resolution
    # (matches exact native resolution of the Thermal Brake dataset)
    results = model.train(
        data=data_yaml,
        epochs=5,
        imgsz=256,
        batch=32,
        workers=4,
        project="runs/brake_train",
        name="thermal_fissures",
        save=True,
        verbose=True,
    )

    # Destination
    dest = "backend/weights/best.pt"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    best_pt = os.path.join(results.save_dir, "weights", "best.pt")
    if os.path.exists(best_pt):
        shutil.copy(best_pt, dest)
        print(f"\n[SUCCESS] Trained YOLO segmentation weights saved to: {dest}")
    else:
        # Fallback to last.pt
        last_pt = os.path.join(results.save_dir, "weights", "last.pt")
        if os.path.exists(last_pt):
            shutil.copy(last_pt, dest)
            print(f"\n[SUCCESS] Saved weights to: {dest}")

if __name__ == "__main__":
    main()
