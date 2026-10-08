# 📥 Brake Disc Defect Datasets & Training Guide

## 1. Top Recommended Public Datasets for Brake Discs & Metal Surface Defects

| Dataset Name | Source | Description & Relevance | Defect Classes |
| :--- | :--- | :--- | :--- |
| **Roboflow Universe: Brake Discs & Automotive** | [Roboflow Universe](https://universe.roboflow.com/search?q=brake%20disc) | Real automotive brake rotor images annotated with YOLO bounding boxes and polygon masks. | Cracks, scratches, wear, rust |
| **MVTec Anomaly Detection (Metal Nut / Casting)** | [MVTec AD](https://www.mvtec.com/company/research/datasets/mvtec-ad) | The industrial benchmark for surface defects on metallic machined components. | Cracks, scratches, bent, oxidation, color |
| **Severstal Steel Defect Dataset** | [Kaggle Severstal](https://www.kaggle.com/c/severstal-steel-defect-detection) | High-resolution metallic surface defect segmentation dataset. | Pitting, inclusion, scratches, cracks |
| **NEU Surface Defect Database** | [NEU Metal Defects](https://www.kaggle.com/datasets/arunrk7/surface-defect-detection) | Hot-rolled metal strip and plate defects, ideal for transfer learning on cast iron. | Rolled-in scale, scratches, crazing (cracks), pitted surface |

---

## 2. How to Download a Brake Disc Dataset from Roboflow

Run the following in Python or terminal:

```bash
pip install roboflow
```

```python
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")
project = rf.workspace("automotive-inspection").project("brake-disc-defect")
version = project.version(1)
dataset = version.download("yolov8") # Downloads formatted dataset with data.yaml
```

---

## 3. How to Train the Model for AutoInspect AI

Once downloaded, run the automated training script provided in the repository:

```bash
python scripts/train_brake_yolo.py --data dataset/data.yaml --epochs 50 --batch 16
```

This will automatically train the model on your GPU and copy the resulting `best.pt` file directly into:
```
backend/weights/best.pt
```

As soon as `best.pt` is saved, AutoInspect AI switches to **Real YOLO Segmentation Mode** without requiring any code changes.
