import React from 'react';
import { 
  ChevronRight, 
  ArrowLeft, 
  Download, 
  Printer, 
  CheckCircle2, 
  Building2,
  FileText
} from 'lucide-react';

interface PaymentDetailsViewProps {
  paymentId: string;
  onBack: () => void;
}

export const PaymentDetailsView: React.FC<PaymentDetailsViewProps> = ({ paymentId, onBack }) => {
  return (
    <div className="flex-1 bg-background overflow-y-auto h-full p-4 md:p-8">
      {/* Breadcrumbs & Back Nav */}
      <div className="flex flex-col gap-4 mb-6">
        <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <a href="#" onClick={onBack} className="hover:text-primary transition-colors">Dashboard</a>
            <ChevronRight size={12} />
            <a href="#" onClick={onBack} className="hover:text-primary transition-colors">Payouts</a>
            <ChevronRight size={12} />
            <span className="text-foreground font-medium">{paymentId}</span>
        </nav>
        
        <button 
            onClick={onBack} 
            className="self-start flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Payouts
        </button>
      </div>

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Top Summary Card */}
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcNPhD3T1dk8PlbE0lbXMtQFFe3Y5-AF-UCxWhhFle4e5cJNK3GBXglm2oSJmibHiGSs2W0zZ66TZqnPZ0Na03GC-grMDS4m62Q5ZPvtJ-66Kzp2woHkYTPyfj0y07Gfhi4QRLK7h86sssxLlyL62CcWn7RYByDcCoYqK2c0CFZt-paZLmeyfccOSUyOvdXMqy2c6zfNBikF5DJ63Gi2A9zEAXCFA7-dg_8_Sp1vJNH7rF79WWvuGL4zcoweOhjU2nvjd4t-9_PwE" 
                        alt="Recipient" 
                        className="w-16 h-16 rounded-full object-cover ring-4 ring-muted"
                    />
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-black text-foreground">{paymentId}</h1>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Paid
                            </span>
                        </div>
                        <p className="text-muted-foreground font-medium mt-1 text-sm md:text-base">
                            Recipient: <span className="text-foreground font-bold">Alex Thompson</span> • Issued Oct 24, 2023
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-card border border-border rounded-xl text-sm font-bold hover:bg-muted transition-all text-foreground">
                        <Download size={18} />
                        Export Receipt
                    </button>
                    <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
                        <Printer size={18} />
                        Print
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border">
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Payout Amount</p>
                    <p className="text-2xl md:text-3xl font-black text-primary tracking-tight">$1,695.00</p>
                </div>
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Number of Jobs</p>
                    <p className="text-2xl md:text-3xl font-black text-foreground tracking-tight">3</p>
                </div>
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Paid By</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                            <Building2 size={16} />
                        </div>
                        <p className="text-base font-bold text-foreground">Finance Dept.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Column: Line Items */}
            <div className="xl:col-span-8 space-y-8">
                
                {/* Itemized Jobs Table */}
                <section className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-border bg-muted/20">
                        <h3 className="text-lg font-bold text-foreground">Itemized Jobs</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Title</th>
                                    <th className="px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Original Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                <tr className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-primary">#JOB-2201</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-foreground">Mobile UI Kit Refactor</td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                                            <CheckCircle2 size={12} /> Approved
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-foreground text-right">$650.00</td>
                                </tr>
                                <tr className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-primary">#JOB-2204</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-foreground">Landing Page Icons</td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                                             <CheckCircle2 size={12} /> Approved
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-foreground text-right">$320.00</td>
                                </tr>
                                <tr className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-primary">#JOB-2207</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-foreground">Dashboard Layout V2</td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                                             <CheckCircle2 size={12} /> Approved
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-foreground text-right">$450.00</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Adjustments Section */}
                <section className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-border bg-muted/20">
                        <h3 className="text-lg font-bold text-foreground">Adjustments</h3>
                    </div>
                    <div className="p-4 md:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-muted/30 rounded-xl border border-border gap-4">
                            <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/10 text-primary tracking-wider mb-1">Bonus</span>
                                <p className="text-sm font-bold text-foreground">Performance Milestone Reward</p>
                                <p className="text-sm text-muted-foreground">Q3 project milestones met ahead of schedule.</p>
                            </div>
                            <span className="text-sm font-bold text-foreground sm:text-right">+$200.00</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-muted/30 rounded-xl border border-border gap-4">
                            <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 tracking-wider mb-1">Travel Reimbursement</span>
                                <p className="text-sm font-bold text-foreground">On-site Workshop Transport</p>
                                <p className="text-sm text-muted-foreground">Round-trip transport for site visit on Oct 14th.</p>
                            </div>
                            <span className="text-sm font-bold text-foreground sm:text-right">+$75.00</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Right Column: Breakdown */}
            <div className="xl:col-span-4">
                <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-sm xl:sticky xl:top-6">
                    <h3 className="text-lg font-bold text-foreground mb-6">Payment Breakdown</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm font-semibold text-muted-foreground">
                            <span>Subtotal</span>
                            <span className="text-foreground">$1,420.00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-semibold text-muted-foreground">
                            <span>Total Adjustments</span>
                            <span className="text-primary">+$275.00</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between items-end">
                            <span className="text-foreground font-extrabold text-base">Grand Total</span>
                            <span className="text-primary font-black text-3xl tracking-tight">$1,695.00</span>
                        </div>
                    </div>
                    
                    <div className="mt-8 space-y-3">
                        <button className="w-full py-4 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                             <FileText size={16} />
                             Download PDF Receipt
                        </button>
                        <p className="text-[10px] text-center text-muted-foreground font-medium">
                            This is an official payment record for {paymentId}. For any discrepancies, please contact finance@example.com.
                        </p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};