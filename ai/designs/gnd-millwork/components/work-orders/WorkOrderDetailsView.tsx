import React from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Edit, 
  Search, 
  Bell, 
  Settings, 
  FileText, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  Clock,
  Plus,
  History
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface WorkOrderDetailsViewProps {
  orderId: string;
  onBack: () => void;
  onEdit: () => void;
}

export const WorkOrderDetailsView: React.FC<WorkOrderDetailsViewProps> = ({ orderId, onBack, onEdit }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          
          {/* Header */}
          <div className="flex flex-col gap-6 mb-6">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors self-start"
            >
              <ArrowLeft size={16} /> Back to Orders
            </button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-foreground text-3xl font-black leading-tight tracking-tight">WO #{orderId}</h1>
                  <Badge status="Completed" className="bg-green-100 text-green-700 border-green-200" />
                </div>
                <p className="text-muted-foreground text-base font-normal">Project: <span className="text-primary font-medium">Antillia Villas</span></p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 gap-2">
                  <RefreshCw size={18} />
                  Update Status
                </button>
                <button 
                  onClick={onEdit}
                  className="flex items-center justify-center rounded-lg h-10 px-4 bg-card text-foreground text-sm font-bold border border-border hover:bg-muted transition-colors gap-2"
                >
                  <Edit size={18} />
                  Edit Order
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-0 py-3 mb-6">
            <div className="flex h-11 w-full max-w-md items-center justify-center rounded-xl bg-muted/50 p-1">
              <button className="flex h-full grow items-center justify-center rounded-lg px-2 bg-card shadow-sm text-primary text-sm font-bold transition-all">Overview</button>
              <button className="flex h-full grow items-center justify-center rounded-lg px-2 text-muted-foreground hover:text-foreground text-sm font-semibold transition-all">Images</button>
              <button className="flex h-full grow items-center justify-center rounded-lg px-2 text-muted-foreground hover:text-foreground text-sm font-semibold transition-all">History Log</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Job Description */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
                  <h2 className="text-foreground font-bold text-lg">Job Description</h2>
                  <FileText className="text-muted-foreground" size={20} />
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground leading-relaxed">
                    Installation of premium marble flooring in the main foyer and living area. Includes sub-floor preparation, leveling, and application of protective sealant. Specific request for minimal grout lines as per architectural specs.
                  </p>
                </div>
              </div>

              {/* Project Details */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
                  <h2 className="text-foreground font-bold text-lg">Project Details</h2>
                  <MapPin className="text-muted-foreground" size={20} />
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Lot / Block</p>
                    <p className="text-foreground font-semibold">Lot 4, Block B</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Address</p>
                    <p className="text-foreground font-semibold">12920 SW 132nd St, Miami, FL 33186</p>
                  </div>
                </div>
              </div>

              {/* Homeowner Contact */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
                  <h2 className="text-foreground font-bold text-lg">Homeowner Contact</h2>
                  <User className="text-muted-foreground" size={20} />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      RS
                    </div>
                    <div>
                      <h3 className="text-foreground font-bold">Ricardo Santillan</h3>
                      <p className="text-muted-foreground text-sm">Primary Resident</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                      <Phone className="text-primary" size={18} />
                      <span className="text-foreground font-medium">(305) 555-0192</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                      <Mail className="text-primary" size={18} />
                      <span className="text-foreground font-medium">r.santillan@example.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
                  <h2 className="text-foreground font-bold text-lg">Site Photos</h2>
                  <button className="text-primary text-sm font-bold hover:underline">View All</button>
                </div>
                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="aspect-square rounded-lg overflow-hidden border border-border relative group cursor-pointer bg-muted">
                    <img className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhM34loYZCWGSP3uwrjMA5nL0SVlGrlYRQzBzjbBWPR2H1hK7orpQWAP_mFrLLbNZau5Ah9-cvz4fdDzOLQae69MCKrk8hhF0Y_h7y7RYtxHKyOYMGGvawuU82Y0eB7TL5gQNaMMfzX8JnzdAIhxA7kOIL_Ja9_lUEiPiS7xfQ08jVLgsrfMGf4DFdYAANWlo1KCo6Xlrujwiw8J1qQfLbecw2JBYu7qoYoM6kXlfwS68-6BXzjk5GJjLkieuJsXVkk6I3cxnZmUY" alt="Site" />
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden border border-border relative group cursor-pointer bg-muted">
                    <img className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuChsb-4aRc1T78Ls4--u6QhFqC2lqOD0hKEhBbSsTmXpGgIhbbnRISibONku2a9EjHKdrGGfA-0qQPT7QBXLFCaK_dadcm7KFoBoXTaxOzyIRuPAYTYCUcNUgdn8ejV-Rluw9WN9NC-ygqjFuRmGbWadj5GajJqBR1eW_0dbVf3HpylIv_eiUgmBaUVXiBGowL010fr-iJ9Uytg8kjs-gmIThu7hgF-R_WJB0HnFlnnLL_O5muS1vFaYgUxCtecG8ZF1MGafmhVn8k" alt="Site" />
                  </div>
                  <div className="aspect-square rounded-lg bg-muted flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-all cursor-pointer">
                    <Plus size={32} />
                    <span className="text-xs font-bold uppercase">Add Photo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-foreground font-bold text-sm uppercase tracking-widest">Current Status</h3>
                    <Badge status="Completed" />
                  </div>
                  <button className="w-full flex items-center justify-center rounded-lg h-11 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 gap-2">
                    <RefreshCw size={18} />
                    Update Status
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Requested Date</p>
                      <div className="flex items-center gap-2 text-foreground font-semibold">
                        <Calendar size={16} className="text-muted-foreground" />
                        Jan 15, 2024
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Scheduled For</p>
                      <div className="flex items-center gap-2 text-foreground font-bold">
                        <Clock size={16} className="text-primary" />
                        Jan 20, 2024 @ 09:00 AM
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Completed Date</p>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                        <CheckCircle2 size={16} />
                        Jan 21, 2024 @ 04:30 PM
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                  <h2 className="text-foreground font-bold text-sm uppercase tracking-widest">Personnel</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full border border-border" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBS3DnagvGEGAfI-2pmnASsx3Z-2MFn3S0QsI9QTRBPiEXKcZVDMsKYlFaQjalsni9napEGpuqHwBKpTQVWic9kDvatQaHhm7gwHW_ddmlDTjORcRtiEoY24OLRhQ7uhdQZ4ZPwm8gPBtGQZyT4RhBFMjD-2RipWCpsI115q9FsrncUirFL7zB9DAHY8_OKxPf0XKizKUCAHcyHPaFQVcogpq6rQTWOb7dk2LnLw-AKcOiAmOeVwD0JjVgMdefZv3F2ohPT-3rbtNg" alt="Supervisor" />
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Supervisor</p>
                        <p className="text-foreground font-semibold">Alvaro Aguado</p>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                      <MessageSquare size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full border border-border" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCncncQDZjKL7ZLMH5y7pfVwLmMtlS6elXbp6iVcxVXZCWSTgFVNXXSjFozGRTkbi8-O4gWmrCzwSFImmlbGQSRrifc4ZOvPxP3HXr5g1anHhWnTEJ97w6RzQV8LOGwEcTAYlNj39obktRZwS4MXOMlmQ1X61ziaS9y9yIXJKSa1o2qENRQZ3rPiD9zhh5AAQgALggB4xXVEJxn7MKVKkyO1PISujDVikD_919lD5sYL5mRnuqcz6qYcKhT7eXQhsAl65UVTQm4EqE" alt="Tech" />
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Tech</p>
                        <p className="text-foreground font-semibold">Felix Acosta</p>
                      </div>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  </div>
                </div>
              </div>

              {/* History Log */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
                  <h2 className="text-foreground font-bold text-sm uppercase tracking-widest">History Log</h2>
                  <History className="text-muted-foreground" size={18} />
                </div>
                <div className="p-6">
                  <div className="space-y-6 relative before:content-[''] before:absolute before:inset-y-2 before:left-[9px] before:w-0.5 before:bg-border">
                    
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-green-500 border-4 border-card z-10"></div>
                      <p className="text-xs font-bold text-muted-foreground">Jan 21, 04:30 PM</p>
                      <p className="text-sm font-semibold text-foreground">Order marked as Completed</p>
                      <p className="text-xs text-muted-foreground mt-0.5">By Felix Acosta</p>
                    </div>

                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-primary border-4 border-card z-10"></div>
                      <p className="text-xs font-bold text-muted-foreground">Jan 20, 09:15 AM</p>
                      <p className="text-sm font-semibold text-foreground">Job started on site</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Check-in confirmed via GPS</p>
                    </div>

                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-muted-foreground/30 border-4 border-card z-10"></div>
                      <p className="text-xs font-bold text-muted-foreground">Jan 16, 02:00 PM</p>
                      <p className="text-sm font-semibold text-foreground">Felix Acosta assigned to WO</p>
                      <p className="text-xs text-muted-foreground mt-0.5">By Dispatcher System</p>
                    </div>

                  </div>
                  <button className="w-full mt-6 py-2.5 rounded-lg border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors uppercase">
                      Load Full History
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};