import React, { useState } from 'react';
import { X, CheckCircle2, Calculator, Trash2 } from 'lucide-react';

interface MouldingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (pieces: number, footage: number) => void;
  productName?: string;
}

export const MouldingCalculatorModal: React.FC<MouldingCalculatorModalProps> = ({ 
  isOpen, 
  onClose, 
  onApply,
  productName = "FLAT BOARD 1 X 6"
}) => {
  const [budget, setBudget] = useState<string>('1250.00');
  const [waste, setWaste] = useState<number>(10);
  const [selectedLength, setSelectedLength] = useState<string>('16');
  
  // Mock derived values for demo purposes
  const pricePerLF = 2.45;
  const calculatedBaseLF = parseFloat(budget) / pricePerLF;
  const totalFootage = Math.round(calculatedBaseLF * (1 + waste / 100));
  const lengthVal = parseInt(selectedLength) || 16;
  const totalPieces = Math.ceil(totalFootage / lengthVal);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[440px] bg-card rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Price-Based Calculator</span>
            <h2 className="text-foreground text-lg font-bold leading-tight">{productName}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
          
          {/* Project Needs */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm font-bold">$</span>
              <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">Project Needs</h3>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Total Budget / Price</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <input 
                  className="w-full h-12 pl-8 pr-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-lg font-semibold placeholder:text-muted-foreground" 
                  placeholder="0.00" 
                  type="number" 
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Product Specs */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-primary" />
              <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">Product Specs</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-3">Piece Length Selection</label>
                <div className="grid grid-cols-4 gap-2">
                  {['8', '12', '16', '17'].map((len) => (
                    <button 
                      key={len}
                      onClick={() => setSelectedLength(len)}
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                        selectedLength === len 
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                          : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {len}'
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">Price per Foot (Derived)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input 
                    className="w-full h-10 pl-8 pr-16 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm font-medium outline-none cursor-not-allowed" 
                    readOnly 
                    type="text" 
                    value={pricePerLF.toFixed(2)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">Per LF</span>
                </div>
              </div>
            </div>
          </section>

          {/* Waste Factor */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Trash2 size={16} className="text-primary" />
                <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">Waste Factor</h3>
              </div>
              <span className="text-sm font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">{waste}%</span>
            </div>
            <div className="space-y-4">
              <input 
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" 
                type="range" 
                min="0" 
                max="30" 
                value={waste}
                onChange={(e) => setWaste(parseInt(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground leading-normal italic">
                * Waste is added to the calculated footage before determining piece count.
              </p>
            </div>
          </section>

          {/* Results */}
          <section className="bg-muted/30 rounded-xl p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-primary" />
              <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">Results</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Pieces</span>
                <span className="text-3xl font-bold text-foreground">{totalPieces}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Footage</span>
                <span className="text-3xl font-bold text-foreground">{totalFootage} <span className="text-sm font-normal text-muted-foreground">LF</span></span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Budget (${budget}) ÷ ${pricePerLF}/LF</span>
                <span className="text-muted-foreground font-medium">{calculatedBaseLF.toFixed(1)} LF Base + {waste}% Waste</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-card border-t border-border">
          <button 
            onClick={() => onApply(totalPieces, totalFootage)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            Apply to Invoice
          </button>
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            Calculated pieces will be applied to your line item quantity.
          </p>
        </div>
      </div>
    </div>
  );
};