
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  DollarSign, 
  ArrowRight, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  AlertTriangle, 
  Save,
  Pencil,
  MoreVertical,
  LayoutTemplate,
  Building,
  Database,
  History,
  ArrowLeftRight,
  Download
} from 'lucide-react';

// --- Types ---
interface InstallCost {
  id: string;
  name: string;
  defaultRate: number;
  unit: string;
  category: string;
}

interface BuilderTask {
  id: string;
  builder: string;
  model: string;
  taskName: string;
  associatedCostId: string | null;
}

// --- Mock Data ---
const MOCK_COSTS: InstallCost[] = [
  { id: 'C-001', name: 'INSTALL INTERIOR DOOR', defaultRate: 45.00, unit: 'EA', category: 'Interior' },
  { id: 'C-002', name: 'INSTALL EXTERIOR DOOR', defaultRate: 85.00, unit: 'EA', category: 'Exterior' },
  { id: 'C-003', name: 'BASEBOARD INSTALLATION', defaultRate: 1.25, unit: 'LF', category: 'Trim' },
  { id: 'C-004', name: 'CROWN MOULDING', defaultRate: 2.50, unit: 'LF', category: 'Trim' },
  { id: 'C-005', name: 'WINDOW CASING', defaultRate: 1.50, unit: 'LF', category: 'Trim' },
  { id: 'C-006', name: 'DOOR HARDWARE', defaultRate: 15.00, unit: 'SET', category: 'Hardware' },
  { id: 'C-007', name: 'CLOSET SHELVING', defaultRate: 25.00, unit: 'LF', category: 'Specialty' },
];

const MOCK_BUILDER_TASKS: BuilderTask[] = [
  { id: 'T-101', builder: 'Lennar Homes', model: '4093 RH', taskName: 'Int Door - 1st Floor', associatedCostId: 'C-001' },
  { id: 'T-102', builder: 'Lennar Homes', model: '4093 RH', taskName: 'Int Door - 2nd Floor', associatedCostId: 'C-001' },
  { id: 'T-103', builder: 'Mattamy Homes', model: 'River Run', taskName: 'Baseboard Install', associatedCostId: 'C-003' },
  { id: 'T-104', builder: 'Mattamy Homes', model: 'River Run', taskName: 'Crown Living Room', associatedCostId: 'C-004' },
  { id: 'T-105', builder: 'PulteGroup', model: 'Generic', taskName: 'Ext Door Front', associatedCostId: 'C-002' },
  { id: 'T-106', builder: 'PulteGroup', model: 'Generic', taskName: 'Ext Door Rear', associatedCostId: 'C-002' },
  { id: 'T-109', builder: 'Lennar Homes', model: '4093 LH', taskName: 'Hardware Install', associatedCostId: 'C-006' },
];

