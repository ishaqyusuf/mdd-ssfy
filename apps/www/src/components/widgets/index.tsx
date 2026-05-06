"use client";

import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@gnd/ui/carousel";
import { WidgetsNavigation } from "./navigation";
import { RecentSalesWidget } from "./recent-sales-widget";
import { SalesRepLeaderboardWidget } from "./sales-rep-leaderboard-widget";
import { TopProductsWidget } from "./top-products-widget";
// import { AccountBalance } from "./account-balance";
// import { Assistant } from "./assistant";
// import { Inbox } from "./inbox";
// import { Invoice } from "./invoice";
// import { WidgetsNavigation } from "./navigation";
// import { Spending } from "./spending";
// import { Tracker } from "./tracker";
// import { Transactions } from "./transactions/transactions";
// import { Vault } from "./vault";

export function Widgets() {
	const items = [
		<RecentSalesWidget key="recent-sales" />,
		<TopProductsWidget key="top-products" />,
		<SalesRepLeaderboardWidget key="sales-rep-leaderboard" />,
		// <Assistant key="assistant" />,
		// <Spending disabled={disabled} key="spending" />,
		// <Invoice key="invoice" />,
		// <Transactions disabled={disabled} key="transactions" />,
		// <Tracker key="tracker" />,
		// <Inbox key="inbox" disabled={disabled} />,
		// <AccountBalance key="account-balance" />,
		// <Vault key="vault" />,
	];

	return (
		<Carousel
			className="flex min-w-0 flex-col"
			opts={{
				align: "start",
				watchDrag: false,
			}}
		>
			<WidgetsNavigation />
			<div className="ml-auto hidden md:flex">
				<CarouselPrevious className="static p-0 border-none hover:bg-transparent" />
				<CarouselNext className="static p-0 border-none hover:bg-transparent" />
			</div>

			<CarouselContent className="ml-0 flex-col space-y-4 md:-ml-[20px] md:flex-row md:space-y-0 2xl:-ml-[40px]">
				{items.map((item, idx) => {
					return (
						<CarouselItem
							className="min-w-0 pl-0 md:pl-[20px] lg:basis-1/2 xl:basis-1/3 2xl:pl-[40px] 3xl:basis-1/4"
							key={idx.toString()}
						>
							{item}
						</CarouselItem>
					);
				})}
			</CarouselContent>
		</Carousel>
	);
}
