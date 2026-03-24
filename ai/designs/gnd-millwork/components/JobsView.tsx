import React from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreVertical, 
  ChevronDown,
  Calendar,
  Briefcase
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { JobStatus } from '../types';

interface JobsViewProps {
  onJobClick: (id: string) => void;
}

const jobsData = [
  { id: '#JOB-2201', title: 'Mobile UI Kit Refactor', description: 'App Design System Upgrade', contractor: 'Alex Thompson', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcNPhD3T1dk8PlbE0lbXMtQFFe3Y5-AF-UCxWhhFle4e5cJNK3GBXglm2oSJmibHiGSs2W0zZ66TZqnPZ0Na03GC-grMDS4m62Q5ZPvtJ-66Kzp2woHkYTPyfj0y07Gfhi4QRLK7h86sssxLlyL62CcWn7RYByDcCoYqK2c0CFZt-paZLmeyfccOSUyOvdXMqy2c6zfNBikF5DJ63Gi2A9zEAXCFA7-dg_8_Sp1vJNH7rF79WWvuGL4zcoweOhjU2nvjd4t-9_PwE', date: 'Oct 12, 2023', status: JobStatus.Approved, amount: 650.00 },
  { id: '#JOB-2204', title: 'Landing Page Icons', description: 'Asset creation for marketing site', contractor: 'Sarah Jenkins', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg', date: 'Oct 15, 2023', status: JobStatus.Approved, amount: 320.00 },
  { id: '#JOB-2207', title: 'Dashboard Layout V2', description: 'Internal analytics tool redesign', contractor: 'Marcus Richardson', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACChY-ddLoOKwUXEnI7q6fCjQxIBEeT2jeWiWgNZ1JlhKTT_bguuONlaLLTVm2eiDmBPXZz7gUKK9V3cqEhRxq46zZZ9yl0H7jYSnoSc_AxFLYF-1L9RTe8brFVyq36YIZt_5PF6MckDlvvXwwb_vkLmGJdJ4AOzXB3hjwTqBraIH9Jwz__ox-Tg-ksGofiWZCD6QOdhZl0b2z5WO4dVprsNeLqo6vUGslPZ6nVJR3OAWWwKJlZEVukfIF4KyH3O0gVYnBL9J2c0g', date: 'Oct 18, 2023', status: JobStatus.Pending, amount: 450.00 },
  { id: '#JOB-2209', title: 'React Migration', description: 'Legacy codebase update', contractor: 'David Chen', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg', date: 'Oct 20, 2023', status: JobStatus.Processing, amount: 1200.00 },
  { id: '#JOB-2210', title: 'API Integration', description: 'Stripe Connect implementation', contractor: 'Lila Vaughn', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACChY-ddLoOKwUXEnI7q6fCjQxIBEeT2jeWiWgNZ1JlhKTT_bguuONlaLLTVm2eiDmBPXZz7gUKK9V3cqEhRxq46zZZ9yl0H7jYSnoSc_AxFLYF-1L9RTe8brFVyq36YIZt_5PF6MckDlvvXwwb_vkLmGJdJ4AOzXB3hjwTqBraIH9Jwz__ox-Tg-ksGofiWZCD6QOdhZl0b2z5WO4dVprsNeLqo6vUGslPZ6nVJR3OAWWwKJlZEVukfIF4KyH3O0gVYnBL9J2c0g', date: 'Oct 21, 2023', status: JobStatus.Paid, amount: 850.00 },
];

export const JobsView: React.FC<JobsViewProps> = ({ onJobClick }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground">Jobs</h1>
                <p className="text-muted-foreground text-base">Manage all active, pending, and completed tasks.</p>
            </div>
            <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                    <Plus size={18} />
                    <span>Create Job</span>
                </button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl mb-6 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                    type="text" 
                    placeholder="Search jobs by ID, title, or contractor..." 
                    className="w-full pl-9 pr-4 py-2 bg-muted/50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary focus:bg-card transition-all"
                />
            </div>
            <div className="h-6 w-px bg-border mx-2"></div>
            <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-semibold text-foreground transition-colors">
                <Filter size={16} className="text-muted-foreground" />
                <span>Status</span>
                <ChevronDown size={14} className="text-muted-foreground ml-1" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-semibold text-foreground transition-colors">
                <Calendar size={16} className="text-muted-foreground" />
                <span>Date Range</span>
                <ChevronDown size={14} className="text-muted-foreground ml-1" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-semibold text-foreground transition-colors">
                <Download size={16} className="text-muted-foreground" />
                <span>Export</span>
            </button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
             <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Briefcase size={18} className="text-primary" />
                    All Jobs
                </h3>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">{jobsData.length} Total</span>
             </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/20 border-b border-border">
                        <th className="px-6 py-4 w-12">
                            <input type="checkbox" className="rounded border-border text-primary focus:ring-primary bg-transparent" />
                        </th>
                        <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Job ID</th>
                        <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                        <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Contractor</th>
                        <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                        <th className="px-4 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {jobsData.map((job) => (
                        <tr 
                            key={job.id} 
                            onClick={() => onJobClick(job.id)}
                            className="hover:bg-muted/20 transition-colors group cursor-pointer"
                        >
                            <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" className="rounded border-border text-primary focus:ring-primary bg-transparent" />
                            </td>
                            <td className="px-4 py-5 text-sm font-bold text-primary group-hover:underline">{job.id}</td>
                            <td className="px-4 py-5">
                                <p className="text-sm font-semibold text-foreground">{job.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{job.description}</p>
                            </td>
                            <td className="px-4 py-5">
                                <div className="flex items-center gap-3">
                                    <img src={job.avatar} alt={job.contractor} className="w-8 h-8 rounded-full border border-border object-cover" />
                                    <span className="text-sm font-semibold text-foreground">{job.contractor}</span>
                                </div>
                            </td>
                            <td className="px-4 py-5 text-sm text-muted-foreground font-medium">{job.date}</td>
                            <td className="px-4 py-5 text-center">
                                <Badge status={job.status} />
                            </td>
                            <td className="px-6 py-5 text-sm font-extrabold text-foreground text-right">${job.amount.toFixed(2)}</td>
                            <td className="px-4 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                                    <MoreVertical size={16} />
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination */}
            <div className="px-6 py-4 bg-muted/10 border-t border-border flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Showing 1 to {jobsData.length} of 142 records</p>
                <div className="flex gap-2">
                    <button className="px-3 py-1 text-xs font-bold rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50" disabled>Previous</button>
                    <button className="px-3 py-1 text-xs font-bold rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Next</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};