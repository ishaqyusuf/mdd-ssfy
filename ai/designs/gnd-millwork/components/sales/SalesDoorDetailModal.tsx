import React from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, ShoppingCart, Check } from 'lucide-react';

interface SalesDoorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalesDoorDetailModal: React.FC<SalesDoorDetailModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative z-50 flex flex-col w-full max-w-5xl max-h-[90vh] bg-card rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div>
                <h2 className="text-foreground text-xl font-bold leading-tight tracking-[-0.015em]">Solid Core Smooth 2-Panel Arch Top</h2>
                <p className="text-sm text-muted-foreground mt-1">Select sizes and quantities for this product.</p>
            </div>
            <button 
                onClick={onClose} 
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <X size={24} />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-card">
            <div className="flex flex-col lg:flex-row h-full">
                {/* Left: Product Image & Details */}
                <div className="w-full lg:w-1/3 p-6 border-b lg:border-b-0 lg:border-r border-border bg-muted/30">
                    <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-card shadow-sm border border-border">
                        <img 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2rELnrlzZ1YZ2y3xOSbxSu0Sj6mfoB-J43onh2YOvWnTQqu-M6sn3v4v9nrIIQA6Sr5wOboC0aep8cbJ1rVmkayC02oMVTqtPfRE8zm4RWLSV761OMh5BlbwwzX39Tmv-fbRqOGTuLSfta661BIqm_fU6UzawCNEYYBW_a-HUdlfG-TdU2Ez0r_msy9tcFraF-3fd2Yur-Z7NlHanwpA2jmD8ZLToFM1yBByElGtrbs95wYHxXvivGPOvlqfrGxcWFs-6nCkFTUiH" 
                            alt="Door"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-foreground shadow-sm border border-border/50">
                            Interior Door
                        </div>
                    </div>
                    <div className="mt-6 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SKU</span>
                            <span className="font-medium text-foreground">DR-SC-2P-ARCH</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Material</span>
                            <span className="font-medium text-foreground">Primed Composite</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Core</span>
                            <span className="font-medium text-foreground">Solid Core</span>
                        </div>
                    </div>
                </div>

                {/* Right: Configuration Table */}
                <div className="w-full lg:w-2/3 p-6">
                    <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Unit Cost</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Qty</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-32">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {/* Row 1 */}
                                <tr className="group hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">2-0 x 6-8</span>
                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-0.5">
                                                <CheckCircle2 size={14} /> In Stock
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-sm">$</span>
                                            <input className="block w-full pl-5 pr-2 py-1.5 text-sm border border-input bg-background rounded-md focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="145.00" step="0.01" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input className="block w-full px-2 py-1.5 text-sm border border-input bg-background rounded-md focus:ring-1 focus:ring-primary outline-none text-center" type="number" min="0" defaultValue="0" />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-medium text-muted-foreground">$0.00</span>
                                    </td>
                                </tr>
                                {/* Row 2 (Selected) */}
                                <tr className="group hover:bg-muted/30 transition-colors bg-primary/5">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">2-4 x 6-8</span>
                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-0.5">
                                                <CheckCircle2 size={14} /> In Stock
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-sm">$</span>
                                            <input className="block w-full pl-5 pr-2 py-1.5 text-sm border border-input bg-background rounded-md focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="155.00" step="0.01" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input className="block w-full px-2 py-1.5 text-sm border border-primary rounded-md focus:ring-1 focus:ring-primary outline-none text-center font-bold text-foreground ring-1 ring-primary/20" type="number" min="0" defaultValue="2" />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-bold text-foreground">$310.00</span>
                                    </td>
                                </tr>
                                {/* Row 3 */}
                                <tr className="group hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">2-6 x 6-8</span>
                                            <span className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                                                <AlertTriangle size={14} /> Low Stock
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-sm">$</span>
                                            <input className="block w-full pl-5 pr-2 py-1.5 text-sm border border-input bg-background rounded-md focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="155.00" step="0.01" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input className="block w-full px-2 py-1.5 text-sm border border-input bg-background rounded-md focus:ring-1 focus:ring-primary outline-none text-center" type="number" min="0" defaultValue="0" />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-medium text-muted-foreground">$0.00</span>
                                    </td>
                                </tr>
                                {/* Row 4 (Selected) */}
                                <tr className="group hover:bg-muted/30 transition-colors bg-primary/5">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">2-8 x 6-8</span>
                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-0.5">
                                                <CheckCircle2 size={14} /> In Stock
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-sm">$</span>
                                            <input className="block w-full pl-5 pr-2 py-1.5 text-sm border border-input bg-background rounded-md focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="160.00" step="0.01" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input className="block w-full px-2 py-1.5 text-sm border border-primary rounded-md focus:ring-1 focus:ring-primary outline-none text-center font-bold text-foreground ring-1 ring-primary/20" type="number" min="0" defaultValue="1" />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-bold text-foreground">$160.00</span>
                                    </td>
                                </tr>
                                {/* Row 5 (Out of Stock) */}
                                <tr className="group bg-muted/30 text-muted-foreground">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium opacity-60">3-0 x 6-8</span>
                                            <span className="text-xs text-destructive font-medium flex items-center gap-1 mt-0.5">
                                                <XCircle size={14} /> Out of Stock
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative opacity-60">
                                            <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-sm">$</span>
                                            <input className="block w-full pl-5 pr-2 py-1.5 text-sm border border-border bg-muted rounded-md cursor-not-allowed" type="number" defaultValue="165.00" disabled />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input className="block w-full px-2 py-1.5 text-sm border border-border bg-muted rounded-md cursor-not-allowed text-center" type="number" min="0" defaultValue="0" disabled />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-medium opacity-60">$0.00</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-card border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary rounded-full p-1.5">
                    <ShoppingCart size={18} />
                </div>
                <span className="text-muted-foreground text-sm font-medium">3 Items Selected</span>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <h3 className="text-foreground text-2xl font-bold leading-none tracking-tight">$470.00</h3>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg border border-border text-muted-foreground text-sm font-semibold hover:bg-muted focus:ring-2 focus:ring-ring transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all flex items-center gap-2"
                    >
                        <Check size={18} />
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};