"use client";

import { Button } from "@gnd/ui/button";
import {
	ArrowUpRight,
	Check,
	FileText,
	Package,
	Star,
	TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { PreviewKind } from "./assistant-preview-data";
import styles from "./assistant.module.css";

const SalesChart = dynamic(() => import("./assistant-sales-chart"), {
	loading: () => <div className="h-[250px] animate-pulse rounded bg-muted" />,
});
export function AssistantResult({
	kind,
	onSave,
	onRequest,
	onDocument,
}: {
	kind: PreviewKind;
	onSave: () => void;
	onRequest: () => void;
	onDocument: () => void;
}) {
	return (
		<div className={styles.answer}>
			<div className={styles.answerHeading}>
				<span className={styles.mark}>g</span>
				<strong>GND Assistant</strong>
				<span className={styles.muted}>Preview response</span>
			</div>
			{kind === "sales" ? (
				<>
					<p>
						Here’s a snapshot of your weekly sales. The latest week is the
						strongest in this sample period.
					</p>
					<section
						className={styles.resultCard}
						aria-label="Sample sales report"
					>
						<div className={styles.cardHeading}>
							<div>
								<span className={styles.eyebrow}>SALES OVERVIEW</span>
								<h2>A little perspective on your progress.</h2>
							</div>
							<TrendingUp size={20} />
						</div>
						<div className={styles.metrics}>
							<div>
								<small>Total sales</small>
								<strong>$159,600</strong>
							</div>
							<div>
								<small>Latest week</small>
								<strong>$36,200</strong>
							</div>
							<div>
								<small>Week over week</small>
								<strong className={styles.positive}>
									+32.1% <ArrowUpRight size={17} />
								</strong>
							</div>
						</div>
						<SalesChart />
						<div className={styles.source}>
							Sample data · Aug 3 – Sep 7, 2026 · USD
						</div>
					</section>
				</>
			) : null}
			{kind === "order" ? (
				<>
					<p>
						This sample order is in production. One material delivery needs
						attention before the remaining items can move forward.
					</p>
					<section className={styles.resultCard}>
						<div className={styles.cardHeading}>
							<div>
								<span className={styles.eyebrow}>ORDER DEMO-1042</span>
								<h2>Oakridge residence</h2>
							</div>
							<span className={styles.status}>In production</span>
						</div>
						<div className={styles.metrics}>
							<div>
								<small>Ordered</small>
								<strong>
									24 <small>doors</small>
								</strong>
							</div>
							<div>
								<small>Completed</small>
								<strong>
									18 <small>doors</small>
								</strong>
							</div>
							<div>
								<small>Remaining</small>
								<strong>
									6 <small>doors</small>
								</strong>
							</div>
						</div>
						<div className={styles.notice}>
							<Package size={18} />
							<div>
								<strong>Waiting on jamb material</strong>
								<p>6 doors need material before production can continue.</p>
							</div>
						</div>
						<div className={styles.timeline}>
							<span>
								<Check size={14} /> Confirmed
							</span>
							<span>
								<Check size={14} /> Materials reviewed
							</span>
							<span>◉ Production</span>
							<span>○ Fulfillment</span>
						</div>
						<div className={styles.source}>
							Illustrative order · No live records accessed
						</div>
					</section>
				</>
			) : null}
			{kind === "pdf" ? (
				<>
					<p>
						This invoice PDF is not ready yet. Review the exact request before
						starting generation.
					</p>
					<section className={styles.resultCard}>
						<div className={styles.document}>
							<FileText size={34} strokeWidth={1.3} />
							<div>
								<h2>Invoice · DEMO-1042</h2>
								<p>Oakridge residence · Current Sales revision</p>
							</div>
							<span className={styles.status}>Not generated</span>
						</div>
						<Button variant="outline" onClick={onDocument}>
							Review PDF generation <ArrowUpRight size={15} className="ml-2" />
						</Button>
						<div className={styles.source}>
							UI demonstration · No PDF generated or sent
						</div>
					</section>
				</>
			) : null}
			{kind === "request" ? (
				<>
					<p>Let’s make GND work better for you.</p>
					<section className={styles.resultCard}>
						<span className={styles.eyebrow}>BUILD WITH US</span>
						<h2>This feature isn’t available yet.</h2>
						<p>
							Would you like to notify the developers? Tell us what you need,
							and choose whether to hear when it’s ready.
						</p>
						<Button onClick={onRequest}>
							Review feature request <ArrowUpRight size={15} className="ml-2" />
						</Button>
						<div className={styles.source}>
							Preview only · Requests are not sent in this UI demo
						</div>
					</section>
				</>
			) : null}
			{kind !== "request" ? (
				<button type="button" className={styles.saveAction} onClick={onSave}>
					<Star size={14} /> Save as reusable action
				</button>
			) : null}
		</div>
	);
}
