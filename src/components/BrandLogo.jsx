import React from 'react';

/**
 * TinyTag Brand Logo Component
 * Vectorized version of the pink heart with a white cutout.
 */
const BrandLogo = ({ size = 36, className = "" }) => {
  const maskId = `heart-mask-${Math.random().toString(36).substr(2, 9)}`;
  const gradientId = `heart-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        {/* Gradient matching the logo image */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B9D" />
          <stop offset="100%" stopColor="#EE1D71" />
        </linearGradient>

        {/* Mask to create the heart-shaped cutout */}
        <mask id={maskId}>
          <rect width="100" height="100" fill="white" />
          {/* Small heart cutout in the center-top - more rounded */}
          <path 
            d="M50 38 C50 30 38 30 38 38 C38 48 50 58 50 62 C50 58 62 48 62 38 C62 30 50 30 50 38 Z" 
            fill="black"
            transform="scale(1.1) translate(-5, -2)" 
          />
        </mask>
      </defs>

      {/* Main Heart Shape - Rounded & Bubbly */}
      <path 
        d="M50 30 C50 12 10 12 10 45 C10 72 50 90 50 92 C50 90 90 72 90 45 C90 12 50 12 50 30 Z" 
        fill={`url(#${gradientId})`}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
};

export default BrandLogo;
