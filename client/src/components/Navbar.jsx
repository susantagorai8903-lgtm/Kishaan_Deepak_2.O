import React, { useState, useEffect } from 'react';
import { Sprout } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ activeTab, setActiveTab }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (e) {
      setHealth({ status: 'offline' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'yield', label: 'Yield Prediction', icon: '🌾' },
    { id: 'disease', label: 'Disease Detection', icon: '🔬' },
    { id: 'chat', label: 'AI Farm Assistant', icon: '🤖' }
  ];

  const isHealthy = health?.status === 'healthy';

  return (
    <header className="sticky top-0 z-50 bg-brand-dark/95 backdrop-blur border-b border-brand-border px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-card border border-brand-border flex items-center justify-center text-brand-accent shadow-inner">
            <Sprout className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white brand-font">
                Kishaan <span className="text-brand-accent">Deepak</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-brand-card text-brand-leaf border border-brand-border">
                MERN + Python
              </span>
            </div>
            <p className="text-xs text-brand-textMuted hidden sm:block">
              AI-Powered Agricultural Intelligence for Indian Farmers
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1.5 bg-brand-darkest/70 p-1.5 rounded-2xl border border-brand-border">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-accent text-brand-darkest font-semibold shadow-md shadow-brand-accent/20'
                    : 'text-brand-textMuted hover:text-white hover:bg-brand-card'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Health status pill */}
        <div className="hidden lg:flex items-center gap-2 text-xs bg-brand-card px-3 py-1.5 rounded-full border border-brand-border">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                loading ? 'bg-yellow-400' : isHealthy ? 'bg-brand-leaf animate-ping' : 'bg-red-400'
              }`}
            />
            <span className="text-brand-textMuted">ML Engine:</span>
            <span className={`font-semibold ${isHealthy ? 'text-brand-leafLight' : 'text-yellow-400'}`}>
              {health?.ml_microservice?.status === 'healthy' ? 'Active (5001)' : 'Standby'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
