import React, { useState } from 'react';
import ApiKeyModal from './components/ApiKeyModal';
import Generator from './components/Generator';
import { STRINGS } from './constants';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500 selection:text-black">
      <ApiKeyModal onConnected={() => setHasKey(true)} />
      
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 flex items-center justify-center text-black font-black text-xl">D</div>
          <h1 className="font-bold text-xl tracking-tight">
            {STRINGS.APP_TITLE}
            <span className="ml-3 text-xs text-zinc-500 font-mono border border-zinc-800 px-2 py-1 rounded-full">{STRINGS.TAGLINE}</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
             <div className="text-xs font-mono text-zinc-500">
                SYSTEM STATUS: <span className="text-green-500">ONLINE</span>
             </div>
             {hasKey && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>}
        </div>
      </header>

      {/* Main Layout */}
      <main className="h-[calc(100vh-64px)] p-6">
        {hasKey ? (
            <Generator />
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <div className="text-6xl mb-6 opacity-20">🔒</div>
                <h2 className="text-2xl font-bold mb-2">RESTRICTED ACCESS</h2>
                <p>Authentication Required for Model Usage</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;