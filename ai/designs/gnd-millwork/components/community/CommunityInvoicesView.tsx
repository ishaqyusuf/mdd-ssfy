
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  MoreVertical, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Building2, 
  Home, 
  X,
  CreditCard,
  Calendar,
  Hash,
  DollarSign,
  Activity,
  Save
} from 'lucide-react';

// --- Types ---

interface InvoiceUnit {
  id: string;
  unitKey: string;
  model: string;
  lot: string;
  block: string;
  project: string;
  builder: string;
  totalContract: number;
  totalPaid: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  lastActivity: string;
}

interface UnitInvoiceItem {
  id: string;
  taskName: string; // e.g. "Trim - 1st Floor"
  invoiceNumber: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Draft' | 'Overdue';
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  checkNumber?: string;
}

interface ActivityLogItem {
  id: string;
  type: 'payment' | 'system' | 'edit';
  message: string;
  date: string;
  user: string;
}

// --- Mock Data ---

const MOCK_UNITS: InvoiceUnit[] = [
  { id: 'u1', unitKey: 'UNIT-101', model: '4093 RH', lot: '42', block: 'B', project: 'PARKLAND ROYALE', builder: 'Lennar', totalContract: 4250.00, totalPaid: 4250.00, status: 'Paid', lastActivity: '2 days ago' },
  { id: 'u2', unitKey: 'UNIT-102', model: '4093 LH', lot: '43', block: 'B', project: 'PARKLAND ROYALE', builder: 'Lennar', totalContract: 4250.00, totalPaid: 1250.00, status: 'Partial', lastActivity: '1 week ago' },
  { id: 'u3', unitKey: 'UNIT-105', model: 'RIVER RUN A', lot: '12', block: 'A', project: 'RIVER RUN', builder: 'Mattamy', totalContract: 3800.00, totalPaid: 0, status: 'Pending', lastActivity: 'Yesterday' },
  { id: 'u4', unitKey: 'UNIT-204', model: 'SOLSTICE II', lot: '05', block: 'C', project: 'SOLSTICE', builder: 'Pulte', totalContract: 5100.00, totalPaid: 0, status: 'Overdue', lastActivity: '3 weeks ago' },
  { id: 'u5', unitKey: 'UNIT-331', model: 'VILLA X', lot: '88', block: 'F', project: 'VIVANT TH', builder: 'Ryan Homes', totalContract: 2200.00, totalPaid: 2200.00, status: 'Paid', lastActivity: '1 month ago' },
];

const MOCK_INVOICES_DETAIL: Record<string, UnitInvoiceItem[]> = {
  'u1': [
    { id: 'inv-1', taskName: 'Trim - 1st Floor', invoiceNumber: 'INV-1001', amount: 1250.00, status: 'Paid', issueDate: '2023-10-01', dueDate: '2023-10-31', paymentDate: '2023-10-28', checkNumber: 'CHK-9982' },
    { id: 'inv-2', taskName: 'Doors - Interior', invoiceNumber: 'INV-1002', amount: 2500.00, status: 'Paid', issueDate: '2023-10-05', dueDate: '2023-11-05', paymentDate: '2023-11-02', checkNumber: 'CHK-9994' },
    { id: 'inv-3', taskName: 'Hardware Install', invoiceNumber: 'INV-1003', amount: 500.00, status: 'Paid', issueDate: '2023-10-15', dueDate: '2023-11-15', paymentDate: '2023-11-12', checkNumber: 'CHK-10021' },
  ],
  'u2': [
    { id: 'inv-4', taskName: 'Trim - 1st Floor', invoiceNumber: 'INV-1021', amount: 1250.00, status: 'Paid', issueDate: '2023-10-10', dueDate: '2023-11-10', paymentDate: '2023-11-08', checkNumber: 'CHK-10055' },
    { id: 'inv-5', taskName: 'Doors - Interior', invoiceNumber: 'INV-1045', amount: 2500.00, status: 'Pending', issueDate: '2023-10-25', dueDate: '2023-11-25' },
    { id: 'inv-6', taskName: 'Hardware Install', invoiceNumber: 'INV-1050', amount: 500.00, status: 'Draft', issueDate: '2023-11-01', dueDate: '2023-12-01' },
  ],
  'u4': [
    { id: 'inv-7', taskName: 'Whole House Trim', invoiceNumber: 'INV-9001', amount: 5100.00, status: 'Overdue', issueDate: '2023-09-01', dueDate: '2023-10-01' },
  ]
};

