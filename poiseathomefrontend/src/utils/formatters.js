export const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

export const formatDuration = (minutes) => {
  if (!minutes) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${mins} min`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}/.test(value) ? `${value.slice(0, 10)}T00:00:00+08:00` : value;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
  }).format(new Date(dateOnly));
};

export const formatTime = (value) => {
  if (!value) return '—';
  const [hour, minute] = value.split(':');
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila'
  }).format(new Date(`2020-01-01T${hour}:${minute}:00+08:00`));
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(value));
};
