"use client";
import {
	MaisonAvatar,
	MaisonField,
	MaisonIcon,
	MaisonInput,
} from "@crm/ui/components/concierge";
import Image from "next/image";
import { useRef, useState } from "react";
import { z } from "zod";
import { CONCIERGE_UI } from "@/lib/concierge-config";
export function ConciergeSignIn({
	previewMode,
}: {
	previewMode: "local" | "hosted" | "disabled";
}) {
	const hosted = previewMode === "hosted";
	const demonstration = previewMode !== "disabled";
	const [accessKey, setAccessKey] = useState("");
	const lock = useRef(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const enter = async (persona: string) => {
		if (lock.current) return;
		lock.current = true;
		setBusy(true);
		setError("");
		try {
			const response = await fetch("/api/concierge-demo-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ persona, ...(hosted ? { accessKey } : {}) }),
			});
			if (!response.ok) {
				const result = z
					.object({ error: z.string() })
					.safeParse(await response.json().catch(() => null));
				throw new Error(
					result.success
						? result.data.error
						: "Unable to enter the preview. Please try again.",
				);
			}
			window.location.assign("/concierge");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Please try again.");
			lock.current = false;
			setBusy(false);
		}
	};
	return (
		<div className="maison-app m-signin">
			<div className="m-signin-photo">
				<Image
					width={1200}
					height={800}
					src="/concierge/marrakech-original.png"
					alt="A serene courtyard, ready for an exceptional stay"
				/>
				<div>
					<h2>
						Every detail.
						<br />
						Considered.
					</h2>
					<p>
						A private workspace for the people who make extraordinary
						experiences feel effortless.
					</p>
				</div>
			</div>
			<main className="m-signin-content">
				<div className="m-wordmark">
					maison<span>PRIVATE CONCIERGE</span>
				</div>
				<div className="m-eyebrow">Your private workspace</div>
				<h1 style={{ marginTop: 12 }}>A warm welcome.</h1>
				<p>
					{hosted
						? "Enter your private preview access key, then choose a demonstration profile. Each role has its own view of the journeys."
						: demonstration
							? "Explore the concierge pilot with a demonstration profile. Each role has its own view of the same journeys."
							: "Sign in with your authorized workspace account to continue."}
				</p>
				{demonstration ? (
					<form
						method="post"
						action="/api/concierge-demo-session"
						className="m-form"
						aria-busy={busy}
						onSubmit={(event) => {
							event.preventDefault();
							const submitter = (event.nativeEvent as SubmitEvent).submitter;
							void enter(
								submitter instanceof HTMLButtonElement
									? submitter.value
									: "owner",
							);
						}}
					>
						{hosted && (
							<MaisonField
								label="Private preview access key"
								hint="Use the access key supplied with your invitation."
							>
								<MaisonInput
									name="accessKey"
									type="password"
									autoComplete="current-password"
									required
									minLength={CONCIERGE_UI.previewSecretMinLength}
									maxLength={CONCIERGE_UI.previewSecretMaxLength}
									value={accessKey}
									onChange={(event) => setAccessKey(event.target.value)}
									disabled={busy}
									aria-invalid={error ? true : undefined}
									aria-describedby={error ? "preview-sign-in-error" : undefined}
								/>
							</MaisonField>
						)}
						<div className="m-signin-users">
							{[
								{
									role: "owner",
									name: "Workspace owner",
									detail: "Complete operations, costs and margins",
								},
								{
									role: "admin",
									name: "Operations manager",
									detail: "Coordinate the team and manage pricing",
								},
								{
									role: "member",
									name: "Concierge",
									detail: "Client service, with private costs protected",
								},
							].map((p) => (
								<button
									type="submit"
									name="persona"
									value={p.role}
									key={p.role}
									disabled={busy}
								>
									<MaisonAvatar name={p.name} />
									<div>
										<strong>{p.name}</strong>
										<small>{p.detail}</small>
									</div>
									<MaisonIcon name={busy ? "loading" : "arrow"} size={18} />
								</button>
							))}
						</div>
					</form>
				) : (
					<a className="m-button m-button-primary" href="/sign-in">
						Sign in
					</a>
				)}
				{error && (
					<p id="preview-sign-in-error" className="m-form-error" role="alert">
						{error}
					</p>
				)}
				{demonstration && (
					<small>
						{hosted ? "HOSTED PRIVATE PREVIEW" : "LOCAL DEMONSTRATION"} ·
						FICTIONAL CLIENTS & PARTNERS
						<br />
						No messages are sent. No reservations are made.
					</small>
				)}
			</main>
		</div>
	);
}
