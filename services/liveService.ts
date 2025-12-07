import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { AssistantConfig } from "../types";
import { base64ToUint8Array, decodeAudioData, createPcmBlob, blobToBase64 } from "./audioUtils";

export class LiveService {
  private ai: GoogleGenAI;
  private config: AssistantConfig;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private videoStream: MediaStream | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private frameInterval: number | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  
  // Callbacks
  public onDisconnect?: () => void;
  public onVolumeUpdate?: (volume: number) => void;
  public onNavigate?: (page: string) => void;

  constructor(config: AssistantConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async connect() {
    // 1. Initialize Audio Contexts
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    this.inputNode = this.inputAudioContext.createGain();
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    // 2. Get User Media (Mic & Screen)
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.videoStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
            width: { max: 1280 },
            height: { max: 720 },
            frameRate: { max: 10 }
        } 
      });
      
      // Stop session if user stops screen share via browser UI
      this.videoStream.getVideoTracks()[0].onended = () => {
        this.disconnect();
      };

    } catch (err) {
      console.error("Error accessing media devices", err);
      throw err;
    }

    // 3. Define Tools
    const navigationTool: FunctionDeclaration = {
      name: 'changePage',
      description: 'Navigate the user to a specific page in the application.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          page: {
            type: Type.STRING,
            enum: ['dashboard', 'projects', 'team', 'settings'],
            description: 'The page to navigate to.',
          },
        },
        required: ['page'],
      },
    };

    // 4. Connect to Gemini Live
    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: this.handleOpen.bind(this),
        onmessage: this.handleMessage.bind(this),
        onclose: this.handleClose.bind(this),
        onerror: this.handleError.bind(this),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        tools: [{ functionDeclarations: [navigationTool] }],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: `You are ${this.config.name} from ${this.config.companyName}. ${this.config.systemInstruction}. 
        You can see the user's screen. 
        You have the ability to navigate the app for the user using the changePage tool if they ask.
        Be concise and helpful.`,
      },
    });

    return this.sessionPromise;
  }

  private handleOpen() {
    console.log("Gemini Live Connected");
    this.startAudioStream();
    this.startVideoStream();
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Tool Calls (Navigation)
    if (message.toolCall) {
      const responses = [];
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'changePage') {
          const page = (fc.args as any).page;
          console.log(`Navigating to ${page}`);
          this.onNavigate?.(page);
          
          responses.push({
            id: fc.id,
            name: fc.name,
            response: { result: `Navigated to ${page}` }
          });
        }
      }
      
      if (responses.length > 0) {
        this.sessionPromise?.then(session => {
          session.sendToolResponse({
            functionResponses: responses
          });
        });
      }
    }

    // Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
        
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      try {
        const audioBuffer = await decodeAudioData(
          base64ToUint8Array(base64Audio),
          this.outputAudioContext,
          24000,
          1
        );
        
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
        
        // Simple visualizer simulation based on audio presence
        this.onVolumeUpdate?.(0.8);
        setTimeout(() => this.onVolumeUpdate?.(0.1), audioBuffer.duration * 1000);

      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
    }
  }

  private handleClose(e: CloseEvent) {
    console.log("Gemini Live Closed", e);
    this.disconnect();
  }

  private handleError(e: ErrorEvent) {
    console.error("Gemini Live Error", e);
    this.disconnect();
  }

  private startAudioStream() {
    if (!this.inputAudioContext || !this.audioStream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.audioStream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeUpdate?.(rms * 5); // Amplify for display

      const pcmBlob = createPcmBlob(inputData);
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private startVideoStream() {
    if (!this.videoStream) return;

    const videoEl = document.createElement('video');
    videoEl.srcObject = this.videoStream;
    videoEl.play();
    videoEl.muted = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Send frames at 1 FPS to conserve bandwidth/tokens while maintaining context
    this.frameInterval = window.setInterval(async () => {
      if (!ctx || !this.sessionPromise || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) return;
      
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const base64Data = await blobToBase64(blob);
          this.sessionPromise?.then(session => {
            session.sendRealtimeInput({
              media: { data: base64Data, mimeType: 'image/jpeg' }
            });
          });
        }
      }, 'image/jpeg', 0.6); // 60% quality jpeg
    }, 1000); // 1000ms = 1fps
  }

  public disconnect() {
    if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor = null;
    }
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    
    // Stop tracks
    this.audioStream?.getTracks().forEach(t => t.stop());
    this.videoStream?.getTracks().forEach(t => t.stop());

    // Close contexts
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();

    // Reset state
    this.audioStream = null;
    this.videoStream = null;
    this.sessionPromise = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    
    if (this.onDisconnect) this.onDisconnect();
  }
}