import React from 'react';
import { 
  Download, 
  Plus, 
  Wallet, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Landmark, 
  MoreVertical,
  FileText,
  PenTool,
  Terminal,
  Languages
} from 'lucide-react';
import { Badge } from './ui/Badge';

export const WorkerOverview: React.FC = () => {
  return (
    <div className="flex-1 bg-background overflow-y-auto h-full p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back, Alex</h2>
          <p className="text-muted-foreground text-base">Here's a summary of your active jobs and processing payments.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-semibold flex items-center gap-2 text-foreground hover:bg-muted transition-colors">
            <Download size={18} />
            Export PDF
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            <Plus size={18} />
            Submit New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 pb-12">
        {/* Stats Cards */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Wallet size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Pending</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Pending Payout</p>
            <p className="text-2xl font-bold text-foreground mt-1">$1,240.00</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-green-500/10 p-2 rounded-lg text-green-600">
                <CheckCircle size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Completed Jobs</p>
            <p className="text-2xl font-bold text-foreground mt-1">24</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <div className="bg-amber-500/10 p-2 rounded-lg text-amber-600">
                <Clock size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Active Jobs</p>
            <p className="text-2xl font-bold text-foreground mt-1">5</p>
          </div>
        </div>

        {/* Upcoming Payout Card */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-primary p-6 rounded-xl border border-primary/20 shadow-lg shadow-primary/10 text-primary-foreground h-full relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-primary-foreground/80 text-sm font-bold uppercase tracking-widest mb-1">Upcoming Payout</h3>
              <p className="text-3xl font-black mb-4">$842.50</p>
              <div className="space-y-4 pt-4 border-t border-primary-foreground/20">
                <div className="flex items-center gap-3">
                  <Calendar className="opacity-80" size={20} />
                  <div>
                    <p className="text-xs text-primary-foreground/70">Scheduled Date</p>
                    <p className="text-sm font-semibold">Friday, Oct 15, 2023</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Landmark className="opacity-80" size={20} />
                  <div>
                    <p className="text-xs text-primary-foreground/70">Bank Account</p>
                    <p className="text-sm font-semibold">Chase Checking (....4829)</p>
                  </div>
                </div>
              </div>
            </div>
             {/* Decorative circles */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div className="col-span-12">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-foreground text-lg font-bold">Recent Job Submissions</h3>
              <button className="text-primary text-sm font-semibold hover:underline">View All History</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date Submitted</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Earnings</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { title: 'Content Localization - DE', id: '#LOC-28491', date: 'Oct 12, 2023', earnings: 240.00, status: 'Paid', icon: FileText },
                    { title: 'UI Design Review - Phase 2', id: '#DSG-11029', date: 'Oct 11, 2023', earnings: 115.00, status: 'Approved', icon: PenTool },
                    { title: 'Bug Regression Testing', id: '#QA-99021', date: 'Oct 10, 2023', earnings: 85.00, status: 'Submitted', icon: Terminal },
                    { title: 'Translation: EN to ES', id: '#LOC-28492', date: 'Oct 09, 2023', earnings: 160.00, status: 'Paid', icon: Languages },
                  ].map((job, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted size-9 rounded flex items-center justify-center text-muted-foreground">
                            <job.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-none">{job.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">Project ID: {job.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">{job.date}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-foreground">${job.earnings.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={job.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
