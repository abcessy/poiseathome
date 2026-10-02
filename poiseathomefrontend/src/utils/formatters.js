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

export const getTodayDateString = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
};

export const formatDate = (value) => {
  if (!value) return '—';
  const str = String(value).trim();
  // If date-only string like YYYY-MM-DD, anchor to Manila midnight
  const dateObj = /^\d{4}-\d{2}-\d{2}$/.test(str)
    ? new Date(`${str}T00:00:00+08:00`)
    : new Date(str);

  if (isNaN(dateObj.getTime())) return str;

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
  }).format(dateObj);
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
