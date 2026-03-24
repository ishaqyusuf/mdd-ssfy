
import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Edit3, 
  MessageSquare, 
  Clock, 
  FileText, 
  MapPin, 
  User, 
  Building2, 
  Calendar,
  Send,
  ShieldAlert,
  Download,
  AlertTriangle,
  RotateCcw,
  Ban,
  PackageOpen
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { JobStatus } from '../../types';

interface CommunityJobDetailViewProps {
  jobId: string;
  onBack: () => void;
  isLoading?: boolean;
}

// Mock Data logic updated to handle specific job types
const getJobData = (id: string) => {
  const baseData = {
    id: id,
    title: id === 'JOB-5922' ? 'Exterior Door Install (Custom)' : 'Trim Installation - Phase 1',
    status: id === 'JOB-5922' ? JobStatus.Pending : JobStatus.Pending,
    builder: id === 'JOB-5922' ? 'Mattamy Homes' : 'Lennar Homes',
    project: id === 'JOB-5922' ? 'RIVER RUN' : 'PARKLAND ROYALE 60',
    unit: id === 'JOB-5922' ? 'Unit 105' : 'Lot 42, Block B',
    address: id === 'JOB-5922' ? '88 River Way, Unit 105' : '123 Parkland Blvd, Unit 42',
    contractor: 'Alex Thompson',
    contractorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcNPhD3T1dk8PlbE0lbXMtQFFe3Y5-AF-UCxWhhFle4e5cJNK3GBXglm2oSJmibHiGSs2W0zZ66TZqnPZ0Na03GC-grMDS4m62Q5ZPvtJ-66Kzp2woHkYTPyfj0y07Gfhi4QRLK7h86sssxLlyL62CcWn7RYByDcCoYqK2c0CFZt-paZLmeyfccOSUyOvdXMqy2c6zfNBikF5DJ63Gi2A9zEAXCFA7-dg_8_Sp1vJNH7rF79WWvuGL4zcoweOhjU2nvjd4t-9_PwE',
    dateCreated: 'Oct 24, 2023',
    description: id === 'JOB-5922' 
        ? 'Specialized exterior door installation including custom threshold sealing and weatherproofing. Contractor to provide additional flashing materials.' 
        : 'Installation of baseboards and door casings for the first floor. Please ensure all corners are mitered precisely.',
    tasks: id === 'JOB-5922' ? [] : [
      { id: '1', name: 'INSTALL BASEBOARD', rate: 1.25, qty: 450, maxQty: 450, total: 562.50 },
      { id: '2', name: 'INSTALL WINDOW CASING', rate: 1.50, qty: 120, maxQty: 125, total: 180.00 },
      { id: '3', name: 'INSTALL DOOR STOP', rate: 2.50, qty: 15, maxQty: 15, total: 37.50 },
    ],
    financials: {
      subtotal: id === 'JOB-5922' ? 450.00 : 780.00,
      addonPercent: id === 'JOB-5922' ? 0 : 15,
      addonValue: id === 'JOB-5922' ? 0 : 117.00,
      total: id === 'JOB-5922' ? 450.00 : 897.00
    },
    history: [
      { id: 1, type: 'System', title: 'Job Created', date: 'Oct 24, 10:00 AM', user: 'Admin' },
      { id: 2, type: 'Submission', title: 'Job Submitted', date: 'Oct 25, 04:30 PM', user: 'Alex Thompson' },
    ]
  };
  return baseData;
};

const CommunityJobDetailViewSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-background overflow-hidden">
    <header className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-20 bg-muted rounded animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
      </div>
    </header>
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded-xl animate-pulse" />
            <div className="h-24 bg-muted rounded-xl animate-pulse" />
          </div>
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
          <div className="h-24 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

