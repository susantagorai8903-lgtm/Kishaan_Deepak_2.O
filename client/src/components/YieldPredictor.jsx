import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, HelpCircle, ArrowRight, Gauge, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function YieldPredictor() {
  const [options, setOptions] = useState({
    crops: [],
    regions: [],
    seasons: [],
    soil_types: []
  });
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    crop: 'Rice',
    region: 'Punjab',
    season: 'Kharif',
    soil_type: 'Alluvial',
    temperature: 28.5,
    rainfall: 1250,
    humidity: 78,
    land_area: 2.5
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      const res = await api.getYieldOptions();
      if (res.success && res.data) {
        setOptions(res.data);
      }
    } catch (err) {
      console.warn('Could not load dynamic options, using defaults:', err.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  const applyPreset = (preset) => {
    setFormData((prev) => ({ ...prev, ...preset }));
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictYield(formData);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Prediction failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error communicating with prediction server.');
    } finally {
      setLoading(false);
    }
  };

  const totalCalculatedProduction = result
    ? (result.prediction_tonnes_per_hectare * (formData.land_area || 1)).toFixed(2)
    : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title & Presets Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-card p-6 rounded-3xl border border-brand-border shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-sm font-semibold tracking-wider uppercase mb-1">
            <span>🌾</span> ML Crop Intelligence
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Crop Yield Prediction</h2>
          <p className="text-sm text-brand-textMuted mt-1">
            Predict output (tonnes/hectare) using climate and soil parameters trained on regional Indian agricultural data.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-brand-textMuted font-medium">Quick Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset({ crop: 'Rice', region: 'Punjab', season: 'Kharif', soil_type: 'Alluvial', temperature: 30, rainfall: 1400, humidity: 80 })}
            className="px-2.5 py-1 text-xs rounded-lg bg-brand-darkest hover:bg-brand-cardHover border border-brand-border text-brand-textLight transition"
          >
            Punjab Rice
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ crop: 'Wheat', region: 'Uttar Pradesh', season: 'Rabi', soil_type: 'Alluvial', temperature: 18, rainfall: 550, humidity: 60 })}
            className="px-2.5 py-1 text-xs rounded-lg bg-brand-darkest hover:bg-brand-cardHover border border-brand-border text-brand-textLight transition"
          >
            UP Wheat
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ crop: 'Cotton', region: 'Maharashtra', season: 'Kharif', soil_type: 'Black', temperature: 29, rainfall: 750, humidity: 55 })}
            className="px-2.5 py-1 text-xs rounded-lg bg-brand-darkest hover:bg-brand-cardHover border border-brand-border text-brand-textLight transition"
          >
            Maha Cotton
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs (Left) */}
        <div className="lg:col-span-7 bg-brand-card p-6 md:p-8 rounded-3xl border border-brand-border shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Crop Type */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted uppercase mb-1.5">
                  Crop Type
                </label>
                <select
                  value={formData.crop}
                  onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                  className="w-full bg-brand-darkest border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent transition"
                >
                  {(options.crops.length > 0 ? options.crops : ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Jute', 'Groundnut', 'Mustard', 'Bajra', 'Pulses']).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* State / Region */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted uppercase mb-1.5">
                  State / Region
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full bg-brand-darkest border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent transition"
                >
                  {(options.regions.length > 0 ? options.regions : ['Punjab', 'Uttar Pradesh', 'West Bengal', 'Maharashtra', 'Tamil Nadu', 'Andhra Pradesh', 'Haryana', 'Bihar']).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Crop Season */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted uppercase mb-1.5">
                  Cropping Season
                </label>
                <select
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  className="w-full bg-brand-darkest border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent transition"
                >
                  {(options.seasons.length > 0 ? options.seasons : ['Kharif', 'Rabi', 'Whole Year']).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Soil Type */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted uppercase mb-1.5">
                  Soil Classification
                </label>
                <select
                  value={formData.soil_type}
                  onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                  className="w-full bg-brand-darkest border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent transition"
                >
                  {(options.soil_types.length > 0 ? options.soil_types : ['Alluvial', 'Black', 'Red & Yellow', 'Laterite', 'Clayey', 'Sandy Loam']).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-brand-border" />

            {/* Climate Sliders */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>⛅</span> Agro-Climatic Parameters
              </h3>

              {/* Temperature */}
              <div>
                <div className="flex justify-between items-center text-xs text-brand-textMuted mb-1">
                  <span>Average Temperature (°C)</span>
                  <span className="font-mono text-brand-accent font-semibold">{formData.temperature} °C</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="48"
                  step="0.5"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-brand-accent cursor-pointer"
                />
              </div>

              {/* Rainfall */}
              <div>
                <div className="flex justify-between items-center text-xs text-brand-textMuted mb-1">
                  <span>Seasonal Rainfall (mm)</span>
                  <span className="font-mono text-brand-accent font-semibold">{formData.rainfall} mm</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="25"
                  value={formData.rainfall}
                  onChange={(e) => setFormData({ ...formData, rainfall: parseFloat(e.target.value) })}
                  className="w-full accent-brand-accent cursor-pointer"
                />
              </div>

              {/* Humidity */}
              <div>
                <div className="flex justify-between items-center text-xs text-brand-textMuted mb-1">
                  <span>Relative Humidity (%)</span>
                  <span className="font-mono text-brand-accent font-semibold">{formData.humidity} %</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="98"
                  step="1"
                  value={formData.humidity}
                  onChange={(e) => setFormData({ ...formData, humidity: parseFloat(e.target.value) })}
                  className="w-full accent-brand-accent cursor-pointer"
                />
              </div>

              {/* Field Land Area */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted uppercase mb-1">
                  Your Farm Land Area (Hectares)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  value={formData.land_area}
                  onChange={(e) => setFormData({ ...formData, land_area: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-brand-darkest border border-brand-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-brand-accent hover:bg-brand-accentHover text-brand-darkest font-bold text-sm tracking-wide transition-all shadow-lg shadow-brand-accent/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Sklearn Regression...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Predict Crop Yield</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Prediction Results (Right) */}
        <div className="lg:col-span-5 flex flex-col">
          {result ? (
            <div className="bg-brand-card p-6 md:p-8 rounded-3xl border border-brand-border shadow-xl flex-1 flex flex-col justify-between space-y-6 animate-fadeIn">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-brand-darkest text-brand-leaf border border-brand-border">
                    Inference Complete
                  </span>
                  <span className="text-xs text-brand-textMuted font-mono">
                    {result.crop} • {result.region}
                  </span>
                </div>

                {/* Primary Metric */}
                <div className="mt-6 text-center p-6 rounded-2xl bg-brand-darkest/70 border border-brand-border">
                  <p className="text-xs uppercase tracking-widest text-brand-textMuted font-medium mb-1">
                    Predicted Crop Yield
                  </p>
                  <div className="text-5xl font-black text-brand-accent brand-font">
                    {result.prediction_tonnes_per_hectare}{' '}
                    <span className="text-base font-normal text-white">t/ha</span>
                  </div>
                  <p className="text-xs text-brand-textMuted mt-1">Tonnes per Hectare</p>
                </div>

                {/* Farm Land Total Projection */}
                <div className="mt-4 p-4 rounded-xl bg-brand-cardHover border border-brand-border/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-brand-textMuted">Projected Farm Output:</span>
                    <p className="text-xs text-brand-textMuted mt-0.5">
                      For {formData.land_area} Hectares (~{(formData.land_area * 2.471).toFixed(1)} Acres)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">{totalCalculatedProduction}</span>
                    <span className="text-xs text-brand-accent ml-1 font-semibold">Tonnes</span>
                  </div>
                </div>

                {/* Comparison Gauge */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-textMuted">National Benchmark:</span>
                    <span className="font-semibold text-white">{result.benchmark_tonnes_per_hectare} t/ha</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-textMuted">Variance vs National:</span>
                    <span
                      className={`font-semibold ${
                        result.variance_percentage >= 0 ? 'text-brand-leafLight' : 'text-amber-400'
                      }`}
                    >
                      {result.variance_percentage >= 0 ? '+' : ''}
                      {result.variance_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-brand-darkest h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        result.variance_percentage >= 0 ? 'bg-brand-leaf' : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(10, 50 + result.variance_percentage / 2))}%`
                      }}
                    />
                  </div>
                </div>

                {/* Advice Box */}
                <div className="mt-5 p-4 rounded-2xl bg-brand-darkest border border-brand-border text-xs leading-relaxed text-brand-textLight">
                  <div className="font-semibold text-brand-accent mb-1 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4" />
                    <span>Agronomic Assessment ({result.status}):</span>
                  </div>
                  <p>{result.advice}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-border text-[11px] text-brand-textMuted flex items-center justify-between">
                <span>Trained scikit-learn Pipeline</span>
                <span>Processed for this request only</span>
              </div>
            </div>
          ) : (
            <div className="bg-brand-card/50 border border-dashed border-brand-border rounded-3xl p-8 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-card flex items-center justify-center text-brand-accent mb-4 border border-brand-border">
                <Gauge className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white">No Prediction Calculated Yet</h3>
              <p className="text-xs text-brand-textMuted max-w-xs mt-1">
                Configure your region, season, and climate parameters on the left and click "Predict Crop Yield".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
