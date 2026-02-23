import React, { useState } from "react";
import { X, Printer, Download, ChevronDown, Check } from "lucide-react";

interface SalesInvoicePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TemplateType = "modern" | "classic" | "visual";

export const SalesInvoicePrintPreviewModal: React.FC<
  SalesInvoicePrintPreviewModalProps
> = ({ isOpen, onClose }) => {
  const [template, setTemplate] = useState<TemplateType>("visual");
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-background rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">
              Invoice Print Preview
            </h2>

            {/* Template Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted border border-border rounded-lg text-sm font-medium transition-colors"
              >
                <span>
                  {template === "modern" && "Example 1 (Modern)"}
                  {template === "classic" && "Example 2 (Classic)"}
                  {template === "visual" && "Example 3 (Visual)"}
                </span>
                <ChevronDown size={14} className="opacity-50" />
              </button>

              {isTemplateMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsTemplateMenuOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden py-1">
                    <button
                      onClick={() => {
                        setTemplate("modern");
                        setIsTemplateMenuOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted text-left"
                    >
                      <span>Example 1 (Modern)</span>
                      {template === "modern" && (
                        <Check size={14} className="text-primary" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setTemplate("classic");
                        setIsTemplateMenuOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted text-left"
                    >
                      <span>Example 2 (Classic)</span>
                      {template === "classic" && (
                        <Check size={14} className="text-primary" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setTemplate("visual");
                        setIsTemplateMenuOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted text-left"
                    >
                      <span>Example 3 (Visual)</span>
                      {template === "visual" && (
                        <Check size={14} className="text-primary" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
            >
              <Printer size={16} />
              Print
            </button>
            <div className="h-6 w-px bg-border mx-2"></div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
          <div
            className={`mx-auto bg-white text-slate-900 shadow-lg min-h-[1100px] print:shadow-none print:w-full print:max-w-none print:p-0 print:min-h-0 print:m-0 ${template === "modern" ? "max-w-[850px] p-8 md:p-10" : template === "classic" ? "max-w-[950px] p-8" : "max-w-[1000px] p-10"}`}
          >
            {template === "modern" && <ModernTemplate />}
            {template === "classic" && <ClassicTemplate />}
            {template === "visual" && <VisualTemplate />}
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernTemplate = () => (
  <div className="flex flex-col h-full">
    {/* Header */}
    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          {/* Logo Placeholder */}
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-lg font-bold text-2xl">
            G
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            GND MILLWORK
          </span>
        </div>
        <div className="text-xs font-medium text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700">Headquarters</p>
          <p>13285 SW 131 ST</p>
          <p>Miami, FL 33186</p>
          <p className="mt-2">Phone: 305-278-6555</p>
          <p>support@gndmillwork.com</p>
        </div>
      </div>
      <div className="text-left md:text-right w-full md:w-auto">
        <h1 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">
          Invoice
        </h1>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <span className="font-bold text-slate-600 md:text-right">
            Invoice #
          </span>
          <span className="font-bold text-slate-900">06875AD</span>

          <span className="font-bold text-slate-600 md:text-right">Date</span>
          <span className="text-slate-900">01/29/26</span>

          <span className="font-bold text-slate-600 md:text-right">Rep</span>
          <span className="text-slate-900">Arlen Delgado</span>

          <span className="font-bold text-slate-600 md:text-right">
            Due Date
          </span>
          <span className="text-slate-900">02/05/26</span>

          <span className="font-bold text-slate-600 md:text-right mt-2 self-center">
            Status
          </span>
          <span className="font-bold text-amber-700 mt-2 uppercase text-[10px] border border-amber-200 bg-amber-50 px-2 py-0.5 rounded w-fit md:ml-auto">
            Pending
          </span>
        </div>
      </div>
    </div>

    <hr className="border-slate-200 mb-8" />

    {/* Bill To / Ship To */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">
          Sold To
        </h3>
        <div className="space-y-1">
          <p className="font-bold text-sm text-slate-900">
            AIG CONSTRUCTIONS SERVICES INC
          </p>
          <p className="text-sm text-slate-600">786-972-8117</p>
          <p className="text-sm text-slate-600">123 Construction Blvd</p>
          <p className="text-sm text-slate-600">Miami, FL 33101</p>
        </div>
      </div>
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">
          Ship To
        </h3>
        <div className="space-y-1">
          <p className="font-bold text-sm text-slate-900">
            Job Site #4 - Riverside Project
          </p>
          <p className="text-sm text-slate-600">Attn: Site Manager</p>
          <p className="text-sm text-slate-600">456 River Rd</p>
          <p className="text-sm text-slate-600">Miami, FL 33101</p>
        </div>
      </div>
    </div>

    {/* Section: Interior Pre-Hung */}
    <div className="mb-10">
      <div className="bg-slate-100 border border-slate-200 px-4 py-2 font-bold text-slate-800 uppercase text-xs tracking-wider mb-[-1px] rounded-t-lg flex justify-between items-center">
        <span>Interior Pre-Hung</span>
        <span className="text-[10px] text-slate-500 font-normal normal-case">
          Section 1
        </span>
      </div>

      {/* Config Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 border border-slate-200 bg-slate-50/50 text-[10px] mb-4 divide-x divide-slate-200 border-t-0 rounded-b-lg">
        <div className="p-2">
          <span className="block font-bold text-slate-500 mb-0.5">
            Configuration
          </span>
          <span className="font-semibold text-slate-900">PH - Single</span>
        </div>
        <div className="p-2">
          <span className="block font-bold text-slate-500 mb-0.5">Bore</span>
          <span className="font-semibold text-slate-900">Single Bore</span>
        </div>
        <div className="p-2">
          <span className="block font-bold text-slate-500 mb-0.5">Type</span>
          <span className="font-semibold text-slate-900">SC Molded</span>
        </div>
        <div className="p-2">
          <span className="block font-bold text-slate-500 mb-0.5">Jamb</span>
          <span className="font-semibold text-slate-900">4-5/8</span>
        </div>
        <div className="p-2">
          <span className="block font-bold text-slate-500 mb-0.5">Hinge</span>
          <span className="font-semibold text-slate-900">Satin Nickel</span>
        </div>
        <div className="p-2">
          <span className="block font-bold text-slate-500 mb-0.5">Casing</span>
          <span className="font-semibold text-slate-900">No Casing</span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-100">
            <th className="py-2 px-2 text-left w-10 text-slate-400 font-semibold">
              #
            </th>
            <th className="py-2 px-2 text-left w-16 text-slate-400 font-semibold">
              Image
            </th>
            <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Description
            </th>
            <th className="py-2 px-2 text-left w-24 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Size
            </th>
            <th className="py-2 px-2 text-center w-12 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              LH
            </th>
            <th className="py-2 px-2 text-center w-12 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              RH
            </th>
            <th className="py-2 px-2 text-right w-24 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Rate
            </th>
            <th className="py-2 px-2 text-right w-24 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          <tr>
            <td className="py-3 px-2 text-slate-400 align-top">1</td>
            <td className="py-2 px-2 align-top">
              <div className="w-10 h-10 bg-slate-50 rounded border border-slate-200 overflow-hidden">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYlCL9iihbQA2hCiRlnF80YtsgyyWxwvgFvDLFXHEOYdpAScLf2Gi5D5URDiVjZ0E7s1JzmnBu6WGDGody6qpnXybSoDsQJ6f7v9e-6x06bFXcPQ83BZMB-0XA34Hh2f0JAqPh6j_7bwZvRJBY5EJvRruAhqN5cx7KcW4ZCh5JJejK1oSVruqtzy9Zgk1hK-Q56i5L3sckJ-dLF_cmbEWPbgilwHZvfZb0d5QWIPZt81GRN9AeN2pJXFWrFTGz8vsfV5nZjMI32qar"
                  alt="Door"
                  className="w-full h-full object-contain"
                />
              </div>
            </td>
            <td className="py-3 px-2 font-bold text-slate-800 align-top">
              PH - S.C DOOR 2PNL SQR TOP (CARRARA) PRIMED
            </td>
            <td className="py-3 px-2 text-slate-600 align-top">
              <div className="font-medium">2-8 x 6-8</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                (32" x 80")
              </div>
            </td>
            <td className="py-3 px-2 text-center text-slate-600 align-top">
              1
            </td>
            <td className="py-3 px-2 text-center text-slate-600 align-top">
              0
            </td>
            <td className="py-3 px-2 text-right text-slate-600 align-top">
              $208.34
            </td>
            <td className="py-3 px-2 text-right font-bold text-slate-900 align-top">
              $208.34
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Section: Bifold */}
    <div className="mb-8">
      <div className="bg-slate-100 border border-slate-200 px-4 py-2 font-bold text-slate-800 uppercase text-xs tracking-wider mb-[-1px] rounded-t-lg flex justify-between items-center">
        <span>Bifold</span>
        <span className="text-[10px] text-slate-500 font-normal normal-case">
          Section 2
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-xs border-collapse border-t border-slate-200">
        <thead>
          <tr className="border-b-2 border-slate-100">
            <th className="py-2 px-2 text-left w-10 text-slate-400 font-semibold">
              #
            </th>
            <th className="py-2 px-2 text-left w-16 text-slate-400 font-semibold">
              Image
            </th>
            <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Description
            </th>
            <th className="py-2 px-2 text-left w-24 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Size
            </th>
            <th className="py-2 px-2 text-center w-24 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Qty
            </th>
            <th className="py-2 px-2 text-right w-24 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Rate
            </th>
            <th className="py-2 px-2 text-right w-24 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          <tr>
            <td className="py-3 px-2 text-slate-400 align-top">1</td>
            <td className="py-2 px-2 align-top">
              <div className="w-10 h-10 bg-slate-50 rounded border border-slate-200 overflow-hidden">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8"
                  alt="Moulding"
                  className="w-full h-full object-contain"
                />
              </div>
            </td>
            <td className="py-3 px-2 font-bold text-slate-800 align-top">
              BF H.C 2pnl CARRARA primed W/ T & H
            </td>
            <td className="py-3 px-2 text-slate-600 align-top">
              <div className="font-medium">2-8 x 6-8</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                (32" x 80")
              </div>
            </td>
            <td className="py-3 px-2 text-center text-slate-600 align-top">
              1
            </td>
            <td className="py-3 px-2 text-right text-slate-600 align-top">
              $73.63
            </td>
            <td className="py-3 px-2 text-right font-bold text-slate-900 align-top">
              $73.63
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Footer Section */}
    <div className="flex flex-col md:flex-row gap-8 mt-12 pt-8 border-t-2 border-slate-100">
      <div className="flex-1">
        <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-xs">
          <p className="font-bold text-red-700 italic mb-2">
            Note: Payments made with Cards will have an additional 3% charge to
            cover merchant fees.
          </p>
          <ul className="list-decimal list-inside space-y-1 text-red-600 font-medium">
            <li>NO RETURN ON SPECIAL ORDER</li>
            <li>NO DAMAGED ORDER MAY BE EXCHANGED OR RETURNED</li>
            <li>ONCE SIGNED THERE IS NO RETURN OR EXCHANGE.</li>
          </ul>
        </div>
        <div className="mt-8 text-[10px] text-slate-400">
          <p>Thank you for your business!</p>
          <p>GND MILLWORK &copy; 2026</p>
        </div>
      </div>
      <div className="w-full md:w-72">
        <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="font-semibold text-slate-600">Subtotal</span>
            <span className="font-bold text-slate-900">$281.97</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="font-semibold text-slate-600">Tax (7%)</span>
            <span className="font-bold text-slate-900">$19.74</span>
          </div>
          <div className="flex justify-between py-3 mt-2">
            <span className="font-black text-base text-slate-900 uppercase">
              Total Due
            </span>
            <span className="font-black text-xl text-slate-900">$301.71</span>
          </div>
        </div>
        <div className="mt-8">
          <div className="h-16 border-b border-slate-300"></div>
          <p className="text-center text-xs text-slate-400 mt-2 font-medium uppercase tracking-wide">
            Authorized Signature
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ClassicTemplate = () => (
  <div className="font-sans text-xs">
    {/* Header Table */}
    <table className="w-full table-fixed mb-4">
      <tbody>
        <tr>
          {/* Logo */}
          <td className="align-top w-[25%]" colSpan={3}>
            <div className="w-32 h-16 bg-slate-900 text-white flex items-center justify-center rounded font-bold text-xl mb-2">
              GND
            </div>
          </td>
          {/* Company Info */}
          <td className="align-top w-[35%]" colSpan={4}>
            <div className="text-xs font-semibold text-slate-600">
              <p>13285 SW 131 ST</p>
              <p>Miami, Fl 33186</p>
              <p>Phone: 305-278-6555</p>
              <p>support@gndmillwork.com</p>
            </div>
          </td>
          {/* Invoice Info */}
          <td className="align-top w-[40%]" colSpan={5}>
            <p className="mb-2 text-right text-xl font-bold uppercase tracking-tight">
              Invoice
            </p>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="font-bold pb-1">Invoice #</td>
                  <td className="text-right pb-1 font-bold text-base">
                    06875AD
                  </td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Invoice Date</td>
                  <td className="text-right pb-1">01/29/26</td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Rep</td>
                  <td className="text-right pb-1">Arlen Delgado</td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Invoice Status</td>
                  <td className="text-right pb-1 font-bold uppercase text-amber-600">
                    Pending
                  </td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Due Date</td>
                  <td className="text-right pb-1">02/05/26</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>

    {/* Sold To / Ship To */}
    <div className="grid grid-cols-2 gap-8 mb-6">
      <div className="flex flex-col">
        <div className="bg-slate-200 border border-slate-300 border-b-0 px-2 py-1 font-bold text-slate-700 text-sm w-fit">
          Sold To
        </div>
        <div className="border border-slate-300 p-2 text-sm font-medium">
          <p>AIG CONSTRUCIONS SERVICES INC</p>
          <p>786-972-8117</p>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="bg-slate-200 border border-slate-300 border-b-0 px-2 py-1 font-bold text-slate-700 text-sm w-fit">
          Ship To
        </div>
        <div className="border border-slate-300 p-2 text-sm font-medium">
          <p>AIG CONSTRUCIONS SERVICES INC</p>
          <p>786-972-8117</p>
        </div>
      </div>
    </div>

    {/* Section 1: Interior Pre-hung */}
    <div className="mb-6">
      <div className="bg-slate-200 border border-slate-300 border-b-0 px-2 py-1 font-bold text-base uppercase">
        Interior pre-hung
      </div>
      <div className="border border-slate-300 mb-[-1px]">
        {/* Specs Grid */}
        <div className="grid grid-cols-2 text-[10px]">
          <div className="col-span-1 grid grid-cols-3 border-b border-r border-slate-300">
            <div className="font-bold p-1 border-r border-slate-300 bg-slate-50">
              Configuration
            </div>
            <div className="col-span-2 p-1">PH - Single</div>
          </div>
          <div className="col-span-1 grid grid-cols-3 border-b border-slate-300">
            <div className="font-bold p-1 border-r border-slate-300 bg-slate-50">
              Bore
            </div>
            <div className="col-span-2 p-1">Single Bore</div>
          </div>
          <div className="col-span-1 grid grid-cols-3 border-b border-r border-slate-300">
            <div className="font-bold p-1 border-r border-slate-300 bg-slate-50">
              Door Type
            </div>
            <div className="col-span-2 p-1">SC Molded</div>
          </div>
          <div className="col-span-1 grid grid-cols-3 border-b border-slate-300">
            <div className="font-bold p-1 border-r border-slate-300 bg-slate-50">
              Jamb Size
            </div>
            <div className="col-span-2 p-1">4-5/8</div>
          </div>
          <div className="col-span-1 grid grid-cols-3 border-r border-slate-300">
            <div className="font-bold p-1 border-r border-slate-300 bg-slate-50">
              Hinge Finish
            </div>
            <div className="col-span-2 p-1">US15---Satin Nickel</div>
          </div>
          <div className="col-span-1 grid grid-cols-3">
            <div className="font-bold p-1 border-r border-slate-300 bg-slate-50">
              Casing Y/N
            </div>
            <div className="col-span-2 p-1">No Casing</div>
          </div>
        </div>
      </div>

      {/* Item Table */}
      <table className="w-full border-collapse border border-slate-300 text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-300 px-2 py-1 text-center w-8">
              #
            </th>
            <th className="border border-slate-300 px-2 py-1 text-center w-16">
              Image
            </th>
            <th className="border border-slate-300 px-2 py-1 text-left">
              Door
            </th>
            <th className="border border-slate-300 px-2 py-1 text-left w-24">
              Size
            </th>
            <th className="border border-slate-300 px-2 py-1 text-center w-12">
              LH
            </th>
            <th className="border border-slate-300 px-2 py-1 text-center w-12">
              RH
            </th>
            <th className="border border-slate-300 px-2 py-1 text-right w-20">
              Rate
            </th>
            <th className="border border-slate-300 px-2 py-1 text-right w-20">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-2 py-2 text-center align-middle">
              1
            </td>
            <td className="border border-slate-300 px-2 py-2 text-center align-middle">
              <div className="w-10 h-10 mx-auto">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYlCL9iihbQA2hCiRlnF80YtsgyyWxwvgFvDLFXHEOYdpAScLf2Gi5D5URDiVjZ0E7s1JzmnBu6WGDGody6qpnXybSoDsQJ6f7v9e-6x06bFXcPQ83BZMB-0XA34Hh2f0JAqPh6j_7bwZvRJBY5EJvRruAhqN5cx7KcW4ZCh5JJejK1oSVruqtzy9Zgk1hK-Q56i5L3sckJ-dLF_cmbEWPbgilwHZvfZb0d5QWIPZt81GRN9AeN2pJXFWrFTGz8vsfV5nZjMI32qar"
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            </td>
            <td className="border border-slate-300 px-2 py-2 align-middle font-medium">
              PH - S.C DOOR 2PNL SQR TOP (CARRARA) PRIMED
            </td>
            <td className="border border-slate-300 px-2 py-2 align-middle">
              <div>2-8 x 6-8</div>
              <div className="text-[10px] text-slate-500">(32" x 80")</div>
            </td>
            <td className="border border-slate-300 px-2 py-2 text-center align-middle">
              1
            </td>
            <td className="border border-slate-300 px-2 py-2 text-center align-middle">
              0
            </td>
            <td className="border border-slate-300 px-2 py-2 text-right align-middle">
              $208.34
            </td>
            <td className="border border-slate-300 px-2 py-2 text-right align-middle font-bold">
              $208.34
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Section 2: Bifold */}
    <div className="mb-6">
      <div className="bg-slate-200 border border-slate-300 border-b-0 px-2 py-1 font-bold text-base uppercase">
        Bifold
      </div>

      {/* Item Table */}
      <table className="w-full border-collapse border border-slate-300 text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-300 px-2 py-1 text-center w-8">
              #
            </th>
            <th className="border border-slate-300 px-2 py-1 text-center w-16">
              Image
            </th>
            <th className="border border-slate-300 px-2 py-1 text-left">
              Door
            </th>
            <th className="border border-slate-300 px-2 py-1 text-left w-24">
              Size
            </th>
            <th className="border border-slate-300 px-2 py-1 text-center w-24">
              Qty
            </th>
            <th className="border border-slate-300 px-2 py-1 text-right w-20">
              Rate
            </th>
            <th className="border border-slate-300 px-2 py-1 text-right w-20">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-2 py-2 text-center align-middle">
              1
            </td>
            <td className="border border-slate-300 px-2 py-2 text-center align-middle">
              <div className="w-10 h-10 mx-auto">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8"
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            </td>
            <td className="border border-slate-300 px-2 py-2 align-middle font-medium">
              BF H.C 2pnl CARRARA primed W/ T & H
            </td>
            <td className="border border-slate-300 px-2 py-2 align-middle">
              <div>2-8 x 6-8</div>
              <div className="text-[10px] text-slate-500">(32" x 80")</div>
            </td>
            <td className="border border-slate-300 px-2 py-2 text-center align-middle">
              1
            </td>
            <td className="border border-slate-300 px-2 py-2 text-right align-middle">
              $73.63
            </td>
            <td className="border border-slate-300 px-2 py-2 text-right align-middle font-bold">
              $73.63
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Footer Grid */}
    <div className="flex gap-4 items-start">
      {/* Notes */}
      <div className="flex-1 border border-slate-300 p-4">
        <p className="text-red-600 text-xs italic mb-2 font-semibold">
          Note: Payments made with Cards will have an additional 3% charge to
          cover credit cards merchants fees.
        </p>
        <div className="space-y-1 text-[10px] text-red-600 font-bold">
          <p>1) NO RETURN ON SPECIAL ORDER</p>
          <p>2) NO DAMAGED ORDER MAY BE EXCHANGE OR RETURN</p>
          <p>3) ONCE SIGN THERE IS NO RETURN OR EXCHANGE.</p>
        </div>
      </div>

      {/* Totals */}
      <div className="w-64">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border border-slate-300">
              <td className="bg-slate-200 px-2 py-1 font-bold text-slate-800">
                Subtotal
              </td>
              <td className="px-2 py-1 text-right font-bold">$281.97</td>
            </tr>
            <tr className="border border-slate-300">
              <td className="bg-slate-200 px-2 py-1 font-bold text-slate-800">
                Tax 7%
              </td>
              <td className="px-2 py-1 text-right font-bold">$19.74</td>
            </tr>
            <tr className="border border-slate-300">
              <td className="bg-slate-200 px-2 py-2 font-black text-slate-900 text-sm">
                Total Due
              </td>
              <td className="px-2 py-2 text-right font-black text-slate-900 text-sm">
                $301.71
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const VisualTemplate = () => (
  <div className="flex flex-col h-full font-sans text-slate-900">
    {/* Modern Header with accent */}
    <div className="flex justify-between items-start mb-10">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-600 text-white flex items-center justify-center rounded-xl font-bold text-3xl shadow-lg shadow-blue-200">
          G
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            GND MILLWORK
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Premium Architectural Solutions
          </p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-5xl font-black text-slate-200 tracking-tighter uppercase leading-none">
          Invoice
        </h2>
        <p className="text-lg font-bold text-blue-600 mt-2">#06875AD</p>
      </div>
    </div>

    {/* Info Grid */}
    <div className="grid grid-cols-3 gap-12 mb-12">
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Billed To
        </h3>
        <div>
          <p className="font-bold text-lg text-slate-900">AIG Constructions</p>
          <p className="text-slate-600">Attn: Accounts Payable</p>
          <p className="text-slate-600">786-972-8117</p>
          <p className="text-slate-600">billing@aigconst.com</p>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Shipped To
        </h3>
        <div>
          <p className="font-bold text-lg text-slate-900">Job Site #4</p>
          <p className="text-slate-600">Riverside Project</p>
          <p className="text-slate-600">456 River Rd</p>
          <p className="text-slate-600">Miami, FL 33101</p>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Details
        </h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-slate-500 font-medium">Date Issued</span>
          <span className="font-bold">Jan 29, 2026</span>

          <span className="text-slate-500 font-medium">Due Date</span>
          <span className="font-bold">Feb 05, 2026</span>

          <span className="text-slate-500 font-medium">Reference</span>
          <span className="font-bold">PO-9921</span>
        </div>
      </div>
    </div>

    {/* Visual Item List */}
    <div className="space-y-8 mb-12">
      {/* Group 1 */}
      <div>
        <div className="flex items-center gap-4 mb-4 pb-2 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Interior Doors</h3>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            Section 1
          </span>
        </div>

        {/* Visual Rows */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100 items-start">
            {/* Large Image */}
            <div className="w-full md:w-32 h-48 bg-white rounded-xl border border-slate-200 p-2 flex-shrink-0 shadow-sm flex items-center justify-center">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYlCL9iihbQA2hCiRlnF80YtsgyyWxwvgFvDLFXHEOYdpAScLf2Gi5D5URDiVjZ0E7s1JzmnBu6WGDGody6qpnXybSoDsQJ6f7v9e-6x06bFXcPQ83BZMB-0XA34Hh2f0JAqPh6j_7bwZvRJBY5EJvRruAhqN5cx7KcW4ZCh5JJejK1oSVruqtzy9Zgk1hK-Q56i5L3sckJ-dLF_cmbEWPbgilwHZvfZb0d5QWIPZt81GRN9AeN2pJXFWrFTGz8vsfV5nZjMI32qar"
                className="w-full h-full object-contain"
                alt="Door"
              />
            </div>

            {/* Details */}
            <div className="flex-1 grid grid-cols-12 gap-6 w-full">
              <div className="col-span-12 md:col-span-6 space-y-4">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 leading-tight">
                    PH - S.C Door 2-Panel Square Top
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">
                    Carrara Primed • Solid Core
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                    <span className="block text-slate-400 uppercase text-[10px] font-bold mb-0.5">
                      Size
                    </span>
                    <span className="font-bold text-slate-800">2-8 x 6-8</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                    <span className="block text-slate-400 uppercase text-[10px] font-bold mb-0.5">
                      Swing
                    </span>
                    <span className="font-bold text-slate-800">
                      LH (1) / RH (0)
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                    <span className="block text-slate-400 uppercase text-[10px] font-bold mb-0.5">
                      Jamb
                    </span>
                    <span className="font-bold text-slate-800">4-5/8"</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                    <span className="block text-slate-400 uppercase text-[10px] font-bold mb-0.5">
                      Hinge
                    </span>
                    <span className="font-bold text-slate-800">
                      Satin Nickel
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-span-4 md:col-span-2 flex flex-col justify-center items-center md:border-l border-slate-200 md:pl-6">
                <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Qty
                </span>
                <span className="text-2xl font-bold text-slate-900 bg-white border border-slate-200 w-12 h-12 flex items-center justify-center rounded-lg shadow-sm">
                  1
                </span>
              </div>

              <div className="col-span-4 md:col-span-2 flex flex-col justify-center items-center md:border-l border-slate-200 md:pl-6">
                <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Rate
                </span>
                <span className="text-lg font-medium text-slate-600">
                  $208.34
                </span>
              </div>

              <div className="col-span-4 md:col-span-2 flex flex-col justify-center items-end md:border-l border-slate-200 md:pl-6">
                <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Total
                </span>
                <span className="text-2xl font-black text-slate-900">
                  $208.34
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group 2 */}
      <div>
        <div className="flex items-center gap-4 mb-4 pb-2 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Bifold Doors</h3>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            Section 2
          </span>
        </div>

        {/* Visual Rows */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100 items-start">
            {/* Large Image */}
            <div className="w-full md:w-32 h-48 bg-white rounded-xl border border-slate-200 p-2 flex-shrink-0 shadow-sm flex items-center justify-center">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuap9gqK5_N0imKrPDmQp6qLjVcHmCFmQEqHeC2luIvqZjTO_Us9U0h2zH3-lDFcAbU8nqa7Nts5xE2_Eg2jqtTSEoaYkkt5MhJtVTYszM7RZhnAemX1Y9F_-bsGwfxrqTlrGCajXTkAE_199g9xvT_po9dD0GYtPYOmGVQUN6VQmOeOdanxnplFwNHvY7leeAGFeq8HHdF1QJm7sxaSoSk7R_aWfOawDBM5PGycjfCSRHho-XrLcfhAS6ttHA0oKUYr9XHZFsTxR8"
                className="w-full h-full object-contain"
                alt="Moulding"
              />
            </div>

            {/* Details */}
            <div className="flex-1 grid grid-cols-12 gap-6 w-full">
              <div className="col-span-12 md:col-span-6 space-y-4">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 leading-tight">
                    BF H.C 2pnl CARRARA primed W/ T & H
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">
                    Hollow Core • Primed Finish
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                    <span className="block text-slate-400 uppercase text-[10px] font-bold mb-0.5">
                      Size
                    </span>
                    <span className="font-bold text-slate-800">2-8 x 6-8</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                    <span className="block text-slate-400 uppercase text-[10px] font-bold mb-0.5">
                      Type
                    </span>
                    <span className="font-bold text-slate-800">Bi-Fold</span>
                  </div>
                </div>
              </div>

              <div className="col-span-4 md:col-span-2 flex flex-col justify-center items-center md:border-l border-slate-200 md:pl-6">
                <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Qty
                </span>
                <span className="text-2xl font-bold text-slate-900 bg-white border border-slate-200 w-12 h-12 flex items-center justify-center rounded-lg shadow-sm">
                  1
                </span>
              </div>

              <div className="col-span-4 md:col-span-2 flex flex-col justify-center items-center md:border-l border-slate-200 md:pl-6">
                <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Rate
                </span>
                <span className="text-lg font-medium text-slate-600">
                  $73.63
                </span>
              </div>

              <div className="col-span-4 md:col-span-2 flex flex-col justify-center items-end md:border-l border-slate-200 md:pl-6">
                <span className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Total
                </span>
                <span className="text-2xl font-black text-slate-900">
                  $73.63
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Footer Totals */}
    <div className="mt-auto bg-slate-900 text-white rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center shadow-2xl">
      <div className="text-slate-400 text-sm max-w-md mb-6 md:mb-0">
        <p className="font-bold text-white mb-2 uppercase tracking-widest text-xs">
          Payment Instructions
        </p>
        <p>Please make checks payable to GND Millwork.</p>
        <p>ACH/Wire: Chase Bank, Acct #9928331, Routing #02100021</p>
        <p className="mt-4 italic opacity-70">Thank you for your business!</p>
      </div>
      <div className="flex flex-col gap-2 w-full md:w-80">
        <div className="flex justify-between items-center text-slate-300">
          <span className="font-medium">Subtotal</span>
          <span className="font-bold text-white">$281.97</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="font-medium">Tax (7%)</span>
          <span className="font-bold text-white">$19.74</span>
        </div>
        <div className="h-px bg-slate-700 my-2"></div>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold">Total Due</span>
          <span className="text-4xl font-black text-blue-400">$301.71</span>
        </div>
      </div>
    </div>
  </div>
);
