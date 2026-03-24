import React from 'react';
import { 
  Download, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  UserPlus,
  BarChart,
  Package,
  AlertTriangle,
  Info,
  Zap,
  FileText,
  Truck
} from 'lucide-react';

interface SalesDashboardViewProps {
  onCreateInvoice?: () => void;
}

export const SalesDashboardView: React.FC<SalesDashboardViewProps> = ({ onCreateInvoice }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Sales Operations</h1>
            <p className="text-muted-foreground mt-1">Manage your door and moulding pipeline.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors">
              <Download size={18} />
              Export CSV
            </button>
            <button 
              onClick={onCreateInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Plus size={18} />
              Create Invoice
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Quotes (Active)', value: '$1.24M', trend: '+12.4% vs last month', icon: FileText, color: 'text-primary' },
            { label: 'Open Orders', value: '142 Units', trend: '+5% weekly', icon: Package, color: 'text-orange-500' },
            { label: 'Fulfilled Today', value: '12 Packages', trend: '-2% vs avg', icon: Truck, color: 'text-emerald-500', trendDown: true },
            { label: 'Pipeline Velocity', value: '14 Days', trend: '2 days faster', icon: Zap, color: 'text-purple-500' },
          ].map((kpi, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-bold text-muted-foreground">{kpi.label}</p>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-black text-foreground">{kpi.value}</p>
              <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${kpi.trendDown ? 'text-destructive' : 'text-emerald-600'}`}>
                {kpi.trendDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                <span>{kpi.trend}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Pipeline Visualization */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-6">Sales Pipeline Visualization</h2>
              <div className="flex items-center w-full overflow-x-auto pb-2 md:pb-0">
                {[
                  { label: 'Quotes', value: '$450k', color: 'bg-primary' },
                  { label: 'Orders', value: '$620k', color: 'bg-primary/70' },
                  { label: 'Production', value: '82 Units', color: 'bg-primary/40' },
                  { label: 'Fulfilled', value: '$174k', color: 'bg-emerald-500' },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.label}>
                    <div className="flex-1 flex flex-col items-center gap-3 min-w-[80px]">
                      <div className={`w-full h-3 rounded-full ${step.color}`}></div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{step.label}</p>
                        <p className="text-sm font-black text-foreground mt-0.5">{step.value}</p>
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-12 flex justify-center text-border shrink-0">
                        <ChevronRight size={24} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Active House Packages Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold text-foreground">Active House Packages</h2>
                <button className="text-primary text-sm font-bold hover:underline">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Client / Project</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Units</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Est. Delivery</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { client: 'Acme Corp', project: 'Riverside Heights', desc: 'Master Bedroom & Hallways', status: 'Production', statusColor: 'bg-blue-100 text-blue-700', units: '45 Doors', delivery: 'Oct 24, 2023', value: '$52,400' },
                      { client: 'Skyline Developers', project: '50 Unit Multi-Family', desc: 'Standard Interior Pack', status: 'Quoted', statusColor: 'bg-amber-100 text-amber-700', units: '110 Doors', delivery: 'Nov 02, 2023', value: '$128,900' },
                      { client: 'Urban Nest', project: 'Custom Walnut', desc: 'Custom Casings & Base', status: 'Ready', statusColor: 'bg-emerald-100 text-emerald-700', units: '12 Profiles', delivery: 'Today', value: '$12,150' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold text-foreground">{row.client} - {row.project}</p>
                            <p className="text-xs text-muted-foreground">{row.desc}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.statusColor}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{row.units}</td>
                        <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{row.delivery}</td>
                        <td className="px-6 py-4 text-sm font-black text-foreground text-right">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Sidebar Widgets */}
          <div className="flex flex-col gap-6">
            
            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {[
                  { icon: UserPlus, label: 'Add Customer', desc: 'Create profile for new contractor' },
                  { icon: BarChart, label: 'Run Report', desc: 'Generate sales or inventory data' },
                  { icon: Package, label: 'Check Stock', desc: 'Real-time availability of slabs' },
                ].map((action, i) => (
                  <button key={i} className="flex items-center gap-3 w-full p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <action.icon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Alerts */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-foreground">Inventory Alerts</h2>
                <div className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold">3</div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3 pb-3 border-b border-border">
                  <AlertTriangle className="text-destructive shrink-0" size={18} />
                  <div>
                    <p className="text-sm font-bold text-foreground">Solid Core Oak Slab (32")</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Current: 4 | Threshold: 15</p>
                    <button className="text-xs font-bold text-primary mt-1 hover:underline">Reorder Now</button>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b border-border">
                  <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                  <div>
                    <p className="text-sm font-bold text-foreground">Baseboard Primed 5.25"</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Current: 450 LF | Threshold: 1200 LF</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Info className="text-blue-500 shrink-0" size={18} />
                  <div>
                    <p className="text-sm font-bold text-foreground">Poplar Crown Profile #322</p>
                    <p className="text-xs text-muted-foreground mt-0.5">High demand alert for Riverside project</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-4">Recent Activity</h2>
              <div className="relative pl-4 space-y-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {[
                  { time: '10 mins ago', text: 'config completed for', highlight: 'Acme Corp', subject: 'Master Bedroom', color: 'bg-primary' },
                  { time: '1 hour ago', text: 'paid in full by Skyline Dev', highlight: '#INV-8902', subject: 'Invoice', color: 'bg-emerald-500' },
                  { time: '4 hours ago', text: 'New quote request for', highlight: '25 Mahogany Entry Slabs', subject: '', color: 'bg-amber-500' },
                ].map((item, i) => (
                  <div key={i} className="relative pl-4">
                    <div className={`absolute left-[-1.35rem] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background ${item.color}`}></div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{item.time}</p>
                    <p className="text-sm text-foreground">
                      <span className="font-bold">{item.subject}</span> {item.text} <span className="font-bold text-foreground">{item.highlight}</span>.
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};