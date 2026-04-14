import React, { useState, useEffect } from 'react'
import { User, Sliders, Image, Heart, Sparkles, MapPin, Clock } from 'lucide-react'
import TagManager from './components/TagManager'
import PhotoEditor from './components/PhotoEditor'
import BrandLogo from './components/BrandLogo'
import { SEGMENTS } from './constants/segments'
import { trackEvent, ANALYTICS_EVENTS } from './utils/analytics.js'

function App() {
  const [kidProfiles, setKidProfiles] = useState([]);
  const [mobileTab, setMobileTab] = useState('editor');
  
  // Mode State (Persisted)
  const [mode, setMode] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlMode = searchParams.get('mode');
    if (urlMode && SEGMENTS[urlMode]) return urlMode;
    return localStorage.getItem('tiny-app-mode') || 'general';
  });

  const currentSegment = SEGMENTS[mode] || SEGMENTS.baby;

  // Sync Mode with URL and Storage
  useEffect(() => {
    localStorage.setItem('tiny-app-mode', mode);
    const url = new URL(window.location);
    url.searchParams.set('mode', mode);
    window.history.pushState({}, '', url);
  }, [mode]);

  // Manual Trigger to add a tag from landing page
  const handleAddTag = (tag) => {
    const saved = localStorage.getItem('tiny-tags');
    const existing = saved ? JSON.parse(saved) : [];
    const newTag = { ...tag, id: Date.now() + Math.random() };
    const updated = [newTag, ...existing];
    localStorage.setItem('tiny-tags', JSON.stringify(updated));
    setKidProfiles(updated);
    // Reload components to reflect changes
    window.dispatchEvent(new Event('storage'));
  };

  const themeStyle = {
    '--primary': currentSegment.primaryColor,
    '--primary-dark': currentSegment.primaryDark,
    '--primary-light': currentSegment.primaryLight,
  };

  return (
    <div className="app-root" style={themeStyle}>
      {/* ── Desktop layout ── */}
      <aside className="sidebar">
        <header className="app-header">
          <BrandLogo className="logo-icon" size={42} />
          <div>
            <h1>TinyTag</h1>
            <p className="subtitle">Little moments, lasting memories</p>
          </div>
        </header>

        <div className="mode-switcher desktop-only">
          <p className="switcher-label">What are you tracking?</p>
          <div className="mode-pills">
            <button className={`mode-pill ${mode === 'baby' ? 'active' : ''}`} onClick={() => setMode('baby')}>
              <Sparkles size={14} /> Parents
            </button>
            <button className={`mode-pill ${mode === 'love' ? 'active' : ''}`} onClick={() => setMode('love')}>
              <Heart size={14} /> Love
            </button>
            <button className={`mode-pill ${mode === 'travel' ? 'active' : ''}`} onClick={() => setMode('travel')}>
              <MapPin size={14} /> Travel
            </button>
            <button className={`mode-pill ${mode === 'general' ? 'active' : ''}`} onClick={() => setMode('general')}>
              <Clock size={14} /> Other
            </button>
          </div>
        </div>
        <TagManager onProfileChange={setKidProfiles} />
        <div className="sidebar-footer">
          <p>Made for parents by parents ✨</p>
        </div>
      </aside>

      {/* ── Mobile layout ── */}
      <div className="mobile-top-bar">
        <div className="mobile-logo-row">
          <div className="mobile-logo">
            <BrandLogo size={24} />
            <span>TinyTag</span>
          </div>
          <div className="mode-pills mini">
            <button className={`mode-pill ${mode === 'baby' ? 'active' : ''}`} onClick={() => setMode('baby')}><Sparkles size={14} /></button>
            <button className={`mode-pill ${mode === 'love' ? 'active' : ''}`} onClick={() => setMode('love')}><Heart size={14} /></button>
            <button className={`mode-pill ${mode === 'travel' ? 'active' : ''}`} onClick={() => setMode('travel')}><MapPin size={14} /></button>
            <button className={`mode-pill ${mode === 'general' ? 'active' : ''}`} onClick={() => setMode('general')}><Clock size={14} /></button>
          </div>
        </div>
        <div className="mobile-tabs">
          <button
            className={`mobile-tab ${mobileTab === 'editor' ? 'active' : ''}`}
            onClick={() => {
              setMobileTab('editor');
              trackEvent(ANALYTICS_EVENTS.NAV_TAB_CHANGE, { tab: 'editor' });
            }}
          >
            <Image size={16} /> Editor
          </button>
          <button
            className={`mobile-tab ${mobileTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setMobileTab('profile');
              trackEvent(ANALYTICS_EVENTS.NAV_TAB_CHANGE, { tab: 'profile' });
            }}
          >
            <User size={16} /> Tag
          </button>
        </div>
      </div>

      {/* Mobile profile tab */}
      <div className={`mobile-profile-view ${mobileTab === 'profile' ? 'visible' : ''}`}>
        <TagManager onProfileChange={setKidProfiles} />
      </div>

      {/* Main content - always mounted, conditionally visible on mobile */}
      <main className={`main-content ${mobileTab !== 'editor' ? 'mobile-hidden' : ''}`}>
        <PhotoEditor 
          kidProfiles={kidProfiles} 
          currentSegment={currentSegment}
          onAddTag={handleAddTag} 
        />
      </main>
    </div>
  )
}

export default App
