import React, { useState, useEffect } from 'react';
import { calculateDiff, parseLocalDateTime, getNextRecurringDate } from '../utils/date-utils';

const LiveTimer = ({ targetDate, format = 'd-h-m-s', isRecurring = false, frequency = 'yearly' }) => {
  const [diff, setDiff] = useState('');

  useEffect(() => {
    const update = () => {
      let target = parseLocalDateTime(targetDate);
      const now = new Date();
      
      if (isRecurring) {
        target = getNextRecurringDate(targetDate, frequency);
      }
      
      const newDiff = calculateDiff(target, now, format);
      setDiff(newDiff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, format, isRecurring, frequency]);

  return <div className="live-timer-display">{diff}</div>;
};

export default LiveTimer;
