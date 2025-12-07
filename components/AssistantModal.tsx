import React, { useEffect, useRef, useState } from 'react';
import { AssistantConfig, ConnectionState } from '../types';
import { SparkleIcon, LockIcon, MicIcon, ScreenShareIcon } from './Icons';
import { LiveService } from '../services/liveService';

interface AssistantModalProps {
  config: AssistantConfig;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

const AssistantModal: React.FC<AssistantModalProps> = ({ config, isOpen, onClose, onNavigate }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [audioLevel, setAudioLevel] = useState(0);
  const liveServiceRef = useRef<LiveService | null>(null);

  useEffect(() => {
    if (!isOpen && liveServiceRef.current) {
      liveServiceRef.current.disconnect();
      setConnectionState(ConnectionState.DISCONNECTED);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setConnectionState(ConnectionState.CONNECTING);
    try {
      const service = new LiveService(config);
      liveServiceRef.current = service;
      
      service.onDisconnect = () => {
        setConnectionState(ConnectionState.DISCONNECTED);
        // Do not close modal automatically, let user see it finished or error
      };

      service.onVolumeUpdate = (level) => {
        setAudioLevel(prev => level * 0.2 + prev * 0.8); // Smoothing
      };

      service.onNavigate = (page) => {
        onNavigate(page);
      };

      await service.connect();
      setConnectionState(ConnectionState.CONNECTED);
    } catch (error) {
      console.error("Failed to connect", error);
      setConnectionState(ConnectionState.ERROR);
      // Clean up if failed
      if (liveServiceRef.current) {
        liveServiceRef.current.disconnect();
        liveServiceRef.current = null;
      }
    }
  };

  const handleDisconnect = () => {
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
      liveServiceRef.current = null;
    }
    setConnectionState(ConnectionState.DISCONNECTED);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white/90 backdrop-blur-md w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 animate-in fade-in zoom-in duration-300">
        
        {/* Floating Sparks Decoration */}
        <div className="absolute top-10 left-10 text-blue-500 animate-float opacity-80">
          <SparkleIcon className="w-12 h-12 drop-shadow-lg filter" />
        </div>
        <div className="absolute bottom-20 right-10 text-teal-400 animate-float" style={{ animationDelay: '2s' }}>
          <SparkleIcon className="w-8 h-8 drop-shadow-md" />
        </div>

        {connectionState === ConnectionState.CONNECTED ? (
            // ACTIVE SESSION UI
            <div className="flex flex-col items-center justify-center min-h-[500px] p-12 text-center space-y-8">
               <div className="relative">
                  {/* Pulsating Ring based on Audio Level */}
                  <div 
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-teal-400 blur-xl opacity-40 transition-all duration-75"
                    style={{ transform: `scale(${1 + audioLevel * 2})` }}
                  />
                  <div className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg">
                    <SparkleIcon className="w-16 h-16 text-white" />
                  </div>
               </div>
               
               <div className="space-y-2">
                 <h2 className="text-3xl font-bold text-gray-800">Listening & Watching...</h2>
                 <p className="text-gray-500 max-w-md mx-auto">
                   {config.name} is viewing your shared screen. Speak naturally to ask for help.
                 </p>
               </div>

               <div className="flex items-center gap-4">
                 <div className="px-4 py-2 bg-red-50 text-red-600 rounded-full flex items-center gap-2 border border-red-100">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Live Recording
                 </div>
               </div>

               <button 
                onClick={handleDisconnect}
                className="mt-8 px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-colors"
               >
                 Stop Session
               </button>
            </div>
        ) : (
            // LANDING / PERMISSION REQUEST UI
            <div className="flex flex-col items-center justify-center min-h-[500px] p-12 text-center">
                
                <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 leading-tight">
                  Let <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400">{config.name}</span> guide you <br />
                  step-by-step
                </h1>

                <p className="text-lg text-gray-600 max-w-2xl mb-12 leading-relaxed">
                  No need to type, simply share your screen and audio and start talking. 
                  {config.name} sees what you see and listens, then provides 
                  <strong className="text-gray-900"> step-by-step guidance</strong> for any task.
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
                          <span>Continue to {config.name}</span>
                        </>
                    )}
                  </button>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-4 text-left max-w-2xl">
                  <LockIcon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Share only what's relevant to what you're working on, and 
                    <strong className="text-gray-800"> avoid sharing other personal information</strong>. 
                    You can stop sharing anytime. {config.name} uses Google's Gemini API which may produce inaccurate information.
                  </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AssistantModal;