export const CommunityInstallCostsMainView: React.FC = () => {
  // --- State ---
  const [costs, setCosts] = useState<InstallCost[]>(MOCK_COSTS);
  const [taskAssociations, setTaskAssociations] = useState<BuilderTask[]>(MOCK_BUILDER_TASKS);
  const [viewMode, setViewMode] = useState<'list' | 'import'>('list');
  
  const [selectedCostId, setSelectedCostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InstallCost>>({});

  // Delete Warning State
  const [deleteWarningId, setDeleteWarningId] = useState<string | null>(null);

  // --- Derived Data ---
  const filteredCosts = costs.filter(cost => 
    cost.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cost.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUsageForSelected = () => {
    if (!selectedCostId) return [];
    return taskAssociations.filter(t => t.associatedCostId === selectedCostId);
  };

  const selectedCost = costs.find(c => c.id === selectedCostId);

  // --- Actions ---

  const handleAddNew = () => {
    const newId = `NEW-${Date.now()}`;
    const newCost: InstallCost = {
      id: newId,
      name: '',
      defaultRate: 0,
      unit: 'EA',
      category: 'General'
    };
    // Add to top of list
    setCosts([newCost, ...costs]);
    // Immediately start editing
    setEditingId(newId);
    setEditForm(newCost);
    setSelectedCostId(null);
    setViewMode('list'); // Ensure we are in list view
  };

  const handleStartEdit = (cost: InstallCost, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(cost.id);
    setEditForm({ ...cost });
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    // If cancelling a new item (no name set yet), remove it
    if (editingId && editingId.startsWith('NEW-') && !editForm.name) {
      setCosts(prev => prev.filter(c => c.id !== editingId));
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editForm.name) return; // Basic validation
    
    setCosts(prev => prev.map(c => c.id === editingId ? { ...c, ...editForm } as InstallCost : c));
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteClick = (costId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const linkedCount = taskAssociations.filter(t => t.associatedCostId === costId).length;
    if (linkedCount > 0) {
      setDeleteWarningId(costId);
    } else {
      // Direct delete
      setCosts(prev => prev.filter(c => c.id !== costId));
      if (selectedCostId === costId) setSelectedCostId(null);
    }
  };

  const confirmDelete = () => {
    if (deleteWarningId) {
      setCosts(prev => prev.filter(c => c.id !== deleteWarningId));
      // Remove associations
      setTaskAssociations(prev => prev.map(t => t.associatedCostId === deleteWarningId ? { ...t, associatedCostId: null } : t));
      
      if (selectedCostId === deleteWarningId) setSelectedCostId(null);
      setDeleteWarningId(null);
    }
  };

  const handleImport = () => {
    // Simulating import from V1
    const v1Costs: InstallCost[] = [
        { id: 'V1-001', name: 'V1 LEGACY - INSTALL STAIRS', defaultRate: 150.00, unit: 'FLT', category: 'Legacy' },
        { id: 'V1-002', name: 'V1 LEGACY - DEMO WORK', defaultRate: 45.00, unit: 'HR', category: 'Labor' },
    ];
    setCosts([...costs, ...v1Costs]);
    setViewMode('list');
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      
      {/* Delete Warning Modal Overlay */}
      {deleteWarningId && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Delete Cost?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This cost is currently used by <strong>{taskAssociations.filter(t => t.associatedCostId === deleteWarningId).length}</strong> builder tasks. 
                  Deleting it will remove pricing from all associated tasks immediately.
                </p>
                <div className="bg-muted p-3 rounded-lg max-h-32 overflow-y-auto text-xs space-y-1.5 mt-2 border border-border">
                  {taskAssociations.filter(t => t.associatedCostId === deleteWarningId).map(t => (
                    <div key={t.id} className="text-foreground font-medium flex items-center gap-2">
                      <ArrowRight size={10} className="text-muted-foreground" /> 
                      {t.builder} - {t.taskName}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-2 justify-end">
              <button 
                onClick={() => setDeleteWarningId(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-bold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LEFT PANEL: Cost Master List --- */}
      <div className={`flex flex-col border-r border-border bg-card transition-all duration-300 ${selectedCostId && viewMode === 'list' ? 'w-full md:w-1/2 lg:w-3/5' : 'w-full'}`}>
        
        {/* Header Actions */}
        <div className="p-4 border-b border-border bg-muted/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary p-2 rounded-lg">
                <DollarSign size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Install Costs</h2>
                <p className="text-xs text-muted-foreground">Global labor rate definitions</p>
              </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setViewMode(viewMode === 'list' ? 'import' : 'list')}
                    className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-foreground text-sm font-semibold rounded-lg hover:bg-muted transition-colors"
                >
                    {viewMode === 'list' ? (
                        <>
                            <Database size={16} className="text-muted-foreground" />
                            <span className="hidden sm:inline">Import Tools</span>
                        </>
                    ) : (
                        <>
                            <ArrowLeftRight size={16} className="text-muted-foreground" />
                            <span className="hidden sm:inline">View List</span>
                        </>
                    )}
                </button>
                {viewMode === 'list' && (
                    <button 
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                    <Plus size={16} /> <span className="hidden sm:inline">Add New</span>
                    </button>
                )}
            </div>
          </div>
          
          {viewMode === 'list' && (
            <div className="relative animate-in fade-in duration-300">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                type="text" 
                placeholder="Search by name or category..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative">
            {viewMode === 'list' ? (
                <table className="w-full text-left border-collapse animate-in fade-in duration-300">
                    <thead className="bg-muted/30 sticky top-0 z-10 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-3">Cost Name</th>
                        <th className="px-4 py-3 w-32">Category</th>
                        <th className="px-4 py-3 w-28 text-right">Rate</th>
                        <th className="px-4 py-3 w-20 text-center">Unit</th>
                        <th className="px-4 py-3 w-24 text-center">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {filteredCosts.map(cost => {
                        const isSelected = selectedCostId === cost.id;
                        const isEditing = editingId === cost.id;
                        const usageCount = taskAssociations.filter(t => t.associatedCostId === cost.id).length;

                        if (isEditing) {
                        return (
                            <tr key={cost.id} className="bg-primary/5 border-l-4 border-l-primary animate-in fade-in duration-200">
                            <td className="px-6 py-4">
                                <input 
                                autoFocus
                                className="w-full h-9 px-2 rounded border border-primary bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value.toUpperCase()})}
                                placeholder="COST NAME"
                                />
                            </td>
                            <td className="px-4 py-4">
                                <input 
                                className="w-full h-9 px-2 rounded border border-border bg-background text-xs focus:outline-none focus:border-primary"
                                value={editForm.category}
                                onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                placeholder="Category"
                                />
                            </td>
                            <td className="px-4 py-4">
                                <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                <input 
                                    type="number"
                                    className="w-full h-9 pl-5 pr-2 rounded border border-border bg-background text-sm font-mono focus:outline-none focus:border-primary text-right"
                                    value={editForm.defaultRate}
                                    onChange={(e) => setEditForm({...editForm, defaultRate: parseFloat(e.target.value)})}
                                />
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <select 
                                className="w-full h-9 px-1 rounded border border-border bg-background text-xs focus:outline-none focus:border-primary text-center"
                                value={editForm.unit}
                                onChange={(e) => setEditForm({...editForm, unit: e.target.value})}
                                >
                                    <option value="EA">EA</option>
                                    <option value="LF">LF</option>
                                    <option value="SET">SET</option>
                                    <option value="SQFT">SQFT</option>
                                </select>
                            </td>
                            <td className="px-4 py-4 text-center">
                                <div className="flex justify-center gap-1">
                                <button onClick={handleSaveEdit} className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded shadow-sm transition-colors">
                                    <Check size={14} />
                                </button>
                                <button onClick={handleCancelEdit} className="p-1.5 bg-muted hover:bg-muted-foreground/20 text-muted-foreground rounded transition-colors">
                                    <X size={14} />
                                </button>
                                </div>
                            </td>
                            </tr>
                        );
                        }

                        return (
                        <tr 
                            key={cost.id}
                            onClick={() => setSelectedCostId(cost.id)}
                            className={`cursor-pointer transition-colors group border-l-4 ${isSelected ? 'bg-primary/5 border-l-primary' : 'hover:bg-muted/20 border-l-transparent'}`}
                        >
                            <td className="px-6 py-4">
                            <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{cost.name}</p>
                            {usageCount > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                                        <Building size={10} /> Used in {usageCount} Tasks
                                    </span>
                                </div>
                            )}
                            </td>
                            <td className="px-4 py-4">
                                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">{cost.category}</span>
                            </td>
                            <td className="px-4 py-4 text-right">
                            <span className="text-sm font-mono font-medium text-foreground">${cost.defaultRate.toFixed(2)}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                            <span className="text-xs text-muted-foreground font-medium">{cost.unit}</span>
                            </td>
                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleStartEdit(cost, e)}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                    title="Edit"
                                >
                                <Pencil size={14} />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteClick(cost.id, e)}
                                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                >
                                <Trash2 size={14} />
                                </button>
                            </div>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
            ) : (
                // Import View / Empty State
                <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-border">
                        <History size={40} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Import Legacy Costs</h3>
                    <p className="text-muted-foreground max-w-md mb-8">
                        You have <strong>{costs.length}</strong> active costs in the current system. 
                        You can import your previous rate sheet from Version 1 to quickly populate your library.
                    </p>
                    
                    <div className="flex flex-col gap-3 w-full max-w-sm">
                        <button 
                            onClick={handleImport}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <Download size={20} />
                            Import from Old Install Costs (v1)
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className="w-full py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-colors"
                        >
                            Return to List
                        </button>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground mt-8 uppercase tracking-widest font-bold">
                        Only admins can perform bulk imports
                    </p>
                </div>
            )}
        </div>
      </div>

      {/* --- RIGHT PANEL: Details & Usage --- */}
      {selectedCostId && selectedCost && viewMode === 'list' && (
        <div className="hidden md:flex flex-col w-full md:w-1/2 lg:w-2/5 bg-muted/10 h-full overflow-hidden animate-in slide-in-from-right duration-300 shadow-xl z-10 border-l border-border">
            
            {/* Panel Header */}
            <div className="p-6 border-b border-border bg-card flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-black text-foreground">{selectedCost.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-mono font-bold text-primary">${selectedCost.defaultRate.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">per {selectedCost.unit}</span>
                    </div>
                </div>
                <button onClick={() => setSelectedCostId(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={20} />
                </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Linked Tasks</p>
                        <p className="text-2xl font-black text-foreground mt-1">{getUsageForSelected().length}</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Category</p>
                        <p className="text-sm font-bold text-foreground mt-2">{selectedCost.category}</p>
                    </div>
                </div>

                {/* Usage List */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Building size={16} className="text-primary" />
                        Used By Builders
                    </h4>
                    
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        {getUsageForSelected().length > 0 ? (
                            <div className="divide-y divide-border">
                                {getUsageForSelected().map((task, idx) => (
                                    <div key={idx} className="p-4 flex flex-col gap-1 hover:bg-muted/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm font-bold text-foreground">{task.builder}</span>
                                            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{task.id}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <LayoutTemplate size={12} />
                                            <span className="font-medium">{task.model}</span>
                                            <span className="text-border">•</span>
                                            <span>{task.taskName}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-sm italic">
                                This cost is not currently associated with any builder tasks.
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t border-border">
                    <button 
                        onClick={(e) => handleStartEdit(selectedCost, e)}
                        className="w-full py-3 bg-white dark:bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Pencil size={16} />
                        Edit Cost Details
                    </button>
                </div>

            </div>
        </div>
      )}

    </div>
  );
};
