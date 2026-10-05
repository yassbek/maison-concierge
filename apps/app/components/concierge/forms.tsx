"use client";

import {
	MaisonButton,
	MaisonField,
	MaisonIcon,
	MaisonInput,
	MaisonSelect,
	MaisonTextarea,
} from "@crm/ui/components/concierge";
import {
	conciergeCommand,
	priority,
	serviceCategory,
	serviceStatus,
} from "@crm/validation/concierge";
import { type ReactNode, useRef, useState } from "react";
import { ZodError } from "zod";
import {
	type Client,
	type Execute,
	money,
	type Service,
	type Snapshot,
	type Supplier,
	statusLabels,
} from "./types";

function value(form: FormData, name: string) {
	const entry = form.get(name);
	return typeof entry === "string" ? entry.trim() : "";
}

function localDate(value: string) {
	const date = new Date(value);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function instant(form: FormData, name: string) {
	const input = value(form, name);
	const date = new Date(input);
	if (!Number.isFinite(date.getTime()))
		throw new Error("Enter a valid date and time.");
	if (localDate(date.toISOString()) !== input.slice(0, 16))
		throw new Error(
			"This local time does not exist because the clocks change. Choose another time.",
		);
	return date.toISOString();
}

function Form({
	children,
	save,
	label,
}: {
	children: ReactNode;
	save: (form: FormData) => Promise<void>;
	label: string;
}) {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const lock = useRef(false);
	return (
		<form
			className="m-form"
			aria-busy={saving}
			onSubmit={async (event) => {
				event.preventDefault();
				if (lock.current) return;
				const form = new FormData(event.currentTarget);
				lock.current = true;
				setSaving(true);
				setError("");
				try {
					await save(form);
				} catch (cause) {
					setError(
						cause instanceof ZodError
							? (cause.issues[0]?.message ?? "Check the form fields.")
							: cause instanceof Error
								? cause.message
								: "Save fails. Try again.",
					);
				} finally {
					lock.current = false;
					setSaving(false);
				}
			}}
		>
			<fieldset className="m-form-grid" disabled={saving}>
				{children}
			</fieldset>
			{error && (
				<p className="m-form-error" role="alert">
					{error}
				</p>
			)}
			<div className="m-form-actions">
				<MaisonButton type="submit" disabled={saving}>
					{saving && <MaisonIcon name="loading" />}
					{saving ? "Saving…" : label}
				</MaisonButton>
			</div>
		</form>
	);
}

function Assignee({
	data,
	defaultValue,
}: {
	data: Snapshot;
	defaultValue?: string | null;
}) {
	return (
		<MaisonField label="Assigned concierge">
			<MaisonSelect name="assigneeId" defaultValue={defaultValue ?? ""}>
				<option value="">Unassigned</option>
				{data.team.map((member) => (
					<option key={member.id} value={member.id}>
						{member.name}
					</option>
				))}
			</MaisonSelect>
		</MaisonField>
	);
}

function Priority() {
	return (
		<MaisonField label="Priority">
			<MaisonSelect name="priority" defaultValue="normal">
				{priority.options.map((option) => (
					<option key={option} value={option}>
						{option.charAt(0).toUpperCase() + option.slice(1)}
					</option>
				))}
			</MaisonSelect>
		</MaisonField>
	);
}

function CaseChoice({
	data,
	caseId,
	optional = false,
}: {
	data: Snapshot;
	caseId?: string;
	optional?: boolean;
}) {
	return (
		<MaisonField label="Case">
			<MaisonSelect
				name="caseId"
				defaultValue={caseId ?? ""}
				required={!optional}
			>
				<option value="">
					{optional ? "Assign during review" : "Select a case"}
				</option>
				{data.cases.map((item) => (
					<option key={item.id} value={item.id}>
						{item.reference} · {item.title}
					</option>
				))}
			</MaisonSelect>
		</MaisonField>
	);
}

function TimeHint() {
	return (
		<p className="m-helper m-full">
			Enter dates in your browser timezone (
			{Intl.DateTimeFormat().resolvedOptions().timeZone}). Dates save as exact
			instants.
		</p>
	);
}

export function NewCaseForm({
	data,
	execute,
	onDone,
}: {
	data: Snapshot;
	execute: Execute;
	onDone: (id: string) => void;
}) {
	return (
		<Form
			label="Create case"
			save={async (form) => {
				const startsAt = instant(form, "startsAt");
				const endsAt = instant(form, "endsAt");
				if (endsAt < startsAt)
					throw new Error("Departure must follow arrival.");
				const command = conciergeCommand.parse({
					type: "createCase",
					title: value(form, "title"),
					clientId: value(form, "clientId"),
					destination: value(form, "destination"),
					startsAt,
					endsAt,
					priority: value(form, "priority"),
					assigneeId: value(form, "assigneeId") || null,
					notes: value(form, "notes"),
				});
				const result = await execute(command);
				onDone(result.id);
			}}
		>
			<MaisonField label="Client">
				<MaisonSelect name="clientId" required defaultValue="">
					<option value="">Select a client</option>
					{data.clients.map((client) => (
						<option key={client.id} value={client.id}>
							{client.name}
						</option>
					))}
				</MaisonSelect>
			</MaisonField>
			<MaisonField label="Case title">
				<MaisonInput
					name="title"
					required
					maxLength={200}
					placeholder="A week on the Riviera"
				/>
			</MaisonField>
			<MaisonField label="Destination">
				<MaisonInput
					name="destination"
					required
					maxLength={300}
					placeholder="French Riviera, France"
				/>
			</MaisonField>
			<Priority />
			<MaisonField label="Arrival">
				<MaisonInput name="startsAt" type="datetime-local" required />
			</MaisonField>
			<MaisonField label="Departure">
				<MaisonInput name="endsAt" type="datetime-local" required />
			</MaisonField>
			<TimeHint />
			<Assignee data={data} defaultValue={data.permissions.userId} />
			<div className="m-full">
				<MaisonField label="Internal notes">
					<MaisonTextarea
						name="notes"
						maxLength={12000}
						placeholder="Guest preferences, context, and priorities"
					/>
				</MaisonField>
			</div>
		</Form>
	);
}

export function ServiceForm({
	data,
	caseId,
	service,
	execute,
	onDone,
}: {
	data: Snapshot;
	caseId: string;
	service?: Service;
	execute: Execute;
	onDone: () => void;
}) {
	const currentCase = data.cases.find((item) => item.id === caseId);
	const client = data.clients.find((item) => item.id === currentCase?.clientId);
	const [cost, setCost] = useState(
		service?.costCents == null ? "" : (service.costCents / 100).toFixed(2),
	);
	const [sell, setSell] = useState(
		service ? (service.sellCents / 100).toFixed(2) : "",
	);
	const [markup, setMarkup] = useState(
		String(client?.defaultMarkupPercent ?? 0),
	);
	const [status, setStatus] = useState<Service["status"]>(
		service?.status ?? "requested",
	);
	const [calculatorError, setCalculatorError] = useState("");
	const costNumber = Number(cost);
	const sellNumber = Number(sell);
	const hasAmounts =
		cost !== "" &&
		sell !== "" &&
		Number.isFinite(costNumber) &&
		Number.isFinite(sellNumber);
	const actualMarkup =
		hasAmounts && costNumber > 0
			? ((sellNumber - costNumber) / costNumber) * 100
			: null;
	const margin =
		hasAmounts && sellNumber > 0
			? ((sellNumber - costNumber) / sellNumber) * 100
			: null;
	return (
		<Form
			label={service ? "Save service" : "Add service"}
			save={async (form) => {
				const timezone = value(form, "timezone");
				try {
					new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
				} catch {
					throw new Error("Enter a valid timezone, such as Europe/Paris.");
				}
				if (status === "confirmed" && !value(form, "confirmationReference"))
					throw new Error(
						"Add the supplier confirmation reference before confirming.",
					);
				const startsAt = instant(form, "startsAt");
				const endsAt = value(form, "endsAt") ? instant(form, "endsAt") : null;
				if (endsAt && endsAt < startsAt)
					throw new Error("End time must follow start time.");
				const command = conciergeCommand.parse({
					type: "upsertService",
					service: {
						...(service ? { id: service.id } : {}),
						caseId,
						title: value(form, "title"),
						category: value(form, "category"),
						status,
						supplierId: value(form, "supplierId") || null,
						startsAt,
						endsAt,
						location: value(form, "location"),
						timezone,
						passengers: Number(value(form, "passengers")),
						currency: "EUR",
						sellCents: Math.round(sellNumber * 100),
						...(data.permissions.canManageFinancials && cost !== ""
							? { costCents: Math.round(costNumber * 100) }
							: {}),
						supplierTerms: value(form, "supplierTerms"),
						clientTerms: value(form, "clientTerms"),
						availability: value(form, "availability"),
						confirmationReference: value(form, "confirmationReference"),
						clientNotes: value(form, "clientNotes"),
						supplierNotes: value(form, "supplierNotes"),
					},
				});
				await execute(command);
				onDone();
			}}
		>
			<MaisonField label="Service title">
				<MaisonInput
					name="title"
					required
					maxLength={200}
					defaultValue={service?.title}
					placeholder="Private airport transfer"
				/>
			</MaisonField>
			<MaisonField label="Category">
				<MaisonSelect
					name="category"
					defaultValue={service?.category ?? "transfer"}
				>
					{serviceCategory.options.map((category) => (
						<option key={category} value={category}>
							{category.charAt(0).toUpperCase() + category.slice(1)}
						</option>
					))}
				</MaisonSelect>
			</MaisonField>
			<MaisonField label="Supplier">
				<MaisonSelect
					name="supplierId"
					defaultValue={service?.supplierId ?? ""}
				>
					<option value="">Not selected</option>
					{data.suppliers
						.filter((item) => item.active || item.id === service?.supplierId)
						.map((supplier) => (
							<option key={supplier.id} value={supplier.id}>
								{supplier.name}
							</option>
						))}
				</MaisonSelect>
			</MaisonField>
			<MaisonField label="Status">
				<MaisonSelect
					name="status"
					value={status}
					onChange={(event) =>
						setStatus(serviceStatus.parse(event.target.value))
					}
				>
					{serviceStatus.options.map((option) => (
						<option key={option} value={option}>
							{statusLabels[option]}
						</option>
					))}
				</MaisonSelect>
			</MaisonField>
			<MaisonField label="Start">
				<MaisonInput
					name="startsAt"
					type="datetime-local"
					required
					defaultValue={
						service
							? localDate(service.startsAt)
							: currentCase
								? localDate(currentCase.startsAt)
								: ""
					}
				/>
			</MaisonField>
			<MaisonField label="End (optional)">
				<MaisonInput
					name="endsAt"
					type="datetime-local"
					defaultValue={service?.endsAt ? localDate(service.endsAt) : ""}
				/>
			</MaisonField>
			<TimeHint />
			<MaisonField
				label="Display timezone"
				hint="The itinerary displays this service in this timezone."
			>
				<MaisonInput
					name="timezone"
					required
					maxLength={80}
					defaultValue={service?.timezone ?? "Europe/Paris"}
					placeholder="Europe/Paris"
				/>
			</MaisonField>
			<MaisonField label="Guests">
				<MaisonInput
					name="passengers"
					type="number"
					min={1}
					max={1000}
					step={1}
					required
					defaultValue={service?.passengers ?? 1}
				/>
			</MaisonField>
			<MaisonField label="Location">
				<MaisonInput
					name="location"
					maxLength={300}
					defaultValue={service?.location ?? currentCase?.destination}
				/>
			</MaisonField>
			<MaisonField label="Availability">
				<MaisonInput
					name="availability"
					maxLength={1000}
					defaultValue={service?.availability}
					placeholder="Awaiting supplier availability"
				/>
			</MaisonField>
			<div className="m-full">
				<MaisonField
					label="Confirmation reference"
					hint="A reference is required for Confirmed status. Saving does not contact the supplier."
				>
					<MaisonInput
						name="confirmationReference"
						maxLength={300}
						required={status === "confirmed"}
						defaultValue={service?.confirmationReference}
						placeholder="Supplier booking reference"
					/>
				</MaisonField>
			</div>
			<h3 className="m-subtitle m-full">Pricing · EUR</h3>
			{data.permissions.canManageFinancials ? (
				<MaisonField
					label="Supplier cost (€)"
					hint={
						service?.costCents == null
							? "Leave blank until the cost is known. Zero means no supplier charge."
							: "Leave blank to keep the recorded cost."
					}
				>
					<MaisonInput
						name="cost"
						type="number"
						min={0}
						max={10000000}
						step="0.01"
						value={cost}
						onChange={(event) => setCost(event.target.value)}
					/>
				</MaisonField>
			) : data.permissions.canViewFinancials && service ? (
				<p className="m-helper">
					Supplier cost: {money(service.costCents)}. Your role cannot edit
					costs.
				</p>
			) : (
				<p className="m-helper">Supplier costs are restricted for your role.</p>
			)}
			<MaisonField label="Client price (€)">
				<MaisonInput
					name="sell"
					type="number"
					min={0}
					max={10000000}
					step="0.01"
					required
					value={sell}
					onChange={(event) => setSell(event.target.value)}
				/>
			</MaisonField>
			{data.permissions.canManageFinancials && (
				<>
					<MaisonField
						label="Markup on cost (%)"
						hint="Client price = cost × (1 + markup ÷ 100)."
					>
						<MaisonInput
							type="number"
							min={0}
							max={300}
							step="0.01"
							value={markup}
							onChange={(event) => setMarkup(event.target.value)}
						/>
					</MaisonField>
					<div className="m-form-actions">
						<MaisonButton
							type="button"
							tone="secondary"
							onClick={() => {
								if (
									cost === "" ||
									!Number.isFinite(costNumber) ||
									costNumber < 0 ||
									markup === "" ||
									!Number.isFinite(Number(markup)) ||
									Number(markup) < 0 ||
									Number(markup) > 300
								) {
									setCalculatorError(
										"Enter a cost and a markup from 0 to 300%.",
									);
									return;
								}
								setCalculatorError("");
								setSell((costNumber * (1 + Number(markup) / 100)).toFixed(2));
							}}
						>
							Apply markup
						</MaisonButton>
					</div>
					{calculatorError && (
						<p className="m-form-error m-full" role="alert">
							{calculatorError}
						</p>
					)}
				</>
			)}
			{data.permissions.canViewFinancials && (
				<p className="m-helper m-full" aria-live="polite">
					Actual markup on cost:{" "}
					{actualMarkup == null
						? "Not recorded"
						: `${actualMarkup.toFixed(1)}%`}
					. Margin on client price:{" "}
					{margin == null ? "Not recorded" : `${margin.toFixed(1)}%`}. Margin =
					(price − cost) ÷ price.
				</p>
			)}
			<MaisonField label="Supplier terms">
				<MaisonTextarea
					name="supplierTerms"
					maxLength={12000}
					defaultValue={service?.supplierTerms}
					placeholder="Payment and cancellation terms"
				/>
			</MaisonField>
			<MaisonField label="Client terms">
				<MaisonTextarea
					name="clientTerms"
					maxLength={12000}
					defaultValue={service?.clientTerms}
					placeholder="Terms agreed with the client"
				/>
			</MaisonField>
			<MaisonField label="Client notes" hint="Included in client briefs.">
				<MaisonTextarea
					name="clientNotes"
					maxLength={12000}
					defaultValue={service?.clientNotes}
				/>
			</MaisonField>
			<MaisonField label="Supplier notes" hint="Included in supplier briefs.">
				<MaisonTextarea
					name="supplierNotes"
					maxLength={12000}
					defaultValue={service?.supplierNotes}
				/>
			</MaisonField>
		</Form>
	);
}

export function ClientForm({
	client,
	execute,
	onDone,
	canManageFinancials = false,
}: {
	client: Client;
	execute: Execute;
	onDone: () => void;
	canManageFinancials?: boolean;
}) {
	return (
		<Form
			label="Save client preferences"
			save={async (form) => {
				await execute(
					conciergeCommand.parse({
						type: "updateClient",
						clientId: client.id,
						preferences: value(form, "preferences"),
						dietary: value(form, "dietary"),
						notes: value(form, "notes"),
						...(!canManageFinancials
							? {}
							: {
									defaultMarkupPercent: Number(
										value(form, "defaultMarkupPercent"),
									),
								}),
					}),
				);
				onDone();
			}}
		>
			<div className="m-full">
				<MaisonField label="Travel and service preferences">
					<MaisonTextarea
						name="preferences"
						maxLength={12000}
						defaultValue={client.preferences}
					/>
				</MaisonField>
			</div>
			<MaisonField label="Dietary requirements">
				<MaisonTextarea
					name="dietary"
					maxLength={12000}
					defaultValue={client.dietary}
				/>
			</MaisonField>
			<MaisonField label="Internal client notes">
				<MaisonTextarea
					name="notes"
					maxLength={12000}
					defaultValue={client.notes}
				/>
			</MaisonField>
			{canManageFinancials && (
				<MaisonField
					label="Default markup on cost (%)"
					hint="Applied manually in the service price calculator."
				>
					<MaisonInput
						name="defaultMarkupPercent"
						type="number"
						min={0}
						max={300}
						step={1}
						required
						defaultValue={client.defaultMarkupPercent ?? 0}
					/>
				</MaisonField>
			)}
		</Form>
	);
}

export function SupplierForm({
	supplier,
	execute,
	onDone,
}: {
	supplier: Supplier;
	execute: Execute;
	onDone: () => void;
}) {
	return (
		<Form
			label="Save supplier"
			save={async (form) => {
				if (!form.getAll("categories").length)
					throw new Error("Select at least one service category.");
				await execute(
					conciergeCommand.parse({
						type: "updateSupplier",
						supplierId: supplier.id,
						contactName: value(form, "contactName"),
						email: value(form, "email"),
						phone: value(form, "phone"),
						location: value(form, "location"),
						categories: form.getAll("categories"),
						notes: value(form, "notes"),
						cancellationTerms: value(form, "cancellationTerms"),
						paymentTerms: value(form, "paymentTerms"),
					}),
				);
				onDone();
			}}
		>
			<SupplierFields supplier={supplier} />
		</Form>
	);
}

export function TaskForm({
	data,
	caseId,
	execute,
	onDone,
}: {
	data: Snapshot;
	caseId?: string;
	execute: Execute;
	onDone: () => void;
}) {
	return (
		<Form
			label="Create task"
			save={async (form) => {
				await execute(
					conciergeCommand.parse({
						type: "createTask",
						caseId: value(form, "caseId"),
						title: value(form, "title"),
						assigneeId: value(form, "assigneeId") || null,
						dueAt: instant(form, "dueAt"),
						priority: value(form, "priority"),
					}),
				);
				onDone();
			}}
		>
			<div className="m-full">
				<MaisonField label="Task">
					<MaisonInput
						name="title"
						required
						maxLength={200}
						placeholder="Confirm the arrival transfer"
					/>
				</MaisonField>
			</div>
			<CaseChoice data={data} caseId={caseId} />
			<Assignee data={data} defaultValue={data.permissions.userId} />
			<MaisonField label="Due date and time">
				<MaisonInput name="dueAt" type="datetime-local" required />
			</MaisonField>
			<Priority />
			<TimeHint />
		</Form>
	);
}

function SupplierFields({ supplier }: { supplier?: Supplier }) {
	return (
		<>
			<MaisonField label="Contact name">
				<MaisonInput
					name="contactName"
					maxLength={200}
					autoComplete="name"
					defaultValue={supplier?.contactName}
				/>
			</MaisonField>
			<MaisonField label="Email">
				<MaisonInput
					name="email"
					type="email"
					autoComplete="email"
					required
					defaultValue={supplier?.email}
				/>
			</MaisonField>
			<MaisonField label="Phone">
				<MaisonInput
					name="phone"
					type="tel"
					autoComplete="tel"
					maxLength={80}
					defaultValue={supplier?.phone}
				/>
			</MaisonField>
			<MaisonField label="Location">
				<MaisonInput
					name="location"
					maxLength={300}
					defaultValue={supplier?.location}
				/>
			</MaisonField>
			<div className="m-full">
				<p className="m-subtitle">Service categories</p>
				<div className="m-form-grid">
					{serviceCategory.options.map((category) => (
						<label key={category}>
							<input
								name="categories"
								type="checkbox"
								value={category}
								defaultChecked={
									supplier?.categories.includes(category) ?? false
								}
							/>{" "}
							{category.charAt(0).toUpperCase() + category.slice(1)}
						</label>
					))}
				</div>
			</div>
			<MaisonField label="Cancellation terms">
				<MaisonTextarea
					name="cancellationTerms"
					maxLength={12000}
					defaultValue={supplier?.cancellationTerms}
				/>
			</MaisonField>
			<MaisonField label="Payment terms">
				<MaisonTextarea
					name="paymentTerms"
					maxLength={12000}
					defaultValue={supplier?.paymentTerms}
				/>
			</MaisonField>
			<div className="m-full">
				<MaisonField label="Internal supplier notes">
					<MaisonTextarea
						name="notes"
						maxLength={12000}
						defaultValue={supplier?.notes}
					/>
				</MaisonField>
			</div>
		</>
	);
}

export function NewClientForm({
	canManageFinancials = false,
	execute,
	onDone,
}: {
	canManageFinancials?: boolean;
	execute: Execute;
	onDone: (id: string) => void;
}) {
	return (
		<Form
			label="Create client"
			save={async (form) => {
				const command = conciergeCommand.parse({
					type: "createClient",
					firstName: value(form, "firstName"),
					lastName: value(form, "lastName"),
					email: value(form, "email"),
					phone: value(form, "phone"),
					tier: value(form, "tier"),
					preferences: value(form, "preferences"),
					dietary: value(form, "dietary"),
					notes: value(form, "notes"),
					...(canManageFinancials
						? {
								defaultMarkupPercent: Number(
									value(form, "defaultMarkupPercent"),
								),
							}
						: {}),
				});
				const result = await execute(command);
				onDone(result.id);
			}}
		>
			<MaisonField label="First name">
				<MaisonInput
					name="firstName"
					autoComplete="given-name"
					maxLength={100}
					required
				/>
			</MaisonField>
			<MaisonField label="Last name">
				<MaisonInput
					name="lastName"
					autoComplete="family-name"
					maxLength={100}
				/>
			</MaisonField>
			<MaisonField label="Email">
				<MaisonInput name="email" type="email" autoComplete="email" required />
			</MaisonField>
			<MaisonField label="Phone">
				<MaisonInput
					name="phone"
					type="tel"
					autoComplete="tel"
					maxLength={80}
				/>
			</MaisonField>
			<MaisonField label="Client tier">
				<MaisonSelect name="tier" defaultValue="Private">
					<option>Private</option>
					<option>Signature</option>
					<option>VIP</option>
				</MaisonSelect>
			</MaisonField>
			{canManageFinancials && (
				<MaisonField label="Default markup on cost (%)">
					<MaisonInput
						name="defaultMarkupPercent"
						type="number"
						min={0}
						max={300}
						step={1}
						required
						defaultValue={0}
					/>
				</MaisonField>
			)}
			<MaisonField label="Travel and service preferences">
				<MaisonTextarea name="preferences" maxLength={12000} />
			</MaisonField>
			<MaisonField label="Dietary requirements">
				<MaisonTextarea name="dietary" maxLength={12000} />
			</MaisonField>
			<div className="m-full">
				<MaisonField label="Internal client notes">
					<MaisonTextarea name="notes" maxLength={12000} />
				</MaisonField>
			</div>
		</Form>
	);
}

export function NewSupplierForm({
	execute,
	onDone,
}: {
	execute: Execute;
	onDone: (id: string) => void;
}) {
	return (
		<Form
			label="Create supplier"
			save={async (form) => {
				if (!form.getAll("categories").length)
					throw new Error("Select at least one service category.");
				const command = conciergeCommand.parse({
					type: "createSupplier",
					name: value(form, "name"),
					contactName: value(form, "contactName"),
					email: value(form, "email"),
					phone: value(form, "phone"),
					location: value(form, "location"),
					categories: form.getAll("categories"),
					notes: value(form, "notes"),
					cancellationTerms: value(form, "cancellationTerms"),
					paymentTerms: value(form, "paymentTerms"),
				});
				const result = await execute(command);
				onDone(result.id);
			}}
		>
			<div className="m-full">
				<MaisonField label="Supplier name">
					<MaisonInput
						name="name"
						autoComplete="organization"
						required
						maxLength={200}
					/>
				</MaisonField>
			</div>
			<SupplierFields />
		</Form>
	);
}
