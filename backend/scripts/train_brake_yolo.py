"""
AutoInspect AI - Brake Disc YOLO Segmentation Training Pipeline.

Usage:
    python scripts/train_brake_yolo.py --epochs 50 --batch 16 --data dataset.yaml

This script trains a YOLOv8/YOLO11 segmentation model specifically on brake rotor datasets:
- Thermal cracks, radial fractures
- Pad scoring / concentric grooving
- Corrosion scale
- Heat spots / cementite transformation

Outputs:
    weights/best.pt -> Automatically recognized by AutoInspect AI!
"""

import argparse
import os
import sys

def train(data_yaml: str, epochs: int, batch_size: int, model_type: str = "yolov8n-seg.pt"):
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics is not installed. Install with: pip install ultralytics")
        sys.exit(1)

    print(f"[*] Starting YOLO segmentation training for Brake Discs...")
    print(f"[*] Base model: {model_type}")
    print(f"[*] Dataset: {data_yaml}")
    print(f"[*] Epochs: {epochs}, Batch size: {batch_size}")

    # Initialize model
    model = YOLO(model_type)

    # Train
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=640,
        device=0 if os.system("nvidia-smi > /dev/null 2>&1") == 0 else "cpu",
        project="runs/brake_inspect",
        name="brake_rotor_seg",
        save=True,
    )

    # Copy best weights to autoinspect weights directory
    dest = "backend/weights/best.pt"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    best_weights = os.path.join(results.save_dir, "weights", "best.pt")
    if os.path.exists(best_weights):
        import shutil
        shutil.copy(best_weights, dest)
        print(f"[SUCCESS] Trained weights saved directly to {dest}")
        print(f"[!] AutoInspect AI will automatically run real YOLO inference using this model.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Brake Disc YOLO Defect Model")
    parser.add_argument("--data", type=str, default="dataset.yaml", help="Path to YOLO dataset yaml")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--model", type=str, default="yolov8n-seg.pt", help="Base model weights")
    args = parser.parse_args()

    train(args.data, args.epochs, args.batch, args.model)
