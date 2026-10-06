import base64
import os
from pathlib import Path

import numpy as np
import cv2
from skimage.feature import hog
from models_loader.loader import ModelStore
from utils.logger import get_logger

logger = get_logger("disease_service")

CONFIDENCE_THRESHOLD = 0.60  # 60% strict guard per PDF spec
REFERENCE_FEATURE_STATS = None


def _get_reference_feature_stats():
    """Build a paddy feature centroid from the existing training set, without training a new model.

    The project only contains disease/healthy paddy classes. This acts as a safe rejection gate based on
    how far an input sits from the known paddy leaf feature distribution, rather than assuming all high-
    confidence multiclass predictions are valid paddy leaves.
    """
    global REFERENCE_FEATURE_STATS
    if REFERENCE_FEATURE_STATS is not None:
        return REFERENCE_FEATURE_STATS

    dataset_dir = Path(__file__).resolve().parents[1] / "dataset" / "train_images"
    feature_vectors = []

    if dataset_dir.exists():
        for class_dir in sorted(dataset_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            for image_path in sorted(class_dir.iterdir())[:25]:
                if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                    continue
                try:
                    img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
                    if img is None:
                        continue
                    resized = cv2.resize(img, (128, 128), interpolation=cv2.INTER_AREA)
                    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
                    feature_vector = hog(
                        gray,
                        orientations=9,
                        pixels_per_cell=(16, 16),
                        cells_per_block=(2, 2),
                        block_norm="L2-Hys",
                        transform_sqrt=True,
                    )
                    feature_vectors.append(feature_vector.astype(np.float32))
                except Exception as exc:
                    logger.debug(f"Skipping reference feature sample {image_path.name}: {exc}")

    if not feature_vectors:
        REFERENCE_FEATURE_STATS = {"available": False, "mean": None, "std": None}
        return REFERENCE_FEATURE_STATS

    feature_matrix = np.vstack(feature_vectors)
    mean = feature_matrix.mean(axis=0)
    std = feature_matrix.std(axis=0)
    std[std < 1e-6] = 1.0
    REFERENCE_FEATURE_STATS = {"available": True, "mean": mean, "std": std}
    logger.info("Loaded paddy reference feature distribution from training dataset for suitability checks.")
    return REFERENCE_FEATURE_STATS

DISEASE_REMEDIES = {
    "Bacterial Leaf Blight": {
        "severity": "High",
        "causal_organism": "Xanthomonas oryzae pv. oryzae",
        "symptoms": "Water-soaked lesions that turn yellow/straw-colored along leaf margins with wavy borders.",
        "chemical_control": "Spray Copper Hydroxide 77 WP @ 2.5 g/L or Streptocycline @ 100 mg/L + Copper Oxychloride @ 1.5 g/L.",
        "cultural_practices": "Drain standing water immediately. Avoid top-dressing excessive Nitrogen fertilizer. Disinfect farm tools."
    },
    "Brown Spot": {
        "severity": "Moderate",
        "causal_organism": "Bipolaris oryzae (Cochliobolus miyabeanus)",
        "symptoms": "Small, oval, circular dark-brown lesions with yellowish halos across the leaf blades.",
        "chemical_control": "Spray Mancozeb 75 WP @ 2.0 g/L or Carbendazim 50 WP @ 1.0 g/L at early infection.",
        "cultural_practices": "Correct soil nutrient deficiencies (apply Potassium and Zinc). Treat seeds with Carbendazim before sowing."
    },
    "Leaf Blast": {
        "severity": "High",
        "causal_organism": "Magnaporthe oryzae (Pyricularia oryzae)",
        "symptoms": "Spindle-shaped or eye-shaped lesions with gray or whitish centers and brown/reddish margins.",
        "chemical_control": "Spray Tricyclazole 75 WP @ 0.6 g/L or Isoprothiolane 40 EC @ 1.5 ml/L.",
        "cultural_practices": "Avoid high doses of nitrogenous fertilizers. Maintain proper field water level and remove alternate weed hosts."
    },
    "Neck Blast": {
        "severity": "Critical",
        "causal_organism": "Magnaporthe oryzae attacking neck/panicle node",
        "symptoms": "Brown to black lesions around the panicle base (neck), causing panicles to fall over and produce empty grains.",
        "chemical_control": "Prophylactic spray of Tricyclazole 75 WP @ 0.6 g/L or Kasugamycin 3% SL @ 2.5 ml/L at heading stage.",
        "cultural_practices": "Early planting, resistant varieties, and balanced fertilizer scheduling."
    },
    "Sheath Blight": {
        "severity": "Moderate to High",
        "causal_organism": "Rhizoctonia solani",
        "symptoms": "Oval or elliptical greenish-gray lesions on lower leaf sheaths, gradually spreading upward.",
        "chemical_control": "Spray Validamycin 3L @ 2.0 ml/L or Hexaconazole 5 SC @ 2.0 ml/L directed at stem bases.",
        "cultural_practices": "Maintain wider plant spacing to allow ventilation. Destroy leftover crop stubble."
    },
    "Tungro": {
        "severity": "Critical",
        "causal_organism": "Rice Tungro Bacilliform & Spherical Viruses (vectored by Green Leafhopper)",
        "symptoms": "Stunted growth, reduced tillering, leaves turning yellow-orange starting from the tips.",
        "chemical_control": "Control vector with Imidacloprid 17.8 SL @ 0.3 ml/L or Thiamethoxam 25 WG @ 0.2 g/L.",
        "cultural_practices": "Rogue out and destroy infected clumps. Practice synchronized community planting."
    },
    "Rice Hispa": {
        "severity": "Moderate",
        "causal_organism": "Dicladispa armigera (Insect pest)",
        "symptoms": "White parallel streaks on leaves where adults scrape chlorophyll; leaf tips dry up giving a withered look.",
        "chemical_control": "Spray Chlorpyrifos 20 EC @ 2.0 ml/L or Quinalphos 25 EC @ 2.0 ml/L.",
        "cultural_practices": "Clip and submerge leaf tips before transplanting to eliminate eggs. Sweep netting in early mornings."
    },
    "Leaf Smut": {
        "severity": "Low to Moderate",
        "causal_organism": "Entyloma oryzae",
        "symptoms": "Small, slightly raised, angular black spots scattered over the leaf surface.",
        "chemical_control": "Apply Copper Oxychloride 50 WP @ 2.5 g/L if disease spreads extensively.",
        "cultural_practices": "Balanced fertilization, avoid over-irrigation, and use certified clean seeds."
    },
    "Narrow Brown Spot": {
        "severity": "Low to Moderate",
        "causal_organism": "Cercospora janseana",
        "symptoms": "Narrow, short, linear brown lesions parallel to leaf veins.",
        "chemical_control": "Spray Propiconazole 25 EC @ 1.0 ml/L at the boot stage.",
        "cultural_practices": "Ensure adequate potassium application; harvest promptly when mature."
    },
    "Healthy Leaf": {
        "severity": "None",
        "causal_organism": "N/A",
        "symptoms": "Clear green foliage with normal venation and no visible pathological spots or wilting.",
        "chemical_control": "No chemical application required.",
        "cultural_practices": "Continue recommended irrigation, weeding, and balanced N-P-K nutrient management."
    },
    "Bacterial Leaf Streak": {
        "severity": "Moderate",
        "causal_organism": "Xanthomonas oryzae pv. oryzicola",
        "symptoms": "Narrow, brownish, water-soaked translucent interveinal streaks with tiny yellow bacterial beads along veins.",
        "chemical_control": "Spray Copper Hydroxide 77 WP @ 2.5 g/L or Copper Oxychloride 50 WP @ 2.5 g/L + Streptocycline @ 100 mg/L.",
        "cultural_practices": "Ensure proper field drainage. Avoid excessive nitrogen fertilizer. Use certified disease-free seeds."
    },
    "Bacterial Panicle Blight": {
        "severity": "Critical",
        "causal_organism": "Burkholderia glumae",
        "symptoms": "Florets discolor and turn white to straw-colored while panicles remain upright; grain abortion occurs during flowering.",
        "chemical_control": "Prophylactic copper-based sprays (Copper Hydroxide @ 2.5 g/L) before and during boot stage/heading.",
        "cultural_practices": "Avoid late-season planting, optimize seeding density and nitrogen fertilization, and practice crop rotation."
    },
    "Dead Heart": {
        "severity": "High",
        "causal_organism": "Scirpophaga incertulas (Yellow Stem Borer larvae)",
        "symptoms": "Central young leaf shoot turns yellow, dries, and dies ('dead heart') during vegetative stage; severed stem pulls out easily.",
        "chemical_control": "Apply Chlorantraniliprole 0.4% G @ 10 kg/ha or Cartap Hydrochloride 50 SP @ 1 kg/ha or Chlorpyrifos 20 EC @ 2.0 ml/L.",
        "cultural_practices": "Clip seedling leaf tips before transplanting to destroy egg masses. Install pheromone traps (8/ha). Destroy crop stubble after harvest."
    },
    "Downy Mildew": {
        "severity": "Moderate",
        "causal_organism": "Sclerophthora macrospora",
        "symptoms": "Stunted growth, excessive tillering, chlorotic yellow-white stripes along leaves with wrinkled and twisted leaf blades.",
        "chemical_control": "Foliar spray of Metalaxyl 8% + Mancozeb 64% WP @ 2.0 g/L or Fosetyl-Al 80 WP @ 2.0 g/L.",
        "cultural_practices": "Prevent submergence of seedlings in seedbeds, maintain adequate drainage, and rogue out diseased seedlings."
    }
}

# Cross-reference aliases to ensure 100% compatibility across naming conventions
DISEASE_REMEDIES["Blast"] = DISEASE_REMEDIES["Leaf Blast"]
DISEASE_REMEDIES["Hispa"] = DISEASE_REMEDIES["Rice Hispa"]
DISEASE_REMEDIES["Normal"] = DISEASE_REMEDIES["Healthy Leaf"]


class DiseaseService:
    @staticmethod
    def get_remedy(disease_name):
        if not disease_name:
            return DISEASE_REMEDIES["Healthy Leaf"]
        # Direct match
        if disease_name in DISEASE_REMEDIES:
            return DISEASE_REMEDIES[disease_name]
        # Normalized match (case-insensitive, underscore to space)
        norm = str(disease_name).lower().replace("_", " ").strip()
        for k, v in DISEASE_REMEDIES.items():
            if k.lower().replace("_", " ").strip() == norm:
                return v
        return DISEASE_REMEDIES.get("Normal", DISEASE_REMEDIES.get("Healthy Leaf", {}))

    @staticmethod
    def extract_hog_features(image_bytes):
        # Decode byte stream using OpenCV
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode image. File might be corrupted or unsupported format.")

        # 1. Resize to 128x128 per slide 8 spec
        resized = cv2.resize(img, (128, 128), interpolation=cv2.INTER_AREA)

        # 2. Convert to Grayscale
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # 3. Extract HOG feature vector
        # (128/16 - 1) * (128/16 - 1) * 2 * 2 * 9 = 1764 features
        features = hog(
            gray,
            orientations=9,
            pixels_per_cell=(16, 16),
            cells_per_block=(2, 2),
            block_norm="L2-Hys",
            transform_sqrt=True
        )

        # Generate base64 thumbnail string for frontend display
        _, buffer = cv2.imencode(".jpg", resized)
        base64_thumb = base64.b64encode(buffer).decode("utf-8")

        return features, base64_thumb

    @staticmethod
    def validate_paddy_suitability(image_bytes, features):
        """Reject clearly non-paddy or unusable images before disease classification.

        This is intentionally an explainable safety layer around an in-distribution multiclass disease model.
        It checks basic image quality and how far the HOG signature sits from the known paddy leaf training
        distribution. It does not claim to prove leaf identity on its own; it only prevents obviously invalid
        inputs from being treated as diseased paddy leaves.
        """
        reference = _get_reference_feature_stats()
        if reference["available"]:
            z_score = np.abs(features - reference["mean"]) / reference["std"]
            feature_distance = float(np.linalg.norm(z_score) / np.sqrt(len(features)))
            logger.info(f"Paddy suitability feature distance: {feature_distance:.3f}")
            if feature_distance > 7.5:
                return False, (
                    "The uploaded image does not appear to be a clear paddy leaf. "
                    "Please upload a clear photo of a paddy leaf."
                )

        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return False, "The uploaded image could not be decoded. Please upload a valid JPG, PNG, or WEBP photo."

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if gray.size == 0:
            return False, "The uploaded image is empty or unreadable. Please upload a valid paddy leaf photo."

        if gray.shape[0] < 32 or gray.shape[1] < 32:
            return False, "The image is too small to analyze. Please upload a clearer paddy leaf photo."

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        green_mask = cv2.inRange(hsv, (25, 30, 30), (90, 255, 255))
        green_ratio = float(np.mean(green_mask > 0))
        logger.info(f"Paddy green coverage ratio: {green_ratio:.3f}")

        if green_ratio < 0.45:
            return False, "The uploaded image does not appear to be a clear paddy leaf. Please upload a clear photo of a paddy leaf."

        blur_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness_std = float(gray.std())
        edge_density = float(np.mean(np.abs(np.diff(gray, axis=0)) > 10))

        if blur_variance < 30 and brightness_std < 25:
            return False, "The image is too unclear or low-contrast to analyze. Please upload a clear paddy leaf photo."
        if edge_density < 0.02 and brightness_std < 35:
            return False, "The uploaded image does not look like a usable paddy leaf. Please upload a clear paddy leaf photo."

        return True, None

    @staticmethod
    def predict(image_bytes):
        store = ModelStore.get_instance()
        if store.disease_model is None or store.disease_encoder is None:
            raise RuntimeError("Disease classification model or encoder is not loaded in ModelStore.")

        features, base64_thumb = DiseaseService.extract_hog_features(image_bytes)

        suitable, reject_reason = DiseaseService.validate_paddy_suitability(image_bytes, features)
        if not suitable:
            logger.warning(f"Disease image validation rejected: {reject_reason}")
            return {
                "success": False,
                "error": "INVALID_PADDY_IMAGE",
                "message": reject_reason,
                "confidence_score": 0,
                "threshold_passed": False,
            }

        probabilities = store.disease_model.predict_proba([features])[0]
        max_idx = int(np.argmax(probabilities))
        confidence = float(probabilities[max_idx])
        predicted_class = store.disease_encoder.inverse_transform([max_idx])[0]

        logger.info(f"Disease prediction raw result: class='{predicted_class}', confidence={confidence * 100:.2f}%")

        if confidence < CONFIDENCE_THRESHOLD:
            logger.warning(f"Confidence guard triggered: {confidence * 100:.2f}% < {CONFIDENCE_THRESHOLD * 100:.0f}%")
            return {
                "success": False,
                "error": "LowConfidenceError",
                "message": (
                    f"Confidence score ({round(confidence * 100, 1)}%) is below the mandatory 60% threshold guard. "
                    "We could not confidently identify a paddy disease from this image. Please upload a clearer leaf photo."
                ),
                "confidence_score": round(confidence * 100, 2),
                "threshold": CONFIDENCE_THRESHOLD * 100,
                "threshold_passed": False,
                "base64_image": f"data:image/jpeg;base64,{base64_thumb}"
            }

        classes_order = store.disease_encoder.classes_
        top_indices = np.argsort(probabilities)[::-1][:3]
        top_predictions = [
            {
                "disease": str(classes_order[i]),
                "confidence": round(float(probabilities[i]) * 100, 2)
            }
            for i in top_indices
        ]

        remedy_info = DiseaseService.get_remedy(predicted_class)

        return {
            "success": True,
            "disease": predicted_class,
            "confidence_score": round(confidence * 100, 2),
            "threshold_passed": True,
            "top_predictions": top_predictions,
            "remedies": remedy_info,
            "base64_image": f"data:image/jpeg;base64,{base64_thumb}"
        }
