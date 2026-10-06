import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from utils.logger import get_logger
from utils.validators import validate_yield_input, validate_image_file, ValidationError
from models_loader.loader import ModelStore
from services.yield_service import YieldService
from services.disease_service import DiseaseService

load_dotenv()
logger = get_logger("ml_api")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

start_time = time.time()

# Eagerly initialize models singleton at startup (raises 503 if absent)
try:
    model_store = ModelStore.get_instance()
    logger.info("ModelStore singleton initialized successfully.")
except Exception as e:
    logger.error(f"FATAL: Model initialization failed: {e}")
    model_store = None

# -------------------------------------------------------------
# Request Lifecycle Logging
# -------------------------------------------------------------
@app.before_request
def log_request():
    logger.info(f"Incoming: {request.method} {request.path}")

@app.after_request
def log_response(response):
    logger.info(f"Completed: {request.method} {request.path} -> Status {response.status_code}")
    return response

# -------------------------------------------------------------
# Routes
# -------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health endpoint returning model load status for yield and disease models."""
    uptime_seconds = round(time.time() - start_time, 2)
    if model_store is None:
        return jsonify({
            "status": "unhealthy",
            "yield_model": "not_loaded",
            "disease_model": "not_loaded",
            "uptime_seconds": uptime_seconds,
            "error": "ModelStore failed to load model artifacts"
        }), 503

    health = model_store.get_health_status()
    health["uptime_seconds"] = uptime_seconds
    health["service"] = "Kishaan Deepak Python ML Engine"
    return jsonify(health), 200

@app.route("/api/yield/options", methods=["GET"])
def get_yield_options():
    """Dynamic dropdown options read from Indian agricultural dataset CSV."""
    try:
        options = YieldService.get_options()
        return jsonify({"success": True, "data": options}), 200
    except Exception as e:
        logger.error(f"Error fetching yield options: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/yield/predict", methods=["POST"])
def predict_yield():
    """Predicts crop output in tonnes/hectare using trained ML regression pipeline."""
    try:
        payload = request.get_json(force=True, silent=True)
        if not payload:
            return jsonify({"success": False, "error": "Invalid JSON body provided."}), 400

        validated_input = validate_yield_input(payload)
        result = YieldService.predict(validated_input)
        return jsonify({"success": True, "data": result}), 200
    except ValidationError as ve:
        logger.warning(f"Yield validation error: {ve.message}")
        return jsonify({"success": False, "error": ve.message}), ve.status_code
    except RuntimeError as re:
        logger.error(f"Runtime error in yield prediction: {re}")
        return jsonify({"success": False, "error": str(re)}), 503
    except Exception as e:
        logger.error(f"Unexpected error in yield prediction: {e}")
        return jsonify({"success": False, "error": "Internal server error during prediction."}), 500

@app.route("/api/disease/predict", methods=["POST"])
def predict_disease():
    """
    Paddy disease detection endpoint.
    Accepts multipart/form-data image upload.
    Validates MIME/extension/size, extracts HOG (128x128), runs LR classifier,
    and enforces strict 60% confidence guard.
    """
    try:
        if "image" not in request.files:
            return jsonify({"success": False, "error": "No 'image' file provided in form-data."}), 400

        file = request.files["image"]
        if not file or file.filename == "":
            return jsonify({"success": False, "error": "Empty filename received."}), 400

        image_bytes = file.read()
        validate_image_file(file.filename, image_bytes)

        result = DiseaseService.predict(image_bytes)
        status_code = 200 if result.get("success") else 422
        return jsonify(result), status_code

    except ValidationError as ve:
        logger.warning(f"Disease upload validation error: {ve.message}")
        return jsonify({"success": False, "error": ve.message}), ve.status_code
    except ValueError as ve:
        logger.warning(f"Image processing error: {ve}")
        return jsonify({"success": False, "error": str(ve)}), 400
    except RuntimeError as re:
        logger.error(f"Disease prediction runtime error: {re}")
        return jsonify({"success": False, "error": str(re)}), 503
    except Exception as e:
        logger.error(f"Unexpected error during disease classification: {e}")
        return jsonify({"success": False, "error": "Internal server error during image analysis."}), 500

# -------------------------------------------------------------
# Global Error Handlers
# -------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found."}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error occurred."}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    logger.info(f"Starting Kishaan Deepak ML Microservice on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
