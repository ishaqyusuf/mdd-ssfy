import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  User, 
  Building2, 
  Home, 
  Layers, 
  CheckCircle2, 
  PenTool, 
  DollarSign, 
  Briefcase,
  AlertTriangle,
  Clock,
  Bell,
  Check
} from 'lucide-react';
import { JobStatus } from '../../types';

interface CommunityAssignJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (job: any) => void;
}

// --- Mock Data ---

const MOCK_USERS = [
  { id: 'u1', name: 'Alex Thompson', role: 'Contractor', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcNPhD3T1dk8PlbE0lbXMtQFFe3Y5-AF-UCxWhhFle4e5cJNK3GBXglm2oSJmibHiGSs2W0zZ66TZqnPZ0Na03GC-grMDS4m62Q5ZPvtJ-66Kzp2woHkYTPyfj0y07Gfhi4QRLK7h86sssxLlyL62CcWn7RYByDcCoYqK2c0CFZt-paZLmeyfccOSUyOvdXMqy2c6zfNBikF5DJ63Gi2A9zEAXCFA7-dg_8_Sp1vJNH7rF79WWvuGL4zcoweOhjU2nvjd4t-9_PwE' },
  { id: 'u2', name: 'Sarah Jenkins', role: 'Installer', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg' },
  { id: 'u3', name: 'Mike Rivera', role: 'Technician', avatar: null },
];

const MOCK_PROJECTS = [
  { id: 'p1', name: 'PARKLAND ROYALE 60', address: '123 Parkland Blvd' },
  { id: 'p2', name: 'RIVER RUN', address: '88 River Way' },
  { id: 'p3', name: 'SOLSTICE', address: '990 Solstice Ave' },
];

const MOCK_UNITS = [
  { id: 'un1', lot: '42', block: 'B', model: '4093 RH', address: '123 Parkland Blvd', jobCount: 3, totalAmount: 4250.00 },
  { id: 'un2', lot: '43', block: 'B', model: '4093 LH', address: '125 Parkland Blvd', jobCount: 0, totalAmount: 0 },
  { id: 'un3', lot: '12', block: 'A', model: '3613 LH', address: '127 Parkland Blvd', jobCount: 1, totalAmount: 850.00 },
];

const MOCK_BUILDER_TASKS = [
  { id: 'bt1', name: 'Trim - 1st Floor', type: 'Production', estimatedCost: 1250.00 },
  { id: 'bt2', name: 'Trim - 2nd Floor', type: 'Production', estimatedCost: 980.00 },
  { id: 'bt3', name: 'Doors - Interior', type: 'Install', estimatedCost: 450.00 },
  { id: 'bt4', name: 'Hardware & Misc', type: 'Finish', estimatedCost: 220.00 },
];

const MOCK_INSTALL_COSTS = [
  { id: 'c1', name: 'INSTALL INTERIOR DOOR', rate: 45.00, totalQty: 12 },
  { id: 'c2', name: 'INSTALL BIFOLD DOOR', rate: 35.00, totalQty: 4 },
  { id: 'c3', name: 'INSTALL CASING', rate: 1.50, totalQty: 350 },
  { id: 'c4', name: 'INSTALL BASEBOARD', rate: 1.25, totalQty: 420 },
];

export const CommunityAssignJobModal: React.FC<CommunityAssignJobModalProps> = ({ isOpen, onClose, onJobCreated }) => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection State
  const [selectedUser, setSelectedUser] = useState<typeof MOCK_USERS[0] | null>(null);
  const [selectedProject, setSelectedProject] = useState<typeof MOCK_PROJECTS[0] | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<typeof MOCK_UNITS[0] | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null); // 'custom' or ID

  // Final Step State
  const [customTaskDetails, setCustomTaskDetails] = useState({ title: '', cost: '', description: '' });
  const [builderTaskQuantities, setBuilderTaskQuantities] = useState<Record<string, number>>({});
  const [jobDescription, setJobDescription] = useState('');
  const [isJobCompleted, setIsJobCompleted] = useState(false);

  // Derived
  const addonPercentage = 15; // Mock read-only addon
  const isCustomTask = selectedTask === 'custom';
  const activeTask = MOCK_BUILDER_TASKS.find(t => t.id === selectedTask);

  // Configuration check for Parkland Lot 42 Trim 1st Floor
  const isTaskUnconfigured = useMemo(() => {
    return selectedProject?.name === 'PARKLAND ROYALE 60' && 
           selectedUnit?.lot === '42' && 
           activeTask?.name === 'Trim - 1st Floor';
  }, [selectedProject, selectedUnit, activeTask]);

  // Hook moved to top before early return
  const maxPotentialValue = useMemo(() => {
    const baseMax = MOCK_INSTALL_COSTS.reduce((sum, cost) => sum + (cost.rate * cost.totalQty), 0);
    return baseMax + (baseMax * (addonPercentage / 100));
  }, [addonPercentage]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedUser(null);
      setSelectedProject(null);
      setSelectedUnit(null);
      setSelectedTask(null);
      setCustomTaskDetails({ title: '', cost: '', description: '' });
      setBuilderTaskQuantities({});
      setJobDescription('');
      setIsJobCompleted(false);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const calculateBuilderTotal = () => {
    let total = 0;
    MOCK_INSTALL_COSTS.forEach(cost => {
      const qty = builderTaskQuantities[cost.id] || 0;
      total += qty * cost.rate;
    });
    return total;
  };

  const builderSubtotal = calculateBuilderTotal();
  const builderAddonValue = builderSubtotal * (addonPercentage / 100);
  const builderGrandTotal = builderSubtotal + builderAddonValue;

  const handleConfirm = () => {
      if (onJobCreated) {
          onJobCreated({
              id: `JOB-${Date.now()}`,
              title: isCustomTask ? customTaskDetails.title : (activeTask?.name || 'New Job'),
              status: isJobCompleted ? JobStatus.Approved : JobStatus.Pending,
              builder: 'Lennar Homes',
              project: selectedProject?.name,
              unit: `Lot ${selectedUnit?.lot}, Blk ${selectedUnit?.block}`,
              date: new Date().toLocaleDateString(),
              amount: isCustomTask ? parseFloat(customTaskDetails.cost || '0') : builderGrandTotal,
              type: isCustomTask ? 'Custom' : 'Task',
              description: isCustomTask ? customTaskDetails.description : jobDescription
          });
      }
      onClose();
  };

  const handleSaveAsDraft = () => {
    // Logic to save as draft and notify admin/installer
    if (onJobCreated) {
        onJobCreated({
            id: `JOB-DRAFT-${Date.now()}`,
            title: activeTask?.name || 'New Job',
            status: 'Draft',
            builder: 'Lennar Homes',
            project: selectedProject?.name,
            unit: `Lot ${selectedUnit?.lot}, Blk ${selectedUnit?.block}`,
            date: new Date().toLocaleDateString(),
            amount: 0,
            type: 'Task'
        });
    }
    onClose();
  };

  const renderStep1_User = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input 
          autoFocus
          type="text" 
          placeholder="Search contractor..." 
          className="w-full pl-9 pr-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {MOCK_USERS.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
          <button
            key={user.id}
            onClick={() => { setSelectedUser(user); handleNext(); }}
            className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md ${selectedUser?.id === user.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
          >
            {user.avatar ? (
              <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-border" alt={user.name} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2_Project = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input 
          type="text" 
          placeholder="Search projects..." 
          className="w-full pl-9 pr-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
        />
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {MOCK_PROJECTS.map(project => (
          <button
            key={project.id}
            onClick={() => { setSelectedProject(project); handleNext(); }}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md ${selectedProject?.id === project.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
          >
            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
              <Building2 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{project.name}</p>
              <p className="text-xs text-muted-foreground">{project.address}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3_Unit = () => (
    <div className="space-y-4">
      <div className="bg-muted/30 p-3 rounded-lg border border-border text-xs flex items-center gap-2 mb-4">
        <Building2 size={14} className="text-primary" />
        <span className="font-semibold text-foreground">{selectedProject?.name}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
        {MOCK_UNITS.map(unit => (
          <button
            key={unit.id}
            onClick={() => { setSelectedUnit(unit); handleNext(); }}
            className={`flex flex-col gap-1 p-4 rounded-xl border text-left transition-all hover:shadow-md ${selectedUnit?.id === unit.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">Lot {unit.lot}</span>
              <span className="text-xs font-bold text-muted-foreground">Blk {unit.block}</span>
            </div>
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <Home size={14} className="text-primary" />
              {unit.model}
            </p>
            <p className="text-[10px] text-muted-foreground truncate mb-2">{unit.address}</p>
            
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Briefcase size={12} />
                    <span>{unit.jobCount} Jobs</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-foreground ml-auto">
                    <DollarSign size={12} className="text-primary" />
                    <span>${unit.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep4_Task = () => (
    <div className="space-y-2">
      <button
        onClick={() => { setSelectedTask('custom'); handleNext(); }}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed text-left transition-all group ${selectedTask === 'custom' ? 'border-primary bg-primary/5' : 'border-primary/30 hover:border-primary hover:bg-primary/5'}`}
      >
        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <PenTool size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-primary">Custom Task</p>
          <p className="text-xs text-muted-foreground">Create a one-off job with manual pricing</p>
        </div>
        <ChevronRight size={16} className="text-primary" />
      </button>

      <div className="h-px bg-border my-4 w-full" />

      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        {MOCK_BUILDER_TASKS.map(task => (
          <button
            key={task.id}
            onClick={() => { setSelectedTask(task.id); handleNext(); }}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md ${selectedTask === task.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
          >
            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
              <Layers size={20} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-foreground">{task.name}</p>
                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">
                        ${task.estimatedCost.toFixed(2)}
                    </span>
                </div>
              <p className="text-xs text-muted-foreground">{task.type}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep5_Configure = () => (
    <div className="space-y-6 h-full flex flex-col">
      {/* Summary Header */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
          <User size={12} /> {selectedUser?.name}
        </span>
        <span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
          <Building2 size={12} /> {selectedProject?.name}
        </span>
        <span className="px-2 py-1 bg-muted rounded border border-border text-muted-foreground flex items-center gap-1">
          <Home size={12} /> Lot {selectedUnit?.lot}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {isCustomTask ? (
          /* Custom Task Form */
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Task Title</label>
              <input 
                type="text" 
                className="w-full p-3 bg-background border border-border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Emergency Leak Repair"
                value={customTaskDetails.title}
                onChange={(e) => setCustomTaskDetails({...customTaskDetails, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Total Cost</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                  type="number" 
                  className="w-full pl-9 pr-4 py-3 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                  placeholder="0.00"
                  value={customTaskDetails.cost}
                  onChange={(e) => setCustomTaskDetails({...customTaskDetails, cost: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
              <textarea 
                className="w-full p-4 bg-background border border-border rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-primary outline-none resize-none"
                placeholder="Describe the work required..."
                value={customTaskDetails.description}
                onChange={(e) => setCustomTaskDetails({...customTaskDetails, description: e.target.value})}
              />
            </div>
          </div>
        ) : isTaskUnconfigured ? (
          /* Unconfigured Task Notice */
          <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 mb-6 shadow-sm">
                <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-amber-800 dark:text-amber-200 mb-2">Task Configuration Missing</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 max-w-sm mb-8 leading-relaxed">
              The task <strong>"{activeTask?.name}"</strong> for <strong>{selectedProject?.name}</strong> has not been configured in the global Install Costs yet.
            </p>
            
            <div className="w-full max-w-sm space-y-4">
                <button 
                    onClick={handleSaveAsDraft}
                    className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-base shadow-lg shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                    <Bell size={20} />
                    Request Configuration & Save Draft
                </button>
                <div className="flex items-start gap-2 text-left p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                        This will notify the Admin. Once configuration is complete, the job will move to "Pending" and {selectedUser?.name} will be alerted to start work.
                    </p>
                </div>
            </div>
          </div>
        ) : (
          /* Builder Task Form */
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">Total Install Estimate</span>
                    <span className="text-[10px] text-muted-foreground">Calculated based on max quantities</span>
                </div>
                <div className="text-2xl font-black text-primary">
                    ${maxPotentialValue.toFixed(2)}
                </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Install Costs</h3>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 w-28 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MOCK_INSTALL_COSTS.map(cost => {
                      const qty = builderTaskQuantities[cost.id] || 0;
                      return (
                        <tr key={cost.id} className="bg-card">
                          <td className="px-4 py-3 font-medium text-foreground">{cost.name}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">${cost.rate.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center bg-muted rounded-lg border border-border px-2 py-1">
                              <input 
                                type="number" 
                                className="w-full bg-transparent text-center font-bold text-foreground outline-none p-0 text-sm"
                                value={qty || ''}
                                onChange={(e) => setBuilderTaskQuantities({...builderTaskQuantities, [cost.id]: Number(e.target.value)})}
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">/ {cost.totalQty}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold">${(cost.rate * qty).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Job Description</label>
              <textarea 
                className="w-full p-4 bg-background border border-border rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-primary outline-none resize-none"
                placeholder="Additional instructions for the builder task..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-foreground">${builderSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add-on ({addonPercentage}%) <span className="text-[10px] bg-muted px-1 rounded border border-border text-muted-foreground">Read Only</span></span>
                <span className="font-bold text-foreground">${builderAddonValue.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground uppercase text-xs">Grand Total</span>
                <span className="font-black text-xl text-primary">${builderGrandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Job Completed Checkbox for both standard and custom tasks */}
        {!isTaskUnconfigured && (
            <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-start gap-4 cursor-pointer group hover:bg-muted/30 transition-all" onClick={() => setIsJobCompleted(!isJobCompleted)}>
                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isJobCompleted ? 'bg-primary border-primary' : 'bg-background border-border group-hover:border-primary/50'}`}>
                    {isJobCompleted && <Check size={14} className="text-primary-foreground" strokeWidth={4} />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Mark Job as Completed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Automatically moves this job to "Approved" and notifies the contractor for payment processing.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-card w-full max-w-2xl h-[85vh] md:h-auto md:max-h-[85vh] rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Assign New Job</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-muted'}`} />
              ))}
              <span className="text-xs font-medium text-muted-foreground ml-2">Step {step} of 5</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {step === 1 && (
            <div className="animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold mb-4">Select User</h3>
              {renderStep1_User()}
            </div>
          )}
          {step === 2 && (
            <div className="animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold mb-4">Select Project</h3>
              {renderStep2_Project()}
            </div>
          )}
          {step === 3 && (
            <div className="animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold mb-4">Select Unit</h3>
              {renderStep3_Unit()}
            </div>
          )}
          {step === 4 && (
            <div className="animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold mb-4">Select Task</h3>
              {renderStep4_Task()}
            </div>
          )}
          {step === 5 && (
            <div className="h-full flex flex-col animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold mb-4">Configure Job Details</h3>
              {renderStep5_Configure()}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-between items-center shrink-0">
          <button 
            onClick={step === 1 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === 1 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}
          </button>
          
          {step === 5 ? (
            !isTaskUnconfigured && (
                <button 
                    onClick={handleConfirm}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                >
                    <CheckCircle2 size={18} />
                    Confirm Assignment
                </button>
            )
          ) : (
            <button 
              onClick={handleNext}
              disabled={(step === 1 && !selectedUser) || (step === 2 && !selectedProject) || (step === 3 && !selectedUnit) || (step === 4 && !selectedTask)}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next Step <ChevronRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};