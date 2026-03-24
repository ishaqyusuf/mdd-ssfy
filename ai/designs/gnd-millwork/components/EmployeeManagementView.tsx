import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Briefcase, 
  Building,
  UserCircle,
  ChevronDown,
  DollarSign,
  AlertCircle
} from 'lucide-react';

// Types
type EmployeeRole = 'delivery' | 'prehung production' | '1099 contractor' | 'admin' | 'orders dispatch';
type EmployeeProfile = 'sales commission' | 'payment adjustment (5%)' | 'bronze';
type OfficeLocation = 'miami' | 'lake wales';

interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  profile: EmployeeProfile;
  office: OfficeLocation;
  email: string;
  status: 'active' | 'on_leave' | 'inactive';
}

// Mock Data
const MOCK_EMPLOYEES: Employee[] = [
  { id: 'EMP-001', name: 'Ricardo Santillan', role: 'admin', profile: 'bronze', office: 'miami', email: 'r.santillan@gnd.com', status: 'active' },
  { id: 'EMP-002', name: 'Felix Acosta', role: 'delivery', profile: 'payment adjustment (5%)', office: 'lake wales', email: 'f.acosta@gnd.com', status: 'active' },
  { id: 'EMP-003', name: 'Sarah Miller', role: 'orders dispatch', profile: 'sales commission', office: 'miami', email: 's.miller@gnd.com', status: 'active' },
  { id: 'EMP-004', name: 'Alvaro Aguado', role: 'prehung production', profile: 'bronze', office: 'lake wales', email: 'a.aguado@gnd.com', status: 'active' },
  { id: 'EMP-005', name: 'Jamie Thompson', role: '1099 contractor', profile: 'bronze', office: 'miami', email: 'j.thompson@contractor.com', status: 'active' },
];

const ROLES: EmployeeRole[] = ['delivery', 'prehung production', '1099 contractor', 'admin', 'orders dispatch'];
const PROFILES: EmployeeProfile[] = ['sales commission', 'payment adjustment (5%)', 'bronze'];
const OFFICES: OfficeLocation[] = ['miami', 'lake wales'];

