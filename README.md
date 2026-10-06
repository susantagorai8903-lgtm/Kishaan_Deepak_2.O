# 🌾 Kishaan Deepak (किसान दीपक)

## Crop Intelligence Platform for Indian Farmers — Express, React & Python ML

> An intelligent, data-driven agricultural platform combining an Express/React frontend with a Python Machine Learning Microservice. Requests are processed statelessly and results are returned without database persistence.

---

## 🏗️ Architecture & Component Overview

```text
                                  +------------------------------------+
                                  |         React Frontend             |
                                  |      (Vite + Tailwind CSS)         |
                                  |   Port 3000 / Built Static UI      |
                                  +-----------------+------------------+
                                                    |
                                          REST APIs / JSON / Multipart
                                                    v
                                  +------------------------------------+
                                  |      Express.js Gateway (Node)     |
                                  |              Port 5000             |
                                  |  - Route Handling & Rate Limiting  |
                                  |  - Multer File Upload & 5MB Guard  |
                                  |  - Stateless request processing    |
                                  +--------+------------------+--------+
                                             |                  |
                                             | HTTP Proxy       | HTTP Proxy
                                             v                  v
                                               +-----------------------------------+
                                               | Python ML Microservice (Flask)    |
                                               | Port 5001                         |
                                               | - ModelStore Singleton (eager)    |
                                               | - 128x128 HOG + Logistic Reg      |
                                               | - 60% Confidence Guard            |
                                                   | - Scikit-Learn Regression Pipeline|
                                                   | - Groq LLM Agricultural Assistant |
                                                   | - 5 x 2MB Rotating File Logger    |
                                                   +-----------------------------------+
```

---

## 📁 Project Directory Structure

```text
kishaan-deepak/
├── package.json                         # Root orchestration commands
├── README.md                            # Complete documentation & run guide
│
├── ml-service/                          # 🐍 Python Machine Learning Microservice
│   ├── app.py                           # Flask server entrypoint (Port 5001)
│   ├── requirements.txt                 # Dependencies: scikit-learn, skimage, opencv, groq, etc.
│   ├── train_models.py                  # Trains & serializes models + generates indian_crops.csv
│   ├── data/
│   │   └── indian_crops.csv             # Indian regional agricultural dataset
│   ├── models_loader/
│   │   └── loader.py                    # ModelStore singleton (raises 503 if models absent)
│   ├── services/
│   │   ├── yield_service.py             # DataFrame builder & sklearn regression predictor
│   │   ├── disease_service.py           # 128x128 HOG + StandardScaler + LR + 60% guard
│   │   └── chat_service.py              # Groq LLM wrapper with Hindi/Hinglish domain prompt
│   ├── utils/
│   │   ├── validators.py                # MIME, extension, 5MB cap, and numeric range validators
│   │   └── logger.py                    # 5 x 2MB rotating file logger (kishaan_deepak.log)
│   └── trained_models/
│       ├── yield_model.joblib           # Trained scikit-learn regression pipeline
│       ├── disease_model.joblib         # Trained 10-class logistic regression classifier
│       └── disease_encoder.joblib       # LabelEncoder mapping 10 paddy disease classes
│
├── server/                              # 🟢 Stateless Express.js (Node.js) API Gateway
│   ├── server.js                        # Gateway entrypoint (Port 5000) & static client host
│   ├── package.json                     # Express, Multer, Axios, FormData
│   ├── .env                             # Environment variables (PORT, PYTHON_SERVICE_URL)
│   ├── controllers/
│   │   ├── yieldController.js           # Yield options & prediction handler
│   │   ├── diseaseController.js         # Image upload, proxying, and cleanup handler
│   │   └── chatController.js            # Stateless LLM proxy handler
│   ├── routes/
│   │   ├── yieldRoutes.js               # /api/yield/*
│   │   ├── diseaseRoutes.js             # /api/disease/*
│   │   └── chatRoutes.js                # /api/chat/*
│   ├── middleware/
│   │   ├── upload.js                    # Multer 5MB limit, UUID rename & MIME checks
│   │   └── errorHandler.js              # Centralized JSON error handler
│   └── utils/
│       └── pyClient.js                  # Axios client forwarding to Python ML service
│
└── client/                              # ⚛️ Modern React Frontend (Vite + Tailwind CSS)
    ├── package.json                     # React 19, Lucide Icons, Axios, Tailwind
    ├── vite.config.js                   # Vite configuration with /api proxy to Port 5000
    ├── tailwind.config.js               # Custom theme: farm dark greens (#132219) & gold (#f4c042)
    ├── index.html                       # HTML5 entry with Google Fonts
    └── src/
        ├── App.jsx                      # Main application shell with hero banner & tab views
        ├── main.jsx                     # React root mount
        ├── index.css                    # Custom scrollbars & Tailwind layers
        ├── services/
        │   └── api.js                   # Client HTTP API module
        └── components/
            ├── Navbar.jsx               # Header with health status indicator
            ├── YieldPredictor.jsx       # Dynamic selectors, climate sliders & yield projection
            ├── DiseaseDetector.jsx      # Drag-and-drop upload, 128x128 preview, 60% guard gauge
            └── FarmChatbot.jsx          # AI advisor with English / Hindi / Hinglish toggle
```

