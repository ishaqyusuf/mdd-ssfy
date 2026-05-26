# Sales Form UI Parity Report

- Date: 2026-05-26
- Runner: Codex in-app browser, authenticated session
- Viewport: `1600x1000`
- Scope per session: one order and one quote
- Skipped: `order-08094pc` per user request

## Overall Status

| Type | Number | Links | Status | Legacy Total | New Total | Delta Total | Finding |
|---|---:|---|---|---:|---:|---:|---|
| order | 08093PC | [old](http://localhost:3000/sales-form/edit-order/08093PC) / [new](http://localhost:3000/sales-book/edit-order/08093PC) | resolved | 245.79 | 240.76 | -5.03 | New sales book is accurate; legacy got the cost wrong. |
| quote | 03058PC | [old](http://localhost:3000/sales-form/edit-quote/03058PC) / [new](http://localhost:3000/sales-book/edit-quote/03058PC) | pass | 208.88 | 208.88 | 0.00 | Totals match. |
| order | 08092AD | [old](http://localhost:3000/sales-form/edit-order/08092AD) / [new](http://localhost:3000/sales-book/edit-order/08092AD) | error | n/a | 54.31 | n/a | Legacy page crashed with a client-side exception. |
| quote | 03057PC | [old](http://localhost:3000/sales-form/edit-quote/03057PC) / [new](http://localhost:3000/sales-book/edit-quote/03057PC) | fail | 4324.24 | 4627.79 | 303.55 | Tax group mismatch: legacy Tax Exempt, new County & State Tax (7%). |

## Detailed Totals

| Type | Number | Status | Legacy Subtotal | New Subtotal | Legacy Tax | New Tax | Legacy CCC | New CCC | Legacy Total | New Total | Delta Total |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| order | 08093PC | resolved | 223.02 | 218.46 | 15.61 | 15.29 | 7.16 | 7.01 | 245.79 | 240.76 | -5.03 |
| quote | 03058PC | pass | 189.53 | 189.53 | 13.27 | 13.27 | 6.08 | 6.08 | 208.88 | 208.88 | 0.00 |
| order | 08092AD | error | n/a | 49.28 | n/a | 3.45 | n/a | 1.58 | n/a | 54.31 | n/a |
| quote | 03057PC | fail | 4198.29 | 4199.07 | 0.00 | 293.93 | 125.95 | 134.79 | 4324.24 | 4627.79 | 303.55 |

## Findings

### 08093PC

Status: resolved.

Conclusion: the new sales book total is accurate; the legacy sales form got the cost wrong.

The mismatch begins before tax/CCC: legacy renders the line/subtotal as `$223.02`, while the new sales book renders `$218.46`. That creates a subtotal delta of `-$4.56`, then tax changes by `-$0.32`, CCC by `-$0.15`, and the final grand total ends `-$5.03` lower in the new UI.

Legacy also showed a local recovery state:

`Unsaved local edits were found from 5/26/2026, 10:39:35 AM.`

### 03058PC

Status: pass.

Both legacy and new sales book rendered total `$208.88`. Legacy showed a local recovery warning, but the totals still matched.

### 08092AD

Status: error.

The legacy edit page crashed and totals could not be extracted:

`Application error: a client-side exception has occurred (see the browser console for more information).`

The new sales book page rendered successfully with total `$54.31`.

### 03057PC

Status: fail.

The subtotal is close (`$4,198.29` legacy vs `$4,199.07` new), but tax is the main break: legacy shows `Tax Exempt` with `$0.00` tax, while the new sales book shows `County & State Tax (7%)` with `$293.93` tax. That drives the grand total from `$4,324.24` legacy to `$4,627.79` new.

Legacy also showed a local recovery state:

`Unsaved local edits were found from 5/26/2026, 10:45:24 AM.`

## Raw Records

```jsonl
{"kind":"order","number":"08093PC","status":"resolved","legacyUrl":"http://localhost:3000/sales-form/edit-order/08093PC","newUrl":"http://localhost:3000/sales-book/edit-order/08093PC","legacy":{"subTotal":223.02,"tax":15.61,"addCost":0,"ccc":7.16,"grandTotal":245.79,"warnings":["Unsaved changes","Unsaved local edits were found from 5/26/2026, 10:39:35 AM."],"visibleMoneyLines":["$223.02","$189.53","$223.02","$223.02","$15.61","+$0.00","$7.16","$245.79"]},"new":{"subTotal":218.46,"tax":15.29,"addCost":null,"ccc":7.01,"grandTotal":240.76,"warnings":["data not saved"],"visibleNumberFlows":[218.46,218.46,15.29,7.01,218.46,15.29,7.01,240.76],"accuracy":"accurate"},"deltasNewMinusLegacy":{"subTotal":-4.56,"tax":-0.32,"ccc":-0.15,"grandTotal":-5.03},"viewport":{"width":1600,"height":1000},"resolution":{"status":"resolved","conclusion":"New sales book total is accurate; legacy rendered the wrong cost.","resolvedAt":"2026-05-26"},"notes":["Skipped order-08094pc per user request.","Legacy page displayed an unsaved local edits recovery warning during the real UI test.","The mismatch starts at the item/subtotal level: legacy rendered $223.02 while new rendered $218.46.","Resolved by user confirmation: new sales book is accurate; legacy got the cost wrong."]}
{"kind":"quote","number":"03058PC","status":"pass","legacyUrl":"http://localhost:3000/sales-form/edit-quote/03058PC","newUrl":"http://localhost:3000/sales-book/edit-quote/03058PC","legacy":{"subTotal":189.53,"tax":13.27,"addCost":0,"ccc":6.08,"grandTotal":208.88,"warnings":["Unsaved changes","Unsaved local edits were found from 5/26/2026, 10:32:11 AM."],"visibleMoneyLines":["$189.53","$189.53","$189.53","$189.53","$13.27","+$0.00","$6.08","$208.88"]},"new":{"subTotal":189.53,"tax":13.27,"addCost":null,"ccc":6.08,"grandTotal":208.88,"warnings":["data not saved"],"visibleNumberFlows":[189.53,189.53,13.27,6.08,189.53,13.27,6.08,208.88]},"deltasNewMinusLegacy":{"subTotal":0,"tax":0,"ccc":0,"grandTotal":0},"viewport":{"width":1600,"height":1000},"notes":["Quote passed despite legacy showing an unsaved local edits recovery warning."]}
{"kind":"order","number":"08092AD","status":"error","legacyUrl":"http://localhost:3000/sales-form/edit-order/08092AD","newUrl":"http://localhost:3000/sales-book/edit-order/08092AD","legacy":{"subTotal":null,"tax":null,"addCost":null,"ccc":null,"grandTotal":null,"warnings":["Application error: a client-side exception has occurred (see the browser console for more information)."],"visibleMoneyLines":[]},"new":{"subTotal":49.28,"tax":3.45,"addCost":null,"ccc":1.58,"grandTotal":54.31,"warnings":[],"visibleMoneyLines":["$24.64"],"visibleNumberFlows":[49.28,49.28,3.45,1.58,49.28,3.45,1.58,54.31]},"deltasNewMinusLegacy":{"subTotal":null,"tax":null,"ccc":null,"grandTotal":null},"viewport":{"width":1600,"height":1000},"notes":["Legacy page crashed with a client-side exception at the desktop viewport, so totals could not be extracted.","New sales book rendered totals successfully."]}
{"kind":"quote","number":"03057PC","status":"fail","legacyUrl":"http://localhost:3000/sales-form/edit-quote/03057PC","newUrl":"http://localhost:3000/sales-book/edit-quote/03057PC","legacy":{"subTotal":4198.29,"tax":0,"addCost":0,"ccc":125.95,"grandTotal":4324.24,"warnings":["Unsaved changes","Unsaved local edits were found from 5/26/2026, 10:45:24 AM."],"visibleMoneyLines":["$1,688.45","$158.90","$1,480.00","$163.19","$208.45","$2,422.84","$167.91","$2,196.74","$0.00","$0.00","$0.00","$66.00","$4,198.29","$0.00","+$0.00","$125.95","$4,324.24"]},"new":{"subTotal":4199.07,"tax":293.93,"addCost":null,"ccc":134.79,"grandTotal":4627.79,"warnings":["data not saved"],"visibleMoneyLines":["$185.00","$208.45","$168.98"],"visibleNumberFlows":[1480,208.45,2196.74,87.78,87.78,4199.07,293.93,134.79,4199.07,293.93,134.79,4627.79]},"deltasNewMinusLegacy":{"subTotal":0.78,"tax":293.93,"ccc":8.84,"grandTotal":303.55},"viewport":{"width":1600,"height":1000},"notes":["Legacy quote uses Tax Exempt and renders $0.00 tax.","New quote uses County & State Tax (7%) and renders $293.93 tax.","The largest contributor to the $303.55 total delta is the tax group mismatch."]}
```
