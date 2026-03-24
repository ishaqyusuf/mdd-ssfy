import React from 'react';
import { Badge } from './ui/Badge';
import { Printer, Edit3, CheckCircle, Send, PlusCircle, CreditCard, ChevronRight, Settings, ArrowLeft } from 'lucide-react';

interface JobDetailsViewProps {
  onBack?: () => void;
  jobId?: string;
}

export const JobDetailsView: React.FC<JobDetailsViewProps> = ({ onBack, jobId = '#12345' }) => {
  return (
    <div className="flex-1 bg-background overflow-y-auto h-full p-4 sm:p-8">
      <nav className="flex items-center gap-2 text-sm mb-6 text-muted-foreground">
        <a className="hover:text-primary transition-colors cursor-pointer">Dashboard</a>
        <ChevronRight size={12} />
        <a 
          className="hover:text-primary transition-colors cursor-pointer"
          onClick={onBack}
        >
            Jobs
        </a>
        <ChevronRight size={12} />
        <span className="text-foreground font-medium">Job {jobId}</span>
      </nav>

      {onBack && (
        <button 
          onClick={onBack} 
          className="mb-6 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Jobs
        </button>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-foreground">Job {jobId}: Door Installation & Site Prep</h1>
            <Badge status="Paid" />
          </div>
          <p className="text-muted-foreground">Multi-unit installation project for residential complex.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-bold hover:bg-muted transition-colors text-foreground">
            <Printer size={18} /> Print Details
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            <Edit3 size={18} /> Edit Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Amount', value: '$1,250.00' },
          { label: 'Date Created', value: 'Oct 24, 2023' },
          { label: 'Requested By', value: 'Jane Smith', hasAvatar: true },
          { label: 'Job Type', value: 'Custom', icon: '✨' },
        ].map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">{stat.label}</p>
              <div className="flex items-center gap-2">
                 {stat.icon && <span className="text-xl">{stat.icon}</span>}
                 <p className="text-2xl font-black text-foreground">{stat.value}</p>
              </div>
            </div>
            {stat.hasAvatar && (
                 <img className="h-10 w-10 rounded-full ring-2 ring-primary/20" src="https://picsum.photos/id/1027/200/200" alt="Avatar" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm mb-8 overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2 text-foreground">
             Tasks
          </h2>
          <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">3 ITEMS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Task</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground text-center">Qty</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Rate</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: 'Interior Door Installation', qty: 4, rate: 150, cost: 600 },
                { name: 'Bifold Closet Door', qty: 2, rate: 225, cost: 450 },
                { name: 'Attic Access Door', qty: 1, rate: 150, cost: 150 },
              ].map((task, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                     <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground">#</div>
                     <span className="font-bold text-foreground">{task.name}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-foreground">{task.qty}</td>
                  <td className="px-6 py-4 text-right font-medium text-foreground">${task.rate.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-black text-foreground">${task.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-muted/20">
                  <td className="px-6 py-4 text-right font-bold text-muted-foreground" colSpan={3}>Subtotal:</td>
                  <td className="px-6 py-4 text-right font-black text-foreground">$1,200.00</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <div className="lg:col-span-2">
           <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2 text-foreground">
                 Activity Timeline
              </h2>
              <div className="relative space-y-8 before:absolute before:inset-0 before:left-6 before:h-full before:w-0.5 before:bg-border before:content-['']">
                
                {/* Timeline Item 1 */}
                <div className="relative pl-14">
                  <div className="absolute left-0 top-1 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                    <CreditCard size={20} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                     <h3 className="text-lg font-bold text-foreground">Payout Processed</h3>
                     <time className="text-sm text-muted-foreground">Oct 23, 04:00 PM</time>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-sm font-semibold text-foreground">Financial Bot</span>
                     <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">Automated</span>
                  </div>
                  <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
                     The final payout of $1,250.00 has been successfully initiated via Stripe Connect. Transaction ID: TXN_882910.
                  </p>
                </div>

                 {/* Timeline Item 2 */}
                <div className="relative pl-14">
                  <div className="absolute left-0 top-1 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/20">
                    <CheckCircle size={20} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                     <h3 className="text-lg font-bold text-foreground">Approved</h3>
                     <time className="text-sm text-muted-foreground">Oct 22, 09:00 AM</time>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-sm font-semibold text-foreground">Admin Mark</span>
                  </div>
                  <p className="text-muted-foreground">
                     Milestone review completed. Quality assurance passed all criteria.
                  </p>
                </div>

                 {/* Timeline Item 3 */}
                <div className="relative pl-14">
                  <div className="absolute left-0 top-1 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Send size={20} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                     <h3 className="text-lg font-bold text-foreground">Submitted</h3>
                     <time className="text-sm text-muted-foreground">Oct 21, 02:30 PM</time>
                  </div>
                  <p className="text-muted-foreground">
                     All site photos and installation logs uploaded.
                  </p>
                </div>

                 {/* Timeline Item 4 */}
                <div className="relative pl-14">
                  <div className="absolute left-0 top-1 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <PlusCircle size={20} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                     <h3 className="text-lg font-bold text-foreground">Job Created</h3>
                     <time className="text-sm text-muted-foreground">Oct 20, 10:00 AM</time>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                     <Settings size={14} />
                     <span className="text-sm font-semibold text-foreground">System</span>
                  </div>
                  <p className="text-muted-foreground">
                    Job automatically created via the work order intake system.
                  </p>
                </div>
              </div>
           </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="bg-primary p-4 text-primary-foreground flex items-center justify-between">
                   <h3 className="font-bold">Payment Details</h3>
                   <CreditCard size={20} />
                </div>
                <div className="p-6 space-y-4 text-foreground">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Payment ID</span>
                        <span className="font-mono font-bold">PAY-99812</span>
                    </div>
                    <div className="h-px bg-border"></div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Processing Fees</span>
                        <span className="font-bold">$50.00</span>
                    </div>
                     <div className="pt-4 border-t-2 border-dashed border-border flex justify-between items-center">
                        <span className="font-black text-lg">Total</span>
                        <span className="font-black text-2xl text-primary">$1,250.00</span>
                    </div>
                </div>
            </div>
            
             <div className="bg-muted/30 rounded-xl border border-border p-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Additional Meta</h4>
                <div className="space-y-3">
                   <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Department</span>
                      <span className="text-sm font-bold text-foreground">Facilities Management</span>
                   </div>
                   <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Priority</span>
                      <div className="flex items-center gap-1.5">
                         <span className="h-2 w-2 rounded-full bg-red-500"></span>
                         <span className="text-sm font-bold text-red-600">High</span>
                      </div>
                   </div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};