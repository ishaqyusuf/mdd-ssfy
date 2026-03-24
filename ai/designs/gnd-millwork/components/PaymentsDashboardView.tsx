import React from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Printer, 
  Filter, 
  ChevronDown, 
  Calendar, 
  FileText, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Wallet
} from 'lucide-react';

interface PaymentsDashboardViewProps {
  onCreatePayout: () => void;
  onPaymentClick?: (id: string) => void;
}

export const PaymentsDashboardView: React.FC<PaymentsDashboardViewProps> = ({ onCreatePayout, onPaymentClick }) => {
  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-[1600px] mx-auto w-full">
         {/* PageHeading */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-1">
                    <span>Financials</span>
                    <ChevronRight size={14} />
                    <span className="text-primary">Payout History</span>
                </div>
                <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground">Payments Dashboard</h1>
                <p className="text-muted-foreground text-base">Detailed record of processed and pending financial transactions.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={onCreatePayout}
                    className="flex items-center gap-2 rounded-lg h-10 px-4 bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 transition-all shadow-primary/20"
                >
                    <Plus size={18} />
                    <span>Create New Payout</span>
                </button>
                <button className="flex items-center gap-2 rounded-lg h-10 px-4 bg-card text-foreground text-sm font-bold border border-border hover:bg-muted transition-colors">
                    <Download size={18} />
                    <span>Export CSV</span>
                </button>
                <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-card border border-border text-muted-foreground hover:text-foreground">
                    <Printer size={18} />
                </button>
            </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl mb-6 shadow-sm">
            <div className="text-sm font-bold text-muted-foreground mr-2 flex items-center gap-1 uppercase tracking-wider">
                <Filter size={16} />
                Filters
            </div>
            <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-muted pl-4 pr-3 border border-transparent hover:border-border transition-all">
                <p className="text-foreground text-sm font-semibold">Status: <span className="text-primary">All</span></p>
                <ChevronDown size={16} className="text-muted-foreground" />
            </button>
            <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-muted pl-4 pr-3 border border-transparent hover:border-border transition-all">
                <p className="text-foreground text-sm font-semibold">Date Range: <span className="text-primary">Last 30 Days</span></p>
                <Calendar size={16} className="text-muted-foreground" />
            </button>
            <button className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-muted pl-4 pr-3 border border-transparent hover:border-border transition-all">
                <p className="text-foreground text-sm font-semibold">Admin: <span className="text-primary">All</span></p>
                <ChevronDown size={16} className="text-muted-foreground" />
            </button>
            <div className="h-6 w-px bg-border mx-2"></div>
            <button className="text-muted-foreground text-sm font-bold hover:text-primary transition-colors">Clear all</button>
        </div>

        {/* Table Container */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground w-[160px]">Payment ID</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground w-[180px]">Processed Date</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Recipient</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground w-[140px]">Job Count</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[200px]">Grand Total</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Authorized By</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {/* Rows */}
                        {[
                            { id: '#PAY-8291', date: 'Oct 24, 2023', recipient: 'Alex Rivera', jobs: 12, total: 1240.00, tax: 40, fee: 20, auth: 'Sarah Jenkins', color: 'bg-emerald-500' },
                            { id: '#PAY-8292', date: 'Oct 23, 2023', recipient: 'Jamie Smith', jobs: 8, total: 850.50, tax: 25, fee: 15.50, auth: 'Michael Chen', color: 'bg-emerald-500' },
                            { id: '#PAY-8293', date: 'Oct 22, 2023', recipient: 'Elena Kosti', jobs: 15, total: 2100.00, tax: 100, fee: 50, auth: 'Sarah Jenkins', color: 'bg-amber-500' },
                            { id: '#PAY-8294', date: 'Oct 21, 2023', recipient: 'Marcus Webb', jobs: 5, total: 420.25, tax: 10.25, fee: 10, auth: 'Michael Chen', color: 'bg-emerald-500' },
                            { id: '#PAY-8295', date: 'Oct 20, 2023', recipient: 'Sarah Jenkins', jobs: 22, total: 3450.00, tax: 150, fee: 75, auth: 'Sarah Jenkins', color: 'bg-emerald-500' },
                        ].map((row, i) => (
                            <tr 
                              key={i} 
                              onClick={() => onPaymentClick && onPaymentClick(row.id)}
                              className="group hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className={`size-2 rounded-full ${row.color}`}></div>
                                        <span className="text-sm font-mono font-bold text-foreground group-hover:text-primary transition-colors">{row.id}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-medium text-muted-foreground">{row.date}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                                            {row.recipient.charAt(0)}
                                        </div>
                                        <span className="text-sm font-bold text-foreground">{row.recipient}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold border border-border">
                                        {row.jobs} Jobs
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-extrabold text-foreground">${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        <span className="text-[11px] text-muted-foreground">Tax: ${row.tax.toFixed(2)} • Fee: ${row.fee.toFixed(2)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-medium text-muted-foreground">{row.auth}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="flex justify-end gap-1">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); onPaymentClick && onPaymentClick(row.id); }}
                                          className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-lg" 
                                          title="Download PDF"
                                        >
                                            <FileText size={18} />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); onPaymentClick && onPaymentClick(row.id); }}
                                          className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-lg" 
                                          title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Showing 1 to 5 of 64 records</p>
                <div className="flex items-center gap-1">
                    <button className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                        <ChevronLeft size={16} />
                    </button>
                    <button className="text-sm font-bold flex size-9 items-center justify-center text-primary-foreground bg-primary rounded-lg">1</button>
                    <button className="text-sm font-semibold flex size-9 items-center justify-center text-muted-foreground hover:bg-muted rounded-lg">2</button>
                    <button className="text-sm font-semibold flex size-9 items-center justify-center text-muted-foreground hover:bg-muted rounded-lg">3</button>
                    <span className="text-sm font-semibold flex size-9 items-center justify-center text-muted-foreground">...</span>
                    <button className="text-sm font-semibold flex size-9 items-center justify-center text-muted-foreground hover:bg-muted rounded-lg">12</button>
                    <button className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>

        {/* Footer Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Paid (30d)</p>
                <p className="text-2xl font-extrabold text-foreground">$48,290.75</p>
                <div className="mt-2 flex items-center gap-1 text-emerald-600 text-sm font-bold">
                    <TrendingUp size={16} />
                    <span>+12.5% vs last month</span>
                </div>
            </div>
            <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Pending Approvals</p>
                <p className="text-2xl font-extrabold text-foreground">8 Payouts</p>
                <div className="mt-2 flex items-center gap-1 text-amber-600 text-sm font-bold">
                    <Clock size={16} />
                    <span>Average wait: 1.2 days</span>
                </div>
            </div>
            <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Processing Efficiency</p>
                <p className="text-2xl font-extrabold text-foreground">99.2%</p>
                <div className="mt-2 flex items-center gap-1 text-primary text-sm font-bold">
                    <CheckCircle size={16} />
                    <span>0.8% failure rate</span>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};