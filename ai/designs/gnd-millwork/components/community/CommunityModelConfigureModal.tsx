import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  Layers, 
  Save, 
  Check,
  ClipboardList,
  DollarSign,
  ArrowRight
} from 'lucide-react';

interface CommunityModelConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: { id: string; name: string; builder: string; type: string } | null;
}

// Mock Data
const INITIAL_AVAILABLE_COSTS = [
  { id: 'C-001', name: 'INSTALL INTERIOR DOOR', cost: 45.00, unit: 'EA' },
  { id: 'C-002', name: 'INSTALL EXTERIOR DOOR', cost: 85.00, unit: 'EA' },
  { id: 'C-003', name: 'INSTALL BIFOLD DOOR', cost: 35.00, unit: 'EA' },
  { id: 'C-004', name: 'INSTALL WINDOW CASING', cost: 1.50, unit: 'LF' }, 
  { id: 'C-005', name: 'INSTALL BASEBOARD', cost: 1.25, unit: 'LF' },
  { id: 'C-006', name: 'INSTALL CROWN MOULDING', cost: 2.50, unit: 'LF' },
  { id: 'C-007', name: 'INSTALL HARDWARE - ENTRY', cost: 45.00, unit: 'SET' },
  { id: 'C-008', name: 'INSTALL SHELVING', cost: 15.00, unit: 'LF' },
  { id: 'C-009', name: 'INSTALL ATTIC STAIRS', cost: 120.00, unit: 'EA' },
];

interface TaskCostAssociation {
    id: string;
    status: 'Active' | 'Inactive';
}

interface BuilderTaskDef {
    id: string;
    name: string;
    costs: TaskCostAssociation[];
    isInstallable: boolean;
    addonPercentage: number;
}

const INITIAL_BUILDER_TASKS: BuilderTaskDef[] = [
    { id: 'BT-1', name: 'Trim - 1st Floor', costs: [{ id: 'C-004', status: 'Active' }, { id: 'C-005', status: 'Active' }, { id: 'C-006', status: 'Active' }], isInstallable: true, addonPercentage: 15 },
    { id: 'BT-2', name: 'Trim - 2nd Floor', costs: [{ id: 'C-004', status: 'Active' }, { id: 'C-005', status: 'Active' }, { id: 'C-009', status: 'Inactive' }], isInstallable: true, addonPercentage: 15 },
    { id: 'BT-3', name: 'Doors - Interior', costs: [{ id: 'C-001', status: 'Active' }, { id: 'C-003', status: 'Active' }], isInstallable: true, addonPercentage: 15 },
    { id: 'BT-4', name: 'Doors - Exterior', costs: [{ id: 'C-002', status: 'Active' }], isInstallable: true, addonPercentage: 15 },
    { id: 'BT-5', name: 'Hardware & Misc', costs: [], isInstallable: false, addonPercentage: 10 },
];

