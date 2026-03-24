import React, { useState, useRef, useEffect } from 'react';
import { PayoutView } from './components/PayoutView';
import { WorkerDashboard } from './components/WorkerDashboard';
import { WorkerOverview } from './components/WorkerOverview';
import { PaymentsDashboardView } from './components/PaymentsDashboardView';
import { JobDetailsView } from './components/JobDetailsView';
import { JobsView } from './components/JobsView';
import { PaymentDetailsView } from './components/PaymentDetailsView';
import { WorkOrderModule } from './components/WorkOrderModule';
import { SalesModule } from './components/SalesModule';
import { CommunityModule } from './components/CommunityModule';
import { SiteActivityView } from './components/SiteActivityView';
import { NotificationManagementView } from './components/NotificationManagementView';
import { EmployeeManagementView } from './components/EmployeeManagementView';
import { UserSettingsView } from './components/UserSettingsView';
import { 
  LayoutDashboard, 
  Briefcase, 
  Wallet, 
  Users, 
  FileBarChart, 
  LogOut, 
  Search,
  Bell,
  Menu,
  X,
  Home,
  ClipboardList,
  TrendingUp,
  Building,
  Settings,
  Activity,
  BellRing,
  Check,
  Clock,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  UserCircle
} from 'lucide-react';

// Navigation Groups
const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'sales', label: 'Sales', icon: TrendingUp },
    ]
  },
  {
    title: 'Operations',
    items: [
      { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
      { id: 'jobs', label: 'Jobs', icon: Briefcase },
      { id: 'community', label: 'Community', icon: Building },
    ]
  },
  {
    title: 'Finance',
    items: [
      { id: 'payments-dashboard', label: 'Payouts', icon: Wallet },
    ]
  },
  {
    title: 'Team',
    items: [
      { id: 'employees', label: 'Employees', icon: UserCircle },
      { id: 'worker-overview', label: 'Worker Portal', icon: Home },
      { id: 'contractors', label: 'Contractors', icon: Users },
    ]
  },
  {
    title: 'Insights',
    items: [
      { id: 'activity', label: 'Site Activity', icon: Activity },
      { id: 'notifications', label: 'Notifications', icon: BellRing },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
    ]
  }
];

