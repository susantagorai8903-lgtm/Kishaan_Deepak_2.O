import React, { useState, useRef } from 'react';
import { UploadCloud, ShieldAlert, CheckCircle, AlertTriangle, FileText, RefreshCw, X, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function DiseaseDetector() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds 5 MB limit. Please upload an image under 5 MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid format. Only JPG, PNG, and WEBP images are supported.');
      return;
    }

    setError(null);
    setResult(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.predictDisease(selectedFile);
      setResult(data);
    } catch (err) {
      if (err.response && err.response.data) {
        setResult(err.response.data);
      } else {
        setError(err.message || 'Failed to analyze leaf image.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate a synthetic leaf sample for immediate testing
  const createSampleLeaf = (type = 'symptomatic') => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = type === 'random_noise' ? '#666666' : '#1e3323';
    ctx.fillRect(0, 0, 256, 256);

    if (type === 'symptomatic') {
      // Draw green blade
      ctx.beginPath();
      ctx.ellipse(128, 128, 45, 110, Math.PI / 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#4d8c3f';
      ctx.fill();

      // Draw characteristic brown blast / blight lesions
      ctx.beginPath();
      ctx.ellipse(120, 100, 12, 35, Math.PI / 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#6b3e1c';
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(140, 140, 8, 20, Math.PI / 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#8b5a2b';
      ctx.fill();
    } else {
      // Pure non-leaf noise pattern to test 60% rejection guard
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 20, 20);
      }
    }

    canvas.toBlob((blob) => {
      const file = new File([blob], `${type}_test_sample.jpg`, { type: 'image/jpeg' });
      handleFileChange(file);
    }, 'image/jpeg');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title & Features Header */}
      <div className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-sm font-semibold tracking-wider uppercase mb-1">
            <span>🔬</span> Computer Vision Diagnostics
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Paddy Leaf Disease Detection</h2>
          <p className="text-sm text-brand-textMuted mt-1">
            10-class classification using OpenCV + 128×128 HOG feature extraction + Logistic Regression with a strict 60% confidence guard.
          </p>
        </div>

        {/* Test sample generator chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-textMuted">Sample Presets:</span>
          <button
            type="button"
            onClick={() => createSampleLeaf('symptomatic')}
            className="px-3 py-1.5 rounded-xl bg-brand-darkest hover:bg-brand-cardHover border border-brand-border text-xs text-brand-leaf font-medium transition"
          >
            🌾 Paddy Leaf Sample
          </button>
          <button
            type="button"
            onClick={() => createSampleLeaf('random_noise')}
            className="px-3 py-1.5 rounded-xl bg-brand-darkest hover:bg-brand-cardHover border border-brand-border text-xs text-amber-400 font-medium transition"
          >
            🛡️ Test 60% Guard (Noise)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Box (Left) */}
        <div className="lg:col-span-6 space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[340px] relative ${
              dragActive
                ? 'border-brand-accent bg-brand-cardHover/70 scale-[1.01]'
                : previewUrl
                ? 'border-brand-border bg-brand-card'
                : 'border-brand-border hover:border-brand-accent/50 bg-brand-card/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileChange(e.target.files[0])}
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-4 w-full">
                <div className="relative inline-block max-w-xs mx-auto">
                  <img
                    src={previewUrl}
                    alt="Paddy leaf preview"
                    className="max-h-60 rounded-2xl object-cover border-2 border-brand-border shadow-lg mx-auto"
                  />
                  <button
                    onClick={clearSelection}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-brand-textMuted font-mono">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              </div>
            ) : (
              <div className="space-y-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-2xl bg-brand-card border border-brand-border flex items-center justify-center text-brand-accent mx-auto shadow-inner">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Click to upload or drag & drop leaf image</p>
                  <p className="text-xs text-brand-textMuted mt-1">PNG, JPG, or WEBP (Max: 5 MB)</p>
                </div>
                <div className="inline-block px-4 py-2 rounded-xl bg-brand-darkest border border-brand-border text-xs text-brand-accent font-medium">
                  Browse Leaf Photo
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || loading}
            className="w-full py-3.5 rounded-2xl bg-brand-accent hover:bg-brand-accentHover text-brand-darkest font-bold text-sm tracking-wide transition-all shadow-lg shadow-brand-accent/25 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extracting 128×128 HOG & Classifying...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Diagnose Paddy Leaf</span>
              </>
            )}
          </button>

          {/* Technical Specs card */}
          <div className="p-4 rounded-2xl bg-brand-card/60 border border-brand-border text-xs text-brand-textMuted space-y-1.5">
            <div className="text-brand-accent font-semibold flex items-center gap-1.5">
              <span>ℹ️</span> Detection Pipeline Specifications:
            </div>
            <p>• Resized to 128×128 → Grayscale conversion</p>
            <p>• HOG feature descriptor (orientations=9, pixels_per_cell=16×16, cells_per_block=2×2)</p>
            <p>• Scikit-learn StandardScaler + Multi-class Logistic Regression</p>
            <p>• 60% minimum confidence threshold guard against non-leaf images</p>
          </div>
        </div>

        {/* Diagnosis Results (Right) */}
        <div className="lg:col-span-6 flex flex-col">
          {result ? (
            result.success ? (
              // Successful Diagnosis (>= 60% confidence)
              <div className="bg-brand-card p-6 md:p-8 rounded-3xl border border-brand-border shadow-xl space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-brand-leaf" />
                    <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-leaf/20 text-brand-leaf border border-brand-leaf/30">
                      Diagnosis Confirmed
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                      result.remedies?.severity === 'Critical'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : result.remedies?.severity === 'High'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-brand-darkest text-brand-leaf border border-brand-border'
                    }`}
                  >
                    Severity: {result.remedies?.severity || 'Moderate'}
                  </span>
                </div>

                {/* Main Disease Name & Confidence */}
                <div className="p-5 rounded-2xl bg-brand-darkest border border-brand-border">
                  <span className="text-xs text-brand-textMuted uppercase tracking-wider">Identified Condition</span>
                  <h3 className="text-2xl font-black text-brand-accent brand-font mt-0.5">
                    {result.disease}
                  </h3>
                  <p className="text-xs italic text-brand-textMuted mt-0.5">
                    {result.remedies?.causal_organism || 'Pathogen Information'}
                  </p>

                  {/* Confidence Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-textMuted">Confidence Level:</span>
                      <span className="font-bold text-white">{result.confidence_score}%</span>
                    </div>
                    <div className="w-full bg-brand-card h-3 rounded-full overflow-hidden relative border border-brand-border">
                      <div
                        className="h-full bg-brand-accent transition-all duration-700"
                        style={{ width: `${result.confidence_score}%` }}
                      />
                      {/* 60% Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                        style={{ left: '60%' }}
                        title="60% Guard Line"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-brand-textMuted">
                      <span>0%</span>
                      <span className="text-red-400">60% Threshold Guard</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                    Characteristic Symptoms
                  </h4>
                  <p className="text-xs text-brand-textLight leading-relaxed bg-brand-cardHover/70 p-3 rounded-xl border border-brand-border/60">
                    {result.remedies?.symptoms}
                  </p>
                </div>

                {/* Chemical & Cultural Treatments */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 rounded-2xl bg-brand-darkest border border-brand-border">
                    <h4 className="text-xs font-bold text-brand-accent flex items-center gap-1.5 mb-1.5">
                      <span>🧪</span> Recommended Chemical Treatment (Fungicide/Bactericide)
                    </h4>
                    <p className="text-xs text-brand-textLight leading-relaxed">
                      {result.remedies?.chemical_control}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-brand-darkest border border-brand-border">
                    <h4 className="text-xs font-bold text-brand-leafLight flex items-center gap-1.5 mb-1.5">
                      <span>🌱</span> Cultural Practices & Field Sanitation
                    </h4>
                    <p className="text-xs text-brand-textLight leading-relaxed">
                      {result.remedies?.cultural_practices}
                    </p>
                  </div>
                </div>

                {/* Top probability breakdown */}
                {result.top_predictions && (
                  <div className="pt-2">
                    <span className="text-[11px] text-brand-textMuted font-medium">Confidence Breakdown:</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {result.top_predictions.map((p, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-brand-darkest text-brand-textLight border border-brand-border"
                        >
                          {p.disease}: <strong className="text-brand-accent">{p.confidence}%</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Rejection by 60% Confidence Guard
              <div className="bg-brand-card p-6 md:p-8 rounded-3xl border border-red-500/30 shadow-xl space-y-6 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                  <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-red-950 text-red-300 border border-red-800">
                    60% Confidence Guard Triggered
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800/50 space-y-3">
                  <h3 className="text-lg font-bold text-red-200">Prediction Rejected</h3>
                  <p className="text-xs text-red-300 leading-relaxed">{result.message}</p>
                  <div className="p-3 bg-brand-darkest rounded-xl text-xs space-y-1 border border-brand-border font-mono">
                    <div className="flex justify-between">
                      <span className="text-brand-textMuted">Confidence Recorded:</span>
                      <span className="text-red-400 font-bold">{result.confidence_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-textMuted">Required Minimum:</span>
                      <span className="text-brand-leaf font-bold">60.0%</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-brand-textMuted space-y-2">
                  <p className="font-semibold text-white">Why does this guard exist?</p>
                  <p>
                    Per the <em>Kishaan Deepak</em> specification, low-confidence predictions on blurry, non-paddy, or uninfected images are deliberately halted to protect farmers from misapplying expensive fungicides.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="bg-brand-card/50 border border-dashed border-brand-border rounded-3xl p-8 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-card flex items-center justify-center text-brand-accent mb-4 border border-brand-border">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white">No Leaf Analyzed Yet</h3>
              <p className="text-xs text-brand-textMuted max-w-xs mt-1">
                Upload a paddy leaf photo on the left or click one of the sample presets to run the HOG + Logistic Regression detector.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
