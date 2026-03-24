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
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};
