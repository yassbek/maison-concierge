"use client";

import {
	MaisonAvatar as Avatar,
	MaisonButton as Button,
	MaisonEmpty as Empty,
	MaisonIcon as Icon,
	MaisonInput as Input,
	type MaisonIconName,
	MaisonDialog as Modal,
} from "@crm/ui/components/concierge";
import { useMountEffect } from "@crm/ui/hooks/use-mount-effect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CONCIERGE_UI } from "@/lib/concierge-config";
import { fetchSnapshot, sendCommand } from "./api";
import { CaptureForm } from "./capture";
import {
	ClientForm,
	NewCaseForm,
	NewClientForm,
	NewSupplierForm,
	ServiceForm,
	SupplierForm,
	TaskForm,
} from "./forms";
import type {
	Client,
	Command,
	Execute,
	Service,
	Snapshot,
	Supplier,
} from "./types";
import { date } from "./types";
import {
	ClientsView,
	ConnectionsView,
	DocumentsView,
	FinancialsView,
	InboxView,
	JourneyDetail,
	JourneyList,
	Overview,
	SuppliersView,
	TasksView,
	type ViewProps,
} from "./views";

export type OpenModal = (modal: ModalState) => void;
export type ModalState =
	| { kind: "new-client" }
	| { kind: "new-supplier" }
	| { kind: "case" }
	| { kind: "capture"; caseId?: string }
	| { kind: "service"; caseId: string; service?: Service }
	| { kind: "client"; client: Client }
	| { kind: "supplier"; supplier: Supplier }
	| { kind: "task"; caseId?: string }
	| { kind: "search" }
	| null;
