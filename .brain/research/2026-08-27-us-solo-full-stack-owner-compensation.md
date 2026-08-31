# U.S. compensation for a solo full-stack product owner

**Research date:** 2026-08-27
**Question:** What is fair U.S. compensation for one developer who builds features and independently maintains and operates GND?

## Short answer

- **W-2 base salary:** **$185,000-$225,000/year**, or **$88.94-$108.17/hour** when annualized over 2,080 hours. A practical target is **about $200,000-$210,000 base**.
- **W-2 total employer cost:** roughly **$267,000-$325,000/year** after normal professional-role benefits and payroll costs. Bonus/equity can sit above this.
- **Genuine 1099/consulting rate:** **$175-$250/hour**, with **$200-$225/hour** a sensible target for ongoing sole-owner responsibility. At 1,500 billable hours, that target produces **$300,000-$337,500 in gross business revenue**, not take-home pay.
- **Full-year, guaranteed retainer floor:** about **$165-$200/hour** if the client guarantees roughly 1,600 paid hours and gives predictable scope. A nominal **$130-$160/hour** only matches loaded employee cost across all 2,080 hours; it underprices a normal contractor who cannot bill PTO, administration, sales, training, and gaps.

These are national U.S. figures. High-cost markets and mandatory after-hours incident ownership support the upper end; strong benefits, backup engineering coverage, and a lower-cost U.S. locality support the lower end.

## Why GND is a senior/staff ownership role

This is not a typical single-site maintenance assignment. On the research date, the repository contained:

- six application workspaces: dashboard, API, dealership, mobile, storefront, and web;
- 24 shared product/platform packages, including database, sales, inventory, jobs, auth, notifications, observability, documents, payments/Square, email, PDF, and UI;
- approximately 4,989 tracked TypeScript, JavaScript, JSX, TSX, and Prisma files;
- revenue- and operations-critical workflows spanning sales, payments, inventory, production, dispatch, customers, employees, documents, deployment, and production observability.

The Brain architecture also assigns the developer cross-surface responsibility for web, API, Expo mobile, database/schema, background jobs, migrations, deployment, monitoring, and correctness-sensitive business rules. That scope maps better to a **senior/staff product engineer, technical owner, and production operator** than to a generic “full-stack developer.” Concentrating that knowledge and incident responsibility in one person also creates key-person risk.

## Primary market evidence

### Official wage benchmarks

