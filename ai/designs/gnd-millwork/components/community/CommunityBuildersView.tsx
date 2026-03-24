
import React, { useState } from 'react';
import { Search, MoreVertical, HardHat, TrendingUp, Briefcase, Plus, Edit } from 'lucide-react';
import { CommunityBuilderModal } from './CommunityBuilderModal';

const MOCK_BUILDERS = [
  { id: 'BLD-001', name: 'Mattamy Homes', models: 12, tasks: 145, status: 'Active', isLegacy: true },
  { id: 'BLD-002', name: 'Lennar Homes LLC', models: 24, tasks: 320, status: 'Active', isLegacy: false },
  { id: 'BLD-003', name: 'PulteGroup', models: 8, tasks: 90, status: 'Inactive', isLegacy: true },
  { id: 'BLD-004', name: 'Stellar Homes', models: 5, tasks: 45, status: 'Active', isLegacy: false },
  { id: 'BLD-005', name: 'Ryan Homes', models: 18, tasks: 210, status: 'Active', isLegacy: false },
  { id: 'BLD-006', name: 'D.R Horton', models: 30, tasks: 450, status: 'Active', isLegacy: true },
  { id: 'BLD-007', name: 'Flexible Builders', models: 3, tasks: 12, status: 'Pending', isLegacy: false },
];

export const CommunityBuildersView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<typeof MOCK_BUILDERS[0] | null>(null);

  const handleCreate = () => {
    setSelectedBuilder(null);
    setIsModalOpen(true);
  };

  const handleEdit = (builder: typeof MOCK_BUILDERS[0]) => {
    setSelectedBuilder(builder);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 shrink-0">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Builders</p>
            <h3 className="text-3xl font-black text-foreground">{MOCK_BUILDERS.length}</h3>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <HardHat size={24} />
          </div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Active Tasks</p>
            <h3 className="text-3xl font-black text-foreground">1,272</h3>
          </div>
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
            <Briefcase size={24} />
          </div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Performance</p>
            <h3 className="text-3xl font-black text-foreground">98.5%</h3>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
            <h3 className="font-bold text-foreground">Builder Directory</h3>
            <div className="flex items-center gap-3">
                <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                    type="text" 
                    placeholder="Search builders..." 
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all"
                />
                </div>
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    New Builder
                </button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
              <tr>
                <th className="px-6 py-4">Builder Name</th>
                <th className="px-6 py-4 text-center">Models Configured</th>
                <th className="px-6 py-4 text-center">Active Tasks</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_BUILDERS.map((builder) => (
                <tr key={builder.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {builder.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{builder.name}</span>
                        {builder.isLegacy && <span className="text-[10px] text-amber-600 font-bold uppercase">Legacy System</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium">{builder.models}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium">{builder.tasks}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      builder.status === 'Active' ? 'bg-green-100 text-green-700' : 
                      builder.status === 'Inactive' ? 'bg-slate-100 text-slate-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {builder.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                        <button 
                            onClick={() => handleEdit(builder)}
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                            title="Edit Builder"
                        >
                            <Edit size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                            <MoreVertical size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <CommunityBuilderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        builder={selectedBuilder}
      />
    </div>
  );
};
