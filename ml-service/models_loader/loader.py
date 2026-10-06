import os
import joblib
from utils.logger import get_logger

logger = get_logger("model_store")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "trained_models")

class ModelStore:
    _instance = None

    def __init__(self):
        if ModelStore._instance is not None:
            raise RuntimeError("ModelStore is a singleton. Use ModelStore.get_instance().")

        self.yield_model = None
        self.disease_model = None
        self.disease_encoder = None
        self.load_models()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ModelStore()
        return cls._instance

    def load_models(self):
        logger.info("Eagerly loading ML models into ModelStore singleton...")
        yield_path = os.path.join(MODELS_DIR, "yield_model.joblib")
        disease_path = os.path.join(MODELS_DIR, "disease_model.joblib")
        encoder_path = os.path.join(MODELS_DIR, "disease_encoder.joblib")

        missing = []
        if not os.path.exists(yield_path):
            missing.append("yield_model.joblib")
        if not os.path.exists(disease_path):
            missing.append("disease_model.joblib")
        if not os.path.exists(encoder_path):
            missing.append("disease_encoder.joblib")

        if missing:
            err_msg = f"Model files absent: {', '.join(missing)}. Please run train_models.py first."
            logger.error(err_msg)
            raise RuntimeError(err_msg)

        try:
            self.yield_model = joblib.load(yield_path)
            logger.info("Successfully loaded Yield Regression model.")
            self.disease_model = joblib.load(disease_path)
            self.disease_encoder = joblib.load(encoder_path)
            logger.info("Successfully loaded Disease Classification model and LabelEncoder.")
        except Exception as e:
            logger.error(f"Failed to deserialize model files: {e}")
            raise RuntimeError(f"Failed to load ML models: {str(e)}")

    def get_health_status(self):
        return {
            "yield_model": "loaded" if self.yield_model is not None else "not_loaded",
            "disease_model": "loaded" if self.disease_model is not None else "not_loaded",
            "disease_encoder": "loaded" if self.disease_encoder is not None else "not_loaded",
            "status": "healthy" if (self.yield_model and self.disease_model and self.disease_encoder) else "degraded"
        }
