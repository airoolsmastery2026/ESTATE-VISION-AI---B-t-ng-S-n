import React, { useState, useRef, useEffect } from 'react';
import { GeneratedAsset } from '../types';

interface Props {
  asset: GeneratedAsset;
}

const AssetCard: React.FC<Props> = ({ asset }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Sync state with audio element whenever volume or rate changes
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, playbackRate, asset.status]);

  const getIcon = () => {
    switch(asset.type) {
        case 'script': return '📝';
        case 'thumbnail': return '🖼️';
        case 'video': return '🎥';
        case 'audio': return '🔊';
        default: return '📄';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 transition-all p-4 flex flex-col h-full relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-50 text-xs font-mono text-zinc-500 group-hover:text-yellow-500">
        {asset.type.toUpperCase()}
      </div>

      <div className="flex-1 min-h-[150px] flex items-center justify-center bg-black/50 mb-4 rounded-sm border border-zinc-800/50 relative overflow-hidden">
        {asset.status === 'pending' && (
          <div className="animate-pulse text-yellow-500 font-mono text-sm">PROCESSING...</div>
        )}

        {asset.status === 'error' && (
           <div className="text-red-500 font-mono text-sm text-center px-2">GENERATION FAILED</div>
        )}

        {asset.status === 'success' && (
          <>
            {asset.type === 'script' && (
              <div className="text-xs text-zinc-300 font-mono p-2 overflow-y-auto max-h-[200px] w-full whitespace-pre-wrap">
                {asset.content}
              </div>
            )}
            {asset.type === 'thumbnail' && (
              <img src={asset.content} alt="Thumbnail" className="w-full h-full object-cover" />
            )}
            {asset.type === 'video' && (
              <video src={asset.content} controls className="w-full h-full object-cover" />
            )}
            {asset.type === 'audio' && (
              <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-4">
                  <div className="text-4xl text-zinc-600">🔊</div>
                  <audio 
                    ref={audioRef} 
                    controls 
                    src={asset.content} 
                    className="w-full max-w-[200px] h-8" 
                  />
                  
                  {/* Audio Controls */}
                  <div className="w-full max-w-[240px] bg-zinc-900/90 p-3 rounded border border-zinc-800 flex flex-col gap-3">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 w-8">VOL</span>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.05" 
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{(volume * 100).toFixed(0)}%</span>
                    </div>

                    {/* Speed Control */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 w-8">SPD</span>
                        <div className="flex-1 flex gap-1 justify-between">
                             {[0.5, 1.0, 1.25, 1.5, 2.0].map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => setPlaybackRate(rate)}
                                    className={`flex-1 py-1 text-[9px] font-mono rounded border transition-colors ${
                                        playbackRate === rate 
                                        ? 'bg-yellow-500 text-black border-yellow-500 font-bold' 
                                        : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                                    }`}
                                >
                                    {rate}x
                                </button>
                             ))}
                        </div>
                    </div>
                  </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="flex justify-between items-center border-t border-zinc-800 pt-3">
          <span className="text-zinc-400 text-xs font-bold">{getIcon()} ASSET ID: {asset.id.slice(0, 4)}</span>
          {asset.status === 'success' && (
            <a 
                href={asset.content} 
                download={`download.${asset.type === 'script' ? 'txt' : asset.type === 'thumbnail' ? 'png' : asset.type === 'video' ? 'mp4' : 'wav'}`}
                className="text-yellow-500 hover:text-white text-xs font-mono uppercase cursor-pointer transition-colors"
            >
                Download
            </a>
          )}
      </div>
    </div>
  );
};

export default AssetCard;