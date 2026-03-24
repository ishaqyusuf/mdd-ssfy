import React from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  MoreHorizontal, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface WorkOrderListViewProps {
  onOrderClick: (id: string) => void;
}

export const WorkOrderListView: React.FC<WorkOrderListViewProps> = ({ onOrderClick }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Analytics Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6 flex-shrink-0">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-sm">assignment</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-bold text-foreground">1,284</h3>
            <div className="flex items-center gap-0.5 text-emerald-500 text-xs font-bold pb-1">
              <TrendingUp size={14} />
              +12.5%
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Completed</p>
            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-bold text-foreground">856</h3>
            <div className="flex items-center gap-0.5 text-emerald-500 text-xs font-bold pb-1">
              <TrendingUp size={14} />
              +8.2%
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-bold text-foreground">328</h3>
            <div className="flex items-center gap-0.5 text-rose-500 text-xs font-bold pb-1">
              <TrendingUp className="rotate-180" size={14} />
              -3.1%
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Overdue</p>
            <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-bold text-foreground">42</h3>
            <div className="flex items-center gap-0.5 text-rose-500 text-xs font-bold pb-1">
              <TrendingUp size={14} />
              +5.4%
            </div>
          </div>
        </div>
      </section>

      {/* Main Table Area */}
      <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
        <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          
          {/* Controls */}
          <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground" 
                  placeholder="Search orders, projects, or technicians..." 
                  type="text"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                <Filter size={16} className="text-muted-foreground" />
                <span>Filter</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                <Download size={16} className="text-muted-foreground" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12 text-center">
                    <input className="rounded border-border bg-transparent text-primary focus:ring-primary" type="checkbox"/>
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Project / Address</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Homeowner</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Scheduled Date</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Tech</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { id: '1', status: 'In Progress', statusColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', title: 'Roof Replacement Phase 2', address: '452 Oak Avenue, Springfield', owner: 'Sarah Jenkins', date: 'Oct 12, 2023', time: '09:00 AM', tech: 'David Miller', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwDqUVK8XPVqLVLlE7KFK7oNypgUoBR_xNJW5x_H34nEx_MjugGA4SA_Ogl8Ed5ONTIt4caf_fSipv-TcQ6i-Hkb2yto-4wYa-2uYxaD4ha9liZMhQKYcUWFo8STUxpVdt8JSRXXJEMY_5ORUCBn4zfXNkeWxkUIn3cHEVQZ9rEMwReTMHkQlqPtZS6WHAefcLM8Ik9hB7PO5uDu6Wu8ZjoNpNAK1B7PPoEukv_0h1rE5vR35sDE6Ih7vXltdqFBoI899uSfI4l9Y' },
                  { id: '2', status: 'Overdue', statusColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', title: 'Kitchen Backsplash Tiling', address: '128 Pine St, North District', owner: 'Robert Brown', date: 'Oct 05, 2023', time: '02:30 PM', tech: 'Michael Scott', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWq7pkaag8x0pl-xxToTr_O1h_i3n8alpAjY9Yk3kAiB_AFsc7SBqQVHD7HSM7S0sjDBiGNu2aYXJUR_n7_uz3nSBqiJHqMo9YXKSPDIFnf-q5H7bjXlhEe9e3MrmSiAAn7CKEIm5BRucmwe8iW5r-6apXz_WYDTkqkvy2Zj7l9laFubJu6XAoVyIATk6XY1S7taiYzaXAbrq1yzYT16QH2BsVkYwnGcMckJ9PB5aq3jo5RVIHCxFl4Oo7iaYFpFCDrzb3jNurEKY' },
                  { id: '3', status: 'Pending', statusColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', title: 'HVAC Yearly Maintenance', address: '77 Maple Drive, West Hill', owner: 'Emily Davis', date: 'Oct 14, 2023', time: '10:00 AM', tech: 'Lisa Wong', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEklxVQZri37UNGqJDSFtnDJfFUmooRSfZvcAaxJV0FPq9kL9nT7zW1ow7KIZ70jOxjV5w8wJGoe2QFkx3Olhf4cMPhyPLZwkHDkNKkgQm_gXh2eaclODxMDKmk2kB1BTd1ePEb0Xam8sT8kWMSFMfDYTzI844VQqgQtPIlAHCCk5eq-BYHs4Km0YS-A97DUiAmf8FIxK52X7N4xIIjMUZQnGzOQyTBqyPUDbm2bRB3Zjp-gUCD2V3Mgiq3JAwKr-HLBHP9rskkIE' },
                  { id: '4', status: 'Completed', statusColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', title: 'Window Installation', address: '202 Birch Court, Southgate', owner: 'James Wilson', date: 'Oct 11, 2023', time: '08:00 AM', tech: 'John Wick', avatar: null },
                  { id: '5', status: 'In Progress', statusColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', title: 'Electrical Wiring Upgrade', address: '313 Valley Road, East Side', owner: 'Mark Thompson', date: 'Oct 12, 2023', time: '11:15 AM', tech: 'Chris Evans', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_ISsE83MeogTTK4Gkr1HJ9OA3QZwo_6OcJDR7ENhR-ggd0H-dlixAGbDdLSsOM2jpLIViQHsM5e92mTx1eaXBoIchZBrKCGvlruDuu2bMWbRmEtNyMeOkX5IYudBxnHxBKW_RD9RRSkNcjdsxcM-SNPG9aHPb81o6Sqp7Zf9YIncHXRZZ2ATz6f2l2Ys4Mv4MqKTOl8u2nGVR8f68bOy4Wghg-Ejc3jT3JhekeTCqoJK_CXkU4YiBFHuCrhmSGRmnYnPH6RlO4Bs' },
                ].map((row, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onOrderClick(row.id)}
                  >
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input className="rounded border-border bg-transparent text-primary focus:ring-primary" type="checkbox"/>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase ${row.statusColor}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-foreground">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.address}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{row.owner}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {row.date} <span className="text-muted-foreground font-normal">{row.time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden border border-border">
                          {row.avatar ? (
                            <img className="w-full h-full object-cover" src={row.avatar} alt={row.tech} />
                          ) : (
                            <span className="text-muted-foreground">{row.tech.split(' ').map(n => n[0]).join('')}</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">{row.tech}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground">
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20 flex-shrink-0">
            <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">1 to 10</span> of 250 orders</p>
            <div className="flex items-center gap-1">
              <button className="p-1.5 border border-border rounded-md hover:bg-muted disabled:opacity-30 text-muted-foreground" disabled>
                <ChevronLeft size={18} />
              </button>
              <button className="w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-bold">1</button>
              <button className="w-8 h-8 rounded-md hover:bg-muted text-muted-foreground text-sm font-medium">2</button>
              <button className="w-8 h-8 rounded-md hover:bg-muted text-muted-foreground text-sm font-medium">3</button>
              <span className="px-2 text-muted-foreground">...</span>
              <button className="w-8 h-8 rounded-md hover:bg-muted text-muted-foreground text-sm font-medium">25</button>
              <button className="p-1.5 border border-border rounded-md hover:bg-muted text-muted-foreground">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};