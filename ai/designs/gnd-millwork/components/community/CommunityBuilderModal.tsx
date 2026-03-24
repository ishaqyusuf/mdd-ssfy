import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, Check, Save, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  isProduction: boolean;
  isInstallation: boolean;
  isInvoice: boolean;
  addonPercentage: number;
}

interface CommunityBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  builder?: { id: string; name: string; isLegacy?: boolean; } | null;
}

export const CommunityBuilderModal: React.FC<CommunityBuilderModalProps> = ({ isOpen, onClose, builder }) => {
  const [builderTitle, setBuilderTitle] = useState('');
  const [showLegacyUpgrade, setShowLegacyUpgrade] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Trim - 1st Floor', isProduction: true, isInstallation: true, isInvoice: true, addonPercentage: 15 },
    { id: '2', title: 'Doors - Interior', isProduction: true, isInstallation: true, isInvoice: true, addonPercentage: 15 },
    { id: '3', title: 'Hardware & Misc', isProduction: false, isInstallation: true, isInvoice: false, addonPercentage: 0 },
  ]);

  // Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [deleteVerificationInput, setDeleteVerificationInput] = useState('');

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (builder) {
            setBuilderTitle(builder.name);
            // Check for legacy flag
            if (builder.isLegacy) {
                setShowLegacyUpgrade(true);
            } else {
                setShowLegacyUpgrade(false);
            }
        } else {
            setBuilderTitle('');
            setShowLegacyUpgrade(false);
        }
        setTaskToDelete(null);
        setDeleteVerificationInput('');
    }
  }, [isOpen, builder]);

  if (!isOpen) return null;

  const handleAddTask = () => {
    const newTask: TaskItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      isProduction: false,
      isInstallation: false,
      isInvoice: false,
      addonPercentage: 0,
    };
    setTasks([...tasks, newTask]);
  };

  const initiateDeleteTask = (task: TaskItem) => {
    setTaskToDelete(task);
    setDeleteVerificationInput('');
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      setTasks(tasks.filter(t => t.id !== taskToDelete.id));
      setTaskToDelete(null);
      setDeleteVerificationInput('');
    }
  };

  const cancelDeleteTask = () => {
    setTaskToDelete(null);
    setDeleteVerificationInput('');
  };

  const updateTask = (id: string, field: keyof TaskItem, value: any) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // Drag Sorting Logic
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    // Duplicate items
    const _tasks = [...tasks];
    
    // Remove and save the dragged item content
    const draggedItemContent = _tasks.splice(dragItem.current, 1)[0];
    
    // Switch the position
    _tasks.splice(dragOverItem.current, 0, draggedItemContent);
    
    // Reset position refs
    dragItem.current = null;
    dragOverItem.current = null;
    
    // Update actual array
    setTasks(_tasks);
  };

  const handleLegacyUpdate = () => {
      // In a real app, this would trigger an API call to migrate data
      setShowLegacyUpgrade(false);
  };

  const verificationText = taskToDelete?.title ? taskToDelete.title : 'delete';
  const isDeleteMatch = deleteVerificationInput === verificationText;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-background w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">{builder ? 'Edit Builder Configuration' : 'New Builder Configuration'}</h2>
            <p className="text-sm text-muted-foreground">Define builder details and standard task templates.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {showLegacyUpgrade ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-card">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={40} strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Legacy Configuration Detected</h3>
                <p className="text-muted-foreground max-w-md mb-8">
                    This builder is currently using the old task configuration system (v1). To edit details and enable new features like granular pricing and automated invoicing, you must upgrade to the new system (v2).
                </p>
                
                <div className="flex flex-col gap-3 w-full max-w-sm">
                    <button 
                        onClick={handleLegacyUpdate}
                        className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={20} />
                        Auto-Update to New System
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-3 text-muted-foreground hover:text-foreground font-semibold text-sm hover:bg-muted rounded-lg transition-colors"
                    >
                        Cancel and Go Back
                    </button>
                </div>
            </div>
        ) : (
            <>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Builder Title Section */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-foreground uppercase tracking-wide">Builder Information</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Builder Name / Title</label>
                        <input 
                        type="text" 
                        value={builderTitle}
                        onChange={(e) => setBuilderTitle(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                        placeholder="e.g. Lennar Homes - South Division"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Code / ID (Optional)</label>
                        <input 
                        type="text" 
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                        placeholder="e.g. BLD-008"
                        />
                    </div>
                    </div>
                </div>

                <div className="h-px bg-border w-full"></div>

                {/* Task List Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-foreground uppercase tracking-wide">Standard Task Template</label>
                    <button 
                        onClick={handleAddTask}
                        className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                        <Plus size={14} /> Add Task Line
                    </button>
                    </div>

                    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-1 text-center">Order</div>
                        <div className="col-span-5">Task Title</div>
                        <div className="col-span-2 text-center">Add-on %</div>
                        <div className="col-span-3 grid grid-cols-3 text-center">
                        <span>Prod</span>
                        <span>Inst</span>
                        <span>Inv</span>
                        </div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>

                    {/* Sortable List */}
                    <div className="divide-y divide-border bg-background">
                        {tasks.map((task, index) => (
                        <div 
                            key={task.id}
                            draggable
                            onDragStart={() => (dragItem.current = index)}
                            onDragEnter={() => (dragOverItem.current = index)}
                            onDragEnd={handleSort}
                            onDragOver={(e) => e.preventDefault()}
                            className="grid grid-cols-12 gap-4 items-center px-4 py-3 group hover:bg-muted/20 transition-colors cursor-move"
                        >
                            {/* Drag Handle */}
                            <div className="col-span-1 flex justify-center text-muted-foreground cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                            </div>

                            {/* Title Input */}
                            <div className="col-span-5">
                            <input 
                                type="text" 
                                value={task.title}
                                onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                                placeholder="Task description..."
                                className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0 placeholder:text-muted-foreground/40"
                            />
                            </div>

                            {/* Add-on Percentage Input */}
                            <div className="col-span-2 flex justify-center">
                            <div className="relative w-20">
                                <input 
                                type="number" 
                                value={task.addonPercentage} 
                                onChange={(e) => updateTask(task.id, 'addonPercentage', parseFloat(e.target.value))}
                                className="w-full bg-background border border-input rounded-md px-2 py-1 text-sm text-center focus:ring-1 focus:ring-primary outline-none"
                                min="0"
                                max="100"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                            </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="col-span-3 grid grid-cols-3 justify-items-center items-center">
                            <label className="relative flex items-center justify-center cursor-pointer p-2">
                                <input 
                                type="checkbox" 
                                checked={task.isProduction}
                                onChange={(e) => updateTask(task.id, 'isProduction', e.target.checked)}
                                className="peer appearance-none h-4 w-4 border border-input rounded bg-background checked:bg-primary checked:border-primary transition-all"
                                />
                                <Check size={10} className="absolute text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                            </label>
                            
                            <label className="relative flex items-center justify-center cursor-pointer p-2">
                                <input 
                                type="checkbox" 
                                checked={task.isInstallation}
                                onChange={(e) => updateTask(task.id, 'isInstallation', e.target.checked)}
                                className="peer appearance-none h-4 w-4 border border-input rounded bg-background checked:bg-primary checked:border-primary transition-all"
                                />
                                <Check size={10} className="absolute text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                            </label>

                            <label className="relative flex items-center justify-center cursor-pointer p-2">
                                <input 
                                type="checkbox" 
                                checked={task.isInvoice}
                                onChange={(e) => updateTask(task.id, 'isInvoice', e.target.checked)}
                                className="peer appearance-none h-4 w-4 border border-input rounded bg-background checked:bg-primary checked:border-primary transition-all"
                                />
                                <Check size={10} className="absolute text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                            </label>
                            </div>

                            {/* Delete Action */}
                            <div className="col-span-1 text-right">
                            <button 
                                onClick={() => initiateDeleteTask(task)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                            </div>
                        </div>
                        ))}
                        
                        {tasks.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-sm border-dashed">
                            No tasks defined. Click "Add Task Line" to begin.
                        </div>
                        )}
                    </div>
                    
                    {/* Footer of List */}
                    <div className="p-2 bg-muted/20 border-t border-border">
                        <button 
                            onClick={handleAddTask}
                            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-background rounded-lg border border-transparent hover:border-border transition-all"
                        >
                            <Plus size={14} /> Add New Line
                        </button>
                    </div>
                    </div>
                </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-muted/20 border-t border-border flex justify-end gap-3 shrink-0">
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg border border-border bg-background text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 flex items-center gap-2 transition-all"
                >
                    <Save size={16} />
                    Save Builder
                </button>
                </div>
            </>
        )}

        {/* Delete Confirmation Modal Overlay */}
        {taskToDelete && (
            <div className="absolute inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div 
                  className="bg-card w-full max-sm rounded-xl shadow-2xl border border-border p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 ring-1 ring-destructive/10"
                  onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-2 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Delete Task?</h3>
                        <p className="text-sm text-muted-foreground">
                            This action cannot be undone. To confirm, please type <span className="font-bold text-foreground select-none">"{verificationText}"</span> below.
                        </p>
                    </div>
                    
                    <input 
                        type="text"
                        value={deleteVerificationInput}
                        onChange={(e) => setDeleteVerificationInput(e.target.value)}
                        placeholder={`Type "${verificationText}" to confirm`}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-destructive outline-none font-medium"
                        autoFocus
                    />

                    <div className="flex gap-3 mt-2">
                        <button 
                            onClick={cancelDeleteTask}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-bold hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDeleteTask}
                            disabled={!isDeleteMatch}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            Delete Task
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};