---

## ⚡ Key Features (PDF Module Alignment)

| PDF Feature | Original Specification | Express + Python Implementation |
| --- | --- | --- |
| **🌾 Yield Prediction** | Scikit-learn Pipeline, CSV dataset | `YieldService.predict()` runs scikit-learn regression pipeline. Dynamic options read from `indian_crops.csv` via `/api/yield/options`. Results are returned without being stored. |
| **🔬 Disease Detection** | 10-class Paddy classification, 128×128 HOG, Logistic Regression | `DiseaseService.predict()` resizes to $128 \times 128$, converts to grayscale, extracts 1764-dimensional HOG vector, normalizes with `StandardScaler`, and predicts probabilities across 10 paddy diseases. |
| **🛡️ 60% Confidence Guard** | Reject if $<60\%$ confidence | If `max(probabilities) < 0.60`, prediction is rejected with a descriptive alert to protect farmers from misdiagnosis and unnecessary fungicide expenditure. |
| **🔒 Secure File Uploads** | 5 MB cap, UUID rename, auto-cleanup | Express Multer middleware enforces 5 MB cap & MIME checks. `fs.unlinkSync()` ensures uploaded image is deleted immediately after inference. |
| **🤖 AI Farm Assistant** | Groq LLM with agricultural prompt | Integrates Groq `llama-3.3-70b-versatile` with prompt specialized in Indian farming, Kharif/Rabi seasons, and government schemes, plus an intelligent offline knowledge base fallback. |
| **📊 Health Endpoint** | `GET /api/health` | Health check reporting status of the Node gateway and Python ML model singleton. |
| **📝 Rotating File Logger** | 5 × 2 MB rotating handler | `utils/logger.py` configures `RotatingFileHandler` writing structured logs to `logs/kishaan_deepak.log`. |

---

## 🚀 How to Run

### Step 1: Start the Python ML Microservice

```powershell
cd ml-service
python -m pip install -r requirements.txt
python train_models.py    # (Already executed: models and dataset are pre-generated)
python app.py             # Starts Python server on http://127.0.0.1:5001
```

### Step 2: Start the Express Gateway Server

```powershell
cd server
npm install
node server.js            # Starts Express API Gateway on http://localhost:5000
```

> *Note:* The Express gateway does not require a database. Prediction, disease, and chat requests are processed and returned without server-side persistence.

### Step 3: Start the React Frontend

```powershell
cd client
npm install
npm run dev               # Starts Vite dev server on http://localhost:3000
```

*(Alternatively, since `client/dist` is already built, navigating directly to `http://localhost:5000` serves the full React application directly through Express!)*

---

## 📡 REST API Documentation

### 1. Health Check

- **Endpoint**: `GET /api/health`
- **Response**:

```json
{
  "status": "healthy",
  "gateway": { "port": 5000, "node_version": "v24.18.0" },
  "ml_microservice": {
    "status": "healthy",
    "yield_model": "loaded",
    "disease_model": "loaded",
    "uptime_seconds": 124.5
  }
}
```

### 2. Yield Prediction

- **Options**: `GET /api/yield/options`
- **Predict**: `POST /api/yield/predict`
- **Request Body**:

```json
{
  "crop": "Rice",
  "region": "Punjab",
  "season": "Kharif",
  "soil_type": "Alluvial",
  "temperature": 29.5,
  "rainfall": 1350,
  "humidity": 82
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "prediction_tonnes_per_hectare": 7.42,
    "crop": "Rice",
    "region": "Punjab",
    "season": "Kharif",
    "benchmark_tonnes_per_hectare": 3.7,
    "variance_percentage": 100.5,
    "status": "Optimal",
    "advice": "Favorable climate conditions expected for high productivity."
  }
}
```

### 3. Paddy Disease Classification

- **Endpoint**: `POST /api/disease/predict`
- **Content-Type**: `multipart/form-data` (`image` file, max 5 MB)
- **Response (Passed $\ge 60\%$ Guard)**:

```json
{
  "success": true,
  "disease": "Bacterial Leaf Blight",
  "confidence_score": 87.4,
  "threshold_passed": true,
  "remedies": {
    "severity": "High",
    "causal_organism": "Xanthomonas oryzae pv. oryzae",
    "chemical_control": "Spray Copper Hydroxide @ 2.5 g/L or Streptocycline @ 100 mg/L.",
    "cultural_practices": "Drain standing water immediately. Avoid excessive Nitrogen fertilizer."
  }
}
```

- **Response (Rejected by $<60\%$ Guard)**:

```json
{
  "success": false,
  "error": "LowConfidenceError",
  "message": "Confidence score (23.2%) is below the mandatory 60% threshold guard. The uploaded image does not appear to be a clear paddy leaf. Please upload a focused photo under good lighting.",
  "confidence_score": 23.2,
  "threshold": 60
}
```

### 4. AI Farm Assistant Chat

- **Endpoint**: `POST /api/chat`
- **Request Body**:

```json
{
  "messages": [
    { "role": "user", "content": "Kharif dhan ke liye urea kitna dalein?" }
  ],
  "language": "hinglish"
}
```
