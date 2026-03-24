
import React from 'react';
import { 
  Building2, 
  Users, 
  Home, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const ACTIVITY_DATA = [
  { id: 1, user: 'Sarah Jenkins', action: 'approved invoice', target: '#INV-2024-001', time: '10 mins ago', icon: CheckCircle2, color: 'text-green-500' },
  { id: 2, user: 'Mike Rivera', action: 'updated install cost', target: 'Baseboard Installation', time: '1 hour ago', icon: DollarSign, color: 'text-blue-500' },
  { id: 3, user: 'System', action: 'flagged overdue job', target: 'JOB-5922', time: '2 hours ago', icon: AlertCircle, color: 'text-red-500' },
  { id: 4, user: 'Alex Thompson', action: 'submitted new job', target: 'Trim - 1st Floor', time: '4 hours ago', icon: Clock, color: 'text-amber-500' },
];

const REVENUE_DATA = [
  { name: 'Jan', revenue: 45000, cost: 32000 },
  { name: 'Feb', revenue: 52000, cost: 38000 },
  { name: 'Mar', revenue: 48000, cost: 35000 },
  { name: 'Apr', revenue: 61000, cost: 42000 },
  { name: 'May', revenue: 55000, cost: 39000 },
  { name: 'Jun', revenue: 67000, cost: 45000 },
];

const STATUS_DATA = [
  { name: 'Active', value: 65, color: '#10b981' }, // emerald-500
  { name: 'Planning', value: 15, color: '#f59e0b' }, // amber-500
  { name: 'Completed', value: 20, color: '#3b82f6' }, // blue-500
];

export const CommunityDashboardView: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto p-6 md:p-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Community Overview</h1>
        <p className="text-muted-foreground mt-1">High-level metrics and activity across all projects.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Projects', value: '7', sub: '2 New this month', icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Total Units', value: '1,842', sub: '98% Occupancy', icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Active Builders', value: '12', sub: 'No churn', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'YTD Revenue', value: '$842k', sub: '+12% vs last year', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-black text-foreground">{kpi.value}</h3>
              <p className="text-xs font-semibold text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
              <kpi.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Charts) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Revenue Chart */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Revenue vs Costs</h3>
                <p className="text-sm text-muted-foreground">Monthly financial performance</p>
              </div>
              <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Full Report <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="cost" name="Install Costs" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} barSize={20} opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Status & Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-foreground mb-2">Project Status</h3>
                <div className="flex-1 flex items-center justify-center relative">
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={STATUS_DATA}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {STATUS_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-foreground">100%</span>
                            <span className="text-xs font-bold text-muted-foreground uppercase">Allocation</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    {STATUS_DATA.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-xs font-bold text-muted-foreground">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-foreground mb-4">Action Items</h3>
                <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                        <AlertCircle size={20} className="text-red-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-900 dark:text-red-200">5 Overdue Invoices</p>
                            <p className="text-xs text-red-700 dark:text-red-300">Total value: $12,450</p>
                        </div>
                        <button className="text-xs font-bold bg-white dark:bg-red-950 text-red-600 px-3 py-1.5 rounded-md shadow-sm border border-red-200 dark:border-red-800">
                            View
                        </button>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                        <Clock size={20} className="text-blue-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">8 Jobs Pending Review</p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Requires approval</p>
                        </div>
                        <button className="text-xs font-bold bg-white dark:bg-blue-950 text-blue-600 px-3 py-1.5 rounded-md shadow-sm border border-blue-200 dark:border-blue-800">
                            Review
                        </button>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                        <AlertCircle size={20} className="text-amber-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">3 Builders Missing Info</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">Profile incomplete</p>
                        </div>
                        <button className="text-xs font-bold bg-white dark:bg-amber-950 text-amber-600 px-3 py-1.5 rounded-md shadow-sm border border-amber-200 dark:border-amber-800">
                            Fix
                        </button>
                    </div>
                </div>
            </div>
          </div>

        </div>

        {/* Right Column (Activity & Feed) */}
        <div className="space-y-8">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
                    <Activity size={18} className="text-muted-foreground" />
                </div>
                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-border">
                    {ACTIVITY_DATA.map((item) => (
                        <div key={item.id} className="relative pl-10">
                            <div className="absolute left-0 top-1 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center z-10">
                                <item.icon size={14} className={item.color} />
                            </div>
                            <div className="flex flex-col">
                                <p className="text-sm text-foreground">
                                    <span className="font-bold">{item.user}</span> {item.action} <span className="font-semibold text-primary">{item.target}</span>.
                                </p>
                                <span className="text-xs text-muted-foreground mt-1">{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-8 py-2.5 border border-border rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    View All Activity
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
