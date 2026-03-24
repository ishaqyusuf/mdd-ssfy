import React from 'react';
import { 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Plus
} from 'lucide-react';

interface SalesExecutiveDashboardViewProps {
  onCreateInvoice: () => void;
}

export const SalesExecutiveDashboardView: React.FC<SalesExecutiveDashboardViewProps> = ({ onCreateInvoice }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Executive Sales Overview</h1>
          <p className="text-muted-foreground">Real-time performance metrics for the fiscal quarter.</p>
        </div>
        <button 
          onClick={onCreateInvoice}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          Create Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1 */}
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Total Sales</p>
            <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-xs font-bold">+12.5%</span>
          </div>
          <p className="text-foreground tracking-tight text-3xl font-bold leading-tight">$428,500</p>
          <div className="h-10 mt-2">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path d="M0 35 Q 25 30, 40 15 T 70 20 T 100 5" fill="none" stroke="#059669" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
            </svg>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Active Quotes</p>
            <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-xs font-bold">+5.2%</span>
          </div>
          <p className="text-foreground tracking-tight text-3xl font-bold leading-tight">156</p>
          <div className="h-10 mt-2">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path d="M0 30 Q 30 25, 50 20 T 80 10 T 100 15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
            </svg>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Pending Invoices</p>
            <span className="text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded text-xs font-bold">-2.1%</span>
          </div>
          <p className="text-foreground tracking-tight text-3xl font-bold leading-tight">$84,200</p>
          <div className="h-10 mt-2">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path d="M0 10 Q 20 15, 40 30 T 70 25 T 100 35" fill="none" stroke="#dc2626" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
            </svg>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border border-border shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-sm font-medium">Avg Order Value</p>
            <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-xs font-bold">+4.8%</span>
          </div>
          <p className="text-foreground tracking-tight text-3xl font-bold leading-tight">$2,745</p>
          <div className="h-10 mt-2">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path d="M0 25 Q 25 25, 50 15 T 100 5" fill="none" stroke="#64748b" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Center Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Chart */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Sales Revenue Trend</h3>
                <p className="text-muted-foreground text-sm">Monthly performance for the current year</p>
              </div>
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <button className="px-3 py-1 text-xs font-bold bg-card rounded-md shadow-sm text-foreground">Year</button>
                <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">Month</button>
              </div>
            </div>
            <div className="h-[280px] w-full mt-4">
              {/* SVG Chart from prompt */}
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 150">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2"></stop>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
                <path d="M0 120 C 50 110, 80 40, 120 60 C 160 80, 200 20, 250 50 C 300 80, 350 10, 400 30 C 450 50, 480 20, 500 10 L 500 150 L 0 150 Z" fill="url(#chartGradient)"></path>
                <path d="M0 120 C 50 110, 80 40, 120 60 C 160 80, 200 20, 250 50 C 300 80, 350 10, 400 30 C 450 50, 480 20, 500 10" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"></path>
              </svg>
              <div className="flex justify-between mt-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Recent Invoices</h3>
              <button className="text-primary text-sm font-semibold hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">#INV-8821</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Artisan Home Builders</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Oct 24, 2023</td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">$12,450.00</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">#INV-8822</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Premium Millwork Co</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Oct 23, 2023</td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">$8,200.00</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">#INV-8823</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Coastal Renovations</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Oct 22, 2023</td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">$15,100.00</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Overdue</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">#INV-8824</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Skyline Development</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">Oct 21, 2023</td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">$4,350.00</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Top Products */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-foreground">Top Selling Products</h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Shaker Interior Door</span>
                  <span className="text-muted-foreground">$84.2k</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Oak Crown Moulding</span>
                  <span className="text-muted-foreground">$62.5k</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">5-inch Pine Baseboard</span>
                  <span className="text-muted-foreground">$48.1k</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Classic Panel Door</span>
                  <span className="text-muted-foreground">$31.9k</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '32%' }}></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-8 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors text-foreground">
              Inventory Report
            </button>
          </div>

          {/* Customer Tiers */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-foreground">Customer Tiers</h3>
            <div className="flex flex-col items-center">
              <div className="relative size-40 mb-6">
                <svg className="size-full" viewBox="0 0 36 36">
                  <circle className="stroke-muted" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                  <circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray="60 100" strokeDashoffset="0" strokeWidth="3"></circle>
                  <circle className="stroke-yellow-400" cx="18" cy="18" fill="none" r="16" strokeDasharray="25 100" strokeDashoffset="-60" strokeWidth="3"></circle>
                  <circle className="stroke-gray-400" cx="18" cy="18" fill="none" r="16" strokeDasharray="15 100" strokeDashoffset="-85" strokeWidth="3"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">1.2k</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Clients</span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium text-foreground">Gold Tier</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">60%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-yellow-400"></div>
                    <span className="text-sm font-medium text-foreground">Silver Tier</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">25%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-gray-400"></div>
                    <span className="text-sm font-medium text-foreground">Bronze Tier</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">15%</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Filter Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 z-50">
        <div className="flex items-center gap-2 border-r border-border pr-6">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Oct 1 - Oct 31, 2023</span>
        </div>
        <div className="flex items-center gap-2 border-r border-border pr-6">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">All Regions</span>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-full text-sm font-bold transition-all shadow-md">
          Download PDF Report
        </button>
      </div>
    </div>
  );
};