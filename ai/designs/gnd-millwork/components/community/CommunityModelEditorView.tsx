
import React, { useState } from 'react';
import { 
  Save, 
  History, 
  Download, 
  Eye, 
  ChevronLeft, 
  DoorOpen, 
  LayoutTemplate, 
  Lock, 
  VenetianMask,
  MoreHorizontal,
  Settings,
  DollarSign,
  Tag,
  ChevronDown,
  X,
  RotateCcw,
  Check,
  User,
  Clock
} from 'lucide-react';
import { CommunityInstallCostView } from './CommunityInstallCostView';

interface CommunityModelEditorViewProps {
  onBack?: () => void;
}

export const CommunityModelEditorView: React.FC<CommunityModelEditorViewProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'editor' | 'install-cost'>('editor');
  const [activeTab, setActiveTab] = useState('exterior');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [version, setVersion] = useState<'v1' | 'v2'>('v2');
  const [isVersionSelectOpen, setIsVersionSelectOpen] = useState(false);
  const [isHeaderVersionOpen, setIsHeaderVersionOpen] = useState(false);

  const tabs = [
    { id: 'exterior', label: 'Exterior Door', icon: DoorOpen },
    { id: 'interior', label: 'Interior Trim', icon: LayoutTemplate },
    { id: 'lock', label: 'Lock & Hardware', icon: Lock },
    { id: 'deco', label: 'Deco Shutters', icon: VenetianMask },
  ];

  const historyItems = [
    { id: 1, action: 'Updated Garage Door Specs', user: 'Alex M.', time: '2 mins ago', details: 'Changed height to 7ft', current: true },
    { id: 2, action: 'Bulk Edit Interior Trim', user: 'Sarah J.', time: '1 hour ago', details: 'Applied "Modern" preset', current: false },
    { id: 3, action: 'Entry Door Modification', user: 'Mike R.', time: '3 hours ago', details: 'Changed material to Fiberglass', current: false },
    { id: 4, action: 'Version Bump v1 -> v2', user: 'System', time: 'Yesterday', details: 'Automated migration', current: false },
    { id: 5, action: 'Initial Setup', user: 'Admin', time: '2 days ago', details: 'Project created', current: false },
  ];

  const toggleVersion = (ver: 'v1' | 'v2') => {
    setVersion(ver);
    setIsVersionSelectOpen(false);
    setIsSettingsOpen(false);
    setIsHeaderVersionOpen(false);
  };

  if (viewMode === 'install-cost') {
    return <CommunityInstallCostView onBack={() => setViewMode('editor')} />;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 relative">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Edit Community Model</h1>
                
                {/* Header Version Switcher */}
                <div className="relative">
                    <button 
                        onClick={() => setIsHeaderVersionOpen(!isHeaderVersionOpen)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${version === 'v2' ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'}`}
                    >
                        {version === 'v2' ? 'V2 Draft' : 'V1 Legacy'}
                        <ChevronDown size={10} className="opacity-70" />
                    </button>

                    {isHeaderVersionOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsHeaderVersionOpen(false)} />
                            <div className="absolute top-full left-0 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={() => toggleVersion('v2')}
                                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-muted transition-colors flex items-center justify-between ${version === 'v2' ? 'text-primary bg-primary/5' : 'text-foreground'}`}
                                >
                                    V2 Draft
                                    {version === 'v2' && <Check size={12} />}
                                </button>
                                <button 
                                    onClick={() => toggleVersion('v1')}
                                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-muted transition-colors flex items-center justify-between ${version === 'v1' ? 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' : 'text-foreground'}`}
                                >
                                    V1 Legacy
                                    {version === 'v1' && <Check size={12} />}
                                </button>
                            </div>
                        </>
                    )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">N50C MONTAUK/TF/L</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Button & Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`flex items-center justify-center w-10 h-9 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${isSettingsOpen ? 'bg-muted text-foreground ring-2 ring-primary/20 border-primary/50' : ''}`}
                >
                    <Settings size={18} />
                </button>
                {isSettingsOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 z-50 w-72 border border-border bg-card p-4 text-popover-foreground shadow-xl rounded-lg outline-none animate-in fade-in zoom-in-95 duration-200">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="leading-none font-medium text-foreground">Configuration</h4>
                                    <p className="text-muted-foreground text-sm">Set model configuration</p>
                                </div>
                                <div className="flex flex-col gap-3 relative">
                                    <label className="text-sm font-medium leading-none text-foreground">Template Version</label>
                                    <button 
                                    type="button" 
                                    onClick={() => setIsVersionSelectOpen(!isVersionSelectOpen)}
                                    className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-border bg-transparent px-3 py-2 text-sm font-normal text-foreground shadow-sm hover:bg-muted/50 transition-colors"
                                    >
                                        <span className="block truncate">{version === 'v2' ? 'V2 Draft (Current)' : 'V1 Legacy (Read-only)'}</span>
                                        <ChevronDown size={14} className="opacity-50" />
                                    </button>
                                    
                                    {isVersionSelectOpen && (
                                    <div className="absolute top-[60px] left-0 right-0 bg-popover border border-border rounded-md shadow-md z-50 py-1">
                                        <button 
                                        onClick={() => toggleVersion('v2')}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                                        >
                                        <span>V2 Draft</span>
                                        {version === 'v2' && <Check size={14} className="text-primary" />}
                                        </button>
                                        <button 
                                        onClick={() => toggleVersion('v1')}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                                        >
                                        <span>V1 Legacy</span>
                                        {version === 'v1' && <Check size={14} className="text-primary" />}
                                        </button>
                                    </div>
                                    )}
                                </div>
                                
                                <div className="h-px bg-border -mx-4" />
                                
                                <div className="flex flex-col gap-1">
                                    <button 
                                        onClick={() => { setViewMode('install-cost'); setIsSettingsOpen(false); }}
                                        className="flex items-center gap-2 w-full px-2 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors text-left text-foreground"
                                    >
                                        <DollarSign size={16} className="text-muted-foreground" />
                                        Install Cost
                                    </button>
                                    <button className="flex items-center gap-2 w-full px-2 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors text-left text-foreground">
                                        <Tag size={16} className="text-muted-foreground" />
                                        Model Cost
                                    </button>
                                    <button className="flex items-center gap-2 w-full px-2 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors text-left text-foreground">
                                        <Eye size={16} className="text-muted-foreground" />
                                        Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <button className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              <Eye size={16} />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors ${isHistoryOpen ? 'bg-muted ring-2 ring-primary/10' : ''}`}
            >
              <History size={16} />
              <span className="hidden sm:inline">History</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              <Download size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 shadow-sm transition-colors">
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/20'}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {version === 'v1' && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <History className="text-amber-600 dark:text-amber-400 mt-0.5" size={18} />
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Viewing Legacy V1 Template</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  You are viewing an older version of this model configuration. Some fields may be read-only or deprecated. 
                  Switch to V2 Draft in Settings to edit using the latest standards.
                </p>
              </div>
            </div>
          )}

          {/* Exterior Door Tab */}
          {activeTab === 'exterior' && (
            <section className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${version === 'v1' ? 'opacity-90 grayscale-[0.5]' : ''}`}>
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                  <h3 className="font-bold text-foreground">Exterior Door Configuration {version === 'v1' && '(Legacy)'}</h3>
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Material */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Material</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.material" 
                      placeholder="e.g. FIBERGLASS" 
                      defaultValue={version === 'v1' ? 'WOOD - OAK' : ''}
                      disabled={version === 'v1'}
                    />
                  </div>
                  
                  {/* Layer */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Layer</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.layer" 
                      disabled={version === 'v1'}
                    />
                  </div>

                  {/* Bore */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Bore</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.bore" 
                      disabled={version === 'v1'}
                    />
                  </div>

                  {/* 6/8 */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">6/8 Height</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.sixEight" 
                      placeholder="Qty / Spec"
                      disabled={version === 'v1'}
                    />
                  </div>

                  {/* 8/0 */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">8/0 Height</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.eightZero" 
                      placeholder="Qty / Spec"
                      disabled={version === 'v1'}
                    />
                  </div>

                  {/* Handle */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Handle</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.orientation" 
                      disabled={version === 'v1'}
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Type</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.others" 
                      disabled={version === 'v1'}
                    />
                  </div>

                  {/* Side Door */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Side Door</label>
                    <input 
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" 
                      name="entry.sideDoor" 
                      disabled={version === 'v1'}
                    />
                  </div>
                </div>
            </section>
          )}

          {/* Interior Trim Tab */}
          {activeTab === 'interior' && (
            <>
              {/* Garage Door Section */}
              <section className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${version === 'v1' ? 'opacity-90' : ''}`}>
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                  <h3 className="font-bold text-foreground">Garage Door</h3>
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Type</label>
                    <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" placeholder="e.g. ROLL-UP" disabled={version === 'v1'} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Material</label>
                    <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" placeholder="e.g. STEEL" disabled={version === 'v1'} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Garage PH</label>
                    <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" disabled={version === 'v1'} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Single</label>
                    <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" disabled={version === 'v1'} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Frame</label>
                    <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" disabled={version === 'v1'} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Bore</label>
                    <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all uppercase text-sm" disabled={version === 'v1'} />
                  </div>
                  
                  {/* Divider for Sizes */}
                  <div className="col-span-full h-px bg-border my-2"></div>
                  
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 bg-muted/10 rounded-lg border border-border/50">
                        <h4 className="text-sm font-semibold">Primary Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Size</label>
                                <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm" disabled={version === 'v1'} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Height</label>
                                <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm" disabled={version === 'v1'} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Handle</label>
                                <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm" disabled={version === 'v1'} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 p-4 bg-muted/10 rounded-lg border border-border/50">
                        <h4 className="text-sm font-semibold">Secondary Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Size</label>
                                <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm" disabled={version === 'v1'} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Height</label>
                                <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm" disabled={version === 'v1'} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Handle</label>
                                <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm" disabled={version === 'v1'} />
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Additional Interior Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Double Doors */}
                 <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                        <h3 className="font-bold text-foreground">Double Door</h3>
                    </div>
                    <div className="p-6 space-y-6 flex-1">
                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Size</th>
                                        <th className="px-4 py-3 text-center border-l border-border w-20">LH</th>
                                        <th className="px-4 py-3 text-center border-l border-border w-20">RH</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {['6/0', '5/8', '5/4', '5/0', '4/0'].map((size) => (
                                        <tr key={size}>
                                            <td className="px-4 py-2 font-medium">{size}</td>
                                            <td className="px-2 py-2 border-l border-border"><input className="w-full text-center h-8 rounded border-input border bg-transparent" placeholder="-" disabled={version === 'v1'} /></td>
                                            <td className="px-2 py-2 border-l border-border"><input className="w-full text-center h-8 rounded border-input border bg-transparent" placeholder="-" disabled={version === 'v1'} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
                
                {/* Bifold Doors */}
                <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                        <h3 className="font-bold text-foreground">Bifold Door</h3>
                    </div>
                    <div className="p-6 space-y-6 flex-1">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Style</label>
                            <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none text-sm" disabled={version === 'v1'} />
                        </div>
                        {/* Bifold Table (Simplified) */}
                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Size</th>
                                        <th className="px-4 py-3 text-center border-l border-border w-24">Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {['4/0', '5/0', '6/0'].map((size) => (
                                        <tr key={size}>
                                            <td className="px-4 py-2 font-medium">{size}</td>
                                            <td className="px-2 py-2 border-l border-border"><input className="w-full text-center h-8 rounded border-input border bg-transparent" placeholder="-" disabled={version === 'v1'} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
              </div>
            </>
          )}

          {/* Lock & Hardware Tab */}
          {activeTab === 'lock' && (
            <section className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${version === 'v1' ? 'opacity-90' : ''}`}>
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                  <h3 className="font-bold text-foreground">Lock & Hardware</h3>
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Hardware Fields */}
                   <div className="md:col-span-2 space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Brand</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.brand" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Handle Set</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.handleSet" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Door Stop</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.doorStop" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Dummy</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.dummy" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Door Viewer</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.doorViewer" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Deadbolt</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.deadbolt" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">W. Stripper</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.wStripper" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Passage</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.passage" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Hinges</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.hinges" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Privacy</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.privacy" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Hook & Aye</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="lockHardware.hookAye" disabled={version === 'v1'} />
                   </div>
                </div>
            </section>
          )}

          {/* Deco Shutters Tab */}
          {activeTab === 'deco' && (
            <section className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${version === 'v1' ? 'opacity-90' : ''}`}>
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                  <h3 className="font-bold text-foreground">Deco Shutters</h3>
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2 space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Model</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="decoShutters.model" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Size 1</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="decoShutters.size1" disabled={version === 'v1'} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Size 2</label>
                     <input className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all uppercase text-sm" name="decoShutters.size2" disabled={version === 'v1'} />
                   </div>
                </div>
            </section>
          )}

          {/* Placeholder for other tabs */}
          {(activeTab !== 'exterior' && activeTab !== 'interior' && activeTab !== 'lock' && activeTab !== 'deco') && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
              <p className="font-semibold">Tab content not implemented in this preview.</p>
              <div className="flex gap-4 mt-4">
                <button onClick={() => setActiveTab('exterior')} className="text-primary hover:underline text-sm font-bold">
                  Go to Exterior Door
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* History Sidebar Overlay */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsHistoryOpen(false)}
          />
          <div className="relative w-full max-w-md bg-card h-full shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-border flex items-center justify-between bg-card">
              <div>
                <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <History size={20} className="text-primary" />
                  Version History
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Track and restore previous configurations.</p>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <div className="divide-y divide-border">
                {historyItems.map((item) => (
                  <div key={item.id} className={`p-5 hover:bg-muted/30 transition-colors group ${item.current ? 'bg-primary/5' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${item.current ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                          {item.current ? <Check size={14} strokeWidth={3} /> : <User size={14} />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${item.current ? 'text-primary' : 'text-foreground'}`}>
                            {item.action}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{item.user}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {item.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pl-10">
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border">
                        {item.details}
                      </p>
                      
                      {!item.current && (
                        <button className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                          <RotateCcw size={12} />
                          Restore this version
                        </button>
                      )}
                      
                      {item.current && (
                        <span className="mt-3 inline-block text-[10px] font-bold text-primary uppercase tracking-wider">
                          Current Version
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20">
              <button className="w-full py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-bold text-foreground transition-colors shadow-sm">
                View Full Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
