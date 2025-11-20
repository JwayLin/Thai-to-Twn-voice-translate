import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData } from '../utils/audioUtils';

export type OnTranscriptionCallback = (text: string, isUser: boolean, isFinal: boolean) => void;
export type OnAudioDataCallback = (analyser: AnalyserNode) => void;
export type OnErrorCallback = (error: Error) => void;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private session: any = null; // The live session object
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources = new Set<AudioBufferSourceNode>();
  
  // Visualizer Analyser
  private outputAnalyser: AnalyserNode | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(
    onTranscription: OnTranscriptionCallback,
    onError: OnErrorCallback
  ) {
    try {
      // 1. Setup Audio Contexts
      // iOS and some browsers might ignore the sampleRate constraint, so we must adapt later
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
      this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });

      // iOS: Explicitly resume contexts to ensure they are active
      if (this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }

      // Setup Output
      this.outputNode = this.outputAudioContext.createGain();
      this.outputAnalyser = this.outputAudioContext.createAnalyser();
      this.outputNode.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputAudioContext.destination);
      this.outputAnalyser.fftSize = 256;

      // 2. Get Microphone Stream
      // Added constraints for better speech quality and requested sample rate
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // 3. Connect to Gemini Live
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            this.startInputStream(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleServerMessage(message, onTranscription);
          },
          onerror: (e: ErrorEvent) => {
            console.error('Gemini Live Error', e);
            onError(new Error("Session error occurred. Please check your connection."));
          },
          onclose: (e: CloseEvent) => {
            console.log('Gemini Live Session Closed', e);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // Use 'Puck' for a male voice as requested
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          // Enhanced system instruction for "Best Quality" translation
          systemInstruction: `
            You are a world-class simultaneous interpreter specializing in Thai (th-TH) and Taiwanese Hokkien (nan-TW).
            
            Your mission is to facilitate seamless communication with the highest level of accuracy and cultural nuance.

            Translation Rules:
            1. **Thai to Taiwanese Hokkien**: When you hear Thai, translate it immediately into natural, idiomatic Taiwanese Hokkien.
            2. **Taiwanese/Mandarin to Thai**: When you hear Taiwanese Hokkien (or Taiwan Mandarin used in a conversational context), translate it immediately into polite and natural Thai.
            3. **Tone & Style**: Maintain the original speaker's emotion, tone, and intent. If the speaker is excited, sound excited. If they are serious, be serious.
            4. **Strict Output**: Do NOT engage in small talk. Do NOT explain your translation (e.g., avoid saying "This means..."). Just speak the translation directly.
            5. **Language Handling**: 
               - For modern Taiwanese contexts where Mandarin and Hokkien are mixed, understand the intent and translate to Thai.
               - Use polite particles in Thai (khrap/kha) appropriate for a male speaker voice.
          `,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      this.session = sessionPromise;

      return this.outputAnalyser;

    } catch (err) {
      console.error("Failed to connect:", err);
      onError(err instanceof Error ? err : new Error("Unknown error connecting"));
      throw err;
    }
  }

  private startInputStream(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    // Buffer size 4096 provides a balance between latency and processing overhead
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.inputAudioContext) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // iOS Note: The context might run at 44.1k or 48k even if we requested 16k.
      // We pass the actual sampleRate to the API so it processes the speed correctly.
      const pcmBlob = createPcmBlob(inputData, this.inputAudioContext.sampleRate);
      
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      }).catch(console.error);
    };

    this.inputSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage, onTranscription: OnTranscriptionCallback) {
    // 1. Handle Transcriptions
    if (message.serverContent?.inputTranscription) {
       onTranscription(message.serverContent.inputTranscription.text, true, false);
    }
    
    if (message.serverContent?.outputTranscription) {
       onTranscription(message.serverContent.outputTranscription.text, false, false);
    }

    if (message.serverContent?.turnComplete) {
        // Turn complete
    }

    // 2. Handle Audio Output
    const audioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioString && this.outputAudioContext && this.outputNode) {
      try {
        // Ensure we don't play in the past
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

        const audioBuffer = await decodeAudioData(audioString, this.outputAudioContext, 24000, 1);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        
        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
      } catch (e) {
        console.error("Error decoding/playing audio:", e);
      }
    }
    
    // 3. Handle Interruption
    const interrupted = message.serverContent?.interrupted;
    if (interrupted) {
        this.sources.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        this.sources.clear();
        this.nextStartTime = 0;
    }
  }

  async disconnect() {
    // Stop Input
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.inputAudioContext) {
      await this.inputAudioContext.close();
      this.inputAudioContext = null;
    }

    // Stop Output
    this.sources.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    this.sources.clear();
    
    if (this.outputAudioContext) {
      await this.outputAudioContext.close();
      this.outputAudioContext = null;
    }

    this.session = null;
  }
}