"""
Kishaan Deepak - Paddy Disease Dataset Loader & Preprocessing Pipeline
Handles:
- Configurable dataset directory (default: D:\\New folder\\Kissan-Deepak\\dataset)
- Windows-safe pathlib path management
- train_images/, Test_images/ / test_images/, train.csv, sample_submission.csv
- Class/disease folders inside train_images/
- Existing preprocessing: 128x128 resize -> Grayscale -> 1764-dim HOG extraction
- Label mapping to existing project naming convention
- Dataset validation and verification
"""

import os
import sys
from pathlib import Path
from typing import Union, Optional, Tuple, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
import pandas as pd
from skimage.feature import hog
from sklearn.preprocessing import LabelEncoder

# Ensure ml-service root is on sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

# Default configurable dataset directory (Windows-safe pathlib)
DEFAULT_DATASET_DIR = Path(r"D:\New folder\Kissan-Deepak\dataset")

# Expected HOG feature length for 128x128 image with 16x16 cell, 2x2 block, 9 bins:
# (128/16 - 1) * (128/16 - 1) * 2 * 2 * 9 = 7 * 7 * 36 = 1764
EXPECTED_FEATURE_DIM = 1764

# Mapping from raw dataset/folder labels to project display labels
RAW_TO_DISPLAY_MAPPING: Dict[str, str] = {
    "bacterial_leaf_blight": "Bacterial Leaf Blight",
    "bacterial_leaf_streak": "Bacterial Leaf Streak",
    "bacterial_panicle_blight": "Bacterial Panicle Blight",
    "blast": "Blast",
    "brown_spot": "Brown Spot",
    "dead_heart": "Dead Heart",
    "downy_mildew": "Downy Mildew",
    "hispa": "Hispa",
    "normal": "Normal",
    "tungro": "Tungro",
}

# Bidirectional mapping from display to raw Kaggle submission labels
DISPLAY_TO_RAW_MAPPING: Dict[str, str] = {
    v: k for k, v in RAW_TO_DISPLAY_MAPPING.items()
}
# Legacy aliases
DISPLAY_TO_RAW_MAPPING["Leaf Blast"] = "blast"
DISPLAY_TO_RAW_MAPPING["Rice Hispa"] = "hispa"
DISPLAY_TO_RAW_MAPPING["Healthy Leaf"] = "normal"


def resolve_dataset_path(custom_path: Optional[Union[str, Path]] = None) -> Path:
    """
    Resolves the dataset directory path safely using pathlib.
    Priority:
    1. custom_path if provided
    2. Environment variable DATASET_PATH or DATASET_DIR
    3. DEFAULT_DATASET_DIR (D:\\New folder\\Kissan-Deepak\\dataset)
    4. Fallback relative ../dataset if default does not exist on disk
    """
    if custom_path is not None:
        p = Path(custom_path).resolve()
        return p

    env_path = os.environ.get("DATASET_PATH") or os.environ.get("DATASET_DIR")
    if env_path:
        return Path(env_path).resolve()

    if DEFAULT_DATASET_DIR.exists():
        return DEFAULT_DATASET_DIR.resolve()

    # Relative fallback (e.g. repo root / dataset)
    rel_path = CURRENT_DIR.parent / "dataset"
    if rel_path.exists():
        return rel_path.resolve()

    return DEFAULT_DATASET_DIR.resolve()


def find_dir_case_insensitive(parent: Path, name: str) -> Optional[Path]:
    """Finds a child directory in a case-insensitive manner."""
    if not parent.exists():
        return None
    direct = parent / name
    if direct.exists() and direct.is_dir():
        return direct
    name_lower = name.lower()
    for item in parent.iterdir():
        if item.is_dir() and item.name.lower() == name_lower:
            return item
    return None


def find_file_case_insensitive(parent: Path, name: str) -> Optional[Path]:
    """Finds a child file in a case-insensitive manner."""
    if not parent.exists():
        return None
    direct = parent / name
    if direct.exists() and direct.is_file():
        return direct
    name_lower = name.lower()
    for item in parent.iterdir():
        if item.is_file() and item.name.lower() == name_lower:
            return item
    return None