The latest national [BLS OEWS release for May 2025](https://www.bls.gov/news.release/ocwage.t01.htm) reports software developers at a **$71.20 mean hourly wage / $148,100 mean annual wage** and **$65.38 median hourly wage / about $135,990 annualized**. OEWS excludes self-employed workers and does not include bonuses or employer benefit costs.

The U.S. General Services Administration's official [BLS pricing tool for Software Developers](https://buy.gsa.gov/pricing/qr/bls?area_name=National&naics_title_combined=000000+-+All+Industries&normalized_area_name=National&ordering=occupation_level&page=1&q=Software+Developers&query_by=occupation_name&socId=151252&sort=asc), updated 2026-07-23, maps national wage percentiles to labor levels:

| GSA level | Percentile | Hourly wage | Annual at 2,080 hours |
|---|---:|---:|---:|
| Journeyman | 50th | $65.38 | $135,990 |
| Senior | 75th | $82.68 | $171,974 |
| SME | 90th | $103.21 | $214,677 |

GND's cross-stack architecture, operations, business-domain, and sole-maintainer scope belongs between the official **Senior and SME** anchors. The recommended W-2 band adds a modest sole-owner/key-person premium around those anchors rather than treating repository size alone as a salary multiplier.

### Current first-party employer postings

Live U.S. postings with comparable end-to-end ownership corroborate the official upper-percentile data:

- [Ethena Senior Software Engineer](https://jobs.lever.co/ethena/f85bcfd1-8d2c-4cf5-a6ab-1c8ddab14c65): **$180,000-$200,000 base**. The role uses TypeScript, MySQL, React, Next.js, and AWS; owns features from idea through production; and expects CI/CD, migrations, logging, monitoring, and infrastructure awareness.
- [Osmind Senior Software Engineer](https://jobs.lever.co/Osmind/fd48580b-a887-4f0e-9335-374c2dbe6d70): **$150,150-$200,000 base plus equity and benefits** for full-stack TypeScript/Node/React/Postgres/AWS work, architecture, reliability, technical debt, and end-to-end ownership.
- [Arketa Staff Software Engineer, AI & Platform](https://jobs.ashbyhq.com/arketa/8c7c07cd-eb4d-4691-93f2-7b7282d9b5e2): **$180,000-$220,000 base plus equity**, remote U.S. This is an especially close product analogy: a small senior team building an operating platform for small businesses whose livelihoods depend on the software, with product, CI, observability, architecture modernization, and high autonomy in scope.

The GND recommendation therefore does not depend on a speculative “solo developer” title; it falls inside observable senior/staff base-pay bands and near the official 75th-90th percentile software-developer wages.

## W-2 versus 1099 math

### W-2

Using 2,080 hours exactly:

- $185,000 / 2,080 = **$88.94/hour**
- $200,000 / 2,080 = **$96.15/hour**
- $210,000 / 2,080 = **$100.96/hour**
- $225,000 / 2,080 = **$108.17/hour**

The March 2026 [BLS Employer Costs for Employee Compensation](https://www.bls.gov/news.release/ecec.htm) reports that benefits are **30.8% of total compensation** for private-industry professional and related occupations; wages are 69.2%. Dividing salary by 0.692 gives an indicative employer-cost range of **$267,000-$325,000** for the recommended base band. This is a planning estimate, not a promise that every employer's benefits equal the BLS average.

### 1099/consulting

A contractor has to recover the equivalent of health/retirement/PTO/payroll costs from fewer billable hours. A realistic planning assumption for a solo consultant is **1,400-1,600 billable hours/year** (67%-77% of 2,080), leaving 480-680 hours for vacation, holidays, illness, administration, accounting, equipment, training, proposals, and gaps. This utilization assumption is judgment, not a BLS statistic.

Replacing the approximate **$267,000-$325,000** W-2 employer cost over 1,400-1,600 billable hours implies roughly **$167-$232/hour before consulting profit/risk**. GSA's pricing guidance uses a typical **5%-15% fee/profit** range; rounding the resulting spread gives the recommended **$175-$250/hour** consulting band.

The IRS confirms that an independent contractor is self-employed and generally pays self-employment tax. [IRS Topic 554](https://www.irs.gov/taxtopics/tc554) states the rate consists of 12.4% Social Security plus 2.9% Medicare and generally applies to 92.35% of net self-employment earnings, subject to the Social Security wage base and possible Additional Medicare Tax. That tax treatment, insurance, retirement, unpaid leave, equipment, professional services, and collection risk all come out of contractor revenue.

If the company controls one person's schedule and methods indefinitely, the parties should also review the [IRS employee-versus-independent-contractor factors](https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee); calling an employee-like arrangement “1099” does not determine its legal classification.

## Negotiation bands

| Arrangement | Defensible band | Practical target |
|---|---:|---:|
| W-2, strong benefits and backup coverage | $180k-$210k base | ~$195k-$205k |
| W-2, true sole owner plus production/on-call responsibility | **$195k-$230k base** | **~$205k-$220k** |
| 1099, guaranteed long-term retainer (~1,600 paid hours) | $165-$200/hour | ~$185-$200/hour |
| 1099, normal variable utilization and sole-owner risk | **$175-$250/hour** | **~$200-$225/hour** |

If one number is required, use **$205,000/year W-2 base** (about **$98.56/hour**) or **$210/hour 1099**. The contractor figure assumes the contractor supplies normal business overhead and receives no employee benefits or paid time off.

## Caveats

- Salary should reflect business impact, autonomy, reliability expectations, experience, and market geography—not raw line count.
- Equity is valuable only if its terms and likely value are credible; do not substitute opaque equity for a large base-pay gap.
- A permanently indispensable solo developer is an operational risk. Fair pay helps retention, but documented runbooks, tested recovery, credential continuity, and backup engineering coverage are still necessary.
- These figures are compensation benchmarks, not individualized tax or legal advice.
