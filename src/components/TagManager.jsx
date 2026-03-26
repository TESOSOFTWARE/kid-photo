import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { calculateDiff, getNextRecurringDate } from '../utils/date-utils';

const EMPTY_FORM = {
  name: '',
  type: 'countup',
  date: '',
  format: 'y-m-d',
  label: '',
  isRecurring: false,
  frequency: 'yearly'
};

const FORMAT_OPTIONS = [
  { value: 'd', label: 'Days' },
  { value: 'm-d', label: 'Mo & Days' },
  { value: 'y-m-d', label: 'Y · M · D' },
  { value: 'y', label: 'Years' },
  { value: 'y-m', label: 'Y & Mo' },
];

const computeDiff = (event) => {
  if (!event.date) return '—';
  let targetDate = new Date(event.date);
  const now = new Date();
  if (event.type === 'countdown' && event.isRecurring) {
    targetDate = getNextRecurringDate(event.date, event.frequency);
  }
  const diff = calculateDiff(targetDate, now, event.format || 'y-m-d');
  const suffix = event.label ? ` ${event.label}` : '';
  return `${diff}${suffix}`;
};

const TagManager = ({ onProfileChange }) => {
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('tiny-tags');
    if (saved) return JSON.parse(saved);

    // Migration from old KidProfile
    const oldKids = localStorage.getItem('kids-profiles');
    if (oldKids) {
      const parsed = JSON.parse(oldKids);
      return parsed.map(kid => ({
        id: Date.now() + Math.random(),
        name: kid.nickname || kid.name,
        type: 'countup',
        date: kid.dob,
        format: 'y-m-d',
        label: '',
        isRecurring: false,
        frequency: 'yearly'
      }));
    }
    return [];
  });

  // null = closed, 'new' = adding new, <id> = editing existing
  const [openId, setOpenId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const broadcast = (evts, pendingForm = null, pendingId = null) => {
    // If currently editing, show a live preview in the photo
    let preview = [...evts];
    if (pendingForm && pendingId) {
      preview = evts.map(e => e.id === pendingId ? { ...pendingForm, id: pendingId } : e);
    } else if (pendingForm && pendingId === 'new') {
      // Don't add unfinished new events to photo
    }
    onProfileChange(preview);
  };

  const persistEvents = (updated) => {
    setEvents(updated);
    localStorage.setItem('tiny-tags', JSON.stringify(updated));
    onProfileChange(updated);
  };

  // On mount, hydrate photo
  useEffect(() => { onProfileChange(events); }, []);

  // Live update photo while editing an existing event
  useEffect(() => {
    if (openId && openId !== 'new') {
      broadcast(events, formData, openId);
    }
  }, [formData]);

  const handleAdd = () => {
    if (!formData.name || !formData.date) return;
    const newEvent = { ...formData, id: Date.now() };
    persistEvents([...events, newEvent]);
    setOpenId(null);
    setFormData(EMPTY_FORM);
  };

  const handleUpdate = () => {
    const updated = events.map(e => e.id === openId ? { ...formData, id: openId } : e);
    persistEvents(updated);
    setOpenId(null);
    setFormData(EMPTY_FORM);
  };

  const deleteEvent = (id) => {
    persistEvents(events.filter(e => e.id !== id));
    if (openId === id) { setOpenId(null); setFormData(EMPTY_FORM); }
  };

  const startEdit = (event) => {
    if (openId === event.id) {
      setOpenId(null);
      setFormData(EMPTY_FORM);
    } else {
      setFormData(event);
      setOpenId(event.id);
    }
  };

  const openNewForm = () => {
    setOpenId('new');
    setFormData(EMPTY_FORM);
  };

  const closeForm = () => {
    setOpenId(null);
    setFormData(EMPTY_FORM);
    onProfileChange(events); // revert live preview
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderForm = (isNew) => (
    <div className={`event-form-body${isNew ? ' event-form-new child-card' : ''}`}>
      {isNew && (
        <div className="child-card-header">
          <span className="child-label">✨ New Tag</span>
          <button className="remove-child-btn" onClick={closeForm}><X size={14} /></button>
        </div>
      )}

      <div className="input-group">
        <label>Tag Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g. Wedding Anniversary"
        />
      </div>

      <div className="input-group">
        <label>Type</label>
        <div className="type-toggle">
          <button className={formData.type === 'countup' ? 'active' : ''}
            onClick={() => updateField('type', 'countup')}>Count Up</button>
          <button className={formData.type === 'countdown' ? 'active' : ''}
            onClick={() => updateField('type', 'countdown')}>Count Down</button>
        </div>
      </div>

      <div className="input-group">
        <label>{formData.type === 'countdown' ? 'End Date' : 'Start Date'}</label>
        <input type="date" value={formData.date}
          onChange={(e) => updateField('date', e.target.value)} />
      </div>

      {formData.type === 'countdown' && (
        <div className="input-group">
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <input
              type="checkbox"
              style={{ width: 'auto', padding: 0, border: 'none', boxShadow: 'none', borderRadius: 0 }}
              checked={formData.isRecurring}
              onChange={(e) => updateField('isRecurring', e.target.checked)}
            />
            Recurring
          </label>
          {formData.isRecurring && (
            <div className="type-toggle" style={{ marginTop: '0.4rem' }}>
              <button className={formData.frequency === 'monthly' ? 'active' : ''}
                onClick={() => updateField('frequency', 'monthly')}>Monthly</button>
              <button className={formData.frequency === 'yearly' ? 'active' : ''}
                onClick={() => updateField('frequency', 'yearly')}>Yearly</button>
            </div>
          )}
        </div>
      )}

      <div className="input-group">
        <label>Format</label>
        <div className="type-toggle" style={{ flexWrap: 'wrap', height: 'auto' }}>
          {FORMAT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={formData.format === opt.value ? 'active' : ''}
              onClick={() => updateField('format', opt.value)}
              style={{ flex: 'unset', fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="input-group">
        <label>Suffix <span style={{ fontWeight: 400, opacity: 0.55 }}>(optional, e.g. "old" / "left")</span></label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => updateField('label', e.target.value)}
          placeholder="Leave blank for no suffix"
        />
      </div>

      <button className="primary-btn save-event-btn" onClick={isNew ? handleAdd : handleUpdate}>
        <Check size={16} /> {isNew ? 'Save Tag' : 'Update Tag'}
      </button>
    </div>
  );

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h3>Tags & Events</h3>
        {openId !== 'new' && (
          <button className="add-event-btn-mini" onClick={openNewForm}>
            <Plus size={16} /> Add Tag
          </button>
        )}
      </div>

      {/* New event form */}
      {openId === 'new' && renderForm(true)}

      {/* Empty state hint */}
      {events.length === 0 && openId !== 'new' && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px dashed var(--glass-border)', marginTop: '0.5rem' }}>
          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>No tags created yet! Add a tag to start tracking an event.</p>
          <button className="primary-btn" onClick={openNewForm} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: 'auto', display: 'inline-flex' }}>
            <Plus size={14} /> Add your first Tag
          </button>
        </div>
      )}

      {/* Event list */}
      <div className="event-list">
        {events.map(event => {
          const isOpen = openId === event.id;
          return (
            <div key={event.id} className={`event-item-card${isOpen ? ' expanded' : ''}`}>
              {/* Compact header — always visible */}
              <div className="event-item-compact">
                <div className="event-preview-line">
                  <span className="event-name">{event.name}</span>
                  <span className="event-result">
                    {isOpen ? computeDiff(formData) : computeDiff(event)}
                  </span>
                </div>
                <div className="event-actions">
                  <button onClick={() => startEdit(event)} title={isOpen ? 'Collapse' : 'Edit'}
                    className={isOpen ? 'active-action' : ''}>
                    {isOpen ? <X size={12} /> : <Edit2 size={12} />}
                  </button>
                  <button onClick={() => deleteEvent(event.id)} title="Delete"><Trash2 size={12} /></button>
                </div>
              </div>

              {/* Inline expanded edit form */}
              {isOpen && (
                <div className="event-inline-form">
                  {renderForm(false)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TagManager;
