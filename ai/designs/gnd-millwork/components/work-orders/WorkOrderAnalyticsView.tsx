import React from 'react';
import { Search, Filter, LayoutGrid, List, TrendingUp, TrendingDown, Star } from 'lucide-react';

export const WorkOrderAnalyticsView: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Analytics Controls */}
      <section className="px-8 py-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground" 
                placeholder="Search technician..." 
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>
              <select className="text-sm bg-muted/50 border border-border rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-primary/20 transition-all text-foreground">
                <option>Last 30 Days</option>
                <option>This Quarter</option>
                <option>Last Quarter</option>
                <option>Year to Date</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground">
              <Filter size={20} />
            </button>
            <div className="h-6 w-[1px] bg-border"></div>
            <div className="flex bg-muted p-1 rounded-lg">
              <button className="p-1.5 rounded-md bg-card shadow-sm text-foreground">
                <LayoutGrid size={18} />
              </button>
              <button className="p-1.5 rounded-md text-muted-foreground">
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="px-8 pb-8 space-y-6 flex-1">
        
        {/* Distribution Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-foreground">Order Distribution by Technician</h3>
              <p className="text-sm text-muted-foreground">Comparing completed vs. pending tasks per tech</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-xs font-medium text-muted-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs font-medium text-muted-foreground">Pending</span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {[
              { name: 'David Miller', completed: 65, pending: 15, total: 80 },
              { name: 'Michael Scott', completed: 45, pending: 35, total: 72 },
              { name: 'Lisa Wong', completed: 80, pending: 5, total: 94 },
              { name: 'Chris Evans', completed: 55, pending: 25, total: 64 }
            ].map(tech => (
              <div key={tech.name} className="flex items-center gap-4">
                <div className="w-32 text-sm font-semibold truncate text-right text-foreground">{tech.name}</div>
                <div className="flex-1 flex h-4 gap-1">
                  <div className="h-full bg-primary rounded-l-full" style={{ width: `${tech.completed}%` }}></div>
                  <div className="h-full bg-amber-500 rounded-r-full" style={{ width: `${tech.pending}%` }}></div>
                </div>
                <div className="w-20 text-xs font-bold text-muted-foreground">{tech.total} total</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Technician Performance Leaderboard</h3>
            <p className="text-sm text-muted-foreground">Key efficiency metrics for the current period</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Technician</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Total Orders</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Completion Rate</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Avg. Completion Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Customer Rating</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { name: 'David Miller', role: 'Senior Technician', orders: 124, rate: 94.2, time: '3h 15m', rating: 4.9, count: 82, trend: 4, trendDir: 'up', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwDqUVK8XPVqLVLlE7KFK7oNypgUoBR_xNJW5x_H34nEx_MjugGA4SA_Ogl8Ed5ONTIt4caf_fSipv-TcQ6i-Hkb2yto-4wYa-2uYxaD4ha9liZMhQKYcUWFo8STUxpVdt8JSRXXJEMY_5ORUCBn4zfXNkeWxkUIn3cHEVQZ9rEMwReTMHkQlqPtZS6WHAefcLM8Ik9hB7PO5uDu6Wu8ZjoNpNAK1B7PPoEukv_0h1rE5vR35sDE6Ih7vXltdqFBoI899uSfI4l9Y' },
                  { name: 'Lisa Wong', role: 'HVAC Specialist', orders: 108, rate: 88.5, time: '4h 45m', rating: 4.7, count: 64, trend: 2, trendDir: 'up', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEklxVQZri37UNGqJDSFtnDJfFUmooRSfZvcAaxJV0FPq9kL9nT7zW1ow7KIZ70jOxjV5w8wJGoe2QFkx3Olhf4cMPhyPLZwkHDkNKkgQm_gXh2eaclODxMDKmk2kB1BTd1ePEb0Xam8sT8kWMSFMfDYTzI844VQqgQtPIlAHCCk5eq-BYHs4Km0YS-A97DUiAmf8FIxK52X7N4xIIjMUZQnGzOQyTBqyPUDbm2bRB3Zjp-gUCD2V3Mgiq3JAwKr-HLBHP9rskkIE' },
                  { name: 'Chris Evans', role: 'Electrician', orders: 92, rate: 76.0, time: '5h 20m', rating: 4.5, count: 51, trend: 1.5, trendDir: 'down', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_ISsE83MeogTTK4Gkr1HJ9OA3QZwo_6OcJDR7ENhR-ggd0H-dlixAGbDdLSsOM2jpLIViQHsM5e92mTx1eaXBoIchZBrKCGvlruDuu2bMWbRmEtNyMeOkX5IYudBxnHxBKW_RD9RRSkNcjdsxcM-SNPG9aHPb81o6Sqp7Zf9YIncHXRZZ2ATz6f2l2Ys4Mv4MqKTOl8u2nGVR8f68bOy4Wghg-Ejc3jT3JhekeTCqoJK_CXkU4YiBFHuCrhmSGRmnYnPH6RlO4Bs' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={row.img} alt={row.name} className="w-10 h-10 rounded-full object-cover bg-muted" />
                        <div>
                          <p className="font-bold text-sm text-foreground">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-foreground">{row.orders}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground">{row.rate}%</span>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${row.rate > 90 ? 'bg-emerald-500' : row.rate > 80 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${row.rate}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-foreground">{row.time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Star size={16} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-foreground">{row.rating}</span>
                        <span className="text-xs text-muted-foreground">({row.count})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${row.trendDir === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {row.trendDir === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {row.trendDir === 'up' ? '+' : '-'}{row.trend}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};