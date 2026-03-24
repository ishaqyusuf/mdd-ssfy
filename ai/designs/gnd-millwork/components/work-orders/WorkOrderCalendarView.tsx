import React from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export const WorkOrderCalendarView: React.FC = () => {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Side Filters */}
      <aside className="w-72 border-r border-border bg-card flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
        <div className="p-6 flex flex-col gap-6">
          <div>
            <h2 className="text-foreground text-sm font-bold mb-4 flex items-center gap-2">
              <Filter size={14} /> Filters
            </h2>
            
            {/* Technicians */}
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-muted-foreground text-xs font-semibold uppercase">Technician</p>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer group">
                  <input defaultChecked className="rounded border-border bg-background text-primary focus:ring-primary" type="checkbox"/>
                  <span className="text-sm text-foreground">All Technicians</span>
                </label>
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer group">
                  <input className="rounded border-border bg-background text-primary focus:ring-primary" type="checkbox"/>
                  <span className="text-sm text-foreground">John Miller <span className="text-emerald-500 text-[10px] ml-1">• Online</span></span>
                </label>
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer group">
                  <input className="rounded border-border bg-background text-primary focus:ring-primary" type="checkbox"/>
                  <span className="text-sm text-foreground">Sarah Chen</span>
                </label>
              </div>
            </div>

            {/* Status Chips */}
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase">Status</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex h-7 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 px-3 cursor-pointer">
                  <span className="text-[11px] font-bold">Scheduled</span>
                </div>
                <div className="flex h-7 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border px-3 hover:bg-muted/80 cursor-pointer transition">
                  <span className="text-[11px] font-bold">In Progress</span>
                </div>
                <div className="flex h-7 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border px-3 hover:bg-muted/80 cursor-pointer transition">
                  <span className="text-[11px] font-bold">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Calendar */}
      <main className="flex-1 flex flex-col bg-muted/20 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-foreground">October 2023</h2>
            <div className="flex border border-border rounded-lg overflow-hidden shadow-sm">
              <button className="p-2 bg-card hover:bg-muted border-r border-border text-muted-foreground hover:text-foreground">
                <ChevronLeft size={20} />
              </button>
              <button className="px-4 py-2 bg-card hover:bg-muted text-xs font-bold uppercase text-foreground">Today</button>
              <button className="p-2 bg-card hover:bg-muted border-l border-border text-muted-foreground hover:text-foreground">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-muted p-1 rounded-lg">
              <button className="px-4 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:text-foreground transition">Day</button>
              <button className="px-4 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:text-foreground transition">Week</button>
              <button className="px-4 py-1.5 rounded-md bg-card shadow-sm text-xs font-bold text-primary transition">Month</button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm h-full flex flex-col">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{day}</div>
              ))}
            </div>
            
            <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-border">
              {/* Previous Month Days */}
              {[25, 26, 27, 28, 29, 30].map(d => (
                <div key={d} className="bg-muted/10 p-2 text-muted-foreground text-xs font-medium min-h-[100px]">{d}</div>
              ))}
              
              {/* Day 1 */}
              <div className="p-2 text-muted-foreground text-xs font-medium flex flex-col gap-1 min-h-[100px]">
                <span>1</span>
                <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 rounded-md p-1.5 cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all">
                  <p className="text-[10px] font-bold text-amber-900 dark:text-amber-200 truncate">Foundation Check</p>
                  <p className="text-[9px] text-amber-700 dark:text-amber-300 truncate">John Miller</p>
                </div>
              </div>

              {[2, 3].map(d => <div key={d} className="p-2 text-muted-foreground text-xs font-medium min-h-[100px]">{d}</div>)}
              
              <div className="p-2 text-muted-foreground text-xs font-medium flex flex-col gap-1 min-h-[100px]">
                <span>4</span>
                <div className="bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 rounded-md p-1.5 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                  <p className="text-[10px] font-bold text-blue-900 dark:text-blue-100 truncate">Roof Inspection</p>
                  <p className="text-[9px] text-blue-700 dark:text-blue-300 truncate">Sarah Chen</p>
                </div>
              </div>

              {[5, 6, 7, 8, 9, 10].map(d => <div key={d} className="p-2 text-muted-foreground text-xs font-medium min-h-[100px]">{d}</div>)}

              {/* Day 11 */}
              <div className="p-2 bg-primary/5 relative min-h-[100px]">
                <span className="text-primary font-bold text-xs">11</span>
                <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary"></div>
                <div className="mt-1 flex flex-col gap-1">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/50 rounded-md p-1.5 cursor-pointer hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-bold text-emerald-900 dark:text-emerald-200 truncate">ANTILLIA VILLAS</p>
                    <p className="text-[9px] text-emerald-700 dark:text-emerald-300 truncate">Mike S. • Tile Repair</p>
                  </div>
                  <div className="bg-muted border border-border rounded-md p-1.5 cursor-pointer hover:ring-2 hover:ring-foreground/20 transition-all">
                    <p className="text-[10px] font-bold text-foreground truncate">Electrical Finish</p>
                    <p className="text-[9px] text-muted-foreground truncate">Robert Fox</p>
                  </div>
                </div>
              </div>

              <div className="p-2 text-muted-foreground text-xs font-medium min-h-[100px]">12</div>
              
              <div className="p-2 text-muted-foreground text-xs font-medium flex flex-col gap-1 min-h-[100px]">
                <span>13</span>
                <div className="bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-700/50 rounded-md p-1.5 cursor-pointer hover:ring-2 hover:ring-rose-500 transition-all">
                  <p className="text-[10px] font-bold text-rose-900 dark:text-rose-200 truncate">Delayed Material</p>
                  <p className="text-[9px] text-rose-700 dark:text-rose-300 truncate">John Miller</p>
                </div>
              </div>

              {Array.from({length: 16}, (_, i) => i + 14).map(d => (
                 <div key={d} className="p-2 text-muted-foreground text-xs font-medium min-h-[100px]">{d}</div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};