const MOCK_ACTIVITY: ActivityLogItem[] = [
  { id: 'a1', type: 'payment', message: 'Payment of $1,250.00 received via Check #CHK-10055', date: 'Nov 8, 2023 2:30 PM', user: 'System' },
  { id: 'a2', type: 'system', message: 'Invoice #INV-1045 generated', date: 'Oct 25, 2023 09:00 AM', user: 'Admin' },
  { id: 'a3', type: 'edit', message: 'Updated payment terms to Net 45', date: 'Oct 12, 2023 11:15 AM', user: 'Sarah J.' },
];

export const CommunityInvoicesView: React.FC = () => {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UnitInvoiceItem>>({});

  const selectedUnit = MOCK_UNITS.find(u => u.id === selectedUnitId);
  const unitInvoices = selectedUnitId ? (MOCK_INVOICES_DETAIL[selectedUnitId] || []) : [];

  const handleStartEdit = (invoice: UnitInvoiceItem) => {
    setEditingInvoiceId(invoice.id);
    setEditForm({ ...invoice });
  };

  const handleSaveEdit = () => {
    // In a real app, update state/backend here
    console.log("Saving invoice update:", editForm);
    setEditingInvoiceId(null);
    setEditForm({});
  };

  const filteredUnits = MOCK_UNITS.filter(u => 
    u.unitKey.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.lot.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'Partial': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Overdue': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      
      {/* Main List Area */}
      <div className={`flex flex-col flex-1 h-full overflow-hidden transition-all duration-300 ${selectedUnitId ? 'w-full lg:w-1/2 xl:w-7/12 border-r border-border' : 'w-full'}`}>
        
        {/* Analytics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 shrink-0 bg-background">
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Contracted</span>
                <p className="text-xl font-black text-foreground mt-1">$482,500</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Collected</span>
                <p className="text-xl font-black text-green-600 mt-1">$310,250</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outstanding</span>
                <p className="text-xl font-black text-amber-600 mt-1">$172,250</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overdue</span>
                <p className="text-xl font-black text-red-600 mt-1">$5,100</p>
            </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 pb-4 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                    type="text" 
                    placeholder="Search unit, project, or lot..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm"
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                    <Filter size={16} />
                    <span>Filter</span>
                </button>
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
                    <Download size={16} />
                    <span className="hidden sm:inline">Export</span>
                </button>
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-w-[600px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        <tr>
                            <th className="px-6 py-4">Unit Details</th>
                            <th className="px-6 py-4">Model & Builder</th>
                            <th className="px-6 py-4 text-right">Contract</th>
                            <th className="px-6 py-4 text-right">Paid</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-4 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredUnits.map(unit => (
                            <tr 
                                key={unit.id} 
                                onClick={() => setSelectedUnitId(unit.id)}
                                className={`group cursor-pointer transition-colors ${selectedUnitId === unit.id ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{unit.unitKey}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground">{unit.project}</span>
                                            <span>•</span>
                                            <span>Lot {unit.lot} / Blk {unit.block}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground">{unit.model}</span>
                                        <span className="text-xs text-muted-foreground">{unit.builder}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm font-mono font-bold text-foreground">${unit.totalContract.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-sm font-mono font-bold ${unit.totalPaid === unit.totalContract ? 'text-green-600' : 'text-muted-foreground'}`}>
                                        ${unit.totalPaid.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(unit.status)}`}>
                                        {unit.status}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <ChevronRight size={16} className={`text-muted-foreground transition-transform ${selectedUnitId === unit.id ? 'rotate-90 text-primary' : ''}`} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedUnitId && selectedUnit && (
        <div className="hidden lg:flex flex-col w-1/2 xl:w-5/12 bg-muted/10 h-full border-l border-border shadow-xl animate-in slide-in-from-right duration-300 z-10 overflow-hidden">
            
            {/* Panel Header */}
            <div className="p-6 border-b border-border bg-card flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-black text-foreground">{selectedUnit.unitKey}</h2>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(selectedUnit.status)}`}>
                                {selectedUnit.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Building2 size={12} /> {selectedUnit.project}</span>
                            <span className="flex items-center gap-1"><Home size={12} /> Lot {selectedUnit.lot}, Blk {selectedUnit.block}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedUnitId(null)}
                        className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 border border-border rounded-lg p-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Invoiced</span>
                        <p className="text-lg font-black text-foreground">${selectedUnit.totalContract.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-lg p-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Balance Due</span>
                        <p className={`text-lg font-black ${(selectedUnit.totalContract - selectedUnit.totalPaid) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            ${(selectedUnit.totalContract - selectedUnit.totalPaid).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Invoices/Tasks List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* List Container */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-primary" />
                        Unit Invoices & Tasks
                    </h3>
                    
                    {unitInvoices.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {unitInvoices.map(invoice => {
                                const isEditing = editingInvoiceId === invoice.id;
                                
                                return (
                                    <div key={invoice.id} className={`bg-card border rounded-xl shadow-sm overflow-hidden transition-all ${isEditing ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                                        {/* Row Header */}
                                        <div className="p-4 flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-foreground">{invoice.taskName}</span>
                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">{invoice.invoiceNumber}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Issued: {invoice.issueDate} • Due: {invoice.dueDate}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-foreground">${invoice.amount.toLocaleString()}</div>
                                                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                    invoice.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                                    invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Edit/View Mode */}
                                        {isEditing ? (
                                            <div className="px-4 pb-4 pt-2 bg-muted/20 border-t border-border space-y-4 animate-in slide-in-from-top-2">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Payment Date</label>
                                                        <div className="relative">
                                                            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                            <input 
                                                                type="date" 
                                                                className="w-full h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                                                                value={editForm.paymentDate || ''}
                                                                onChange={(e) => setEditForm({...editForm, paymentDate: e.target.value})}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Check / Ref #</label>
                                                        <div className="relative">
                                                            <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                            <input 
                                                                type="text" 
                                                                className="w-full h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                                                                placeholder="e.g. CHK-1234"
                                                                value={editForm.checkNumber || ''}
                                                                onChange={(e) => setEditForm({...editForm, checkNumber: e.target.value})}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                                                        <div className="flex gap-2">
                                                            {['Pending', 'Paid', 'Overdue'].map(s => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => setEditForm({...editForm, status: s as any})}
                                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md border transition-colors ${editForm.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input text-muted-foreground hover:bg-muted'}`}
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={handleSaveEdit} className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                                                        <Save size={14} /> Update Payment
                                                    </button>
                                                    <button onClick={() => setEditingInvoiceId(null)} className="h-9 px-4 bg-muted text-muted-foreground rounded-lg text-xs font-bold hover:text-foreground hover:bg-muted/80 transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/5 flex justify-between items-center">
                                                <div className="flex gap-4 text-xs text-muted-foreground">
                                                    {invoice.checkNumber && (
                                                        <span className="flex items-center gap-1"><CreditCard size={12} /> {invoice.checkNumber}</span>
                                                    )}
                                                    {invoice.paymentDate && (
                                                        <span className="flex items-center gap-1"><Clock size={12} /> Paid: {invoice.paymentDate}</span>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => handleStartEdit(invoice)}
                                                    className="text-xs font-bold text-primary hover:underline"
                                                >
                                                    Update Details
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                            <p className="text-muted-foreground text-sm font-medium">No invoices found for this unit.</p>
                            <button className="mt-2 text-xs font-bold text-primary flex items-center justify-center gap-1 hover:underline mx-auto">
                                <Plus size={14} /> Create Manual Invoice
                            </button>
                        </div>
                    )}
                </div>

                {/* Activity Log */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16} className="text-primary" />
                        Financial Activity
                    </h3>
                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        <div className="space-y-6 relative before:absolute before:inset-y-2 before:left-[7px] before:w-0.5 before:bg-border/60">
                            {MOCK_ACTIVITY.map(activity => (
                                <div key={activity.id} className="relative pl-6">
                                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-card z-10 ${activity.type === 'payment' ? 'bg-green-500' : 'bg-muted-foreground'}`}></div>
                                    <p className="text-xs text-muted-foreground mb-0.5">{activity.date} • {activity.user}</p>
                                    <p className="text-sm font-medium text-foreground">{activity.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
      )}

    </div>
  );
};
