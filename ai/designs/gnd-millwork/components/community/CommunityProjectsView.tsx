
import React from 'react';
import { Search, Filter, MoreHorizontal, Building, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

const MOCK_PROJECTS = [
  { id: 'PRJ-001', title: 'PARKLAND ROYALE 60', address: '123 Parkland Blvd', units: 45, status: 'Active', addon: 12500 },
  { id: 'PRJ-002', title: 'LENDLEASE DUPLEX', address: '88 Lendlease Way', units: 12, status: 'Active', addon: 5000 },
  { id: 'PRJ-003', title: 'BREEZEWOOD VILLAS', address: '450 Breezewood Ln', units: 88, status: 'Completed', addon: 0 },
  { id: 'PRJ-004', title: 'Solstice', address: '990 Solstice Ave', units: 156, status: 'Active', addon: 25000 },
  { id: 'PRJ-005', title: 'REDLANDS RIDGE SF', address: '22 Redlands Rd', units: 34, status: 'On Hold', addon: 2000 },
  { id: 'PRJ-006', title: 'CORAL LANDINGS SF', address: '77 Coral Dr', units: 62, status: 'Active', addon: 15000 },
  { id: 'PRJ-007', title: 'WILDWOOD GROVES SF', address: '12 Wildwood Ct', units: 28, status: 'Planning', addon: 0 },
];

export const CommunityProjectsView: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 shrink-0">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Projects</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-foreground">{MOCK_PROJECTS.length}</span>
            <Building className="text-primary opacity-20" size={24} />
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Units</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-foreground">425</span>
            <TrendingUp className="text-green-500" size={24} />
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Completed</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-foreground">8</span>
            <CheckCircle2 className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Add-on Value</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-foreground">$59.5k</span>
            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">+12%</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Table Controls */}
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              <Filter size={16} />
              Filter
            </button>
          </div>

          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
              <tr>
                <th className="px-6 py-4">Project Title</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-center">Units</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Add-on Amount</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_PROJECTS.map((project) => (
                <tr key={project.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{project.title}</span>
                      <span className="text-xs text-muted-foreground">{project.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{project.address}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-muted px-2.5 py-0.5 rounded text-xs font-bold">{project.units}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      project.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' :
                      project.status === 'Completed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {project.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />}
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono font-medium">
                    ${project.addon.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
