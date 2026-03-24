
import React, { useState } from 'react';
import { Search, Filter, Layers, Link, AlertCircle, CheckCircle2, ChevronRight, Briefcase, MoreVertical, Trash2, Plus, Settings, XCircle, Check, DollarSign } from 'lucide-react';
import { CommunityTaskCostModal } from './CommunityTaskCostModal';

// Shared Mock Data Reference (Ideally from a store)
const AVAILABLE_COSTS = [
  { id: 'C-001', name: 'INSTALL INTERIOR DOOR', defaultRate: 45.00 },
  { id: 'C-002', name: 'INSTALL EXTERIOR DOOR', defaultRate: 85.00 },
  { id: 'C-003', name: 'BASEBOARD INSTALLATION', defaultRate: 1.25 },
  { id: 'C-004', name: 'CROWN MOULDING', defaultRate: 2.50 },
  { id: 'C-005', name: 'WINDOW CASING', defaultRate: 1.50 },
  { id: 'C-006', name: 'DOOR HARDWARE', defaultRate: 15.00 },
];

interface AssociatedCost {
  id: string;
  status: 'Active' | 'Inactive';
}

interface BuilderTask {
  id: string;
  builder: string;
  model: string;
  taskName: string;
  associatedCosts: AssociatedCost[];
  isInstallable: boolean;
  addonPercentage: number;
}

const INITIAL_BUILDER_TASKS: BuilderTask[] = [
  { id: 'T-101', builder: 'Lennar Homes', model: '4093 RH', taskName: 'Int Door - 1st Floor', associatedCosts: [{ id: 'C-001', status: 'Active' }], isInstallable: true, addonPercentage: 15 },
  { id: 'T-102', builder: 'Lennar Homes', model: '4093 RH', taskName: 'Int Door - 2nd Floor', associatedCosts: [{ id: 'C-001', status: 'Active' }], isInstallable: true, addonPercentage: 15 },
  { id: 'T-103', builder: 'Mattamy Homes', model: 'River Run', taskName: 'Baseboard Install', associatedCosts: [{ id: 'C-003', status: 'Active' }], isInstallable: true, addonPercentage: 10 },
  { id: 'T-104', builder: 'Mattamy Homes', model: 'River Run', taskName: 'Crown Living Room', associatedCosts: [], isInstallable: false, addonPercentage: 20 },
  { id: 'T-105', builder: 'PulteGroup', model: 'Generic', taskName: 'Ext Door Front', associatedCosts: [{ id: 'C-002', status: 'Active' }], isInstallable: true, addonPercentage: 15 },
  { id: 'T-106', builder: 'PulteGroup', model: 'Generic', taskName: 'Ext Door Rear', associatedCosts: [{ id: 'C-002', status: 'Active' }], isInstallable: true, addonPercentage: 15 },
  { id: 'T-107', builder: 'Ryan Homes', model: 'Villa A', taskName: 'Standard Interior Door', associatedCosts: [], isInstallable: true, addonPercentage: 12 },
  { id: 'T-108', builder: 'Ryan Homes', model: 'Villa A', taskName: 'Master Closet Shelving', associatedCosts: [], isInstallable: false, addonPercentage: 15 },
  { id: 'T-109', builder: 'Lennar Homes', model: '4093 LH', taskName: 'Hardware Install', associatedCosts: [{ id: 'C-006', status: 'Active' }], isInstallable: true, addonPercentage: 5 },
];

