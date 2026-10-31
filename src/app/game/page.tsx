'use client';

/**
 * /game route — renders the full-screen 3D game.
 * Game.jsx is a client-only component (uses browser APIs), so we
 * lazy-import it with next/dynamic and ssr:false to prevent SSR errors.
 */
import dynamic from 'next/dynamic';

const Game = dynamic(
  () => import('@/components/Game'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#050806',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00ffcc',
          fontFamily: 'monospace',
          fontSize: 18,
          letterSpacing: '0.2em',
        }}
      >
        INITIALIZING SHIPWRECK EXPEDITION…
      </div>
    ),
  }
);

export default function GamePage() {
  return <Game />;
}
