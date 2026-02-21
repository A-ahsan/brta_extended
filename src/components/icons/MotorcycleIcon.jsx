import React from 'react';

const MotorcycleIcon = ({ size = 32, weight = 'regular', className = '', ...props }) => {
  const strokeWidth = weight === 'duotone' || weight === 'bold' ? 2 : 1.5;
  const opacity = weight === 'duotone' ? 0.2 : 0;
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      className={className}
      {...props}
    >
      {/* Rear wheel */}
      <circle
        cx="64"
        cy="180"
        r="36"
        fill="currentColor"
        opacity={opacity}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Front wheel */}
      <circle
        cx="192"
        cy="180"
        r="36"
        fill="currentColor"
        opacity={opacity}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Motorcycle body/frame */}
      <path
        d="M64 180 L100 144 L128 144 L160 108 L180 108"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Seat */}
      <path
        d="M100 144 L140 136 L160 144"
        fill="currentColor"
        opacity={opacity}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Handlebar */}
      <path
        d="M180 108 L188 96 M180 108 L188 120"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fork */}
      <path
        d="M180 108 L192 144"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Engine */}
      <rect
        x="112"
        y="156"
        width="32"
        height="24"
        rx="4"
        fill="currentColor"
        opacity={opacity}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Connection to wheels */}
      <path
        d="M128 180 L64 180 M128 180 L192 180"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default MotorcycleIcon;
