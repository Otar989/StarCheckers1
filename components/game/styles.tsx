import React from 'react';

export default function GameStyles() {
  return (
    <>
      <style jsx global>{`
        @keyframes moveGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .game-button {
          @apply flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-all duration-200;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        .game-button:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.5);
        }
        .settings-button {
          @apply bg-gray-200 bg-opacity-10;
        }
        .settings-button:hover {
          @apply bg-gray-200 bg-opacity-20;
        }
        .stats-container {
          @apply mt-6 flex justify-between items-center px-4 py-3 rounded-md;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .stat {
          @apply flex items-center gap-2 text-gray-300;
        }
        .main-container {
          @apply shadow-xl rounded-xl;
          background: linear-gradient(45deg, #0f172a, #1e293b);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .input-field {
          @apply w-full p-2 rounded text-white;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .input-field:focus {
          @apply outline-none;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>

      <div className="w-full max-w-md space-y-6 p-6 rounded-xl shadow-xl main-container">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Звёздные шашки
        </h1>
      </div>
    </>
  );
}
