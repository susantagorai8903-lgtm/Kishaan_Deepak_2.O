import os
import pandas as pd
from models_loader.loader import ModelStore
from utils.logger import get_logger

logger = get_logger("yield_service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "indian_crops.csv")

class YieldService:
    @staticmethod
    def get_options():
        if not os.path.exists(CSV_PATH):
            raise FileNotFoundError(f"Crop dataset not found at {CSV_PATH}")

        df = pd.read_csv(CSV_PATH)
        return {
            "crops": sorted(df["Crop"].dropna().unique().tolist()),
            "regions": sorted(df["Region"].dropna().unique().tolist()),
            "seasons": sorted(df["Season"].dropna().unique().tolist()),
            "soil_types": sorted(df["Soil_Type"].dropna().unique().tolist()),
            "stats": {
                "avg_temperature": round(float(df["Temperature"].mean()), 1),
                "avg_rainfall": round(float(df["Rainfall"].mean()), 1),
                "avg_humidity": round(float(df["Humidity"].mean()), 1),
                "total_records": len(df)
            }
        }

    @staticmethod
    def predict(clean_data):
        store = ModelStore.get_instance()
        if store.yield_model is None:
            raise RuntimeError("Yield prediction model is not loaded in ModelStore.")

        df_input = pd.DataFrame([{
            "Crop": clean_data["Crop"],
            "Region": clean_data["Region"],
            "Season": clean_data["Season"],
            "Soil_Type": clean_data["Soil_Type"],
            "Temperature": clean_data["Temperature"],
            "Rainfall": clean_data["Rainfall"],
            "Humidity": clean_data["Humidity"]
        }])

        prediction = store.yield_model.predict(df_input)[0]
        yield_val = max(0.1, round(float(prediction), 2))

        # Benchmark reference
        crop = clean_data["Crop"]
        national_benchmarks = {
            "Rice": 3.7, "Wheat": 3.4, "Maize": 3.1, "Cotton": 1.8,
            "Sugarcane": 70.0, "Jute": 2.4, "Groundnut": 1.6,
            "Mustard": 1.4, "Bajra": 1.3, "Pulses": 1.0
        }
        benchmark = national_benchmarks.get(crop, 2.5)
        diff_pct = round(((yield_val - benchmark) / benchmark) * 100, 1)

        status = "Optimal" if diff_pct >= 0 else "Sub-optimal"
        advice = "Favorable climate conditions expected for high productivity." if diff_pct >= 0 else "Soil enhancement or precision irrigation advised to reach benchmark productivity."

        return {
            "prediction_tonnes_per_hectare": yield_val,
            "crop": crop,
            "region": clean_data["Region"],
            "season": clean_data["Season"],
            "benchmark_tonnes_per_hectare": benchmark,
            "variance_percentage": diff_pct,
            "status": status,
            "advice": advice
        }
