import React, { useState, useEffect } from 'react';
import { X, Search, DollarSign, Check, AlertCircle, Link, CheckSquare, Square, Trash2, Plus, Info, AlertTriangle, ArrowRight } from 'lucide-react';

// Shared Mock Data for Install Costs (In a real app, this would be a prop or store)
const AVAILABLE_COSTS = [
  { id: 'C-001', name: 'INSTALL INTERIOR DOOR', defaultRate: 45.00, unit: 'Per Door', category: 'Interior' },
  { id: 'C-002', name: 'INSTALL EXTERIOR DOOR', defaultRate: 85.00, unit: 'Per Door', category: 'Exterior' },
  { id: 'C-003', name: 'BASEBOARD INSTALLATION', defaultRate: 1.25, unit: 'LF', category: 'Trim' },
  { id: 'C-004', name: 'CROWN MOULDING', defaultRate: 2.50, unit: 'LF', category: 'Trim' },
  { id: 'C-005', name: 'WINDOW CASING', defaultRate: 1.50, unit: 'LF', category: 'Trim' },
  { id: 'C-006', name: 'DOOR HARDWARE', defaultRate: 15.00, unit: 'Per Set', category: 'Hardware' },
  { id: 'C-007', name: 'CLOSET SHELVING', defaultRate: 25.00, unit: 'Per Shelf', category: 'Specialty' },
  { id: 'C-008', name: 'ATTIC STAIRS', defaultRate: 120.00, unit: 'EA', category: 'Specialty' },
];

interface AssociatedCost {
  id: string;
  status: 'Active' | 'Inactive';
}

interface CommunityTaskCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: { id: string; taskName: string; builder: string; model: string; associatedCosts: AssociatedCost[] } | null;
  onSave: (taskId: string, associatedCosts: AssociatedCost[]) => void;
}

