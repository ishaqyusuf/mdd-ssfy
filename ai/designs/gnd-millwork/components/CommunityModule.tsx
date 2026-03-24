
import React, { useState } from 'react';
import { CommunityProjectsView } from './community/CommunityProjectsView';
import { CommunityBuildersView } from './community/CommunityBuildersView';
import { CommunityUnitsView } from './community/CommunityUnitsView';
import { CommunityModelsView } from './community/CommunityModelsView';
import { CommunityInstallCostsMainView } from './community/CommunityInstallCostsMainView';
import { CommunityJobsView } from './community/CommunityJobsView';
import { CommunityInvoicesView } from './community/CommunityInvoicesView';
import { CommunityBuilderTasksView } from './community/CommunityBuilderTasksView';
import { CommunityDashboardView } from './community/CommunityDashboardView';
import { 
  Building2, 
  Users, 
  Home, 
  Layers, 
  Briefcase, 
  FileText, 
  CreditCard,
  Download,
  Plus,
  DollarSign,
  ClipboardList,
  LayoutDashboard
} from 'lucide-react';

export const CommunityModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'units' | 'builders' | 'models' | 'builder-tasks' | 'install-costs' | 'jobs' | 'invoices' | 'payments'>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CommunityDashboardView />;
      case 'projects':
        return <CommunityProjectsView />;
      case 'units':
        return <CommunityUnitsView />;
      case 'builders':
        return <CommunityBuildersView />;
      case 'models':
        return <CommunityModelsView />;
      case 'builder-tasks':
        return <CommunityBuilderTasksView />;
      case 'install-costs':
        return <CommunityInstallCostsMainView />;
      case 'jobs':
        return <CommunityJobsView />;
      case 'invoices':
        return <CommunityInvoicesView />;
      case 'payments':
        return <div className="p-8 text-center text-muted-foreground">Job Payments View Coming Soon</div>;
      default:
        return <CommunityDashboardView />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-6 pt-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Community Management</h2>
            <p className="text-sm text-muted-foreground">Manage projects, builders, units, and financial workflows.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
              <Download size={18} />
              Export Data
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              <Plus size={18} />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border/50">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'projects', label: 'Projects', icon: Building2 },
            { id: 'units', label: 'Units', icon: Home },
            { id: 'builders', label: 'Builders', icon: Users },
            { id: 'models', label: 'Models', icon: Layers },
            { id: 'builder-tasks', label: 'Builder Tasks', icon: ClipboardList },
            { id: 'install-costs', label: 'Install Costs', icon: DollarSign },
            { id: 'jobs', label: 'Jobs', icon: Briefcase },
            { id: 'invoices', label: 'Invoices', icon: FileText },
            { id: 'payments', label: 'Payments', icon: CreditCard },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/20'}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative bg-muted/10">
        {renderContent()}
      </div>
    </div>
  );
};
