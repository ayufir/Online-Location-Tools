/**
 * Utility helpers for the SolarTrack Admin Dashboard
 */

/**
 * Format relative time (e.g. "2 min ago")
 */
export const timeAgo = (timestamp) => {
  if (!timestamp) return 'Never';
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/**
 * Format meters to human-readable string
 */
export const formatDistance = (meters) => {
  if (!meters && meters !== 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

/**
 * Format speed in m/s to km/h string
 */
export const formatSpeed = (mps) => {
  if (!mps && mps !== 0) return '—';
  return `${(mps * 3.6).toFixed(1)} km/h`;
};

/**
 * Haversine distance between two GPS coord objects
 */
export const haversineDistance = (coord1, coord2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.latitude)) * Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Get status color based on status string
 */
export const getStatusColor = (status) => {
  const map = {
    moving:  '#10B981',
    idle:    '#F59E0B',
    online:  '#3B82F6',
    offline: '#6B7280',
  };
  return map[status] || '#6B7280';
};

/**
 * Generate avatar initials from name
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

/**
 * Format date to YYYY-MM-DD
 */
export const toDateStr = (date = new Date()) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Format date to readable display
 */
export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Truncate text
 */
export const truncate = (str, max = 30) => {
  if (!str) return '—';
  return str.length > max ? `${str.slice(0, max)}…` : str;
};

/**
 * Format duration between two timestamps
 */
export const formatDuration = (start, end = new Date()) => {
  if (!start) return '--';
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff < 0) return '0m';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Battery icon string based on level
 */
export const batteryIcon = (level) => {
  if (!level && level !== 0) return '';
  if (level > 80) return '🔋';
  if (level > 40) return '🔋';
  if (level > 15) return '🪫';
  return '⚠️';
};
