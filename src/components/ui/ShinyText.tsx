"use client";

import React from 'react';
import './ShinyText.css';

interface ShinyTextProps {
  text: string;
  speed?: number; // Animasyonun saniye cinsinden süresi
  className?: string;
  color?: string; // Metnin ana rengi
  shineColor?: string; // Parlayan ışığın rengi
  spread?: number; // Işığın açısı
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  speed = 3,
  className = '',
  color = '#6b7280', // Tailwind text-gray-500
  shineColor = '#4f46e5', // Tailwind text-indigo-600
  spread = 110,
}) => {
  // CSS Değişkenlerini inline style ile besliyoruz, DOM'u yormuyoruz
  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 30%, ${shineColor} 50%, ${color} 70%)`,
    animationDuration: `${speed}s`,
  };

  return (
    <span className={`shiny-text ${className}`} style={gradientStyle}>
      {text}
    </span>
  );
};

export default ShinyText;