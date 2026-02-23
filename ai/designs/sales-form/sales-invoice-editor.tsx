import React, { useState } from "react";
import {
  ArrowLeft,
  Trash2,
  MoreVertical,
  CheckCircle2,
  Search,
  PlusCircle,
  X,
  Building2,
  Check,
  Info,
  CreditCard,
  ChevronDown,
  Plus,
  ArrowLeftRight,
  Send,
  Printer,
  Save,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Receipt,
  Package,
  ChevronRight,
  Filter,
  ArrowRight,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  Minus,
  Image as ImageIcon,
  Hammer,
  Factory,
  MapPin,
  Hash,
  ChevronUp,
  Truck,
  LayoutGrid,
  List,
  Eye,
  FileText as FileTextIcon,
  Calculator,
} from "lucide-react";
import { SalesDoorDetailModal } from "./SalesDoorDetailModal";
import { MouldingCalculatorModal } from "./MouldingCalculatorModal";
import { SalesInvoicePrintPreviewModal } from "./SalesInvoicePrintPreviewModal";

interface SalesInvoiceEditorViewProps {
  onBack: () => void;
}

// Mock Customer Data for Search
const MOCK_CUSTOMERS = [
  // ... existing customers ...
  {
    id: "1",
    name: "Smith & Sons Carpentry",
    type: "Wholesale",
    typeColor: "bg-blue-100 text-blue-700 border-blue-200",
    location: "Portland, OR",
    account: "99281",
    icon: Hammer,
    iconBg: "bg-blue-100 text-blue-600",
    status: "active",
    billing: "123 Timber Rd, Portland, OR 97204",
    shipping: "123 Timber Rd, Portland, OR 97204",
  },
  {
    id: "2",
    name: "Smithsonian Millworks",
    type: "Retail",
    typeColor: "bg-amber-100 text-amber-700 border-amber-200",
    location: "Seattle, WA",
    account: "10293",
    icon: Factory,
    iconBg: "bg-amber-100 text-amber-600",
    status: "inactive",
    billing: "882 Industrial Pkwy, Seattle, WA 98101",
    shipping: "Job Site #4, Bellevue, WA 98004",
  },
  {
    id: "3",
    name: "John Smith Renovations",
    type: "Contractor",
    typeColor: "bg-slate-100 text-slate-700 border-slate-200",
    location: "Vancouver, WA",
    account: "44512",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBFEWhpVG5RvFLW07i4MKd_7XU2aFTXjL7z98AUXpl2HAbClU-dhS5y7utpdXIBYxU79VJeEx6rhNG9SSMozRNCcFrpowSTuagfZFy2sre-JlsfnQk1osI8hSv4FfTLst60a6tibvEVd_47xipWdVP8NuNSTtNOSDZ8xIhKIFD2WR8AiQgOhJ_mNhP-3397VZHIZYiFWhEpqpYuSXmL31Guzm7fr0m3-eU3Y4QnnfjJb-WTeyqQr7Mmg9UuHncII4c2g6gixRwO0udc",
    status: "active",
    billing: "PO Box 442, Vancouver, WA 98660",
    shipping: "Will Call",
  },
];

const DOOR_ITEMS = [
  // ... existing door items ...
  {
    id: 1,
    title: "3-Panel Shaker Primed",
    price: 145.0,
    sku: "SHK-3P-80",
    description:
      "Solid core construction reducing sound transmission. Primed and ready to paint.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBYlCL9iihbQA2hCiRlnF80YtsgyyWxwvgFvDLFXHEOYdpAScLf2Gi5D5URDiVjZ0E7s1JzmnBu6WGDGody6qpnXybSoDsQJ6f7v9e-6x06bFXcPQ83BZMB-0XA34Hh2f0JAqPh6j_7bwZvRJBY5EJvRruAhqN5cx7KcW4ZCh5JJejK1oSVruqtzy9Zgk1hK-Q56i5L3sckJ-dLF_cmbEWPbgilwHZvfZb0d5QWIPZt81GRN9AeN2pJXFWrFTGz8vsfV5nZjMI32qar",
    type: "Int. Shaker",
    selected: true,
    suppliers: [
      "Jeld-Wen (In Stock)",
      "Masonite (2 weeks)",
      "Trustile (Custom)",
    ],
  },
  {
    id: 2,
    title: "5-Lite Frosted Glass",
    price: 320.0,
    sku: "GLS-5L-FR",
    description:
      "Contemporary style with privacy glass. Ideal for pantries or offices.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCiZdbRpmeryFFZZA74wfLSY-K5jmvArXC2BcpXj4UyWE36kg0O4ExfdUEr5_6jKgDUvKV6ht2EOQfdbg0qyULuoxDlVuOud4BexBNwhiNddg94NzDM8ySUOcKNUVnoKF5MI0bfHVIGYpMMytdH6v-2T9Tsr4agPN61RkpAzkfn-Z7juLrthQyLDSWfKRIsahDSpNNVqq_Mrs5FN4c0--W08fVpgZsR33pbrYsOTlDdfqHF9Qaq4ec785VvEVkKsfcXGp37Lm8A47NE",
    type: "Int. Modern",
    suppliers: ["Masonite (In Stock)", "Jeld-Wen (1 week)"],
  },
  {
    id: 3,
    title: "6-Panel Colonial Textured",
    price: 85.0,
    sku: "COL-6P-TX",
    description: "Traditional hollow core door with wood grain texture.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCIfBpecd0dUP2ksYM8U6QmSLIMMn2_cTYdrdSOdYWMlGrhUH5-oHfbebgYRQp8T-fr7eEV4f5A18XQqXtXyCcTBCrWBESeTd0z__nTKa3lsgCAQxY-2DoW6X9dRrjvElobPyORd0P2LUFl8k4rHEhrUVdRiWS_IsnVvc7uu2JCGYR9cozhMrRpWIqPYmyXrLPR3CkDFdyxoxygg7CaT8HZaODqNQXzo9ottprd7PVFDiKdYvvsr2KzucpVyJChyQ4KT_udAFD26MT4",
    type: "Int. Colonial",
    suppliers: ["Select Vendor...", "Masonite ($85.00)", "Jeld-Wen ($92.00)"],
  },
  {
    id: 4,
    title: "Craftsman Entry Door",
    price: 640.0,
    sku: "CRFT-ENT-WD",
    description: "Solid wood exterior door with dentil shelf and glass insert.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDYlgmfjl1ZmrSYpQToJ_pIxgEbzpp-jOn4FVnGVjVvd14nhbaXSa4Trgru1JVdQGKh3zOTnLnMsW14LnUkNywZ69s_UPzH2ci97ZvCBiqYgLu1eMCyIXu_rgYAzWCc1UiHbhHDvSvf-vMcu7SRn5qCfOM4mmaZzNO8ituvxsA06SKTZ2EmaSSXQwUq-1eo_qaTzhNoH9jjVeIDTHZY8N1ExHaEzn8ipue1Kcob2zlFXlG7WMTNjDDLpqnP1bVJ2z_-ZWnXdsNvfXpF",
    type: "Ext. Entry",
    selected: true,
    suppliers: ["Therma-Tru (In Stock)", "Simpson (4 weeks)"],
  },
  {
    id: 5,
    title: "10-Lite French Double",
    price: 1250.0,
    sku: "FR-DBL-10L",
    description: "Classic double door patio entry. Low-E glass included.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBXZMBRjB_e67F-3em5R735zdv_OW0mh9U5ZNwD3eMw7qW5NIdYTcjl-fJIEi2IFjmmHv5Y4DI4SfgCXDmrOIi1BlXRrJRoBlQA71TE7V6JQfSkciWzAvgOH7mG85pUTZ9MWRDhWTqAOc4Ym4QNg6CILk0m3cLUgrsdaeDgE--IeIi8jE-B6-ZhSwY8JXfY46h2VjelU-7RB6zoGMjkss-wgZeZP-4oRy-TL9kkRSzTUuGva7vzs_RiUoGdAJf9ENXMKRRBApEt7sSe",
    type: "Ext. French",
    suppliers: ["Andersen (In Stock)", "Marvin (6 weeks)"],
  },
  {
    id: 6,
    title: "Rustic Barn Slider",
    price: 420.0,
    sku: "BARN-KNT-AL",
    description: "Knotty alder sliding door with hardware kit.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCX_YnDSFmOtKqvQcdFhHoVmqmoo_1jNXCbtRf1eINBaUnE6Vqm5KIZ40rljryAtx5XZPW5_xIoMav1a9HUtbaAvN03gZTvMc0FQEpldExiMm3dfcjDB9_6c4pg539oZkLDXA6jN1IsMKFeA_MGrjmIw29aY-qrkerpH_MZWi9M_kNGIoYoDQF-FUUCihBY-SbOk8S9dk9Cb03LNyuy57UXmMunLzI7D5V8z3TcapPIOz6NgW5_gEYwVSqXKOo8lK7bxUY_QGuEVo-1",
    type: "Int. Slider",
    suppliers: ["No Suppliers Available"],
    outOfStock: true,
  },
];

