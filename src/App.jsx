import React, { useState } from 'react'
import { User, Sliders, Image } from 'lucide-react'
import TagManager from './components/TagManager'
import PhotoEditor from './components/PhotoEditor'
import BrandLogo from './components/BrandLogo'
import { trackEvent, ANALYTICS_EVENTS } from './utils/analytics.js'

function App() {
  const [kidProfiles, setKidProfiles] = useState([]);
  // 'editor' | 'profile'
  const [mobileTab, setMobileTab] = useState('editor');

  return (
    <div className="app-root">
      {/* ── Desktop layout ── */}
      <aside className="sidebar">
        <header className="app-header">
          <BrandLogo className="logo-icon" size={42} />
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
          <BrandLogo size={24} />
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
