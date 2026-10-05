"use client";

import {
	MaisonAvatar as Avatar,
	MaisonBadge as Badge,
	MaisonButton as Button,
	MaisonEmpty as Empty,
	MaisonIcon as Icon,
	MaisonInput as Input,
	type MaisonIconName,
	MaisonDialog as Modal,
	MaisonSelect as Select,
	MaisonTextarea as Textarea,
} from "@crm/ui/components/concierge";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { CONCIERGE_UI } from "@/lib/concierge-config";
import type { OpenModal } from "./app";
import { BriefBody } from "./brief-body";
import type { Case, Execute, Service, Snapshot } from "./types";
import { date, imageFor, money, statusLabels, time, tone } from "./types";

export type ViewProps = {
	data: Snapshot;
	execute: Execute;
	open: OpenModal;
	go: (path: string) => void;
};
function run(promise: Promise<unknown>) {
	void promise.catch((error) =>
		toast.error(
			error instanceof Error
				? error.message
				: "The action could not be completed.",
		),
	);
}
function Heading({
	eyebrow,
	title,
	description,
	children,
}: {
	eyebrow: string;
	title: string;
	description: string;
	children?: ReactNode;
}) {
	return (
		<div className="m-heading">
			<div>
				<div className="m-eyebrow">{eyebrow}</div>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>
			<div className="m-actions">{children}</div>
		</div>
	);
}
function SectionTitle({
	title,
	count,
	action,
	onClick,
}: {
	title: string;
	count?: number;
	action?: string;
	onClick?: () => void;
}) {
	return (
		<div className="m-section-title">
			<h2>
				{title}
				{count != null && <span>{String(count).padStart(2, "0")}</span>}
			</h2>
			{action && (
				<button type="button" onClick={onClick}>
					{action}
					<Icon name="arrow" size={15} />
				</button>
			)}
		</div>
	);
}
function Status({ status }: { status: string }) {
	return <Badge tone={tone(status)}>{statusLabels[status] || status}</Badge>;
}
function Metric({
	label,
	value,
	detail,
	icon,
	action,
}: {
	label: string;
	value: string | number;
	detail: string;
	icon: MaisonIconName;
	action?: () => void;
}) {
	return (
		<button
			type="button"
			className="m-metric"
			onClick={action}
			disabled={!action}
		>
			<div>
				<span>{label}</span>
				<Icon name={icon} size={18} />
			</div>
			<strong>
				{typeof value === "number" ? String(value).padStart(2, "0") : value}
			</strong>
			<small>{detail}</small>
		</button>
	);
}
function JourneyTable({
	cases,
	go,
}: {
	cases: Case[];
	go: (path: string) => void;
}) {
	return (
		<div className="m-table-scroll">
			<table className="m-table">
				<thead>
					<tr>
						<th>Journey / Client</th>
						<th>Destination</th>
						<th>Dates</th>
						<th>Status</th>
						<th>Concierge</th>
						<th aria-label="Open journey" />
					</tr>
				</thead>
				<tbody>
					{cases.map((c) => (
						<tr key={c.id}>
							<td>
								<button
									type="button"
									className="m-table-link"
									onClick={() => go(`journeys/${c.id}`)}
								>
									{c.title}
								</button>
								<small>
									{c.clientName} <span>· {c.reference}</span>
								</small>
							</td>
							<td>
								<span className="m-inline">
									<Icon name="pin" size={14} />
									{c.destination}
								</span>
							</td>
							<td className="m-nowrap">
								{date(c.startsAt)} to {date(c.endsAt)}
							</td>
							<td>
								<Status status={c.status} />
							</td>
							<td>
								<span className="m-inline">
									<Avatar name={c.assigneeName || "Unassigned"} size="small" />
									{c.assigneeName?.split(" ")[0] || "Unassigned"}
								</span>
							</td>
							<td>
								<button
									type="button"
									className="m-icon-button"
									aria-label={`Open ${c.title}`}
									onClick={() => go(`journeys/${c.id}`)}
								>
									<Icon name="northeast" size={18} />
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{cases.length === 0 && (
				<Empty
					title="A clear horizon."
					description="No journeys match these filters."
				/>
			)}
		</div>
	);
}
export function Overview({
	data,
	open,
	go,
	firstName,
}: ViewProps & { firstName: string }) {
	const active = data.cases.filter(
		(c) => !["completed", "cancelled"].includes(c.status),
	);
	const featured =
		data.cases.find((c) => c.id === "case-marrakech") || active[0];
	const pending = data.services
		.filter((s) =>
			["awaiting_confirmation", "offered", "sourcing"].includes(s.status),
		)
		.slice(0, 3);
	const todays = data.services.filter(
		(s) =>
			date(s.startsAt, {
				year: "numeric",
				month: "numeric",
				day: "numeric",
			}) ===
			date(data.asOf, { year: "numeric", month: "numeric", day: "numeric" }),
	);
	return (
		<>
			<Heading
				eyebrow={date(data.asOf, {
					weekday: "long",
					day: "numeric",
					month: "long",
				})}
				title={`Good ${new Date(data.asOf).getHours() < 12 ? "morning" : new Date(data.asOf).getHours() < 18 ? "afternoon" : "evening"}, ${firstName}.`}
				description="Exceptional experiences. Every detail in view."
			>
				<Button tone="secondary" onClick={() => open({ kind: "capture" })}>
					<Icon name="mic" size={16} />
					Capture a request
				</Button>
				<Button onClick={() => open({ kind: "case" })}>
					<Icon name="plus" size={16} />
					New journey
				</Button>
			</Heading>
			<div className="m-metrics">
				<Metric
					label="Active journeys"
					value={data.stats.activeCases}
					detail="Thoughtfully orchestrated"
					icon="experience"
					action={() => go("journeys")}
				/>
				<Metric
					label="Awaiting confirmation"
					value={data.stats.pendingConfirmations}
					detail="Services to follow up"
					icon="clock"
					action={() => go("tasks")}
				/>
				<Metric
					label="Requests to review"
					value={data.stats.pendingIntake}
					detail="Ready for your attention"
					icon="inbound"
					action={() => go("inbox")}
				/>
				<Metric
					label="Open tasks"
					value={data.stats.openTasks}
					detail={`${todays.length} services scheduled today`}
					icon="tasks"
					action={() => go("tasks")}
				/>
			</div>
			<div className="m-overview-grid">
				<div className="m-featured">
					{featured && (
						<>
							<Image
								width={1200}
								height={800}
								src={imageFor(featured.destination)}
								alt="A quiet courtyard in Marrakech"
							/>
							<div className="m-featured-shade" />
							<div className="m-featured-top">
								<span className="m-image-label">
									<span />
									In focus
								</span>
								<span>{featured.reference}</span>
							</div>
							<div className="m-featured-content">
								<div className="m-eyebrow">{featured.destination}</div>
								<h2>{featured.title}</h2>
								<div className="m-featured-footer">
									<p>
										{featured.clientName}
										<span>·</span>
										{date(featured.startsAt)} to {date(featured.endsAt)}
									</p>
									<button
										type="button"
										aria-label={`View ${featured.title}`}
										onClick={() => go(`journeys/${featured.id}`)}
									>
										<Icon name="arrow" size={22} />
									</button>
								</div>
							</div>
						</>
					)}
				</div>
				<section className="m-attention">
					<SectionTitle
						title="On your radar"
						count={data.stats.pendingConfirmations}
					/>
					<p className="m-section-caption">
						A few details that need your touch.
					</p>
					<div className="m-attention-list">
						{pending.map((s, i) => (
							<button
								type="button"
								className="m-attention-item"
								key={s.id}
								onClick={() => go(`journeys/${s.caseId}`)}
							>
								<span className={`m-attention-icon ${i === 0 ? "amber" : ""}`}>
									<Icon name={s.category} size={20} />
								</span>
								<div>
									<strong>{s.title}</strong>
									<p>{data.cases.find((c) => c.id === s.caseId)?.clientName}</p>
									<small>
										{s.status === "offered"
											? "Offer ready to review"
											: "Supplier confirmation needed"}
									</small>
								</div>
								<Icon name="right" size={16} />
							</button>
						))}
					</div>
					<button
						type="button"
						className="m-attention-footer"
						onClick={() => go("inbox")}
					>
						<span>
							<Icon name="sparkle" size={15} />
							{data.stats.pendingIntake} requests await your review
						</span>
						<Icon name="arrow" size={16} />
					</button>
				</section>
			</div>
			<section className="m-section">
				<SectionTitle
					title="Journeys in motion"
					count={active.length}
					action="View all journeys"
					onClick={() => go("journeys")}
				/>
				<JourneyTable cases={active.slice(0, 4)} go={go} />
			</section>
			<div className="m-bottom-grid">
				<section>
					<SectionTitle
						title="The next steps"
						action="All tasks"
						onClick={() => go("tasks")}
					/>
					<div className="m-small-tasks">
						{data.tasks
							.filter((t) => !t.completedAt)
							.slice(0, 3)
							.map((t) => (
								<button
									type="button"
									key={t.id}
									onClick={() => go(`journeys/${t.caseId}`)}
								>
									<span
										className={`m-task-indicator ${t.overdue ? "overdue" : ""}`}
									/>
									<div>
										<strong>{t.title}</strong>
										<small>
											{t.assigneeName || "Unassigned"} · {date(t.dueAt)}
										</small>
									</div>
									<Icon name="northeast" size={16} />
								</button>
							))}
					</div>
				</section>
				<section>
					<SectionTitle title="Recently in the workspace" />
					<div className="m-mini-activity">
						{data.activity.slice(0, 3).map((a) => (
							<div key={a.id}>
								<Avatar name={a.actorName} size="small" />
								<p>
									<strong>{a.actorName}</strong>
									<span>{a.body}</span>
								</p>
								<small>{date(a.createdAt)}</small>
							</div>
						))}
					</div>
				</section>
			</div>
		</>
	);
}
export function JourneyList({ data, go, open }: ViewProps) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState("all");
	const [layout, setLayout] = useState("list");
	const cases = data.cases.filter(
		(c) =>
			`${c.title} ${c.clientName} ${c.destination} ${c.reference}`
				.toLowerCase()
				.includes(query.toLowerCase()) &&
			(filter === "all" ||
				(filter === "active" &&
					!["completed", "cancelled"].includes(c.status)) ||
				c.status === filter),
	);
	return (
		<>
			<Heading
				eyebrow="Journeys"
				title="Every journey, beautifully considered."
				description="From the first conversation to the final detail."
			>
				<Button onClick={() => open({ kind: "case" })}>
					<Icon name="plus" size={16} />
					New journey
				</Button>
			</Heading>
			<div className="m-toolbar">
				<div className="m-filter-tabs">
					{[
						["all", "All journeys"],
						["active", "Active"],
						["planning", "In planning"],
						["confirmed", "Confirmed"],
						["completed", "Completed"],
					].map(([key, label]) => (
						<button
							type="button"
							key={key}
							className={filter === key ? "active" : ""}
							onClick={() => setFilter(key || "all")}
						>
							{label}
						</button>
					))}
				</div>
				<div className="m-toolbar-actions">
					<div className="m-search-field">
						<Icon name="search" size={16} />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search journeys"
							aria-label="Search journeys"
						/>
					</div>
					<button
						type="button"
						className="m-icon-button"
						aria-label={layout === "list" ? "Show cards" : "Show list"}
						onClick={() => setLayout(layout === "list" ? "cards" : "list")}
					>
						<Icon name={layout === "list" ? "overview" : "tasks"} />
					</button>
				</div>
			</div>
			{layout === "list" ? (
				<JourneyTable cases={cases} go={go} />
			) : (
				<div className="m-journey-cards">
					{cases.map((c) => (
						<button
							type="button"
							className="m-journey-card"
							key={c.id}
							onClick={() => go(`journeys/${c.id}`)}
						>
							<Image
								width={1200}
								height={800}
								src={imageFor(c.destination)}
								alt={c.destination}
							/>
							<div>
								<div className="m-card-topline">
									<span className="m-eyebrow">{c.destination}</span>
									<Status status={c.status} />
								</div>
								<h2>{c.title}</h2>
								<p>{c.clientName}</p>
								<div className="m-card-bottom">
									<span>
										{date(c.startsAt)} to {date(c.endsAt)}
									</span>
									<span>
										{c.confirmedCount}/{c.serviceCount} confirmed{" "}
										<Icon name="arrow" size={16} />
									</span>
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</>
	);
}
export function JourneyDetail({
	data,
	execute,
	open,
	go,
	caseId,
}: ViewProps & { caseId: string }) {
	const [tab, setTab] = useState("itinerary");
	const [note, setNote] = useState("");
	const [briefOpen, setBriefOpen] = useState(false);
	const [audience, setAudience] = useState<"client" | "supplier" | "internal">(
		"client",
	);
	const [supplierId, setSupplierId] = useState("");
	const [briefBusy, setBriefBusy] = useState(false);
	const c = data.cases.find((c) => c.id === caseId);
	if (!c)
		return (
			<Empty
				title="Journey not found."
				description="This journey is no longer available."
			>
				<Button onClick={() => go("journeys")}>View journeys</Button>
			</Empty>
		);
	const client = data.clients.find((x) => x.id === c.clientId);
	const services = data.services
		.filter((s) => s.caseId === c.id)
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
	const tasks = data.tasks.filter((t) => t.caseId === c.id);
	const activity = data.activity.filter((a) => a.caseId === c.id);
	const usedSuppliers = data.suppliers.filter((s) =>
		services.some((service) => service.supplierId === s.id),
	);
	const createBrief = async () => {
		setBriefBusy(true);
		try {
			await execute({
				type: "createBrief",
				caseId,
				audience,
				...(audience === "supplier" ? { supplierId } : {}),
			});
			setBriefOpen(false);
			go("documents");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Brief could not be created.",
			);
		} finally {
			setBriefBusy(false);
		}
	};
	return (
		<>
			<button
				type="button"
				className="m-back-link"
				onClick={() => go("journeys")}
			>
				<Icon name="left" size={15} />
				All journeys
			</button>
			<Heading
				eyebrow={`${c.reference} · ${c.destination}`}
				title={c.title}
				description={`${c.clientName} · ${date(c.startsAt, { day: "numeric", month: "long" })} to ${date(c.endsAt, { day: "numeric", month: "long", year: "numeric" })}`}
			>
				<Button
					tone="secondary"
					onClick={() => open({ kind: "capture", caseId })}
				>
					<Icon name="plus" size={16} />
					Capture update
				</Button>
				<Button onClick={() => setBriefOpen(true)}>
					<Icon name="document" size={16} />
					Prepare a brief
				</Button>
			</Heading>
			<div className="m-case-summary">
				<div>
					<small>Journey status</small>
					<Select
						aria-label="Journey status"
						value={c.status}
						onChange={(e) =>
							run(
								execute({
									type: "updateCase",
									caseId,
									status: e.target.value as Case["status"],
								}),
							)
						}
					>
						{[
							"new",
							"planning",
							"awaiting_client",
							"confirmed",
							"in_progress",
							"completed",
							"cancelled",
						].map((s) => (
							<option key={s} value={s}>
								{statusLabels[s]}
							</option>
						))}
					</Select>
				</div>
				<div>
					<small>Your concierge</small>
					<Select
						aria-label="Assigned concierge"
						value={c.assigneeId || ""}
						onChange={(e) =>
							run(
								execute({
									type: "updateCase",
									caseId,
									assigneeId: e.target.value || null,
								}),
							)
						}
					>
						<option value="">Unassigned</option>
						{data.team.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</Select>
				</div>
				<div>
					<small>Services confirmed</small>
					<strong>
						{c.confirmedCount}
						<span> / {c.serviceCount}</span>
					</strong>
					<div className="m-progress">
						<span
							style={{
								width: `${c.serviceCount ? (c.confirmedCount / c.serviceCount) * 100 : 0}%`,
							}}
						/>
					</div>
				</div>
				<div>
					<small>Client investment</small>
					<strong>{money(c.totals.sellCents)}</strong>
					<span className="m-muted">EUR · all services</span>
				</div>
			</div>
			<div className="m-detail-layout">
				<div>
					<div className="m-tabs" role="tablist" aria-label="Journey sections">
						{[
							["itinerary", "Itinerary"],
							["terms", "Terms & contingencies"],
							...(data.permissions.canViewFinancials
								? [["financials", "Financials"]]
								: []),
							["activity", "Notes & activity"],
						].map(([key, label]) => (
							<button
								type="button"
								role="tab"
								aria-selected={tab === key}
								className={tab === key ? "active" : ""}
								key={key}
								onClick={() => setTab(key || "itinerary")}
							>
								{label}
							</button>
						))}
					</div>
					{tab === "itinerary" && (
						<section className="m-itinerary">
							<SectionTitle
								title="A considered itinerary"
								count={services.length}
								action="Add service"
								onClick={() => open({ kind: "service", caseId })}
							/>
							{services.length === 0 && (
								<Empty
									title="The journey is yours to shape."
									description="Add the first flight, stay or experience."
								>
									<Button onClick={() => open({ kind: "service", caseId })}>
										Add a service
									</Button>
								</Empty>
							)}
							{services.map((s, index) => (
								<div className="m-itinerary-item" key={s.id}>
									<div className="m-itinerary-time">
										<strong>{time(s.startsAt, s.timezone)}</strong>
										<span>
											{date(s.startsAt, {
												day: "numeric",
												month: "short",
												timeZone: s.timezone,
											})}
										</span>
										<small>
											{s.timezone.split("/").pop()?.replaceAll("_", " ")}
										</small>
									</div>
									<div className="m-itinerary-rail">
										<span>
											<Icon name={s.category} size={18} />
										</span>
										{index !== services.length - 1 && <i />}
									</div>
									<div className="m-service-card">
										<div className="m-service-top">
											<span className="m-eyebrow">{s.category}</span>
											<Status status={s.status} />
										</div>
										<button
											type="button"
											className="m-service-title"
											onClick={() =>
												open({ kind: "service", caseId, service: s })
											}
										>
											{s.title}
											<Icon name="northeast" size={17} />
										</button>
										<p className="m-inline">
											<Icon name="pin" size={14} />
											{s.location}
										</p>
										{s.clientNotes && (
											<p className="m-service-note">{s.clientNotes}</p>
										)}
										<div className="m-service-footer">
											<span>
												<Icon name="globe" size={14} />
												{data.suppliers.find((p) => p.id === s.supplierId)
													?.name || "Partner to be assigned"}
											</span>
											<button
												type="button"
												onClick={() =>
													open({ kind: "service", caseId, service: s })
												}
											>
												{s.status === "awaiting_confirmation"
													? "Review confirmation"
													: "View details"}
												<Icon name="arrow" size={14} />
											</button>
										</div>
										{s.termsMismatch && (
											<button
												type="button"
												className="m-service-alert"
												onClick={() => setTab("terms")}
											>
												<Icon name="alert" size={14} />
												Client and supplier terms need review
												<Icon name="right" size={13} />
											</button>
										)}
									</div>
								</div>
							))}
						</section>
					)}
					{tab === "terms" && (
						<section className="m-terms-view">
							<SectionTitle title="Aligned, before arrival." />
							<p className="m-section-caption">
								Compare the recorded conditions. Review flagged differences with
								your suppliers before making a commitment.
							</p>
							{services.map((s) => (
								<article className="m-terms-card" key={s.id}>
									<div className="m-section-title">
										<h3>{s.title}</h3>
										{s.termsMismatch ? (
											<Badge tone="amber">Review required</Badge>
										) : (
											<Badge tone="green">No difference recorded</Badge>
										)}
									</div>
									<div className="m-terms-columns">
										<div>
											<span className="m-eyebrow">Client conditions</span>
											<p>{s.clientTerms || "No client conditions recorded."}</p>
										</div>
										<div>
											<span className="m-eyebrow">Supplier conditions</span>
											<p>
												{s.supplierTerms || "No supplier conditions recorded."}
											</p>
										</div>
									</div>
									<Button
										tone="quiet"
										size="small"
										onClick={() =>
											open({ kind: "service", caseId, service: s })
										}
									>
										Record agreed conditions
										<Icon name="arrow" size={14} />
									</Button>
								</article>
							))}
						</section>
					)}
					{tab === "financials" && data.permissions.canViewFinancials && (
						<section>
							<FinancialSummary totals={c.totals} />
							<PricingTable
								services={services}
								edit={(s) => open({ kind: "service", caseId, service: s })}
							/>
							<p className="m-private-note">
								<Icon name="shield" size={15} />
								Supplier costs and margins are visible only to owners and
								operations managers. Draft and cancelled services are identified
								in the itinerary.
							</p>
						</section>
					)}
					{tab === "activity" && (
						<section className="m-notes-view">
							<SectionTitle title="The complete picture." />
							<form
								onSubmit={(e) => {
									e.preventDefault();
									run(
										execute({ type: "addNote", caseId, body: note }).then(() =>
											setNote(""),
										),
									);
								}}
							>
								<Textarea
									aria-label="Handover note"
									value={note}
									onChange={(e) => setNote(e.target.value)}
									required
									placeholder="Leave a clear note for the next concierge…"
								/>
								<div className="m-form-actions">
									<Button type="submit" disabled={!note.trim()}>
										Add note
										<Icon name="plus" size={15} />
									</Button>
								</div>
							</form>
							<div className="m-activity-timeline">
								{activity.map((a) => (
									<div key={a.id}>
										<Avatar name={a.actorName} />
										<div>
											<strong>
												{a.actorName}
												<span>
													{date(a.createdAt)} · {time(a.createdAt)}
												</span>
											</strong>
											<p>{a.body}</p>
											<small>{a.kind.replaceAll("_", " ")}</small>
										</div>
									</div>
								))}
							</div>
						</section>
					)}
				</div>
				<aside className="m-case-aside">
					<section className="m-client-card">
						<span className="m-eyebrow">The client</span>
						<Avatar name={c.clientName} size="large" />
						<h3>{c.clientName}</h3>
						<span className="m-client-tier">
							{client?.tier || "Private client"}
						</span>
						<div className="m-divider" />
						<span className="m-eyebrow">Preferences that matter</span>
						<p>
							{client?.preferences ||
								"Capture their preferences for future journeys."}
						</p>
						{client?.dietary && (
							<div className="m-dietary">
								<Icon name="dining" size={15} />
								<span>{client.dietary}</span>
							</div>
						)}
						<Button
							tone="secondary"
							onClick={() => client && open({ kind: "client", client })}
						>
							Client profile
							<Icon name="arrow" size={15} />
						</Button>
					</section>
					<section className="m-case-tasks">
						<SectionTitle
							title="The next steps"
							count={tasks.filter((t) => !t.completedAt).length}
							action="Add"
							onClick={() => open({ kind: "task", caseId })}
						/>
						{tasks.map((t) => (
							<div
								className={`m-case-task ${t.completedAt ? "done" : ""}`}
								key={t.id}
							>
								<button
									type="button"
									aria-label={`${t.completedAt ? "Reopen" : "Complete"} ${t.title}`}
									className={`m-checkbox ${t.completedAt ? "checked" : ""}`}
									onClick={() =>
										run(
											execute({
												type: "completeTask",
												taskId: t.id,
												completed: !t.completedAt,
											}),
										)
									}
								>
									{t.completedAt && <Icon name="check" size={12} />}
								</button>
								<div>
									<strong>{t.title}</strong>
									<small
										className={t.overdue && !t.completedAt ? "m-overdue" : ""}
									>
										{t.assigneeName || "Unassigned"} · {date(t.dueAt)}
									</small>
								</div>
							</div>
						))}
					</section>
					{c.notes && (
						<section className="m-case-notes">
							<span className="m-eyebrow">Journey notes</span>
							<p>{c.notes}</p>
						</section>
					)}
				</aside>
			</div>
			<Modal
				open={briefOpen}
				onClose={() => setBriefOpen(false)}
				title="A brief, beautifully prepared."
				description="Choose the audience. The document includes only the details intended for them."
			>
				<div className="m-form">
					<label className="m-field" htmlFor="brief-audience">
						<span>Prepared for</span>
						<Select
							id="brief-audience"
							value={audience}
							onChange={(e) => setAudience(e.target.value as typeof audience)}
						>
							<option value="client">Client · travel itinerary</option>
							<option value="supplier">Partner · execution brief</option>
							{data.permissions.canViewFinancials && (
								<option value="internal">Team · internal handover</option>
							)}
						</Select>
					</label>
					{audience === "supplier" && (
						<label className="m-field" htmlFor="brief-partner">
							<span>Partner</span>
							<Select
								id="brief-partner"
								value={supplierId}
								onChange={(e) => setSupplierId(e.target.value)}
							>
								<option value="">Choose a partner</option>
								{usedSuppliers.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</Select>
						</label>
					)}
					<p className="m-helper">
						This prepares a versioned draft. Nothing is sent automatically.
					</p>
					<div className="m-form-actions">
						<Button
							disabled={briefBusy || (audience === "supplier" && !supplierId)}
							onClick={() => void createBrief()}
						>
							{briefBusy ? "Preparing…" : "Create brief"}
							<Icon name="document" size={16} />
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
export function InboxView({
	data,
	execute,
	open,
	go,
	selectedId,
}: ViewProps & { selectedId?: string }) {
	const [filter, setFilter] = useState("pending");
	const [selected, setSelected] = useState(selectedId || "");
	const [caseId, setCaseId] = useState("");
	const [reviewNote, setReviewNote] = useState("");
	const [busy, setBusy] = useState(false);
	const messages = data.inbox.filter(
		(m) => filter === "all" || ["pending", "proposed"].includes(m.status),
	);
	const item = data.inbox.find((m) => m.id === selected) || messages[0];
	const choose = (id: string) => {
		setSelected(id);
		setCaseId("");
		setReviewNote("");
	};
	const attach = async () => {
		if (!item || busy) return;
		setBusy(true);
		try {
			await execute({
				type: "approveIntake",
				intakeId: item.id,
				caseId: caseId || item.caseId || "",
				note: reviewNote.trim() || item.proposal?.summary || item.rawText,
			});
			setSelected(item.id);
			setCaseId("");
			setReviewNote("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not attach request.",
			);
		} finally {
			setBusy(false);
		}
	};
	const dismiss = async () => {
		if (!item || busy) return;
		setBusy(true);
		try {
			await execute({
				type: "dismissIntake",
				intakeId: item.id,
				reason: "Dismissed during concierge review.",
			});
			setSelected(item.id);
			setCaseId("");
			setReviewNote("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not dismiss request.",
			);
		} finally {
			setBusy(false);
		}
	};
	return (
		<>
			<Heading
				eyebrow="Request inbox"
				title="A conversation. A considered response."
				description="Keep every request, update and promise connected to the right journey."
			>
				<Button onClick={() => open({ kind: "capture" })}>
					<Icon name="plus" size={16} />
					Capture request
				</Button>
			</Heading>
			<div className="m-toolbar">
				<div className="m-filter-tabs">
					<button
						type="button"
						className={filter === "pending" ? "active" : ""}
						onClick={() => setFilter("pending")}
					>
						Needs attention <span>{data.stats.pendingIntake}</span>
					</button>
					<button
						type="button"
						className={filter === "all" ? "active" : ""}
						onClick={() => setFilter("all")}
					>
						All requests
					</button>
				</div>
				<span className="m-quiet-label">
					<Icon name="shield" size={14} />
					You approve every change
				</span>
			</div>
			<div className="m-inbox-layout">
				<div className="m-inbox-list">
					{messages.map((m) => (
						<button
							type="button"
							key={m.id}
							disabled={busy}
							className={`m-inbox-item ${item?.id === m.id ? "active" : ""}`}
							onClick={() => choose(m.id)}
						>
							<div className="m-inbox-item-top">
								<span className="m-inline">
									<Icon
										name={
											m.channel === "email"
												? "mail"
												: m.channel === "phone"
													? "phone"
													: "message"
										}
										size={16}
									/>
									{m.sender}
								</span>
								<small>{date(m.createdAt)}</small>
							</div>
							<strong>
								{m.proposal?.title ||
									(m.rawText.split(/[.!?\n]/)[0] || m.rawText).slice(0, 80)}
							</strong>
							<p>{m.rawText}</p>
							<div className="m-inbox-item-bottom">
								<span>
									{m.channel === "manual" ? "Captured note" : m.channel}
								</span>
								<Status status={m.status} />
							</div>
						</button>
					))}
					{messages.length === 0 && (
						<Empty
							title="All caught up."
							description="Your requests have been reviewed."
						/>
					)}
				</div>
				<article className="m-message-detail">
					{item ? (
						<>
							<div className="m-message-header">
								<Avatar name={item.sender} />
								<div>
									<h2>{item.sender}</h2>
									<p>
										Captured via {item.channel} ·{" "}
										{date(item.createdAt, { day: "numeric", month: "long" })} at{" "}
										{time(item.createdAt)}
									</p>
								</div>
								<Status status={item.status} />
							</div>
							<div className="m-message-body">
								<span className="m-eyebrow">Original message</span>
								<blockquote>{item.rawText}</blockquote>
								{!item.proposal && (
									<p className="m-helper m-extraction-status">
										<Icon name="sparkle" size={14} />
										{item.extractionStatus === "processing"
											? "Assistant is preparing a suggestion. Manual review remains available."
											: item.extractionError ||
												"Ready for manual review. Assistant extraction runs when configured."}
									</p>
								)}
							</div>
							{item.proposal && (
								<div className="m-proposal">
									<div className="m-inline">
										<Icon name="sparkle" size={17} />
										<h3>Prepared for review</h3>
									</div>
									<h4>{item.proposal.title}</h4>
									<p>{item.proposal.summary}</p>
									<div className="m-detail-pairs">
										<span>Service</span>
										<strong>
											{item.proposal.category || "Needs clarification"}
										</strong>
										<span>Location</span>
										<strong>{item.proposal.location || "Not provided"}</strong>
										{item.proposal.requestedStart && (
											<>
												<span>Requested date</span>
												<strong>{date(item.proposal.requestedStart)}</strong>
											</>
										)}
									</div>
									<details className="m-evidence">
										<summary>
											Source evidence ({item.proposal.evidence.length})
										</summary>
										{item.proposal.evidence.map((e) => (
											<blockquote key={`${e.field}-${e.start}-${e.end}`}>
												<strong>{e.field}</strong>
												<p>{e.quote}</p>
											</blockquote>
										))}
									</details>
									{item.proposal.missingFields.length > 0 && (
										<p className="m-missing">
											<Icon name="alert" size={15} />
											To clarify: {item.proposal.missingFields.join(", ")}
										</p>
									)}
								</div>
							)}
							{["pending", "proposed"].includes(item.status) ? (
								<div className="m-review-box">
									<h3>Put this in the right hands.</h3>
									<label className="m-field" htmlFor="request-journey">
										<span>Attach to journey</span>
										<Select
											id="request-journey"
											disabled={busy}
											value={caseId || item.caseId || ""}
											onChange={(e) => setCaseId(e.target.value)}
										>
											<option value="">Select the correct journey</option>
											{data.cases.map((c) => (
												<option key={c.id} value={c.id}>
													{c.title} · {c.clientName}
												</option>
											))}
										</Select>
									</label>
									<label className="m-field" htmlFor="request-note">
										<span>Reviewed note</span>
										<Textarea
											id="request-note"
											disabled={busy}
											value={reviewNote}
											onChange={(e) => setReviewNote(e.target.value)}
											placeholder={
												item.proposal?.summary ||
												"Add context, corrections, or the next step. Leave blank to retain the source message."
											}
										/>
									</label>
									<p className="m-helper">
										Approval adds the reviewed note to the journey. Service
										confirmations and pricing still require your explicit
										update.
									</p>
									<div className="m-form-actions">
										<Button
											tone="quiet"
											disabled={busy}
											onClick={() => void dismiss()}
										>
											Dismiss
										</Button>
										<Button
											disabled={busy || !(caseId || item.caseId)}
											onClick={() => void attach()}
										>
											{busy ? "Saving…" : "Approve & attach"}
											<Icon name="check" size={16} />
										</Button>
									</div>
								</div>
							) : (
								<div className="m-reviewed">
									<Icon name="checks" />
									<p>
										{item.status === "approved"
											? "Reviewed and attached to the journey."
											: "This request has been dismissed."}
									</p>
									{item.caseId && (
										<Button
											tone="secondary"
											onClick={() => go(`journeys/${item.caseId}`)}
										>
											Open journey
											<Icon name="arrow" size={15} />
										</Button>
									)}
								</div>
							)}
						</>
					) : (
						<Empty
							title="Room for the next request."
							description="Capture a message or note to get started."
						/>
					)}
				</article>
			</div>
		</>
	);
}
export function ClientsView({ data, open, go }: ViewProps) {
	const [query, setQuery] = useState("");
	const clients = data.clients.filter((c) =>
		`${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase()),
	);
	return (
		<>
			<Heading
				eyebrow="Private clients"
				title="Service begins with understanding."
				description="The preferences, relationships and details that make every experience personal."
			>
				<Button onClick={() => open({ kind: "new-client" })}>
					<Icon name="plus" size={16} />
					New client
				</Button>
			</Heading>
			<div className="m-toolbar">
				<span className="m-count-label">{clients.length} private clients</span>
				<div className="m-search-field">
					<Icon name="search" size={16} />
					<Input
						aria-label="Search clients"
						placeholder="Find a client"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>
			<div className="m-client-grid">
				{clients.map((client) => (
					<article className="m-client-directory-card" key={client.id}>
						<div className="m-card-topline">
							<Avatar name={client.name} size="large" />
							<span className="m-client-tier">{client.tier}</span>
						</div>
						<h2>{client.name}</h2>
						<p className="m-contact-line">
							{client.email || "No email recorded"}
						</p>
						<div className="m-divider" />
						<span className="m-eyebrow">A few things to remember</span>
						<p className="m-preferences">
							{client.preferences ||
								"Their next journey is a chance to learn what matters."}
						</p>
						{client.dietary && (
							<span className="m-dietary">
								<Icon name="dining" size={14} />
								{client.dietary}
							</span>
						)}
						<div className="m-card-bottom">
							<button
								type="button"
								className="m-text-button"
								onClick={() => {
									const c = data.cases.find((c) => c.clientId === client.id);
									if (c) go(`journeys/${c.id}`);
									else open({ kind: "case" });
								}}
							>
								{client.caseCount}{" "}
								{client.caseCount === 1 ? "journey" : "journeys"}
								<Icon name="arrow" size={14} />
							</button>
							<Button
								tone="quiet"
								size="small"
								onClick={() => open({ kind: "client", client })}
							>
								View profile
								<Icon name="northeast" size={14} />
							</Button>
						</div>
					</article>
				))}
			</div>
			{clients.length === 0 && (
				<Empty
					title="No matching clients."
					description="Try another name or email address."
				/>
			)}
		</>
	);
}
export function SuppliersView({ data, open }: ViewProps) {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("all");
	const suppliers = data.suppliers.filter(
		(s) =>
			`${s.name} ${s.location} ${s.contactName}`
				.toLowerCase()
				.includes(query.toLowerCase()) &&
			(category === "all" ||
				s.categories.includes(category as Service["category"])),
	);
	return (
		<>
			<Heading
				eyebrow="Trusted partners"
				title="Exceptional, together."
				description="Your network of specialists. Their expertise, contacts and terms, always within reach."
			>
				<Button onClick={() => open({ kind: "new-supplier" })}>
					<Icon name="plus" size={16} />
					Add partner
				</Button>
			</Heading>
			<div className="m-toolbar">
				<div className="m-filter-tabs">
					{["all", "transfer", "flight", "villa", "hotel", "experience"].map(
						(s) => (
							<button
								type="button"
								className={category === s ? "active" : ""}
								key={s}
								onClick={() => setCategory(s)}
							>
								{s === "all"
									? "All partners"
									: s === "transfer"
										? "Chauffeurs"
										: s === "flight"
											? "Aviation"
											: `${(s[0] || "").toUpperCase()}${s.slice(1)}s`}
							</button>
						),
					)}
				</div>
				<div className="m-search-field">
					<Icon name="search" size={16} />
					<Input
						aria-label="Search partners"
						placeholder="Partner or destination"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>
			<div className="m-partner-grid">
				{suppliers.map((s) => (
					<article className="m-partner-card" key={s.id}>
						<div className="m-partner-mark">
							<Icon name={s.categories[0] || "globe"} size={29} />
						</div>
						<div className="m-partner-body">
							<div className="m-card-topline">
								<span className="m-eyebrow">{s.categories.join(" · ")}</span>
								<Badge tone={s.active ? "green" : "neutral"}>
									{s.active ? "Active partner" : "Inactive"}
								</Badge>
							</div>
							<h2>{s.name}</h2>
							<p className="m-inline">
								<Icon name="pin" size={14} />
								{s.location}
							</p>
							<div className="m-partner-contact">
								<span>{s.contactName}</span>
								<a href={`mailto:${s.email}`}>{s.email}</a>
								<a href={`tel:${s.phone}`}>{s.phone}</a>
							</div>
							<p className="m-partner-notes">{s.notes}</p>
							<div className="m-card-bottom">
								<span>
									{
										data.services.filter(
											(service) => service.supplierId === s.id,
										).length
									}{" "}
									services in workspace
								</span>
								<Button
									tone="quiet"
									size="small"
									onClick={() => open({ kind: "supplier", supplier: s })}
								>
									Partner details
									<Icon name="northeast" size={15} />
								</Button>
							</div>
						</div>
					</article>
				))}
			</div>
			{suppliers.length === 0 && (
				<Empty
					title="A specialist is waiting to be found."
					description="No partners match this search. Try another service or location."
				/>
			)}
		</>
	);
}
export function TasksView({ data, execute, open, go }: ViewProps) {
	const [filter, setFilter] = useState("open");
	const [owner, setOwner] = useState("all");
	const tasks = data.tasks
		.filter(
			(t) =>
				(filter === "all" ||
					(filter === "open" && !t.completedAt) ||
					(filter === "completed" && !!t.completedAt)) &&
				(owner === "all" || t.assigneeId === owner),
		)
		.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
	return (
		<>
			<Heading
				eyebrow="Tasks & handovers"
				title="The details make the difference."
				description="Clear ownership. Considered follow-through. Nothing left between conversations."
			>
				<Button onClick={() => open({ kind: "task" })}>
					<Icon name="plus" size={16} />
					New task
				</Button>
			</Heading>
			<div className="m-toolbar">
				<div className="m-filter-tabs">
					{["open", "completed", "all"].map((s) => (
						<button
							type="button"
							key={s}
							className={filter === s ? "active" : ""}
							onClick={() => setFilter(s)}
						>
							{s === "open" ? "To do" : s === "all" ? "All tasks" : "Completed"}
						</button>
					))}
				</div>
				<Select
					value={owner}
					onChange={(e) => setOwner(e.target.value)}
					aria-label="Filter by concierge"
				>
					<option value="all">All concierges</option>
					{data.team.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</Select>
			</div>
			<div className="m-task-list">
				{tasks.map((t) => {
					const c = data.cases.find((c) => c.id === t.caseId);
					return (
						<div
							key={t.id}
							className={`m-task-row ${t.completedAt ? "done" : ""}`}
						>
							<button
								type="button"
								className={`m-checkbox ${t.completedAt ? "checked" : ""}`}
								aria-label={`${t.completedAt ? "Reopen" : "Complete"} ${t.title}`}
								onClick={() =>
									run(
										execute({
											type: "completeTask",
											taskId: t.id,
											completed: !t.completedAt,
										}),
									)
								}
							>
								{t.completedAt && <Icon name="check" size={13} />}
							</button>
							<div className="m-task-name">
								<strong>{t.title}</strong>
								<button
									type="button"
									onClick={() => go(`journeys/${t.caseId}`)}
								>
									{c?.title} · {c?.clientName}
								</button>
							</div>
							<Badge
								tone={
									t.priority === "urgent"
										? "red"
										: t.priority === "high"
											? "amber"
											: "neutral"
								}
							>
								{t.priority}
							</Badge>
							<span
								className={`m-inline m-task-due ${t.overdue && !t.completedAt ? "m-overdue" : ""}`}
							>
								<Icon name="calendar" size={15} />
								{date(t.dueAt)}
								{t.overdue && !t.completedAt ? " · overdue" : ""}
							</span>
							<span className="m-inline">
								<Avatar name={t.assigneeName || "Unassigned"} size="small" />
								{t.assigneeName?.split(" ")[0] || "Unassigned"}
							</span>
						</div>
					);
				})}
				{tasks.length === 0 && (
					<Empty
						title="Everything is in hand."
						description="No tasks match this view."
					/>
				)}
			</div>
		</>
	);
}
function FinancialSummary({ totals }: { totals: Case["totals"] }) {
	return (
		<div className="m-financial-summary">
			<div>
				<span>Client total</span>
				<strong>{money(totals.sellCents)}</strong>
			</div>
			<div>
				<span>Partner costs</span>
				<strong>{money(totals.costCents)}</strong>
			</div>
			<div>
				<span>Gross margin</span>
				<strong>{money(totals.marginCents)}</strong>
				<small>
					{totals.marginPercent == null
						? ""
						: `${totals.marginPercent.toFixed(1)}% of selling price`}
				</small>
			</div>
		</div>
	);
}
function PricingTable({
	services,
	edit,
}: {
	services: Service[];
	edit: (service: Service) => void;
}) {
	return (
		<div className="m-table-scroll">
			<table className="m-table m-pricing-table">
				<thead>
					<tr>
						<th>Service</th>
						<th>Partner cost</th>
						<th>Client price</th>
						<th>Margin</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{services
						.filter((s) => s.status !== "cancelled")
						.map((s) => (
							<tr key={s.id}>
								<td>
									<strong>{s.title}</strong>
									<small>{statusLabels[s.status]}</small>
								</td>
								<td>{money(s.costCents)}</td>
								<td>{money(s.sellCents)}</td>
								<td>{money(s.marginCents)}</td>
								<td>
									<button
										type="button"
										className="m-icon-button"
										onClick={() => edit(s)}
										aria-label={`Edit pricing for ${s.title}`}
									>
										<Icon name="northeast" size={16} />
									</button>
								</td>
							</tr>
						))}
				</tbody>
			</table>
		</div>
	);
}
export function FinancialsView({ data, go }: ViewProps) {
	if (!data.permissions.canViewFinancials)
		return (
			<Empty
				title="A private view."
				description="Financials are available to workspace owners and operations managers."
			/>
		);
	return (
		<>
			<Heading
				eyebrow="Financials · internal only"
				title="A clear view of every commitment."
				description="Client prices, partner costs and your margin. Figures reflect recorded services, not collected payments."
			/>
			<FinancialSummary totals={data.stats.totals} />
			<section className="m-section">
				<SectionTitle title="By journey" count={data.cases.length} />
				<div className="m-table-scroll">
					<table className="m-table">
						<thead>
							<tr>
								<th>Journey</th>
								<th>Client price</th>
								<th>Partner costs</th>
								<th>Gross margin</th>
								<th>Margin %</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{data.cases.map((c) => (
								<tr key={c.id}>
									<td>
										<button
											type="button"
											className="m-table-link"
											onClick={() => go(`journeys/${c.id}`)}
										>
											{c.title}
										</button>
										<small>{c.clientName}</small>
									</td>
									<td>{money(c.totals.sellCents)}</td>
									<td>{money(c.totals.costCents)}</td>
									<td>{money(c.totals.marginCents)}</td>
									<td>
										{c.totals.marginPercent == null
											? "Not recorded"
											: `${c.totals.marginPercent.toFixed(1)}%`}
									</td>
									<td>
										<button
											type="button"
											className="m-icon-button"
											onClick={() => go(`journeys/${c.id}`)}
											aria-label={`Open finances for ${c.title}`}
										>
											<Icon name="northeast" size={17} />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
			<p className="m-private-note">
				<Icon name="shield" size={15} />
				All pilot amounts are in EUR. Margin is selling price less partner cost.
				Cancelled services are excluded. No tax or currency conversion is
				implied.
			</p>
		</>
	);
}
export function DocumentsView({ data, go, execute }: ViewProps) {
	const [selected, setSelected] = useState("");
	const [audience, setAudience] = useState("all");
	const [sharing, setSharing] = useState(false);
	const [share, setShare] = useState<{
		id: string;
		url: string;
		expiresAt: string;
	} | null>(null);
	const docs = data.documents.filter(
		(d) => audience === "all" || d.audience === audience,
	);
	const doc = docs.find((d) => d.id === selected) || docs[0];
	const createLink = async () => {
		if (!doc || sharing) return;
		setSharing(true);
		try {
			const result = await execute({
				type: "createBriefShare",
				documentId: doc.id,
				expiresInDays: CONCIERGE_UI.shareDays,
			});
			if (result.shareToken && result.expiresAt)
				setShare({
					id: doc.id,
					url: `${window.location.origin}/brief/${result.shareToken}`,
					expiresAt: result.expiresAt,
				});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Link could not be created.",
			);
		} finally {
			setSharing(false);
		}
	};
	const revokeLink = async () => {
		if (!doc || sharing) return;
		setSharing(true);
		try {
			await execute({ type: "revokeBriefShare", documentId: doc.id });
			setShare(null);
			toast.success("All links for this brief are now revoked.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Link could not be revoked.",
			);
		} finally {
			setSharing(false);
		}
	};
	const download = () => {
		if (!doc) return;
		const link = document.createElement("a");
		const url = URL.createObjectURL(
			new Blob([doc.content], { type: "text/markdown;charset=utf-8" }),
		);
		link.href = url;
		link.download = `${doc.title.replace(/[^a-zA-Z0-9]+/g, "-")}-v${doc.version}.md`;
		link.click();
		URL.revokeObjectURL(url);
	};
	return (
		<>
			<div className="m-no-print">
				<Heading
					eyebrow="Travel briefs"
					title="Beautifully prepared. Personally delivered."
					description="Versioned itineraries and partner instructions, tailored to the right audience."
				>
					<Button tone="secondary" onClick={() => go("journeys")}>
						<Icon name="plus" size={16} />
						Prepare from a journey
					</Button>
				</Heading>
				<div className="m-toolbar">
					<div className="m-filter-tabs">
						{[
							"all",
							"client",
							"supplier",
							...(data.permissions.canViewFinancials ? ["internal"] : []),
						].map((s) => (
							<button
								type="button"
								key={s}
								className={audience === s ? "active" : ""}
								onClick={() => {
									setAudience(s);
									setSelected("");
								}}
							>
								{s === "all"
									? "All briefs"
									: s === "supplier"
										? "Partner briefs"
										: s === "client"
											? "Client itineraries"
											: "Internal handovers"}
							</button>
						))}
					</div>
					<span className="m-quiet-label">
						Documents are prepared, never automatically sent
					</span>
				</div>
			</div>
			{docs.length ? (
				<div className="m-documents-layout">
					<div className="m-document-list m-no-print">
						{docs.map((d) => (
							<button
								type="button"
								key={d.id}
								className={doc?.id === d.id ? "active" : ""}
								onClick={() => setSelected(d.id)}
							>
								<span className="m-document-icon">
									<Icon name="document" size={23} />
								</span>
								<div>
									<strong>{d.title}</strong>
									<small>
										{d.audience} · Version {d.version} · {date(d.createdAt)}
									</small>
								</div>
								<Icon name="right" size={15} />
							</button>
						))}
					</div>
					{doc && (
						<article className="m-document-preview">
							<div className="m-document-tools m-no-print">
								<Badge tone="neutral">
									{doc.audience === "internal"
										? "Internal only"
										: `${doc.audience} preview`}
								</Badge>
								<div>
									<Button tone="quiet" size="small" onClick={download}>
										<Icon name="download" size={15} />
										Download
									</Button>
									<Button
										tone="secondary"
										size="small"
										onClick={() => window.print()}
									>
										Print / PDF
									</Button>
								</div>
							</div>
							{doc.audience === "client" &&
								data.permissions.canManageFinancials && (
									<div className="m-sharing m-no-print">
										<div>
											<Icon name="shield" size={16} />
											<p>
												A private client link stays valid for seven days.
												Creating a new link revokes the previous one.
											</p>
										</div>
										<div className="m-actions">
											<Button
												tone="secondary"
												size="small"
												disabled={sharing}
												onClick={() => void createLink()}
											>
												Create private link
											</Button>
											<Button
												tone="quiet"
												size="small"
												disabled={sharing}
												onClick={() => void revokeLink()}
											>
												Revoke links
											</Button>
										</div>
										{share?.id === doc.id && (
											<div className="m-share-result">
												<Input
													aria-label="Private client link"
													value={share.url}
													readOnly
												/>
												<a href={share.url} target="_blank" rel="noreferrer">
													Open client view
													<Icon name="northeast" size={13} />
												</a>
												<Button
													tone="quiet"
													size="small"
													onClick={() => {
														void navigator.clipboard
															.writeText(share.url)
															.then(() => toast.success("Private link copied."))
															.catch(() =>
																toast.error(
																	"Select the link and copy it manually.",
																),
															);
													}}
												>
													Copy link
												</Button>
												<small>
													Expires {date(share.expiresAt)}. Anyone with this link
													can read this itinerary.
												</small>
											</div>
										)}
									</div>
								)}
							<div className="m-brief-paper">
								<div className="m-brief-brand">
									maison<span>PRIVATE CONCIERGE</span>
								</div>
								<BriefBody content={doc.content} />
								<div className="m-brief-footer">
									<span>Every detail. Considered.</span>
									<span>
										Version {doc.version} · {date(doc.createdAt)}
									</span>
								</div>
							</div>
						</article>
					)}
				</div>
			) : (
				<Empty
					title="The final touch is still to come."
					description="Open a journey and choose “Prepare a brief” to create its client itinerary or partner instructions."
				>
					<Button onClick={() => go("journeys")}>
						Choose a journey
						<Icon name="arrow" size={16} />
					</Button>
				</Empty>
			)}
		</>
	);
}
export function ConnectionsView({ data, go }: ViewProps) {
	return (
		<>
			<Heading
				eyebrow="Settings & connections"
				title="A connected way to work."
				description="Bring conversations into the workspace. Keep your team in control of what happens next."
			/>
			<div className="m-settings-grid">
				<section className="m-settings-section">
					<SectionTitle title="Your workspace" />
					<div className="m-detail-pairs">
						<span>Name</span>
						<strong>Maison · Private concierge</strong>
						<span>Environment</span>
						<strong>Local demonstration</strong>
						<span>Reporting currency</span>
						<strong>EUR</strong>
						<span>Your role</span>
						<strong>{data.permissions.role}</strong>
						<span>Data</span>
						<strong>Fictional pilot records</strong>
					</div>
					<div className="m-divider" />
					<h3>The team</h3>
					{data.team.map((t) => (
						<div className="m-team-row" key={t.id}>
							<Avatar name={t.name} />
							<div>
								<strong>{t.name}</strong>
								<small>{t.email}</small>
							</div>
							<Badge>{t.role}</Badge>
						</div>
					))}
					<Button tone="secondary" onClick={() => go("sign-in")}>
						Switch demonstration user
						<Icon name="arrow" size={15} />
					</Button>
				</section>
				<section className="m-settings-section">
					<SectionTitle title="Capture & connections" />
					{[
						{
							name: "Notes & email files",
							icon: "document" as MaisonIconName,
							status: "Available",
							desc: "Capture a note or import a .txt or .eml file. The source stays with every request.",
						},
						{
							name: "Voice dictation",
							icon: "mic" as MaisonIconName,
							status: "Browser dependent",
							desc: "Dictate directly where your browser supports speech recognition, or paste a transcript.",
						},
						{
							name: "Email account",
							icon: "mail" as MaisonIconName,
							status: "Not connected",
							desc: "Live mailbox sync requires connecting an authorized Google or Microsoft account. Manual import is available.",
						},
						{
							name: "WhatsApp",
							icon: "message" as MaisonIconName,
							status: "Not connected",
							desc: "Live messages require a configured business integration. Paste a message or transcript for the pilot.",
						},
						{
							name: "AI intake assistant",
							icon: "sparkle" as MaisonIconName,
							status: "Not configured",
							desc: "The extraction worker is ready for an AI Gateway connection. Requests remain available for manual review.",
						},
					].map((c) => (
						<div className="m-connection" key={c.name}>
							<span>
								<Icon name={c.icon} size={22} />
							</span>
							<div>
								<div className="m-card-topline">
									<h3>{c.name}</h3>
									<Badge tone={c.status === "Available" ? "green" : "neutral"}>
										{c.status}
									</Badge>
								</div>
								<p>{c.desc}</p>
							</div>
						</div>
					))}
				</section>
			</div>
		</>
	);
}
