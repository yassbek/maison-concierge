import { Suspense } from "react";
import { ConciergeApp } from "@/components/concierge/app";

type Props = { params: Promise<{ section?: string[] }> };
async function Workspace({ params }: Props) {
	const { section = [] } = await params;
	return <ConciergeApp section={section} />;
}
export default function ConciergePage({ params }: Props) {
	return (
		<Suspense
			fallback={
				<div className="maison-app m-loading">Opening your workspace…</div>
			}
		>
			<Workspace params={params} />
		</Suspense>
	);
}
