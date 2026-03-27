export const calculateAge = (birthDate, photoDate) => {
  if (!birthDate || !photoDate) return null;

  const birth = new Date(birthDate);
  const photo = new Date(photoDate);

  let years = photo.getFullYear() - birth.getFullYear();
  let months = photo.getMonth() - birth.getMonth();
  let days = photo.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonthLastDay = new Date(photo.getFullYear(), photo.getMonth(), 0).getDate();
    days += previousMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
};

export const formatAge = (age) => {
  if (!age) return '';
  const { years, months, days } = age;
  let parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 && years < 1) parts.push(`${days}d`); // Only show days for babies < 1 year
  
  if (parts.length === 0) return 'Just born';
  return parts.join(' ');
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
};

export const calculateDiff = (targetDate, referenceDate = new Date(), format = 'y-m-d') => {
  const start = referenceDate < targetDate ? referenceDate : targetDate;
  const end = referenceDate < targetDate ? targetDate : referenceDate;
  
  const diff = calculateAge(start, end);
  if (!diff) return '';

  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  const totalMonths = diff.years * 12 + diff.months;

  switch (format) {
    case 'y': return `${diff.years}y`;
    case 'y-m': {
      let parts = [];
      if (diff.years > 0) parts.push(`${diff.years}y`);
      if (diff.months > 0) parts.push(`${diff.months}m`);
      return parts.length ? parts.join(' ') : '0m';
    }
    case 'y-m-d': {
      let parts = [];
      if (diff.years > 0) parts.push(`${diff.years}y`);
      if (diff.months > 0) parts.push(`${diff.months}m`);
      if (diff.days > 0) parts.push(`${diff.days}d`);
      return parts.length ? parts.join(' ') : '0d';
    }
    case 'm-d': {
      let parts = [];
      if (totalMonths > 0) parts.push(`${totalMonths}m`);
      if (diff.days > 0) parts.push(`${diff.days}d`);
      return parts.length ? parts.join(' ') : '0d';
    }
    case 'd': return `${totalDays}d`;
    case 'y-m-d-h': {
      let parts = [];
      if (diff.years > 0) parts.push(`${diff.years}y`);
      if (diff.months > 0) parts.push(`${diff.months}m`);
      if (diff.days > 0) parts.push(`${diff.days}d`);
      const hours = Math.floor(((end - start) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (hours > 0) parts.push(`${hours}h`);
      return parts.length ? parts.join(' ') : '0h';
    }
    case 'd-h-m': {
      const totalMs = end - start;
      const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      return parts.length ? parts.join(' ') : '0m';
    }
    default: {
      // Default to y-m-d logic if format is unknown
      let parts = [];
      if (diff.years > 0) parts.push(`${diff.years}y`);
      if (diff.months > 0) parts.push(`${diff.months}m`);
      if (diff.days > 0) parts.push(`${diff.days}d`);
      return parts.length ? parts.join(' ') : '0d';
    }
  }
};

export const parseLocalDateTime = (dateStr, timeStr = '00:00') => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

export const getNextRecurringDate = (dateStr, frequency = 'yearly') => {
  const date = parseLocalDateTime(dateStr);
  const now = new Date();
  let next = new Date(now.getFullYear(), date.getMonth(), date.getDate());

  if (frequency === 'yearly') {
    if (next < now) {
      next.setFullYear(now.getFullYear() + 1);
    }
  } else if (frequency === 'monthly') {
    next = new Date(now.getFullYear(), now.getMonth(), date.getDate());
    if (next < now) {
      next.setMonth(now.getMonth() + 1);
    }
  }
  return next;
};
