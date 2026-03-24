
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Briefcase,
  Layers,
  Settings,
  ArrowUpRight
} from 'lucide-react';

// Mock Data for Activities
const ACTIVITIES = [
  { 
    id: 'ACT-001', 
    user: 'Sarah Jenkins', 
    role: 'Admin',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg',
    action: 'created_invoice',
    module: 'Sales',
    description: 'Created new invoice #INV-2024-009 for Acme Construction',
    amount: '$12,450.00',
    timestamp: 'Just now',
    status: 'success'
  },
  { 
    id: 'ACT-002', 
    user: 'Mike Rivera', 
    role: 'Manager',
    avatar: null,
    action: 'update_production',
    module: 'Operations',
    description: 'Updated production status for Lot 42 to "In Progress"',
    timestamp: '15 mins ago',
    status: 'info'
  },
  { 
    id: 'ACT-003', 
    user: 'System', 
    role: 'Bot',
    avatar: null,
    action: 'payment_received',
    module: 'Finance',
    description: 'Stripe webhook: Payment received for Invoice #INV-8821',
    amount: '$4,200.00',
    timestamp: '1 hour ago',
    status: 'success'
  },
  { 
    id: 'ACT-004', 
    user: 'Alex Thompson', 
    role: 'Contractor',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcNPhD3T1dk8PlbE0lbXMtQFFe3Y5-AF-UCxWhhFle4e5cJNK3GBXglm2oSJmibHiGSs2W0zZ66TZqnPZ0Na03GC-grMDS4m62Q5ZPvtJ-66Kzp2woHkYTPyfj0y07Gfhi4QRLK7h86sssxLlyL62CcWn7RYByDcCoYqK2c0CFZt-paZLmeyfccOSUyOvdXMqy2c6zfNBikF5DJ63Gi2A9zEAXCFA7-dg_8_Sp1vJNH7rF79WWvuGL4zcoweOhjU2nvjd4t-9_PwE',
    action: 'job_submitted',
    module: 'Jobs',
    description: 'Submitted job "Trim Installation - Phase 1" for review',
    timestamp: '2 hours ago',
    status: 'warning'
  },
  { 
    id: 'ACT-005', 
    user: 'Sarah Jenkins', 
    role: 'Admin',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg',
    action: 'delete_task',
    module: 'Community',
    description: 'Deleted "Old Baseboard Task" from Lennar Homes template',
    timestamp: '4 hours ago',
    status: 'error' // Used for destructive actions
  },
  { 
    id: 'ACT-006', 
    user: 'David Chen', 
    role: 'Sales',
    avatar: null,
    action: 'quote_sent',
    module: 'Sales',
    description: 'Sent Quote #Q-9921 to Skyline Developers',
    amount: '$85,000.00',
    timestamp: 'Yesterday, 4:30 PM',
    status: 'info'
  },
  { 
    id: 'ACT-007', 
    user: 'System', 
    role: 'Bot',
    avatar: null,
    action: 'inventory_alert',
    module: 'Inventory',
    description: 'Low stock alert: 5-1/4 Crown Moulding (WM49)',
    timestamp: 'Yesterday, 2:00 PM',
    status: 'error'
  },
  { 
    id: 'ACT-008', 
    user: 'Mike Rivera', 
    role: 'Manager',
    avatar: null,
    action: 'user_added',
    module: 'System',
    description: 'Added new user "Felix Acosta" as Technician',
    timestamp: 'Yesterday, 11:15 AM',
    status: 'success'
  },
  { 
    id: 'ACT-009', 
    user: 'Sarah Jenkins', 
    role: 'Admin',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEHowbXF556Sp1iQWyNQgySbcShD-n34QSA01YtI7Mq5Jynad5GqK_90-seB811J9iCLD22IZqh5EUGlQ93D5Ffx-xnckFFtmKy0qGYWBhHzrz0gvrwCNkJNngFUi72n25cI4V_tJEdkbuGpFTaRmXoKFNXlFpg3-10xEqlmQXm0LxFFQWoD3WiNWv_V58-MotUYcraUh6VwPh8MJFYJiVLJYy166LEPjbBkqQ64H9S4r_YX3CNPKMFezJhowbnTy9J_3Zl92Onfg',
    action: 'bulk_update',
    module: 'Community',
    description: 'Bulk updated pricing for 15 install costs',
    timestamp: 'Oct 23, 09:00 AM',
    status: 'info'
  },
];