export const CommunityModelConfigureModal: React.FC<CommunityModelConfigureModalProps> = ({ isOpen, onClose, model }) => {
  const [builderTasks, setBuilderTasks] = useState<BuilderTaskDef[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [availableCosts, setAvailableCosts] = useState(INITIAL_AVAILABLE_COSTS);
  
  // UI State
  const [taskDropdown, setTaskDropdown] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  
  // Inline Editing States
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempAddonValue, setTempAddonValue] = useState<number>(0);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingCostId, setDeletingCostId] = useState<string | null>(null);
  
  // Add Cost UI State
  const [costSearchQuery, setCostSearchQuery] = useState('');
  const [showCreateCost, setShowCreateCost] = useState(false);
  const [newCostDetails, setNewCostDetails] = useState({ name: '', rate: '', unit: 'LF' });

  // Init Data based on Builder
  useEffect(() => {
    if (isOpen && model) {
        if (model.builder === 'PulteGroup') {
            setBuilderTasks([]);
            setSelectedTaskId('');
        } else {
            setBuilderTasks(INITIAL_BUILDER_TASKS);
            if (INITIAL_BUILDER_TASKS.length > 0) {
                setSelectedTaskId(INITIAL_BUILDER_TASKS[0].id);
            }
        }
    }
  }, [isOpen, model]);

  if (!isOpen || !model) return null;

  const activeTask = builderTasks.find(t => t.id === selectedTaskId);

  // --- Helper: Calculate Task Estimate ---
  const calculateTaskEstimate = (task: BuilderTaskDef) => {
    return task.costs.reduce((sum, association) => {
      if (association.status === 'Active') {
        const costDef = availableCosts.find(c => c.id === association.id);
        return sum + (costDef?.cost || 0);
      }
      return sum;
    }, 0);
  };

  // --- Task Management ---

  const handleAddTask = () => {
      if(!newTaskName) return;
      const newTask: BuilderTaskDef = {
          id: `BT-${Date.now()}`,
          name: newTaskName,
          costs: [],
          isInstallable: true,
          addonPercentage: 15
      };
      setBuilderTasks([...builderTasks, newTask]);
      setNewTaskName('');
      setSelectedTaskId(newTask.id);
  };

  const handleStartDeleteTask = (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingTaskId(taskId);
      setTaskDropdown(null);
  };

  const confirmDeleteTask = (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newTasks = builderTasks.filter(t => t.id !== taskId);
      setBuilderTasks(newTasks);
      if (selectedTaskId === taskId) {
          setSelectedTaskId(newTasks.length > 0 ? newTasks[0].id : '');
      }
      setDeletingTaskId(null);
  };

  const cancelDeleteTask = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingTaskId(null);
  };

  const handleToggleInstallable = (taskId: string) => {
      setBuilderTasks(prev => prev.map(t => t.id === taskId ? { ...t, isInstallable: !t.isInstallable } : t));
      setTaskDropdown(null);
  };

  const handleStartEditAddon = (task: BuilderTaskDef, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTaskId(task.id);
      setTempAddonValue(task.addonPercentage);
      setTaskDropdown(null);
  };

  const handleSaveAddon = (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setBuilderTasks(prev => prev.map(t => t.id === taskId ? { ...t, addonPercentage: tempAddonValue } : t));
      setEditingTaskId(null);
  };

  // --- Cost Actions ---

  const handleToggleCostStatus = (costId: string) => {
      if (!activeTask) return;
      const updatedCosts = activeTask.costs.map(c => 
          c.id === costId ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } as TaskCostAssociation : c
      );
      setBuilderTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, costs: updatedCosts } : t));
  };

  const handleDeleteCost = (costId: string) => {
      if (!activeTask) return;
      const updatedCosts = activeTask.costs.filter(c => c.id !== costId);
      setBuilderTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, costs: updatedCosts } : t));
      setDeletingCostId(null);
  };

  const handleAddExistingCost = (costId: string) => {
      if (!activeTask) return;
      if (activeTask.costs.some(c => c.id === costId)) {
          alert('Cost already associated');
          return;
      }
      const newAssociation: TaskCostAssociation = { id: costId, status: 'Active' };
      setBuilderTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, costs: [...t.costs, newAssociation] } : t));
      setCostSearchQuery('');
  };

  const handleCreateAndAddCost = () => {
      if (!activeTask || !newCostDetails.name || !newCostDetails.rate) return;
      
      const newCostId = `C-${Date.now()}`;
      const newCost = {
          id: newCostId,
          name: newCostDetails.name.toUpperCase(),
          cost: parseFloat(newCostDetails.rate),
          unit: newCostDetails.unit
      };

      setAvailableCosts([...availableCosts, newCost]);
      
      // Associate
      const newAssociation: TaskCostAssociation = { id: newCostId, status: 'Active' };
      setBuilderTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, costs: [...t.costs, newAssociation] } : t));
      
      setShowCreateCost(false);
      setNewCostDetails({ name: '', rate: '', unit: 'LF' });
  };

  const unassociatedCosts = activeTask 
    ? availableCosts.filter(ac => !activeTask.costs.some(tc => tc.id === ac.id) && ac.name.toLowerCase().includes(costSearchQuery.toLowerCase()))
    : [];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-background w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => { e.stopPropagation(); setTaskDropdown(null); }}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              {model.name}
              <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{model.builder}</span>
            </h2>
            <p className="text-sm text-muted-foreground">Configure global task definitions and install costs.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Sidebar: Builder Tasks */}
            <div className="w-full md:w-80 bg-muted/10 border-r border-border flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Layers size={14} /> Builder Tasks
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {builderTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-4 opacity-70">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                <ClipboardList size={24} className="text-muted-foreground" />
                            </div>
                            <p className="text-sm font-bold text-foreground">No Builder Tasks</p>
                            <p className="text-xs text-muted-foreground mt-1">Search and add or create new to get started.</p>
                        </div>
                    ) : (
                        builderTasks.map(task => {
                            const isActive = selectedTaskId === task.id;
                            const isEditing = editingTaskId === task.id;
                            const isDeleting = deletingTaskId === task.id;
                            const taskEstimate = calculateTaskEstimate(task);

                            if (isDeleting) {
                                return (
                                    <div key={task.id} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="text-xs font-semibold text-destructive flex items-center gap-2">
                                            <AlertTriangle size={14} /> Delete this task?
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">This will remove it from all models.</p>
                                        <div className="flex gap-2 mt-1">
                                            <button 
                                                onClick={(e) => confirmDeleteTask(task.id, e)}
                                                className="flex-1 py-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded shadow-sm hover:bg-destructive/90"
                                            >
                                                Delete
                                            </button>
                                            <button 
                                                onClick={(e) => cancelDeleteTask(e)}
                                                className="flex-1 py-1.5 bg-background border border-border text-foreground text-xs font-bold rounded hover:bg-muted"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={task.id} className="relative group">
                                    <button
                                        onClick={() => setSelectedTaskId(task.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group-hover:pr-10 ${
                                            isActive
                                            ? 'bg-primary text-primary-foreground shadow-md' 
                                            : 'hover:bg-muted text-foreground'
                                        }`}
                                    >
                                        <div className="flex flex-col truncate w-full">
                                            <div className="flex items-center justify-between">
                                              <span className="truncate">{task.name}</span>
                                              <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                                                ${taskEstimate.toFixed(2)}
                                              </span>
                                            </div>
                                            
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                                    <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>Add-on %:</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-12 h-6 rounded bg-white text-black px-1 text-xs font-bold text-center outline-none ring-2 ring-primary/50"
                                                        value={tempAddonValue}
                                                        onChange={(e) => setTempAddonValue(Number(e.target.value))}
                                                        autoFocus
                                                    />
                                                    <button 
                                                        onClick={(e) => handleSaveAddon(task.id, e)}
                                                        className="w-6 h-6 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded shadow-sm transition-colors"
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setEditingTaskId(null); }}
                                                        className="w-6 h-6 flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white rounded shadow-sm transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={`flex items-center gap-2 text-[10px] mt-0.5 ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                    <span>Add-on: {task.addonPercentage}%</span>
                                                    <span>•</span>
                                                    {task.isInstallable ? (
                                                        <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Install</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 opacity-70"><XCircle size={10} /> No Install</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {!isEditing && <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-transparent'}`} />}
                                    </button>
                                    
                                    {!isEditing && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setTaskDropdown(taskDropdown === task.id ? null : task.id); }}
                                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${
                                                isActive 
                                                ? 'text-primary-foreground hover:bg-white/20' 
                                                : 'text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100'
                                            }`}
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                    )}

                                    {taskDropdown === task.id && (
                                        <div className="absolute right-[-10px] top-[80%] w-48 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col py-1">
                                            <div className="px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border bg-muted/30">
                                                Actions
                                            </div>
                                            <button onClick={(e) => handleStartEditAddon(task, e)} className="px-3 py-2 text-sm text-left hover:bg-muted text-foreground flex items-center gap-2">
                                                <Settings size={14} /> Update Add-on %
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleToggleInstallable(task.id); }} className="px-3 py-2 text-sm text-left hover:bg-muted text-foreground flex items-center gap-2">
                                                {task.isInstallable ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                                Set {task.isInstallable ? 'Not Installable' : 'Installable'}
                                            </button>
                                            <div className="h-px bg-border my-1"></div>
                                            <button onClick={(e) => handleStartDeleteTask(task.id, e)} className="px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive flex items-center gap-2">
                                                <Trash2 size={14} /> Delete Task
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 bg-card border-t border-border">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="New Task Name" 
                            className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all"
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                        />
                        <button onClick={handleAddTask} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors" disabled={!newTaskName}>
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main: Install Costs */}
            <div className="flex-1 flex flex-col min-w-0 bg-card relative">
                {!activeTask ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                        Select a task to view configuration
                    </div>
                ) : (
                    <>
                        <div className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800 px-6 py-3 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Global Builder Configuration</p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                    Changes to the install cost list below will update <strong>{model.builder}</strong> globally. 
                                    This affects ALL models using the <em>{activeTask.name}</em> task.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/5">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                {activeTask.name}
                                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                                    {activeTask.costs.length} Costs
                                </span>
                            </h3>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Est. Base Cost</span>
                              <span className="text-xl font-black text-primary font-mono">${calculateTaskEstimate(activeTask).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {activeTask.costs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-full m-6 rounded-xl bg-muted/5 border-2 border-dashed border-border/60">
                                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                                        <DollarSign size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">No Install Cost Items</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mt-2 mb-6 leading-relaxed">
                                        There are no costs associated with this task yet. Add from the library or create a new one.
                                    </p>
                                    <button 
                                        onClick={() => setShowCreateCost(true)} 
                                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 flex items-center gap-2 transition-all"
                                    >
                                        Add or Create Cost <ArrowRight size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="min-w-[600px]">
                                    <div className="bg-muted/30 px-6 py-3 grid grid-cols-12 gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                                        <div className="col-span-5">Install Cost Item</div>
                                        <div className="col-span-2 text-center">Status</div>
                                        <div className="col-span-2 text-right">Default Rate</div>
                                        <div className="col-span-2 text-center">Unit</div>
                                        <div className="col-span-1 text-right">Action</div>
                                    </div>
                                    
                                    <div className="divide-y divide-border">
                                        {activeTask.costs.map((assoc) => {
                                            const costDef = availableCosts.find(c => c.id === assoc.id);
                                            if (!costDef) return null;
                                            const isActive = assoc.status === 'Active';
                                            const isDeleting = deletingCostId === assoc.id;
                                            
                                            return (
                                                <div key={assoc.id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-muted/10 ${!isActive ? 'opacity-60 bg-muted/5' : ''}`}>
                                                    <div className="col-span-5">
                                                        <p className="text-sm font-bold text-foreground">{costDef.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{assoc.id}</p>
                                                    </div>
                                                    <div className="col-span-2 text-center">
                                                        <button 
                                                            onClick={() => handleToggleCostStatus(assoc.id)}
                                                            className={`text-[10px] font-bold px-2 py-1 rounded-full border min-w-[60px] uppercase transition-colors hover:scale-105 active:scale-95 ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                                        >
                                                            {assoc.status}
                                                        </button>
                                                    </div>
                                                    <div className="col-span-2 text-right text-sm font-mono font-medium text-foreground">
                                                        ${costDef.cost.toFixed(2)}
                                                    </div>
                                                    <div className="col-span-2 text-center text-xs text-muted-foreground bg-muted/50 py-1 rounded">
                                                        {costDef.unit}
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        {isDeleting ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button 
                                                                    onClick={() => handleDeleteCost(assoc.id)}
                                                                    className="p-1.5 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                                                                    title="Confirm Delete"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => setDeletingCostId(null)}
                                                                    className="p-1.5 bg-muted text-muted-foreground rounded hover:text-foreground transition-colors"
                                                                    title="Cancel"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setDeletingCostId(assoc.id)}
                                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Add Cost Form - Only visible if tasks exist or manually triggered */}
                            <div className="p-6 border-t border-dashed border-border mt-4 bg-muted/5">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Add Cost to Task</h4>
                                {!showCreateCost ? (
                                    <div className="flex gap-2 relative">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                            <input 
                                                type="text" 
                                                placeholder="Search global costs..." 
                                                value={costSearchQuery}
                                                onChange={(e) => setCostSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                            />
                                            {costSearchQuery && (
                                                <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                                                    {unassociatedCosts.length > 0 ? unassociatedCosts.map(cost => (
                                                        <button key={cost.id} onClick={() => handleAddExistingCost(cost.id)} className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex justify-between items-center border-b border-border last:border-0">
                                                            <span>{cost.name}</span>
                                                            <span className="text-xs font-bold text-muted-foreground">${cost.cost}</span>
                                                        </button>
                                                    )) : (
                                                        <div className="px-4 py-3 text-xs text-muted-foreground text-center">No matching costs found.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setShowCreateCost(true)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold border border-border hover:bg-secondary/80 transition-colors">
                                            Create New
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-background border border-border rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Cost Name</label>
                                                <input className="w-full h-9 px-3 rounded-lg border border-input bg-muted/30 text-sm focus:ring-2 focus:ring-primary outline-none" value={newCostDetails.name} onChange={(e) => setNewCostDetails({...newCostDetails, name: e.target.value})} placeholder="e.g. SPECIAL INSTALL" />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Rate ($)</label>
                                                <input type="number" className="w-full h-9 px-3 rounded-lg border border-input bg-muted/30 text-sm focus:ring-2 focus:ring-primary outline-none" value={newCostDetails.rate} onChange={(e) => setNewCostDetails({...newCostDetails, rate: e.target.value})} placeholder="0.00" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Unit</label>
                                                <select className="w-full h-9 px-2 rounded-lg border border-input bg-muted/30 text-sm focus:ring-2 focus:ring-primary outline-none" value={newCostDetails.unit} onChange={(e) => setNewCostDetails({...newCostDetails, unit: e.target.value})}>
                                                    <option value="LF">LF</option>
                                                    <option value="EA">EA</option>
                                                    <option value="SET">SET</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2 flex gap-1">
                                                <button onClick={handleCreateAndAddCost} className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90">Add</button>
                                                <button onClick={() => setShowCreateCost(false)} className="flex-1 h-9 bg-muted text-muted-foreground rounded-lg text-xs font-bold hover:text-foreground">Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-5 py-2 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">Close</button>
            <button onClick={onClose} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 flex items-center gap-2 transition-all">
                <Save size={16} /> Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};