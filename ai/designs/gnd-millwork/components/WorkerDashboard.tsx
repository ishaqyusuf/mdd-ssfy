import React from 'react';
import { 
  Search, 
  Wallet, 
  ChevronRight, 
  TrendingUp, 
  BarChart2, 
  BadgeCheck, 
  Lightbulb, 
  Headphones,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis } from 'recharts';

// Mock Data
const earningsData = [
  { name: 'Jan', value: 4500 },
  { name: 'Feb', value: 6500 },
  { name: 'Mar', value: 5500 },
  { name: 'Apr', value: 8500 },
  { name: 'May', value: 4000 },
  { name: 'Jun', value: 7500 },
];

const submissions = [
  { date: 'Oct 24, 2023', time: '11:45 AM', title: '3x Interior Doors Installation', site: 'Oakwood Residential B-12', status: 'Approved', amount: 450.00 },
  { date: 'Oct 23, 2023', time: '09:15 AM', title: 'Full Living Room Painting', site: 'Harbor Square Units', status: 'Pending Review', amount: 1200.00 },
  { date: 'Oct 21, 2023', time: '04:30 PM', title: '5x Kitchen Cabinet Repairs', site: 'Oakwood Residential A-04', status: 'Processing', amount: 325.00 },
  { date: 'Oct 20, 2023', time: '10:00 AM', title: 'Window Sealing (Exterior)', site: 'South Bay Industrial', status: 'Approved', amount: 180.00 },
];

export const WorkerDashboard: React.FC = () => {
  return (
    <div className="flex-1 bg-background overflow-y-auto h-full">
      {/* Top Navigation Bar from Design */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
                <Wallet className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                Worker<span className="text-primary">Portal</span>
              </h2>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-primary text-sm font-semibold transition-colors">Dashboard</a>
              <a href="#" className="text-primary text-sm font-semibold transition-colors">Earnings & Jobs</a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm font-semibold transition-colors">Submissions</a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm font-semibold transition-colors">Settings</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                type="text" 
                className="pl-10 pr-4 py-2 bg-muted border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary focus:bg-card transition-all placeholder:text-muted-foreground text-foreground" 
                placeholder="Search tasks..." 
              />
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-bold text-foreground leading-none">Alex Rivera</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pro Contractor</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-primary/20">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLSC5xtBbrMGkfO0TuMtX2YtCl6-Lc1tKbvYFa5GgeyYmkXqz5Xm8QCJN7y-Zcx-B4DGi-UlBbsXJjF9KDG11olKl-omfvK2K58g1ObBSLNkDk1kVj4170l9MGP5aqcnP3TYY4z6d0ymSJGCYhQoSdrofWa-LrcfM4USPEjDQVsjhKWKK4ilctfO9Hxh_26t1yP442aQqB2_LBwPun1f6hkWmLaI-kkb3DKcNXU4m8Pmv_yZ4vE8x_-FaR3WxlmPL72TglgFmtU_4" 
                  alt="Worker profile" 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-6 text-sm">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Home</a>
          <ChevronRight className="text-muted-foreground w-4 h-4" />
          <span className="text-foreground font-semibold">Earnings & Jobs</span>
        </nav>

        {/* Page Heading & Balance Action */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground">Earnings & Jobs</h1>
            <p className="text-muted-foreground text-lg">Track your completed work and manage your income transparency.</p>
          </div>
          <div className="flex items-center gap-4 bg-card p-2 pl-6 rounded-xl border border-border shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Available Balance</span>
              <span className="text-2xl font-black text-foreground">$3,240.50</span>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
              <Wallet className="w-5 h-5" />
              Request Payout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* Chart Section */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Earnings Progress</h3>
                  <p className="text-sm text-muted-foreground">Monthly income trend for current year</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs font-bold rounded bg-muted text-muted-foreground">3M</button>
                  <button className="px-3 py-1.5 text-xs font-bold rounded bg-primary text-primary-foreground">6M</button>
                  <button className="px-3 py-1.5 text-xs font-bold rounded bg-muted text-muted-foreground">1Y</button>
                </div>
              </div>

              {/* Recharts Implementation */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                     <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderRadius: '8px', 
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))'
                      }}
                     />
                     <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}
                       dy={10}
                     />
                     <Bar 
                       dataKey="value" 
                       fill="hsl(var(--primary))" 
                       radius={[6, 6, 0, 0]} 
                       barSize={60}
                       fillOpacity={1}
                     />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Recent Submissions</h3>
                <button className="text-primary text-sm font-bold hover:underline">View All History</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted/50 text-[11px] uppercase tracking-widest font-bold text-muted-foreground">
                      <th className="px-6 py-4">Submission Date</th>
                      <th className="px-6 py-4">Task List Summary</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {submissions.map((sub, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-foreground">{sub.date}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{sub.time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-foreground">{sub.title}</div>
                          <div className="text-xs text-muted-foreground">Site: {sub.site}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider 
                            ${sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                              sub.status === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 
                              'bg-blue-100 text-blue-700'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-foreground">${sub.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Performance */}
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Your Performance</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter leading-none mb-1">Total Jobs</p>
                    <p className="text-xl font-black text-foreground leading-none">128</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-card text-primary border border-primary/20 flex items-center justify-center shadow-sm">
                    <BarChart2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter leading-none mb-1">Avg Job Value</p>
                    <p className="text-xl font-black text-foreground leading-none">$342.10</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-card text-primary border border-primary/20 flex items-center justify-center shadow-sm">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter leading-none mb-1">Approval Rate</p>
                    <p className="text-xl font-black text-foreground leading-none">98.4%</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Level Progress</span>
                  <span className="text-xs font-bold text-primary uppercase">Tier 3 Expert</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '72%' }}></div>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground font-medium">8 more approved jobs to reach <span className="font-bold text-foreground">Master Elite</span> status.</p>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
               <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                 <Lightbulb className="text-primary w-5 h-5" />
                 Pro Tips
               </h4>
               <ul className="space-y-4 text-sm">
                 <li className="flex gap-3">
                   <div className="w-1 h-1 rounded-full bg-primary shrink-0 mt-2"></div>
                   <p className="text-muted-foreground">Include clear photos of finished tasks to speed up approval times by <span className="font-bold text-emerald-600">24%</span>.</p>
                 </li>
                 <li className="flex gap-3">
                   <div className="w-1 h-1 rounded-full bg-primary shrink-0 mt-2"></div>
                   <p className="text-muted-foreground">Payouts requested before Friday 5 PM EST are processed in the same-day cycle.</p>
                 </li>
               </ul>
            </div>

            {/* Support */}
            <div className="bg-foreground rounded-xl p-6 text-background relative overflow-hidden">
               <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 text-primary-foreground">
                  <Headphones className="w-32 h-32" />
               </div>
               <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 relative z-10">Need help?</p>
               <p className="text-sm font-medium mb-4 relative z-10 text-background/90">Our support team is available 24/7 for payment inquiries.</p>
               <button className="w-full py-2 bg-background text-foreground rounded-lg text-sm font-bold hover:bg-muted transition-colors relative z-10">Contact Support</button>
            </div>

          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-border py-8 px-6 text-center">
         <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">WorkerPortal Management System © 2023. All financial records are encrypted.</p>
      </footer>
    </div>
  );
};