import React, { useState, useEffect } from 'react';
import { Baby, Calendar, User } from 'lucide-react';

const KidProfile = ({ onProfileChange }) => {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('kid-profile');
    try {
      return saved ? JSON.parse(saved) : { name: '', nickname: '', dob: '' };
    } catch (e) {
      return { name: '', nickname: '', dob: '' };
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newProfile = { ...profile, [name]: value };
    setProfile(newProfile);
    localStorage.setItem('kid-profile', JSON.stringify(newProfile));
    onProfileChange(newProfile);
  };

  useEffect(() => {
    onProfileChange(profile);
  }, []);

  return (
    <div className="profile-container">
      <h3>Kid's Profile</h3>
      <div className="input-group">
        <label><User size={16} /> Name</label>
        <input 
          type="text" 
          name="name" 
          value={profile.name} 
          onChange={handleChange} 
          placeholder="Enter full name"
        />
      </div>
      <div className="input-group">
        <label><Baby size={16} /> Nickname</label>
        <input 
          type="text" 
          name="nickname" 
          value={profile.nickname} 
          onChange={handleChange} 
          placeholder="Enter nickname"
        />
      </div>
      <div className="input-group">
        <label><Calendar size={16} /> Date of Birth</label>
        <input 
          type="date" 
          name="dob" 
          value={profile.dob} 
          onChange={handleChange} 
        />
      </div>
    </div>
  );
};

export default KidProfile;