def preprocess_image(image_input: Union[str, Path, bytes, bytearray, np.ndarray]) -> np.ndarray:
    """
    Standard project preprocessing:
    1. Decode / read image
    2. Resize to 128x128 (INTER_AREA)
    3. Convert to Grayscale
    4. Extract HOG feature vector (1764 dimensions)
    """
    if isinstance(image_input, (str, Path)):
        img = cv2.imread(str(image_input), cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Failed to read image at: {image_input}")
    elif isinstance(image_input, (bytes, bytearray)):
        np_arr = np.frombuffer(image_input, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from bytes.")
    elif isinstance(image_input, np.ndarray):
        img = image_input
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")

    # 1. Resize to 128x128
    resized = cv2.resize(img, (128, 128), interpolation=cv2.INTER_AREA)

    # 2. Convert to Grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # 3. Extract HOG feature vector
    features = hog(
        gray,
        orientations=9,
        pixels_per_cell=(16, 16),
        cells_per_block=(2, 2),
        block_norm="L2-Hys",
        transform_sqrt=True
    )

    return features


def validate_dataset(dataset_path: Optional[Union[str, Path]] = None, sample_check_count: int = 5) -> Dict[str, Any]:
    """
    Validates dataset paths, required files/folders, images, classes, labels,
    and HOG feature compatibility.
    """
    root = resolve_dataset_path(dataset_path)
    report: Dict[str, Any] = {
        "dataset_root": str(root),
        "exists": root.exists(),
        "valid": False,
        "errors": [],
        "warnings": [],
        "details": {}
    }

    if not root.exists():
        report["errors"].append(f"Dataset root directory does not exist: {root}")
        return report

    # 1. Validate train_images directory
    train_images_dir = find_dir_case_insensitive(root, "train_images")
    if train_images_dir is None:
        report["errors"].append(f"Missing required 'train_images' directory in {root}")
    else:
        report["details"]["train_images_dir"] = str(train_images_dir)
        class_dirs = [d for d in train_images_dir.iterdir() if d.is_dir()]
        report["details"]["class_directories_count"] = len(class_dirs)
        report["details"]["class_directories"] = [d.name for d in sorted(class_dirs)]

    # 2. Validate train.csv
    train_csv = find_file_case_insensitive(root, "train.csv")
    if train_csv is None:
        report["warnings"].append("train.csv not found; will rely on train_images/ class directory structure.")
    else:
        report["details"]["train_csv"] = str(train_csv)
        try:
            df_train = pd.read_csv(train_csv)
            report["details"]["train_csv_rows"] = len(df_train)
            report["details"]["train_csv_columns"] = df_train.columns.tolist()
            if "image_id" not in df_train.columns or "label" not in df_train.columns:
                report["errors"].append("train.csv missing required columns ('image_id', 'label')")
            else:
                csv_labels = sorted(df_train["label"].dropna().unique().tolist())
                report["details"]["train_csv_labels"] = csv_labels
                report["details"]["train_csv_label_counts"] = df_train["label"].value_counts().to_dict()
        except Exception as e:
            report["errors"].append(f"Failed to read train.csv: {e}")

    # 3. Validate test_images directory
    test_images_dir = find_dir_case_insensitive(root, "test_images")
    if test_images_dir is None:
        report["warnings"].append("test_images/ (or Test_images/) directory not found.")
    else:
        report["details"]["test_images_dir"] = str(test_images_dir)
        test_imgs = list(test_images_dir.glob("*.[jJ][pP][gG]")) + list(test_images_dir.glob("*.[pP][nN][gG]"))
        report["details"]["test_images_count"] = len(test_imgs)

    # 4. Validate sample_submission.csv
    sub_csv = find_file_case_insensitive(root, "sample_submission.csv")
    if sub_csv is None:
        report["warnings"].append("sample_submission.csv not found.")
    else:
        report["details"]["sample_submission_csv"] = str(sub_csv)
        try:
            df_sub = pd.read_csv(sub_csv)
            report["details"]["sample_submission_rows"] = len(df_sub)
            report["details"]["sample_submission_columns"] = df_sub.columns.tolist()
        except Exception as e:
            report["warnings"].append(f"Failed to parse sample_submission.csv: {e}")

    # 5. Validate image reading & HOG preprocessing compatibility
    if train_images_dir is not None:
        all_imgs = list(train_images_dir.glob("*/*.[jJ][pP][gG]"))
        report["details"]["total_train_images_found"] = len(all_imgs)
        if len(all_imgs) == 0:
            report["errors"].append("No image files (*.jpg) found inside train_images class folders.")
        else:
            # Test sample preprocessing
            samples_to_test = all_imgs[:sample_check_count]
            preprocessed_shapes = []
            for s_img in samples_to_test:
                try:
                    feat = preprocess_image(s_img)
                    preprocessed_shapes.append(feat.shape)
                except Exception as e:
                    report["errors"].append(f"Preprocessing failed on sample {s_img.name}: {e}")

            if preprocessed_shapes:
                all_match = all(s == (EXPECTED_FEATURE_DIM,) for s in preprocessed_shapes)
                report["details"]["hog_feature_dim"] = EXPECTED_FEATURE_DIM
                report["details"]["sample_hog_shapes_match"] = all_match
                if not all_match:
                    report["errors"].append(
                        f"HOG feature dimension mismatch. Expected ({EXPECTED_FEATURE_DIM},), got {preprocessed_shapes}"
                    )

    # Overall validity flag
    report["valid"] = len(report["errors"]) == 0
    return report


def discover_images_and_labels(
    dataset_path: Optional[Union[str, Path]] = None,
    use_csv: bool = True
) -> List[Tuple[Path, str]]:
    """
    Discovers all train image paths and their respective labels.
    Uses train.csv when present and cross-checks with train_images folders.
    """
    root = resolve_dataset_path(dataset_path)
    train_images_dir = find_dir_case_insensitive(root, "train_images")
    if train_images_dir is None:
        raise FileNotFoundError(f"train_images directory not found in {root}")

    train_csv = find_file_case_insensitive(root, "train.csv") if use_csv else None

    pairs: List[Tuple[Path, str]] = []

    if train_csv is not None:
        df = pd.read_csv(train_csv)
        for _, row in df.iterrows():
            img_id = str(row["image_id"]).strip()
            label = str(row["label"]).strip()

            # First try train_images / label / img_id
            p = train_images_dir / label / img_id
            if not p.exists():
                # Fallback to direct train_images / img_id
                p = train_images_dir / img_id

            if p.exists():
                pairs.append((p, label))
            else:
                # Fallback search inside train_images
                matches = list(train_images_dir.glob(f"*/{img_id}"))
                if matches:
                    pairs.append((matches[0], label))
                else:
                    raise FileNotFoundError(f"Image {img_id} (label '{label}') not found in {train_images_dir}")
    else:
        # Directory-based discovery
        for class_dir in train_images_dir.iterdir():
            if class_dir.is_dir():
                label = class_dir.name
                imgs = (
                    list(class_dir.glob("*.[jJ][pP][gG]"))
                    + list(class_dir.glob("*.[jJ][pP][eE][gG]"))
                    + list(class_dir.glob("*.[pP][nN][gG]"))
                )
                for img_p in imgs:
                    pairs.append((img_p, label))

    return pairs


def _extract_worker(item: Tuple[Path, str]) -> Tuple[np.ndarray, str]:
    """Helper worker for multi-threaded HOG extraction."""
    img_path, raw_label = item
    feat = preprocess_image(img_path)
    return feat, raw_label


def load_dataset_features(
    dataset_path: Optional[Union[str, Path]] = None,
    max_samples: Optional[int] = None,
    max_workers: int = 8,
    use_display_labels: bool = True,
    verbose: bool = True
) -> Tuple[np.ndarray, np.ndarray, LabelEncoder, pd.DataFrame]:
    """
    Loads images, executes HOG preprocessing in parallel, maps labels,
    and returns feature matrix X, encoded target y, fitted LabelEncoder, and metadata DataFrame.
    """
    root = resolve_dataset_path(dataset_path)
    if verbose:
        print(f"Loading dataset from: {root}")

    pairs = discover_images_and_labels(root, use_csv=True)
    if verbose:
        print(f"Discovered {len(pairs)} labeled images in dataset.")

    # Optional subsampling for verification / quick smoke runs
    if max_samples is not None and max_samples < len(pairs):
        # Stratified subsampling
        df_temp = pd.DataFrame(pairs, columns=["path", "label"])
        samples_per_class = max(1, max_samples // df_temp["label"].nunique())
        sampled_list = []
        for _, group in df_temp.groupby("label"):
            sampled_list.append(group.sample(n=min(len(group), samples_per_class), random_state=42))
        sampled = pd.concat(sampled_list, ignore_index=True)
        pairs = list(zip(sampled["path"], sampled["label"]))
        if verbose:
            print(f"Subsampled to {len(pairs)} images ({samples_per_class} per class).")

    # Parallel HOG feature extraction using ThreadPoolExecutor (OpenCV/Cython release GIL)
    if verbose:
        print(f"Extracting 128x128 HOG features ({EXPECTED_FEATURE_DIM} dims) with {max_workers} threads...")

    X_list: List[np.ndarray] = []
    y_raw_list: List[str] = []
    paths_list: List[str] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = executor.map(_extract_worker, pairs)
        for idx, (features, raw_label) in enumerate(results):
            X_list.append(features)
            y_raw_list.append(raw_label)
            paths_list.append(str(pairs[idx][0]))
            if verbose and (idx + 1) % 1000 == 0:
                print(f"  Processed {idx + 1}/{len(pairs)} images...")

    X = np.array(X_list, dtype=np.float32)

    # Label mapping: convert raw Kaggle labels to clean Title Case display labels
    if use_display_labels:
        y_labels = [RAW_TO_DISPLAY_MAPPING.get(lbl, lbl.replace("_", " ").title()) for lbl in y_raw_list]
    else:
        y_labels = y_raw_list

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_labels)

    metadata_df = pd.DataFrame({
        "image_path": paths_list,
        "raw_label": y_raw_list,
        "label": y_labels,
        "encoded_label": y
    })

    if verbose:
        print(f"Extracted feature matrix shape: {X.shape}")
        print(f"Classes ({len(label_encoder.classes_)}): {label_encoder.classes_.tolist()}")

    return X, y, label_encoder, metadata_df


def load_test_images(dataset_path: Optional[Union[str, Path]] = None) -> List[Tuple[str, Path]]:
    """
    Loads test images from Test_images/ / test_images/ matching sample_submission.csv if present.
    Returns list of (image_id, image_path).
    """
    root = resolve_dataset_path(dataset_path)
    test_dir = find_dir_case_insensitive(root, "test_images")
    if test_dir is None:
        raise FileNotFoundError(f"test_images directory not found in {root}")

    sub_csv = find_file_case_insensitive(root, "sample_submission.csv")
    if sub_csv is not None:
        df_sub = pd.read_csv(sub_csv)
        results = []
        for img_id in df_sub["image_id"]:
            p = test_dir / str(img_id)
            if p.exists():
                results.append((str(img_id), p))
        return results

    # Scan directory directly
    results = []
    for p in sorted(test_dir.glob("*.[jJ][pP][gG]")):
        results.append((p.name, p))
    return results


def generate_submission(
    model: Any,
    label_encoder: LabelEncoder,
    dataset_path: Optional[Union[str, Path]] = None,
    output_csv: Optional[Union[str, Path]] = None,
    max_workers: int = 8,
    use_raw_labels: bool = True
) -> pd.DataFrame:
    """
    Generates predictions for all test images and outputs a DataFrame / CSV matching sample_submission.csv.
    """
    test_pairs = load_test_images(dataset_path)
    print(f"Generating predictions for {len(test_pairs)} test images...")

    def _test_worker(item):
        img_id, img_path = item
        feat = preprocess_image(img_path)
        return img_id, feat

    features_list = []
    ids_list = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for img_id, feat in executor.map(_test_worker, test_pairs):
            ids_list.append(img_id)
            features_list.append(feat)

    X_test = np.array(features_list, dtype=np.float32)
    preds = model.predict(X_test)
    predicted_labels = label_encoder.inverse_transform(preds)

    if use_raw_labels:
        # Map back to Kaggle raw label format (e.g. "Bacterial Leaf Blight" -> "bacterial_leaf_blight")
        final_labels = [DISPLAY_TO_RAW_MAPPING.get(lbl, lbl.lower().replace(" ", "_")) for lbl in predicted_labels]
    else:
        final_labels = list(predicted_labels)

    sub_df = pd.DataFrame({
        "image_id": ids_list,
        "label": final_labels
    })

    if output_csv is not None:
        out_p = Path(output_csv).resolve()
        out_p.parent.mkdir(parents=True, exist_ok=True)
        sub_df.to_csv(out_p, index=False)
        print(f"Saved submission predictions to: {out_p}")

    return sub_df