const navigation: {
	key: string;
	label: string;
	icon: MaisonIconName;
	group: string;
}[] = [
	{ key: "", label: "Overview", icon: "overview", group: "Workspace" },
	{ key: "inbox", label: "Request inbox", icon: "inbound", group: "Workspace" },
	{
		key: "journeys",
		label: "Journeys",
		icon: "experience",
		group: "Workspace",
	},
	{ key: "clients", label: "Clients", icon: "users", group: "Workspace" },
	{ key: "suppliers", label: "Partners", icon: "globe", group: "Workspace" },
	{
		key: "tasks",
		label: "Tasks & handovers",
		icon: "tasks",
		group: "Management",
	},
	{
		key: "documents",
		label: "Travel briefs",
		icon: "document",
		group: "Management",
	},
	{
		key: "financials",
		label: "Financials",
		icon: "wallet",
		group: "Management",
	},
];
export function ConciergeApp({ section }: { section: string[] }) {
	const router = useRouter();
	const cache = useQueryClient();
	const [modal, setModal] = useState<ModalState>(null);
	const mutationLock = useRef(false);
	const [saving, setSaving] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	useMountEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "k") {
				event.preventDefault();
				setModal({ kind: "search" });
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	});
	const { data, error, isPending, isFetching } = useQuery({
		queryKey: ["concierge"],
		queryFn: fetchSnapshot,
		refetchInterval: CONCIERGE_UI.snapshotRefreshMs,
		retry: 1,
	});
	const active = section[0] || "";
	const go = (path: string) => {
		setMobileOpen(false);
		router.push(`/concierge${path ? `/${path}` : ""}`);
	};
	const execute = async (command: Command) => {
		if (mutationLock.current)
			throw new Error("A change is still saving. Please wait.");
		mutationLock.current = true;
		setSaving(true);
		try {
			const result = await sendCommand(command);
			await cache.invalidateQueries({ queryKey: ["concierge"] });
			toast.success(
				command.type === "captureIntake"
					? "Request captured. Ready for review."
					: command.type === "createBrief"
						? "Travel brief created."
						: "Changes saved.",
			);
			return result;
		} finally {
			mutationLock.current = false;
			setSaving(false);
		}
	};
	const finish = () => setModal(null);
	if (isPending)
		return (
			<div className="maison-app m-loading">
				<div className="m-wordmark">
					maison<span>PRIVATE CONCIERGE</span>
				</div>
				<Icon name="loading" />
				<p>Preparing your workspace</p>
			</div>
		);
	if (error || !data)
		return (
			<div className="maison-app m-loading">
				<div className="m-wordmark">maison</div>
				<h1>Let’s get you connected.</h1>
				<p>{error?.message || "Your workspace is unavailable."}</p>
				<div className="m-actions">
					<Button
						onClick={() => cache.invalidateQueries({ queryKey: ["concierge"] })}
					>
						Try again
					</Button>
					<Button
						tone="secondary"
						onClick={() => router.push("/concierge/sign-in")}
					>
						Sign in
					</Button>
				</div>
			</div>
		);
	const user = data.team.find((t) => t.id === data.permissions.userId);
	const displayName = user?.name || "Concierge";
	const viewProps = { data, execute, open: setModal, go };
	const titles: Record<string, string> = {
		"": "Overview",
		inbox: "Request inbox",
		journeys: "Journeys",
		clients: "Clients",
		suppliers: "Partners",
		tasks: "Tasks & handovers",
		documents: "Travel briefs",
		financials: "Financials",
		connections: "Connections",
	};
	return (
		<div className="maison-app m-workspace">
			{mobileOpen && (
				<button
					type="button"
					className="m-nav-scrim"
					aria-label="Close navigation"
					onClick={() => setMobileOpen(false)}
				/>
			)}
			<Sidebar
				active={active}
				mobileOpen={mobileOpen}
				onClose={() => setMobileOpen(false)}
				data={data}
				displayName={displayName}
				go={go}
			/>
			<div className="m-main">
				<header className="m-topbar">
					<div className="m-breadcrumb">
						<button
							type="button"
							className="m-mobile-menu"
							aria-label="Open navigation"
							onClick={() => setMobileOpen(true)}
						>
							<Icon name="menu" />
						</button>
						<span>Workspace</span>
						<Icon name="right" size={12} />
						<strong>{titles[active] || "Journey"}</strong>
						{section[1] && (
							<>
								<Icon name="right" size={12} />
								<span>
									{data.cases.find((c) => c.id === section[1])?.reference ||
										"Details"}
								</span>
							</>
						)}
					</div>
					<div className="m-topbar-actions">
						<button
							type="button"
							className="m-search-shortcut"
							onClick={() => setModal({ kind: "search" })}
						>
							<Icon name="search" size={15} />
							<span>Find anything</span>
							<kbd>⌘ K</kbd>
						</button>
						<span className="m-topbar-separator" />
						<button
							type="button"
							className="m-notification"
							aria-label={`${data.stats.pendingIntake} requests need attention`}
							onClick={() => go("inbox")}
						>
							<Icon name="bell" />
							{data.stats.pendingIntake > 0 && <i />}
						</button>
						<Avatar name={displayName} size="small" />
					</div>
				</header>
				<main className="m-page" id="main-content">
					<WorkspaceView
						section={section}
						displayName={displayName}
						{...viewProps}
					/>
				</main>
				<footer className="m-footer">
					<span>Made for the details that matter.</span>
					<span className="m-live-status">
						<i />
						{saving
							? "Saving changes"
							: isFetching
								? "Updating workspace"
								: "Workspace up to date"}
						<span>·</span>
						{date(data.asOf, {
							day: "numeric",
							month: "long",
							year: "numeric",
						})}
					</span>
				</footer>
			</div>
			<ModalHost
				modal={modal}
				data={data}
				execute={execute}
				finish={finish}
				go={go}
			/>
		</div>
	);
}
function Search({ data, go }: { data: Snapshot; go: (path: string) => void }) {
	const [query, setQuery] = useState("");
	const rows = [
		...data.cases.map((c) => ({
			id: c.id,
			name: c.title,
			detail: `${c.clientName} · ${c.reference}`,
			path: `journeys/${c.id}`,
			icon: "experience" as MaisonIconName,
		})),
		...data.clients.map((c) => ({
			id: c.id,
			name: c.name,
			detail: "Client",
			path: "clients",
			icon: "users" as MaisonIconName,
		})),
		...data.suppliers.map((s) => ({
			id: s.id,
			name: s.name,
			detail: s.location,
			path: "suppliers",
			icon: "globe" as MaisonIconName,
		})),
	].filter((r) =>
		`${r.name} ${r.detail}`.toLowerCase().includes(query.toLowerCase()),
	);
	return (
		<div className="m-search-panel">
			<Input
				autoFocus
				placeholder="A client, destination or reference…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				aria-label="Search workspace"
			/>
			<div className="m-search-results">
				{rows.slice(0, 12).map((row) => (
					<button type="button" key={row.id} onClick={() => go(row.path)}>
						<Icon name={row.icon} />
						<div>
							<strong>{row.name}</strong>
							<small>{row.detail}</small>
						</div>
						<Icon name="arrow" size={16} />
					</button>
				))}
				{rows.length === 0 && (
					<p>No matching records. Try another name or destination.</p>
				)}
			</div>
		</div>
	);
}

