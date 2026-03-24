
import React, { useState } from 'react';
import { Search, Filter, Briefcase, MapPin, Calendar, MoreVertical, Plus, Layers, PenTool } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { JobStatus } from '../../types';
import { CommunityAssignJobModal } from './CommunityAssignJobModal';
import { CommunityJobDetailView } from './CommunityJobDetailView';

// Extended mock data for Community context with 'type'
const INITIAL_MOCK_JOBS = [
  { 
    id: 'JOB-5921', 
    title: 'Trim Installation - Phase 1', 
    type: 'Task',
    builder: 'Lennar Homes', 
    project: 'PARKLAND ROYALE 60', 
    unit: 'Lot 42, Block B',
    date: 'Oct 24, 2023', 
    status: JobStatus.Approved, 
    amount: 1250.00 
  },
  { 
    id: 'JOB-5922', 
    title: 'Exterior Door Install', 
    type: 'Task',
    builder: 'Mattamy Homes', 
    project: 'RIVER RUN', 
    unit: 'Unit 105',
    date: 'Oct 25, 2023', 
    status: JobStatus.Pending, 
    amount: 450.00 
  },
  { 
    id: 'JOB-5923', 
    title: 'Crown Moulding Upgrade', 
    type: 'Custom',
    builder: 'PulteGroup', 
    project: 'SOLSTICE', 
    unit: 'Lot 12',
    date: 'Oct 23, 2023', 
    status: JobStatus.Processing, 
    amount: 2100.00 
  },
  { 
    id: 'JOB-5924', 
    title: 'Baseboard & Casing', 
    type: 'Task',
    builder: 'Lennar Homes', 
    project: 'PARKLAND ROYALE 60', 
    unit: 'Lot 45, Block B',
    date: 'Oct 26, 2023', 
    status: JobStatus.Draft, 
    amount: 3200.00 
  },
  { 
    id: 'JOB-5925', 
    title: 'Hardware Install - Final', 
    type: 'Task',
    builder: 'Ryan Homes', 
    project: 'VIVANT TH', 
    unit: 'Unit 88',
    date: 'Oct 22, 2023', 
    status: JobStatus.Paid, 
    amount: 350.00 
  },
  { 
    id: 'JOB-5926', 
    title: 'Emergency Leak Repair', 
    type: 'Custom',
    builder: 'Lennar Homes', 
    project: 'PARKLAND ROYALE 60', 
    unit: 'Lot 15, Block A',
    date: 'Oct 27, 2023', 
    status: JobStatus.Pending, 
    amount: 450.00 
  },
];

export const CommunityJobsView: React.FC = () => {
  const [jobs, setJobs] = useState(INITIAL_MOCK_JOBS);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'task' | 'custom'>('task');

  const filteredJobs = jobs.filter(job => 
    activeSubTab === 'task' ? job.type === 'Task' : job.type === 'Custom'
  );

  const handleJobCreated = (newJob: any) => {
    setJobs([newJob, ...jobs]);
  };

  if (selectedJobId) {
    return <CommunityJobDetailView jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Analytics / Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 shrink-0">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Jobs</span>
          <p className="text-2xl font-black text-foreground mt-1">24</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Review</span>
          <p className="text-2xl font-black text-primary mt-1">8</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed (Mo)</span>
          <p className="text-2xl font-black text-green-600 mt-1">156</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Value</span>
          <p className="text-2xl font-black text-foreground mt-1">$42,500</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        
        {/* Sub Tabs */}
        <div className="flex items-center gap-4 mb-4">
            <button 
                onClick={() => setActiveSubTab('task')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeSubTab === 'task' 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
            >
                <Layers size={16} />
                Task Jobs
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeSubTab === 'task' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {jobs.filter(j => j.type === 'Task').length}
                </span>
            </button>
            <button 
                onClick={() => setActiveSubTab('custom')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeSubTab === 'custom' 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
            >
                <PenTool size={16} />
                Custom Jobs
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeSubTab === 'custom' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {jobs.filter(j => j.type === 'Custom').length}
                </span>
            </button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center bg-muted/30 gap-4">
            <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-primary" />
                <h3 className="font-bold text-foreground">
                    {activeSubTab === 'task' ? 'Standard Task Jobs' : 'Custom Ad-hoc Jobs'}
                </h3>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search jobs, units..." 
                        className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                <button className="p-2 border border-border bg-background rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                    <Filter size={18} />
                </button>
                <button 
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">New Job</span>
                </button>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
              <tr>
                <th className="px-6 py-4">Job Details</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Builder</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredJobs.map((job) => (
                <tr 
                  key={job.id} 
                  onClick={() => setSelectedJobId(job.id)}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{job.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-medium">{job.id}</span>
                        {job.type === 'Custom' && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">Custom</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{job.project}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={10} />
                            {job.unit}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground font-medium">{job.builder}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={14} />
                        {job.date}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge status={job.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-mono font-bold text-foreground">
                      ${job.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                  <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                          No {activeSubTab} jobs found.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CommunityAssignJobModal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        onJobCreated={handleJobCreated}
      />
    </div>
  );
};
