import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import AssistantModal from './components/AssistantModal';
import { AssistantConfig, CustomTool, ToolParameter } from './types';
import { SparkleIcon } from './components/Icons';
import { api, SessionData } from './services/api';

const DEFAULT_CONFIG: AssistantConfig = {
  name: 'Kämelia',
  companyName: 'Acme Corp',
  primaryColor: '#3b82f6',
  systemInstruction: 'You are Kämelia, an expert guide for Acme Corp. Help the user navigate the platform by looking at their screen and providing clear, encouraging verbal instructions. Be concise and friendly.',
  customTools: []
};

// Initial Data
const INITIAL_PROJECTS = [
  { id: 1, name: 'Website Redesign', status: 'In Progress', date: '2 days ago', description: 'Overhauling the corporate website with new branding and React components.' },
  { id: 2, name: 'Mobile App Launch', status: 'Completed', date: '1 week ago', description: 'iOS and Android deployment for the Q1 release cycle.' },
  { id: 3, name: 'Q3 Marketing Campaign', status: 'Planning', date: 'Just now', description: 'Strategy planning for social media and email outreach.' },
  { id: 4, name: 'Customer Portal', status: 'In Progress', date: '3 days ago', description: 'Self-service portal for enterprise clients to manage billing.' },
];

const INITIAL_TEAM = [
  { id: 1, name: 'Sarah Wilson', role: 'Product Manager', initial: 'S', email: 'sarah.w@acme.com', bio: 'Driving product vision and strategy across all core verticals.' },
  { id: 2, name: 'Mike Chen', role: 'Lead Developer', initial: 'M', email: 'mike.c@acme.com', bio: 'Full-stack architect specializing in scalable cloud infrastructure.' },
  { id: 3, name: 'Jessica Lee', role: 'Designer', initial: 'J', email: 'jess.l@acme.com', bio: 'UI/UX specialist focused on accessible and inclusive design systems.' },
  { id: 4, name: 'Tom Brown', role: 'Marketing', initial: 'T', email: 'tom.b@acme.com', bio: 'Growth hacker and content strategist for B2B markets.' },
];

const INITIAL_USER = {
  name: 'Felix Johnson',
  role: 'Admin',
  email: 'felix@acme.com',
  avatarSeed: 'Felix',
  bio: 'Product enthusiast and builder of things. Loves clear code and great UX.'
};

// --- Sub-Components ---

