import React, { useState } from 'react'
import { Heart, User, Sliders, Image } from 'lucide-react'
import TagManager from './components/TagManager'
import PhotoEditor from './components/PhotoEditor'
import { trackEvent, ANALYTICS_EVENTS } from './utils/analytics.js'
import LandingView from './components/LandingView'
import ResultView from './components/ResultView'

function App() {
  const [kidProfiles, setKidProfiles] = useState([]);
  const [mobileTab, setMobileTab] = useState('editor');

  // Check for URL params: ?t=Title&d=Date&l=Location
  const searchParams = new URLSearchParams(window.location.search);
  const sharedTag = searchParams.get('t') ? {
    name: searchParams.get('t'),
    date: searchParams.get('d'),
    location: searchParams.get('l'),
    type: 'countdown'
  } : null;

  const getInitialView = () => {
    if (sharedTag) return 'result';
    
    // Improved localStorage check for empty arrays
    const rawTags = localStorage.getItem('tiny-tags');
    const rawKids = localStorage.getItem('kids-profiles');
    
    let hasTags = false;
    try {
      if (rawTags && JSON.parse(rawTags).length > 0) hasTags = true;
      if (!hasTags && rawKids && JSON.parse(rawKids).length > 0) hasTags = true;
    } catch {
      hasTags = false;
    }

    return hasTags ? 'editor' : 'landing';
  };

  const [view, setView] = useState(getInitialView());

  if (view === 'landing') {
    return <LandingView onStart={() => setView('editor')} />;
  }

  if (view === 'result' && sharedTag) {
    return <ResultView tag={sharedTag} onAction={() => setView('editor')} />;
  }

  return (
    <div className="app-root">
      {/* ── Desktop layout ── */}
      <aside className="sidebar">
        <header className="app-header">
          <Heart className="logo-icon" size={36} fill="var(--primary)" color="var(--primary)" />
          <div>
            <h1>TinyTag</h1>
            <p className="subtitle">Little moments, lasting memories</p>
          </div>
        </header>
        <TagManager onProfileChange={setKidProfiles} />
        <div className="sidebar-footer">
          <p>Made for parents by parents ✨</p>
        </div>
      </aside>

      {/* ── Mobile layout ── */}
      <div className="mobile-top-bar">
        <div className="mobile-logo">
          <Heart size={22} fill="var(--primary)" color="var(--primary)" />
          <span>TinyTag</span>
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
        <PhotoEditor kidProfiles={kidProfiles} />
      </main>
    </div>
  )
}

export default App
