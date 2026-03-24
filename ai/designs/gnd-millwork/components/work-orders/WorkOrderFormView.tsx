import React from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Info, 
  MapPin, 
  ChevronRight, 
  Construction, 
  User, 
  Map, 
  ClipboardList 
} from 'lucide-react';

interface WorkOrderFormViewProps {
  mode: 'create' | 'edit';
  orderId?: string;
  onBack: () => void;
}

export const WorkOrderFormView: React.FC<WorkOrderFormViewProps> = ({ mode, orderId, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm mb-6 text-muted-foreground">
            <button onClick={onBack} className="hover:text-primary transition-colors">Work Orders</button>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">
              {mode === 'create' ? 'New Work Order' : `Edit Order ${orderId}`}
            </span>
          </nav>

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground">
                {mode === 'create' ? 'Create Work Order' : `Edit Work Order ${orderId}`}
              </h1>
              <p className="text-muted-foreground text-base">
                {mode === 'create' 
                  ? 'Initialize a new project and assign initial details.' 
                  : 'Modify project scope, homeowner details, and assignment parameters.'}
              </p>
            </div>
            {mode === 'edit' && (
              <div className="flex gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2"></span>
                  In Progress
                </span>
                <button className="flex items-center gap-2 px-4 py-2 bg-card text-foreground text-sm font-bold rounded-lg border border-border hover:bg-muted transition-colors">
                  <Eye size={18} />
                  View History
                </button>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <form className="divide-y divide-border" onSubmit={(e) => { e.preventDefault(); onBack(); }}>
              
              {/* Section 1: Project Details */}
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Construction className="text-primary" size={24} />
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Project Details</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-semibold mb-2 text-foreground" htmlFor="project-name">Project Name</label>
                    <select 
                      id="project-name"
                      className="w-full h-12 rounded-lg border border-input bg-background px-4 text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                      defaultValue="willow-creek"
                    >
                      <option value="summer-oak">Summer Oak Residences</option>
                      <option value="willow-creek">Willow Creek Estates</option>
                      <option value="pine-valley">Pine Valley Townhomes</option>
                      <option value="maple-heights">Maple Heights Development</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold mb-2 text-foreground" htmlFor="lot">Lot</label>
                    <input 
                      id="lot"
                      type="text" 
                      defaultValue={mode === 'edit' ? "42A" : ""} 
                      className="w-full h-12 rounded-lg border border-input bg-background px-4 text-foreground focus:ring-2 focus:ring-primary transition-all outline-none" 
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold mb-2 text-foreground" htmlFor="block">Block</label>
                    <input 
                      id="block"
                      type="text" 
                      defaultValue={mode === 'edit' ? "B-4" : ""} 
                      className="w-full h-12 rounded-lg border border-input bg-background px-4 text-foreground focus:ring-2 focus:ring-primary transition-all outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Homeowner Info */}
              <div className="p-6 md:p-8 bg-muted/30">
                <div className="flex items-center gap-2 mb-6">
                  <User className="text-primary" size={24} />
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Homeowner Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground" htmlFor="homeowner-name">Full Name</label>
                    <input 
                      id="homeowner-name"
                      type="text" 
                      defaultValue={mode === 'edit' ? "Sarah Jenkins" : ""} 
                      className="w-full h-12 rounded-lg border border-input bg-background px-4 text-foreground focus:ring-2 focus:ring-primary transition-all outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground" htmlFor="phone">Phone Number</label>
                    <input 
                      id="phone"
                      type="tel" 
                      defaultValue={mode === 'edit' ? "(555) 012-3456" : ""} 
                      className="w-full h-12 rounded-lg border border-input bg-background px-4 text-foreground focus:ring-2 focus:ring-primary transition-all outline-none" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2 text-foreground" htmlFor="address">Property Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
                      <input 
                        id="address"
                        type="text" 
                        defaultValue={mode === 'edit' ? "742 Evergreen Terrace, Springfield, IL 62704" : ""} 
                        className="w-full h-12 rounded-lg border border-input bg-background pl-10 pr-4 text-foreground focus:ring-2 focus:ring-primary transition-all outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Job Specification */}
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <ClipboardList className="text-primary" size={24} />
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Job Specification</h2>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">Priority Level</label>
                    <div className="flex gap-3">
                      {['Low', 'Medium', 'High', 'Urgent'].map((level) => (
                        <label key={level} className="flex-1 cursor-pointer">
                          <input 
                            type="radio" 
                            name="priority" 
                            value={level.toLowerCase()} 
                            className="sr-only peer" 
                            defaultChecked={level === 'Medium'}
                          />
                          <div className={`
                            flex items-center justify-center py-3 rounded-lg border border-input 
                            peer-checked:border-primary peer-checked:bg-primary/5 
                            text-muted-foreground peer-checked:text-primary 
                            transition-all font-semibold text-sm
                            ${level === 'Urgent' ? 'peer-checked:border-destructive peer-checked:bg-destructive/5 peer-checked:text-destructive' : ''}
                          `}>
                            {level}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground" htmlFor="description">Job Description</label>
                    <textarea 
                      id="description"
                      rows={5}
                      className="w-full rounded-lg border border-input bg-background p-4 text-foreground focus:ring-2 focus:ring-primary transition-all resize-none outline-none placeholder:text-muted-foreground" 
                      placeholder="Provide detailed instructions for the technician..."
                      defaultValue={mode === 'edit' ? "Homeowner reported a recurring leak in the master bathroom ceiling during heavy rainfall. Initial inspection suggests potential flashing failure around the chimney. Requires full diagnostic and waterproof sealing. Technician should call Sarah 30 mins before arrival to secure pets." : ""}
                    ></textarea>
                    <p className="mt-2 text-xs text-muted-foreground">Max 1000 characters. Detailed notes help technicians prepare the right equipment.</p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 md:p-8 flex items-center justify-end gap-4 bg-muted/10">
                <button 
                  type="button" 
                  onClick={onBack} 
                  className="px-6 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted-foreground/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                  <Save size={18} />
                  {mode === 'create' ? 'Create Order' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Context Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pb-8">
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Info size={18} />
                </div>
                <h3 className="font-bold text-foreground">Internal Notes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This is the 3rd work order for this property in the last 12 months. Consider suggesting a full roof inspection to the homeowner.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Map size={18} />
                </div>
                <h3 className="font-bold text-foreground">Location Snapshot</h3>
              </div>
              <div className="h-12 w-full rounded-md bg-muted/50 flex items-center px-4 overflow-hidden relative">
                <div className="flex items-center gap-2 relative z-10">
                  <MapPin size={16} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Springfield, Sector B-4 • Zone 4</span>
                </div>
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent opacity-50"></div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};