import { useEffect, useRef } from 'react';

const NEXUS_COLORS = ['#00F2FE', '#7928CA', '#FF007A', '#38BDF8', '#818CF8', '#A78BFA'];

export default function AuraParticles({ trigger, x, y }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!trigger || !containerRef.current) return;

    const count = 16;
    const container = containerRef.current;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const angle = (i / count) * 2 * Math.PI;
      const distance = 45 + Math.random() * 45;
      const size = 4 + Math.random() * 6;
      const color = NEXUS_COLORS[Math.floor(Math.random() * NEXUS_COLORS.length)];

      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      Object.assign(particle.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: color,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        '--tx': `${tx}px`,
        '--ty': `${ty}px`,
        boxShadow: `0 0 ${size * 3}px ${color}`,
      });

      particle.classList.add('aura-particle');
      container.appendChild(particle);

      setTimeout(() => particle.remove(), 700);
    }

    // Central burst ring
    const ring = document.createElement('div');
    Object.assign(ring.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: '44px',
      height: '44px',
      border: '2px solid rgba(0, 242, 254, 0.8)',
      borderRadius: '50%',
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%)',
      animation: 'particleBurst 0.5s ease-out forwards',
      boxShadow: '0 0 15px rgba(0, 242, 254, 0.5)',
    });
    container.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
  }, [trigger]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    />
  );
}