const MOULDING_ITEMS = [
  // ... existing moulding items ...
  {
    id: 1,
    name: "WM 623 Baseboard",
    dim: '9/16" x 3-1/4"',
    price: "$1.29",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8",
    selected: true,
  },
  {
    id: 2,
    name: "WM 356 Casing",
    dim: '11/16" x 2-1/4"',
    price: "$0.89",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcHE5UXvs5QINo95l_duGbWMh2EcjfyPqXJB1Ik_UVs06_6FAolClfqEJJA5J7O7SWWduyP5q5pXGwhrI2Qwva8e8YOmMuKJKLCTUb-ndeBLfszL0NfMiPTHdH5BKIqMqb1EoKankZI52dXiP7bgf1itlkqVZAReNfSkxj45QXkIWb8pGQlXzxm0U5T3GNY7rmq-0lAveDqIxODfHjAhnyYuXpVEUwFefn9wL4IQZkteOZHR3t_jQhFiYJYaEC9H4SqhAWyYZ8imHE",
    selected: true,
  },
  {
    id: 3,
    name: "WM 49 Crown",
    dim: '9/16" x 3-5/8"',
    price: "$1.85",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFhynN_CRlT31zB0C4w8vdx2YBzWQbR3DNxdbMINXiKQCMYZxuWyDyrL1GCgLo4YaFhN7ezHpuSlu9kZll4iXu2ZDIIPtfJ0hlSZFxJHcU2lpgYb7qQqQIaXkNu9vm75qrH9Oxg0jVFV-cA5E3xt-GV5e-GnpI8vCq0G0IDqWTEzQsxT6cBKuanndRTgZUzjPX__bOseEHZYKeFacFeTiAFA7NA9Rw2iESH1MqREPxQ_LXn-R0OKl_lR-I1PmXrpVI8pV9s1KYaoO8",
    selected: false,
  },
  {
    id: 4,
    name: "Quarter Round",
    dim: '3/4" x 3/4"',
    price: "$0.45",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8",
    selected: false,
  },
  {
    id: 5,
    name: "Chair Rail 390",
    dim: '11/16" x 2-5/8"',
    price: "$1.15",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcHE5UXvs5QINo95l_duGbWMh2EcjfyPqXJB1Ik_UVs06_6FAolClfqEJJA5J7O7SWWduyP5q5pXGwhrI2Qwva8e8YOmMuKJKLCTUb-ndeBLfszL0NfMiPTHdH5BKIqMqb1EoKankZI52dXiP7bgf1itlkqVZAReNfSkxj45QXkIWb8pGQlXzxm0U5T3GNY7rmq-0lAveDqIxODfHjAhnyYuXpVEUwFefn9wL4IQZkteOZHR3t_jQhFiYJYaEC9H4SqhAWyYZ8imHE",
    selected: false,
  },
  {
    id: 6,
    name: "Cove Moulding",
    dim: '3/4" x 3/4"',
    price: "$0.65",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFhynN_CRlT31zB0C4w8vdx2YBzWQbR3DNxdbMINXiKQCMYZxuWyDyrL1GCgLo4YaFhN7ezHpuSlu9kZll4iXu2ZDIIPtfJ0hlSZFxJHcU2lpgYb7qQqQIaXkNu9vm75qrH9Oxg0jVFV-cA5E3xt-GV5e-GnpI8vCq0G0IDqWTEzQsxT6cBKuanndRTgZUzjPX__bOseEHZYKeFacFeTiAFA7NA9Rw2iESH1MqREPxQ_LXn-R0OKl_lR-I1PmXrpVI8pV9s1KYaoO8",
    selected: false,
  },
];