export const CommunityTaskCostModal: React.FC<CommunityTaskCostModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localAssociatedCosts, setLocalAssociatedCosts] = useState<AssociatedCost[]>([]);
  const [showNewCostForm, setShowNewCostForm] = useState(false);
  
  // New Cost Form State
  const [newCostName, setNewCostName] = useState('');
  const [newCostRate, setNewCostRate] = useState('');
  const [newCostUnit, setNewCostUnit] = useState('LF');

  useEffect(() => {
    if (isOpen && task) {
      setLocalAssociatedCosts(Array.isArray(task.associatedCosts) ? [...task.associatedCosts] : []);
      setSearchQuery('');
      setShowNewCostForm(false);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleToggleStatus = (costId: string) => {
    setLocalAssociatedCosts(prev => prev.map(ac => 
        ac.id === costId ? { ...ac, status: ac.status === 'Active' ? 'Inactive' : 'Active' } : ac
    ));
  };

  const handleRemoveCost = (costId: string) => {
    if (window.confirm("Are you sure you want to remove this cost association?")) {
        setLocalAssociatedCosts(prev => prev.filter(ac => ac.id !== costId));
    }
  };

  const handleAddExistingCost = (costId: string) => {
    // Check if already exists
    if (!localAssociatedCosts.find(ac => ac.id === costId)) {
        setLocalAssociatedCosts(prev => [...prev, { id: costId, status: 'Active' }]);
    }
    setSearchQuery('');
  };

  const handleCreateNewCost = () => {
    if (!newCostName || !newCostRate) return;
    
    // In a real app, this would POST to backend to create the cost first
    const newId = `C-${Date.now()}`; // Mock ID
    
    // NOTE: This updates the local Available Costs list for this session demo only
    AVAILABLE_COSTS.push({
        id: newId,
        name: newCostName.toUpperCase(),
        defaultRate: parseFloat(newCostRate),
        unit: newCostUnit,
        category: 'Custom'
    });

    setLocalAssociatedCosts(prev => [...prev, { id: newId, status: 'Active' }]);
    setShowNewCostForm(false);
    setNewCostName('');
    setNewCostRate('');
  };

  const handleSave = () => {
    onSave(task.id, localAssociatedCosts);
    onClose();
  };

  // Filter available costs excluding already associated ones
  const filteredAvailableCosts = AVAILABLE_COSTS.filter(cost => 
    !localAssociatedCosts.find(ac => ac.id === cost.id) &&
    (cost.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cost.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalBaseCost = localAssociatedCosts
    .filter(ac => ac.status === 'Active')
    .reduce((sum, ac) => {
        const cost = AVAILABLE_COSTS.find(c => c.id === ac.id);
        return sum + (cost ? cost.defaultRate : 0);
    }, 0);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-background w-full max-w-3xl h-[90vh] flex flex-col rounded-xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Link size={18} className="text-primary" />
              Manage Cost Associations
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              for <span className="font-semibold text-foreground">{task.taskName}</span> ({task.builder})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/10">
            
            {/* Global Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Global Configuration Update</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                        Changes to the install cost list below are global for the builder + builder task. This will impact all models in {task.builder} that share this task definition.
                    </p>
                </div>
            </div>

            {/* List of Associated Costs */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                    Currently Associated Costs
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{localAssociatedCosts.length} Items</span>
                </h3>
                
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    {localAssociatedCosts.length > 0 ? (
                        <div className="divide-y divide-border">
                            {localAssociatedCosts.map(ac => {
                                const costDetails = AVAILABLE_COSTS.find(c => c.id === ac.id);
                                if (!costDetails) return null;
                                return (
                                    <div key={ac.id} className="p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <DollarSign size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{costDetails.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    ${costDetails.defaultRate.toFixed(2)} / {costDetails.unit}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => handleToggleStatus(ac.id)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors border ${ac.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                            >
                                                {ac.status}
                                            </button>
                                            <div className="h-4 w-px bg-border"></div>
                                            <button 
                                                onClick={() => handleRemoveCost(ac.id)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                title="Remove Association"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground text-sm italic">
                            No costs associated with this task yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Add Cost Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Add Install Cost</h3>
                
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
                    {!showNewCostForm ? (
                        <>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search available costs..." 
                                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowNewCostForm(true)}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold hover:bg-secondary/80 transition-colors border border-border"
                                >
                                    Create New
                                </button>
                            </div>

                            {searchQuery && (
                                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {filteredAvailableCosts.map(cost => (
                                        <button 
                                            key={cost.id}
                                            onClick={() => handleAddExistingCost(cost.id)}
                                            className="w-full text-left p-3 hover:bg-muted/50 flex justify-between items-center group transition-colors border-b border-border last:border-0"
                                        >
                                            <span className="text-sm font-medium text-foreground">{cost.name}</span>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary flex items-center gap-1">
                                                Add <Plus size={12} />
                                            </span>
                                        </button>
                                    ))}
                                    {filteredAvailableCosts.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground">No matching costs found.</div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-bold text-foreground">Create New Global Cost</h4>
                                <button onClick={() => setShowNewCostForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Cost Name</label>
                                    <input 
                                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="e.g. SPECIALTY INSTALL"
                                        value={newCostName}
                                        onChange={(e) => setNewCostName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Default Rate</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                        <input 
                                            type="number"
                                            className="w-full h-9 pl-6 pr-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="0.00"
                                            value={newCostRate}
                                            onChange={(e) => setNewCostRate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Unit</label>
                                    <select 
                                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                                        value={newCostUnit}
                                        onChange={(e) => setNewCostUnit(e.target.value)}
                                    >
                                        <option value="LF">LF</option>
                                        <option value="EA">EA</option>
                                        <option value="SQFT">SQFT</option>
                                        <option value="HR">HR</option>
                                    </select>
                                </div>
                            </div>
                            <button 
                                onClick={handleCreateNewCost}
                                className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                Create & Associate
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex justify-between items-center shrink-0">
            <div className="flex flex-col pl-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Est. Base Cost</span>
                <span className="text-xl font-black text-foreground flex items-center gap-0.5">
                    <DollarSign size={14} className="text-muted-foreground" />
                    {totalBaseCost.toFixed(2)}
                </span>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    className="px-6 py-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
                >
                    Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};