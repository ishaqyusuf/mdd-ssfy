import React, { useState } from 'react';
import { Badge } from './ui/Badge';
import { Filter, Download, PlusCircle, Trash2, ChevronRight, Send, X, CheckCircle2, User, Search, ArrowRight } from 'lucide-react';
import { Job, JobStatus, Adjustment, AdjustmentType } from '../types';
import { AddAdjustmentModal } from './AddAdjustmentModal';

const initialJobs: Job[] = [
  { id: '#JOB-2201', title: 'Mobile UI Kit Refactor', date: 'Oct 12, 2023', status: JobStatus.Approved, amount: 650.00 },
  { id: '#JOB-2204', title: 'Landing Page Icons', date: 'Oct 15, 2023', status: JobStatus.Approved, amount: 320.00 },
  { id: '#JOB-2207', title: 'Dashboard Layout V2', date: 'Oct 18, 2023', status: JobStatus.Pending, amount: 450.00 },
];

export const PayoutView: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([
    { id: '1', type: AdjustmentType.Bonus, description: 'Performance reward for Q3 project milestones.', amount: 200.00 },
    { id: '2', type: AdjustmentType.Expense, description: 'Round-trip Uber for on-site client discovery.', amount: 75.00 },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false); 
  const [selectedUser, setSelectedUser] = useState("Alex Thompson");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const toggleJob = (id: string) => {
    console.log('Toggled', id);
  };

  const addAdjustment = (type: AdjustmentType, amount: number, description: string) => {
    const newAdj: Adjustment = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      amount,
      description
    };
    setAdjustments([...adjustments, newAdj]);
  };

  const removeAdjustment = (id: string) => {
    setAdjustments(adjustments.filter(a => a.id !== id));
  };

  const subtotal = jobs.reduce((acc, job) => acc + job.amount, 0);
  const adjustmentTotal = adjustments.reduce((acc, adj) => {
    return adj.type === AdjustmentType.Deduction ? acc - adj.amount : acc + adj.amount;
  }, 0);
  const grandTotal = subtotal + adjustmentTotal;

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
        <div className="p-4 md:p-8 pb-4">
           {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
            <span className="hover:text-primary cursor-pointer transition-colors">Dashboard</span>
            <ChevronRight size={14} />
            <span className="hover:text-primary cursor-pointer transition-colors">Payout Management</span>
            <ChevronRight size={14} />
            <span className="text-foreground">Processing Payout</span>
          </div>
          
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 relative z-30">
            {/* User Selector */}
            <div className="flex-1 w-full max-w-2xl relative">
                <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Process Payout For:</label>
                <div className="relative group z-30">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <img 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcNPhD3T1dk8PlbE0lbXMtQFFe3Y5-AF-UCxWhhFle4e5cJNK3GBXglm2oSJmibHiGSs2W0zZ66TZqnPZ0Na03GC-grMDS4m62Q5ZPvtJ-66Kzp2woHkYTPyfj0y07Gfhi4QRLK7h86sssxLlyL62CcWn7RYByDcCoYqK2c0CFZt-paZLmeyfccOSUyOvdXMqy2c6zfNBikF5DJ63Gi2A9zEAXCFA7-dg_8_Sp1vJNH7rF79WWvuGL4zcoweOhjU2nvjd4t-9_PwE" 
                            alt="Selected User"
                            className="w-8 h-8 rounded-full border border-border object-cover"
                        />
                    </div>
                    <input 
                        className="w-full pl-14 pr-12 py-4 bg-card border border-border rounded-2xl text-xl font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm transition-all" 
                        placeholder="Search service provider..." 
                        type="text" 
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        onFocus={() => setIsUserSelectorOpen(true)}
                    />
                    <button 
                        onClick={() => setSelectedUser('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Dropdown Active State */}
                {isUserSelectorOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-[300px] md:max-h-[420px] overflow-y-auto">
                            <div className="p-3">
                                <div className="flex justify-between items-center px-3 py-2">
                                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recent</h4>
                                  <button onClick={() => setIsUserSelectorOpen(false)} className="md:hidden text-muted-foreground"><X size={16} /></button>
                                </div>
                                <div className="space-y-1">
                                    <button 
                                      onClick={() => { setSelectedUser("Alex Thompson"); setIsUserSelectorOpen(false); }}
                                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcNPhD3T1dk8PlbE0lbXMtQFFe3Y5-AF-UCxWhhFle4e5cJNK3GBXglm2oSJmibHiGSs2W0zZ66TZqnPZ0Na03GC-grMDS4m62Q5ZPvtJ-66Kzp2woHkYTPyfj0y07Gfhi4QRLK7h86sssxLlyL62CcWn7RYByDcCoYqK2c0CFZt-paZLmeyfccOSUyOvdXMqy2c6zfNBikF5DJ63Gi2A9zEAXCFA7-dg_8_Sp1vJNH7rF79WWvuGL4zcoweOhjU2nvjd4t-9_PwE" 
                                                className="w-10 h-10 rounded-full border border-primary/20 object-cover"
                                                alt="Alex"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-primary">Alex Thompson</p>
                                                <p className="text-[11px] font-medium text-primary/60">$1,695.00 pending</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="text-primary w-5 h-5" />
                                    </button>
                                    <button 
                                      onClick={() => { setSelectedUser("Sarah Jenkins"); setIsUserSelectorOpen(false); }}
                                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg" 
                                                className="w-10 h-10 rounded-full border border-border object-cover"
                                                alt="Sarah"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-foreground">Sarah Jenkins</p>
                                                <p className="text-[11px] font-medium text-muted-foreground">$1,240.00 pending</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                            <div className="p-3 pt-0">
                                <h4 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">All Contractors</h4>
                                <div className="space-y-1">
                                    <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted transition-all text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                                                <User className="text-muted-foreground w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">Marcus Richardson</p>
                                                <p className="text-[11px] font-medium text-muted-foreground">$850.00 pending</p>
                                            </div>
                                        </div>
                                    </button>
                                    <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted transition-all text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                                                <User className="text-muted-foreground w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">Lila Vaughn</p>
                                                <p className="text-[11px] font-medium text-muted-foreground">$2,100.00 pending</p>
                                            </div>
                                        </div>
                                    </button>
                                    <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted transition-all text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                                                <User className="text-muted-foreground w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">David Chen</p>
                                                <p className="text-[11px] font-medium text-muted-foreground">$0.00 pending</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 xl:pt-6 overflow-x-auto pb-2 scrollbar-none">
                <div className="flex -space-x-2 mr-2 flex-shrink-0">
                    <img className="w-8 h-8 rounded-full border-2 border-background object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg" alt="" />
                    <img className="w-8 h-8 rounded-full border-2 border-background object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuACChY-ddLoOKwUXEnI7q6fCjQxIBEeT2jeWiWgNZ1JlhKTT_bguuONlaLLTVm2eiDmBPXZz7gUKK9V3cqEhRxq46zZZ9yl0H7jYSnoSc_AxFLYF-1L9RTe8brFVyq36YIZt_5PF6MckDlvvXwwb_vkLmGJdJ4AOzXB3hjwTqBraIH9Jwz__ox-Tg-ksGofiWZCD6QOdhZl0b2z5WO4dVprsNeLqo6vUGslPZ6nVJR3OAWWwKJlZEVukfIF4KyH3O0gVYnBL9J2c0g" alt="" />
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-foreground flex items-center justify-center text-[10px] font-bold text-background">+9</div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-bold hover:shadow-sm transition-all text-foreground whitespace-nowrap">
                    <Filter size={18} />
                    Filter
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-bold hover:shadow-sm transition-all text-foreground whitespace-nowrap">
                    <Download size={18} />
                    Export
                </button>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 md:px-8 py-4 overflow-y-auto pb-24 lg:pb-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
             <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    Jobs Pending Payout
                </h3>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">3 Selected</span>
             </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="px-6 py-4 w-12">
                      <input type="checkbox" className="rounded border-border text-primary focus:ring-primary bg-transparent" defaultChecked />
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Job ID</th>
                    <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-5">
                        <input type="checkbox" className="rounded border-border text-primary focus:ring-primary bg-transparent" defaultChecked onChange={() => toggleJob(job.id)} />
                      </td>
                      <td className="px-4 py-5 text-sm font-bold text-primary group-hover:underline cursor-pointer">{job.id}</td>
                      <td className="px-4 py-5">
                          <p className="text-sm font-semibold text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Development & Design</p>
                      </td>
                      <td className="px-4 py-5 text-sm text-muted-foreground font-medium">{job.date}</td>
                      <td className="px-4 py-5 text-center">
                        <Badge status={job.status} />
                      </td>
                      <td className="px-6 py-5 text-sm font-extrabold text-foreground text-right">${job.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Action Bar */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border z-30">
            <button 
                onClick={() => setIsSummaryOpen(true)}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-black text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
                <span>Proceed to Summary</span>
                <span className="bg-primary-foreground/20 px-2 py-0.5 rounded text-sm">${grandTotal.toFixed(2)}</span>
                <ArrowRight size={20} />
            </button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSummaryOpen && (
        <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsSummaryOpen(false)}
        />
      )}

      {/* Right Sidebar - Payout Summary */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-full md:w-[480px] lg:w-[440px] bg-card border-l border-border flex flex-col h-full shadow-2xl lg:shadow-none
        transform transition-transform duration-300 ease-in-out lg:transform-none lg:static
        ${isSummaryOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6 md:p-8 border-b border-border flex justify-between items-start">
          <div>
            <h3 className="text-foreground text-2xl font-black tracking-tight">Payout Summary</h3>
            <p className="text-muted-foreground text-sm mt-1">Reviewing final earnings & adjustments</p>
          </div>
          <button 
            onClick={() => setIsSummaryOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground p-1"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-6 md:p-8 space-y-10 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm font-bold">Job Subtotal ({jobs.length} selected)</span>
              <span className="text-foreground text-sm font-black">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm font-bold">Total Adjustments</span>
              <span className={`text-sm font-black ${adjustmentTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {adjustmentTotal >= 0 ? '+' : ''}${adjustmentTotal.toFixed(2)}
              </span>
            </div>
            <div className="h-px bg-border my-4"></div>
            <div className="flex justify-between items-end">
              <div>
                 <span className="block text-xs font-black text-muted-foreground uppercase tracking-widest">Total to Pay</span>
                 <span className="text-foreground font-black text-3xl tracking-tight">${grandTotal.toFixed(2)}</span>
              </div>
              <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded uppercase">Stripe Ready</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Detailed Adjustments</h4>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-primary text-xs font-bold hover:bg-primary/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <PlusCircle size={14} /> Add New
              </button>
            </div>

            <div className="space-y-4">
              {adjustments.map((adj) => (
                <div key={adj.id} className="p-5 bg-muted/40 rounded-2xl border border-border relative group transition-all hover:shadow-md">
                  <button 
                    onClick={() => removeAdjustment(adj.id)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors" 
                    title="Delete adjustment"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        {adj.type === AdjustmentType.Bonus && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/10 text-primary tracking-widest">Bonus</span>}
                        {adj.type === AdjustmentType.Expense && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-100 text-green-700 tracking-widest">Expense</span>}
                        {adj.type === AdjustmentType.Deduction && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700 tracking-widest">Deduction</span>}
                    </div>
                    <div>
                        <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Description</h5>
                        <p className="text-sm font-semibold text-foreground leading-snug pr-8">{adj.description}</p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border/50">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">Amount</span>
                      <span className={`text-base font-black ${adj.type === AdjustmentType.Deduction ? 'text-destructive' : 'text-foreground'}`}>
                        {adj.type === AdjustmentType.Deduction ? '-' : '+'}${adj.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-foreground text-sm font-bold">Internal Payout Note</h4>
            <textarea 
                className="w-full h-24 p-4 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder:text-muted-foreground" 
                placeholder="Optional internal reason for this payout..."
            />
          </div>
        </div>

        <div className="p-6 md:p-8 bg-card border-t border-border shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
            <button className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-black text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 group">
                <Send size={24} className="group-hover:translate-x-1 transition-transform" />
                Release ${grandTotal.toFixed(2)}
            </button>
            <p className="text-[10px] text-center text-muted-foreground mt-5 leading-relaxed font-bold uppercase tracking-wider">
                Payout will be disbursed to Alex Thompson immediately via Stripe Connect
            </p>
        </div>
      </aside>

      <AddAdjustmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={addAdjustment} 
      />
    </div>
  );
};