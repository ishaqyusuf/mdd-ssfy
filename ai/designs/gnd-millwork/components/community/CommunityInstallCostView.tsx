
import React, { useState, useRef } from 'react';
import { Move, Trash2, Plus, ArrowLeft, Save, GripVertical } from 'lucide-react';

interface InstallTask {
  id: string;
  title: string;
  cost: number;
  defaultQty: number;
  punchout: boolean;
}

interface CommunityInstallCostViewProps {
  onBack: () => void;
}

const INITIAL_TASKS: InstallTask[] = [
  { id: '1', title: 'INSTALL INTERIOR DOOR', cost: 45.00, defaultQty: 50, punchout: false },
  { id: '2', title: 'INSTALL EXTERIOR DOOR', cost: 85.00, defaultQty: 10, punchout: false },
  { id: '3', title: 'INSTALL BIFOLD DOOR', cost: 35.00, defaultQty: 20, punchout: false },
  { id: '4', title: 'INSTALL WINDOW CASING', cost: 1.50, defaultQty: 500, punchout: true },
  { id: '5', title: 'INSTALL BASEBOARD', cost: 1.25, defaultQty: 1000, punchout: true },
  { id: '6', title: 'INSTALL CROWN MOULDING', cost: 2.50, defaultQty: 400, punchout: false },
  { id: '7', title: 'INSTALL CHAIR RAIL', cost: 1.15, defaultQty: 200, punchout: false },
  { id: '8', title: 'INSTALL WAINSCOTING', cost: 4.50, defaultQty: 100, punchout: false },
  { id: '9', title: 'INSTALL HARDWARE - PASSAGE', cost: 12.00, defaultQty: 30, punchout: false },
  { id: '10', title: 'INSTALL HARDWARE - PRIVACY', cost: 12.00, defaultQty: 15, punchout: false },
  { id: '11', title: 'INSTALL HARDWARE - ENTRY', cost: 45.00, defaultQty: 5, punchout: false },
  { id: '12', title: 'INSTALL DOOR STOP', cost: 2.50, defaultQty: 50, punchout: true },
  { id: '13', title: 'INSTALL ATTIC STAIRS', cost: 120.00, defaultQty: 1, punchout: false },
  { id: '14', title: 'INSTALL SHELVING', cost: 15.00, defaultQty: 40, punchout: false },
  { id: '15', title: 'INSTALL CABINETS - UPPER', cost: 45.00, defaultQty: 10, punchout: false },
  { id: '16', title: 'INSTALL CABINETS - LOWER', cost: 45.00, defaultQty: 10, punchout: false },
  { id: '17', title: 'PUNCHOUT LABOR', cost: 65.00, defaultQty: 8, punchout: true },
  { id: '18', title: 'TRASH REMOVAL', cost: 150.00, defaultQty: 1, punchout: false },
  { id: '19', title: 'DELIVERY FEE', cost: 75.00, defaultQty: 1, punchout: false },
  { id: '20', title: 'MISC LABOR', cost: 55.00, defaultQty: 4, punchout: true },
];

