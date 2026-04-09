import React, { useRef, useState, useEffect } from 'react';
import { extractMetadata } from '../services/exif-service';
import { calculateAge, formatAge, formatDate, calculateDiff, getNextRecurringDate, parseLocalDateTime } from '../utils/date-utils';
import { Download, Plus, Trash2, Type, MapPin, Smile, Heart, Star, Sun, Cloud, ChevronLeft, ChevronRight, Layers, RotateCcw, Moon, Music, Sparkles, Camera, Umbrella, Plane, Zap, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import heic2any from 'heic2any';
import { trackEvent, ANALYTICS_EVENTS } from '../utils/analytics.js';

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
  const LOAD_LIMIT = 30;
  const [cache, setCache] = useState({}); // { [index]: { image, metadata } }
  const [thumbUrls, setThumbUrls] = useState({}); // { [index]: dataURL } persistent per-photo thumbnail
  
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
  
  const [watermarkRemoved, setWatermarkRemoved] = useState(() => localStorage.getItem('tiny-watermark-removed') === 'true');
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);

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

  const [photoOverrides, setPhotoOverrides] = useState({}); // { [idx]: { positions, scales, rotations, fontSize, customLocation, style: {} } }
  
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

          // Generate a small thumbnail data URL so it persists after URL revoke
          const thumbCanvas = document.createElement('canvas');
          const tw = 120, th = Math.round(120 * img.height / img.width);
          thumbCanvas.width = tw; thumbCanvas.height = th;
          thumbCanvas.getContext('2d').drawImage(img, 0, 0, tw, th);
          setThumbUrls(prev => ({ ...prev, [index]: thumbCanvas.toDataURL('image/jpeg', 0.6) }));

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
    let selected = Array.from(e.target.files);
    if (!selected.length) return;

    // Reset watermark if adding new photos to force monetization for each batch
    setWatermarkRemoved(false);
    localStorage.setItem('tiny-watermark-removed', 'false');

    if (files.length + selected.length > LOAD_LIMIT) {
      alert(`Limited to ${LOAD_LIMIT} photos for stability. The rest were skipped.`);
      selected = selected.slice(0, LOAD_LIMIT - files.length);
    }
    const oldLength = files.length;
    
    // Immediate thumbnails for JPEGs/PNGs
    const newThumbs = {};
    selected.forEach((f, i) => {
      const isHeic = f.type === 'image/heic' || f.type === 'image/heif' || /\.(heic|heif)$/i.test(f.name);
      if (!isHeic) {
        newThumbs[oldLength + i] = URL.createObjectURL(f);
      }
    });
    setThumbUrls(prev => ({ ...prev, ...newThumbs }));

    setFiles(prev => [...prev, ...selected]);
    setCurrentIndex(oldLength);
    e.target.value = '';

    // Background process HEIC to get real thumbnails if many were added
    selected.forEach((f, i) => {
      const isHeic = f.type === 'image/heic' || f.type === 'image/heif' || /\.(heic|heif)$/i.test(f.name);
      if (isHeic) {
        setTimeout(() => processFile(f, oldLength + i), 100 * (i + 1));
      }
    });
  };

  const removePhoto = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setCache(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { const n = parseInt(k); if (n < idx) next[n] = prev[n]; else if (n > idx) next[n - 1] = prev[n]; });
      return next;
    });
    setThumbUrls(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { const n = parseInt(k); if (n < idx) next[n] = prev[n]; else if (n > idx) next[n - 1] = prev[n]; });
      return next;
    });
    setPhotoOverrides(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { const n = parseInt(k); if (n < idx) next[n] = prev[n]; else if (n > idx) next[n - 1] = prev[n]; });
      return next;
    });
    setCurrentIndex(prev => Math.max(0, idx <= prev ? prev - 1 : prev));
  };

  const currentData = cache[currentIndex] || {};
  const { image, metadata } = currentData;
  const currentPositions = photoOverrides[currentIndex]?.positions || positions;
  const currentScales = photoOverrides[currentIndex]?.scales || scales;
  const currentRotations = photoOverrides[currentIndex]?.rotations || rotations;
  const currentOverlays = { ...overlays, ...(photoOverrides[currentIndex]?.style || {}) };
  const currentFontSize = currentOverlays.fontSize;
  const currentCustomLoc = photoOverrides[currentIndex]?.customLocation || overlays.customLocation;

  const renderToCanvas = (ctx, canvasWidth, canvasHeight, img, meta, pos, scl, rot, fsz, customLoc, ov) => {
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    
    const ratio = Math.min(2000 / img.width, 1);
    const baseFontSize = fsz * ratio;
    const stickerBaseSize = 40 * ratio;
    const newHitBoxes = {};

    ctx.fillStyle = ov.color;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    /* ── 1. Render Auto-Stacking Text Group ── */
    const lines = [];
    const photoDate = (ov.customPhotoDate ? new Date(ov.customPhotoDate) : meta?.dateTaken) || null;

    // NAME / EVENT Line
    if (ov.showName && kidProfiles.length > 0) {
      const nameText = kidProfiles
        .filter((evt, index) => !ov.hiddenNames.includes(index))
        .map((evt) => {
          const n = evt.name;
          if (!n) return null;

          // New TinyTag event format
          if (evt.type === 'countdown' || evt.type === 'countup') {
            let targetDate = parseLocalDateTime(evt.date, evt.time);
            
            // The user wants calculation to be relative to the photo's date/time by default
            // Unless no photoDate is available (then fallback to today)
            const referenceDate = photoDate ? new Date(photoDate) : new Date();
            
            if (evt.type === 'countdown' && evt.isRecurring) {
              targetDate = getNextRecurringDate(evt.date, evt.frequency);
              if (evt.time) {
                const [h, m] = evt.time.split(':');
                targetDate.setHours(h, m, 0, 0);
              }
            }
            
            const diff = calculateDiff(targetDate, referenceDate, evt.format || 'y-m-d');
            const prefix = evt.prefix ? `${evt.prefix} ` : '';
            const suffix = evt.label ? ` ${evt.label}` : '';
            return `${n} · ${prefix}${diff}${suffix}`;
          }

          // Legacy countup via dob
          if (evt.dob && photoDate) {
            const age = calculateAge(evt.dob, photoDate);
            let ageStr = '';
            if (age.years > 0) ageStr += `${age.years}y`;
            if (age.months > 0) ageStr += `${age.months}m`;
            if (!ageStr && age.days > 0) ageStr = `${age.days}d`;
            if (!ageStr) ageStr = '0d';
            return `${n} • ${ageStr}`;
          }
          return n;
        }).filter(Boolean).join(' & ');

      if (nameText) lines.push(`🏷️ ${nameText}`);
    }

    // DATE Line
    if (ov.showDate && photoDate) {
      if (ov.font === 'VT323') {
        const d = new Date(photoDate);
        lines.push(`🗓️ ${d.getFullYear()}'${(d.getMonth()+1).toString().padStart(2,'0')}'${d.getDate().toString().padStart(2,'0')}`);
      } else {
        lines.push(`📅 ${formatDate(photoDate)}`);
      }
    }

    // LOCATION Line - Use custom location override if provided, otherwise use extracted EXIF data
    const locText = (customLoc && customLoc.trim()) ? customLoc : formatLocation(meta?.rawAddress, ov.locationDetailMode);
    if (ov.showLocation && locText) {
      lines.push(`📍 ${locText}`);
    }

    if (lines.length > 0) {
      const fs = baseFontSize * 2 * (scl.textGroup || 1);
      ctx.font = `${fs}px ${ov.font}`;
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
    ctx.textBaseline = 'middle';
    const iconMap = { 
      heart: '❤️', star: '⭐', sun: '☀️', cloud: '☁️',
      moon: '🌙', music: '🎵', sparkles: '✨', camera: '📸',
      umbrella: '☔', plane: '✈️', zap: '⚡', smile: '😊'
    };
    ov.selectedIcons.forEach(iconObj => {
      const iconId = iconObj.id || iconObj;
      const iconType = iconObj.type || iconObj;
      const iconText = iconMap[iconType];
      if (!iconText) return;
      const fs = stickerBaseSize * 6 * (scl[iconId] || 1);
      ctx.font = `${fs}px serif`;
      // Stagger new instances a bit using the length of selectedIcons, or fallback to center
      const p = pos[iconId] || { x: 0.5, y: 0.5 };
      const x = p.x * canvasWidth;
      const y = p.y * canvasHeight;
      const metrics = ctx.measureText(iconText);
      newHitBoxes[iconId] = { x, y: y - fs / 2, w: metrics.width, h: fs };
      
      if (rot[iconId] !== undefined && rot[iconId] !== 0) {
        ctx.save();
        ctx.translate(x + metrics.width / 2, y);
        ctx.rotate(rot[iconId] * Math.PI / 180);
        ctx.translate(-(x + metrics.width / 2), -y);
      }
      
      ctx.fillText(iconText, x, y);
      
      if (rot[iconId] !== undefined && rot[iconId] !== 0) ctx.restore();
    });

    /* ── 3. Render Watermark ── */
    if (!watermarkRemoved) {
      const watermarkText = "✨ Made with TinyTag.app";
      ctx.save();
      const wmSize = Math.max(20, 32 * (canvasWidth / 1000));
      ctx.font = `700 ${wmSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      // Draw subtle shadow for readability on any background
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Draw high-contrast semi-transparent white text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(watermarkText, canvasWidth - (25 * (canvasWidth / 1000)), canvasHeight - (25 * (canvasWidth / 1000)));
      ctx.restore();
    }

    return newHitBoxes;
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    const ratio = Math.min(2000 / image.width, 1);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;
    const hitboxes = renderToCanvas(ctx, canvas.width, canvas.height, image, metadata, currentPositions, currentScales, currentRotations, currentFontSize, currentCustomLoc, currentOverlays);
    setHitBoxes(hitboxes);
  };

  useEffect(() => {
    if (image) renderCanvas();
  }, [image, overlays, photoOverrides, currentIndex, kidProfiles, metadata]);

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
    trackEvent(ANALYTICS_EVENTS.PHOTO_UNDO);
  };

  const prevDragging = useRef(null);
  useEffect(() => {
    if (prevDragging.current && !dragging) {
      saveHistory();
    }
    prevDragging.current = dragging;
  }, [dragging, overlays, photoOverrides, positions, scales, rotations]);
  // Section-based Default logic
  // Keys belonging to each section
  const SECTIONS = {
    visibility: ['showName', 'showDate', 'showLocation', 'hiddenNames'],
    font: ['font'],
    color: ['color'],
    fontSize: ['fontSize'],
    rotations: ['rotations'],
    customPhotoDate: ['customPhotoDate'],
    locationDetailMode: ['locationDetailMode'],
    selectedIcons: ['selectedIcons'],
  };
  const isDefaultSection = (section) => {
    const keys = SECTIONS[section] || [];
    const override = photoOverrides[currentIndex] || {};
    
    // Check main override fields (rotations, positions, etc)
    if (section === 'rotations' || section === 'positions' || section === 'scales') {
      const fieldData = override[section];
      return !fieldData || Object.keys(fieldData).length === 0;
    }
    if (section === 'customLocation') return !override.customLocation;

    // Check style overrides
    const style = override.style || {};
    return !keys.some(k => k in style);
  };

  const resetToDefault = (section) => {
    const keys = SECTIONS[section] || [];
    setPhotoOverrides(prev => {
      const curr = { ...(prev[currentIndex] || {}) };
      
      if (section === 'rotations' || section === 'positions' || section === 'scales') {
        const next = { ...curr };
        delete next[section];
        return { ...prev, [currentIndex]: next };
      }
      if (section === 'customLocation') {
        const next = { ...curr };
        delete next.customLocation;
        return { ...prev, [currentIndex]: next };
      }

      const style = { ...(curr.style || {}) };
      keys.forEach(k => delete style[k]);
      return { ...prev, [currentIndex]: { ...curr, style } };
    });
    trackEvent(ANALYTICS_EVENTS.PHOTO_RESET_STYLE, { section });
  };

  const applyToAll = (section) => {
    if (section === 'rotation') {
      const currentRot = photoOverrides[currentIndex]?.rotations || {};
      // Update global rotation state
      setRotations(prev => ({ ...prev, ...currentRot }));
      
      // Erase per-photo rotation overrides
      setPhotoOverrides(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(idx => {
          if (next[idx].rotations) delete next[idx].rotations;
        });
        return next;
      });
      return;
    }

    const keys = SECTIONS[section] || [];
    const currentStyle = photoOverrides[currentIndex]?.style || {};
    
    // First, map the current styles to the global default overlays
    const updates = {};
    keys.forEach(k => {
      updates[k] = k in currentStyle ? currentStyle[k] : overlays[k];
    });

    setOverlays(prev => ({ ...prev, ...updates }));

    // Then, remove these keys from ALL photo overrides so they inherit the new global default
    setPhotoOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(idx => {
        if (next[idx].style) {
          const newStyle = { ...next[idx].style };
          keys.forEach(k => delete newStyle[k]);
          next[idx] = { ...next[idx], style: newStyle };
        }
      });
      return next;
    });
  };

  const DefaultToggle = ({ section }) => (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
      <button
        className="secondary-btn"
        onClick={() => resetToDefault(section)}
        disabled={isDefaultSection(section)}
        style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', opacity: isDefaultSection(section) ? 0.5 : 1 }}
      >
        {isDefaultSection(section) ? '✓ Using default' : '↺ Reset to default'}
      </button>
      <button
        className="secondary-btn"
        onClick={() => {
          if (window.confirm("This will apply the current photo's settings for this section to ALL photos. Continue?")) {
            applyToAll(section);
          }
        }}
        style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
      >
        ✨ Apply to all
      </button>
    </div>
  );

  // Save a style field for the CURRENT photo only (merges on top of global defaults)
  const updateStyle = (field, value) => {
    saveHistory();
    setPhotoOverrides(prev => {
      const curr = prev[currentIndex] || {};
      return { ...prev, [currentIndex]: { ...curr, style: { ...(curr.style || {}), [field]: value } } };
    });
  };

  const updateOverride = (field, updater) => {
    setPhotoOverrides(prev => {
      const current = prev[currentIndex] || {};
      const currentFieldValue = current[field] || (field === 'positions' ? positions : field === 'scales' ? scales : field === 'rotations' ? rotations : field === 'fontSize' ? overlays.fontSize : undefined);
      const newVal = typeof updater === 'function' ? updater(currentFieldValue) : updater;
      return { ...prev, [currentIndex]: { ...current, [field]: newVal } };
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
      touchState.current.startX = t.clientX;
      touchState.current.startY = t.clientY;
      touchState.current.isSwiping = false; // reset swiping state
      
      if (key) { 
        setDragging(key); 
        draggingRef.current = key; 
        touchState.current = { ...touchState.current, initialDist: null, initialScale: null }; 
      } else {
        setDragging(null);
        draggingRef.current = null;
      }
    } else if (e.touches.length === 2 && draggingRef.current) {
      touchState.current = { ...touchState.current, initialDist: getTouchDist(e.touches), initialScale: currentScales[draggingRef.current] || 1 };
    }
  };
  const handleTouchMove = (e) => {
    const key = draggingRef.current;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    if (e.touches.length === 1 && !touchState.current.initialDist) {
      const touch = e.touches[0];
      const moveX = touch.clientX - touchState.current.startX;
      const moveY = touch.clientY - touchState.current.startY;
      
      // Swipe detection (only if not currently dragging a sticker)
      if (!key && !touchState.current.isSwiping) {
         if (Math.abs(moveX) > Math.abs(moveY) && Math.abs(moveX) > 40) {
            if (moveX > 0 && currentIndex > 0) {
              setCurrentIndex(prev => prev - 1);
              touchState.current.isSwiping = true;
            } else if (moveX < 0 && currentIndex < files.length - 1) {
              setCurrentIndex(prev => prev + 1);
              touchState.current.isSwiping = true;
            }
         }
      }

      if (key) {
        const x = (touch.clientX - rect.left) / rect.width;
        const y = (touch.clientY - rect.top) / rect.height;
        updateOverride('positions', p => ({
          ...p, [key]: { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
        }));
      }
    } else if (e.touches.length === 2 && touchState.current.initialDist && key) {
      const pinchScale = getTouchDist(e.touches) / touchState.current.initialDist;
      updateOverride('scales', s => ({
        ...s, [key]: Math.max(0.3, Math.min(6, touchState.current.initialScale * pinchScale))
      }));
    }
  };

  const getFileName = (meta, idx) => `TinyTag_${kidProfiles[0]?.name || 'Memory'}_${idx+1}.jpg`;

  const downloadImage = async (saveAllFlag = false) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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
        const fsz = photoOverrides[i]?.style?.fontSize || overlays.fontSize;
        const loc = photoOverrides[i]?.customLocation;
        const ov = { ...overlays, ...(photoOverrides[i]?.style || {}) };
        renderToCanvas(tctx, tempCanvas.width, tempCanvas.height, data.image, data.metadata, pos, scl, rot, fsz, loc, ov);
        
        const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/jpeg', 0.95));
        generatedFiles.push(new File([blob], getFileName(data.metadata, i), { type: 'image/jpeg' }));
      }
      
      setSavingAll(false);

      if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: generatedFiles })) {
        try {
          await navigator.share({ files: generatedFiles, title: 'TinyTag Memories 📸' });
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          return;
        } catch (e) { if (e.name !== 'AbortError') console.error(e); }
      }
      
      // Desktop manual download loop
      generatedFiles.forEach((file, i) => {
        setTimeout(() => {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a'); 
          a.download = file.name; a.href = url; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, i * 500);
      });
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
      trackEvent(ANALYTICS_EVENTS.PHOTO_BULK_DOWNLOAD, { count: files.length });

    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        const file = new File([blob], getFileName(metadata, currentIndex), { type: 'image/jpeg' });
        
        if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'TinyTag Memory 📸' });
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            return;
          } catch (e) { if (e.name === 'AbortError') return; }
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.download = file.name; a.href = url; a.click();
        URL.revokeObjectURL(url);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        trackEvent(ANALYTICS_EVENTS.PHOTO_DOWNLOAD, { isBulk: false });
      }, 'image/jpeg', 0.95);
    }
  };

  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const fontPickerRef = useRef(null);
  
  // Handlers for font picker and ad countdown
  useEffect(() => {
    const c = (e) => { if (fontPickerRef.current && !fontPickerRef.current.contains(e.target)) setIsFontPickerOpen(false); };
    document.addEventListener('mousedown', c);
    return () => document.removeEventListener('mousedown', c);
  }, []);

  useEffect(() => {
    let timer;
    if (isWatchingAd && adCountdown > 0) {
      if (adCountdown === 10) {
        // Small delay to ensure the <ins> tag is fully mounted in the DOM
        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            console.error("AdSense error:", e);
          }
        }, 100);
      }
      timer = setInterval(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    } else if (isWatchingAd && adCountdown === 0) {
      setIsWatchingAd(false);
      setWatermarkRemoved(true);
      localStorage.setItem('tiny-watermark-removed', 'true');
    }
    return () => clearInterval(timer);
  }, [isWatchingAd, adCountdown]);

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
          <div className="welcome-hero">
            <span className="hero-tagline">✨ Milestone & Age Tracker for Parents</span>
            <h1>Preserve Every Tiny Moment</h1>
            <p className="subtitle">Automatically calculate ages, track milestones, and add beautiful countdowns to your photos. The perfect batch editor for parenting memories.</p>

            <div className="hero-steps">
               <div className="step-card">
                  <div className="step-icon"><Sparkles size={24} /></div>
                  <h3>1. Create Tags</h3>
                  <p>Add your child's birth date or special events like "First Steps" in the sidebar.</p>
               </div>
               <div className="step-card">
                  <div className="step-icon"><Camera size={24} /></div>
                  <h3>2. Select Photos</h3>
                  <p>Upload your favorite snaps from any device. We support high-quality batch editing.</p>
               </div>
               <div className="step-card">
                  <div className="step-icon"><Check size={24} /></div>
                  <h3>3. Save & Share</h3>
                  <p>Customize labels, move stickers, and save your memories instantly.</p>
               </div>
            </div>

            <div className="hero-cta-group">
               <label className="primary-btn hero-upload-btn" htmlFor="file-input">
                  <Download size={22} /> Select Photos to Start
               </label>
               <div className="privacy-notice">
                  <Sparkles size={14} /> 100% Private: Your photos never leave your device.
               </div>
            </div>
          </div>
        ) : (
          <>
            <div 
            className="editor-canvas-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => { 
              setDragging(null); 
              draggingRef.current = null; 
              touchState.current = { ...touchState.current, initialDist: null, initialScale: null }; 
            }}
          >
            <canvas 
              ref={canvasRef} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={() => { setDragging(null); draggingRef.current = null; }}
              onMouseLeave={() => { setDragging(null); draggingRef.current = null; }}
              style={{ touchAction: 'none' }}
            />
          </div>

            <div className="mobile-pill-nav">
              {!watermarkRemoved && (
                <button 
                  onClick={() => {
                    setIsWatchingAd(true);
                    setAdCountdown(10);
                  }} 
                  className="pill-watermark-btn"
                >
                  ✨ No Watermark
                </button>
              )}
              <div className="pill-pager">
                <button onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : files.length - 1))}>
                  <ChevronLeft size={18} />
                </button>
                <span>{currentIndex + 1} / {files.length}</span>
                <button onClick={() => setCurrentIndex(prev => (prev < files.length - 1 ? prev + 1 : 0))}>
                  <ChevronRight size={18} />
                </button>
              </div>
              <label htmlFor="change-file-input" className="pill-add-btn" title="Add photo">
                <Plus size={18} />
              </label>
              <button 
                onClick={() => {
                  if (window.confirm("Remove this photo?")) {
                    removePhoto(currentIndex);
                  }
                }} 
                className="pill-remove-btn" 
                title="Remove photo"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="thumbnail-controls-row desktop-only">
            {files.length > 0 && (
              <div className="photo-info-badge">
                {currentIndex + 1} / {files.length}
              </div>
            )}

            {files.length >= 1 && (
              <div className="thumbnail-slider-container">
                <div className="thumbnail-slider">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className={`thumbnail-item ${currentIndex === idx ? 'active' : ''}`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      {thumbUrls[idx] ? (
                        <img src={thumbUrls[idx]} alt={`thumb-${idx}`} />
                      ) : (
                        <div className="thumbnail-placeholder">{idx + 1}</div>
                      )}
                      {currentIndex === idx && (
                        <button
                          className="thumb-remove-btn"
                          onClick={e => { e.stopPropagation(); removePhoto(idx); }}
                          title="Remove this photo"
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <label htmlFor="change-file-input" className="change-photo-btn" title="Add photo">
              <Plus size={18} />
            </label>
          </div>

          <div className="desktop-only" style={{ marginTop: '0.6rem', padding: '0 0.5rem' }}>
            <button 
              onClick={() => {
                if (watermarkRemoved) return;
                setIsWatchingAd(true);
                setAdCountdown(10);
              }} 
              className={`watermark-removal-btn ${watermarkRemoved ? 'active' : ''}`}
              disabled={watermarkRemoved}
            >
              {watermarkRemoved ? '💎 Watermark Removed' : '🔓 Watch Ad to Remove Watermark'}
            </button>
          </div>
          </>
        )}
        
        {isWatchingAd && (
          <div className="ad-overlay">
            <div className="ad-content">
              <div className="ad-placeholder">
                <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary-dark)' }}>📺 Sponsoring Ad</p>
                <div className="ad-banner" style={{ minHeight: '200px', position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                  {/* Real Ad Slot */}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <ins className="adsbygoogle"
                         style={{ display: 'block' }}
                         data-ad-client="ca-pub-7219615724537453"
                         data-ad-slot="8310836177"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                  </div>
                  
                  {/* Test Fallback (Visible if real ad is blank or blocked) */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', border: '1px solid #dee2e6' }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #eee 25%, transparent 25%, transparent 50%, #eee 50%, #eee 75%, transparent 75%, transparent)', backgroundSize: '20px 20px', opacity: 0.1, position: 'absolute' }}></div>
                    <p style={{ color: '#adb5bd', fontSize: '0.9rem', fontWeight: 600, zIndex: 2 }}>📺 SAMPLE TEST AD</p>
                    <p style={{ color: '#ced4da', fontSize: '0.7rem', zIndex: 2, padding: '0 2rem' }}>This message appears because you're on localhost or have an ad blocker.</p>
                  </div>
                </div>
                <p style={{ marginTop: '1rem', color: '#666' }}>Watching this ad allows you to remove the TinyTag watermark for this session.</p>
                <div className="ad-progress">
                  <div className="ad-progress-bar" style={{ width: `${(adCountdown / 10) * 100}%` }}></div>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--primary)' }}>Closing in {adCountdown}s...</p>
              </div>
            </div>
          </div>
        )}

        <input id="file-input" type="file" multiple accept="image/*,image/heic,image/heif" onChange={handleFileChange} style={{ display: 'none' }} />
        <input id="change-file-input" type="file" multiple accept="image/*,image/heic,image/heif" onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div>
            <h3>📸 Photo Settings</h3>
            {photoOverrides[currentIndex]?.style && (
              <span style={{ fontSize: '0.65rem', color: 'var(--primary-dark)', fontWeight: 600 }}>✦ Custom overrides active</span>
            )}
          </div>
          <button onClick={handleUndo} disabled={history.length === 0} className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><RotateCcw size={14}/> Undo</button>
        </div>

        <div className="toolbar-section">
          <div className="control-item">
            <label>Show on Photo</label>
            <DefaultToggle section="visibility" />
            <div className="overlay-toggle-row">
              <button 
                className={`overlay-toggle ${currentOverlays.showName ? 'active' : ''}`}
                onClick={() => updateStyle('showName', !currentOverlays.showName)}
              >🏷️ Tags</button>
              <button 
                className={`overlay-toggle ${currentOverlays.showDate ? 'active' : ''}`}
                onClick={() => updateStyle('showDate', !currentOverlays.showDate)}
              >📅 Date</button>
              <button 
                className={`overlay-toggle ${currentOverlays.showLocation ? 'active' : ''}`}
                onClick={() => updateStyle('showLocation', !currentOverlays.showLocation)}
              >📍 Place</button>
            </div>

            
            {currentOverlays.showName && kidProfiles.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                {kidProfiles.map((evt, index) => {
                  const name = evt.name || `Event ${index + 1}`;
                  const isActive = !currentOverlays.hiddenNames.includes(index);
                  return (
                    <button 
                      key={index}
                      className={`overlay-toggle ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        const hidden = isActive 
                          ? [...currentOverlays.hiddenNames, index]
                          : currentOverlays.hiddenNames.filter(idx => idx !== index);
                        updateStyle('hiddenNames', hidden);
                      }}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}
                    >
                      {name}
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
            <DefaultToggle section="font" />
            <div className="custom-select-container" ref={fontPickerRef}>
              <button 
                className="font-select-trigger" 
                onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
                style={{ fontFamily: currentOverlays.font }}
              >
                {currentOverlays.font} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>▾</span>
              </button>
              {isFontPickerOpen && (
                <div className="font-options-dropdown">
                  {FONTS.map(f => (
                    <div 
                      key={f} 
                      className={`font-option ${currentOverlays.font === f ? 'active' : ''}`}
                      style={{ fontFamily: f }}
                      onClick={() => { 
                        updateStyle('font', f); 
                        setIsFontPickerOpen(false); 
                        trackEvent(ANALYTICS_EVENTS.STYLE_FONT_CHANGE, { font: f });
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
            <label>Text Size</label>
            <DefaultToggle section="fontSize" />
            <input 
              type="range" min="10" max="300" 
              value={currentFontSize} 
              onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))} 
            />
          </div>

          <div className="control-item">
            <label>Font Color</label>
            <DefaultToggle section="color" />
            <div className="color-swatches" style={{ marginTop: '0.4rem' }}>
              {COLORS.map(c => (
                <div 
                  key={c}
                  className={`color-swatch ${currentOverlays.color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    updateStyle('color', c);
                    trackEvent(ANALYTICS_EVENTS.STYLE_COLOR_CHANGE, { color: c });
                  }}
                />
              ))}
            </div>
          </div>

          <div className="control-item">
            <label>Text Rotation</label>
            <DefaultToggle section="rotations" />
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                style={{ flex: 1 }}
                type="range" min="-180" max="180" 
                value={currentRotations.textGroup ?? 0} 
                onChange={(e) => updateOverride('rotations', r => ({ ...r, textGroup: parseInt(e.target.value) }))} 
                onMouseUp={saveHistory}
                onTouchEnd={saveHistory}
              />
              <span style={{ fontSize: '0.8rem', width: '30px', textAlign: 'right' }}>{currentRotations.textGroup ?? 0}°</span>
            </div>
          </div>
        </div>

        <div className="toolbar-section">
          <div className="control-item">
            <label>📅 Date Fallback</label>
            <DefaultToggle section="customPhotoDate" />
            <input 
              type="date"
              value={currentOverlays.customPhotoDate || ''}
              onChange={(e) => updateStyle('customPhotoDate', e.target.value)}
            />
            {currentOverlays.customPhotoDate ? (
              <p style={{ fontSize: '0.72rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
                ✓ Priority: Date Fallback
              </p>
            ) : metadata?.dateTaken && (
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
            <DefaultToggle section="locationDetailMode" />
            <select 
              value={currentOverlays.locationDetailMode}
              onChange={e => updateStyle('locationDetailMode', e.target.value)}
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
            <DefaultToggle section="selectedIcons" />
            <div className="icon-grid">
              {CUTE_ICONS.map(icon => (
                <button 
                  key={icon.id} 
                  className="icon-btn"
                  onClick={() => {
                    const newId = `${icon.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    // Seed initial position to exactly center so it's not random on render
                    updateOverride('positions', p => ({ ...p, [newId]: { x: 0.5, y: 0.5 } }));
                    updateStyle('selectedIcons', [...(currentOverlays.selectedIcons || []), { id: newId, type: icon.id }]);
                  }}
                  style={{ color: icon.color }}
                >
                  <icon.component size={22} />
                </button>
              ))}
            </div>

            {(currentOverlays.selectedIcons || []).length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.4rem', display: 'block' }}>Tap to remove:</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(currentOverlays.selectedIcons || []).map((s) => {
                    const iconMap = { heart: '❤️', star: '⭐', sun: '☀️', cloud: '☁️', moon: '🌙', music: '🎵', sparkles: '✨', camera: '📸', umbrella: '☔', plane: '✈️', zap: '⚡', smile: '😊' };
                    return (
                      <button 
                        key={s.id} 
                        onClick={() => {
                          saveHistory();
                          updateStyle('selectedIcons', currentOverlays.selectedIcons.filter(x => x.id !== s.id));
                        }} 
                        className="overlay-toggle active" 
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {iconMap[s.type] || s.type} ✕
                      </button>
                    );
                  })}
                </div>
                <button 
                  className="secondary-btn" 
                  onClick={() => { saveHistory(); updateStyle('selectedIcons', []); }}
                  style={{ marginTop: '0.8rem', width: '100%', fontSize: '0.82rem', padding: '0.4rem' }}
                >
                  <Trash2 size={12}/> Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button className="secondary-btn" onClick={() => {
              setFiles([]); 
              setCache({}); 
              trackEvent(ANALYTICS_EVENTS.PHOTO_CLEAR_ALL);
            }} style={{ flex: 1 }}>
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
