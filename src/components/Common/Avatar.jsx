import React, { useState, useMemo } from 'react';
import CommonUtils from '../../utils/CommonUtils';
import './Avatar.scss';

// Curated clinical color gradients for initials fallback
const CLINICAL_PALETTES = [
  { bg: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)', text: '#ffffff' }, // Teal / Emerald
  { bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', text: '#ffffff' }, // Royal Blue
  { bg: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', text: '#ffffff' }, // Cyan / Ocean
  { bg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', text: '#ffffff' }, // Indigo
  { bg: 'linear-gradient(135deg, #059669 0%, #065f46 100%)', text: '#ffffff' }, // Forest Green
  { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', text: '#ffffff' }, // Sky Blue
];

/**
 * Get 1 or 2 uppercase initials from a full name
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.replace(/^(BS\.|Bác sĩ|ThS\.|TS\.|ThS\.BS|PGS\.TS|GS\.TS)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Pick a consistent palette based on string hash
 */
const getPaletteForName = (name) => {
  if (!name) return CLINICAL_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CLINICAL_PALETTES.length;
  return CLINICAL_PALETTES[index];
};

/**
 * Enterprise-grade Avatar component
 * Handles base64, data URIs, absolute URLs, buffer fallbacks, broken images, and initials
 */
const Avatar = ({
  src,
  name = '',
  size = 'md',
  status = null, // 'online' | 'offline' | 'ringing' | null
  className = '',
  alt = '',
  pulseRing = false,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Normalize image source
  const resolvedSrc = useMemo(() => {
    if (!src || imageFailed) return null;
    if (typeof src === 'string') {
      if (src.startsWith('data:image') || src.startsWith('http://') || src.startsWith('https://')) {
        return src;
      }
      return CommonUtils.decodeBase64Image(src);
    }
    // Handle Buffer object { type: 'Buffer', data: [...] }
    if (src && typeof src === 'object' && Array.isArray(src.data)) {
      try {
        const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(src.data)));
        return `data:image/jpeg;base64,${base64}`;
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [src, imageFailed]);

  const initials = useMemo(() => getInitials(name), [name]);
  const palette = useMemo(() => getPaletteForName(name), [name]);

  // Determine size classes or inline dimensions
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 52,
    xl: 72,
    huge: 104,
  };
  const pixelSize = typeof size === 'number' ? size : (sizeMap[size] || 40);

  return (
    <div
      className={`bc-avatar-wrapper size-${typeof size === 'string' ? size : 'custom'} ${className}`}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
      }}
    >
      {pulseRing && <div className="avatar-pulse-ring" />}

      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt || name || 'Avatar'}
          className="bc-avatar-img"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="bc-avatar-initials"
          style={{
            background: palette.bg,
            color: palette.text,
            fontSize: `${Math.max(10, Math.floor(pixelSize * 0.38))}px`,
          }}
          title={name}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`bc-avatar-status-badge status-${status}`}
          title={status === 'online' ? 'Đang hoạt động' : 'Ngoại tuyến'}
        />
      )}
    </div>
  );
};

export default Avatar;
