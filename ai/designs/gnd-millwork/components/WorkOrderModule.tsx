import React, { useState } from 'react';
import { WorkOrderListView } from './work-orders/WorkOrderListView';
import { WorkOrderCalendarView } from './work-orders/WorkOrderCalendarView';
import { WorkOrderAnalyticsView } from './work-orders/WorkOrderAnalyticsView';
import { WorkOrderDetailsView } from './work-orders/WorkOrderDetailsView';
import { WorkOrderFormView } from './work-orders/WorkOrderFormView';
import { FileText, CalendarDays, BarChart2, Plus, Download } from 'lucide-react';

export const WorkOrderModule: React.FC = () => {
  const [view, setView] = useState<'list' | 'calendar' | 'analytics' | 'details' | 'create' | 'edit'>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleOrderClick = (id: string) => {
    setSelectedOrderId(id);
    setView('details');
  };

  const renderContent = () => {
    switch (view) {
      case 'list':
        return <WorkOrderListView onOrderClick={handleOrderClick} />;
      case 'calendar':
        return <WorkOrderCalendarView />;
      case 'analytics':
        return <WorkOrderAnalyticsView />;
      case 'details':
        if (selectedOrderId) {
          return (
            <WorkOrderDetailsView 
              orderId={selectedOrderId} 
              onBack={() => setView('list')} 
              onEdit={() => setView('edit')}
            />
          );
        }
        return <WorkOrderListView onOrderClick={handleOrderClick} />;
      case 'create':
        return <WorkOrderFormView mode="create" onBack={() => setView('list')} />;
      case 'edit':
        return <WorkOrderFormView mode="edit" orderId={selectedOrderId || ''} onBack={() => setView('details')} />;
      default:
        return <WorkOrderListView onOrderClick={handleOrderClick} />;
    }
  };

  // Hide the header for details/create/edit views as they have their own headers
  if (view === 'details' || view === 'create' || view === 'edit') {
    return renderContent();
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Module Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-6 pt-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Work Orders</h2>
            <p className="text-sm text-muted-foreground">Manage field operations, scheduling, and technician analytics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
              <Download size={18} />
              Export CSV
            </button>
            <button 
              onClick={() => setView('create')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Plus size={18} />
              New Work Order
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-8">
          <button 
            onClick={() => setView('list')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${view === 'list' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${view === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Schedule
          </button>
          <button 
            onClick={() => setView('analytics')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${view === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Analytics
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>
    </div>
  );
};