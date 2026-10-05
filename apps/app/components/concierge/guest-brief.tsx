"use client";
import { MaisonButton, MaisonIcon } from "@crm/ui/components/concierge";
import { conciergePublicBrief } from "@crm/validation/concierge";
import { useEffect, useState } from "react";
import { z } from "zod";
import { BriefBody } from "./brief-body";

const envelope = z.object({
	result: z.object({ data: conciergePublicBrief }).optional(),
});
export function GuestBrief({ token }: { token: string }) {
	const [brief, setBrief] = useState<z.infer<
		typeof conciergePublicBrief
	> | null>(null);
	const [error, setError] = useState("");
	useEffect(() => {
		const controller = new AbortController();
		async function read() {
			try {
				const response = await fetch(
					`/api/trpc/conciergePublic.brief?input=${encodeURIComponent(JSON.stringify({ token }))}`,
					{
						cache: "no-store",
						referrerPolicy: "no-referrer",
						signal: controller.signal,
					},
				);
				if (!response.ok)
					throw new Error(
						"This private link is unavailable or expired. Please contact your concierge for a new itinerary.",
					);
				const parsed = envelope.parse(await response.json());
				if (!parsed.result)
					throw new Error(
						"Your itinerary cannot be loaded. Please contact your concierge.",
					);
				setBrief(parsed.result.data);
			} catch (cause) {
				if (!controller.signal.aborted)
					setError(
						cause instanceof Error
							? cause.message
							: "The itinerary cannot be loaded.",
					);
			}
		}
		void read();
		return () => controller.abort();
	}, [token]);
	return (
		<main className="maison-app m-guest-brief">
			<div className="m-guest-header m-no-print">
				<div className="m-wordmark">
					maison<span>PRIVATE CONCIERGE</span>
				</div>
				{brief && (
					<MaisonButton tone="secondary" onClick={() => window.print()}>
						<MaisonIcon name="download" size={15} />
						Save as PDF
					</MaisonButton>
				)}
			</div>
			<article className="m-brief-paper">
				<div className="m-brief-brand">
					maison<span>YOUR PRIVATE ITINERARY</span>
				</div>
				{error ? (
					<>
						<h1 className="m-guest-error-title">A detail to resolve.</h1>
						<p className="m-helper" role="alert">
							{error}
						</p>
					</>
				) : brief ? (
					<>
						<BriefBody content={brief.content} />
						<div className="m-brief-footer">
							<span>Every detail. Considered.</span>
							<span>
								Private preview · available until{" "}
								{new Date(brief.expiresAt).toLocaleDateString("en-GB")}
							</span>
						</div>
					</>
				) : (
					<p className="m-helper">Preparing your itinerary…</p>
				)}
			</article>
			<p className="m-guest-note m-no-print">
				A private itinerary prepared by your concierge. This pilot contains
				fictional demonstration data.
			</p>
		</main>
	);
}
