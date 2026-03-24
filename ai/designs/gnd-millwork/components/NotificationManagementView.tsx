import React, { useState, useRef, useEffect } from 'react';
import { 
  BellRing, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Users, 
  Shield, 
  User, 
  Search, 
  Plus, 
  Trash2, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  MoreVertical,
  ArrowRight,
  ArrowLeft,
  Info,
  X,
  UserPlus
} from 'lucide-react';

interface NotificationChannel {
  id: string;
  name: string;
  category: string;
  description: string;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  assignments: {
    roles: string[];
    users: string[];
  };
  priority: 'low' | 'medium' | 'high';
}

const MOCK_ROLES = ['Admin', 'Sales Manager', 'Production Lead', 'Finance', 'Contractor'];

const ALL_SYSTEM_USERS = [
  'Alex Rivera',
  'Sarah Jenkins',
  'Michael Chen',
  'Marcus Webb',
  'Jamie Smith',
  'Elena Kosti',
  'David Miller',
  'Lisa Wong',
  'Chris Evans',
  'Ricardo Santillan',
  'Felix Acosta',
  'Alvaro Aguado'
];

const MOCK_CHANNELS: NotificationChannel[] = [
  { 
    id: 'job_created', 
    name: 'Job Created', 
    category: 'Jobs', 
    description: 'Triggered when a new job is initialized in the system.',
    channels: { email: true, sms: false, push: true },
    assignments: { roles: ['Admin', 'Production Lead'], users: [] },
    priority: 'low'
  },
  { 
    id: 'sales_payment_received', 
    name: 'Sales Payment Received', 
    category: 'Finance', 
    description: 'Notification for successfully processed invoice payments.',
    channels: { email: true, sms: false, push: true },
    assignments: { roles: ['Admin', 'Finance'], users: [] },
    priority: 'medium'
  },
  { 
    id: 'quote_created', 
    name: 'Quote Created', 
    category: 'Sales', 
    description: 'New quote issued to a customer.',
    channels: { email: true, sms: false, push: true },
    assignments: { roles: ['Sales Manager'], users: [] },
    priority: 'low'
  },
  { 
    id: 'payment_failed', 
    name: 'Payment Failed', 
    category: 'Finance', 
    description: 'Critical alert for failed Stripe transactions.',
    channels: { email: true, sms: true, push: true },
    assignments: { roles: ['Admin', 'Finance'], users: ['Sarah Jenkins'] },
    priority: 'high'
  },
  { 
    id: 'job_assigned', 
    name: 'Job Assigned', 
    category: 'Jobs', 
    description: 'When a job is assigned to a specific service provider.',
    channels: { email: true, sms: true, push: true },
    assignments: { roles: ['Contractor'], users: [] },
    priority: 'medium'
  },
  { 
    id: 'job_submitted', 
    name: 'Job Submitted', 
    category: 'Operations', 
    description: 'When a contractor marks a task as finished and submits for review.',
    channels: { email: true, sms: false, push: true },
    assignments: { roles: ['Production Lead'], users: [] },
    priority: 'medium'
  },
  { 
    id: 'custom_job_submitted', 
    name: 'Custom Job Submitted', 
    category: 'Operations', 
    description: 'Review request for non-standard manual priced jobs.',
    channels: { email: true, sms: true, push: true },
    assignments: { roles: ['Admin', 'Production Lead'], users: [] },
    priority: 'high'
  }
];

