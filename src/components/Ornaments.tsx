import React from 'react';
import { DesignConfig } from '../shared/types.ts';

export function FloralCornerOrnament({
  color = '#C6A259',
  styleType = 'floral-gold',
  className = '',
}: {
  color?: string;
  styleType?: DesignConfig['ornamentStyle'];
  className?: string;
}) {
  if (styleType === 'minimal') return null;

  if (styleType === 'classic-frame') {
    return (
      <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
        <path d="M8 112V20C8 13.3726 13.3726 8 20 8H112" stroke={color} strokeWidth="1.4" strokeOpacity="0.85" />
        <path d="M16 96V24C16 19.5817 19.5817 16 24 16H96" stroke={color} strokeWidth="0.9" strokeOpacity="0.55" />
        <circle cx="16" cy="16" r="3.5" fill={color} fillOpacity="0.7" />
      </svg>
    );
  }

  if (styleType === 'botanical') {
    return (
      <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
        <path
          d="M12 108C14 70 38 38 106 14"
          stroke={color}
          strokeWidth="1.2"
          strokeOpacity="0.75"
          strokeLinecap="round"
        />
        <path d="M28 74C22 60 28 48 40 46C38 60 34 68 28 74Z" stroke={color} strokeWidth="1" fill={color} fillOpacity="0.16" />
        <path d="M52 48C48 34 58 24 72 24C68 38 60 44 52 48Z" stroke={color} strokeWidth="1" fill={color} fillOpacity="0.16" />
        <path d="M40 82C54 80 64 70 64 58C50 62 42 70 40 82Z" stroke={color} strokeWidth="1" fill={color} fillOpacity="0.14" />
        <circle cx="88" cy="22" r="2.5" fill={color} fillOpacity="0.7" />
      </svg>
    );
  }

  // floral-gold default
  return (
    <svg viewBox="0 0 140 140" className={className} fill="none" aria-hidden="true">
      <path d="M12 128V26C12 18.268 18.268 12 26 12H128" stroke={color} strokeWidth="1.2" strokeOpacity="0.75" />
      <circle cx="28" cy="28" r="7" stroke={color} strokeWidth="1.1" fill={color} fillOpacity="0.18" />
      <path
        d="M28 16C31 20 31 24 28 28C25 24 25 20 28 16ZM40 28C36 31 32 31 28 28C32 25 36 25 40 28ZM28 40C25 36 25 32 28 28C31 32 31 36 28 40ZM16 28C20 25 24 25 28 28C24 31 20 31 16 28Z"
        fill={color}
        fillOpacity="0.5"
      />
      <path d="M46 18C58 24 68 20 82 14" stroke={color} strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
      <path d="M18 46C24 58 20 68 14 82" stroke={color} strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

export function SectionDividerOrnament({
  color = '#C6A259',
  styleType = 'floral-gold',
}: {
  color?: string;
  styleType?: DesignConfig['ornamentStyle'];
}) {
  if (styleType === 'minimal') {
    return (
      <div className="my-3 flex items-center justify-center gap-2.5">
        <div className="h-px w-10 opacity-30" style={{ backgroundColor: color }} />
        <div className="h-1.5 w-1.5 rotate-45 opacity-60" style={{ backgroundColor: color }} />
        <div className="h-px w-10 opacity-30" style={{ backgroundColor: color }} />
      </div>
    );
  }

  if (styleType === 'botanical') {
    return (
      <div className="my-3 flex items-center justify-center gap-3">
        <div className="h-px w-14 opacity-40" style={{ backgroundColor: color }} />
        <svg width="28" height="18" viewBox="0 0 28 18" fill="none" aria-hidden="true">
          <path d="M14 14C14 8 10 4 5 5C6 10 9 13 14 14Z" stroke={color} strokeWidth="1.15" fill={color} fillOpacity="0.16" />
          <path d="M14 14C14 8 18 4 23 5C22 10 19 13 14 14Z" stroke={color} strokeWidth="1.15" fill={color} fillOpacity="0.16" />
          <path d="M14 14C12 9 12 4 14 1.5C16 4 16 9 14 14Z" stroke={color} strokeWidth="1.15" fill={color} fillOpacity="0.22" />
        </svg>
        <div className="h-px w-14 opacity-40" style={{ backgroundColor: color }} />
      </div>
    );
  }

  if (styleType === 'classic-frame') {
    return (
      <div className="my-3 flex items-center justify-center gap-3">
        <div className="h-px w-14 opacity-45" style={{ backgroundColor: color }} />
        <svg width="26" height="16" viewBox="0 0 26 16" fill="none" aria-hidden="true">
          <path d="M13 1L16.5 8L13 15L9.5 8L13 1Z" stroke={color} strokeWidth="1.1" fill={color} fillOpacity="0.2" />
          <circle cx="4" cy="8" r="1.4" fill={color} fillOpacity="0.7" />
          <circle cx="22" cy="8" r="1.4" fill={color} fillOpacity="0.7" />
        </svg>
        <div className="h-px w-14 opacity-45" style={{ backgroundColor: color }} />
      </div>
    );
  }

  // floral-gold lotus motif matching editorial luxury wedding aesthetic
  return (
    <div className="my-3 flex items-center justify-center gap-3">
      <div className="h-px w-16 opacity-45" style={{ backgroundColor: color }} />
      <svg width="28" height="18" viewBox="0 0 28 18" fill="none" aria-hidden="true">
        <path
          d="M14 13C14 7.5 11.2 4 14 1.5C16.8 4 14 7.5 14 13Z"
          stroke={color}
          strokeWidth="1.2"
          fill={color}
          fillOpacity="0.18"
        />
        <path
          d="M14 13C9.5 12 6.5 9.2 6.5 6.2C9.5 6.4 12.2 8.8 14 13Z"
          stroke={color}
          strokeWidth="1.15"
        />
        <path
          d="M14 13C18.5 12 21.5 9.2 21.5 6.2C18.5 6.4 15.8 8.8 14 13Z"
          stroke={color}
          strokeWidth="1.15"
        />
        <circle cx="14" cy="16" r="1.2" fill={color} fillOpacity="0.75" />
      </svg>
      <div className="h-px w-16 opacity-45" style={{ backgroundColor: color }} />
    </div>
  );
}

export function getPhotoFrameClass(frame: DesignConfig['photoFrame']): string {
  switch (frame) {
    case 'arch':
      return 'rounded-t-full rounded-b-2xl';
    case 'circle':
      return 'rounded-full aspect-square';
    case 'oval':
      return 'rounded-[999px]';
    case 'square':
      return 'rounded-none';
    case 'rounded':
    default:
      return 'rounded-2xl';
  }
}

export function getFontClass(font: DesignConfig['headingFont'] | DesignConfig['bodyFont']): string {
  switch (font) {
    case 'Cormorant Garamond':
      return 'font-cormorant';
    case 'Bodoni Moda':
      return 'font-bodoni';
    case 'Cinzel':
      return 'font-cinzel';
    case 'Fraunces':
      return 'font-fraunces';
    case 'DM Sans':
      return 'font-dm';
    case 'Lora':
      return 'font-lora';
    case 'Plus Jakarta Sans':
      return 'font-jakarta';
    case 'Playfair Display':
    default:
      return 'font-serif-display';
  }
}
