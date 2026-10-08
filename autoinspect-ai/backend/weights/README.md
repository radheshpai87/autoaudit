Place custom-trained YOLO segmentation model weights file here (e.g. `best.pt`).

When `best.pt` is present in this directory and PyTorch / Ultralytics dependencies are installed,
AutoInspect AI will automatically load and execute real YOLO segmentation inference.

If this directory does not contain weights, the system automatically runs in DEMO/MOCK mode
with clear visual labels on both the backend API and frontend HUD.
