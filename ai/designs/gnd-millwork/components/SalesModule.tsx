import React, { useState } from 'react';
import { SalesDashboardView } from './sales/SalesDashboardView';
import { SalesInvoiceEditorView } from './sales/SalesInvoiceEditorView';
import { SalesExecutiveDashboardView } from './sales/SalesExecutiveDashboardView';
import { SalesCustomersView } from './sales/SalesCustomersView';
import { SalesCustomerDetailView } from './sales/SalesCustomerDetailView';
import { Download, Plus } from 'lucide-react';

export const SalesModule: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'editor' | 'operations' | 'customers' | 'customer-detail' | 'invoices' | 'quotes' | 'inventory'>('dashboard');
  const [previousView, setPreviousView] = useState<'dashboard' | 'operations' | 'customers'>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const handleCreateInvoice = () => {
    if (view === 'dashboard' || view === 'operations' || view === 'customers' || view === 'customer-detail') {
        // If coming from detail, we might want to go back to detail, but for simplicity let's stick to main views or current
        setPreviousView(view === 'customer-detail' ? 'customers' : view);
    }
    setView('editor');
  };

  const handleBackFromEditor = () => {
    setView(previousView);
  };

  const handleCustomerClick = (id: string) => {
    setSelectedCustomerId(id);
    setView('customer-detail');
  };

  const handleBackToCustomers = () => {
    setView('customers');
    setSelectedCustomerId(null);
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <SalesExecutiveDashboardView onCreateInvoice={handleCreateInvoice} />;
      case 'editor':
        return <SalesInvoiceEditorView onBack={handleBackFromEditor} />;
      case 'operations':
        return <SalesDashboardView onCreateInvoice={handleCreateInvoice} />;
      case 'customers':
        return <SalesCustomersView onCustomerClick={handleCustomerClick} />;
      case 'customer-detail':
        return <SalesCustomerDetailView customerId={selectedCustomerId || undefined} onBack={handleBackToCustomers} />;
      case 'invoices':
        return <div className="flex items-center justify-center h-full text-muted-foreground">Invoices Module Coming Soon</div>;
      case 'quotes':
        return <div className="flex items-center justify-center h-full text-muted-foreground">Quotes Module Coming Soon</div>;
      case 'inventory':
        return <div className="flex items-center justify-center h-full text-muted-foreground">Inventory Module Coming Soon</div>;
      default:
        return <SalesExecutiveDashboardView onCreateInvoice={handleCreateInvoice} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Module Header - Hidden in specific views if needed */}
      {view !== 'editor' && view !== 'customer-detail' && (
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-6 pt-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Sales Hub</h2>
              <p className="text-sm text-muted-foreground">Millwork operations, quotes, and invoice management.</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setView('dashboard')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('customers')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'customers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Customers
            </button>
            <button 
              onClick={() => setView('operations')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'operations' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Operations
            </button>
            <button 
              onClick={() => setView('invoices')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Invoices
            </button>
            <button 
              onClick={() => setView('quotes')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'quotes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Quotes
            </button>
            <button 
              onClick={() => setView('inventory')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${view === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Inventory
            </button>
          </div>
        </header>
      )}

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};