export const CommunityBuilderTasksView: React.FC = () => {
  const [tasks, setTasks] = useState<BuilderTask[]>(INITIAL_BUILDER_TASKS);
  const [builderFilter, setBuilderFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<BuilderTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // New Task Form State
  const [newTaskBuilder, setNewTaskBuilder] = useState('');
  const [newTaskModel, setNewTaskModel] = useState('');
  const [newTaskName, setNewTaskName] = useState('');

  const builders = Array.from(new Set(INITIAL_BUILDER_TASKS.map(t => t.builder)));

  const filteredTasks = tasks.filter(task => {
    const matchesBuilder = builderFilter === 'All' || task.builder === builderFilter;
    const matchesSearch = task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBuilder && matchesSearch;
  });

  const handleTaskClick = (task: BuilderTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveAssociation = (taskId: string, associatedCosts: AssociatedCost[]) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, associatedCosts } : t));
  };

  const getCostSummary = (associatedCosts: AssociatedCost[]) => {
    if (!associatedCosts || associatedCosts.length === 0) return null;
    const activeCount = associatedCosts.filter(c => c.status === 'Active').length;
    if (associatedCosts.length === 1) {
        const costName = AVAILABLE_COSTS.find(c => c.id === associatedCosts[0].id)?.name || 'Unknown Cost';
        return `${costName} (${associatedCosts[0].status})`;
    }
    return `${activeCount} Active / ${associatedCosts.length} Total`;
  };

  const calculateEstimate = (associatedCosts: AssociatedCost[]) => {
    if (!associatedCosts) return 0;
    return associatedCosts
      .filter(ac => ac.status === 'Active')
      .reduce((sum, ac) => {
        const cost = AVAILABLE_COSTS.find(c => c.id === ac.id);
        return sum + (cost ? cost.defaultRate : 0);
      }, 0);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this builder task?')) {
        setTasks(tasks.filter(t => t.id !== taskId));
    }
    setActiveDropdown(null);
  };

  const handleToggleInstallable = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, isInstallable: !t.isInstallable } : t));
    setActiveDropdown(null);
  };

  const handleUpdateAddon = (taskId: string) => {
    const newPercent = prompt("Enter new addon percentage:");
    if (newPercent !== null && !isNaN(Number(newPercent))) {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, addonPercentage: Number(newPercent) } : t));
    }
    setActiveDropdown(null);
  };

  const handleAddTask = () => {
    if (!newTaskName || !newTaskModel || (builderFilter === 'All' && !newTaskBuilder)) {
        alert("Please fill in all fields");
        return;
    }
    const builder = builderFilter !== 'All' ? builderFilter : newTaskBuilder;
    const newTask: BuilderTask = {
        id: `T-${Date.now()}`,
        builder,
        model: newTaskModel,
        taskName: newTaskName,
        associatedCosts: [],
        isInstallable: true,
        addonPercentage: 15
    };
    setTasks([...tasks, newTask]);
    setNewTaskName('');
    setNewTaskModel('');
    if (builderFilter === 'All') setNewTaskBuilder('');
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden" onClick={() => setActiveDropdown(null)}>
        {/* Analytics Header */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Tasks</p>
                    <h3 className="text-2xl font-black text-foreground">{tasks.length}</h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Layers size={20} />
                </div>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Unassociated</p>
                    <h3 className="text-2xl font-black text-amber-600">{tasks.filter(t => (t.associatedCosts || []).length === 0).length}</h3>
                </div>
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                    <AlertCircle size={20} />
                </div>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Mapped</p>
                    <h3 className="text-2xl font-black text-green-600">{tasks.filter(t => (t.associatedCosts || []).length > 0).length}</h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                    <CheckCircle2 size={20} />
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Toolbar */}
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Briefcase size={18} className="text-primary" />
                        <h3 className="font-bold text-foreground">Builder Task Directory</h3>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search tasks, models..." 
                                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <select 
                                className="pl-3 pr-8 py-2 bg-background border border-border rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-primary h-full"
                                value={builderFilter}
                                onChange={(e) => setBuilderFilter(e.target.value)}
                            >
                                <option value="All">All Builders</option>
                                {builders.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
                            <tr>
                                <th className="px-6 py-4">Task Name</th>
                                <th className="px-6 py-4">Builder</th>
                                <th className="px-6 py-4">Model</th>
                                <th className="px-6 py-4">Associated Costs</th>
                                <th className="px-6 py-4 text-center">Add-on</th>
                                <th className="px-6 py-4 text-right">Est. Base Cost</th>
                                <th className="px-6 py-4 text-center">Installable</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTasks.map(task => {
                                const costSummary = getCostSummary(task.associatedCosts);
                                const estimate = calculateEstimate(task.associatedCosts);
                                return (
                                    <tr 
                                        key={task.id} 
                                        className="hover:bg-muted/20 transition-colors cursor-pointer group"
                                        onClick={() => handleTaskClick(task)}
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-foreground">{task.taskName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">{task.builder}</td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">{task.model}</td>
                                        <td className="px-6 py-4">
                                            {costSummary ? (
                                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                    <Link size={14} className="text-primary" />
                                                    {costSummary}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                                                    <AlertCircle size={12} /> No association
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-mono text-muted-foreground">
                                            {task.addonPercentage}%
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <DollarSign size={12} className="text-muted-foreground" />
                                                <span className="text-sm font-mono font-bold text-foreground">
                                                    {estimate.toFixed(2)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {task.isInstallable ? (
                                                <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                                            ) : (
                                                <XCircle size={16} className="text-muted-foreground/30 mx-auto" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === task.id ? null : task.id); }}
                                                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            
                                            {activeDropdown === task.id && (
                                                <div className="absolute right-8 top-8 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col py-1">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateAddon(task.id); }}
                                                        className="px-3 py-2 text-sm text-left hover:bg-muted text-foreground flex items-center gap-2"
                                                    >
                                                        <Settings size={14} /> Update Add-on %
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleToggleInstallable(task.id); }}
                                                        className="px-3 py-2 text-sm text-left hover:bg-muted text-foreground flex items-center gap-2"
                                                    >
                                                        {task.isInstallable ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                                        Set {task.isInstallable ? 'Not Installable' : 'Installable'}
                                                    </button>
                                                    <div className="h-px bg-border my-1"></div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                        className="px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive flex items-center gap-2"
                                                    >
                                                        <Trash2 size={14} /> Delete Task
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                                        No tasks found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add New Task Form */}
                <div className="p-4 bg-muted/20 border-t border-border">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                        <Plus size={14} /> Add New Builder Task
                    </h4>
                    <div className="grid grid-cols-12 gap-3 items-end">
                        {builderFilter === 'All' && (
                            <div className="col-span-3">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Builder</label>
                                <select 
                                    className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    value={newTaskBuilder}
                                    onChange={(e) => setNewTaskBuilder(e.target.value)}
                                >
                                    <option value="">Select Builder...</option>
                                    {builders.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        )}
                        <div className={`${builderFilter === 'All' ? 'col-span-3' : 'col-span-4'}`}>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Model</label>
                            <input 
                                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder="e.g. 4093 RH"
                                value={newTaskModel}
                                onChange={(e) => setNewTaskModel(e.target.value)}
                            />
                        </div>
                        <div className={`${builderFilter === 'All' ? 'col-span-4' : 'col-span-6'}`}>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Task Name</label>
                            <input 
                                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder="e.g. Trim - 3rd Floor"
                                value={newTaskName}
                                onChange={(e) => setNewTaskName(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <button 
                                onClick={handleAddTask}
                                className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                Add Task
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {selectedTask && (
            <CommunityTaskCostModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setSelectedTask(null); }} 
                task={selectedTask}
                onSave={handleSaveAssociation}
            />
        )}
    </div>
  );
};