export const EmployeeManagementView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters
  const [officeFilter, setOfficeFilter] = useState<'all' | OfficeLocation>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | EmployeeRole>('all');

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffice = officeFilter === 'all' || emp.office === officeFilter;
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    return matchesSearch && matchesOffice && matchesRole;
  });

  const handleStartEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({ ...emp });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setEmployees(prev => prev.map(emp => emp.id === editingId ? { ...emp, ...editForm } as Employee : emp));
    setEditingId(null);
    setEditForm({});
  };

  const handleAddEmployee = (e: React.FormEvent) => {
      e.preventDefault();
      // Implementation for adding a new employee would go here
      setShowAddModal(false);
  };

  const getProfileBadgeColor = (profile: EmployeeProfile) => {
    switch (profile) {
      case 'sales commission': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'payment adjustment (5%)': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'bronze': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="px-6 py-6 border-b border-border bg-card shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <UserCircle className="text-primary" size={28} />
              Employee Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Configure staff roles, offices, and compensation profiles.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all shrink-0"
          >
            <UserPlus size={18} />
            Add New Employee
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mt-8 p-4 bg-muted/30 border border-border rounded-2xl">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Filters:</span>
            <select 
              value={officeFilter}
              onChange={(e) => setOfficeFilter(e.target.value as any)}
              className="bg-background border border-border rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="all">All Offices</option>
              {OFFICES.map(off => <option key={off} value={off}>{off.charAt(0).toUpperCase() + off.slice(1)}</option>)}
            </select>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-background border border-border rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              {ROLES.map(role => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* Employee Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-w-[800px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">ID / Name</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Office</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Role</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Compensation Profile</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filteredEmployees.map((emp) => {
                const isEditing = editingId === emp.id;
                
                return (
                  <tr key={emp.id} className={`group hover:bg-muted/10 transition-colors ${isEditing ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-muted border border-border flex items-center justify-center text-primary font-bold overflow-hidden shadow-inner">
                           <img src={`https://i.pravatar.cc/150?u=${emp.id}`} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{emp.name}</p>
                          <p className="text-[10px] font-mono font-bold text-muted-foreground">{emp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {isEditing ? (
                        <select 
                          className="bg-background border border-primary rounded-lg px-2 py-1.5 text-sm font-semibold outline-none w-full"
                          value={editForm.office}
                          onChange={(e) => setEditForm({...editForm, office: e.target.value as OfficeLocation})}
                        >
                          {OFFICES.map(off => <option key={off} value={off}>{off.charAt(0).toUpperCase() + off.slice(1)}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                           <MapPin size={14} className="text-muted-foreground" />
                           <span className="text-sm font-semibold text-foreground capitalize">{emp.office}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {isEditing ? (
                        <select 
                          className="bg-background border border-primary rounded-lg px-2 py-1.5 text-sm font-semibold outline-none w-full"
                          value={editForm.role}
                          onChange={(e) => setEditForm({...editForm, role: e.target.value as EmployeeRole})}
                        >
                          {ROLES.map(role => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                           <Briefcase size={14} className="text-muted-foreground" />
                           <span className="text-sm font-medium text-foreground capitalize">{emp.role}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {isEditing ? (
                        <select 
                          className="bg-background border border-primary rounded-lg px-2 py-1.5 text-sm font-semibold outline-none w-full"
                          value={editForm.profile}
                          onChange={(e) => setEditForm({...editForm, profile: e.target.value as EmployeeProfile})}
                        >
                          {PROFILES.map(prof => <option key={prof} value={prof}>{prof.charAt(0).toUpperCase() + prof.slice(1)}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm ${getProfileBadgeColor(emp.profile)}`}>
                          {emp.profile === 'sales commission' && <DollarSign size={10} />}
                          {emp.profile}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                       {isEditing ? (
                         <div className="flex justify-end gap-2">
                            <button 
                              onClick={handleSaveEdit}
                              className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                              title="Save Changes"
                            >
                               <Check size={16} strokeWidth={3} />
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted-foreground/10 transition-colors"
                              title="Cancel"
                            >
                               <X size={16} strokeWidth={3} />
                            </button>
                         </div>
                       ) : (
                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleStartEdit(emp)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Edit"
                            >
                               <Edit2 size={18} />
                            </button>
                            <button 
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Remove"
                            >
                               <Trash2 size={18} />
                            </button>
                            <button 
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                title="More"
                            >
                               <MoreVertical size={18} />
                            </button>
                         </div>
                       )}
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                  <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                         <div className="flex flex-col items-center gap-2">
                            <Search size={40} className="opacity-20" />
                            <p className="font-bold">No employees found matching your criteria.</p>
                            <button 
                              onClick={() => {setSearchQuery(''); setOfficeFilter('all'); setRoleFilter('all');}}
                              className="text-sm font-bold text-primary hover:underline"
                            >
                                Clear all filters
                            </button>
                         </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal Overlay */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowAddModal(false)}
        >
            <div 
              className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-foreground">Add New Employee</h2>
                        <p className="text-sm text-muted-foreground">Register a new staff member to the system.</p>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleAddEmployee} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                            <input required type="text" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="John Doe" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Work Email</label>
                            <input required type="email" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="j.doe@gndmillwork.com" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Office</label>
                            <select className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none">
                                {OFFICES.map(off => <option key={off} value={off}>{off.charAt(0).toUpperCase() + off.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Role</label>
                            <select className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none">
                                {ROLES.map(role => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Compensation Profile</label>
                            <select className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none">
                                {PROFILES.map(prof => <option key={prof} value={prof}>{prof.charAt(0).toUpperCase() + prof.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 px-4 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                            Save Employee
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};