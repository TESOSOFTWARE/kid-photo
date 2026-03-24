import React, { useState } from 'react'
import { Heart } from 'lucide-react'
import KidProfile from './components/KidProfile'
import PhotoEditor from './components/PhotoEditor'

function App() {
  const [kidProfile, setKidProfile] = useState({ name: '', nickname: '', dob: '' });

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <header className="app-header">
          <Heart className="logo-icon" size={36} fill="var(--primary)" color="var(--primary)" />
          <div>
            <h1>KidPhoto</h1>
            <p className="subtitle">Capture every milestone</p>
          </div>
        </header>
        
        <KidProfile onProfileChange={setKidProfile} />
        
        <div className="sidebar-footer">
          <p>Made for parents by parents ✨</p>
        </div>
      </aside>

      <main className="main-content">
        <PhotoEditor kidProfile={kidProfile} />
      </main>
    </div>
  )
}

export default App


