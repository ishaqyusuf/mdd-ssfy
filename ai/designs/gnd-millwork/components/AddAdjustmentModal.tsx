import React, { useState } from 'react';
import { X, Receipt, Gift, MinusCircle } from 'lucide-react';
import { AdjustmentType } from '../types';

interface AddAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: AdjustmentType, amount: number, description: string) => void;
}

export const AddAdjustmentModal: React.FC<AddAdjustmentModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [type, setType] = useState<AdjustmentType>(AdjustmentType.Bonus);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    onAdd(type, parseFloat(amount), description);
    onClose();
    setAmount('');
    setDescription('');
    setType(AdjustmentType.Bonus);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="text-xl font-extrabold text-foreground">Add Adjustment</h3>
            <p className="text-muted-foreground text-sm font-medium">Add a one-time charge or credit.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Category Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: AdjustmentType.Bonus, icon: Gift, label: 'Bonus' },
                { id: AdjustmentType.Expense, icon: Receipt, label: 'Expense' },
                { id: AdjustmentType.Deduction, icon: MinusCircle, label: 'Deduction' },
              ].map((cat) => (
                <label key={cat.id} className="cursor-pointer relative">
                  <input
                    type="radio"
                    name="category"
                    className="peer sr-only"
                    checked={type === cat.id}
                    onChange={() => setType(cat.id)}
                  />
                  <div className={`
                    flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all
                    peer-checked:border-primary peer-checked:bg-primary/5
                    border-border text-muted-foreground hover:bg-muted/50
                    ${type === cat.id ? 'text-primary' : ''}
                    ${cat.id === AdjustmentType.Deduction && type === cat.id ? 'peer-checked:border-destructive peer-checked:bg-destructive/5 peer-checked:text-destructive' : ''}
                  `}>
                    <cat.icon className="mb-2 w-6 h-6" />
                    <span className="text-xs font-bold">{cat.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <input
                type="number"
                step="0.01"
                className="w-full pl-8 pr-4 py-3 bg-muted/30 border border-border rounded-xl text-lg font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Description</label>
            <textarea
              className="w-full h-24 p-4 bg-muted/30 border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none placeholder:text-muted-foreground/50 transition-all"
              placeholder="e.g. Travel reimbursement for site visit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              Add Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};