export const SiteActivityView: React.FC = () => {
  const [filterModule, setFilterModule] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const getIcon = (action: string) => {
    switch (action) {
      case 'created_invoice': return <FileText size={16} />;
      case 'payment_received': return <DollarSign size={16} />;
      case 'job_submitted': return <Briefcase size={16} />;
      case 'update_production': return <RefreshCw size={16} />;
      case 'delete_task': return <Trash2 size={16} />;
      case 'user_added': return <User size={16} />;
      case 'inventory_alert': return <AlertCircle size={16} />;
      case 'bulk_update': return <Layers size={16} />;
      default: return <CheckCircle2 size={16} />;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'success': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
      case 'warning': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
      case 'error': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200';
      default: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
    }
  };

  const filteredActivities = ACTIVITIES.filter(item => {
    const matchesModule = filterModule === 'All' || item.module === filterModule;
    const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-6 pt-6 pb-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ArrowUpRight className="text-primary" />
                Site Activity
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Real-time tracking of system-wide operations and changes.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
              <Calendar size={16} />
              Last 30 Days
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
              <Download size={16} />
              Export Log
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                    type="text" 
                    placeholder="Search user, action, or details..." 
                    className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {['All', 'Sales', 'Finance', 'Operations', 'Community', 'Jobs', 'System'].map(mod => (
                    <button 
                        key={mod}
                        onClick={() => setFilterModule(mod)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
                            filterModule === mod 
                            ? 'bg-foreground text-background border-foreground' 
                            : 'bg-card border-border text-muted-foreground hover:border-foreground/30'
                        }`}
                    >
                        {mod}
                    </button>
                ))}
            </div>
        </div>
      </header>

      {/* Activity Timeline Feed */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
            <div className="relative border-l-2 border-border ml-3 md:ml-6 space-y-8 pb-12">
                {filteredActivities.map((item, index) => (
                    <div key={item.id} className="relative pl-8 md:pl-12 group">
                        {/* Timeline Connector */}
                        <div className={`
                            absolute -left-[9px] top-0 w-5 h-5 rounded-full border-4 border-background flex items-center justify-center
                            ${getStatusColors(item.status).replace('text-', 'text-current ').split(' ')[0]}
                        `}>
                            {/* Inner dot handled by bg color */}
                        </div>

                        {/* Card Content */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-start bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
                            {/* Icon & User */}
                            <div className="flex items-center gap-3 min-w-[180px]">
                                <div className="relative">
                                    {item.avatar ? (
                                        <img src={item.avatar} alt={item.user} className="w-10 h-10 rounded-full object-cover border border-border" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold border border-border">
                                            {item.user.charAt(0)}
                                        </div>
                                    )}
                                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-card ${getStatusColors(item.status)}`}>
                                        {getIcon(item.action)}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">{item.user}</p>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.role}</p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground tracking-wide mb-1">
                                        {item.module}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{item.timestamp}</span>
                                </div>
                                <p className="text-sm text-foreground font-medium leading-relaxed">
                                    {item.description}
                                </p>
                                {item.amount && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md border border-green-100 dark:border-green-800 text-xs font-bold">
                                        <DollarSign size={12} />
                                        {item.amount}
                                    </div>
                                )}
                            </div>

                            {/* Quick Action */}
                            <div className="self-center sm:self-start">
                                <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors">
                                    <ArrowUpRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredActivities.length === 0 && (
                    <div className="pl-12 py-12 text-center text-muted-foreground">
                        <p className="text-sm font-medium">No activity found matching your criteria.</p>
                        <button 
                            onClick={() => {setFilterModule('All'); setSearchQuery('');}}
                            className="mt-2 text-primary text-xs font-bold hover:underline"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex justify-center pt-4">
                <button className="px-6 py-2 bg-muted hover:bg-muted/80 text-muted-foreground text-sm font-bold rounded-full transition-colors">
                    Load Older Activity
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
