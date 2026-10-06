import os
import mimetypes

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

class ValidationError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

def validate_image_file(filename, file_bytes):
    if not filename:
        raise ValidationError("No image file specified.")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"Invalid file extension '.{ext}'. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}.")

    size = len(file_bytes)
    if size == 0:
        raise ValidationError("Uploaded file is empty.")
    if size > MAX_FILE_SIZE:
        raise ValidationError(f"File size exceeds 5 MB limit (Received: {round(size / (1024*1024), 2)} MB).")

    # MIME verification
    mime_type, _ = mimetypes.guess_type(filename)
    if mime_type and mime_type.lower() not in ALLOWED_MIMETYPES:
        raise ValidationError(f"Invalid MIME type '{mime_type}'. Expected an image.")

    return True

def validate_yield_input(data):
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a valid JSON object.")

    required_fields = ["crop", "region", "season", "soil_type", "temperature", "rainfall", "humidity"]
    for field in required_fields:
        if field not in data or data[field] is None:
            raise ValidationError(f"Missing required field: '{field}'.")

    # Validate strings
    for str_field in ["crop", "region", "season", "soil_type"]:
        val = str(data.get(str_field, "")).strip()
        if not val:
            raise ValidationError(f"Field '{str_field}' cannot be empty.")

    # Validate numeric fields
    try:
        temp = float(data["temperature"])
        rain = float(data["rainfall"])
        hum = float(data["humidity"])
    except (ValueError, TypeError):
        raise ValidationError("Temperature, rainfall, and humidity must be valid numbers.")

    if not (-10.0 <= temp <= 65.0):
        raise ValidationError(f"Temperature out of realistic bounds (-10°C to 65°C). Received: {temp}")
    if not (0.0 <= rain <= 6000.0):
        raise ValidationError(f"Rainfall out of realistic bounds (0 mm to 6000 mm). Received: {rain}")
    if not (0.0 <= hum <= 100.0):
        raise ValidationError(f"Humidity must be between 0% and 100%. Received: {hum}")

    return {
        "Crop": str(data["crop"]).strip(),
        "Region": str(data["region"]).strip(),
        "Season": str(data["season"]).strip(),
        "Soil_Type": str(data["soil_type"]).strip(),
        "Temperature": temp,
        "Rainfall": rain,
        "Humidity": hum
    }
