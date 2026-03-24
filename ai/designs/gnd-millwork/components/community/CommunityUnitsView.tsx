
import React from 'react';
import { Search, Filter, Home, LayoutTemplate, MapPin } from 'lucide-react';

const MOCK_UNITS = [
  { id: 'UNIT-101', model: '4093 RH', lot: '42', block: 'B', project: 'PARKLAND ROYALE 60' },
  { id: 'UNIT-102', model: '4093 LH', lot: '43', block: 'B', project: 'PARKLAND ROYALE 60' },
  { id: 'UNIT-103', model: '3613 LH', lot: '12', block: 'A', project: 'LENDLEASE DUPLEX' },
  { id: 'UNIT-104', model: '3546 RH', lot: '05', block: 'C', project: 'REDLANDS RIDGE SF' },
  { id: 'UNIT-105', model: '3284 RH', lot: '08', block: 'D', project: 'ARBOR ESTATES' },
  { id: 'UNIT-106', model: '2122 RH', lot: '22', block: 'F', project: 'VIVANT TH' },
  { id: 'UNIT-107', model: '2097 RH', lot: '99', block: 'X', project: 'WILDWOOD GROVES SF' },
  { id: 'UNIT-108', model: '4093 RH', lot: '44', block: 'B', project: 'PARKLAND ROYALE 60' },
];

export const CommunityUnitsView: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 shrink-0">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Units</span>
          <p className="text-2xl font-black text-foreground mt-1">1,842</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Under Construction</span>
          <p className="text-2xl font-black text-amber-600 mt-1">420</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed</span>
          <p className="text-2xl font-black text-green-600 mt-1">1,215</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">On Hold</span>
          <p className="text-2xl font-black text-slate-500 mt-1">207</p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
            <div className="flex items-center gap-2">
                <Home size={18} className="text-primary" />
                <h3 className="font-bold text-foreground">All Units</h3>
            </div>
            <div className="flex gap-2">
                <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                    type="text" 
                    placeholder="Search unit, lot, or block..." 
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                </div>
                <button className="p-2 border border-border bg-background rounded-lg hover:bg-muted text-muted-foreground">
                    <Filter size={18} />
                </button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
              <tr>
                <th className="px-6 py-4">Unit Key / ID</th>
                <th className="px-6 py-4">Model Name</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4 text-center">Lot</th>
                <th className="px-6 py-4 text-center">Block</th>
                <th className="px-6 py-4 text-right">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_UNITS.map((unit) => (
                <tr key={unit.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded text-foreground">{unit.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <LayoutTemplate size={14} className="text-muted-foreground" />
                        <span className="font-bold text-sm text-foreground">{unit.model}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{unit.project}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium">{unit.lot}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium">{unit.block}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">View 5 Tasks</span>
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
