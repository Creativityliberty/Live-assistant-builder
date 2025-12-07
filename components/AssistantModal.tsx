import React, { useEffect, useRef, useState } from 'react';
import { AssistantConfig, ConnectionState } from '../types';
import { SparkleIcon, LockIcon, MicIcon } from './Icons';
import { LiveService, TranscriptItem } from '../services/liveService';

interface AssistantModalProps {
  config: AssistantConfig;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  onCreateProject: (project: any) => void;
  onInviteMember: (member: any) => void;
  onSessionEnd: (transcript: TranscriptItem[], duration: number) => void;
  onCustomToolCall: (name: string, args: any) => void;
  onQueryKnowledge: (query: string) => Promise<string>;
  onScaffold: (goal: string) => void;
}

const AudioVisualizer = ({ liveService, isConnected, compact = false }: { liveService: LiveService | null, isConnected: boolean, compact?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isConnected || !liveService || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = liveService.getAnalyserNode();
    
    if (!ctx || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Compact mode uses fewer, wider bars for better visibility in small widget
      const barCount = compact ? 8 : 32;
      const step = Math.floor(bufferLength / barCount);
      const barWidth = (canvas.width / barCount) * 0.7;
      
      let x = (canvas.width - (barCount * (barWidth + 2))) / 2;

      for (let i = 0; i < barCount; i++) {
        // Average value for the frequency range
        let value = 0;
        for (let j = 0; j < step; j++) {
            value += dataArray[i * step + j];
        }
        value = value / step;
        
        const barHeight = Math.max(4, (value / 255) * canvas.height * 0.8);

        // Dynamic Gradient
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#60A5FA'); // Blue-400
        gradient.addColorStop(1, '#2DD4BF'); // Teal-400

        ctx.fillStyle = gradient;
        
        // Center bars vertically for "voice wave" effect in compact mode
        const y = compact ? (canvas.height - barHeight) / 2 : canvas.height - barHeight;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();

        x += barWidth + 2;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isConnected, liveService, compact]);

  if (!isConnected) return null;

  return (
    <canvas 
      ref={canvasRef} 
      width={compact ? 120 : 300} 
      height={compact ? 40 : 100} 
      className={compact ? "w-[120px] h-[40px]" : "w-full max-w-[300px] h-[100px]"}
    />
  );
};

const CalendarWidget = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    (async function (C: any, A: any, L: any) {
        let p = function (a: any, ar: any) { a.q.push(ar); };
        let d = C.document;
        C.Cal = C.Cal || function () {
          let cal = C.Cal;
          let ar = arguments;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            let script = d.head.appendChild(d.createElement("script"));
            script.src = A;
            cal.loaded = true;
          }
          if (ar[0] === L) {
            const api = function () { p(api, arguments); };
            const namespace = ar[1];
            api.q = api.q || [];
            if (typeof namespace === "string") {
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace], ar);
              p(cal, ["initNamespace", namespace]);
            } else p(cal, ar);
            return;
          }
          p(cal, ar);
        };
    })(window, "https://app.cal.com/embed/embed.js", "init");
    
    const cal = (window as any).Cal;
    if (cal) {
        cal("init", "15min", {origin:"https://app.cal.com"});
        
        // Access the namespace function correctly
        if (cal.ns && cal.ns["15min"]) {
            cal.ns["15min"]("inline", {
                elementOrSelector:"#my-cal-inline-15min",
                config: {"layout":"month_view"},
                calLink: "lionel-numtema-x/15min",
            });
            
            cal.ns["15min"]("ui", {"hideEventTypeDetails":false,"layout":"month_view"});
        }
    }

  }, []);

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in">
       <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
             </div>
             <h3 className="font-bold text-gray-800 text-sm">Schedule Meeting</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">✕</button>
       </div>
       <div className="flex-1 w-full relative bg-white">
         <div style={{width:"100%", height:"100%", overflow:"scroll"}} id="my-cal-inline-15min"></div>
       </div>
    </div>
  )
}

