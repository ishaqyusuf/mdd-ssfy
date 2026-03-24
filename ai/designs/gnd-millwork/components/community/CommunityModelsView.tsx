
import React, { useState } from 'react';
import { Search, Layers, ChevronRight, PenTool } from 'lucide-react';
import { CommunityModelConfigureModal } from './CommunityModelConfigureModal';

const MOCK_MODELS = [
  { id: 'MOD-001', builder: 'Mattamy Homes', name: '4093 RH', type: 'Single Family' },
  { id: 'MOD-002', builder: 'Mattamy Homes', name: '4093 LH', type: 'Single Family' },
  { id: 'MOD-003', builder: 'Lennar Homes LLC', name: '3613 LH', type: 'Townhouse' },
  { id: 'MOD-004', builder: 'Stellar Homes', name: '3546 RH', type: 'Duplex' },
  { id: 'MOD-005', builder: 'PulteGroup', name: '3284 RH', type: 'Single Family' },
  { id: 'MOD-006', builder: 'Ryan Homes', name: '2122 RH', type: 'Villa' },
  { id: 'MOD-007', builder: 'D.R Horton', name: '2097 RH', type: 'Single Family' },
  { id: 'MOD-008', builder: 'Mattamy Homes', name: '3613 RH', type: 'Townhouse' },
];

export const CommunityModelsView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<typeof MOCK_MODELS[0] | null>(null);

  const handleConfigure = (model: typeof MOCK_MODELS[0]) => {
    setSelectedModel(model);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Models</span>
                <p className="text-3xl font-black text-foreground mt-2">{MOCK_MODELS.length}</p>
            </div>
            <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Most Used</span>
                <p className="text-xl font-bold text-primary mt-2">4093 RH</p>
                <p className="text-xs text-muted-foreground">Used in 42 units</p>
            </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-foreground flex items-center gap-2">
                <Layers size={18} className="text-primary" />
                Model Configurations
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search models..." 
                className="w-full pl-9 pr-4 py-2 bg-muted/50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
              <tr>
                <th className="px-6 py-4">Model Name</th>
                <th className="px-6 py-4">Builder</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_MODELS.map((model) => (
                <tr 
                  key={model.id} 
                  className="hover:bg-muted/20 transition-colors group cursor-pointer"
                  onClick={() => handleConfigure(model)}
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-foreground">{model.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{model.builder}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                      {model.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Configure <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CommunityModelConfigureModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        model={selectedModel} 
      />
    </div>
  );
};
