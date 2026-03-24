import React, { useRef, useState, useEffect } from 'react';
import { extractMetadata } from '../services/exif-service';
import { calculateAge, formatAge, formatDate } from '../utils/date-utils';
import { Download, Plus, Trash2, Type, MapPin, Smile, Heart, Star, Sun, Cloud } from 'lucide-react';
import confetti from 'canvas-confetti';
import heic2any from 'heic2any';

const CUTE_ICONS = [
  { id: 'heart', component: Heart, color: '#ff6b6b' },
  { id: 'star', component: Star, color: '#fcc419' },
  { id: 'sun', component: Sun, color: '#ffd43b' },
  { id: 'cloud', component: Cloud, color: '#339af0' }
];

const FONTS = ['Outfit', 'Inter', 'Pacifico', 'Comfortaa', 'Fredoka', 'Sniglet', 'Itim', 'cursive', 'serif'];
const COLORS = ['#ffffff', '#ff6b6b', '#fcc419', '#339af0', '#51cf66', '#845ef7', '#333333'];

const PhotoEditor = ({ kidProfile }) => {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overlays, setOverlays] = useState({
    showDate: true,
    showLocation: true,
    showName: true,
    font: 'Outfit',
    color: '#ffffff',
    fontSize: 40,
    customLocation: '',
    customPhotoDate: '',
    selectedIcons: []
  });

  // Normalized positions (0.0 to 1.0)
  const [positions, setPositions] = useState({
    name: { x: 0.05, y: 0.85 },
    date: { x: 0.05, y: 0.90 },
    location: { x: 0.05, y: 0.95 },
    heart: { x: 0.80, y: 0.15 },
    star: { x: 0.85, y: 0.15 },
    sun: { x: 0.90, y: 0.15 },
    cloud: { x: 0.95, y: 0.15 }
  });

  const [dragging, setDragging] = useState(null);
  const [hitBoxes, setHitBoxes] = useState({});

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const json = await res.json();
      const addr = json.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const country = addr.country || '';
      return [city, country].filter(Boolean).join(', ');
    } catch {
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    e.target.value = '';

    setLoading(true);
    try {
      // Read EXIF from original file BEFORE any conversion
      const data = await extractMetadata(file);
      setMetadata(data);

      // Auto-fill photo date from EXIF
      if (data.dateTaken && !isNaN(new Date(data.dateTaken))) {
        const dateStr = new Date(data.dateTaken).toISOString().split('T')[0];
        setOverlays(prev => ({ ...prev, customPhotoDate: dateStr }));
      }

      // Auto-fill location via reverse geocoding
      if (data.location?.latitude && data.location?.longitude) {
        reverseGeocode(data.location.latitude, data.location.longitude).then(name => {
          if (name) setOverlays(prev => ({ ...prev, customLocation: name }));
        });
      }

      // Detect HEIC/HEIF by MIME type or file extension
      const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        /\.(heic|heif)$/i.test(file.name);

      let imageBlob = file;

      if (isHeic) {
        // Convert HEIC → JPEG in browser
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.92,
        });
        imageBlob = Array.isArray(converted) ? converted[0] : converted;
      }

      const url = URL.createObjectURL(imageBlob);
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setLoading(false);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        console.error('Failed to load image after conversion');
        setLoading(false);
      };
      img.src = url;
    } catch (err) {
      console.error('Error loading photo:', err);
      setLoading(false);
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    const maxWidth = 2000;
    const ratio = Math.min(maxWidth / image.width, 1);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const newHitBoxes = {};
    const baseFontSize = overlays.fontSize * ratio;
    ctx.font = `${baseFontSize * 2}px ${overlays.font}`;
    ctx.fillStyle = overlays.color;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Draw Name
    if (overlays.showName && (kidProfile.nickname || kidProfile.name)) {
      const text = kidProfile.nickname || kidProfile.name;
      const x = positions.name.x * canvas.width;
      const y = positions.name.y * canvas.height;
      ctx.fillText(text, x, y);
      const metrics = ctx.measureText(text);
      newHitBoxes.name = { x, y: y - baseFontSize, w: metrics.width, h: baseFontSize * 2 };
    }

    // Draw Date/Age — use EXIF date, fallback to manually entered photo date
    const photoDate = metadata?.dateTaken || (overlays.customPhotoDate ? new Date(overlays.customPhotoDate) : null);
    if (overlays.showDate && photoDate) {
      const dateText = formatDate(photoDate);
      const age = kidProfile.dob ? calculateAge(kidProfile.dob, photoDate) : null;
      const ageText = age ? ` • ${formatAge(age)}` : '';
      const combined = `${dateText}${ageText}`;
      const x = positions.date.x * canvas.width;
      const y = positions.date.y * canvas.height;
      ctx.fillText(combined, x, y);
      const metrics = ctx.measureText(combined);
      newHitBoxes.date = { x, y: y - baseFontSize, w: metrics.width, h: baseFontSize * 2 };
    }

    // Draw Location
    if (overlays.showLocation && (metadata?.location || overlays.customLocation)) {
      const text = overlays.customLocation || "Somewhere beautiful";
      const x = positions.location.x * canvas.width;
      const y = positions.location.y * canvas.height;
      ctx.fillText(text, x, y);
      const metrics = ctx.measureText(text);
      newHitBoxes.location = { x, y: y - baseFontSize, w: metrics.width, h: baseFontSize * 2 };
    }

    // Draw Icons
    const iconMap = { heart: '❤️', star: '⭐', sun: '☀️', cloud: '☁️' };
    overlays.selectedIcons.forEach(iconId => {
      const iconText = iconMap[iconId];
      if (!iconText) return;
      ctx.font = `${baseFontSize * 6}px serif`;
      const pos = positions[iconId] || { x: 0.5, y: 0.5 };
      const x = pos.x * canvas.width;
      const y = pos.y * canvas.height;
      ctx.fillText(iconText, x, y);
      const metrics = ctx.measureText(iconText);
      newHitBoxes[iconId] = { x, y: y - baseFontSize * 3, w: metrics.width, h: baseFontSize * 6 };
    });

    setHitBoxes(newHitBoxes);
  };

  useEffect(() => {
    if (image) renderCanvas();
  }, [image, overlays, positions, kidProfile]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check hitboxes in reverse order so the last drawn (topmost) is picked first
    const keys = Object.keys(hitBoxes).reverse();
    for (const key of keys) {
      const box = hitBoxes[key];
      if (mouseX >= box.x && mouseX <= box.x + box.w &&
          mouseY >= box.y && mouseY <= box.y + box.h) {
        setDragging(key);
        return;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!dragging || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setPositions(prev => ({
      ...prev,
      [dragging]: { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
    }));
  };

  const stopDragging = () => setDragging(null);

  const downloadImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fileName = `KidPhoto_${kidProfile.nickname || kidProfile.name || 'Baby'}_${new Date().getFullYear()}.jpg`;

    canvas.toBlob(async (blob) => {
      // Try Web Share API — triggers native share sheet on iPhone/Android
      // User can then tap "Save Image" to save to Photos
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'KidPhoto Memory 📸',
            });
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            return;
          } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled
            // If share failed for another reason, fall through to download
          }
        }
      }

      // Fallback: trigger file download (desktop)
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }, 'image/jpeg', 0.95);
  };

  const toggleIcon = (iconId) => {
    setOverlays(prev => {
      const icons = prev.selectedIcons.includes(iconId)
        ? prev.selectedIcons.filter(id => id !== iconId)
        : [...prev.selectedIcons, iconId];
      return { ...prev, selectedIcons: icons };
    });
  };

  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const fontPickerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target)) {
        setIsFontPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="editor-container">
      <div className="editor-main">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Magic in progress...</p>
          </div>
        )}
        
        {!image ? (
          <label className="upload-placeholder" htmlFor="file-input">
             <Plus size={64} strokeWidth={2.5} />
             <p>Drop a memory here</p>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Supports iPhone, Samsung, Android photos</span>
          </label>
        ) : (
          <>
            <canvas 
              ref={canvasRef} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
            />
            <label htmlFor="change-file-input" className="change-photo-btn">
              <Plus size={16} /> Change Photo
            </label>
          </>
        )}
        <input id="file-input" type="file" accept="image/*,image/heic,image/heif" onChange={handleFileChange} style={{ display: 'none' }} />
        <input id="change-file-input" type="file" accept="image/*,image/heic,image/heif" onChange={handleFileChange} style={{ display: 'none' }} />

      </div>

      <div className="toolbar">
        <h3>✨ Customize</h3>

        {/* Show/Hide Overlays */}
        <div className="toolbar-section">
          <div className="control-item">
            <label>Show on Photo</label>
            <div className="overlay-toggle-row">
              <button 
                className={`overlay-toggle ${overlays.showName ? 'active' : ''}`}
                onClick={() => setOverlays({...overlays, showName: !overlays.showName})}
              >👤 Name</button>
              <button 
                className={`overlay-toggle ${overlays.showDate ? 'active' : ''}`}
                onClick={() => setOverlays({...overlays, showDate: !overlays.showDate})}
              >📅 Date</button>
              <button 
                className={`overlay-toggle ${overlays.showLocation ? 'active' : ''}`}
                onClick={() => setOverlays({...overlays, showLocation: !overlays.showLocation})}
              >📍 Place</button>
            </div>
          </div>
        </div>

        {/* Font & Color */}
        <div className="toolbar-section">
          <div className="control-item">
            <label><Type size={14} /> Font</label>
            <div className="custom-select-container" ref={fontPickerRef}>
              <button 
                className="font-select-trigger" 
                onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
                style={{ fontFamily: overlays.font }}
              >
                {overlays.font} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>▾</span>
              </button>
              {isFontPickerOpen && (
                <div className="font-options-dropdown">
                  {FONTS.map(f => (
                    <div 
                      key={f} 
                      className={`font-option ${overlays.font === f ? 'active' : ''}`}
                      style={{ fontFamily: f }}
                      onClick={() => {
                        setOverlays({...overlays, font: f});
                        setIsFontPickerOpen(false);
                      }}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="control-item">
            <label>Size</label>
            <input 
              type="range" min="20" max="150" 
              value={overlays.fontSize} 
              onChange={(e) => setOverlays({...overlays, fontSize: parseInt(e.target.value)})} 
            />
          </div>

          <div className="control-item">
            <label>Color</label>
            <div className="color-swatch-grid">
              {COLORS.map(c => (
                <div 
                  key={c}
                  className={`color-swatch ${overlays.color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setOverlays({...overlays, color: c})}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Photo Info */}
        <div className="toolbar-section">
          <div className="control-item">
            <label>📅 Photo Date</label>
            <input 
              type="date"
              value={overlays.customPhotoDate}
              onChange={(e) => setOverlays({...overlays, customPhotoDate: e.target.value})}
            />
            {metadata?.dateTaken && (
              <p style={{ fontSize: '0.72rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
                ✓ Auto-read from photo EXIF
              </p>
            )}
          </div>

          <div className="control-item">
            <label><MapPin size={14} /> Location</label>
            <input 
              type="text" 
              placeholder="Where was this?" 
              value={overlays.customLocation}
              onChange={(e) => setOverlays({...overlays, customLocation: e.target.value})}
            />
            {metadata?.location && !overlays.customLocation && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>Loading location…</p>
            )}
          </div>
        </div>

        {/* Icons */}
        <div className="toolbar-section">
          <div className="control-item">
            <label><Smile size={14} /> Stickers</label>
            <div className="icon-grid">
              {CUTE_ICONS.map(icon => (
                <button 
                  key={icon.id}
                  className={`icon-btn ${overlays.selectedIcons.includes(icon.id) ? 'active' : ''}`}
                  onClick={() => toggleIcon(icon.id)}
                  style={{ color: icon.color }}
                >
                  <icon.component size={22} fill={overlays.selectedIcons.includes(icon.id) ? icon.color : 'none'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          <button className="secondary-btn" onClick={() => setImage(null)}>
            <Trash2 size={16} /> Start Over
          </button>
          <button className="primary-btn download-btn" onClick={downloadImage} disabled={!image || loading}>
            <Download size={18} /> Save 🎉
          </button>
        </div>
      </div>
    </div>
  );
};



export default PhotoEditor;