export const SalesInvoiceEditorView: React.FC<SalesInvoiceEditorViewProps> = ({
  onBack,
}) => {
  // Global View State
  const [stepDisplayMode, setStepDisplayMode] = useState<
    "compact" | "extended"
  >("extended");
  const [isDoorModalOpen, setIsDoorModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeCalculatorItem, setActiveCalculatorItem] = useState<string>("");
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  // Active Item Management
  const [activeItem, setActiveItem] = useState<"item1" | "item2">("item1");

  // Item 1 (Doors) Workflow State
  const [doorViewMode, setDoorViewMode] = useState<"selection" | "package">(
    "selection",
  );
  const [doorDisplayType, setDoorDisplayType] = useState<
    "extended" | "compact"
  >("extended");

  // Item 2 (Moulding) Workflow State
  const [mouldingViewMode, setMouldingViewMode] = useState<
    "selection" | "lineItems"
  >("selection");
  const [mouldingDisplayType, setMouldingDisplayType] = useState<
    "extended" | "compact"
  >("extended");

  // Customer State
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerSearchActive, setIsCustomerSearchActive] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(MOCK_CUSTOMERS[0]);
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(false);

  const filteredCustomers = MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.account.includes(customerSearchQuery),
  );

  const handleCalculatorOpen = (itemName: string) => {
    setActiveCalculatorItem(itemName);
    setIsCalculatorOpen(true);
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-lg font-bold text-foreground hidden md:block">
              Edit Invoice #INV-2024-001
            </h1>
            <h1 className="text-lg font-bold text-foreground md:hidden">
              Edit #INV...001
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOverviewOpen(!isOverviewOpen)}
              className="lg:hidden p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              <Receipt size={20} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-100 dark:border-green-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="hidden sm:inline">Draft Mode</span>
              <span className="sm:hidden">Draft</span>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32 md:pb-8">
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col gap-6">
              {/* --- ITEM 1: MASTER BEDROOM DOORS --- */}
              <div
                className={`bg-card rounded-xl border-2 shadow-sm overflow-hidden transition-all duration-300 ${activeItem === "item1" ? "border-primary ring-1 ring-primary/20" : "border-border opacity-70 hover:opacity-100"}`}
                onClick={() => activeItem !== "item1" && setActiveItem("item1")}
              >
                {/* ... (Existing Item 1 content) ... */}
                <div className="p-5 border-b border-border flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 max-w-sm">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        Item Title / Location
                      </label>
                      <input
                        className="w-full bg-muted border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary text-foreground px-3 py-2"
                        type="text"
                        defaultValue="Master Bedroom"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {activeItem === "item1" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStepDisplayMode((prev) =>
                              prev === "extended" ? "compact" : "extended",
                            );
                          }}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title={
                            stepDisplayMode === "extended"
                              ? "Switch to Compact View"
                              : "Switch to Extended View"
                          }
                        >
                          {stepDisplayMode === "extended" ? (
                            <Minimize2 size={20} />
                          ) : (
                            <Maximize2 size={20} />
                          )}
                        </button>
                        <div className="w-px h-8 bg-border mx-1"></div>
                        <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={20} />
                        </button>
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    ) : (
                      <button className="text-primary font-bold text-xs flex items-center gap-1 hover:underline">
                        Edit Item <ChevronDown size={16} />
                      </button>
                    )}
                  </div>

                  {activeItem === "item1" && (
                    <div className="flex flex-col gap-4">
                      {stepDisplayMode === "extended" && (
                        <div className="rounded-xl border border-border bg-muted/30 p-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Project Type
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                Residential New Build
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Rough Opening
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                Standard 80"
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Material Grade
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                Premium Solid Wood
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Configuration
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                Single & Double Units
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                        <button
                          onClick={() => setDoorViewMode("selection")}
                          className={`flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all text-left min-w-[220px] ${
                            doorViewMode === "selection"
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-white border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                            <img
                              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaW88nOyah5Az3xS2DWkO1iyqE_72FW3qHft8bRCwtWoeWKslUZPKmSBvzgG85ktvIgzkxWI70iPB_e0u6qnkagiMxFHvEDhSMngaUnnE-IlmYaYjz_a4eDibamFQq5q9fJuURyhxxk-6XXXfexLxOtdvHxE01AuHcevO5hgXJm4iz1c40JrgTVYWICZkow8dvZrumtlLm4Y1CdW-WpvXMV8t7cKD1-9lrbJnLuR4VLv481Efa0NLZnen1YgmlyXVLaCY2P3dso1dN"
                              alt="Door"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Step 1: Selection
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Shaker 2-Panel
                            </span>
                          </div>
                          {stepDisplayMode === "extended" && (
                            <div className="ml-auto pl-4">
                              <span className="text-xs font-black text-primary">
                                $285.00
                              </span>
                            </div>
                          )}
                        </button>

                        <div className="text-border/50">
                          <ChevronRight size={16} />
                        </div>

                        <button
                          onClick={() => setDoorViewMode("package")}
                          className={`flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all text-left min-w-[220px] ${
                            doorViewMode === "package"
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center text-muted-foreground">
                            <Package size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Step 2: Package Tool
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Package Summary
                            </span>
                          </div>
                          {stepDisplayMode === "extended" && (
                            <div className="ml-auto pl-4">
                              <span className="text-xs font-black text-primary">
                                $2,861.25
                              </span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item 1 Content Area */}
                {activeItem === "item1" && (
                  <div className="p-6 bg-muted/30 min-h-[400px]">
                    {doorViewMode === "selection" && (
                      <>
                        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                          <div className="relative w-full max-w-md">
                            <Search
                              className="absolute left-3 top-2.5 text-muted-foreground"
                              size={18}
                            />
                            <input
                              className="w-full bg-card border border-border rounded-xl pl-10 py-2.5 text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none text-foreground placeholder:text-muted-foreground"
                              placeholder="Search door styles, SKUs..."
                              type="text"
                            />
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                              <button
                                onClick={() => setDoorDisplayType("compact")}
                                className={`p-1.5 rounded-md transition-all ${doorDisplayType === "compact" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                title="Compact View"
                              >
                                <List size={18} />
                              </button>
                              <button
                                onClick={() => setDoorDisplayType("extended")}
                                className={`p-1.5 rounded-md transition-all ${doorDisplayType === "extended" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                title="Extended View"
                              >
                                <LayoutGrid size={18} />
                              </button>
                            </div>
                            <button
                              onClick={() => setDoorViewMode("package")}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
                            >
                              <Package size={16} />
                              Review Package
                            </button>
                          </div>
                        </div>

                        {doorDisplayType === "extended" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in duration-300">
                            {DOOR_ITEMS.map((item) => (
                              <div
                                key={item.id}
                                className={`group relative flex flex-col rounded-xl border-2 bg-card shadow-md overflow-hidden transition-all duration-200 ${item.selected ? "border-primary" : "border-border hover:border-primary/50"}`}
                              >
                                <div className="absolute top-3 right-3 z-10">
                                  <input
                                    type="checkbox"
                                    defaultChecked={item.selected}
                                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                                  />
                                </div>
                                <div
                                  className={`relative h-48 w-full bg-muted cursor-pointer overflow-hidden ${item.outOfStock ? "grayscale" : ""}`}
                                >
                                  <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                    style={{
                                      backgroundImage: `url("${item.image}")`,
                                      opacity: item.outOfStock ? 0.6 : 1,
                                    }}
                                  />
                                  {item.outOfStock ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded text-sm font-bold shadow-lg">
                                        Out of Stock
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded">
                                      {item.type}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col p-4 gap-3 flex-1">
                                  <div className="flex justify-between items-start">
                                    <h3
                                      className={`text-lg font-bold leading-tight cursor-pointer hover:text-primary ${item.outOfStock ? "text-muted-foreground" : "text-foreground"}`}
                                    >
                                      {item.title}
                                    </h3>
                                    <span
                                      className={`text-lg font-bold ${item.outOfStock ? "text-muted-foreground" : "text-primary"}`}
                                    >
                                      ${item.price.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                  <div
                                    className={`mt-auto pt-3 flex flex-col gap-2 ${item.outOfStock ? "opacity-50 pointer-events-none" : ""}`}
                                  >
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                      Select Supplier
                                    </label>
                                    <div className="relative">
                                      <select className="w-full rounded-lg border border-border bg-muted/50 text-sm focus:border-primary focus:ring-primary py-2 px-3 pr-8 text-foreground outline-none">
                                        {item.suppliers.map((sup, i) => (
                                          <option key={i}>{sup}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="pt-3 border-t border-border flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">
                                      SKU: {item.sku}
                                    </span>
                                    <button
                                      className={`text-sm font-medium flex items-center gap-1 ${item.outOfStock ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:text-primary/80"}`}
                                      disabled={!!item.outOfStock}
                                    >
                                      {item.outOfStock ? (
                                        <Eye size={18} className="opacity-50" />
                                      ) : (
                                        <Eye size={18} />
                                      )}{" "}
                                      View Specs
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
                            {/* Active Card */}
                            <div
                              onClick={() => setIsDoorModalOpen(true)}
                              className="bg-card border-2 border-primary rounded-xl p-4 shadow-sm flex gap-4 cursor-pointer relative hover:shadow-md transition-shadow"
                            >
                              <div className="absolute top-2 right-2 text-primary">
                                <CheckCircle2
                                  size={20}
                                  fill="currentColor"
                                  className="text-white"
                                />
                              </div>
                              <div className="w-20 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-border">
                                <img
                                  alt="Door Style"
                                  className="object-cover w-full h-full"
                                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaW88nOyah5Az3xS2DWkO1iyqE_72FW3qHft8bRCwtWoeWKslUZPKmSBvzgG85ktvIgzkxWI70iPB_e0u6qnkagiMxFHvEDhSMngaUnnE-IlmYaYjz_a4eDibamFQq5q9fJuURyhxxk-6XXXfexLxOtdvHxE01AuHcevO5hgXJm4iz1c40JrgTVYWICZkow8dvZrumtlLm4Y1CdW-WpvXMV8t7cKD1-9lrbJnLuR4VLv481Efa0NLZnen1YgmlyXVLaCY2P3dso1dN"
                                />
                              </div>
                              <div className="flex flex-col justify-between py-1">
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">
                                    Shaker 2-Panel
                                  </h4>
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                    SKU: DR-2PS-001
                                  </p>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">
                                    Starts at
                                  </span>
                                  <span className="text-sm font-bold text-primary">
                                    $285.00
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              onClick={() => setIsDoorModalOpen(true)}
                              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all flex gap-4 cursor-pointer hover:shadow-md"
                            >
                              <div className="w-20 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-border">
                                <img
                                  alt="Door Style"
                                  className="object-cover w-full h-full"
                                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6DPcx1xgVJDWtP6NeIyJOCC0t1sMS7gia9VbwWo-wX06afRH4dnGFnAw0CDI4OeWKEn63Gy8sHrnuxNj8ZNOu-6n2TIVnuuKXqF9iBh912LxCQ_FQQZdhxGtRweYEoTQehojy2N5F1x75t1dRXjg6jl_MHtBNCBM7YF_70o1UmQMoOkEpYhS0GLfpH5gaoN7VQ8trYKO5bF1cLSZ0EQON3d1WDt-zuC3XLxbsUifOntezu9TL6n-NlcBq27gH4qSTfpF7xamBB0uS"
                                />
                              </div>
                              <div className="flex flex-col justify-between py-1">
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">
                                    Carrara Smooth
                                  </h4>
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                    SKU: DR-CSM-002
                                  </p>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">
                                    Starts at
                                  </span>
                                  <span className="text-sm font-bold text-foreground">
                                    $310.00
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* House Package Tool View */}
                    {doorViewMode === "package" && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Progress Header */}
                        <div className="flex flex-col gap-2 mb-6">
                          <div className="flex justify-between items-end">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Step 9 of 9
                            </p>
                            <p className="text-xs font-bold text-foreground">
                              100%
                            </p>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-full rounded-full"></div>
                          </div>
                        </div>

                        {/* Desktop Table View (Hidden on Mobile) */}
                        <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                  <th className="px-6 py-4 min-w-[200px]">
                                    Product
                                  </th>
                                  <th className="px-4 py-4 min-w-[120px]">
                                    Size
                                  </th>
                                  <th className="px-4 py-4 w-24">Qty</th>
                                  <th className="px-4 py-4 min-w-[100px]">
                                    Unit Price
                                  </th>
                                  <th className="px-4 py-4 min-w-[100px]">
                                    Labor
                                  </th>
                                  <th className="px-4 py-4 min-w-[100px]">
                                    Subtotal
                                  </th>
                                  <th className="px-4 py-4 w-16 text-right">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                <tr className="group hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                        style={{
                                          backgroundImage:
                                            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8")',
                                        }}
                                      ></div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">
                                          2-Panel Shaker
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Interior - Primed
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <select className="block w-full rounded-md border border-input bg-background py-1.5 px-3 text-sm focus:ring-1 focus:ring-primary outline-none">
                                      <option>30" x 80"</option>
                                      <option>32" x 80"</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-4">
                                    <input
                                      className="block w-full rounded-md border border-input bg-background py-1.5 px-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                      type="number"
                                      defaultValue="5"
                                    />
                                  </td>
                                  <td className="px-4 py-4 text-sm font-medium text-foreground">
                                    $120.00
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="relative rounded-md shadow-sm">
                                      <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-xs">
                                        $
                                      </span>
                                      <input
                                        className="block w-full rounded-md border border-input bg-background py-1.5 pl-5 pr-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        type="text"
                                        defaultValue="45.00"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-bold text-foreground">
                                    $825.00
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                </tr>
                                <tr className="group hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                        style={{
                                          backgroundImage:
                                            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBcHE5UXvs5QINo95l_duGbWMh2EcjfyPqXJB1Ik_UVs06_6FAolClfqEJJA5J7O7SWWduyP5q5pXGwhrI2Qwva8e8YOmMuKJKLCTUb-ndeBLfszL0NfMiPTHdH5BKIqMqb1EoKankZI52dXiP7bgf1itlkqVZAReNfSkxj45QXkIWb8pGQlXzxm0U5T3GNY7rmq-0lAveDqIxODfHjAhnyYuXpVEUwFefn9wL4IQZkteOZHR3t_jQhFiYJYaEC9H4SqhAWyYZ8imHE")',
                                        }}
                                      ></div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">
                                          Craftsman Entry
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Exterior - Solid Wood
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <select className="block w-full rounded-md border border-input bg-background py-1.5 px-3 text-sm focus:ring-1 focus:ring-primary outline-none">
                                      <option>36" x 80"</option>
                                      <option>36" x 84"</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-4">
                                    <input
                                      className="block w-full rounded-md border border-input bg-background py-1.5 px-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                      type="number"
                                      defaultValue="1"
                                    />
                                  </td>
                                  <td className="px-4 py-4 text-sm font-medium text-foreground">
                                    $850.00
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="relative rounded-md shadow-sm">
                                      <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-xs">
                                        $
                                      </span>
                                      <input
                                        className="block w-full rounded-md border border-input bg-background py-1.5 pl-5 pr-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        type="text"
                                        defaultValue="150.00"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-bold text-foreground">
                                    $1,000.00
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Mobile Card View (Hidden on Desktop) */}
                        <div className="md:hidden flex flex-col gap-4">
                          {/* Card 1 */}
                          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden relative">
                            <div className="p-4 flex flex-col gap-4">
                              <div className="flex gap-3">
                                <div
                                  className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                  style={{
                                    backgroundImage:
                                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8")',
                                  }}
                                ></div>
                                <div className="flex flex-col pr-8">
                                  <span className="text-base font-bold text-foreground leading-tight">
                                    2-Panel Shaker
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Interior - Primed
                                  </span>
                                </div>
                                <button className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 size={20} />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Size
                                  </label>
                                  <select className="block w-full rounded-lg border border-input bg-background text-sm py-2 px-3 focus:ring-1 focus:ring-primary outline-none">
                                    <option>30" x 80"</option>
                                    <option>32" x 80"</option>
                                    <option>36" x 80"</option>
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Qty
                                  </label>
                                  <input
                                    className="block w-full rounded-lg border border-input bg-background text-sm py-2 px-3 focus:ring-1 focus:ring-primary outline-none"
                                    type="number"
                                    defaultValue="5"
                                  />
                                </div>
                              </div>
                              <div className="bg-muted/30 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Unit Price
                                  </span>
                                  <span className="text-foreground font-medium">
                                    $120.00
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Labor Cost
                                  </span>
                                  <div className="relative w-24">
                                    <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">
                                      $
                                    </span>
                                    <input
                                      className="w-full text-right py-1 pl-5 pr-2 rounded border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                                      type="text"
                                      defaultValue="45.00"
                                    />
                                  </div>
                                </div>
                                <div className="pt-2 mt-1 border-t border-border flex justify-between items-center">
                                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">
                                    Subtotal
                                  </span>
                                  <span className="text-lg font-black text-primary">
                                    $825.00
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Card 2 */}
                          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden relative">
                            <div className="p-4 flex flex-col gap-4">
                              <div className="flex gap-3">
                                <div
                                  className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                  style={{
                                    backgroundImage:
                                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBcHE5UXvs5QINo95l_duGbWMh2EcjfyPqXJB1Ik_UVs06_6FAolClfqEJJA5J7O7SWWduyP5q5pXGwhrI2Qwva8e8YOmMuKJKLCTUb-ndeBLfszL0NfMiPTHdH5BKIqMqb1EoKankZI52dXiP7bgf1itlkqVZAReNfSkxj45QXkIWb8pGQlXzxm0U5T3GNY7rmq-0lAveDqIxODfHjAhnyYuXpVEUwFefn9wL4IQZkteOZHR3t_jQhFiYJYaEC9H4SqhAWyYZ8imHE")',
                                  }}
                                ></div>
                                <div className="flex flex-col pr-8">
                                  <span className="text-base font-bold text-foreground leading-tight">
                                    Craftsman Entry
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Exterior - Solid Wood
                                  </span>
                                </div>
                                <button className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 size={20} />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Size
                                  </label>
                                  <select className="block w-full rounded-lg border border-input bg-background text-sm py-2 px-3 focus:ring-1 focus:ring-primary outline-none">
                                    <option>36" x 80"</option>
                                    <option>36" x 84"</option>
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Qty
                                  </label>
                                  <input
                                    className="block w-full rounded-lg border border-input bg-background text-sm py-2 px-3 focus:ring-1 focus:ring-primary outline-none"
                                    type="number"
                                    defaultValue="1"
                                  />
                                </div>
                              </div>
                              <div className="bg-muted/30 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Unit Price
                                  </span>
                                  <span className="text-foreground font-medium">
                                    $850.00
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Labor Cost
                                  </span>
                                  <div className="relative w-24">
                                    <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">
                                      $
                                    </span>
                                    <input
                                      className="w-full text-right py-1 pl-5 pr-2 rounded border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                                      type="text"
                                      defaultValue="150.00"
                                    />
                                  </div>
                                </div>
                                <div className="pt-2 mt-1 border-t border-border flex justify-between items-center">
                                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">
                                    Subtotal
                                  </span>
                                  <span className="text-lg font-black text-primary">
                                    $1,000.00
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 md:mt-0 px-6 md:px-6 py-4 border-t border-border bg-muted/20 md:bg-transparent md:border-none">
                          <button className="w-full flex items-center justify-center rounded-lg h-14 md:h-10 bg-card md:bg-card border-2 md:border border-dashed border-border hover:border-primary text-primary gap-2 text-sm font-bold transition-all shadow-sm">
                            <PlusCircle size={20} />
                            <span>Add New Line Item</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* --- ITEM 2: MOULDING --- */}
              <div
                className={`bg-card rounded-xl border-2 shadow-sm overflow-hidden transition-all duration-300 ${activeItem === "item2" ? "border-primary ring-1 ring-primary/20" : "border-border opacity-70 hover:opacity-100"}`}
                onClick={() => activeItem !== "item2" && setActiveItem("item2")}
              >
                {/* ... (Existing Item 2 content) ... */}
                {/* Item 2 Header */}
                <div className="p-5 border-b border-border flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 max-w-sm">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        Item Title / Location
                      </label>
                      <input
                        className="w-full bg-muted border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary text-foreground px-3 py-2"
                        type="text"
                        defaultValue="Guest Bathroom"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {activeItem === "item2" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStepDisplayMode((prev) =>
                              prev === "extended" ? "compact" : "extended",
                            );
                          }}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {stepDisplayMode === "extended" ? (
                            <Minimize2 size={20} />
                          ) : (
                            <Maximize2 size={20} />
                          )}
                        </button>
                        <div className="w-px h-8 bg-border mx-1"></div>
                        <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={20} />
                        </button>
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    ) : (
                      <button className="text-primary font-bold text-xs flex items-center gap-1 hover:underline">
                        Edit Item <ChevronDown size={16} />
                      </button>
                    )}
                  </div>

                  {activeItem === "item2" && (
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                      {/* Step 1 Pill */}
                      <button
                        onClick={() => setMouldingViewMode("selection")}
                        className={`flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all text-left min-w-[220px] ${
                          mouldingViewMode === "selection"
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                          <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8"
                            alt="Moulding"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Step 1: Selection
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            2 Profiles
                          </span>
                        </div>
                        {stepDisplayMode === "extended" && (
                          <div className="ml-auto pl-4">
                            <span className="text-xs font-black text-muted-foreground">
                              -
                            </span>
                          </div>
                        )}
                      </button>

                      <div className="text-border/50">
                        <ChevronRight size={16} />
                      </div>

                      {/* Step 2 Pill */}
                      <button
                        onClick={() => setMouldingViewMode("lineItems")}
                        className={`flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all text-left min-w-[220px] ${
                          mouldingViewMode === "lineItems"
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center text-muted-foreground">
                          <Receipt size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Step 2: Line Items
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            Configuration
                          </span>
                        </div>
                        {stepDisplayMode === "extended" && (
                          <div className="ml-auto pl-4">
                            <span className="text-xs font-black text-primary">
                              $835.00
                            </span>
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Item 2 Content Area */}
                {activeItem === "item2" && (
                  <div className="p-6 bg-muted/30 min-h-[400px]">
                    {/* View: Moulding Selection */}
                    {mouldingViewMode === "selection" && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* ... (Existing selection view) ... */}
                        <div className="flex flex-col gap-2 mb-6">
                          <h1 className="text-2xl font-black text-foreground tracking-tight">
                            Moulding Selection
                          </h1>
                          <p className="text-sm text-muted-foreground">
                            Choose the profiles you want to include in this
                            package. You can select multiple items.
                          </p>
                          <div className="flex items-center gap-6 mt-2">
                            <span className="text-sm font-semibold text-foreground">
                              Step 2: Select Profiles
                            </span>
                            <div className="flex-1 flex items-center gap-3">
                              <span className="text-xs font-bold text-foreground">
                                25%
                              </span>
                              <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-1/4 rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm mb-6">
                          <div className="relative w-full sm:w-auto flex-1 max-w-md">
                            <Search
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                              size={18}
                            />
                            <input
                              className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                              placeholder="Search profiles..."
                              type="text"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <select className="w-full sm:w-auto px-4 py-2 rounded-md border border-border bg-background text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer">
                              <option>All Materials</option>
                              <option>Primed Pine</option>
                              <option>MDF</option>
                              <option>Solid Oak</option>
                            </select>
                            <div className="h-8 w-px bg-border mx-1 hidden sm:block"></div>
                            <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                              <button
                                onClick={() =>
                                  setMouldingDisplayType("compact")
                                }
                                className={`p-1.5 rounded-md transition-all ${mouldingDisplayType === "compact" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                title="Compact View"
                              >
                                <List size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  setMouldingDisplayType("extended")
                                }
                                className={`p-1.5 rounded-md transition-all ${mouldingDisplayType === "extended" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                title="Extended View"
                              >
                                <LayoutGrid size={18} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Items Grid/List */}
                        {mouldingDisplayType === "extended" ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
                            {MOULDING_ITEMS.map((item) => (
                              <div
                                key={item.id}
                                className={`group relative flex flex-col rounded-xl border-2 bg-card shadow-sm transition-all cursor-pointer hover:shadow-md ${item.selected ? "border-primary ring-2 ring-primary/10" : "border-border hover:border-primary"}`}
                              >
                                <div
                                  className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-md ring-2 ring-card ${item.selected ? "bg-primary text-white" : "bg-white/90 border border-border text-transparent group-hover:text-border"}`}
                                >
                                  <Check size={16} strokeWidth={4} />
                                </div>
                                <div className="aspect-[4/3] w-full overflow-hidden rounded-t-[10px] bg-muted relative">
                                  <div className="absolute inset-0 bg-primary/5 z-0 pointer-events-none"></div>
                                  <div
                                    className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                    style={{
                                      backgroundImage: `url("${item.img}")`,
                                    }}
                                  ></div>
                                </div>
                                <div className="flex flex-col p-4">
                                  <h3 className="font-bold text-foreground leading-tight">
                                    {item.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.dim} • Primed Pine
                                  </p>
                                  <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-foreground">
                                      {item.price}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-medium">
                                      / LF
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                            {MOULDING_ITEMS.map((item) => (
                              <div
                                key={item.id}
                                className={`flex items-center gap-4 p-3 rounded-lg border bg-card transition-all cursor-pointer hover:shadow-sm ${item.selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                              >
                                <div className="h-12 w-12 rounded-lg bg-muted border border-border overflow-hidden shrink-0 relative">
                                  <div
                                    className="h-full w-full bg-cover bg-center"
                                    style={{
                                      backgroundImage: `url("${item.img}")`,
                                    }}
                                  ></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-foreground truncate">
                                      {item.name}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-bold text-foreground">
                                        {item.price}
                                        <span className="text-xs text-muted-foreground font-medium ml-0.5">
                                          / LF
                                        </span>
                                      </span>
                                      <div
                                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${item.selected ? "bg-primary border-primary text-white" : "border-border bg-background text-transparent"}`}
                                      >
                                        <Check size={12} strokeWidth={4} />
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {item.dim} • Primed Pine
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
                          <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium text-sm transition-colors px-4 py-2 rounded-lg hover:bg-muted"
                          >
                            <ArrowLeft size={18} />
                            Back
                          </button>
                          <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium text-sm transition-colors px-4 py-2 rounded-lg hover:bg-muted border border-transparent">
                              Save Draft
                            </button>
                            <button
                              onClick={() => setMouldingViewMode("lineItems")}
                              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-colors px-6 py-2.5 rounded-lg shadow-md shadow-primary/20"
                            >
                              Next / Proceed
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* View: Moulding Line Items */}
                    {mouldingViewMode === "lineItems" && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col gap-2 mb-6">
                          <h1 className="text-2xl font-black text-foreground tracking-tight">
                            Moulding Line Items
                          </h1>
                          <p className="text-sm text-muted-foreground">
                            Configure quantities and costs for selected moulding
                            profiles.
                          </p>
                          <div className="flex items-center gap-6 mt-2">
                            <span className="text-sm font-semibold text-foreground">
                              Step 3 of 5: Moulding Configuration
                            </span>
                            <div className="flex-1 flex items-center gap-3">
                              <span className="text-xs font-bold text-foreground">
                                60%
                              </span>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-3/5 rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                  <th className="px-6 py-4 min-w-[240px]">
                                    Moulding Profile
                                  </th>
                                  <th className="px-4 py-4 min-w-[200px]">
                                    Quantity (LF)
                                  </th>
                                  <th className="px-4 py-4 min-w-[100px]">
                                    Estimate
                                  </th>
                                  <th className="px-4 py-4 min-w-[120px]">
                                    Add. Cost
                                  </th>
                                  <th className="px-4 py-4 min-w-[100px]">
                                    Subtotal
                                  </th>
                                  <th className="px-4 py-4 w-16 text-right"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                <tr className="group hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                        style={{
                                          backgroundImage:
                                            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8")',
                                        }}
                                      ></div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">
                                          5-1/4" Crown Moulding
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Primed Pine - WM49
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center w-fit border border-border rounded-md overflow-hidden bg-card shadow-sm">
                                        <button className="px-2 py-1.5 hover:bg-muted text-muted-foreground transition-colors border-r border-border">
                                          <Minus size={14} />
                                        </button>
                                        <input
                                          className="w-16 text-center border-0 p-0 text-sm font-medium bg-transparent text-foreground focus:ring-0"
                                          type="number"
                                          defaultValue="120"
                                        />
                                        <button className="px-2 py-1.5 hover:bg-muted text-muted-foreground transition-colors border-l border-border">
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleCalculatorOpen(
                                            '5-1/4" Crown Moulding',
                                          )
                                        }
                                        className="p-1.5 rounded-md bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        title="Open Calculator"
                                      >
                                        <Calculator size={16} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-medium text-foreground">
                                    $2.50 /ft
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="relative rounded-md shadow-sm">
                                      <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-xs font-bold">
                                        $
                                      </span>
                                      <input
                                        className="block w-full rounded-md border border-input bg-background py-1.5 pl-5 pr-2 text-sm focus:ring-1 focus:ring-primary outline-none font-medium"
                                        type="text"
                                        defaultValue="0.00"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-bold text-foreground">
                                    $300.00
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                </tr>
                                <tr className="group hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                        style={{
                                          backgroundImage:
                                            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBcHE5UXvs5QINo95l_duGbWMh2EcjfyPqXJB1Ik_UVs06_6FAolClfqEJJA5J7O7SWWduyP5q5pXGwhrI2Qwva8e8YOmMuKJKLCTUb-ndeBLfszL0NfMiPTHdH5BKIqMqb1EoKankZI52dXiP7bgf1itlkqVZAReNfSkxj45QXkIWb8pGQlXzxm0U5T3GNY7rmq-0lAveDqIxODfHjAhnyYuXpVEUwFefn9wL4IQZkteOZHR3t_jQhFiYJYaEC9H4SqhAWyYZ8imHE")',
                                        }}
                                      ></div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">
                                          3-1/4" Baseboard
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          MDF - WM623
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center w-fit border border-border rounded-md overflow-hidden bg-card shadow-sm">
                                        <button className="px-2 py-1.5 hover:bg-muted text-muted-foreground transition-colors border-r border-border">
                                          <Minus size={14} />
                                        </button>
                                        <input
                                          className="w-16 text-center border-0 p-0 text-sm font-medium bg-transparent text-foreground focus:ring-0"
                                          type="number"
                                          defaultValue="300"
                                        />
                                        <button className="px-2 py-1.5 hover:bg-muted text-muted-foreground transition-colors border-l border-border">
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleCalculatorOpen(
                                            '3-1/4" Baseboard',
                                          )
                                        }
                                        className="p-1.5 rounded-md bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        title="Open Calculator"
                                      >
                                        <Calculator size={16} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-medium text-foreground">
                                    $1.20 /ft
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="relative rounded-md shadow-sm">
                                      <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-xs font-bold">
                                        $
                                      </span>
                                      <input
                                        className="block w-full rounded-md border border-input bg-background py-1.5 pl-5 pr-2 text-sm focus:ring-1 focus:ring-primary outline-none font-medium"
                                        type="text"
                                        defaultValue="0.00"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-bold text-foreground">
                                    $360.00
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                </tr>
                                <tr className="group hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                        style={{
                                          backgroundImage:
                                            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBFhynN_CRlT31zB0C4w8vdx2YBzWQbR3DNxdbMINXiKQCMYZxuWyDyrL1GCgLo4YaFhN7ezHpuSlu9kZll4iXu2ZDIIPtfJ0hlSZFxJHcU2lpgYb7qQqQIaXkNu9vm75qrH9Oxg0jVFV-cA5E3xt-GV5e-GnpI8vCq0G0IDqWTEzQsxT6cBKuanndRTgZUzjPX__bOseEHZYKeFacFeTiAFA7NA9Rw2iESH1MqREPxQ_LXn-R0OKl_lR-I1PmXrpVI8pV9s1KYaoO8")',
                                        }}
                                      ></div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">
                                          Window Casing
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Primed Pine - WM356
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center w-fit border border-border rounded-md overflow-hidden bg-card shadow-sm">
                                        <button className="px-2 py-1.5 hover:bg-muted text-muted-foreground transition-colors border-r border-border">
                                          <Minus size={14} />
                                        </button>
                                        <input
                                          className="w-16 text-center border-0 p-0 text-sm font-medium bg-transparent text-foreground focus:ring-0"
                                          type="number"
                                          defaultValue="100"
                                        />
                                        <button className="px-2 py-1.5 hover:bg-muted text-muted-foreground transition-colors border-l border-border">
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleCalculatorOpen("Window Casing")
                                        }
                                        className="p-1.5 rounded-md bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        title="Open Calculator"
                                      >
                                        <Calculator size={16} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-medium text-foreground">
                                    $1.50 /ft
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="relative rounded-md shadow-sm">
                                      <span className="absolute inset-y-0 left-2 flex items-center text-muted-foreground text-xs font-bold">
                                        $
                                      </span>
                                      <input
                                        className="block w-full rounded-md border border-input bg-background py-1.5 pl-5 pr-2 text-sm focus:ring-1 focus:ring-primary outline-none font-medium"
                                        type="text"
                                        defaultValue="25.00"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-bold text-foreground">
                                    $175.00
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                    <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-border bg-muted/20 gap-4">
                            <button className="inline-flex items-center justify-center rounded-lg h-9 px-4 bg-card border border-border hover:bg-muted text-foreground gap-2 text-sm font-bold transition-all shadow-sm">
                              <Plus size={16} />
                              <span>Add Moulding</span>
                            </button>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Mouldings Total
                              </span>
                              <span className="text-xl font-bold text-foreground">
                                $835.00
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Card View (Hidden on Desktop) */}
                        <div className="md:hidden flex flex-col gap-4 mb-6">
                          {/* Card 1 */}
                          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden relative">
                            <div className="p-4 flex flex-col gap-4">
                              <div className="flex gap-3">
                                <div
                                  className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                  style={{
                                    backgroundImage:
                                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8")',
                                  }}
                                ></div>
                                <div className="flex flex-col pr-8">
                                  <span className="text-base font-bold text-foreground leading-tight">
                                    5-1/4" Crown Moulding
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Primed Pine - WM49
                                  </span>
                                </div>
                                <button className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 size={20} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 items-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Quantity (LF)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center w-full border border-input rounded-lg overflow-hidden bg-background shadow-sm h-10">
                                      <button className="px-3 h-full hover:bg-muted text-muted-foreground transition-colors border-r border-input">
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        className="w-full text-center border-0 p-0 text-sm font-medium bg-transparent text-foreground focus:ring-0"
                                        type="number"
                                        defaultValue="120"
                                      />
                                      <button className="px-3 h-full hover:bg-muted text-muted-foreground transition-colors border-l border-input">
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleCalculatorOpen(
                                          '5-1/4" Crown Moulding',
                                        )
                                      }
                                      className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-input"
                                    >
                                      <Calculator size={18} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Add. Cost
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                                      $
                                    </span>
                                    <input
                                      className="block w-full rounded-lg border border-input bg-background pl-7 pr-3 h-10 text-sm focus:ring-1 focus:ring-primary outline-none font-medium"
                                      type="text"
                                      defaultValue="0.00"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-muted/30 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Unit Price
                                  </span>
                                  <span className="text-foreground font-medium">
                                    $2.50 /ft
                                  </span>
                                </div>
                                <div className="pt-2 mt-1 border-t border-border flex justify-between items-center">
                                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">
                                    Subtotal
                                  </span>
                                  <span className="text-lg font-black text-primary">
                                    $300.00
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card 2 */}
                          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden relative">
                            <div className="p-4 flex flex-col gap-4">
                              <div className="flex gap-3">
                                <div
                                  className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                  style={{
                                    backgroundImage:
                                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBcHE5UXvs5QINo95l_duGbWMh2EcjfyPqXJB1Ik_UVs06_6FAolClfqEJJA5J7O7SWWduyP5q5pXGwhrI2Qwva8e8YOmMuKJKLCTUb-ndeBLfszL0NfMiPTHdH5BKIqMqb1EoKankZI52dXiP7bgf1itlkqVZAReNfSkxj45QXkIWb8pGQlXzxm0U5T3GNY7rmq-0lAveDqIxODfHjAhnyYuXpVEUwFefn9wL4IQZkteOZHR3t_jQhFiYJYaEC9H4SqhAWyYZ8imHE")',
                                  }}
                                ></div>
                                <div className="flex flex-col pr-8">
                                  <span className="text-base font-bold text-foreground leading-tight">
                                    3-1/4" Baseboard
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    MDF - WM623
                                  </span>
                                </div>
                                <button className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 size={20} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 items-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Quantity (LF)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center w-full border border-input rounded-lg overflow-hidden bg-background shadow-sm h-10">
                                      <button className="px-3 h-full hover:bg-muted text-muted-foreground transition-colors border-r border-input">
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        className="w-full text-center border-0 p-0 text-sm font-medium bg-transparent text-foreground focus:ring-0"
                                        type="number"
                                        defaultValue="300"
                                      />
                                      <button className="px-3 h-full hover:bg-muted text-muted-foreground transition-colors border-l border-input">
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleCalculatorOpen('3-1/4" Baseboard')
                                      }
                                      className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-input"
                                    >
                                      <Calculator size={18} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Add. Cost
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                                      $
                                    </span>
                                    <input
                                      className="block w-full rounded-lg border border-input bg-background pl-7 pr-3 h-10 text-sm focus:ring-1 focus:ring-primary outline-none font-medium"
                                      type="text"
                                      defaultValue="0.00"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-muted/30 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Unit Price
                                  </span>
                                  <span className="text-foreground font-medium">
                                    $1.20 /ft
                                  </span>
                                </div>
                                <div className="pt-2 mt-1 border-t border-border flex justify-between items-center">
                                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">
                                    Subtotal
                                  </span>
                                  <span className="text-lg font-black text-primary">
                                    $360.00
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card 3 */}
                          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden relative">
                            <div className="p-4 flex flex-col gap-4">
                              <div className="flex gap-3">
                                <div
                                  className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted border border-border bg-center bg-cover"
                                  style={{
                                    backgroundImage:
                                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBFhynN_CRlT31zB0C4w8vdx2YBzWQbR3DNxdbMINXiKQCMYZxuWyDyrL1GCgLo4YaFhN7ezHpuSlu9kZll4iXu2ZDIIPtfJ0hlSZFxJHcU2lpgYb7qQqQIaXkNu9vm75qrH9Oxg0jVFV-cA5E3xt-GV5e-GnpI8vCq0G0IDqWTEzQsxT6cBKuanndRTgZUzjPX__bOseEHZYKeFacFeTiAFA7NA9Rw2iESH1MqREPxQ_LXn-R0OKl_lR-I1PmXrpVI8pV9s1KYaoO8")',
                                  }}
                                ></div>
                                <div className="flex flex-col pr-8">
                                  <span className="text-base font-bold text-foreground leading-tight">
                                    Window Casing
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Primed Pine - WM356
                                  </span>
                                </div>
                                <button className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 size={20} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 items-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Quantity (LF)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center w-full border border-input rounded-lg overflow-hidden bg-background shadow-sm h-10">
                                      <button className="px-3 h-full hover:bg-muted text-muted-foreground transition-colors border-r border-input">
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        className="w-full text-center border-0 p-0 text-sm font-medium bg-transparent text-foreground focus:ring-0"
                                        type="number"
                                        defaultValue="100"
                                      />
                                      <button className="px-3 h-full hover:bg-muted text-muted-foreground transition-colors border-l border-input">
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleCalculatorOpen("Window Casing")
                                      }
                                      className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-input"
                                    >
                                      <Calculator size={18} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                                    Add. Cost
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                                      $
                                    </span>
                                    <input
                                      className="block w-full rounded-lg border border-input bg-background pl-7 pr-3 h-10 text-sm focus:ring-1 focus:ring-primary outline-none font-medium"
                                      type="text"
                                      defaultValue="25.00"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-muted/30 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Unit Price
                                  </span>
                                  <span className="text-foreground font-medium">
                                    $1.50 /ft
                                  </span>
                                </div>
                                <div className="pt-2 mt-1 border-t border-border flex justify-between items-center">
                                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">
                                    Subtotal
                                  </span>
                                  <span className="text-lg font-black text-primary">
                                    $175.00
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Mobile Footer Action */}
                          <div className="flex flex-col gap-4">
                            <button className="w-full flex items-center justify-center rounded-lg h-12 bg-card border-2 border-dashed border-border hover:border-primary text-primary gap-2 text-sm font-bold transition-all shadow-sm">
                              <PlusCircle size={20} />
                              <span>Add Moulding</span>
                            </button>
                            <div className="flex items-center justify-between px-2">
                              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Mouldings Total
                              </span>
                              <span className="text-xl font-bold text-foreground">
                                $835.00
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <button
                            onClick={() => setMouldingViewMode("selection")}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium text-sm transition-colors px-4 py-2 rounded-lg hover:bg-muted"
                          >
                            <ArrowLeft size={18} />
                            Back to Selection
                          </button>
                          <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-primary-foreground font-bold text-sm transition-colors px-6 py-2.5 rounded-lg shadow-md shadow-primary/20">
                            Save & Continue
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button className="w-full border-2 border-dashed border-border rounded-xl py-4 text-muted-foreground hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 font-bold text-sm">
                <PlusCircle size={20} />
                Add New Item to Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions (Desktop/Tablet) */}
        <div className="hidden md:block border-t border-border bg-card p-5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 relative shrink-0">
          <div className="flex items-center justify-between mb-4 text-xs font-bold text-muted-foreground">
            <div className="flex gap-4">
              <button className="hover:text-primary transition-colors flex items-center gap-1.5">
                <ArrowLeftRight size={14} /> Quote
              </button>
              <button className="hover:text-primary transition-colors flex items-center gap-1.5">
                <Send size={14} /> Send
              </button>
            </div>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Printer size={14} /> Print
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="flex-1 bg-primary text-primary-foreground text-sm font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Finalize Invoice
            </button>
            <button
              className="w-14 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors flex items-center justify-center"
              title="More Actions"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Sticky Bottom Bar (replaces the sidebar summary on mobile) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-[480px] mx-auto flex items-center justify-between gap-4">
            <button
              className="flex flex-col items-start gap-0.5"
              onClick={() => setShowMobileSummary(true)}
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Review Totals <ChevronUp size={14} />
              </span>
              <span className="text-xl font-black text-foreground tracking-tight">
                $2,861.25
              </span>
            </button>
            <button className="flex-1 max-w-[180px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-12 flex items-center justify-center gap-2 font-bold transition-shadow shadow-md shadow-primary/20">
              <CheckCircle2 size={18} />
              <span>Finalize</span>
            </button>
          </div>
        </div>
      </main>

      {/* Mobile Overlay */}
      {isOverviewOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOverviewOpen(false)}
        />
      )}

      {/* Right Sidebar - Invoice Overview */}
      <aside
        className={`
        fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] flex flex-col bg-card border-l border-border shadow-2xl h-full transition-transform duration-300 ease-in-out
        ${isOverviewOpen ? "translate-x-0" : "translate-x-full"}
        lg:translate-x-0 lg:static lg:shadow-none shrink-0
      `}
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground">
              Invoice Summary
            </h2>
          </div>
          <button
            onClick={() => setIsOverviewOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
          <button
            onClick={onBack}
            className="hidden lg:block text-muted-foreground hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 flex flex-col gap-6">
            {/* Customer Profile Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Customer Profile
                </h3>
                {isCustomerSearchActive ? (
                  <button
                    onClick={() => setIsCustomerSearchActive(false)}
                    className="text-primary text-xs font-bold hover:underline"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsCustomerSearchActive(true);
                      setCustomerSearchQuery("");
                    }}
                    className="text-primary text-xs font-bold hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {isCustomerSearchActive ? (
                // Search Mode
                <div className="relative z-20">
                  <div className="flex w-full items-center rounded-xl border border-primary ring-2 ring-primary/20 bg-card overflow-hidden transition-all duration-200">
                    <input
                      autoFocus
                      className="flex-1 w-full bg-transparent h-12 pl-4 pr-10 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none border-none focus:ring-0"
                      placeholder="Search by name, ID, or city..."
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
                      {customerSearchQuery ? (
                        <button
                          onClick={() => setCustomerSearchQuery("")}
                          className="hover:text-foreground"
                        >
                          <X size={16} />
                        </button>
                      ) : (
                        <Search size={16} />
                      )}
                    </div>
                  </div>

                  {/* Dropdown Results */}
                  <div className="flex flex-col mt-2 w-full bg-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 bg-muted/50 border-b border-border flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {filteredCustomers.length} Results found
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        Esc to close
                      </span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto flex flex-col">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsCustomerSearchActive(false);
                            setIsCustomerExpanded(false);
                          }}
                          className="group flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 focus:bg-primary/5 focus:outline-none border-l-4 border-transparent hover:border-primary/50 focus:border-primary"
                        >
                          <div className="relative shrink-0">
                            {customer.image ? (
                              <div
                                className="h-10 w-10 rounded-full bg-cover bg-center border border-border"
                                style={{
                                  backgroundImage: `url("${customer.image}")`,
                                }}
                              ></div>
                            ) : (
                              <div
                                className={`h-10 w-10 rounded-full ${customer.iconBg} flex items-center justify-center`}
                              >
                                {customer.icon && <customer.icon size={20} />}
                              </div>
                            )}
                            {customer.status === "active" && (
                              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-card"></div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex justify-between items-center w-full">
                              <p className="text-foreground text-sm font-semibold truncate">
                                {customer.name}
                              </p>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${customer.typeColor}`}
                              >
                                {customer.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate flex items-center gap-1">
                                <MapPin size={10} /> {customer.location}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-border shrink-0"></span>
                              <span className="font-mono flex items-center gap-1">
                                <Hash size={10} /> {customer.account}
                              </span>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={16} className="text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-border bg-muted/50">
                      <button className="flex w-full cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm font-bold transition-all shadow-sm">
                        <Plus size={16} />
                        <span className="truncate">
                          Create New Customer: "{customerSearchQuery || "New"}"
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Selected Mode
                <div
                  className={`relative flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all duration-300 overflow-hidden cursor-pointer hover:border-primary/50 ${isCustomerExpanded ? "ring-2 ring-primary/20 border-primary" : ""}`}
                  onClick={() => setIsCustomerExpanded(!isCustomerExpanded)}
                >
                  <div className="p-4 flex items-start gap-4">
                    <div className="relative shrink-0">
                      {selectedCustomer.image ? (
                        <div
                          className="h-12 w-12 rounded-full bg-cover bg-center border border-border"
                          style={{
                            backgroundImage: `url("${selectedCustomer.image}")`,
                          }}
                        ></div>
                      ) : (
                        <div
                          className={`h-12 w-12 rounded-full ${selectedCustomer.iconBg} flex items-center justify-center`}
                        >
                          {selectedCustomer.icon && (
                            <selectedCustomer.icon size={24} />
                          )}
                        </div>
                      )}
                      {selectedCustomer.status === "active" && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border-2 border-card p-0.5">
                          <Check
                            size={10}
                            className="text-white"
                            strokeWidth={4}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-foreground text-base font-bold leading-tight truncate">
                          {selectedCustomer.name}
                        </p>
                        {isCustomerExpanded ? (
                          <ChevronUp
                            size={16}
                            className="text-muted-foreground"
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="text-muted-foreground"
                          />
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs leading-normal mt-0.5">
                        Account #: {selectedCustomer.account}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${selectedCustomer.typeColor}`}
                        >
                          {selectedCustomer.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isCustomerExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                      <div className="h-px w-full bg-border mb-4"></div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <CreditCard size={12} /> Billing Address
                          </span>
                          <p className="text-sm font-medium text-foreground pl-4 border-l-2 border-border">
                            {selectedCustomer.billing}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Truck size={12} /> Shipping Address
                          </span>
                          <p className="text-sm font-medium text-foreground pl-4 border-l-2 border-border">
                            {selectedCustomer.shipping}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Global Details */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-foreground">
                <Info size={18} className="text-primary" />
                <h3 className="text-sm font-bold">Global Invoice Details</h3>
              </div>
              <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-muted/30 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      P.O. Number
                    </label>
                    <input
                      className="block w-full rounded-lg bg-card py-2 px-3 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary shadow-sm border border-border outline-none"
                      type="text"
                      defaultValue="PO-8832-X"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Net Terms
                    </label>
                    <select className="block w-full rounded-lg bg-card py-2 px-3 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary shadow-sm border border-border outline-none">
                      <option>Net 30</option>
                      <option>Net 45</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Due Date
                    </label>
                    <input
                      className="block w-full rounded-lg bg-card py-2 px-3 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary shadow-sm border border-border outline-none"
                      type="date"
                      defaultValue="2024-12-31"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Delivery Mode
                    </label>
                    <select className="block w-full rounded-lg bg-card py-2 px-3 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary shadow-sm border border-border outline-none">
                      <option>Standard Truck</option>
                      <option>Warehouse Pickup</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-foreground">
                <CreditCard size={18} className="text-primary" />
                <h3 className="text-sm font-bold text-primary">
                  Totals & Pricing (Entire Invoice)
                </h3>
              </div>
              <div className="rounded-xl border border-primary/20 bg-card p-4 flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Subtotal (All Items)
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    $4,250.00
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    Tax Group
                  </span>
                  <div className="relative flex-1 max-w-[180px]">
                    <select className="appearance-none w-full rounded-lg border border-border bg-muted py-2 pl-3 pr-8 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary text-right cursor-pointer outline-none">
                      <option>County & State (8.5%)</option>
                      <option>Tax Exempt</option>
                      <option>FL State Tax</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground">
                      Total Labor Cost
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Global calculation
                    </span>
                  </div>
                  <div className="relative w-[120px]">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">
                      $
                    </span>
                    <input
                      className="w-full rounded-lg border border-border bg-muted py-2 pl-6 pr-3 text-xs font-bold text-right text-foreground focus:ring-1 focus:ring-primary outline-none"
                      type="text"
                      defaultValue="350.00"
                    />
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-dashed border-border mt-2">
                  <button className="text-xs font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors flex items-center gap-1">
                    <Plus size={14} />
                    Global Add-on Cost
                  </button>
                  <span className="text-xs font-bold text-muted-foreground">
                    +$0.00
                  </span>
                </div>
                <div className="bg-primary/5 rounded-lg p-4 mt-2 flex justify-between items-center border border-primary/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary uppercase tracking-tighter">
                      Grand Total Due
                    </span>
                    <span className="text-[10px] text-primary/60">
                      Includes all taxes & labor
                    </span>
                  </div>
                  <span className="text-2xl font-black text-primary">
                    $4,895.50
                  </span>
                </div>
              </div>
            </div>

            {/* Credit Limit */}
            <div className="p-4 rounded-xl bg-muted border border-transparent flex flex-col gap-3">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span className="font-bold uppercase tracking-widest">
                  Customer Credit Limit
                </span>
                <span className="font-mono font-bold text-foreground">
                  $25,000 / $50,000
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: "50%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Summary Modal (Bottom Sheet) */}
      {showMobileSummary && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div
              className="w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto my-3 cursor-pointer"
              onClick={() => setShowMobileSummary(false)}
            ></div>
            <div className="px-6 pb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-foreground">
                  Invoice Summary
                </h2>
                <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-primary text-[10px] font-black uppercase">
                  Draft
                </span>
              </div>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
                      Customer
                    </p>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-primary flex items-center justify-center text-[10px] font-black">
                        AC
                      </div>
                      Acme Construction
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
                      Project Ref
                    </p>
                    <p className="font-medium text-foreground">
                      Lot 45 - Smith
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 py-4 border-y border-border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Items (9)</span>
                    <span className="font-medium text-foreground">
                      $2,170.00
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Labor Total</span>
                    <span className="font-medium text-foreground">$555.00</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Est. Tax (5%)</span>
                    <span className="font-medium text-foreground">$136.25</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-lg font-bold text-foreground">
                    Grand Total
                  </span>
                  <span className="text-3xl font-black text-foreground tracking-tight">
                    $2,861.25
                  </span>
                </div>
                <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 rounded-lg font-black text-lg shadow-lg shadow-primary/30 transition-colors">
                  Confirm and Pay
                </button>
                <button
                  onClick={() => setShowMobileSummary(false)}
                  className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground font-bold text-sm transition-colors"
                >
                  <FileTextIcon size={18} />
                  Export PDF Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Door Modal */}
      <SalesDoorDetailModal
        isOpen={isDoorModalOpen}
        onClose={() => setIsDoorModalOpen(false)}
      />

      {/* Calculator Modal */}
      <MouldingCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApply={(pieces, footage) => {
          console.log(`Applied: ${pieces} pieces, ${footage} LF`);
          setIsCalculatorOpen(false);
        }}
        productName={activeCalculatorItem || "Moulding Profile"}
      />

      {/* Print Preview Modal */}
      <SalesInvoicePrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
