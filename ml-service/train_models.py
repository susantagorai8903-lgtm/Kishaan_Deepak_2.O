"""
Kishaan Deepak - Model Training & Dataset Generator
Trains:
1. Yield Prediction Regressor (Pipeline: Preprocessing -> Regressor)
2. 10-Class Paddy Disease Classifier (HOG features -> StandardScaler -> Logistic Regression)
Generates:
- data/indian_crops.csv
- trained_models/yield_model.joblib
- trained_models/disease_model.joblib
- trained_models/disease_encoder.joblib
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "trained_models")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. Generate Indian Crops Agricultural Dataset & Train Yield Model
# -------------------------------------------------------------
def generate_and_train_yield_model():
    print("[1/2] Generating Indian Agricultural Dataset & Training Yield Model...")
    np.random.seed(42)

    crops = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Jute", "Groundnut", "Mustard", "Bajra", "Pulses"]
    regions = ["Punjab", "Uttar Pradesh", "West Bengal", "Maharashtra", "Tamil Nadu", "Andhra Pradesh", "Haryana", "Bihar", "Madhya Pradesh", "Karnataka"]
    seasons = ["Kharif", "Rabi", "Whole Year"]
    soils = ["Alluvial", "Black", "Red & Yellow", "Laterite", "Clayey", "Sandy Loam"]

    records = []
    # Crop baseline yields (tonnes/hectare) and optimal ranges
    crop_profiles = {
        "Rice": {"base": 3.8, "temp": (22, 34), "rain": (1000, 2200), "hum": (70, 90), "soil": ["Alluvial", "Clayey"]},
        "Wheat": {"base": 3.5, "temp": (12, 25), "rain": (400, 900), "hum": (40, 70), "soil": ["Alluvial", "Black"]},
        "Maize": {"base": 3.0, "temp": (18, 30), "rain": (500, 1100), "hum": (55, 75), "soil": ["Alluvial", "Red & Yellow"]},
        "Cotton": {"base": 1.9, "temp": (21, 35), "rain": (500, 1000), "hum": (45, 70), "soil": ["Black", "Alluvial"]},
        "Sugarcane": {"base": 72.0, "temp": (20, 35), "rain": (1200, 2500), "hum": (65, 85), "soil": ["Alluvial", "Black", "Clayey"]},
        "Jute": {"base": 2.5, "temp": (24, 36), "rain": (1200, 2000), "hum": (75, 95), "soil": ["Alluvial"]},
        "Groundnut": {"base": 1.7, "temp": (20, 32), "rain": (500, 950), "hum": (50, 70), "soil": ["Sandy Loam", "Red & Yellow"]},
        "Mustard": {"base": 1.5, "temp": (10, 24), "rain": (250, 600), "hum": (45, 65), "soil": ["Alluvial", "Sandy Loam"]},
        "Bajra": {"base": 1.4, "temp": (22, 36), "rain": (300, 700), "hum": (30, 60), "soil": ["Sandy Loam", "Black"]},
        "Pulses": {"base": 1.1, "temp": (15, 30), "rain": (350, 800), "hum": (40, 65), "soil": ["Alluvial", "Black", "Red & Yellow"]},
    }

    for _ in range(3000):
        crop = np.random.choice(crops)
        region = np.random.choice(regions)
        season = np.random.choice(["Kharif", "Rabi"]) if crop not in ["Sugarcane"] else "Whole Year"
        soil = np.random.choice(soils)

        profile = crop_profiles[crop]
        # Sample weather around optimal with variance
        temp = np.random.uniform(profile["temp"][0] - 5, profile["temp"][1] + 5)
        rain = np.random.uniform(max(100, profile["rain"][0] - 300), profile["rain"][1] + 400)
        hum = np.random.uniform(max(20, profile["hum"][0] - 20), min(98, profile["hum"][1] + 10))

        # Calculate realistic yield penalty / bonus
        opt_temp_mid = sum(profile["temp"]) / 2
        opt_rain_mid = sum(profile["rain"]) / 2
        opt_hum_mid = sum(profile["hum"]) / 2

        temp_factor = 1.0 - (abs(temp - opt_temp_mid) / 25.0) * 0.3
        rain_factor = 1.0 - (abs(rain - opt_rain_mid) / max(1, opt_rain_mid)) * 0.25
        hum_factor = 1.0 - (abs(hum - opt_hum_mid) / 50.0) * 0.15
        soil_bonus = 0.15 if soil in profile["soil"] else -0.1

        factor = max(0.35, temp_factor + rain_factor + hum_factor + soil_bonus - 1.0)
        noise = np.random.normal(0, 0.05)
        yield_val = round(max(0.2, profile["base"] * (factor + noise)), 2)

        records.append({
            "Crop": crop,
            "Region": region,
            "Season": season,
            "Soil_Type": soil,
            "Temperature": round(temp, 1),
            "Rainfall": round(rain, 1),
            "Humidity": round(hum, 1),
            "Yield_Tonnes_Per_Hectare": yield_val
        })

    df = pd.DataFrame(records)
    csv_path = os.path.join(DATA_DIR, "indian_crops.csv")
    df.to_csv(csv_path, index=False)
    print(f"  -> Saved dataset ({len(df)} rows) to: {csv_path}")

    # Build scikit-learn Pipeline
    categorical_features = ["Crop", "Region", "Season", "Soil_Type"]
    numerical_features = ["Temperature", "Rainfall", "Humidity"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", StandardScaler(), numerical_features)
        ]
    )

    model = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42))
    ])

    X = df[["Crop", "Region", "Season", "Soil_Type", "Temperature", "Rainfall", "Humidity"]]
    y = df["Yield_Tonnes_Per_Hectare"]

    model.fit(X, y)
    yield_model_path = os.path.join(MODELS_DIR, "yield_model.joblib")
    joblib.dump(model, yield_model_path)
    print(f"  -> Saved Yield Model to: {yield_model_path}")

import sys
import argparse
from pathlib import Path

# Safe Windows console encoding configuration
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

from dataset_loader import (
    DEFAULT_DATASET_DIR,
    EXPECTED_FEATURE_DIM,
    RAW_TO_DISPLAY_MAPPING,
    resolve_dataset_path,
    validate_dataset,
    discover_images_and_labels,
    preprocess_image,
    load_dataset_features,
    generate_submission
)

# -------------------------------------------------------------
# 2. Verify Pipeline (Step 0)
# -------------------------------------------------------------
def verify_disease_pipeline(dataset_path=None):
    """
    Step 0 verification required before full training:
    Verifies dataset loading, image/label mapping, preprocessing,
    input shapes, class mapping, imports, paths, and missing-file/label/shape issues.
    """
    print("=" * 70)
    print("[STEP 0] VERIFYING PADDY DISEASE TRAINING & INFERENCE PIPELINE")
    print("=" * 70)

    # 1. Imports check
    print("[1/6] Verifying Imports & Runtime Environment...")
    import sklearn, skimage, cv2
    print(f"  -> Python: {sys.version.split()[0]}")
    print(f"  -> scikit-learn: {sklearn.__version__}")
    print(f"  -> OpenCV: {cv2.__version__}")
    print(f"  -> scikit-image: {skimage.__version__}")

    # 2. Path & file validation
    resolved_path = resolve_dataset_path(dataset_path)
    print(f"\n[2/6] Validating Paths & Dataset Structure at: {resolved_path}")
    report = validate_dataset(resolved_path)
    for err in report["errors"]:
        print(f"  [ERROR] {err}")
    for warn in report["warnings"]:
        print(f"  [WARN] {warn}")
    if not report["valid"]:
        raise RuntimeError(f"Dataset validation failed: {report['errors']}")

    det = report["details"]
    print(f"  -> Found train_images dir: {det.get('train_images_dir')}")
    print(f"  -> Total train images discovered: {det.get('total_train_images_found', 0)}")
    print(f"  -> Class directories ({det.get('class_directories_count', 0)}): {det.get('class_directories', [])}")
    print(f"  -> train.csv rows: {det.get('train_csv_rows', 'N/A')}")
    print(f"  -> test_images count: {det.get('test_images_count', 'N/A')}")
    print(f"  -> sample_submission rows: {det.get('sample_submission_rows', 'N/A')}")

    # 3. Image/Label discovery & mapping check
    print("\n[3/6] Verifying Image/Label Discovery & Mapping...")
    pairs = discover_images_and_labels(resolved_path, use_csv=True)
    print(f"  -> Successfully discovered {len(pairs)} labeled image pairs.")
    unique_labels = sorted(list(set(label for _, label in pairs)))
    print(f"  -> Unique raw labels ({len(unique_labels)}): {unique_labels}")
    mapped_labels = [RAW_TO_DISPLAY_MAPPING.get(lbl, lbl.replace('_', ' ').title()) for lbl in unique_labels]
    print(f"  -> Mapped display labels: {mapped_labels}")

    # 4. Preprocessing & Input shapes check
    print("\n[4/6] Verifying Image Preprocessing & Input Shapes...")
    seen_classes = set()
    sample_pairs = []
    for p, lbl in pairs:
        if lbl not in seen_classes:
            seen_classes.add(lbl)
            sample_pairs.append((p, lbl))

    features_list = []
    for p, lbl in sample_pairs:
        feat = preprocess_image(p)
        assert feat.shape == (EXPECTED_FEATURE_DIM,), f"Shape mismatch for {p.name}: got {feat.shape}"
        assert not np.isnan(feat).any(), f"NaN in features for {p.name}"
        features_list.append(feat)
        print(f"  -> Sample [{lbl}] {p.name} -> shape: {feat.shape}, min: {feat.min():.4f}, max: {feat.max():.4f}")

    # 5. Label encoding and model dry-run check
    print("\n[5/6] Verifying Label Encoding & Model Compatibility (Dry-run Fit)...")
    le = LabelEncoder()
    sample_y = le.fit_transform([RAW_TO_DISPLAY_MAPPING.get(lbl, lbl) for _, lbl in sample_pairs])
    sample_X = np.array(features_list, dtype=np.float32)

    test_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=100, C=1.5, solver="lbfgs", random_state=42))
    ])
    test_pipeline.fit(sample_X, sample_y)
    probs = test_pipeline.predict_proba(sample_X[:2])
    assert probs.shape == (2, len(le.classes_)), f"Probabilities shape mismatch: {probs.shape}"
    pred_classes = le.inverse_transform(np.argmax(probs, axis=1))
    print(f"  -> Dry-run fit successful! Classes: {le.classes_.tolist()}")
    print(f"  -> Sample predictions: {pred_classes.tolist()}")

    # 6. Inference & Remedy mapping check
    print("\n[6/6] Verifying Inference & Remedy Mapping Compatibility...")
    from services.disease_service import DiseaseService
    for cls_name in le.classes_:
        remedy = DiseaseService.get_remedy(cls_name)
        assert "severity" in remedy and "chemical_control" in remedy, f"Missing remedy for {cls_name}"
        print(f"  -> Class '{cls_name}': Severity={remedy['severity']}, Causal={remedy['causal_organism'][:30]}...")

    print("=" * 70)
    print("[OK] ALL PIPELINE VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return True


# -------------------------------------------------------------
# 3. Train 10-Class Paddy Disease Classifier on Real Dataset
# -------------------------------------------------------------
def train_disease_model(
    dataset_path=None,
    verify_only=False,
    max_samples=None,
    test_size=0.2,
    max_workers=8,
    save_models=True
):
    print("\n[2/2] Training 10-Class Paddy Disease Classifier on Real Dataset...")
    resolved_path = resolve_dataset_path(dataset_path)

    # First verify the pipeline before starting full training
    verify_disease_pipeline(resolved_path)

    if verify_only:
        print("\nPipeline verified successfully (--verify-only specified). Skipping full training.")
        return None

    # Step 1: Discover images and extract features using existing preprocessing
    print("\n[Training Step 1] Loading Dataset & Extracting Features...")
    X, y, label_encoder, metadata_df = load_dataset_features(
        dataset_path=resolved_path,
        max_samples=max_samples,
        max_workers=max_workers,
        use_display_labels=True,
        verbose=True
    )

    # Step 2: Train / Validation Split (Stratified)
    print(f"\n[Training Step 2] Splitting into Train / Validation ({int((1-test_size)*100)}% / {int(test_size*100)}%)...")
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )
    print(f"  -> Train set: {X_train.shape[0]} samples")
    print(f"  -> Validation set: {X_val.shape[0]} samples (purely real dataset images)")

    # Preserve existing logic: add ambiguous/non-leaf calibration samples distributed uniformly
    # so non-leaf/uncertain images stay below the 60% confidence guard per specification
    noise_samples = []
    noise_labels = []
    for c_idx in range(len(label_encoder.classes_)):
        for _ in range(25):
            noise_samples.append(np.random.uniform(0.005, 0.05, size=EXPECTED_FEATURE_DIM).astype(np.float32))
            noise_labels.append(c_idx)

    X_train = np.vstack([X_train, np.array(noise_samples, dtype=np.float32)])
    y_train = np.concatenate([y_train, np.array(noise_labels, dtype=y_train.dtype)])

    # Step 3: Existing Model Architecture (StandardScaler + Multi-class Logistic Regression)
    print("\n[Training Step 3] Training Existing Scikit-Learn Model (StandardScaler + LogisticRegression)...")
    disease_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=1000, C=1.5, solver="lbfgs", random_state=42))
    ])

    disease_pipeline.fit(X_train, y_train)
    train_acc = disease_pipeline.score(X_train, y_train)
    val_acc = disease_pipeline.score(X_val, y_val)

    print(f"\n[Training Step 4] Model Evaluation:")
    print(f"  -> Training Accuracy:   {train_acc * 100:.2f}%")
    print(f"  -> Validation Accuracy: {val_acc * 100:.2f}%")

    y_pred = disease_pipeline.predict(X_val)
    report_str = classification_report(
        y_val, y_pred, target_names=label_encoder.classes_, digits=4
    )
    print("\nClassification Report on Validation Set:")
    print(report_str)

    # Step 4: Save Model & Label Encoder
    if save_models:
        disease_model_path = os.path.join(MODELS_DIR, "disease_model.joblib")
        encoder_path = os.path.join(MODELS_DIR, "disease_encoder.joblib")

        joblib.dump(disease_pipeline, disease_model_path)
        joblib.dump(label_encoder, encoder_path)

        print(f"\n[Training Step 5] Serialization & Saving:")
        print(f"  -> Saved Disease Model to: {disease_model_path}")
        print(f"  -> Saved Label Encoder to: {encoder_path}")

    # Step 5: Verify Existing Inference Pipeline with Saved Model
    print("\n[Training Step 6] Verifying Compatibility with Existing Inference Pipeline...")
    sample_img_path = metadata_df.iloc[0]["image_path"]
    with open(sample_img_path, "rb") as f:
        sample_bytes = f.read()

    from models_loader.loader import ModelStore
    store = ModelStore.get_instance()
    store.disease_model = joblib.load(os.path.join(MODELS_DIR, "disease_model.joblib"))
    store.disease_encoder = joblib.load(os.path.join(MODELS_DIR, "disease_encoder.joblib"))

    from services.disease_service import DiseaseService
    inference_result = DiseaseService.predict(sample_bytes)
    print(f"  -> Test Inference on '{Path(sample_img_path).name}':")
    print(f"     Success: {inference_result.get('success')}")
    print(f"     Predicted Disease: {inference_result.get('disease')}")
    print(f"     Confidence: {inference_result.get('confidence_score')}%")
    print(f"     Severity: {inference_result.get('remedies', {}).get('severity')}")
    print(f"     Top Predictions: {inference_result.get('top_predictions')}")
    assert "success" in inference_result, "Inference response missing success key"

    print("\n[SUCCESS] Full Training, Evaluation, Saving, and Inference Verification Complete!")
    return disease_pipeline


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kishaan Deepak - Model Training & Verification Pipeline")
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default=str(DEFAULT_DATASET_DIR),
        help=f"Dataset directory path (default: {DEFAULT_DATASET_DIR})"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Run pipeline verification checks without full training"
    )
    parser.add_argument(
        "--skip-yield",
        action="store_true",
        help="Skip yield regression model training and dataset generation"
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=None,
        help="Limit number of samples for fast smoke runs"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Number of threads for parallel feature extraction (default: 8)"
    )
    parser.add_argument(
        "--generate-submission",
        action="store_true",
        help="Generate predictions for test images matching sample_submission.csv"
    )

    args = parser.parse_args()

    # 1. Yield model (skip if requested or verify-only)
    if not args.skip_yield and not args.verify_only:
        generate_and_train_yield_model()

    # 2. Disease model (with verification check)
    pipeline = train_disease_model(
        dataset_path=args.dataset_dir,
        verify_only=args.verify_only,
        max_samples=args.max_samples,
        max_workers=args.workers
    )

    # 3. Optional submission generation
    if args.generate_submission and pipeline is not None:
        enc_path = os.path.join(MODELS_DIR, "disease_encoder.joblib")
        le = joblib.load(enc_path)
        sub_csv_out = os.path.join(MODELS_DIR, "test_predictions.csv")
        generate_submission(
            pipeline,
            le,
            dataset_path=args.dataset_dir,
            output_csv=sub_csv_out,
            max_workers=args.workers
        )

