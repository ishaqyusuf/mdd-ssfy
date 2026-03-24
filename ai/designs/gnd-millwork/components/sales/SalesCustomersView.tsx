import React from 'react';
import { 
  Download, 
  Plus, 
  Users, 
  TrendingUp, 
  Filter, 
  ChevronDown, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit, 
  FileText,
  Star,
  Zap,
  UserPlus
} from 'lucide-react';

interface SalesCustomersViewProps {
  onCustomerClick: (id: string) => void;
}

export const SalesCustomersView: React.FC<SalesCustomersViewProps> = ({ onCustomerClick }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Customer Directory Overview</h1>
          <p className="text-muted-foreground text-sm">Manage enterprise accounts, wholesale partners, and retail leads.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-card border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-5 bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 transition-all shadow-primary/20">
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Customers</p>
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                <Users size={18} />
            </div>
          </div>
          <p className="text-foreground text-2xl font-black">1,248</p>
          <div className="flex items-center gap-1">
            <TrendingUp size={16} className="text-green-600" />
            <p className="text-green-600 text-xs font-bold">+2.4% <span className="text-muted-foreground font-normal">vs last mo</span></p>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Active Leads</p>
            <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-500">
                <Zap size={18} />
            </div>
          </div>
          <p className="text-foreground text-2xl font-black">42</p>
          <div className="flex items-center gap-1">
            <TrendingUp size={16} className="text-green-600" />
            <p className="text-green-600 text-xs font-bold">+5.1% <span className="text-muted-foreground font-normal">vs last mo</span></p>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">High-Value Clients</p>
            <div className="p-1.5 bg-purple-500/10 rounded-md text-purple-500">
                <Star size={18} />
            </div>
          </div>
          <p className="text-foreground text-2xl font-black">156</p>
          <div className="flex items-center gap-1">
            <TrendingUp size={16} className="text-green-600" />
            <p className="text-green-600 text-xs font-bold">+1.2% <span className="text-muted-foreground font-normal">vs last mo</span></p>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">New this Month</p>
            <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-500">
                <UserPlus size={18} />
            </div>
          </div>
          <p className="text-foreground text-2xl font-black">12</p>
          <div className="flex items-center gap-1">
            <TrendingUp size={16} className="text-green-600" />
            <p className="text-green-600 text-xs font-bold">+15% <span className="text-muted-foreground font-normal">vs last mo</span></p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm mb-6">
        <div className="text-muted-foreground mr-1 flex items-center gap-1">
            <Filter size={18} />
        </div>
        <div className="flex gap-2 flex-wrap flex-1">
          <button className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold border border-transparent hover:border-border transition-all text-foreground">
            <span>Tier: All</span>
            <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold border border-transparent hover:border-border transition-all text-foreground">
            <span>Status: Active</span>
            <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold border border-transparent hover:border-border transition-all text-foreground">
            <span>Sales Rep: All</span>
            <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold border border-transparent hover:border-border transition-all text-foreground">
            <span>Sort: Recent</span>
            <ChevronDown size={16} />
          </button>
        </div>
        <button className="text-primary text-xs font-bold uppercase tracking-tight px-2 hover:underline">Clear All</button>
      </div>

      {/* Main Data Table Container */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 text-muted-foreground text-xs font-bold uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-bold uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-bold uppercase tracking-wider">Tier</th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-bold uppercase tracking-wider text-right">Total Spend</th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-bold uppercase tracking-wider text-center">Open Invoices</th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-bold uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-bold uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Row 1 */}
              <tr 
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => onCustomerClick('CUST-001')}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">JS</div>
                    <span className="text-foreground text-sm font-semibold">John Smith</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">Smith & Sons Millwork</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Wholesale</span>
                </td>
                <td className="px-6 py-4 text-right text-foreground text-sm font-mono">$124,500.00</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">2</span>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">2 days ago</td>
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-2">
                    <button className="text-primary hover:text-blue-700 p-1" title="View Profile" onClick={() => onCustomerClick('CUST-001')}><Eye size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1" title="Edit"><Edit size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1" title="Create Quote"><FileText size={18} /></button>
                  </div>
                </td>
              </tr>
              {/* Row 2 */}
              <tr 
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => onCustomerClick('CUST-002')}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-bold text-xs">SJ</div>
                    <span className="text-foreground text-sm font-semibold">Sarah Jenkins</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">Elite Interiors</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">Tier 1</span>
                </td>
                <td className="px-6 py-4 text-right text-foreground text-sm font-mono">$89,200.00</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm text-muted-foreground">0</span>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">5 hours ago</td>
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-2">
                    <button className="text-primary hover:text-blue-700 p-1"><Eye size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1"><Edit size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1"><FileText size={18} /></button>
                  </div>
                </td>
              </tr>
              {/* Row 3 */}
              <tr 
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => onCustomerClick('CUST-003')}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-bold text-xs">RD</div>
                    <span className="text-foreground text-sm font-semibold">Robert Davis</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">Davis Construction</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">Retail</span>
                </td>
                <td className="px-6 py-4 text-right text-foreground text-sm font-mono">$12,400.00</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">1</span>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">1 week ago</td>
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-2">
                    <button className="text-primary hover:text-blue-700 p-1"><Eye size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1"><Edit size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1"><FileText size={18} /></button>
                  </div>
                </td>
              </tr>
              {/* Row 4 */}
              <tr 
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => onCustomerClick('CUST-004')}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 font-bold text-xs">MC</div>
                    <span className="text-foreground text-sm font-semibold">Michael Chen</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">Architectural Details</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">Tier 2</span>
                </td>
                <td className="px-6 py-4 text-right text-foreground text-sm font-mono">$245,000.00</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">5</span>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">3 days ago</td>
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-2">
                    <button className="text-primary hover:text-blue-700 p-1"><Eye size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1"><Edit size={18} /></button>
                    <button className="text-muted-foreground hover:text-primary p-1"><FileText size={18} /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-t border-border">
          <p className="text-sm text-muted-foreground">Showing <span className="font-bold text-foreground">1</span> to <span className="font-bold text-foreground">10</span> of <span className="font-bold text-foreground">1,248</span> customers</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-border bg-card text-sm disabled:opacity-50 text-foreground hover:bg-muted" disabled>Previous</button>
            <button className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm font-bold">1</button>
            <button className="px-3 py-1 rounded border border-border bg-card text-sm hover:bg-muted text-foreground">2</button>
            <button className="px-3 py-1 rounded border border-border bg-card text-sm hover:bg-muted text-foreground">3</button>
            <button className="px-3 py-1 rounded border border-border bg-card text-sm hover:bg-muted text-foreground">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};