import React, { useState, useEffect } from 'react';
import { Baby, Calendar, User, Plus, Trash2 } from 'lucide-react';
import { calculateAge, formatAge } from '../utils/date-utils';

const DEFAULT_CHILD = () => ({ name: '', nickname: '', dob: '' });

const KidProfile = ({ onProfileChange }) => {
  const [children, setChildren] = useState(() => {
    const saved = localStorage.getItem('kids-profiles');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      // Support migrating from old single-profile format
      if (parsed && Array.isArray(parsed)) return parsed;
      const old = localStorage.getItem('kid-profile');
      const oldParsed = old ? JSON.parse(old) : null;
      return oldParsed ? [oldParsed] : [DEFAULT_CHILD()];
    } catch {
      return [DEFAULT_CHILD()];
    }
  });

  const save = (updated) => {
    setChildren(updated);
    localStorage.setItem('kids-profiles', JSON.stringify(updated));
    onProfileChange(updated);
  };

  const handleChange = (index, field, value) => {
    let finalValue = value;
    if (field === 'name') {
      finalValue = value.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }
    const updated = children.map((c, i) => i === index ? { ...c, [field]: finalValue } : c);
    save(updated);
  };

  const addChild = () => save([...children, DEFAULT_CHILD()]);

  const removeChild = (index) => {
    if (children.length <= 1) return;
    save(children.filter((_, i) => i !== index));
  };

  useEffect(() => { onProfileChange(children); }, []);

  return (
    <div className="profile-container">
      <h3>Kid's Profile</h3>

      {children.map((child, index) => (
        <div key={index} className="child-card">
          <div className="child-card-header">
            <span className="child-label">
              {children.length > 1 ? `Child ${index + 1}` : ''}
              {child.nickname || child.name ? ` · ${child.nickname || child.name}` : ''}
            </span>
            {children.length > 1 && (
              <button className="remove-child-btn" onClick={() => removeChild(index)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="input-group">
            <label><User size={14} /> Name</label>
            <input
              type="text"
              value={child.name}
              onChange={(e) => handleChange(index, 'name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="input-group">
            <label><Baby size={14} /> Nickname</label>
            <input
              type="text"
              value={child.nickname}
              onChange={(e) => handleChange(index, 'nickname', e.target.value)}
              placeholder="e.g. HoneyBee"
            />
          </div>
          <div className="input-group">
            <label><Calendar size={14} /> Date of Birth</label>
            <input
              type="date"
              value={child.dob}
              onChange={(e) => handleChange(index, 'dob', e.target.value)}
            />
          </div>
        </div>
      ))}

      <button className="add-child-btn" onClick={addChild}>
        <Plus size={16} /> Add another child
      </button>
    </div>
  );
};

export default KidProfile;
