import React, { useEffect, useState } from 'react';
import { STRINGS } from '../constants';

const ApiKeyModal: React.FC<{ onConnected: () => void }> = ({ onConnected }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const checkKey = async () => {
    try {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setIsVisible(false);
        onConnected();
        return true;
      }
    } catch (e) {
      console.error("Error checking key", e);
    }
    return false;
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success immediately after modal interaction per strict guidelines
            setIsVisible(false);
            onConnected();
        } else {
            alert("AI Studio environment not detected.");
        }
    } catch (e) {
        console.error("Key selection failed", e);
        // If "Requested entity was not found", prompt again
        if (e instanceof Error && e.message.includes("Requested entity was not found")) {
             await window.aistudio.openSelectKey();
             setIsVisible(false);
             onConnected();
        }
    } finally {
        setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-zinc-900 border-2 border-yellow-500 p-8 rounded-none max-w-md w-full shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        <h2 className="text-3xl font-black text-yellow-500 mb-4 tracking-tighter uppercase">
          {STRINGS.APP_TITLE}
        </h2>
        <p className="text-zinc-400 mb-8 font-mono text-sm leading-relaxed">
          Access to military-grade generative models (Veo, Gemini 1.5 Pro) requires a valid API key. 
          <br /><br />
          <span className="text-red-500 font-bold">WARNING:</span> This tool is designed for extreme performance.
        </p>
        
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 px-6 uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.6)] disabled:opacity-50 disabled:cursor-not-allowed clip-path-slant"
          style={{ clipPath: 'polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)' }}
        >
          {loading ? 'INITIALIZING...' : STRINGS.BTN_CONNECT}
        </button>
        
        <div className="mt-4 text-center">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs text-zinc-600 hover:text-yellow-500 underline">
                Billing Documentation
            </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;