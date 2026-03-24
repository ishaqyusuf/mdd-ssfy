import React from 'react';
import { 
  ArrowLeft, 
  Search, 
  Bell, 
  MoreVertical, 
  ShoppingCart, 
  FileText, 
  Mail, 
  Edit3, 
  Wallet, 
  Phone, 
  MapPin, 
  Filter, 
  Settings, 
  Paperclip,
  CheckCircle2
} from 'lucide-react';

interface SalesCustomerDetailViewProps {
  customerId?: string;
  onBack: () => void;
}

export const SalesCustomerDetailView: React.FC<SalesCustomerDetailViewProps> = ({ customerId = 'CUST-001', onBack }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            Back to Customers
          </button>
          <div className="h-4 w-px bg-border"></div>
          <span className="font-semibold text-foreground">Acme Construction</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              className="w-full bg-muted/50 border-none rounded-lg py-1.5 pl-9 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground" 
              placeholder="Search..." 
              type="text"
            />
          </div>
          <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div 
                className="size-20 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0 bg-cover bg-center" 
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC4rXctgl2of9p7s-oZJAoB4aMQOl5IaWt8qknyWkNsl4t_xitpXx1mbnNod5nb9Nkqwgp2OnuVfT83Cz1pOsB0LgwGlFpAqflqKbuYnbRea62XKAoUX9wOGj-iAZSpuMdIJuHjtlkGV-bjpLgub8LyP5GXEFvShJrjPw5Lh2pfN-nPMwSRwvW_Q38OfUNnM3NCaN3ArBxjxV_LREzYcaCOP3GRMP97IZHc2lF_HEFKlwuENWguQPxgTwqM3pAF1LDZ5pq2f1mQ88H5')" }}
              ></div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">Acme Construction</h2>
                  <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800 flex items-center gap-1">
                    <CheckCircle2 size={12} className="fill-current" />
                    Wholesale - Tier 1
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mt-1">Full-service Commercial Developer • San Francisco, CA</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all">
                <ShoppingCart size={18} />
                New Invoice
              </button>
              <button className="bg-card border border-border text-foreground text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-all">
                <FileText size={18} />
                New Quote
              </button>
              <button className="bg-card border border-border text-foreground text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-all">
                <Mail size={18} />
                Email
              </button>
              <button className="bg-card border border-border text-foreground text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-all">
                <Edit3 size={18} />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Financial Health */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Wallet className="text-primary" size={20} />
                Financial Health
              </h3>
              <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">Good Standing</span>
            </div>
            <div className="space-y-5 flex-1">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-muted-foreground">Lifetime Value</span>
                  <span className="text-foreground font-bold">$1.24M</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full w-[85%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-muted-foreground">Outstanding Balance</span>
                  <span className="text-red-600 font-bold">$42,300</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full w-[28%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-muted-foreground">Credit Limit ($150k)</span>
                  <span className="text-foreground font-bold">72% Available</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full w-[72%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contacts */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-6">
              <Phone className="text-primary" size={20} />
              Quick Contacts
            </h3>
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">JD</div>
                  <div>
                    <p className="text-sm font-bold text-foreground">John Doe</p>
                    <p className="text-xs text-muted-foreground">Primary • PM</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                    <Phone size={16} />
                  </button>
                  <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                    <Mail size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm">SM</div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Sarah Miller</p>
                    <p className="text-xs text-muted-foreground">Secondary • AP</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                    <Phone size={16} />
                  </button>
                  <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                    <Mail size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-6">
              <MapPin className="text-primary" size={20} />
              Locations
            </h3>
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Billing</p>
                <p className="text-xs text-foreground leading-relaxed">
                  123 Corporate Plaza<br/>Suite 400<br/>San Francisco, CA 94105
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Shipping</p>
                <p className="text-xs text-foreground leading-relaxed">
                  456 Jobsite Way<br/>Building C<br/>Oakland, CA 94607
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <button className="w-full text-xs font-bold text-primary flex items-center justify-center gap-1 hover:underline">
                <MapPin size={14} />
                View on Google Maps
              </button>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="border-b border-border flex flex-col sm:flex-row sm:items-center justify-between px-6 bg-muted/20">
            <div className="flex gap-8 overflow-x-auto no-scrollbar">
              <button className="py-4 text-sm font-semibold text-primary border-b-2 border-primary">Invoices</button>
              <button className="py-4 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground hover:border-border transition-colors">Quotes</button>
              <button className="py-4 text-sm font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground hover:border-border transition-colors">Communication Logs</button>
            </div>
            <div className="flex items-center gap-2 py-2 sm:py-0">
              <button className="text-xs font-bold text-muted-foreground hover:text-primary">View All</button>
              <button className="p-1 text-muted-foreground hover:text-foreground">
                <Filter size={16} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border">
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground">INV-2024-089</td>
                  <td className="px-6 py-4 text-muted-foreground">Oct 12, 2023</td>
                  <td className="px-6 py-4 text-muted-foreground">Nov 12, 2023</td>
                  <td className="px-6 py-4 font-semibold text-foreground">$12,450.00</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">PAID</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-primary"><MoreVertical size={16} /></button>
                  </td>
                </tr>
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground">INV-2024-092</td>
                  <td className="px-6 py-4 text-muted-foreground">Dec 01, 2023</td>
                  <td className="px-6 py-4 text-muted-foreground">Dec 31, 2023</td>
                  <td className="px-6 py-4 font-semibold text-foreground">$8,900.00</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold rounded-full">PENDING</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-primary"><MoreVertical size={16} /></button>
                  </td>
                </tr>
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground">INV-2024-095</td>
                  <td className="px-6 py-4 text-muted-foreground">Jan 14, 2024</td>
                  <td className="px-6 py-4 text-muted-foreground">Feb 14, 2024</td>
                  <td className="px-6 py-4 font-semibold text-foreground">$15,200.00</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-full">OVERDUE</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-primary"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-muted/10 border-t border-border text-center">
            <button className="text-xs font-bold text-primary hover:underline">See full invoice history</button>
          </div>
        </div>

        {/* Bottom Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <Settings className="text-primary" size={20} />
              Order Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Delivery Mode</span>
                <span className="text-sm font-semibold text-foreground">Standard Flatbed</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Default Payment</span>
                <span className="text-sm font-semibold text-foreground">Net 30</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Species Preference</span>
                <span className="text-sm font-semibold text-foreground">Red Oak, White Pine</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Tax Status</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">Exempt</span>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Notes & Files
              </h3>
              <button className="text-xs font-bold text-primary hover:underline">+ Add New</button>
            </div>
            <div className="flex-1 space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">MAR 12, 2024 • ALEX M.</p>
                <p className="text-xs text-foreground italic">"Client requested specific milling profile for the upcoming Oak Ridge project. Refer to profile drawing #D-45."</p>
              </div>
              <div className="flex items-center gap-3 p-2 border border-dashed border-border rounded-lg text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors cursor-pointer">
                <Paperclip size={16} />
                <span className="text-xs font-medium">Tax_Exemption_Form_2024.pdf</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};