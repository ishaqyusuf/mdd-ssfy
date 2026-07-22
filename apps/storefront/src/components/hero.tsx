import { images } from "@/lib/images";
import Image from "next/image";
import Link from "next/link";

type HeroProps = {
	title?: string;
	description?: string;
	imageUrl?: string;
	actionLabel?: string;
	actionUrl?: string;
};

const DEFAULT_TITLE = "Doors made to live beautifully.";
const DEFAULT_DESCRIPTION =
	"Configure doors and millwork made for your space, with clear options and support from selection through delivery.";

export function Hero({
	title = DEFAULT_TITLE,
	description = DEFAULT_DESCRIPTION,
	imageUrl = images.hero.main,
	actionLabel = "Shop the collection",
	actionUrl = "/search",
}: HeroProps = {}) {
	const primaryHref = actionUrl.startsWith("/") ? actionUrl : "/search";

	return (
		<section className="relative isolate overflow-hidden bg-stone-950 text-white">
			<div className="relative min-h-[620px] sm:min-h-[680px] lg:min-h-[740px]">
				<Image
					src={imageUrl || images.hero.main}
					alt=""
					fill
					priority
					sizes="100vw"
					className="object-cover object-center"
				/>

				<div className="absolute inset-0 bg-black/20" />
				<div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/70" />

				<div className="container relative z-10 mx-auto flex min-h-[620px] items-center justify-center px-4 py-20 text-center sm:min-h-[680px] lg:min-h-[740px]">
					<div className="flex max-w-4xl flex-col items-center">
						<p className="mb-5 text-[11px] font-medium uppercase tracking-[0.34em] text-white/80 sm:text-xs">
							Made to order · Built to belong
						</p>

						<h1 className="max-w-4xl text-balance font-serif text-5xl font-normal leading-[0.98] tracking-[-0.035em] [text-shadow:0_2px_28px_rgb(0_0_0/0.42)] sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
							{title}
						</h1>

						<p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-white/85 [text-shadow:0_1px_16px_rgb(0_0_0/0.5)] sm:text-lg">
							{description}
						</p>

						<div className="mt-9 flex flex-col items-center gap-5 sm:flex-row">
							<Link
								href={primaryHref}
								className="inline-flex h-12 items-center justify-center bg-black px-8 text-xs font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
							>
								{actionLabel}
							</Link>
							<Link
								href="/custom"
								className="group inline-flex h-12 items-center text-xs font-semibold uppercase tracking-[0.18em] text-white underline decoration-white/50 underline-offset-8 transition-colors hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
							>
								Plan a custom project
								<span
									aria-hidden="true"
									className="ml-2 transition-transform group-hover:translate-x-1"
								>
									→
								</span>
							</Link>
						</div>
					</div>
				</div>

				<div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/20 bg-black/25 px-4 py-4 backdrop-blur-sm">
					<p className="text-center text-[10px] font-medium uppercase tracking-[0.24em] text-white/75 sm:text-xs">
						Doors · Mouldings · Shelf items · Custom millwork
					</p>
				</div>
			</div>
		</section>
	);
}
