'use client';

import React, { useEffect, useRef } from 'react';

interface RheaOrbProps {
  status?: 'idle' | 'focus' | 'thinking' | 'rest';
  className?: string;
  size?: number;
}

export const RheaOrb: React.FC<RheaOrbProps> = ({
  status = 'idle',
  className = '',
  size = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Menyesuaikan rasio piksel device (HiDPI / Retina display)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.34;

      // Konfigurasi warna & ritme berdasar state
      let colorPrimary = 'rgba(139, 124, 246, 0.75)'; // Rhea Lavender
      let colorSecondary = 'rgba(91, 141, 239, 0.45)'; // Soft Blue
      let speedMultiplier = 1;

      if (status === 'focus') {
        colorPrimary = 'rgba(72, 185, 133, 0.85)'; // Focused Green
        colorSecondary = 'rgba(91, 141, 239, 0.4)';
        speedMultiplier = 0.8;
      } else if (status === 'thinking') {
        colorPrimary = 'rgba(245, 161, 75, 0.85)'; // Active Orange
        colorSecondary = 'rgba(139, 124, 246, 0.5)';
        speedMultiplier = 1.8;
      }

      // 1. Lapisan Glow Terluar
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        baseRadius * 1.5
      );
      glowGrad.addColorStop(0, colorPrimary);
      glowGrad.addColorStop(0.6, colorSecondary);
      glowGrad.addColorStop(1, 'rgba(247, 248, 250, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Wave Mesh Organik (Fluid Organic Fluidity)
      ctx.save();
      ctx.beginPath();
      const points = 32;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wave1 = Math.sin(angle * 3 + time * speedMultiplier) * (baseRadius * 0.08);
        const wave2 = Math.cos(angle * 2 - time * 0.8 * speedMultiplier) * (baseRadius * 0.06);
        const r = baseRadius + wave1 + wave2;

        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Fluid Inner Gradient
      const innerGrad = ctx.createLinearGradient(
        centerX - baseRadius,
        centerY - baseRadius,
        centerX + baseRadius,
        centerY + baseRadius
      );
      innerGrad.addColorStop(0, '#FFFFFF');
      innerGrad.addColorStop(0.3, colorSecondary);
      innerGrad.addColorStop(0.8, colorPrimary);
      innerGrad.addColorStop(1, '#8B7CF6');

      ctx.fillStyle = innerGrad;
      ctx.shadowColor = 'rgba(139, 124, 246, 0.35)';
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.restore();

      // 3. Core Light Specular Center
      const specGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.25,
        centerY - baseRadius * 0.25,
        2,
        centerX,
        centerY,
        baseRadius * 0.8
      );
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      specGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.4)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [status, size]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="pointer-events-none select-none"
      />
    </div>
  );
};