export const CommunityInstallCostView: React.FC<CommunityInstallCostViewProps> = ({ onBack }) => {
  const [tasks, setTasks] = useState<InstallTask[]>(INITIAL_TASKS);
  
  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleAddTask = () => {
    const newTask: InstallTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      cost: 0,
      defaultQty: 0,
      punchout: false,
    };
    setTasks([...tasks, newTask]);
  };

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof InstallTask, value: any) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // Sorting Logic
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const _tasks = [...tasks];
    const draggedItemContent = _tasks.splice(dragItem.current, 1)[0];
    _tasks.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    setTasks(_tasks);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="px-8 py-6 w-full max-w-[1200px] mx-auto flex flex-col h-full">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
                onClick={onBack}
                className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="space-y-0.5">
                <h2 className="text-xl font-bold capitalize tracking-tight sm:text-2xl text-foreground">Install Cost Price</h2>
                <p className="text-sm text-muted-foreground">Manage labor rates and task configuration.</p>
            </div>
          </div>
          <button 
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow px-4 py-2 h-8"
          >
            Save
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl">
                <div role="list" className="w-full">
                    {/* Table Header */}
                    <div className="grid w-full grid-cols-11 sticky top-0 z-10 shadow-sm">
                        <div className="col-span-6 border bg-slate-200 dark:bg-muted p-0.5 px-2 flex items-center">
                            <label className="text-sm font-medium leading-none text-slate-700 dark:text-muted-foreground">Task</label>
                        </div>
                        <div className="col-span-2 border bg-slate-200 dark:bg-muted p-0.5 px-2 flex items-center">
                            <label className="text-sm font-medium leading-none text-slate-700 dark:text-muted-foreground">Cost</label>
                        </div>
                        <div className="col-span-1 border bg-slate-200 dark:bg-muted p-0.5 px-2 flex items-center">
                            <label className="text-sm font-medium leading-none text-slate-700 dark:text-muted-foreground">Max Qty</label>
                        </div>
                        <div className="col-span-1 border bg-slate-200 dark:bg-muted p-0.5 px-2 flex items-center justify-center">
                            <label className="text-sm font-medium leading-none text-slate-700 dark:text-muted-foreground">Punchout</label>
                        </div>
                        <div className="col-span-1 border bg-slate-200 dark:bg-muted p-0.5 px-2"></div>
                    </div>

                    {/* Table Rows */}
                    <div className="bg-card">
                        {tasks.map((task, index) => (
                            <div 
                                key={task.id}
                                draggable
                                onDragStart={() => (dragItem.current = index)}
                                onDragEnter={() => (dragOverItem.current = index)}
                                onDragEnd={handleSort}
                                onDragOver={(e) => e.preventDefault()}
                                className="group grid w-full grid-cols-11 items-center bg-background hover:bg-muted/20 transition-colors"
                            >
                                <div className="col-span-6 border border-t-0 border-r-0 border-l-0 border-border">
                                    <input 
                                        className="flex w-full bg-transparent px-3 py-1 text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 h-7 border-transparent uppercase" 
                                        type="text" 
                                        value={task.title}
                                        onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                                        placeholder="ENTER TASK NAME"
                                    />
                                </div>
                                <div className="col-span-2 border border-t-0 border-r-0 border-border">
                                    <input 
                                        className="flex w-full bg-transparent px-3 py-1 text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 h-7 border-transparent uppercase" 
                                        type="number" 
                                        value={task.cost}
                                        onChange={(e) => updateTask(task.id, 'cost', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-1 border border-t-0 border-r-0 border-border">
                                    <input 
                                        className="flex w-full bg-transparent px-3 py-1 text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 h-7 border-transparent uppercase" 
                                        type="number" 
                                        value={task.defaultQty}
                                        onChange={(e) => updateTask(task.id, 'defaultQty', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-1 flex h-7 justify-center items-center border border-t-0 border-r-0 border-border">
                                    <input 
                                        type="checkbox"
                                        checked={task.punchout}
                                        onChange={(e) => updateTask(task.id, 'punchout', e.target.checked)}
                                        className="h-4 w-4 shrink-0 rounded border-primary text-primary focus:ring-primary cursor-pointer accent-primary"
                                    />
                                </div>
                                <div className="col-span-1 flex h-7 items-center justify-end space-x-1 border border-t-0 border-l-0 border-border px-2">
                                    <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-muted-foreground hover:text-foreground transition-colors">
                                        <GripVertical size={16} />
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveTask(task.id)}
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-6 w-6 text-slate-300 group-hover:text-destructive"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleAddTask}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 mt-1 h-7 w-full shadow-sm border border-border"
                >
                    <Plus size={14} />
                    <span>Add Line</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
