# AutoInspect AI 🔬🚗
> **Automotive Component Quality Inspection Prototype**

AutoInspect AI is an automated visual inspection platform for automotive components (brake rotors, engine castings, machined shafts, etc.). It detects surface and structural anomalies, predicts defect classifications, renders bounding boxes and segmentation masks, computes defect severity, and flags low-confidence classifications as **Unknown Anomalies**.

---

## 🏗️ Architecture Overview

The codebase is organized into cleanly decoupled layers to allow seamless upgrades into Phase 2 (DINOv2/PatchCore), Phase 3 (root-cause analysis), and Phase 4/5 (predictive risk):

```
autoinspect-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point & CORS
│   │   ├── config.py                # Pydantic Settings & environment variables
│   │   ├── api/
│   │   │   └── routes.py            # POST /api/inspect & GET /api/health
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic request/response models
│   │   ├── inference/
│   │   │   ├── base_model.py        # Abstract BaseDefectModel interface
│   │   │   ├── yolo_model.py        # YOLO segmentation wrapper (PyTorch/Ultralytics)
│   │   │   ├── mock_model.py        # Demo/Mock engine (cleanly marked in API & UI)
│   │   │   └── manager.py           # Model Manager factory & weights resolver
│   │   ├── services/
│   │   │   ├── severity_engine.py   # Configurable defect severity calculation
│   │   │   └── inspection_service.py # Image validation, pipeline orchestration
│   │   └── utils/
│   │       └── visualizer.py        # OpenCV masks, bounding boxes & HUD badges
│   ├── weights/                     # Put YOLO model weights here (.pt)
│   ├── samples/                     # Synthetic automotive test images
│   ├── tests/                       # Pytest test suite
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # Status HUD & branding
│   │   │   ├── UploadZone.tsx       # Drag-and-drop file upload with validation
│   │   │   ├── ImageComparisonView.tsx # Side-by-side & segmented views
│   │   │   └── InspectionSummary.tsx # Industrial QA summary & defect table
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start & Run Commands

### 1. Installation

#### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

#### Frontend
```bash
cd frontend
npm install
```

---

### 2. Start the FastAPI Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs will be available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3. Start the React Frontend
```bash
cd frontend
npm run dev
```
Frontend dashboard will be running at: [http://localhost:5173](http://localhost:5173)

---

## 🎯 Model Weights Placement

Place your trained YOLO segmentation model weights file at:
```
backend/weights/best.pt
```

You can customize this path by setting `YOLO_WEIGHTS_PATH` in `backend/.env`:
```env
YOLO_WEIGHTS_PATH="weights/best.pt"
INFERENCE_MODE="auto"
```

### Automatic Fallback & Transparency
- If `best.pt` exists and `ultralytics`/`torch` are installed, AutoInspect runs **real YOLO segmentation**.
- If weights are not found, the system switches to **Demo/Mock Mode**.
- In Demo/Mock mode, the UI header displays `ENGINE: DEMO / MOCK` and the API response sets `"inference_mode": "demo_mock"`. No AI predictions are faked or falsely presented as real AI.

---

## 🧪 Testing the System

### Automated Backend Tests
Run the pytest test suite:
```bash
cd backend
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

### Testing with Sample Images
The project includes sample automotive brake rotor images in `backend/samples/`:
1. `sample_rotor_crack.jpg` -> Triggers Critical Crack defect detection.
2. `sample_rotor_scratch.jpg` -> Triggers Medium/Low Scratch defect detection.
3. `sample_rotor_unknown_anomaly.jpg` -> Triggers the **Unknown Anomaly** fallback rule.
4. `sample_rotor_clean.jpg` -> Triggers **QA PASS / No visible defect detected**.

In the frontend UI, click any of the **Quick test presets** directly on the dashboard to test without manual file selection.

---

## 🔍 Distinction: Real AI vs Mock/Demo

| Feature | Real AI Mode (`inference_mode: "real_ai"`) | Demo/Mock Mode (`inference_mode: "demo_mock"`) |
| :--- | :--- | :--- |
| **Trigger** | Valid `.pt` weights in `backend/weights/` | Default when weights are absent |
| **Inference** | Ultralytics PyTorch YOLO segmentation network | Deterministic synthetic defect generator |
| **Defect Types** | Crack, scratch, dent, corrosion, pitting, etc. | Crack, scratch, dent, corrosion, etc. |
| **Mask & BBoxes** | Model-predicted polygons & coordinates | Realistic brake-rotor bounding boxes & masks |
| **Unknown Anomaly**| Triggered when classification confidence < 55% | Tested via sample or low-confidence presets |
| **Severity Engine** | Calculated dynamically via `SeverityEngine` | Calculated dynamically via `SeverityEngine` |
| **Labeling** | Displayed as `ENGINE: YOLO-SEG AI` | Displayed clearly as `ENGINE: DEMO / MOCK` |

---

## 🔮 Future Architecture Roadmap

- **Phase 2:** Integrate `DINOv2` + `PatchCore` in `backend/app/inference/` for zero-shot unseen anomaly detection.
- **Phase 3:** Sensor/process telemetry stream with `XGBoost`/`LightGBM` root-cause analysis.
- **Phase 4:** Time-series predictive defect risk modeling.
- **Phase 5:** SHAP explainability masks and automated remediation recommendations.
