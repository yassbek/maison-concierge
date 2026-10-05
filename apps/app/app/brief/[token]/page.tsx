import type { Metadata } from "next";
import { Suspense } from "react";
import { GuestBrief } from "@/components/concierge/guest-brief";
export const metadata: Metadata = {
	title: { absolute: "Your private itinerary | Maison" },
	robots: { index: false, follow: false },
	referrer: "no-referrer",
};
async function Content({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	return <GuestBrief token={token} />;
}
export default function Page({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	return (
		<Suspense
			fallback={
				<div className="maison-app m-loading">Preparing your itinerary…</div>
			}
		>
			<Content params={params} />
		</Suspense>
	);
}
