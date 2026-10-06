import React, { useState } from 'react';
import Navbar from './components/Navbar';
import YieldPredictor from './components/YieldPredictor';
import DiseaseDetector from './components/DiseaseDetector';
import FarmChatbot from './components/FarmChatbot';
import { Sprout, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('yield');

  return (
    <div className="min-h-screen bg-brand-darkest text-brand-textLight flex flex-col selection:bg-brand-accent selection:text-brand-darkest">
      {/* Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Hero Section inspired by Slide 1 & Slide 2 */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-card via-brand-dark to-brand-darkest p-8 md:p-12 border border-brand-border shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-darkest/80 border border-brand-border text-brand-accent text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
              AI-Powered Agricultural Intelligence
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight brand-font leading-tight">
              Kishaan <span className="text-brand-accent">Deepak</span>
            </h1>

            <p className="text-base md:text-lg text-brand-textMuted font-normal max-w-2xl leading-relaxed">
              Empowering Indian farmers with intelligent, data-driven crop advisory services. Combines machine learning, computer vision, and conversational AI into a unified full-stack platform.
            </p>

            {/* Quick Action Badges matching Slide 1 */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('yield')}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition border ${
                  activeTab === 'yield'
                    ? 'bg-brand-accent text-brand-darkest border-brand-accent shadow-md shadow-brand-accent/20'
                    : 'bg-brand-darkest text-white border-brand-border hover:border-brand-accent/60'
                }`}
              >
                <span>🌾</span>
                <span>Yield Prediction</span>
              </button>

              <button
                onClick={() => setActiveTab('disease')}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition border ${
                  activeTab === 'disease'
                    ? 'bg-brand-accent text-brand-darkest border-brand-accent shadow-md shadow-brand-accent/20'
                    : 'bg-brand-darkest text-white border-brand-border hover:border-brand-accent/60'
                }`}
              >
                <span>🔬</span>
                <span>Disease Detection</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition border ${
                  activeTab === 'chat'
                    ? 'bg-brand-accent text-brand-darkest border-brand-accent shadow-md shadow-brand-accent/20'
                    : 'bg-brand-darkest text-white border-brand-border hover:border-brand-accent/60'
                }`}
              >
                <span>🤖</span>
                <span>AI Farm Assistant</span>
              </button>
            </div>
          </div>

          {/* Decorative Leaf Icon Silhouette (matching the golden leaf from PDF page 1) */}
          <div className="absolute -right-8 -bottom-8 opacity-15 md:opacity-25 pointer-events-none transform rotate-12 scale-125 md:scale-150">
            <svg width="320" height="320" viewBox="0 0 100 100" fill="#f4c042">
              <path d="M85 15 C 50 15, 20 40, 20 75 C 20 82, 26 88, 33 88 C 65 88, 85 55, 85 15 Z" />
              <path d="M25 80 C 45 60, 60 45, 80 20" stroke="#132219" strokeWidth="4" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </section>

        {/* Dynamic Tab Views */}
        <section>
          {activeTab === 'yield' && <YieldPredictor />}
          {activeTab === 'disease' && <DiseaseDetector />}
          {activeTab === 'chat' && <FarmChatbot />}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-brand-border bg-brand-dark/90 py-6 px-4 text-center text-xs text-brand-textMuted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold brand-font">Kishaan Deepak</span>
            <span>•</span>
            <span>Crop Intelligence Platform for Indian Farmers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-darkest text-brand-accent border border-brand-border text-[11px] font-mono">
              Express • React • Node • Python (Scikit-Learn)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
