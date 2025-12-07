import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { AssistantConfig } from "../types";
import { base64ToUint8Array, decodeAudioData, createPcmBlob, blobToBase64 } from "./audioUtils";

export interface TranscriptItem {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

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
  private outputAnalyser: AnalyserNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private frameInterval: number | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  
  // Transcription state
  private currentInputTranscription = '';
  private currentOutputTranscription = '';

  // Callbacks
  public onDisconnect?: () => void;
  public onVolumeUpdate?: (volume: number) => void;
  public onNavigate?: (page: string) => void;
  public onCreateProject?: (project: any) => void;
  public onInviteMember?: (member: any) => void;
  public onTranscriptUpdate?: (item: TranscriptItem) => void;
  public onScheduleMeeting?: () => void;
  public onCustomToolCall?: (toolName: string, args: any) => void;
  
  // New Callbacks for Knowledge and Scaffold
  public onQueryKnowledge?: (query: string) => Promise<string>;
  public onScaffold?: (goal: string) => void;

  constructor(config: AssistantConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  public async connect() {
    // 1. Initialize Audio Contexts
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    this.inputNode = this.inputAudioContext.createGain();
    this.outputNode = this.outputAudioContext.createGain();
    
    // Create Analyser for visualization (Assistant voice)
    this.outputAnalyser = this.outputAudioContext.createAnalyser();
    this.outputAnalyser.fftSize = 512;
    this.outputAnalyser.smoothingTimeConstant = 0.8;
    
    this.outputNode.connect(this.outputAnalyser);
    this.outputAnalyser.connect(this.outputAudioContext.destination);

    // 2. Get User Media (Mic & Screen)
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      try {
        this.videoStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
              width: { max: 1280 },
              height: { max: 720 },
              frameRate: { max: 10 }
          } 
        });
      } catch (e) {
        console.warn("Screen share denied or failed, proceeding with audio only", e);
      }
      
      if (this.videoStream) {
        this.videoStream.getVideoTracks()[0].onended = () => {
          this.disconnect();
        };
      }

    } catch (err) {
      console.error("Error accessing media devices", err);
      this.disconnect();
      throw err;
    }

    // 3. Define Standard Tools
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

    const createProjectTool: FunctionDeclaration = {
      name: 'createProject',
      description: 'Create a new project in the system.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'The name of the project' },
          status: { type: Type.STRING, enum: ['Planning', 'In Progress', 'Completed'], description: 'The status of the project' },
          description: { type: Type.STRING, description: 'A brief description of the project' }
        },
        required: ['name'],
      },
    };

    const inviteMemberTool: FunctionDeclaration = {
      name: 'inviteMember',
      description: 'Invite a new team member.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'The full name of the person' },
          role: { type: Type.STRING, description: 'The job role (e.g. Designer, Developer)' },
          email: { type: Type.STRING, description: 'Email address' },
          bio: { type: Type.STRING, description: 'Short bio' }
        },
        required: ['name', 'role'],
      },
    };

    const createTicketTool: FunctionDeclaration = {
      name: 'createTicket',
      description: 'Create a support ticket or task.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING, description: 'The subject or title of the ticket' },
          description: { type: Type.STRING, description: 'The details of the ticket' }
        },
        required: ['subject', 'description']
      }
    };

    const scheduleMeetingTool: FunctionDeclaration = {
      name: 'scheduleMeeting',
      description: 'Schedule a meeting or appointment calendar.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    };

    const queryKnowledgeBaseTool: FunctionDeclaration = {
        name: 'queryKnowledgeBase',
        description: 'Query the internal knowledge base or database to answer questions about data, revenue, metrics, or company information.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: 'The natural language query to ask the database.' }
            },
            required: ['query']
        }
    };

    const scaffoldWorkspaceTool: FunctionDeclaration = {
        name: 'scaffoldWorkspace',
        description: 'Automatically set up a complete workspace environment including projects, team members, and tasks based on a high-level goal.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                goal: { type: Type.STRING, description: 'The high-level goal (e.g. "Launch a new marketing campaign").' }
            },
            required: ['goal']
        }
    };

    // 4. Define Custom Tools
    const customFunctionDeclarations: FunctionDeclaration[] = (this.config.customTools || []).map(tool => {
      const properties: any = {};
      const required: string[] = [];
      
      tool.parameters.forEach(param => {
        properties[param.name] = {
          type: param.type === 'NUMBER' ? Type.NUMBER : param.type === 'BOOLEAN' ? Type.BOOLEAN : Type.STRING,
          description: param.description
        };
        required.push(param.name);
      });

      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: Type.OBJECT,
          properties: properties,
          required: required.length > 0 ? required : undefined
        }
      };
    });

    const allTools = [
      navigationTool, 
      createProjectTool, 
      inviteMemberTool, 
      createTicketTool, 
      scheduleMeetingTool,
      queryKnowledgeBaseTool,
      scaffoldWorkspaceTool,
      ...customFunctionDeclarations
    ];

    // 5. Connect to Gemini Live
    try {
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: this.handleClose.bind(this),
          onerror: this.handleError.bind(this),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: allTools }],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are ${this.config.name} from ${this.config.companyName}. ${this.config.systemInstruction}. 
          You can see the user's screen. 
          You have the ability to navigate the app, create projects, invite team members, create tickets, and schedule meetings using tools.
          You can also query the knowledge base for data and scaffold entire workspaces using 'scaffoldWorkspace'.
          You also have access to custom tools defined by the user: ${customFunctionDeclarations.map(t => t.name).join(', ')}.
          Be concise and helpful.`,
        },
      });

      return this.sessionPromise;
    } catch (err) {
       console.error("Failed to initiate Live API connection", err);
       this.disconnect();
       throw err;
    }
  }

  private handleOpen() {
    console.log("Gemini Live Connected");
    this.startAudioStream();
    if (this.videoStream) {
      this.startVideoStream();
    }
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Transcription
    const serverContent = message.serverContent;
    
    if (serverContent?.outputTranscription?.text) {
      this.currentOutputTranscription += serverContent.outputTranscription.text;
    }
    
    if (serverContent?.inputTranscription?.text) {
      this.currentInputTranscription += serverContent.inputTranscription.text;
    }

    if (serverContent?.turnComplete) {
      if (this.currentInputTranscription.trim()) {
        this.onTranscriptUpdate?.({
          role: 'user',
          text: this.currentInputTranscription,
          timestamp: new Date()
        });
        this.currentInputTranscription = '';
      }
      if (this.currentOutputTranscription.trim()) {
        this.onTranscriptUpdate?.({
          role: 'assistant',
          text: this.currentOutputTranscription,
          timestamp: new Date()
        });
        this.currentOutputTranscription = '';
      }
    }

    // 2. Handle Tool Calls
    if (message.toolCall) {
      const responses = [];
      for (const fc of message.toolCall.functionCalls) {
        let result = 'OK';
        
        // Standard Tools
        if (fc.name === 'changePage') {
          const page = (fc.args as any).page;
          this.onNavigate?.(page);
          result = `Navigated to ${page}`;
        } else if (fc.name === 'createProject') {
          const project = fc.args as any;
          this.onCreateProject?.(project);
          result = `Created project ${project.name}`;
        } else if (fc.name === 'inviteMember') {
          const member = fc.args as any;
          this.onInviteMember?.(member);
          result = `Invited ${member.name} as ${member.role}`;
        } else if (fc.name === 'createTicket') {
          const args = fc.args as any;
          this.onCreateProject?.({
             name: args.subject,
             description: args.description,
             status: 'Planning'
          });
          result = `Created ticket: ${args.subject}`;
        } else if (fc.name === 'scheduleMeeting') {
          this.onScheduleMeeting?.();
          result = `Opened meeting scheduler`;
        } else if (fc.name === 'queryKnowledgeBase') {
            const args = fc.args as any;
            if (this.onQueryKnowledge) {
                result = await this.onQueryKnowledge(args.query);
            } else {
                result = "Knowledge base not connected.";
            }
        } else if (fc.name === 'scaffoldWorkspace') {
            const args = fc.args as any;
            this.onScaffold?.(args.goal);
            result = `Workspace scaffolded successfully for goal: ${args.goal}`;
        } else {
          // Custom Tools Fallback
          this.onCustomToolCall?.(fc.name, fc.args);
          result = `Executed custom tool ${fc.name}`;
        }

        responses.push({
          id: fc.id,
          name: fc.name,
          response: { result }
        });
      }
      
      if (responses.length > 0) {
        this.sessionPromise?.then(session => {
          session.sendToolResponse({
            functionResponses: responses
          });
        });
      }
    }

    // 3. Handle Audio Output
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
        source.connect(this.outputNode); // Connects to Analyser -> Destination
        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);

      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
      this.currentOutputTranscription = ''; // Clear partial text on interrupt
    }
  }

  private handleClose(e: CloseEvent) {
    console.log("Gemini Live Closed", e);
    this.disconnect();
  }

  private handleError(e: ErrorEvent) {
    console.error("Gemini Live Error", e);
  }

  private startAudioStream() {
    if (!this.inputAudioContext || !this.audioStream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.audioStream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate simple volume for visualizer fallback
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeUpdate?.(rms * 5); 

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
      }, 'image/jpeg', 0.5); 
    }, 1000); 
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
    
    this.audioStream?.getTracks().forEach(t => t.stop());
    this.videoStream?.getTracks().forEach(t => t.stop());

    this.inputAudioContext?.close();
    this.outputAudioContext?.close();

    this.audioStream = null;
    this.videoStream = null;
    this.sessionPromise = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.outputAnalyser = null;
    
    const onDisconnectCallback = this.onDisconnect;
    this.onDisconnect = undefined;

    if (onDisconnectCallback) {
        onDisconnectCallback();
    }
  }
}