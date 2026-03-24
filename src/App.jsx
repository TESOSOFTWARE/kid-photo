import React, { useState } from 'react'
import { Heart, User, Sliders, Image } from 'lucide-react'
import KidProfile from './components/KidProfile'
import PhotoEditor from './components/PhotoEditor'

function App() {
  const [kidProfiles, setKidProfiles] = useState([]);
  // 'editor' | 'profile'
  const [mobileTab, setMobileTab] = useState('editor');

  return (
    <div className="app-root">
      {/* ── Desktop layout ── */}
      <aside className="sidebar">
        <header className="app-header">
          <Heart className="logo-icon" size={36} fill="var(--primary)" color="var(--primary)" />
          <div>
            <h1>KidPhoto</h1>
            <p className="subtitle">Capture every milestone</p>
          </div>
        </header>
        <KidProfile onProfileChange={setKidProfiles} />
        <div className="sidebar-footer">
          <p>Made for parents by parents ✨</p>
        </div>
      </aside>

      {/* ── Mobile layout ── */}
      <div className="mobile-top-bar">
        <div className="mobile-logo">
          <Heart size={22} fill="var(--primary)" color="var(--primary)" />
          <span>KidPhoto</span>
        </div>
        <div className="mobile-tabs">
          <button
            className={`mobile-tab ${mobileTab === 'editor' ? 'active' : ''}`}
            onClick={() => setMobileTab('editor')}
          >
            <Image size={16} /> Editor
          </button>
          <button
            className={`mobile-tab ${mobileTab === 'profile' ? 'active' : ''}`}
            onClick={() => setMobileTab('profile')}
          >
            <User size={16} /> Profile
          </button>
        </div>
      </div>

      {/* Mobile profile tab */}
      <div className={`mobile-profile-view ${mobileTab === 'profile' ? 'visible' : ''}`}>
        <KidProfile onProfileChange={setKidProfiles} />
      </div>

      {/* Main content - always mounted, conditionally visible on mobile */}
      <main className={`main-content ${mobileTab !== 'editor' ? 'mobile-hidden' : ''}`}>
        <PhotoEditor kidProfiles={kidProfiles} />
      </main>
    </div>
  )
}

export default App
