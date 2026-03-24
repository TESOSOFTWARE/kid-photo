import React, { useRef, useState, useEffect } from 'react';
import { extractMetadata } from '../services/exif-service';
import { calculateAge, formatAge, formatDate } from '../utils/date-utils';
import { Download, Plus, Trash2, Type, MapPin, Smile, Heart, Star, Sun, Cloud, ChevronLeft, ChevronRight, Layers, RotateCcw, Moon, Music, Sparkles, Camera, Umbrella, Plane, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import heic2any from 'heic2any';

const CUTE_ICONS = [
  { id: 'heart', component: Heart, color: '#ff6b6b' },
  { id: 'star', component: Star, color: '#fcc419' },
  { id: 'sun', component: Sun, color: '#ffd43b' },
  { id: 'cloud', component: Cloud, color: '#339af0' },
  { id: 'moon', component: Moon, color: '#748ffc' },
  { id: 'music', component: Music, color: '#f06595' },
  { id: 'sparkles', component: Sparkles, color: '#fcc419' },
  { id: 'camera', component: Camera, color: '#868e96' },
  { id: 'umbrella', component: Umbrella, color: '#be4bdb' },
  { id: 'plane', component: Plane, color: '#1098ad' },
  { id: 'zap', component: Zap, color: '#fab005' },
  { id: 'smile', component: Smile, color: '#fd7e14' }
];

const FONTS = ['Outfit', 'Inter', 'Pacifico', 'Comfortaa', 'Fredoka', 'Sniglet', 'Itim', 'VT323', 'cursive', 'serif'];
const COLORS = ['#ffffff', '#ff6b6b', '#fcc419', '#339af0', '#51cf66', '#845ef7', '#333333'];

const PhotoEditor = ({ kidProfiles }) => {
  const canvasRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cache, setCache] = useState({}); // { [index]: { image, metadata, processing } }
  
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  // Global settings for all photos
  const [overlays, setOverlays] = useState({
    showDate: true,
    showLocation: true,
    showName: true,
    font: 'Outfit',
    color: '#ffffff',
    fontSize: 40,
    customLocation: '',
    customPhotoDate: '',
    selectedIcons: [],
    locationDetailMode: 'city_nation',
    hiddenNames: []
  });

  // Normalized positions (0.0 to 1.0)
  // Text relies on a single textGroup for auto-stacking!
  const [positions, setPositions] = useState({
    textGroup: { x: 0.05, y: 0.05 },

    heart: { x: 0.80, y: 0.15 },
    star: { x: 0.85, y: 0.15 },
    sun: { x: 0.90, y: 0.15 },
    cloud: { x: 0.95, y: 0.15 }
  });

  const [scales, setScales] = useState({
    textGroup: 1, heart: 1, star: 1, sun: 1, cloud: 1
  });

  const [rotations, setRotations] = useState({
    textGroup: 0, heart: 0, star: 0, sun: 0, cloud: 0
  });

  const [photoOverrides, setPhotoOverrides] = useState({}); // { [index]: { positions, scales, rotations, customLocation } }
  
  const [history, setHistory] = useState([]);

  const [dragging, setDragging] = useState(null);
  const [hitBoxes, setHitBoxes] = useState({});
  const touchState = useRef({ initialDist: null, initialScale: null });
  const draggingRef = useRef(null);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`, { headers: { 'Accept-Language': 'en' } });
      const json = await res.json();
      return json.address || {};
    } catch { return null; }
  };

  const formatLocation = (rawAddr, mode) => {
    if (!rawAddr) return '';
    const parts = [];
    const building = rawAddr.amenity || rawAddr.building || rawAddr.shop || rawAddr.tourism;
    const district = rawAddr.suburb || rawAddr.neighbourhood || rawAddr.district || rawAddr.borough;
    const city = rawAddr.city || rawAddr.town || rawAddr.village || rawAddr.county || rawAddr.state;
    const country = rawAddr.country;

    if (mode === 'full') {
      [building, district, city, country].forEach(p => p && parts.push(p));
    } else if (mode === 'district_city') {
      [district, city, country].forEach(p => p && parts.push(p));
    } else { 
      [city, country].forEach(p => p && parts.push(p));
    }
    return [...new Set(parts)].join(', ');
  };

  const processFile = async (file, index) => {
    if (cache[index]) return cache[index];
    
    let processedData = { image: null, metadata: null };
    try {
      const metadata = await extractMetadata(file);
      processedData.metadata = metadata;

      // Detect HEIC
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
      let imageBlob = file;
      if (isHeic) {
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        imageBlob = Array.isArray(converted) ? converted[0] : converted;
      }

      const url = URL.createObjectURL(imageBlob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          processedData.image = img;
          URL.revokeObjectURL(url);
          
          if (metadata && metadata.location?.latitude) {
            reverseGeocode(metadata.location.latitude, metadata.location.longitude).then(addr => {
              processedData.metadata.rawAddress = addr;
              setCache(prev => ({ ...prev, [index]: { ...processedData, metadata: { ...processedData.metadata, rawAddress: addr } } }));
            });
          }

          setCache(prev => ({ ...prev, [index]: processedData }));
          resolve(processedData);
        };
        img.onerror = () => resolve(processedData);
        img.src = url;
      });
    } catch (err) {
      console.error('Error processing file:', err);
      return processedData;
    }
  };

  // Process current file if not cached
  useEffect(() => {
    if (files.length === 0) return;
    const loadCurrent = async () => {
      if (!cache[currentIndex]) {
        setLoading(true);
        await processFile(files[currentIndex], currentIndex);
        setLoading(false);
      }
    };
    loadCurrent();
  }, [currentIndex, files, cache]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    e.target.value = ''; // reset input
    setFiles(selected);
    setCurrentIndex(0);
    setCache({});
  };

  const currentData = cache[currentIndex] || {};
  const { image, metadata } = currentData;
  const currentPositions = photoOverrides[currentIndex]?.positions || positions;
  const currentScales = photoOverrides[currentIndex]?.scales || scales;
  const currentRotations = photoOverrides[currentIndex]?.rotations || rotations;
  const currentCustomLoc = photoOverrides[currentIndex]?.customLocation;

  const renderToCanvas = (ctx, canvasWidth, canvasHeight, img, meta, pos, scl, rot, customLoc) => {
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    
    const ratio = Math.min(2000 / img.width, 1);
    const baseFontSize = overlays.fontSize * ratio;
    const newHitBoxes = {};

    ctx.fillStyle = overlays.color;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top'; // Easier for auto-stacking down

    /* ── 1. Render Auto-Stacking Text Group ── */
    const lines = [];
    const photoDate = meta?.dateTaken || (overlays.customPhotoDate ? new Date(overlays.customPhotoDate) : null);

    // NAME Line (e.g. "Nick * 1y7m & Bee * 3y")
    if (overlays.showName && kidProfiles.length > 0) {
      const nameText = kidProfiles
        .filter((kid, index) => !overlays.hiddenNames.includes(index))
        .map((kid, index) => {
          const n = kid.nickname || kid.name;
          if (!n) return null;
          if (kid.dob && photoDate) {
            const age = calculateAge(kid.dob, photoDate);
            let ageStr = '';
            if (age.years > 0) ageStr += `${age.years}y`;
            if (age.months > 0) ageStr += `${age.months}m`;
            if (!ageStr && age.days > 0) ageStr = `${age.days}d`;
            if (!ageStr) ageStr = '0d';
            return `${n} • ${ageStr}`;
          }
          return n;
        }).filter(Boolean).join(' & ');

      if (nameText) lines.push(`🧸 ${nameText}`);
    }

    // DATE Line
    if (overlays.showDate && photoDate) {
      if (overlays.font === 'VT323') { // Camera timestamp is usually fully uppercase/numeric
        const d = new Date(photoDate);
        lines.push(`🗓️ ${d.getFullYear()}'${(d.getMonth()+1).toString().padStart(2,'0')}'${d.getDate().toString().padStart(2,'0')}`);
      } else {
        lines.push(`📅 ${formatDate(photoDate)}`);
      }
    }

    // LOCATION Line
    const locText = customLoc !== undefined ? customLoc : formatLocation(meta?.rawAddress, overlays.locationDetailMode);
    if (overlays.showLocation && locText) {
      lines.push(`📍 ${locText}`);
    }

    if (lines.length > 0) {
      const fs = baseFontSize * 2 * (scl.textGroup || 1);
      ctx.font = `${fs}px ${overlays.font}`;
      const startX = pos.textGroup.x * canvasWidth;
      const startY = pos.textGroup.y * canvasHeight;
      
      let drawY = startY;
      let maxWidth = 0;
      const lineHeight = fs * 1.3;

      // Calculate width for hitBox first
      lines.forEach(line => maxWidth = Math.max(maxWidth, ctx.measureText(line).width));
      const boxHeight = lines.length * lineHeight;
      newHitBoxes.textGroup = { x: startX, y: startY, w: maxWidth, h: boxHeight };

      if (rot.textGroup !== 0) {
        ctx.save();
        const centerX = startX + maxWidth / 2;
        const centerY = startY + boxHeight / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(rot.textGroup * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
      }

      lines.forEach(line => {
        ctx.fillText(line, startX, drawY);
        drawY += lineHeight;
      });

      if (rot.textGroup !== 0) {
        ctx.restore();
      }
    }

    /* ── 2. Render Icons (freely draggable) ── */
    ctx.textBaseline = 'middle'; // Reset for icons
    const iconMap = { 
      heart: '❤️', star: '⭐', sun: '☀️', cloud: '☁️',
      moon: '🌙', music: '🎵', sparkles: '✨', camera: '📸',
      umbrella: '☔', plane: '✈️', zap: '⚡', smile: '😊'
    };
    overlays.selectedIcons.forEach(iconObj => {
      const iconId = iconObj.id || iconObj;
      const iconType = iconObj.type || iconObj;
      const iconText = iconMap[iconType];
      if (!iconText) return;
      const fs = baseFontSize * 6 * (scl[iconId] || 1);
      ctx.font = `${fs}px serif`;
      // Stagger new instances a bit using the length of selectedIcons, or fallback to center
      const p = pos[iconId] || { x: 0.5 + (Math.random()*0.1 - 0.05), y: 0.5 + (Math.random()*0.1 - 0.05) };
      const x = p.x * canvasWidth;
      const y = p.y * canvasHeight;
      const metrics = ctx.measureText(iconText);
      newHitBoxes[iconId] = { x, y: y - fs / 2, w: metrics.width, h: fs };
      
      if (rot[iconId] !== 0) {
        ctx.save();
        ctx.translate(x + metrics.width / 2, y);
        ctx.rotate(rot[iconId] * Math.PI / 180);
        ctx.translate(-(x + metrics.width / 2), -y);
      }
      
      ctx.fillText(iconText, x, y);
      
      if (rot[iconId] !== 0) ctx.restore();
    });

    return newHitBoxes;
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    const ratio = Math.min(2000 / image.width, 1);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;

    const hitboxes = renderToCanvas(ctx, canvas.width, canvas.height, image, metadata, currentPositions, currentScales, currentRotations, currentCustomLoc);
    setHitBoxes(hitboxes);
  };

  useEffect(() => {
    if (image) renderCanvas();
  }, [image, overlays, currentPositions, currentScales, currentRotations, currentCustomLoc, kidProfiles, metadata]);

  /* ── Interaction Logic ── */
  const saveHistory = () => {
    setHistory(prev => [...prev.slice(-20), { overlays, photoOverrides, positions, scales, rotations }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setOverlays(lastState.overlays);
    setPhotoOverrides(lastState.photoOverrides);
    setPositions(lastState.positions);
    setScales(lastState.scales);
    setRotations(lastState.rotations);
    setHistory(prev => prev.slice(0, -1));
  };

  const prevDragging = useRef(null);
  useEffect(() => {
    if (prevDragging.current && !dragging) {
      saveHistory();
    }
    prevDragging.current = dragging;
  }, [dragging, overlays, photoOverrides, positions, scales, rotations]);
  const updateOverride = (field, updater) => {
    setPhotoOverrides(prev => {
      const current = prev[currentIndex] || { positions, scales };
      return { ...prev, [currentIndex]: { ...current, [field]: updater(current[field]) } };
    });
  };
  const hitElement = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;
    const keys = Object.keys(hitBoxes).reverse();
    for (const key of keys) {
      const box = hitBoxes[key];
      if (mouseX >= box.x && mouseX <= box.x + box.w && mouseY >= box.y && mouseY <= box.y + box.h) {
        return key;
      }
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const key = hitElement(e.clientX, e.clientY);
    if (key) { setDragging(key); draggingRef.current = key; }
  };
  const handleMouseMove = (e) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    updateOverride('positions', p => ({
      ...p, [dragging]: { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
    }));
  };

  const getTouchDist = (touches) => Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const key = hitElement(t.clientX, t.clientY);
      if (key) { setDragging(key); draggingRef.current = key; touchState.current = { initialDist: null, initialScale: null }; }
    } else if (e.touches.length === 2 && draggingRef.current) {
      touchState.current = { initialDist: getTouchDist(e.touches), initialScale: currentScales[draggingRef.current] || 1 };
    }
  };
  const handleTouchMove = (e) => {
    const key = draggingRef.current;
    if (!key || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches.length === 1 && !touchState.current.initialDist) {
      const x = (e.touches[0].clientX - rect.left) / rect.width;
      const y = (e.touches[0].clientY - rect.top) / rect.height;
      updateOverride('positions', p => ({
        ...p, [key]: { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
      }));
    } else if (e.touches.length === 2 && touchState.current.initialDist) {
      const pinchScale = getTouchDist(e.touches) / touchState.current.initialDist;
      updateOverride('scales', s => ({
        ...s, [key]: Math.max(0.3, Math.min(6, touchState.current.initialScale * pinchScale))
      }));
    }
  };

  const getFileName = (meta, idx) => `KidPhoto_${kidProfiles[0]?.nickname || 'Memory'}_${idx+1}.jpg`;

  const downloadImage = async (saveAllFlag = false) => {
    if (saveAllFlag && files.length > 1) {
      setSavingAll(true);
      const generatedFiles = [];
      const tempCanvas = document.createElement('canvas');
      const tctx = tempCanvas.getContext('2d');

      for (let i = 0; i < files.length; i++) {
        const data = await processFile(files[i], i);
        if (!data.image) continue;
        
        const ratio = Math.min(2000 / data.image.width, 1);
        tempCanvas.width = data.image.width * ratio;
        tempCanvas.height = data.image.height * ratio;
        const pos = photoOverrides[i]?.positions || positions;
        const scl = photoOverrides[i]?.scales || scales;
        const rot = photoOverrides[i]?.rotations || rotations;
        const loc = photoOverrides[i]?.customLocation;
        renderToCanvas(tctx, tempCanvas.width, tempCanvas.height, data.image, data.metadata, pos, scl, rot, loc);
        
        const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/jpeg', 0.95));
        generatedFiles.push(new File([blob], getFileName(data.metadata, i), { type: 'image/jpeg' }));
      }
      
      setSavingAll(false);

      if (navigator.share && navigator.canShare && navigator.canShare({ files: generatedFiles })) {
        try {
          await navigator.share({ files: generatedFiles, title: 'KidPhoto Memories 📸' });
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          return;
        } catch (e) { if (e.name !== 'AbortError') console.error(e); }
      }
      
      // Fallback desktop manual download loop
      generatedFiles.forEach((file, i) => {
        setTimeout(() => {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a'); 
          a.download = file.name; a.href = url; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, i * 500); // staggering downloads
      });
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });

    } else {
      // Single download (current)
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        const file = new File([blob], getFileName(metadata, currentIndex), { type: 'image/jpeg' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'KidPhoto Memory 📸' });
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            return;
          } catch (e) { if (e.name === 'AbortError') return; }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.download = file.name; a.href = url; a.click();
        URL.revokeObjectURL(url);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }, 'image/jpeg', 0.95);
    }
  };

  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const fontPickerRef = useRef(null);
  useEffect(() => {
    const c = (e) => { if (fontPickerRef.current && !fontPickerRef.current.contains(e.target)) setIsFontPickerOpen(false); };
    document.addEventListener('mousedown', c);
    return () => document.removeEventListener('mousedown', c);
  }, []);

  return (
    <div className="editor-container">
      <div className="editor-main" style={{ position: 'relative' }}>
        {(loading || savingAll) && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>{savingAll ? `Saving ${files.length} photos...` : 'Magic in progress...'}</p>
          </div>
        )}
        
        {files.length === 0 ? (
          <label className="upload-placeholder" htmlFor="file-input">
             <Plus size={64} strokeWidth={2.5} />
             <p>Select Photos</p>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Supports multiple iPhone, Samsung, Android photos</span>
          </label>
        ) : (
          <>
            <canvas 
              ref={canvasRef} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={() => { setDragging(null); draggingRef.current = null; }}
              onMouseLeave={() => { setDragging(null); draggingRef.current = null; }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => { setDragging(null); draggingRef.current = null; touchState.current = { initialDist: null, initialScale: null }; }}
              style={{ touchAction: 'none' }}
            />

            {/* Photo Navigator */}
            {files.length > 1 && (
              <div className="photo-navigator">
                <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
                  <ChevronLeft size={24} />
                </button>
                <span>{currentIndex + 1} of {files.length}</span>
                <button onClick={() => setCurrentIndex(i => Math.min(files.length - 1, i + 1))} disabled={currentIndex === files.length - 1}>
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            <label htmlFor="change-file-input" className="change-photo-btn">
              <Plus size={16} /> New Photos
            </label>
          </>
        )}
        <input id="file-input" type="file" multiple accept="image/*,image/heic,image/heif" onChange={handleFileChange} style={{ display: 'none' }} />
        <input id="change-file-input" type="file" multiple accept="image/*,image/heic,image/heif" onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      <div className="toolbar">
        <h3>✨ Customize All <button onClick={handleUndo} disabled={history.length === 0} className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><RotateCcw size={14}/> Undo</button></h3>

        <div className="toolbar-section">
          <div className="control-item">
            <label>Show on Photo</label>
            <div className="overlay-toggle-row">
              <button 
                className={`overlay-toggle ${overlays.showName ? 'active' : ''}`}
                onClick={() => { saveHistory(); setOverlays({...overlays, showName: !overlays.showName}); }}
              >👤 Name</button>
              <button 
                className={`overlay-toggle ${overlays.showDate ? 'active' : ''}`}
                onClick={() => { saveHistory(); setOverlays({...overlays, showDate: !overlays.showDate}); }}
              >📅 Date</button>
              <button 
                className={`overlay-toggle ${overlays.showLocation ? 'active' : ''}`}
                onClick={() => { saveHistory(); setOverlays({...overlays, showLocation: !overlays.showLocation}); }}
              >📍 Place</button>
            </div>
            
            {overlays.showName && kidProfiles.length > 0 && (
              <div className="overlay-toggle-row" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {kidProfiles.map((kid, index) => {
                  const isVisible = !overlays.hiddenNames.includes(index);
                  return (
                    <button 
                      key={index}
                      className={`overlay-toggle ${isVisible ? 'active' : ''}`}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => {
                        saveHistory();
                        const hidden = !isVisible 
                          ? overlays.hiddenNames.filter(idx => idx !== index)
                          : [...overlays.hiddenNames, index];
                        setOverlays({...overlays, hiddenNames: hidden});
                      }}
                    >
                      {kid.nickname || kid.name || `Kid ${index + 1}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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
                      onClick={() => { saveHistory(); setOverlays({...overlays, font: f}); setIsFontPickerOpen(false); }}
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
              onMouseUp={saveHistory}
              onTouchEnd={saveHistory}
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
                  onClick={() => { saveHistory(); setOverlays({...overlays, color: c}); }}
                />
              ))}
            </div>
          </div>

          <div className="control-item">
            <label>Text Rotation</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input 
                style={{ flex: 1 }}
                type="range" min="-180" max="180" 
                value={currentRotations.textGroup} 
                onChange={(e) => updateOverride('rotations', r => ({ ...r, textGroup: parseInt(e.target.value) }))} 
                onMouseUp={saveHistory}
                onTouchEnd={saveHistory}
              />
              <span style={{ fontSize: '0.8rem', width: '30px', textAlign: 'right' }}>{currentRotations.textGroup}°</span>
            </div>
          </div>
        </div>

        <div className="toolbar-section">
          <div className="control-item">
            <label>📅 Date Fallback</label>
            <input 
              type="date"
              value={overlays.customPhotoDate}
              onChange={(e) => { saveHistory(); setOverlays({...overlays, customPhotoDate: e.target.value}); }}
            />
            {metadata?.dateTaken && (
              <p style={{ fontSize: '0.72rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
                ✓ Currently rendering from EXIF
              </p>
            )}
          </div>

          <div className="control-item">
            <label><MapPin size={14} /> Custom Location (This Photo)</label>
            <input 
              type="text" 
              placeholder="Ex: Hanoi, Vietnam" 
              value={currentCustomLoc ?? ''}
              onChange={(e) => updateOverride('customLocation', () => e.target.value)}
              onBlur={saveHistory}
            />
          </div>

          <div className="control-item">
            <label>Location Auto-Format</label>
            <select 
              value={overlays.locationDetailMode} 
              onChange={e => { saveHistory(); setOverlays({...overlays, locationDetailMode: e.target.value}); }}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '0.8rem', border: '1px solid var(--glass-border)', fontFamily: 'Outfit, sans-serif' }}
            >
              <option value="city_nation">City, Nation</option>
              <option value="district_city">District, City</option>
              <option value="full">Building, District, City, Nation</option>
            </select>
          </div>
        </div>

        <div className="toolbar-section">
          <div className="control-item">
            <label><Smile size={14} /> Stickers</label>
            <div className="icon-grid">
              {CUTE_ICONS.map(icon => (
                <button 
                  key={icon.id}
                  className="icon-btn"
                  onClick={() => {
                    saveHistory();
                    setOverlays(p => ({
                      ...p, selectedIcons: [...p.selectedIcons, { id: `${icon.id}-${Date.now()}-${Math.random()}`, type: icon.id }]
                    }));
                  }}
                  style={{ color: icon.color }}
                >
                  <icon.component size={22} />
                </button>
              ))}
            </div>
            {overlays.selectedIcons.length > 0 && (
              <button 
                className="secondary-btn" 
                onClick={() => { saveHistory(); setOverlays(p => ({ ...p, selectedIcons: [] })); }}
                style={{ marginTop: '0.8rem', width: '100%', fontSize: '0.85rem' }}
              >
                <Trash2 size={14}/> Clear All Stickers
              </button>
            )}
          </div>
        </div>

        <div className="actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button className="secondary-btn" onClick={() => {setFiles([]); setCache({}); }} style={{ flex: 1 }}>
              <Trash2 size={16} /> Reset
            </button>
            <button className="primary-btn download-btn" onClick={() => downloadImage(false)} disabled={files.length === 0 || loading} style={{ flex: 2 }}>
              <Download size={18} /> Save This
            </button>
          </div>
          {files.length > 1 && (
            <button className="primary-btn download-btn" onClick={() => downloadImage(true)} disabled={loading || savingAll} style={{ width: '100%', background: 'var(--primary-dark)' }}>
              <Layers size={18} /> Save All {files.length} Photos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
