import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Mail, 
  Phone, 
  Camera, 
  Check, 
  ChevronRight, 
  // Added ArrowRight to imports to fix the reference error
  ArrowRight,
  Smartphone, 
  Globe, 
  Lock, 
  Eye, 
  EyeOff,
  Save,
  Clock,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance';

export const UserSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Simulated User Data
  const [userData, setUserData] = useState({
    name: 'Sarah Jenkins',
    email: 's.jenkins@gndmillwork.com',
    role: 'Senior Admin',
    office: 'miami',
    phone: '(305) 555-0192',
    bio: 'Overseeing Florida operations and financial reconciliation since 2021.'
  });

  // User-specific Notification Preferences
  const [notifs, setNotifs] = useState({
    jobs: { email: true, push: true, sms: false },
    finance: { email: true, push: true, sms: true },
    system: { email: false, push: true, sms: false },
    mentions: { email: true, push: true, sms: true }
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const toggleNotif = (category: keyof typeof notifs, channel: 'email' | 'push' | 'sms') => {
    setNotifs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: !prev[category][channel]
      }
    }));
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="px-6 py-6 border-b border-border bg-card shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">User Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account details and personal preferences.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isSaving ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-64 border-r border-border bg-card/30 overflow-y-auto hidden md:block">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Settings Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-3xl mx-auto space-y-10">
            
            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-muted p-1 rounded-xl mb-8 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section>
                  <h3 className="text-lg font-black text-foreground mb-6">Personal Information</h3>
                  <div className="flex flex-col sm:flex-row gap-8 items-start">
                    <div className="relative group">
                      <div className="size-24 rounded-3xl bg-muted border-2 border-border overflow-hidden ring-4 ring-background shadow-lg">
                        <img src="https://picsum.photos/id/64/200/200" alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <button className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg border-2 border-background hover:scale-110 transition-transform">
                        <Camera size={16} />
                      </button>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                        <input 
                          type="text" 
                          value={userData.name}
                          onChange={(e) => setUserData({...userData, name: e.target.value})}
                          className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
                        <input 
                          type="email" 
                          value={userData.email}
                          onChange={(e) => setUserData({...userData, email: e.target.value})}
                          className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Phone Number</label>
                        <input 
                          type="text" 
                          value={userData.phone}
                          onChange={(e) => setUserData({...userData, phone: e.target.value})}
                          className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Office Location</label>
                        <select 
                          value={userData.office}
                          onChange={(e) => setUserData({...userData, office: e.target.value})}
                          className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        >
                          <option value="miami">Miami HQ</option>
                          <option value="lake wales">Lake Wales</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-border w-full" />

                <section>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Bio</h3>
                  <textarea 
                    value={userData.bio}
                    onChange={(e) => setUserData({...userData, bio: e.target.value})}
                    className="w-full p-4 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[120px] resize-none"
                    placeholder="Tell us about your role..."
                  />
                </section>
              </div>
            )}

            {/* Tab: Security */}
            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="space-y-6">
                  <h3 className="text-lg font-black text-foreground">Password & Security</h3>
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Current Password</label>
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                            placeholder="••••••••"
                          />
                          <button 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-muted-foreground uppercase">New Password</label>
                          <input type="password" placeholder="New password" className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-muted-foreground uppercase">Confirm New Password</label>
                          <input type="password" placeholder="Confirm" className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                      </div>
                    </div>
                    <button className="px-5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors">
                      Update Password
                    </button>
                  </div>
                </section>

                <section className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                      <Lock size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100">Two-Factor Authentication</h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                        Add an extra layer of security to your account by requiring more than just a password to log in.
                      </p>
                      <button className="mt-4 flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300 hover:underline">
                        Configure 2FA <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-200/50 dark:bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-200">Active</span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Tab: Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-foreground">Delivery Preferences</h3>
                    <button className="text-xs font-bold text-primary hover:underline">Reset to Default</button>
                  </div>
                  
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Notification Type</th>
                          <th className="px-4 py-4 text-center text-xs font-black uppercase text-muted-foreground"><Mail size={16} className="mx-auto" /></th>
                          <th className="px-4 py-4 text-center text-xs font-black uppercase text-muted-foreground"><Smartphone size={16} className="mx-auto" /></th>
                          <th className="px-4 py-4 text-center text-xs font-black uppercase text-muted-foreground"><Globe size={16} className="mx-auto" /></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          { id: 'jobs', label: 'New Jobs & Assignments', category: 'Jobs' },
                          { id: 'finance', label: 'Financial Approvals', category: 'Finance' },
                          { id: 'system', label: 'System Alerts & Updates', category: 'System' },
                          { id: 'mentions', label: 'Mentions & Messages', category: 'Social' }
                        ].map((item) => (
                          <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-5">
                              <p className="text-sm font-bold text-foreground">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{item.category}</p>
                            </td>
                            <td className="px-4 py-5 text-center">
                              <Switch 
                                checked={notifs[item.id as keyof typeof notifs].email} 
                                onChange={() => toggleNotif(item.id as any, 'email')} 
                              />
                            </td>
                            <td className="px-4 py-5 text-center">
                              <Switch 
                                checked={notifs[item.id as keyof typeof notifs].sms} 
                                onChange={() => toggleNotif(item.id as any, 'sms')} 
                              />
                            </td>
                            <td className="px-4 py-5 text-center">
                              <Switch 
                                checked={notifs[item.id as keyof typeof notifs].push} 
                                onChange={() => toggleNotif(item.id as any, 'push')} 
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="p-4 bg-muted/30 rounded-xl border border-border flex items-start gap-3">
                  <Bell className="text-primary mt-0.5 shrink-0" size={18} />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Personal notification settings only affect your account. Critical security alerts and system downtime notifications will always be sent via email.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section>
                  <h3 className="text-lg font-black text-foreground mb-6">Theme Interface</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-primary bg-background shadow-lg shadow-primary/5 transition-all text-left">
                      <div className="w-full aspect-video bg-slate-100 rounded-lg border border-border overflow-hidden p-2">
                        <div className="w-full h-1.5 bg-primary/20 rounded mb-1" />
                        <div className="w-2/3 h-1.5 bg-slate-300 rounded mb-3" />
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 bg-white rounded border border-border" />
                          <div className="h-8 bg-white rounded border border-border" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">Light Mode</span>
                        <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                          <Check size={12} className="text-white" strokeWidth={4} />
                        </div>
                      </div>
                    </button>
                    <button className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/50 transition-all text-left group">
                      <div className="w-full aspect-video bg-slate-900 rounded-lg border border-slate-800 overflow-hidden p-2">
                        <div className="w-full h-1.5 bg-primary/20 rounded mb-1" />
                        <div className="w-2/3 h-1.5 bg-slate-700 rounded mb-3" />
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 bg-slate-800 rounded border border-slate-700" />
                          <div className="h-8 bg-slate-800 rounded border border-slate-700" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">Dark Mode</span>
                        <Moon size={16} className="text-muted-foreground group-hover:text-foreground" />
                      </div>
                    </button>
                    <button className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/50 transition-all text-left group">
                      <div className="w-full aspect-video bg-gradient-to-br from-slate-100 to-slate-900 rounded-lg border border-border overflow-hidden p-2">
                        <div className="w-full h-1.5 bg-primary/20 rounded mb-1" />
                        <div className="w-2/3 h-1.5 bg-slate-400 rounded mb-3" />
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 bg-slate-200 rounded border border-border" />
                          <div className="h-8 bg-slate-700 rounded border border-slate-600" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">System Default</span>
                        <Monitor size={16} className="text-muted-foreground group-hover:text-foreground" />
                      </div>
                    </button>
                  </div>
                </section>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

// Helper Components
const Switch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button 
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-muted'}`}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);