// Mock Notifications
const INITIAL_NOTIFICATIONS = [
  { id: 1, title: 'New Job Created', message: 'A new trim task has been initialized for Lot 42.', time: '2 mins ago', read: false, icon: Briefcase, color: 'text-primary bg-primary/10' },
  { id: 2, title: 'Payment Received', message: '$4,250.00 from Lennar Homes confirmed via Stripe.', time: '1 hour ago', read: false, icon: DollarSign, color: 'text-green-600 bg-green-100' },
  { id: 3, title: 'Overdue Work Order', message: 'WO #2849 for Riverside project is now 2 days overdue.', time: '4 hours ago', read: true, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  { id: 4, title: 'Custom Job Submitted', message: 'Alex Thompson submitted a custom job for Unit 105.', time: 'Yesterday', read: true, icon: Activity, color: 'text-purple-600 bg-purple-100' },
];

export default function App() {
  const [currentView, setCurrentView] = useState<'payments-dashboard' | 'payouts' | 'worker' | 'jobs' | 'worker-overview' | 'work-orders' | 'sales' | 'community' | 'activity' | 'notifications' | 'employees' | 'settings'>('employees');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleJobClick = (id: string) => {
    setSelectedJobId(id);
    if (currentView !== 'jobs') setCurrentView('jobs');
  };

  const handlePaymentClick = (id: string) => {
    setSelectedPaymentId(id);
  };

  const handleNavClick = (viewId: string) => {
      if(viewId === 'contractors') setCurrentView('worker');
      else if(viewId === 'jobs') {
          setCurrentView('jobs');
          setSelectedJobId(null);
      }
      else if(viewId === 'worker-overview') setCurrentView('worker-overview');
      else if(viewId === 'payments-dashboard') {
          setCurrentView('payments-dashboard');
          setSelectedPaymentId(null);
      }
      else if(viewId === 'work-orders') setCurrentView('work-orders');
      else if(viewId === 'sales') setCurrentView('sales');
      else if(viewId === 'community') setCurrentView('community');
      else if(viewId === 'activity') setCurrentView('activity');
      else if(viewId === 'notifications') setCurrentView('notifications');
      else if(viewId === 'employees') setCurrentView('employees');
      else if(viewId === 'settings') setCurrentView('settings');
      else setCurrentView('payments-dashboard');
      
      setIsSidebarOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'payments-dashboard':
        if (selectedPaymentId) {
            return <PaymentDetailsView paymentId={selectedPaymentId} onBack={() => setSelectedPaymentId(null)} />;
        }
        return <PaymentsDashboardView onCreatePayout={() => setCurrentView('payouts')} onPaymentClick={handlePaymentClick} />;
      case 'payouts':
        return <PayoutView />;
      case 'worker':
        return <WorkerDashboard />;
      case 'jobs':
        if (selectedJobId) {
            return <JobDetailsView onBack={() => setSelectedJobId(null)} jobId={selectedJobId} />;
        }
        return <JobsView onJobClick={handleJobClick} />;
      case 'worker-overview':
        return <WorkerOverview />;
      case 'work-orders':
        return <WorkOrderModule />;
      case 'sales':
        return <SalesModule />;
      case 'community':
        return <CommunityModule />;
      case 'activity':
        return <SiteActivityView />;
      case 'notifications':
        return <NotificationManagementView />;
      case 'employees':
        return <EmployeeManagementView />;
      case 'settings':
        return <UserSettingsView />;
      default:
        return <PaymentsDashboardView onCreatePayout={() => setCurrentView('payouts')} onPaymentClick={handlePaymentClick} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen flex flex-col shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Area */}
        <div className="p-6 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Wallet size={20} strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg leading-none">PayFlow</span>
            <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Admin Pro</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx}>
              <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-2">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${(currentView === 'payouts' && item.id === 'payments-dashboard') || 
                        (currentView === 'payments-dashboard' && item.id === 'payments-dashboard') ||
                        (currentView === 'worker' && item.id === 'contractors') || 
                        (currentView === 'jobs' && item.id === 'jobs') ||
                        (currentView === 'worker-overview' && item.id === 'worker-overview') ||
                        (currentView === 'work-orders' && item.id === 'work-orders') ||
                        (currentView === 'sales' && item.id === 'sales') ||
                        (currentView === 'community' && item.id === 'community') ||
                        (currentView === 'activity' && item.id === 'activity') ||
                        (currentView === 'notifications' && item.id === 'notifications') ||
                        (currentView === 'employees' && item.id === 'employees') ||
                        (currentView === 'settings' && item.id === 'settings')
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                    `}
                  >
                    <item.icon size={18} strokeWidth={2} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-border mt-auto shrink-0">
          <div 
            onClick={() => handleNavClick('settings')}
            className={`flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer group ${currentView === 'settings' ? 'bg-muted' : ''}`}
          >
            <img 
              src="https://picsum.photos/id/64/200/200" 
              alt="Admin" 
              className="w-9 h-9 rounded-full object-cover border border-border group-hover:border-primary/50 transition-colors" 
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">Sarah Jenkins</p>
              <p className="text-xs text-muted-foreground truncate">Senior Admin</p>
            </div>
            <Settings size={16} className={`text-muted-foreground group-hover:text-foreground ${currentView === 'settings' ? 'text-primary' : ''}`} />
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-muted-foreground p-2 hover:bg-muted rounded-lg -ml-2"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex relative max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
               <input 
                  type="text" 
                  placeholder="Search..." 
                  className="pl-9 pr-4 py-2 w-64 bg-muted/50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary focus:bg-card transition-all placeholder:text-muted-foreground"
               />
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 relative">
             <div ref={bellRef}>
               <button 
                 onClick={() => setIsBellOpen(!isBellOpen)}
                 className={`p-2 rounded-full relative transition-all ${isBellOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
               >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-[10px] font-black rounded-full border-2 border-card flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
               </button>

               {isBellOpen && (
                 <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="px-5 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                     <div>
                       <h3 className="font-bold text-foreground">Notifications</h3>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{unreadCount} unread alerts</p>
                     </div>
                     <button 
                       onClick={handleMarkAllRead}
                       className="text-xs font-bold text-primary hover:underline"
                     >
                       Mark all as read
                     </button>
                   </div>
                   <div className="max-h-[400px] overflow-y-auto">
                     {notifications.length > 0 ? (
                       <div className="divide-y divide-border">
                         {notifications.map((n) => (
                           <div 
                             key={n.id} 
                             onClick={() => handleMarkAsRead(n.id)}
                             className={`p-4 flex gap-4 transition-colors cursor-pointer group ${n.read ? 'bg-background' : 'bg-primary/5'}`}
                           >
                             <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${n.color}`}>
                               <n.icon size={20} />
                             </div>
                             <div className="flex-1 space-y-1">
                               <div className="flex justify-between items-start">
                                 <h4 className={`text-sm font-bold leading-none ${n.read ? 'text-foreground' : 'text-primary'}`}>{n.title}</h4>
                                 <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                   <Clock size={10} />
                                   {n.time}
                                 </span>
                               </div>
                               <p className="text-xs text-muted-foreground leading-relaxed pr-4">{n.message}</p>
                               {!n.read && (
                                 <div className="pt-2 flex items-center gap-1.5 text-[10px] font-black text-primary uppercase">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                   New Activity
                                 </div>
                               )}
                             </div>
                             <div className="self-center">
                               <button className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all">
                                 <Check size={16} />
                               </button>
                             </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                         <BellRing size={40} className="text-muted-foreground mb-3" />
                         <p className="text-sm font-bold">No new notifications</p>
                         <p className="text-xs">We'll alert you when something happens.</p>
                       </div>
                     )}
                   </div>
                   <div className="p-3 border-t border-border bg-muted/20">
                     <button 
                       onClick={() => { setIsBellOpen(false); setCurrentView('activity'); }}
                       className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-all flex items-center justify-center gap-2"
                     >
                       View all site activity
                       <ChevronRight size={14} />
                     </button>
                   </div>
                 </div>
               )}
             </div>

             <button 
              onClick={() => handleNavClick('settings')}
              className={`p-2 rounded-full transition-colors ${currentView === 'settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
             >
                <Settings size={20} />
             </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
            {renderContent()}
        </div>
      </div>
    </div>
  );
}