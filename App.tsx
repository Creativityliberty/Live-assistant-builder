import React, { useState } from 'react';
import AssistantModal from './components/AssistantModal';
import { AssistantConfig } from './types';
import { SparkleIcon } from './components/Icons';

// Default config updated to Kämelia
const DEFAULT_CONFIG: AssistantConfig = {
  name: 'Kämelia',
  companyName: 'Acme Corp',
  primaryColor: '#3b82f6',
  systemInstruction: 'You are Kämelia, an expert guide for Acme Corp. Help the user navigate the platform by looking at their screen and providing clear, encouraging verbal instructions. Be concise and friendly.',
};

// Mock Data
const PROJECTS = [
  { id: 1, name: 'Website Redesign', status: 'In Progress', date: '2 days ago' },
  { id: 2, name: 'Mobile App Launch', status: 'Completed', date: '1 week ago' },
  { id: 3, name: 'Q3 Marketing Campaign', status: 'Planning', date: 'Just now' },
  { id: 4, name: 'Customer Portal', status: 'In Progress', date: '3 days ago' },
];

const TEAM = [
  { id: 1, name: 'Sarah Wilson', role: 'Product Manager', initial: 'S' },
  { id: 2, name: 'Mike Chen', role: 'Lead Developer', initial: 'M' },
  { id: 3, name: 'Jessica Lee', role: 'Designer', initial: 'J' },
  { id: 4, name: 'Tom Brown', role: 'Marketing', initial: 'T' },
];

const App: React.FC = () => {
  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_CONFIG);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');

  const handleChange = (field: keyof AssistantConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const NavLink = ({ page, label }: { page: string, label: string }) => (
    <span 
      onClick={() => setActivePage(page)}
      className={`cursor-pointer transition-colors ${activePage === page ? 'text-gray-900 font-semibold' : 'hover:text-gray-900'}`}
    >
      {label}
    </span>
  );

  // Derive runtime config that includes context about the current page state
  const runtimeConfig: AssistantConfig = {
      ...config,
      systemInstruction: `${config.systemInstruction} The user is currently on the "${activePage}" page.`
  };

  const renderContent = () => {
    switch (activePage) {
      case 'projects':
        return (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
                <p className="text-gray-500 mt-1">Manage your ongoing initiatives.</p>
              </div>
              <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
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
                  {PROJECTS.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{project.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                          ${project.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 
                            project.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{project.date}</td>
                      <td className="px-6 py-4 text-right text-blue-600 hover:text-blue-800 cursor-pointer font-medium">Edit</td>
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
              <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                Invite Member
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TEAM.map((member) => (
                <div key={member.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xl font-bold mb-4 shadow-sm group-hover:scale-105 transition-transform">
                    {member.initial}
                  </div>
                  <h3 className="font-medium text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{member.role}</p>
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-100 rounded-full px-4 py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors">View Profile</button>
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
                    <h2 className="text-2xl font-bold text-gray-900">Welcome back, User</h2>
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
                    <div className="text-3xl font-bold text-gray-900">12</div>
                    <div className="text-xs text-blue-600 mt-3 flex items-center gap-1 font-medium bg-blue-50 w-fit px-2 py-1 rounded">
                      <span>2 new</span>
                      <span className="text-blue-700/60 font-normal">this week</span>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-gray-500 mb-2 font-medium">Team Members</div>
                    <div className="text-3xl font-bold text-gray-900">8</div>
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
      <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 p-6 lg:p-8 flex flex-col shadow-sm z-10 overflow-y-auto shrink-0 h-screen sticky top-0">
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
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all h-48 resize-none text-sm leading-relaxed"
              placeholder="Describe how the assistant should behave..."
            />
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              The assistant will automatically have access to audio and screen inputs via the Live API.
            </p>
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
        {/* Mock SaaS Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
            <div className="flex items-center gap-8">
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
               <div className="w-9 h-9 bg-gray-200 rounded-full border-2 border-white shadow-sm overflow-hidden">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full" />
               </div>
            </div>
        </header>

        {/* Mock SaaS Content */}
        <div className="flex-1 p-8 overflow-auto">
           {renderContent()}
        </div>

        {/* THE MODAL */}
        <AssistantModal 
          config={runtimeConfig} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onNavigate={(page) => setActivePage(page)}
        />
      </main>
    </div>
  );
};

export default App;