const ToolEditorModal = ({
  tool,
  isOpen,
  onClose,
  onSave
}: {
  tool: CustomTool | null,
  isOpen: boolean,
  onClose: () => void,
  onSave: (tool: CustomTool) => void
}) => {
  if (!isOpen) return null;
  const isNew = !tool;
  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [parameters, setParameters] = useState<ToolParameter[]>(tool?.parameters || []);

  const addParameter = () => {
    setParameters([...parameters, { name: '', type: 'STRING', description: '' }]);
  };

  const updateParameter = (index: number, field: keyof ToolParameter, value: string) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], [field]: value };
    setParameters(newParams);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: tool?.id || Date.now().toString(),
      name,
      description,
      parameters
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <h3 className="text-lg font-bold text-gray-900">{isNew ? 'New Custom Tool' : 'Edit Tool'}</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tool Name (Function Name)</label>
             <input 
               type="text" 
               className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
               placeholder="e.g. searchDatabase"
               value={name}
               onChange={e => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
             />
             <p className="text-[10px] text-gray-400 mt-1">Alphanumeric and underscores only.</p>
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
             <textarea 
               className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
               placeholder="What does this tool do?"
               value={description}
               onChange={e => setDescription(e.target.value)}
             />
           </div>
           
           <div>
             <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parameters</label>
                <button onClick={addParameter} className="text-xs text-blue-600 font-medium hover:underline">+ Add Argument</button>
             </div>
             
             <div className="space-y-3">
               {parameters.map((param, idx) => (
                 <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group">
                    <button onClick={() => removeParameter(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input 
                        type="text" 
                        className="col-span-2 text-xs border border-gray-300 rounded px-2 py-1 font-mono" 
                        placeholder="Arg Name"
                        value={param.name}
                        onChange={e => updateParameter(idx, 'name', e.target.value)}
                      />
                      <select 
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                        value={param.type}
                        onChange={e => updateParameter(idx, 'type', e.target.value)}
                      >
                        <option value="STRING">String</option>
                        <option value="NUMBER">Number</option>
                        <option value="BOOLEAN">Boolean</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      placeholder="Description"
                      value={param.description}
                      onChange={e => updateParameter(idx, 'description', e.target.value)}
                    />
                 </div>
               ))}
               {parameters.length === 0 && (
                 <p className="text-sm text-gray-400 italic text-center py-2">No arguments defined.</p>
               )}
             </div>
           </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
           <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
           <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Save Tool</button>
        </div>
      </div>
    </div>
  );
};

const ProjectModal = ({ 
  project, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  project: any | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (p: any) => void 
}) => {
  if (!isOpen) return null;
  const isNew = !project;
  const [formData, setFormData] = useState(project || { name: '', status: 'Planning', description: '' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">{isNew ? 'New Project' : 'Edit Project'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input 
              type="text" 
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Q4 Roadmap"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Brief details about the project..."
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => { onSave(formData); onClose(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
            {isNew ? 'Create Project' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MemberModal = ({ 
  member, 
  isOpen, 
  onClose,
  onSave
}: { 
  member: any | null, 
  isOpen: boolean, 
  onClose: () => void,
  onSave: (m: any) => void
}) => {
  if (!isOpen) return null;
  const isNew = !member;
  const [formData, setFormData] = useState(member || { name: '', role: '', email: '', bio: '' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
         <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
             <div className="absolute -bottom-8 left-6 w-20 h-20 bg-white rounded-full p-1 shadow-md">
                <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-500 overflow-hidden">
                  {formData.name ? formData.name.charAt(0) : '?'}
                </div>
             </div>
             <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">✕</button>
         </div>
         <div className="pt-10 px-6 pb-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 ml-1">{isNew ? 'Invite New Member' : formData.name}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
              <input 
                type="email" 
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bio</label>
              <textarea 
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none"
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg shadow-sm transition-colors">
                {isNew ? 'Send Invite' : 'Save Profile'}
              </button>
            </div>
         </div>
      </div>
    </div>
  );
};

const UserProfileModal = ({
  user,
  isOpen,
  onClose,
  onSave
}: {
  user: typeof INITIAL_USER,
  isOpen: boolean,
  onClose: () => void,
  onSave: (u: typeof INITIAL_USER) => void
}) => {
  if (!isOpen) return null;
  const [formData, setFormData] = useState(user);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Cover / Header */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-teal-400 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-10">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Avatar & Content */}
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex justify-between items-end">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-100 overflow-hidden relative group">
               <img 
                 src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.avatarSeed}`} 
                 alt="Avatar" 
                 className="w-full h-full object-cover"
               />
               <button 
                 type="button"
                 onClick={() => setFormData({...formData, avatarSeed: Math.random().toString(36).substring(7)})}
                 className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold uppercase tracking-wider cursor-pointer"
               >
                 Change
               </button>
            </div>
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wide rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full text-lg font-bold text-gray-900 border-b-2 border-gray-100 focus:border-blue-500 outline-none py-1 transition-colors bg-transparent placeholder-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
                  <input 
                    type="text" 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full text-sm font-medium text-gray-700 border-b border-gray-100 focus:border-blue-500 outline-none py-1 transition-colors bg-transparent"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full text-sm font-medium text-gray-700 border-b border-gray-100 focus:border-blue-500 outline-none py-1 transition-colors bg-transparent"
                  />
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Bio</label>
               <textarea 
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  className="w-full text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all resize-none h-24"
               />
            </div>

            <button 
              onClick={() => { onSave(formData); onClose(); }}
              className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-medium shadow-lg shadow-gray-200 transition-all active:scale-[0.98] mt-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SaveSessionPrompt = ({
  data,
  onConfirm,
  onCancel
}: {
  data: { duration: number, transcriptCount: number } | null,
  onConfirm: () => void,
  onCancel: () => void
}) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
             <SparkleIcon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Save Conversation?</h3>
          <p className="text-sm text-gray-500">
            The session lasted <strong>{data.duration} seconds</strong> with <strong>{data.transcriptCount} messages</strong>. 
            Do you want to save the transcript to your history?
          </p>
          <div className="flex gap-3 pt-2">
             <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
               Discard
             </button>
             <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
               Save Transcript
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TranscriptViewerModal = ({
  session,
  onClose
}: {
  session: SessionData | null,
  onClose: () => void
}) => {
  if (!session) return null;

  const copyMarkdown = () => {
    const md = `# Session Transcript - ${new Date(session.date).toLocaleString()}\n\n${session.summary ? `## Summary\n${session.summary}\n\n` : ''}## Transcript\n${session.transcript.map(t => `**${t.role.toUpperCase()}**: ${t.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(md);
    alert("Copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
           <div>
             <h3 className="text-lg font-bold text-gray-900">Session Transcript</h3>
             <p className="text-xs text-gray-500">{new Date(session.date).toLocaleString()} • {session.duration}s</p>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={copyMarkdown} className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">
               Copy Markdown
             </button>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
           {session.summary && (
              <div className="mb-8 bg-amber-50/50 p-5 rounded-xl border border-amber-100 text-sm text-gray-800 leading-relaxed shadow-sm">
                <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <SparkleIcon className="w-4 h-4" /> AI Summary
                </h4>
                <div className="prose prose-sm prose-amber max-w-none whitespace-pre-wrap">
                  {session.summary}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {session.transcript.map((t, i) => (
                  <div key={i} className={`flex gap-4 ${t.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm
                        ${t.role === 'user' ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-gradient-to-br from-blue-500 to-teal-400 text-white'}`}>
                        {t.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <div className={`px-5 py-3 rounded-2xl text-sm max-w-[85%] leading-relaxed shadow-sm
                        ${t.role === 'user' ? 'bg-gray-50 text-gray-800 border border-gray-200 rounded-tr-none' : 'bg-blue-50/50 text-blue-900 border border-blue-100 rounded-tl-none'}`}>
                        {t.text}
                    </div>
                  </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_CONFIG);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  // Use number for browser-side timeout ID
  const saveTimeoutRef = useRef<number | null>(null);

  // App Data State
  const [user, setUser] = useState(INITIAL_USER);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [team, setTeam] = useState(INITIAL_TEAM);

  // Session & History
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<{ transcript: any[], duration: number } | null>(null);
  const [viewingSession, setViewingSession] = useState<SessionData | null>(null);

  // Modal States
  const [activeModal, setActiveModal] = useState<'project' | 'member' | 'tool' | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Custom Tool Feedback
  const [customToolToast, setCustomToolToast] = useState<{name: string, args: any} | null>(null);

  // Load config from backend on mount
  useEffect(() => {
    const loadConfig = async () => {
      // 1. Check for local draft first (restore session)
      const savedDraft = localStorage.getItem('assistant_config_draft');
      if (savedDraft) {
        try {
          setConfig(JSON.parse(savedDraft));
        } catch (e) {
          console.error("Failed to parse draft config", e);
        }
      }

      // 2. Fetch from backend
      const savedConfig = await api.getConfig();
      if (savedConfig) {
        // Only overwrite if we didn't have a draft (meaning clean session)
        if (!savedDraft) {
          setConfig(savedConfig);
        }
      }
    };
    loadConfig();
  }, []);

  // Load history when entering history page
  useEffect(() => {
    if (activePage === 'history') {
      api.getSessions().then(setSessions);
    }
  }, [activePage]);

  // Handle Toast timeout
  useEffect(() => {
    if (customToolToast) {
      const t = setTimeout(() => setCustomToolToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [customToolToast]);

  const handleChange = (field: keyof AssistantConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    
    // Save draft locally immediately
    localStorage.setItem('assistant_config_draft', JSON.stringify(newConfig));
    setSaveStatus('saving');

    // Debounce server save
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
        api.saveConfig(newConfig)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 1000);
  };

  const handleSessionEnd = (transcript: any[], duration: number) => {
    if (transcript.length === 0) return;
    // Trigger the save prompt instead of auto-saving
    setPendingSession({ transcript, duration });
  };

  const confirmSaveSession = async () => {
    if (!pendingSession) return;
    
    const newSession: SessionData = {
      date: new Date().toISOString(),
      duration: pendingSession.duration,
      transcript: pendingSession.transcript.map(t => ({
        role: t.role,
        text: t.text,
        timestamp: t.timestamp.toISOString()
      }))
    };
    
    await api.saveSession(newSession);
    setPendingSession(null);
    
    // Refresh sessions if on history page
    if (activePage === 'history') {
      api.getSessions().then(setSessions);
    }
  };

  const discardSession = () => {
    setPendingSession(null);
  };

  const generateSummary = async (session: SessionData) => {
    if (!session.id) return;
    setSummaryLoading(session.id);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const transcriptText = session.transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
      const prompt = `Please analyze the following transcript of a session between a user and an AI assistant named ${config.name}. 
      Provide a concise summary in Markdown format that includes:
      1. The main goal of the user.
      2. Key actions performed or discussed.
      3. Any resolved issues or next steps.
      
      Transcript:
      ${transcriptText}`;

      // Correct usage per SDK guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      const summary = response.text;
      
      // Update local state temporarily (In a real app, save this summary to backend)
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, summary } : s));
      
    } catch (e) {
      console.error("Summary generation failed", e);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setSummaryLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const openProjectModal = (project: any = null) => {
    setSelectedItem(project);
    setActiveModal('project');
  };

  const handleSaveProject = (projectData: any) => {
    if (projectData.id) {
        setProjects(prev => prev.map(p => p.id === projectData.id ? projectData : p));
    } else {
        const newProject = {
            ...projectData,
            id: Date.now(),
            date: 'Just now'
        };
        setProjects(prev => [newProject, ...prev]);
    }
  };

  const openMemberModal = (member: any = null) => {
    setSelectedItem(member);
    setActiveModal('member');
  };

  const handleSaveMember = (memberData: any) => {
    if (memberData.id) {
        setTeam(prev => prev.map(m => m.id === memberData.id ? memberData : m));
    } else {
        const newMember = {
            ...memberData,
            id: Date.now(),
            initial: memberData.name.charAt(0).toUpperCase()
        };
        setTeam(prev => [newMember, ...prev]);
    }
  }
  
  const openToolModal = (tool: CustomTool | null = null) => {
    setSelectedItem(tool);
    setActiveModal('tool');
  };

  const handleSaveTool = (tool: CustomTool) => {
    let newTools = config.customTools || [];
    const index = newTools.findIndex(t => t.id === tool.id);
    if (index !== -1) {
      newTools[index] = tool;
    } else {
      newTools = [...newTools, tool];
    }
    handleChange('customTools', newTools);
  };
  
  const handleDeleteTool = (toolId: string) => {
    const newTools = (config.customTools || []).filter(t => t.id !== toolId);
    handleChange('customTools', newTools);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedItem(null);
  };

  // AI Actions Handlers
  const handleCreateProjectAI = (projectData: any) => {
    handleSaveProject({
        ...projectData,
        status: projectData.status || 'Planning',
        description: projectData.description || 'Created via AI Assistant'
    });
    setActivePage('projects');
  };

  const handleInviteMemberAI = (memberData: any) => {
    handleSaveMember({
        ...memberData,
        bio: 'Invited via AI Assistant'
    });
    setActivePage('team');
  };

  // New Handlers for "Everything Tool" and Knowledge Query
  const handleQueryKnowledge = async (query: string): Promise<string> => {
     setCustomToolToast({ name: 'queryKnowledgeBase', args: { query } });
     
     // Simulate processing delay
     await new Promise(resolve => setTimeout(resolve, 800));

     const q = query.toLowerCase();
     
     // Simulated Database Responses
     if (q.includes('revenue') || q.includes('finance') || q.includes('money')) {
         return "The current total revenue is $124,500, which is a 12% increase compared to last month.";
     }
     if (q.includes('project') || q.includes('status')) {
         const summary = projects.map(p => `${p.name} (${p.status})`).join(', ');
         return `Here is the current status of all projects: ${summary}`;
     }
     if (q.includes('team') || q.includes('who') || q.includes('role')) {
         const names = team.map(t => `${t.name} is the ${t.role}`).join('. ');
         return `The team composition is as follows: ${names}`;
     }
     
     return "I checked the internal knowledge base, but I couldn't find specific data for that query. However, standard operating procedures suggest proceeding with the current workflow.";
  };

  const handleScaffold = (goal: string) => {
      setCustomToolToast({ name: 'scaffoldWorkspace', args: { goal } });
      
      // 1. Create a Project based on goal
      const projectName = goal.length > 20 ? goal.substring(0, 20) + "..." : goal;
      handleSaveProject({
          name: projectName,
          status: 'Planning',
          description: `Auto-generated project to achieve goal: ${goal}`,
          date: 'Just now'
      });

      // 2. Add a Specialist Team Member
      handleSaveMember({
          name: 'Alex AI',
          role: 'Automation Specialist',
          email: 'alex.ai@acme.com',
          bio: `Joined automatically to assist with: ${goal}`,
          initial: 'A'
      });

      // 3. Navigate to show the user what happened
      setActivePage('projects');
  };

  const NavLink = ({ page, label }: { page: string, label: string }) => (
    <span 
      onClick={() => setActivePage(page)}
      className={`cursor-pointer transition-colors ${activePage === page ? 'text-gray-900 font-semibold' : 'hover:text-gray-900'}`}
    >
      {label}
    </span>
  );

  const runtimeConfig: AssistantConfig = {
      ...config,
      systemInstruction: `${config.systemInstruction} The user is currently on the "${activePage}" page. You can create projects or invite members if asked.`
  };

  const renderContent = () => {
    switch (activePage) {
      case 'history':
        return (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Conversation History</h2>
                  <p className="text-gray-500 mt-1">Review past sessions, transcripts, and summaries.</p>
                </div>
             </div>
             
             {sessions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                   <p className="text-gray-400">No session history found.</p>
                </div>
             ) : (
                <div className="space-y-6">
                   {sessions.map((session, idx) => (
                      <div key={session.id || idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                             <div className="flex items-center gap-4">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                                  {new Date(session.date).toLocaleDateString()}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {new Date(session.date).toLocaleTimeString()} • {session.duration}s duration
                                </span>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => setViewingSession(session)}
                                  className="text-xs font-medium text-gray-700 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                  View Transcript
                                </button>
                                <button 
                                  onClick={() => {
                                      const md = `# Session Transcript - ${new Date(session.date).toLocaleString()}\n\n${session.summary ? `## Summary\n${session.summary}\n\n` : ''}## Transcript\n${session.transcript.map(t => `**${t.role.toUpperCase()}**: ${t.text}`).join('\n\n')}`;
                                      copyToClipboard(md);
                                  }}
                                  className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Copy Markdown
                                </button>
                                <button 
                                  onClick={() => generateSummary(session)}
                                  disabled={!!session.summary || summaryLoading === session.id}
                                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1
                                    ${session.summary 
                                        ? 'bg-green-50 text-green-700 border border-green-200' 
                                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                                    }`}
                                >
                                  {summaryLoading === session.id ? (
                                     <>Processing...</>
                                  ) : session.summary ? (
                                     <>✓ Summary Generated</>
                                  ) : (
                                     <>+ Generate Summary</>
                                  )}
                                </button>
                             </div>
                          </div>
                          
                          {/* Preview content */}
                          <div className="p-6">
                             {session.summary ? (
                               <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 text-sm text-gray-800 leading-relaxed">
                                  <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                                    <SparkleIcon className="w-4 h-4" /> AI Summary
                                  </h4>
                                  <div className="prose prose-sm prose-amber max-w-none whitespace-pre-wrap line-clamp-3">
                                    {session.summary}
                                  </div>
                               </div>
                             ) : (
                               <div className="text-sm text-gray-500 italic">
                                 {session.transcript.length > 0 
                                    ? `Preview: "${session.transcript[0].text.substring(0, 100)}..."`
                                    : 'No messages recorded.'}
                               </div>
                             )}
                          </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        );
      case 'projects':
        return (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
                <p className="text-gray-500 mt-1">Manage your ongoing initiatives.</p>
              </div>
              <button 
                onClick={() => openProjectModal(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
              >
                + New Project
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => openProjectModal(project)}>
                        {project.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                          ${project.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 
                            project.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{project.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openProjectModal(project)}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'team':
        return (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
                <p className="text-gray-500 mt-1">Manage permissions and roles.</p>
              </div>
              <button 
                onClick={() => openMemberModal(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
              >
                Invite Member
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member) => (
                <div key={member.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer" onClick={() => openMemberModal(member)}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xl font-bold mb-4 shadow-sm group-hover:scale-110 transition-transform duration-200">
                    {member.initial}
                  </div>
                  <h3 className="font-medium text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{member.role}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openMemberModal(member); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-100 rounded-full px-4 py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'settings':
        return (
           <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Name</label>
                  <input type="text" defaultValue="Acme Corp Design" className="w-full rounded-lg border-gray-300 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                  <select className="w-full rounded-lg border-gray-300 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>GBP (£)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Notifications</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                       <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                       <span className="text-sm text-gray-600">Receive daily summaries</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                       <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                       <span className="text-sm text-gray-600">Receive security alerts</span>
                    </label>
                  </div>
               </div>
               <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm hover:shadow transition-all">Save Changes</button>
               </div>
            </div>
           </div>
        );
      case 'dashboard':
      default:
        return (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
              <div className="flex justify-between items-end mb-8">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}</h2>
                    <p className="text-gray-500 mt-1">Here is what's happening with your projects today.</p>
                 </div>
                 <div className="text-sm text-gray-400">Last updated: Just now</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-gray-500 mb-2 font-medium">Total Revenue</div>
                    <div className="text-3xl font-bold text-gray-900">$124,500</div>
                    <div className="text-xs text-green-600 mt-3 flex items-center gap-1 font-medium bg-green-50 w-fit px-2 py-1 rounded">
                      <span>↑ 12%</span>
                      <span className="text-green-700/60 font-normal">vs last month</span>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-gray-500 mb-2 font-medium">Active Projects</div>
                    <div className="text-3xl font-bold text-gray-900">{projects.length}</div>
                    <div className="text-xs text-blue-600 mt-3 flex items-center gap-1 font-medium bg-blue-50 w-fit px-2 py-1 rounded">
                      <span>2 new</span>
                      <span className="text-blue-700/60 font-normal">this week</span>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-gray-500 mb-2 font-medium">Team Members</div>
                    <div className="text-3xl font-bold text-gray-900">{team.length}</div>
                    <div className="text-xs text-gray-600 mt-3 flex items-center gap-1 font-medium bg-gray-50 w-fit px-2 py-1 rounded">
                      <span>All active</span>
                    </div>
                 </div>
              </div>

              <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-2xl border border-blue-100 shadow-sm p-8 min-h-[300px] flex flex-col items-center justify-center text-center space-y-6">
                 <div className="relative">
                    <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 rounded-full"></div>
                    <div className="relative w-16 h-16 bg-white text-blue-500 rounded-2xl shadow-sm border border-blue-50 flex items-center justify-center">
                        <SparkleIcon className="w-8 h-8" />
                    </div>
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Stuck on a task?</h3>
                     <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                       Click the "Ask {config.name}" button in the top right corner to get real-time, voice-guided assistance. {config.name} can see your screen and guide you through any complex workflow.
                     </p>
                 </div>
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="px-8 py-3 bg-white border border-gray-200 text-gray-800 font-medium rounded-full hover:bg-white hover:border-blue-300 hover:shadow-md hover:text-blue-600 transition-all duration-200 group flex items-center gap-2"
                 >
                   <span>Try {config.name} now</span>
                   <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                 </button>
              </div>
           </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      
      {/* LEFT PANEL: The Builder / Configurator */}
      <aside className="hidden md:flex w-80 lg:w-96 bg-white border-r border-gray-200 p-6 lg:p-8 flex-col shadow-sm z-10 overflow-y-auto shrink-0 h-screen sticky top-0 custom-scrollbar">
        <div className="flex items-center gap-3 mb-8 text-blue-600">
           <div className="p-2 bg-blue-50 rounded-lg">
             <SparkleIcon className="w-5 h-5" />
           </div>
           <h1 className="text-lg font-bold tracking-tight text-gray-900">Live Assistant Builder</h1>
        </div>

        <div className="space-y-6 flex-1">
          <div className="group">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Assistant Name</label>
            <input 
              type="text" 
              value={config.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
              placeholder="e.g. Kämelia"
            />
          </div>

          <div className="group">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Company Name</label>
            <input 
              type="text" 
              value={config.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div className="group">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">System Instruction</label>
            <textarea 
              value={config.systemInstruction}
              onChange={(e) => handleChange('systemInstruction', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all h-32 resize-none text-sm leading-relaxed"
              placeholder="Describe how the assistant should behave..."
            />
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              The assistant will automatically have access to audio and screen inputs via the Live API.
            </p>
          </div>
          
          <div className="group">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Custom Tools</label>
                <button onClick={() => openToolModal(null)} className="text-xs text-blue-600 font-medium hover:underline">+ New Tool</button>
            </div>
            
            <div className="space-y-2">
                {(config.customTools || []).map(tool => (
                    <div key={tool.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 group/tool hover:border-blue-200 transition-colors relative">
                        <div className="flex justify-between items-start">
                            <span className="font-mono text-sm font-semibold text-gray-800">{tool.name}</span>
                            <div className="flex gap-2 opacity-0 group-hover/tool:opacity-100 transition-opacity">
                                <button onClick={() => openToolModal(tool)} className="text-xs text-blue-600 hover:underline">Edit</button>
                                <button onClick={() => handleDeleteTool(tool.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {tool.parameters.map((p, i) => (
                                <span key={i} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
                {(config.customTools || []).length === 0 && (
                    <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                        No custom tools defined.
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-medium pt-2">
             <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' : saveStatus === 'saving' ? 'bg-yellow-500' : 'bg-red-500'}`} />
             <span className="text-gray-500">
               {saveStatus === 'saved' ? 'Changes saved' : saveStatus === 'saving' ? 'Saving...' : 'Error saving'}
             </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-4">
             <p className="text-sm text-blue-900 font-semibold mb-1">Preview Mode</p>
             <p className="text-xs text-blue-700/80 leading-relaxed">
               Click the button in the main view to test your assistant configuration live.
             </p>
          </div>
          <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-semibold">
            Powered by Google Gemini Live API
          </p>
        </div>
      </aside>

      {/* RIGHT PANEL: The SaaS App Simulation */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden bg-gray-50/50">
        
        {/* Custom Tool Execution Notification */}
        {customToolToast && (
          <div className="absolute top-20 right-8 z-[100] bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-right-10 fade-in border border-gray-700 max-w-sm">
             <div className="flex items-start gap-3">
               <div className="p-1 bg-green-500/20 rounded text-green-400 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="20 6 9 17 4 12"></polyline></svg>
               </div>
               <div>
                  <h4 className="font-bold text-sm">Tool Executed: {customToolToast.name}</h4>
                  <pre className="text-xs text-gray-400 mt-1 font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(customToolToast.args, null, 2)}
                  </pre>
               </div>
             </div>
          </div>
        )}

        {/* Mock SaaS Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 shrink-0">
            <div className="flex items-center gap-4 md:gap-8">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                   {config.companyName.substring(0,2).toUpperCase()}
                 </div>
                 <span className="font-semibold text-gray-900 hidden sm:block">{config.companyName}</span>
               </div>
               <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-500">
                  <NavLink page="dashboard" label="Dashboard" />
                  <NavLink page="projects" label="Projects" />
                  <NavLink page="team" label="Team" />
                  <NavLink page="history" label="History" />
                  <NavLink page="settings" label="Settings" />
               </nav>
            </div>
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-400 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 group"
               >
                 <SparkleIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                 <span>Ask {config.name}</span>
               </button>
               
               <div 
                 className="flex items-center gap-3 cursor-pointer p-1.5 pr-4 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 group"
                 onClick={() => setIsProfileOpen(true)}
               >
                  <div className="w-9 h-9 bg-gray-200 rounded-full border-2 border-white shadow-sm overflow-hidden group-hover:shadow-md transition-shadow">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`} alt="User" className="w-full h-full" />
                  </div>
                  <div className="hidden md:block text-left">
                     <div className="text-xs font-bold text-gray-900">{user.name}</div>
                     <div className="text-[10px] text-gray-500 font-medium">{user.role}</div>
                  </div>
               </div>
            </div>
        </header>

        {/* Mock SaaS Content */}
        <div className="flex-1 p-6 md:p-8 overflow-auto">
           {renderContent()}
        </div>

        {/* THE ASSISTANT MODAL (NOW FLOATING WIDGET CAPABLE) */}
        <AssistantModal 
          config={runtimeConfig} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onNavigate={(page) => setActivePage(page)}
          onCreateProject={handleCreateProjectAI}
          onInviteMember={handleInviteMemberAI}
          onSessionEnd={handleSessionEnd}
          // Pass the generic tool handler that updates toast state
          onCustomToolCall={(name, args) => setCustomToolToast({name, args})}
          onQueryKnowledge={handleQueryKnowledge}
          onScaffold={handleScaffold}
        />
        
        {/* DETAIL MODALS */}
        <ProjectModal 
          isOpen={activeModal === 'project'} 
          project={selectedItem}
          onClose={closeModal}
          onSave={handleSaveProject}
        />
        <MemberModal 
          isOpen={activeModal === 'member'} 
          member={selectedItem}
          onClose={closeModal}
          onSave={handleSaveMember}
        />

        {/* TOOL EDITOR MODAL */}
        <ToolEditorModal 
          isOpen={activeModal === 'tool'}
          tool={selectedItem}
          onClose={closeModal}
          onSave={handleSaveTool}
        />

        {/* USER PROFILE MODAL */}
        <UserProfileModal 
          isOpen={isProfileOpen}
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onSave={setUser}
        />

        {/* SESSION SAVE PROMPT */}
        <SaveSessionPrompt 
          data={pendingSession ? { duration: pendingSession.duration, transcriptCount: pendingSession.transcript.length } : null}
          onConfirm={confirmSaveSession}
          onCancel={discardSession}
        />

        {/* TRANSCRIPT VIEWER */}
        <TranscriptViewerModal 
          session={viewingSession}
          onClose={() => setViewingSession(null)}
        />

      </main>
    </div>
  );
};

export default App;