const AssistantModal: React.FC<AssistantModalProps> = ({ config, isOpen, onClose, onNavigate, onCreateProject, onInviteMember, onSessionEnd, onCustomToolCall, onQueryKnowledge, onScaffold }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const liveServiceRef = useRef<LiveService | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Floating widget state
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Handle cleaning up when modal is forcibly closed
  useEffect(() => {
    if (!isOpen && liveServiceRef.current) {
      handleDisconnect();
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setConnectionState(ConnectionState.CONNECTING);
    setTranscript([]);
    setShowCalendar(false);
    startTimeRef.current = Date.now();

    try {
      const service = new LiveService(config);
      liveServiceRef.current = service;
      
      service.onDisconnect = () => {
         handleDisconnect();
      };

      service.onNavigate = (page) => {
        onNavigate(page);
      };
      
      service.onCreateProject = (project) => {
        onCreateProject(project);
      };
      
      service.onInviteMember = (member) => {
        onInviteMember(member);
      };
      
      service.onScheduleMeeting = () => {
        setShowCalendar(true);
        setIsMinimized(false); // Ensure widget is visible if minimized
      };

      service.onCustomToolCall = (name, args) => {
         onCustomToolCall(name, args);
      };

      service.onQueryKnowledge = onQueryKnowledge;
      service.onScaffold = onScaffold;

      service.onTranscriptUpdate = (item) => {
        setTranscript(prev => [...prev, item]);
      };

      await service.connect();
      setConnectionState(ConnectionState.CONNECTED);
    } catch (error) {
      console.error("Failed to connect", error);
      setConnectionState(ConnectionState.ERROR);
      if (liveServiceRef.current) {
        liveServiceRef.current.disconnect();
        liveServiceRef.current = null;
      }
    }
  };

  const handleDisconnect = () => {
    const service = liveServiceRef.current;
    liveServiceRef.current = null;

    if (service) {
      service.disconnect();
    }
    
    if (connectionState === ConnectionState.CONNECTED) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        onSessionEnd(transcript, duration);
    }

    setConnectionState(ConnectionState.DISCONNECTED);
    setShowCalendar(false);
    // When disconnecting, fully close the modal/widget
    if (connectionState === ConnectionState.CONNECTED) {
        onClose();
    }
  };

  if (!isOpen) return null;

  // --- FLOATING CO-PILOT WIDGET (CONNECTED STATE) ---
  if (connectionState === ConnectionState.CONNECTED) {
      const lastItem = transcript.length > 0 ? transcript[transcript.length - 1] : null;

      return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
            
            {/* Calendar Widget */}
            {showCalendar && (
               <div className="pointer-events-auto">
                 <CalendarWidget onClose={() => setShowCalendar(false)} />
               </div>
            )}

            {/* 1. Floating Transcript Bubble */}
            {lastItem && !isMinimized && !showCalendar && (
                <div className="bg-white/95 backdrop-blur shadow-lg border border-gray-200 p-4 rounded-2xl max-w-xs mb-2 animate-in slide-in-from-bottom-5 fade-in pointer-events-auto">
                    <p className={`text-sm ${lastItem.role === 'user' ? 'text-gray-600 italic' : 'text-gray-900 font-medium'}`}>
                        {lastItem.text}
                    </p>
                </div>
            )}

            {/* 2. Main Widget Control */}
            <div className="pointer-events-auto flex items-center bg-gray-900 text-white rounded-full shadow-2xl p-2 pr-6 gap-4 border border-gray-700/50 transition-all duration-300 hover:shadow-blue-500/20">
                
                {/* Visualizer / Status Icon */}
                <div className="relative w-12 h-12 flex items-center justify-center bg-gray-800 rounded-full overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-blue-500/20 animate-pulse-slow"></div>
                    <AudioVisualizer liveService={liveServiceRef.current} isConnected={true} compact={true} />
                </div>

                {/* Info Text */}
                {!isMinimized && (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
                            {config.name} Active
                        </span>
                        <span className="text-[10px] text-gray-400">Listening & Watching</span>
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2 pl-2 border-l border-gray-700 ml-2">
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                        title={isMinimized ? "Expand" : "Minimize"}
                    >
                       {isMinimized ? (
                           <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                       ) : (
                           <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
                       )}
                    </button>
                    <button 
                        onClick={handleDisconnect}
                        className="p-1.5 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-full transition-colors"
                        title="End Session"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- INITIAL SETUP MODAL (DISCONNECTED STATE) ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white/90 backdrop-blur-md w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 animate-in fade-in zoom-in duration-300">
        
        <div className="absolute top-10 left-10 text-blue-500 animate-float opacity-80">
          <SparkleIcon className="w-12 h-12 drop-shadow-lg filter" />
        </div>
        <div className="absolute bottom-20 right-10 text-teal-400 animate-float" style={{ animationDelay: '2s' }}>
          <SparkleIcon className="w-8 h-8 drop-shadow-md" />
        </div>

        <div className="flex flex-col items-center justify-center min-h-[500px] p-12 text-center">
            
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 leading-tight">
              Let <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400">{config.name}</span> guide you <br />
              step-by-step
            </h1>

            <p className="text-lg text-gray-600 max-w-2xl mb-12 leading-relaxed">
              No need to type, simply share your screen and audio and start talking. 
              {config.name} sees what you see and listens, then provides 
              <strong className="text-gray-900"> step-by-step guidance</strong> and can even 
              <strong className="text-gray-900"> perform actions</strong> for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
              <button 
                onClick={onClose}
                className="px-8 py-3.5 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleConnect}
                disabled={connectionState === ConnectionState.CONNECTING}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-400 text-white font-medium hover:shadow-lg hover:opacity-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-center gap-2 min-w-[200px]"
              >
                {connectionState === ConnectionState.CONNECTING ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting...
                    </>
                ) : (
                    <>
                      <SparkleIcon className="w-5 h-5" />
                      <span>Start Co-pilot Session</span>
                    </>
                )}
              </button>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-4 text-left max-w-2xl">
              <LockIcon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 leading-relaxed">
                Share only what's relevant to what you're working on. 
                You can stop sharing anytime. {config.name} uses Google's Gemini API.
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantModal;