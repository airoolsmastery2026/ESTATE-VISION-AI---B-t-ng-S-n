import React, { useState, useEffect, useRef } from 'react';
import { STRINGS, VIDEO_RESOLUTIONS, DEFAULT_VIDEO_RESOLUTION, THUMBNAIL_STYLES, DEFAULT_THUMBNAIL_STYLE } from '../constants';
import { generateScript, generateThumbnail, generateVeoVideo, generateVoiceover } from '../services/geminiService';
import { GeneratedAsset, GenerationStep, Project } from '../types';
import { getHistory, saveProject } from '../services/storageService';
import AssetCard from './AssetCard';

const Generator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [resolution, setResolution] = useState(DEFAULT_VIDEO_RESOLUTION);
  const [thumbStyle, setThumbStyle] = useState(DEFAULT_THUMBNAIL_STYLE);
  const [step, setStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // History State
  const [history, setHistory] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'history'>('logs');

  // Preview State
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // Load History from IndexedDB
  useEffect(() => {
    const load = async () => {
        try {
            const h = await getHistory();
            setHistory(h);
        } catch (e) {
            console.error("Failed to load history", e);
            addLog("ERROR: HISTORY DATABASE UNAVAILABLE");
        }
    };
    load();
  }, []);

  const saveProjectToHistory = async (newProject: Project) => {
    // Optimistic UI update
    setHistory(prev => [newProject, ...prev]);
    try {
        await saveProject(newProject);
        addLog("PROJECT ARCHIVED TO DB.");
    } catch (e) {
        console.error("Failed to save to DB", e);
        addLog("ERROR: FAILED TO ARCHIVE PROJECT (STORAGE ERROR)");
    }
  };

  const loadProject = (p: Project) => {
    setTopic(p.topic);
    setAssets(p.assets);
    setStep(GenerationStep.COMPLETED);
    setLogs([`[SYSTEM] ARCHIVE LOADED: ${p.topic.toUpperCase()}`, `[SYSTEM] RESTORED ${p.assets.length} ASSETS.`]);
    setActiveTab('logs');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            let type: GeneratedAsset['type'] | null = null;

            if (file.type.startsWith('image/')) type = 'thumbnail';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            if (type) {
                const newAsset: GeneratedAsset = {
                    id: crypto.randomUUID(),
                    type,
                    content, // Data URL
                    status: 'success'
                };
                // Prepend uploaded assets so they appear first and are used in preview
                setAssets(prev => [newAsset, ...prev]);
                addLog(`[UPLOAD] MEDIA LOADED: ${file.name.toUpperCase()}`);
            } else {
                addLog(`[UPLOAD] UNSUPPORTED FORMAT: ${file.name}`);
            }
        };
        reader.onerror = () => addLog(`[UPLOAD] ERROR READING FILE`);
        reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setStep(GenerationStep.SCRIPTING);
    setAssets([]); // Clear previous
    setLogs([]);
    setActiveTab('logs');
    setPreviewPlaying(false);
    addLog("INITIATING ESTATE PROTOCOL...");

    // Accumulate assets locally to ensure we capture them all for history saving
    const sessionAssets: GeneratedAsset[] = [];
    const addAsset = (asset: GeneratedAsset) => {
        sessionAssets.push(asset);
        setAssets(prev => [...prev, asset]);
    };

    // Delay helper to prevent 429 Rate Limit errors
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      // 1. Script Generation
      addLog("AGENT: WRITING PROPERTY SCRIPT...");
      const scriptText = await generateScript(topic);
      const scriptAsset: GeneratedAsset = { id: crypto.randomUUID(), type: 'script', content: scriptText, status: 'success' };
      addAsset(scriptAsset);
      addLog("SCRIPT GENERATED.");

      // Throttling: Wait 1.5s
      await wait(1500);

      // 2. Audio Generation (Sequential)
      setStep(GenerationStep.VOICING);
      addLog("AGENT: TTS (KORE) - PROCESSING...");
      try {
         const audioUrl = await generateVoiceover(scriptText);
         addAsset({ id: crypto.randomUUID(), type: 'audio', content: audioUrl, status: 'success' });
         addLog("VOICEOVER COMPLETE.");
      } catch (e) {
         console.error(e);
         addLog("ERROR: AUDIO GENERATION FAILED (Check Quota)");
         addAsset({ id: crypto.randomUUID(), type: 'audio', content: '', status: 'error' });
      }

      // Throttling: Wait 1.5s
      await wait(1500);

      // 3. Thumbnail Generation (Sequential)
      setStep(GenerationStep.VISUALIZING);
      addLog(`AGENT: IMAGEN - RENDERING 3D VIEW (${thumbStyle})...`);
      try {
        // If there's an uploaded image (thumbnail type), we could use it as reference,
        // but for now we follow the standard generation path.
        const thumbUrl = await generateThumbnail(topic, thumbStyle);
        // Save topic in metadata for AssetCard overlay
        addAsset({ 
            id: crypto.randomUUID(), 
            type: 'thumbnail', 
            content: thumbUrl, 
            status: 'success',
            metadata: { topic: topic } 
        });
        addLog("THUMBNAIL RENDERED.");
      } catch (e) {
        console.error(e);
        addLog("ERROR: THUMBNAIL FAILED (Check Quota)");
        addAsset({ id: crypto.randomUUID(), type: 'thumbnail', content: '', status: 'error' });
      }

      // Throttling: Wait 1.5s
      await wait(1500);

      // 4. Video Generation (Sequential)
      setStep(GenerationStep.FILMING);
      addLog(`AGENT: VEO (${resolution}) - CREATING VIRTUAL TOUR...`);
      try {
        const videoUrl = await generateVeoVideo(topic, resolution);
        addAsset({ id: crypto.randomUUID(), type: 'video', content: videoUrl, status: 'success' });
        addLog("VIDEO SYNTHESIS COMPLETE.");
      } catch (e) {
        console.error(e);
        addLog("ERROR: VEO FAILED (Check Quota)");
        addAsset({ id: crypto.randomUUID(), type: 'video', content: '', status: 'error' });
      }

      // Finalization
      setStep(GenerationStep.COMPLETED);
      addLog("MISSION ACCOMPLISHED.");

      // Save to History (IndexedDB)
      const newProject: Project = {
        id: crypto.randomUUID(),
        topic: topic,
        createdAt: Date.now(),
        assets: sessionAssets
      };
      await saveProjectToHistory(newProject);

    } catch (error) {
      console.error(error);
      setStep(GenerationStep.FAILED);
      addLog("CRITICAL FAILURE IN PIPELINE.");
    }
  };

  const togglePreview = () => {
    if (!previewVideoRef.current || !previewAudioRef.current) return;

    if (previewPlaying) {
        previewVideoRef.current.pause();
        previewAudioRef.current.pause();
        setPreviewPlaying(false);
    } else {
        previewVideoRef.current.currentTime = 0;
        previewAudioRef.current.currentTime = 0;
        previewVideoRef.current.play();
        previewAudioRef.current.play();
        setPreviewPlaying(true);
    }
  };

  const isWorking = step !== GenerationStep.IDLE && step !== GenerationStep.COMPLETED && step !== GenerationStep.FAILED;

  // Derived state for preview
  const finalVideo = assets.find(a => a.type === 'video' && a.status === 'success');
  const finalAudio = assets.find(a => a.type === 'audio' && a.status === 'success');
  const hasFinalCut = !!(finalVideo && finalAudio);

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Input Section */}
      <div className="bg-zinc-900 p-6 border-b-4 border-yellow-500">
        <div className="flex justify-between items-end mb-2">
            <label className="text-xs font-black text-yellow-500 uppercase tracking-widest block">
              Thông Tin Bất Động Sản
            </label>
            <div className="flex gap-2">
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isWorking}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 uppercase tracking-wider font-mono border border-zinc-700 transition-colors"
                 >
                    + Upload Media
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    multiple 
                    accept="image/*,video/*,audio/*" 
                    onChange={handleFileUpload}
                 />
            </div>
        </div>
        
        <div className="flex gap-2 h-14">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Mô tả dự án (VD: Penthouse Saigon Pearl...)"
            className="flex-[2] bg-black border border-zinc-700 text-white p-4 font-mono focus:border-yellow-500 focus:outline-none text-lg placeholder-zinc-700"
            disabled={isWorking}
          />
          
          {/* Style Selector */}
          <div className="relative w-32 hidden md:block">
             <select
                value={thumbStyle}
                onChange={(e) => setThumbStyle(e.target.value)}
                disabled={isWorking}
                className="h-full w-full bg-black border border-zinc-700 text-white pl-3 pr-6 font-mono focus:border-yellow-500 focus:outline-none appearance-none uppercase text-xs truncate"
            >
                {THUMBNAIL_STYLES.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
               <span className="text-[8px]">▼</span>
            </div>
          </div>

          {/* Resolution Selector */}
          <div className="relative w-24 hidden md:block">
             <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                disabled={isWorking}
                className="h-full w-full bg-black border border-zinc-700 text-white pl-3 pr-6 font-mono focus:border-yellow-500 focus:outline-none appearance-none uppercase text-xs"
            >
                {VIDEO_RESOLUTIONS.map(res => (
                    <option key={res} value={res}>{res}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
               <span className="text-[8px]">▼</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isWorking}
            className={`bg-yellow-500 hover:bg-white text-black font-black uppercase px-6 py-4 transition-all tracking-wider whitespace-nowrap ${isWorking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {step === GenerationStep.IDLE || step === GenerationStep.COMPLETED || step === GenerationStep.FAILED ? STRINGS.BTN_GENERATE : 'ĐANG TẠO...'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        
        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto pr-2">
            
            {/* Final Preview Section */}
            {hasFinalCut && (
                <div className="bg-black border-2 border-yellow-500 mb-8 relative">
                    <div className="absolute top-0 left-0 bg-yellow-500 text-black font-black px-3 py-1 text-sm tracking-widest z-10 clip-path-slant">
                        FINAL CUT PREVIEW
                    </div>
                    <div className="relative aspect-video w-full bg-zinc-900 flex items-center justify-center overflow-hidden group">
                        <video 
                            ref={previewVideoRef}
                            src={finalVideo.content}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            loop
                            muted
                            playsInline
                        />
                        <audio
                            ref={previewAudioRef}
                            src={finalAudio.content}
                            onEnded={() => setPreviewPlaying(false)}
                        />
                        
                        <button 
                            onClick={togglePreview}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors group cursor-pointer"
                        >
                            <div className={`w-24 h-24 bg-yellow-500 text-black rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.4)] transform transition-all duration-300 ${previewPlaying ? 'scale-90 opacity-0 group-hover:opacity-100' : 'scale-100 hover:scale-110'}`}>
                                {previewPlaying ? (
                                    <div className="flex gap-2">
                                        <div className="w-2 h-8 bg-black rounded-sm" />
                                        <div className="w-2 h-8 bg-black rounded-sm" />
                                    </div>
                                ) : (
                                    <div className="w-0 h-0 border-l-[20px] border-l-black border-y-[12px] border-y-transparent ml-2" />
                                )}
                            </div>
                        </button>
                    </div>
                    <div className="bg-zinc-900 p-4 border-t border-zinc-800 flex justify-between items-center">
                        <div className="text-xs font-mono text-zinc-400">
                            <span className="text-yellow-500 font-bold mr-2">TRẠNG THÁI:</span>
                            {previewPlaying ? 'ĐANG PHÁT BẢN REVIEW' : 'SẴN SÀNG PHÁT'}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600 uppercase">
                            Video Loop • Audio Sync
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {assets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                ))}
                {assets.length === 0 && (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-lg">
                        <span className="text-4xl mb-4">🏠</span>
                        <p className="font-mono text-sm">CHƯA CÓ DỰ ÁN NÀO</p>
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-black border-l border-zinc-800 flex flex-col font-mono text-xs hidden lg:flex">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-zinc-800">
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 py-3 text-center uppercase tracking-wider transition-colors ${activeTab === 'logs' ? 'bg-zinc-900 text-yellow-500 font-bold border-b-2 border-yellow-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                >
                    Live Log
                </button>
                <button 
                     onClick={() => setActiveTab('history')}
                     className={`flex-1 py-3 text-center uppercase tracking-wider transition-colors ${activeTab === 'history' ? 'bg-zinc-900 text-yellow-500 font-bold border-b-2 border-yellow-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                >
                    Lịch sử
                </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-950/50">
                {activeTab === 'logs' ? (
                     <div className="space-y-2">
                         {logs.map((log, i) => (
                             <div key={i} className="text-green-500/80 break-words border-l-2 border-green-900/50 pl-2">
                                 <span className="text-zinc-600 mr-2 opacity-50">{'>'}</span>
                                 {log}
                             </div>
                         ))}
                         {step === GenerationStep.IDLE && logs.length === 0 && (
                             <div className="text-zinc-700 animate-pulse text-center mt-10">CHỜ LỆNH...</div>
                         )}
                     </div>
                ) : (
                    <div className="space-y-3">
                        {history.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => loadProject(p)} 
                                className="cursor-pointer bg-zinc-900 p-4 border border-zinc-800 hover:border-yellow-500 group transition-all relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-8 h-8 bg-zinc-800/50 -mr-4 -mt-4 rotate-45 group-hover:bg-yellow-500/20 transition-colors"></div>
                                <div className="text-white font-bold mb-2 group-hover:text-yellow-500 truncate text-sm leading-tight">{p.topic}</div>
                                <div className="flex justify-between items-center text-zinc-500 text-[10px] font-mono border-t border-zinc-800 pt-2 mt-2 group-hover:border-zinc-700">
                                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                    <span className="bg-zinc-800 px-1 rounded text-zinc-400 group-hover:text-yellow-500">{p.assets.length} FILES</span>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="text-zinc-700 text-center py-10 flex flex-col gap-2">
                                <span className="text-2xl">📂</span>
                                <span>TRỐNG</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Generator;