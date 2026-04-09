import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import LiveTimer from './LiveTimer';

const PRESETS = [
  { name: 'Birthday', date: '2026-06-15', l: '' },
  { name: 'Anniversary', date: '2025-10-20', l: 'Paris' },
  { name: 'New Year 2027', date: '2027-01-01', l: 'Everywhere' },
  { name: 'Trip to Japan', date: '2026-04-10', l: 'Tokyo' },
];

const LandingView = ({ onStart }) => {
  const [formData, setFormData] = useState({ t: '', d: '', l: '' });

  const handlePreset = (p) => {
    setFormData({ t: p.name, d: p.date, l: p.l });
  };

  const handleStart = (e) => {
    e.preventDefault();
    if (!formData.t || !formData.d) return;
    
    // Save locally or use URL params
    const params = new URLSearchParams({
      t: formData.t,
      d: formData.d,
      l: formData.l
    });
    window.history.pushState({}, '', `?${params.toString()}`);
    window.location.reload(); // Quickest way to trigger ResultView in App.jsx
  };

  return (
    <div className="landing-container">
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-section"
      >
        <span className="hero-tagline">✨ Milestone & Age Tracker</span>
        <h1>Countdown Timer & Days Since Calculator for Any Event</h1>
        <p className="subtitle">Track time and location for every moment that matters.</p>
        
        <div className="demo-timer-bubble">
          <p className="demo-label">LIVE DEMO: New Year 2027</p>
          <LiveTimer targetDate="2027-01-01T00:00:00" format="d-h-m-s" />
        </div>
      </motion.section>

      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="quick-start-form-card"
      >
        <form onSubmit={handleStart}>
          <div className="form-grid">
            <div className="input-group">
              <label><Sparkles size={16} /> Event Name</label>
              <input 
                type="text" 
                placeholder="e.g. Baby Arrives, Wedding..." 
                value={formData.t}
                onChange={e => setFormData({...formData, t: e.target.value})}
                required
              />
            </div>
            <div className="input-group">
              <label><Calendar size={16} /> Date</label>
              <input 
                type="date" 
                value={formData.d}
                onChange={e => setFormData({...formData, d: e.target.value})}
                required
              />
            </div>
            <div className="input-group">
              <label><MapPin size={16} /> Location (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Hanoi, Vietnam" 
                value={formData.l}
                onChange={e => setFormData({...formData, l: e.target.value})}
              />
            </div>
          </div>

          <div className="presets-row">
            {PRESETS.map(p => (
              <button 
                key={p.name} 
                type="button" 
                className="preset-pill"
                onClick={() => handlePreset(p)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <button type="submit" className="primary-btn landing-cta">
            Start Tracking <ArrowRight size={20} />
          </button>
        </form>
      </motion.section>

      <footer className="landing-footer">
        <p>No login required • Free forever • Optimized for mobile</p>
        <button className="secondary-btn" onClick={onStart}>
          Go to Photo Editor
        </button>
      </footer>
    </div>
  );
};

export default LandingView;
