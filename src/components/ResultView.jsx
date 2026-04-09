import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, Image, MapPin, ArrowLeft, Check, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import LiveTimer from './LiveTimer';

const ResultView = ({ tag, onAction }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateNew = () => {
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  const handleAddPhoto = () => {
    // Add this tag to localStorage then go to editor
    const newTag = { ...tag, id: Date.now() };
    const saved = localStorage.getItem('tiny-tags');
    const updated = saved ? [...JSON.parse(saved), newTag] : [newTag];
    localStorage.setItem('tiny-tags', JSON.stringify(updated));
    onAction(); // Switch to editor in App.jsx
  };

  return (
    <div className="result-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="result-card"
      >
        <button className="back-link" onClick={handleCreateNew}><ArrowLeft size={16} /> Create New</button>
        
        <header className="result-header">
          <h1>{tag.name}</h1>
          {tag.location && (
            <div className="result-location">
              <MapPin size={16} /> {tag.location}
            </div>
          )}
        </header>

        <div className="timer-wrapper">
          <LiveTimer targetDate={tag.date} format="d-h-m-s" />
        </div>

        <div className="action-row">
          <button className="action-btn share-btn" onClick={handleCopyLink}>
            {copied ? <><Check size={18} /> Copied</> : <><Copy size={18} /> Copy Link</>}
          </button>
          
          <button className={`action-btn qr-btn ${showQR ? 'active' : ''}`} onClick={() => setShowQR(!showQR)}>
            <QrCode size={18} /> {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        </div>

        {showQR && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="qr-display"
          >
            <QRCodeSVG value={shareUrl} size={160} level="H" includeMargin />
            <p>Scan to view this timer</p>
          </motion.div>
        )}

        <div className="result-footer">
          <button className="primary-btn editor-cta" onClick={handleAddPhoto}>
            <Image size={20} /> Add this to my Photo
          </button>
          <p className="footer-hint">Transform your photos with this live tag!</p>
        </div>
      </motion.div>

      <div className="create-your-own">
        <p>Want your own countdown?</p>
        <button onClick={handleCreateNew} className="secondary-btn">Create Your First Tag</button>
      </div>
    </div>
  );
};

export default ResultView;