function Sidebar({
	active,
	mobileOpen,
	onClose,
	data,
	displayName,
	go,
}: {
	active: string;
	mobileOpen: boolean;
	onClose: () => void;
	data: Snapshot;
	displayName: string;
	go: (path: string) => void;
}) {
	return (
		<aside className={`m-sidebar ${mobileOpen ? "m-sidebar-open" : ""}`}>
			<Link href="/concierge" className="m-wordmark">
				maison<span>PRIVATE CONCIERGE</span>
			</Link>
			<div className="m-workspace-switch">
				<span className="m-workspace-mark">m.</span>
				<div>
					Concierge workspace<small>Maison collection</small>
				</div>
				<Icon name="down" size={14} />
			</div>
			<nav aria-label="Main navigation">
				{["Workspace", "Management"].map((group) => (
					<div className="m-nav-group" key={group}>
						<span className="m-nav-label">{group}</span>
						{navigation
							.filter(
								(n) =>
									n.group === group &&
									(n.key !== "financials" ||
										data.permissions.canViewFinancials),
							)
							.map((item) => (
								<Link
									key={item.key}
									href={`/concierge${item.key ? `/${item.key}` : ""}`}
									onClick={onClose}
									className={`m-nav-item ${active === item.key ? "active" : ""}`}
									aria-current={active === item.key ? "page" : undefined}
								>
									<Icon name={item.icon} size={18} />
									<span>{item.label}</span>
									{item.key === "inbox" && data.stats.pendingIntake > 0 && (
										<b>{data.stats.pendingIntake}</b>
									)}
								</Link>
							))}
					</div>
				))}
			</nav>
			<div className="m-sidebar-bottom">
				<div className="m-assistant-note">
					<Icon name="sparkle" size={17} />
					<span>
						A little less administration.
						<br />
						<strong>A little more exceptional.</strong>
					</span>
				</div>
				<Link
					className={`m-nav-item ${active === "connections" ? "active" : ""}`}
					href="/concierge/connections"
				>
					<Icon name="settings" />
					<span>Settings & connections</span>
				</Link>
				<div className="m-profile">
					<Avatar name={displayName} />
					<div>
						{displayName}
						<small>
							{data.permissions.role === "owner"
								? "Workspace owner"
								: data.permissions.role === "admin"
									? "Operations manager"
									: "Concierge"}
						</small>
					</div>
					<button
						type="button"
						aria-label="Switch demonstration user"
						onClick={() => go("sign-in")}
					>
						<Icon name="more" />
					</button>
				</div>
				<span className="m-demo-note">DEMONSTRATION · FICTIONAL DATA</span>
			</div>
		</aside>
	);
}

