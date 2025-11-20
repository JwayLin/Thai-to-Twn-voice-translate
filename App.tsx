import React, { useState, useCallback, useRef } from 'react';
import { ConnectionState, TranscriptionItem } from './types';
import { GeminiLiveService } from './services/geminiLiveService';
import Controls from './components/Controls';
import AudioVisualizer from './components/AudioVisualizer';
import TranscriptionLog from './components/TranscriptionLog';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  // Helper to update transcription history safely
  const handleTranscription = useCallback((text: string, isUser: boolean, isFinal: boolean) => {
    setTranscriptionHistory(prev => {
      const now = new Date();
      if (!text.trim()) return prev;

      const newItem: TranscriptionItem = {
        id: Date.now().toString() + Math.random().toString(),
        text: text,
        sender: isUser ? 'user' : 'model',
        timestamp: now,
        isFinal: isFinal
      };
      
      return [...prev, newItem];
    });
  }, []);

  const handleConnect = async () => {
    setErrorMsg(null);
    setConnectionState(ConnectionState.CONNECTING);
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing in environment.");
      }

      const service = new GeminiLiveService(apiKey);
      serviceRef.current = service;

      const analyser = await service.connect(
        handleTranscription,
        (err) => {
           console.error(err);
           setConnectionState(ConnectionState.ERROR);
           setErrorMsg("Connection interrupted. Please try again.");
           handleDisconnect();
        }
      );

      setAudioAnalyser(analyser);
      setConnectionState(ConnectionState.CONNECTED);

    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.ERROR);
      setErrorMsg((e as Error).message || "Failed to connect to microphone or API.");
      setAudioAnalyser(null);
    }
  };

  const handleDisconnect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setAudioAnalyser(null);
  }, []);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 font-sans text-gray-900 relative overflow-hidden">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 shadow-md z-10 flex-none">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
               </svg>
            </div>
            <div>
               <h1 className="font-bold text-lg leading-tight">Thai ⇄ Taiwanese</h1>
               <p className="text-emerald-100 text-xs">Gemini Live Interpreter</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Status Indicator */}
            <div className={`h-3 w-3 rounded-full transition-colors duration-300 ${connectionState === ConnectionState.CONNECTED ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-red-400'}`} />
            
            {/* Share Button */}
            <button 
              onClick={() => setShowShareModal(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Share / Install"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto relative overflow-hidden">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2 animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* Chat Log */}
        <TranscriptionLog items={transcriptionHistory} />

        {/* Visualizer overlay at bottom */}
        <div className="flex-none p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-8 pb-6">
          <div className="mb-6">
            <AudioVisualizer 
              analyser={audioAnalyser} 
              isActive={connectionState === ConnectionState.CONNECTED} 
            />
          </div>

          <Controls 
            connectionState={connectionState}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </main>

      {/* Share / Install Modal */}
      {showShareModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg text-gray-800">Install on iPhone</h2>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="bg-white p-2 rounded-xl shadow-md border border-gray-100">
                  {/* Generate QR Code for current URL */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl)}`} 
                    alt="QR Code" 
                    className="w-40 h-40" 
                  />
                </div>
                <p className="text-sm text-gray-500 break-all font-mono bg-gray-100 p-2 rounded text-xs w-full">
                  {currentUrl}
                </p>
                
                <div className="w-full border-t border-gray-100 my-2" />

                <h3 className="font-bold text-emerald-600">How to install (Full Screen)</h3>
                <ol className="text-sm text-gray-600 space-y-3 text-left w-full px-2">
                  <li className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">1</span>
                    <span>Scan QR with iPhone Camera</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">2</span>
                    <span>Open in <strong>Safari</strong></span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">3</span>
                    <span>Tap Share <svg className="w-4 h-4 inline text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">4</span>
                    <span>Scroll down & choose <strong>"Add to Home Screen"</strong></span>
                  </li>
                </ol>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-emerald-600 font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;