export const NotificationManagementView: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationChannel[]>(MOCK_CHANNELS);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add User State
  const [isUserSearchVisible, setIsUserSearchVisible] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const userSearchRef = useRef<HTMLDivElement>(null);

  const selectedEvent = notifications.find(n => n.id === selectedEventId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setIsUserSearchVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleChannel = (eventId: string, channel: 'email' | 'sms' | 'push') => {
    setNotifications(prev => prev.map(n => 
      n.id === eventId 
        ? { ...n, channels: { ...n.channels, [channel]: !n.channels[channel] } } 
        : n
    ));
  };

  const handleAddUserToEvent = (userName: string) => {
    if (!selectedEventId) return;
    setNotifications(prev => prev.map(n => {
      if (n.id === selectedEventId) {
        if (n.assignments.users.includes(userName)) return n;
        return {
          ...n,
          assignments: {
            ...n.assignments,
            users: [...n.assignments.users, userName]
          }
        };
      }
      return n;
    }));
    setIsUserSearchVisible(false);
    setUserSearchTerm('');
  };

  const handleRemoveUserFromEvent = (userName: string) => {
    if (!selectedEventId) return;
    setNotifications(prev => prev.map(n => {
      if (n.id === selectedEventId) {
        return {
          ...n,
          assignments: {
            ...n.assignments,
            users: n.assignments.users.filter(u => u !== userName)
          }
        };
      }
      return n;
    }));
  };

  const filteredNotifications = notifications.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableUsersToAdd = ALL_SYSTEM_USERS.filter(user => 
    !selectedEvent?.assignments.users.includes(user) &&
    user.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Left List Pane */}
      <div className={`
        flex flex-col border-r border-border transition-all duration-300 h-full
        ${selectedEventId ? 'hidden md:flex md:w-1/2 lg:w-2/5' : 'w-full'}
      `}>
        <div className="p-4 md:p-6 border-b border-border space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <BellRing className="text-primary size-5 md:size-6" />
                Notification Channels
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">Manage events and delivery settings.</p>
            </div>
            <button className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-sm transition-all">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Search events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border">
            {filteredNotifications.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className={`w-full text-left p-4 hover:bg-muted/30 transition-all border-l-4 group ${selectedEventId === event.id ? 'bg-primary/5 border-primary shadow-sm' : 'border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{event.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        event.priority === 'high' ? 'bg-red-100 text-red-700' : 
                        event.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {event.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{event.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-4">
                    <div className={`p-1 rounded ${event.channels.email ? 'text-primary bg-primary/10' : 'text-muted-foreground/30'}`}>
                      <Mail size={12} />
                    </div>
                    <div className={`p-1 rounded ${event.channels.sms ? 'text-primary bg-primary/10' : 'text-muted-foreground/30'}`}>
                      <MessageSquare size={12} />
                    </div>
                    <div className={`p-1 rounded ${event.channels.push ? 'text-primary bg-primary/10' : 'text-muted-foreground/30'}`}>
                      <Smartphone size={12} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-bold uppercase tracking-tighter">{event.category}</span>
                  {event.assignments.roles.map(role => (
                    <span key={role} className="text-[9px] bg-primary/5 px-1.5 py-0.5 rounded text-primary font-bold">{role}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Detail Pane */}
      {selectedEventId && selectedEvent ? (
        <div className={`
          flex-1 flex flex-col bg-muted/5 animate-in slide-in-from-right md:slide-in-from-right-0 duration-300 h-full
          ${selectedEventId ? 'flex' : 'hidden md:flex'}
        `}>
          <div className="p-4 md:p-6 border-b border-border bg-card flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              {/* Back Button for Mobile Only */}
              <button 
                onClick={() => setSelectedEventId(null)}
                className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg md:text-xl font-black text-foreground tracking-tight">{selectedEvent.name}</h3>
                  <span className="hidden sm:inline-block text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">ID: {selectedEvent.id}</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-1 md:line-clamp-none">{selectedEvent.description}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedEventId(null)}
              className="hidden md:flex p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32 md:pb-8">
            {/* Delivery Methods Section */}
            <div className="space-y-4">
              <h4 className="text-xs md:text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Settings size={16} className="text-primary" />
                Delivery Methods
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {[
                  { id: 'email', icon: Mail, label: 'Email', desc: 'Send to primary work email' },
                  { id: 'sms', icon: MessageSquare, label: 'SMS/Text', desc: 'Mobile carrier direct text' },
                  { id: 'push', icon: Smartphone, label: 'In-App / Push', desc: 'Dashboard & Mobile alerts' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleChannel(selectedEvent.id, item.id as any)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedEvent.channels[item.id as keyof typeof selectedEvent.channels] 
                        ? 'bg-primary/5 border-primary shadow-sm' 
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${selectedEvent.channels[item.id as keyof typeof selectedEvent.channels] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <item.icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-foreground truncate">{item.label}</span>
                        {selectedEvent.channels[item.id as keyof typeof selectedEvent.channels] && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Assignments Section */}
            <div className="space-y-4">
              <h4 className="text-xs md:text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Assignment Rules
              </h4>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 md:p-6 border-b border-border bg-muted/20">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                    <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Subscriber Groups (Roles)</h5>
                    <button className="text-xs font-bold text-primary hover:underline text-left w-fit">+ Manage Roles</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_ROLES.map(role => {
                      const isActive = selectedEvent.assignments.roles.includes(role);
                      return (
                        <button 
                          key={role}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all flex items-center gap-2 ${
                            isActive 
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                              : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          <Shield size={12} className="shrink-0" />
                          {role}
                          {isActive && <X size={12} className="hover:text-red-200 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-card relative">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                    <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Individual Subscribers (Users)</h5>
                    <div ref={userSearchRef} className="relative">
                      <button 
                        onClick={() => setIsUserSearchVisible(!isUserSearchVisible)}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 w-fit"
                      >
                        <Plus size={14} /> Add User
                      </button>
                      
                      {isUserSearchVisible && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-3 border-b border-border bg-muted/30">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                              <input 
                                autoFocus
                                type="text" 
                                placeholder="Search all users..."
                                className="w-full pl-8 pr-4 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {availableUsersToAdd.length > 0 ? (
                              availableUsersToAdd.map(userName => (
                                <button
                                  key={userName}
                                  onClick={() => handleAddUserToEvent(userName)}
                                  className="w-full text-left p-2.5 hover:bg-muted rounded-lg text-xs font-semibold flex items-center gap-3 transition-colors"
                                >
                                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                                    {userName.charAt(0)}
                                  </div>
                                  <span className="flex-1 truncate">{userName}</span>
                                  <UserPlus size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-muted-foreground italic">No users found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedEvent.assignments.users.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEvent.assignments.users.map(userName => (
                        <div key={userName} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border group hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <User size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{userName}</p>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Manual Override</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveUserFromEvent(userName)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 md:opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-2xl bg-muted/5">
                      <p className="text-xs text-muted-foreground font-medium italic">No individual users assigned.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Configuration */}
            <div className="p-4 md:p-6 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col md:flex-row items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                    <Info size={20} />
                </div>
                <div>
                    <h5 className="text-sm font-bold text-foreground">Advanced Notification Logic</h5>
                    <p className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-relaxed">
                        Currently using default system templates. Customizing payload data or liquid templates is available for 
                        <strong> Premium Admin</strong> accounts. Contact support to enable custom formatting for <em>{selectedEvent.id}</em>.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-sm">
                            Edit Template
                        </button>
                        <button className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-xs font-bold hover:bg-muted transition-all">
                            Send Test Event
                        </button>
                    </div>
                </div>
            </div>
          </div>

          <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-6 border-t border-border bg-card flex justify-end gap-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:shadow-none z-10">
             <button 
               onClick={() => setSelectedEventId(null)}
               className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
             >
                Cancel
             </button>
             <button className="flex-[2] md:flex-none px-8 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                Save
                <ArrowRight size={18} className="hidden md:inline" />
             </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-center bg-muted/5 animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-card rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/30 mb-6 group-hover:scale-110 transition-transform">
            <BellRing size={48} />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-2">Manage System Alerts</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Select a notification event from the left sidebar to configure delivery methods and assignment rules.
          </p>
        </div>
      )}
    </div>
  );
};