function WorkspaceView({
	section,
	displayName,
	...props
}: ViewProps & { section: string[]; displayName: string }) {
	switch (section[0] || "") {
		case "":
			return (
				<Overview
					{...props}
					firstName={displayName.split(" ")[0] || "Concierge"}
				/>
			);
		case "journeys":
			return section[1] ? (
				<JourneyDetail key={section[1]} {...props} caseId={section[1]} />
			) : (
				<JourneyList {...props} />
			);
		case "inbox":
			return (
				<InboxView
					key={section[1] || "inbox"}
					{...props}
					selectedId={section[1]}
				/>
			);
		case "clients":
			return <ClientsView {...props} />;
		case "suppliers":
			return <SuppliersView {...props} />;
		case "tasks":
			return <TasksView {...props} />;
		case "documents":
			return <DocumentsView {...props} />;
		case "financials":
			return <FinancialsView {...props} />;
		case "connections":
			return <ConnectionsView {...props} />;
		default:
			return (
				<Empty
					title="Page not found"
					description="Return to the workspace to continue."
				>
					<Button onClick={() => props.go("")}>Back to overview</Button>
				</Empty>
			);
	}
}

function ModalHost({
	modal,
	data,
	execute,
	finish,
	go,
}: {
	modal: ModalState;
	data: Snapshot;
	execute: Execute;
	finish: () => void;
	go: (path: string) => void;
}) {
	return (
		<>
			<Modal
				open={modal?.kind === "new-client"}
				onClose={finish}
				title="A new relationship."
				description="Begin with the details that make their experience personal."
			>
				{modal?.kind === "new-client" && (
					<NewClientForm
						canManageFinancials={data.permissions.canManageFinancials}
						execute={execute}
						onDone={() => {
							finish();
							go("clients");
						}}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "new-supplier"}
				onClose={finish}
				title="Meet your next partner."
				description="Bring a new specialist into your trusted network."
				wide
			>
				{modal?.kind === "new-supplier" && (
					<NewSupplierForm
						execute={execute}
						onDone={() => {
							finish();
							go("suppliers");
						}}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "case"}
				onClose={finish}
				title="An exceptional journey starts here."
				description="Create a master case for your client. Add services as the details take shape."
				wide
			>
				{modal?.kind === "case" && (
					<NewCaseForm
						data={data}
						execute={execute}
						onDone={(id) => {
							finish();
							go(`journeys/${id}`);
						}}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "capture"}
				onClose={finish}
				title="Capture the moment."
				description="A note, an email, a conversation. Keep the context, without the administration."
				wide
			>
				{modal?.kind === "capture" && (
					<CaptureForm
						caseId={modal.caseId}
						data={data}
						execute={execute}
						onDone={(id) => {
							finish();
							go(`inbox/${id}`);
						}}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "service"}
				onClose={finish}
				title={
					modal?.kind === "service" && modal.service
						? "Refine the details."
						: "Add a service."
				}
				description="Every confirmation and condition belongs to the journey."
				wide
			>
				{modal?.kind === "service" && (
					<ServiceForm
						data={data}
						caseId={modal.caseId}
						service={modal.service}
						execute={execute}
						onDone={finish}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "client"}
				onClose={finish}
				title="Know your client."
				description="Preferences travel with the client, from one journey to the next."
			>
				{modal?.kind === "client" && (
					<ClientForm
						canManageFinancials={data.permissions.canManageFinancials}
						client={modal.client}
						execute={execute}
						onDone={finish}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "supplier"}
				onClose={finish}
				title="An exceptional partnership."
				description="Keep the contacts, terms and details your team relies on."
				wide
			>
				{modal?.kind === "supplier" && (
					<SupplierForm
						supplier={modal.supplier}
						execute={execute}
						onDone={finish}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "task"}
				onClose={finish}
				title="Nothing left to chance."
				description="Give the next step a clear owner and due date."
			>
				{modal?.kind === "task" && (
					<TaskForm
						data={data}
						caseId={modal.caseId}
						execute={execute}
						onDone={finish}
					/>
				)}
			</Modal>
			<Modal
				open={modal?.kind === "search"}
				onClose={finish}
				title="Find anything."
				description="Search journeys, clients and partners."
			>
				{modal?.kind === "search" && (
					<Search
						data={data}
						go={(path) => {
							finish();
							go(path);
						}}
					/>
				)}
			</Modal>
		</>
	);
}