export const CommunityJobDetailView: React.FC<CommunityJobDetailViewProps> = ({ jobId, onBack, isLoading }) => {
  const JOB_DATA = useMemo(() => getJobData(jobId), [jobId]);
  const [actionNote, setActionNote] = useState('');
  const [currentStatus, setCurrentStatus] = useState<JobStatus>(JOB_DATA.status);

  if (isLoading) return <CommunityJobDetailViewSkeleton />;

  const handleApprove = () => {
    setCurrentStatus(JobStatus.Approved);
  };

  const handleReject = () => {
    setCurrentStatus(JobStatus.Draft);
  };

  const handleCancelApproval = () => {
    setCurrentStatus(JobStatus.Pending);
  };

  const isCustomJob = JOB_DATA.tasks.length === 0;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{JOB_DATA.title}</h1>
              <Badge status={currentStatus} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="font-mono">{jobId}</span>
              <span>•</span>
              <span>Created {JOB_DATA.dateCreated}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground">
            <Printer size={16} />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground">
            <Edit3 size={16} />
            <span className="hidden sm:inline">Edit Job</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Details & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Action Bar (Pending Review) */}
            {currentStatus === JobStatus.Pending && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-in slide-in-from-top-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg shrink-0">
                    <ShieldAlert size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">Approval Required</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This job has been submitted by the contractor and is awaiting your review.
                    </p>
                    
                    <div className="space-y-3">
                      <textarea 
                        className="w-full p-3 text-sm bg-muted/30 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                        placeholder="Add a note for the contractor (required for rejection)..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <button 
                          onClick={handleApprove}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                          <CheckCircle2 size={18} />
                          Approve Payment
                        </button>
                        <button 
                          onClick={handleReject}
                          disabled={!actionNote}
                          className="flex-1 bg-card border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle size={18} />
                          Reject & Return
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar (Approved Status) */}
            {currentStatus === JobStatus.Approved && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-in slide-in-from-top-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">Job Approved</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This job has been approved for payment. You can revert this approval or reject the job entirely if new discrepancies are found.
                    </p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={handleCancelApproval}
                            className="flex-1 bg-card border border-border text-foreground hover:bg-muted py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <RotateCcw size={18} />
                            Cancel Approval
                        </button>
                        <button 
                            onClick={handleReject}
                            className="flex-1 bg-card border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <Ban size={18} />
                            Reject Job
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Context Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Project & Builder</span>
                    </div>
                    <div>
                        <p className="font-bold text-foreground">{JOB_DATA.project}</p>
                        <p className="text-sm text-muted-foreground">{JOB_DATA.builder}</p>
                    </div>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Location</span>
                    </div>
                    <div>
                        <p className="font-bold text-foreground">{JOB_DATA.unit}</p>
                        <p className="text-sm text-muted-foreground truncate">{JOB_DATA.address}</p>
                    </div>
                </div>
            </div>

            {/* Scope / Tasks */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <FileText size={18} className="text-primary" />
                        Scope of Work
                    </h3>
                    <div className="flex items-center gap-2">
                        {isCustomJob && (
                            <span className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200">Custom Job</span>
                        )}
                        <span className="text-xs font-bold bg-background border border-border px-2 py-1 rounded text-muted-foreground">
                            {isCustomJob ? 'Manual Pricing' : `${JOB_DATA.tasks.length} Items`}
                        </span>
                    </div>
                </div>
                
                {/* Description */}
                <div className="p-6 border-b border-border bg-background">
                    <p className="text-sm text-muted-foreground italic">
                        "{JOB_DATA.description}"
                    </p>
                </div>

                {/* Table or Custom Job Notice */}
                {!isCustomJob ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
                                <tr>
                                    <th className="px-6 py-3">Task / Item</th>
                                    <th className="px-6 py-3 text-right">Rate</th>
                                    <th className="px-6 py-3 text-center">Qty / Max</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {JOB_DATA.tasks.map((task) => (
                                    <tr key={task.id} className="hover:bg-muted/10">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-foreground">{task.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-mono text-muted-foreground">
                                            ${task.rate.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-sm font-bold">
                                                {task.qty} <span className="text-muted-foreground font-normal ml-1">/ {task.maxQty}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-foreground">
                                            ${task.total.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center bg-muted/5">
                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500">
                            <PackageOpen size={32} />
                        </div>
                        <h4 className="text-lg font-bold text-foreground">Ad-hoc Custom Job</h4>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                            This job was created as a custom task without standard itemized quantities. 
                            The total payout is calculated based on the negotiated flat fee listed in the financial summary.
                        </p>
                    </div>
                )}
            </div>

          </div>

          {/* RIGHT COLUMN: Financials & History */}
          <div className="space-y-6">
            
            {/* Financial Summary */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border bg-muted/20">
                    <h3 className="font-bold text-foreground">Financial Summary</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-bold text-foreground">${JOB_DATA.financials.subtotal.toFixed(2)}</span>
                    </div>
                    {JOB_DATA.financials.addonValue > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                                Add-on ({JOB_DATA.financials.addonPercent}%)
                                <span className="text-[10px] bg-muted px-1 rounded border border-border text-muted-foreground">Fixed</span>
                            </span>
                            <span className="font-bold text-green-600">+${JOB_DATA.financials.addonValue.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-foreground uppercase">Grand Total</span>
                        <span className="text-2xl font-black text-primary">${JOB_DATA.financials.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Assigned To */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Assigned Contractor</h4>
                <div className="flex items-center gap-3">
                    <img 
                        src={JOB_DATA.contractorAvatar} 
                        className="w-10 h-10 rounded-full object-cover border border-border"
                        alt={JOB_DATA.contractor}
                    />
                    <div>
                        <p className="font-bold text-foreground text-sm">{JOB_DATA.contractor}</p>
                        <p className="text-xs text-muted-foreground">Certified Installer</p>
                    </div>
                    <button className="ml-auto p-2 hover:bg-muted rounded-full text-muted-foreground">
                        <MessageSquare size={18} />
                    </button>
                </div>
            </div>

            {/* Activity History */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">Activity Timeline</h4>
                <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-border">
                    {/* New Event (Current Action) */}
                    {currentStatus === JobStatus.Approved && (
                        <div className="relative pl-8 animate-in slide-in-from-left-2">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-green-500 border-4 border-card z-10 flex items-center justify-center">
                                <CheckCircle2 size={12} className="text-white" />
                            </div>
                            <p className="text-xs font-bold text-muted-foreground">Just now</p>
                            <p className="text-sm font-bold text-foreground">Approved by You</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Payment processing initiated.</p>
                        </div>
                    )}

                    {JOB_DATA.history.map((event) => (
                        <div key={event.id} className="relative pl-8">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-muted border-4 border-card z-10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                            </div>
                            <p className="text-xs font-bold text-muted-foreground">{event.date}</p>
                            <p className="text-sm font-semibold text-foreground">{event.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">By {event.user}</p>
                        </div>
                    ))}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
