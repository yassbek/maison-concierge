import "@crm/env/load";
import { db } from "../src/client";

const url = new URL(process.env.DATABASE_URL ?? "");
if (
	!["localhost", "127.0.0.1", "::1"].includes(url.hostname) &&
	!process.argv.includes("--allow-remote-fixtures")
)
	throw new Error(
		"Remote fixture seeding requires --allow-remote-fixtures and a dedicated pilot database.",
	);

const users = [
	{
		id: "maison-owner",
		name: "Camille Laurent",
		email: "concierge@maison.example",
		role: "owner",
	},
	{
		id: "maison-alex",
		name: "Alex Morgan",
		email: "alex@maison.example",
		role: "member",
	},
	{
		id: "maison-sam",
		name: "Sam Delacroix",
		email: "sam@maison.example",
		role: "admin",
	},
];
const clients = [
	{
		id: "client-moreau",
		firstName: "Elise",
		lastName: "Moreau",
		tier: "Returning client",
		preferences:
			"Quiet villas; private arrivals; French-speaking drivers. Repeat autumn stay.",
		dietary: "Vegetarian. No shellfish in shared preparation.",
		notes: "Fictional demo client. Assistant coordinates arrival details.",
		defaultMarkupPercent: 22,
	},
	{
		id: "client-hartmann",
		firstName: "Leon",
		lastName: "Hartmann",
		tier: "Private office",
		preferences:
			"Aisle seat; black executive sedan; invoices through the family office.",
		dietary: "No dietary requirements recorded.",
		notes:
			"Fictional demo client. Keep meeting itinerary separate from leisure.",
		defaultMarkupPercent: 18,
	},
	{
		id: "client-bennett",
		firstName: "Sofia",
		lastName: "Bennett",
		tier: "Returning client",
		preferences: "Sea views; late check-out; English-speaking crew.",
		dietary: "Nut allergy. Confirm directly with the chef.",
		notes: "Fictional demo client. Travelling with two children.",
		defaultMarkupPercent: 25,
	},
	{
		id: "client-chen",
		firstName: "Adrian",
		lastName: "Chen",
		tier: "Private client",
		preferences: "Contemporary art; boutique hotels; quiet dining rooms.",
		dietary: "Pescatarian.",
		notes: "Fictional demo client. First booking with Maison.",
		defaultMarkupPercent: 20,
	},
	{
		id: "client-silva",
		firstName: "Ines",
		lastName: "Silva",
		tier: "Returning client",
		preferences:
			"Architecture tours; Portuguese-speaking guide when available.",
		dietary: "Gluten-free request.",
		notes: "Fictional demo client. Anniversary trip.",
		defaultMarkupPercent: 24,
	},
	{
		id: "client-winter",
		firstName: "Oscar",
		lastName: "Winter",
		tier: "Private office",
		preferences: "Flexible departure windows; aircraft cabin for six.",
		dietary: "No dietary requirements recorded.",
		notes: "Fictional demo client. New request awaits dates.",
		defaultMarkupPercent: 15,
	},
];
const suppliers = [
	{
		id: "supplier-atlas",
		name: "Atlas Private Mobility",
		contactName: "Nadia Amrani",
		location: "Marrakech",
		categories: ["transfer"],
		cancellationTerms: "Free cancellation until 24 hours before departure.",
		paymentTerms: "Payment seven days after service.",
		notes:
			"Fictional supplier. Two Mercedes V-Class vehicles; child seats on request.",
	},
	{
		id: "supplier-flight",
		name: "Aero Maison Charter",
		contactName: "Thomas Reed",
		location: "Europe / North Africa",
		categories: ["flight"],
		cancellationTerms:
			"50% cancellation fee after written confirmation; 100% inside 48 hours.",
		paymentTerms: "Full prepayment before aircraft release.",
		notes:
			"Fictional supplier. Slot availability requires written confirmation.",
	},
	{
		id: "supplier-villa",
		name: "Dar Serein Collection",
		contactName: "Salma Idrissi",
		location: "Marrakech",
		categories: ["villa"],
		cancellationTerms:
			"Non-refundable deposit. Full balance due 14 days before arrival.",
		paymentTerms: "50% deposit on booking; balance before arrival.",
		notes: "Fictional supplier. Pool heating requires 48 hours notice.",
	},
	{
		id: "supplier-milan",
		name: "Milano Privato",
		contactName: "Luca Bianchi",
		location: "Milan",
		categories: ["transfer", "dining", "experience"],
		cancellationTerms: "Free cancellation until 48 hours before service.",
		paymentTerms: "30% deposit; balance after service.",
		notes:
			"Fictional supplier. Local dispatcher available during service hours.",
	},
	{
		id: "supplier-riviera",
		name: "Riviera Quiet Stays",
		contactName: "Claire Dumas",
		location: "Côte d’Azur",
		categories: ["villa", "hotel"],
		cancellationTerms: "Non-refundable inside seven days.",
		paymentTerms: "Full payment seven days before arrival.",
		notes: "Fictional supplier. Villa access code arrives on arrival day.",
	},
	{
		id: "supplier-yacht",
		name: "Azur Private Yachting",
		contactName: "Marc Bellamy",
		location: "Antibes",
		categories: ["yacht", "transfer"],
		cancellationTerms:
			"Weather cancellation permits rebooking; other cancellations are non-refundable inside 72 hours.",
		paymentTerms: "Charter fee plus provisioning allowance before departure.",
		notes: "Fictional supplier. Captain decides weather suitability.",
	},
	{
		id: "supplier-atelier",
		name: "Atelier Local Experiences",
		contactName: "Maya Rossi",
		location: "Paris / Marrakech",
		categories: ["dining", "experience", "hotel"],
		cancellationTerms: "Free cancellation until 48 hours before service.",
		paymentTerms: "Payment on confirmation.",
		notes:
			"Fictional supplier. Menus and accessibility require reconfirmation.",
	},
];
const cases = [
	{
		id: "case-marrakech",
		reference: "MSN-26041",
		title: "A long weekend in Marrakech",
		clientId: "client-moreau",
		destination: "Marrakech, Morocco",
		startsAt: "2026-10-05T10:00:00Z",
		endsAt: "2026-10-09T17:00:00Z",
		status: "planning",
		priority: "urgent",
		assigneeId: "maison-owner",
		notes:
			"Returning client. Arrival time changed; reconcile aircraft, driver and villa access. Protect the client's cancellation commitment.",
	},
	{
		id: "case-milan",
		reference: "MSN-26042",
		title: "Milan, between meetings",
		clientId: "client-hartmann",
		destination: "Milan, Italy",
		startsAt: "2026-10-06T08:00:00Z",
		endsAt: "2026-10-08T16:00:00Z",
		status: "confirmed",
		priority: "high",
		assigneeId: "maison-alex",
		notes:
			"Family office booking. Driver waits at private terminal. Separate work meetings from leisure brief.",
	},
	{
		id: "case-riviera",
		reference: "MSN-26043",
		title: "The Riviera, at their own pace",
		clientId: "client-bennett",
		destination: "Côte d’Azur, France",
		startsAt: "2026-10-07T12:00:00Z",
		endsAt: "2026-10-12T10:00:00Z",
		status: "awaiting_client",
		priority: "high",
		assigneeId: "maison-sam",
		notes:
			"Four guests including two children. Chef must acknowledge nut allergy. Yacht weather decision remains open.",
	},
	{
		id: "case-paris",
		reference: "MSN-26044",
		title: "A private view of Paris",
		clientId: "client-chen",
		destination: "Paris, France",
		startsAt: "2026-10-08T12:00:00Z",
		endsAt: "2026-10-11T15:00:00Z",
		status: "planning",
		priority: "normal",
		assigneeId: "maison-alex",
		notes:
			"First booking. Send a concise welcome brief after the gallery confirms.",
	},
	{
		id: "case-anniversary",
		reference: "MSN-26045",
		title: "An anniversary in the Atlas",
		clientId: "client-silva",
		destination: "Marrakech / Atlas Mountains",
		startsAt: "2026-10-10T10:00:00Z",
		endsAt: "2026-10-12T18:00:00Z",
		status: "new",
		priority: "normal",
		assigneeId: "maison-owner",
		notes:
			"Keep the anniversary dinner a surprise. Check the weather before confirming the mountain excursion.",
	},
];
const segments = [
	{
		id: "service-marrakech-flight",
		caseId: "case-marrakech",
		title: "Private flight · Paris to Marrakech",
		category: "flight",
		supplierId: "supplier-flight",
		startsAt: "2026-10-05T10:00:00Z",
		endsAt: "2026-10-05T13:10:00Z",
		location: "Le Bourget → Marrakech Menara",
		timezone: "Africa/Casablanca",
		passengers: 4,
		status: "awaiting_confirmation",
		costCents: 1850000,
		sellCents: 2257000,
		availability:
			"Aircraft offered. Revised slot awaits operator confirmation.",
		supplierTerms:
			"50% cancellation fee after written confirmation; 100% inside 48 hours.",
		clientTerms: "Free cancellation until 48 hours before departure.",
		clientNotes: "Arrival time remains provisional.",
		supplierNotes:
			"Client requests 14:10 local arrival. Reconfirm slot before releasing the ground transfer.",
	},
	{
		id: "service-marrakech-transfer",
		caseId: "case-marrakech",
		title: "Arrival · private terminal to Dar Serein",
		category: "transfer",
		supplierId: "supplier-atlas",
		startsAt: "2026-10-05T13:40:00Z",
		endsAt: "2026-10-05T14:30:00Z",
		location: "Marrakech Menara → Palmeraie",
		timezone: "Africa/Casablanca",
		passengers: 4,
		status: "confirmed",
		costCents: 18000,
		sellCents: 24000,
		availability: "V-Class and French-speaking driver reserved.",
		confirmationReference: "ATLAS-1041",
		clientNotes: "Driver meets you in the arrivals lounge.",
		supplierNotes: "Track actual aircraft arrival. Four large bags.",
	},
	{
		id: "service-marrakech-villa",
		caseId: "case-marrakech",
		title: "Dar Serein · four nights",
		category: "villa",
		supplierId: "supplier-villa",
		startsAt: "2026-10-05T14:00:00Z",
		endsAt: "2026-10-09T10:00:00Z",
		location: "Palmeraie, Marrakech",
		timezone: "Africa/Casablanca",
		passengers: 4,
		status: "offered",
		costCents: 680000,
		sellCents: 829600,
		availability: "Held until 16:00 local on 5 October.",
		supplierTerms: "Non-refundable deposit. Full balance due before arrival.",
		clientTerms: "Cancellation refundable until 48 hours before arrival.",
		clientNotes: "Heated pool and private chef requested.",
		supplierNotes:
			"Confirm pool heating and early access before accepting offer.",
	},
	{
		id: "service-marrakech-dining",
		caseId: "case-marrakech",
		title: "Private courtyard dinner",
		category: "dining",
		supplierId: "supplier-atelier",
		startsAt: "2026-10-06T19:00:00Z",
		endsAt: "2026-10-06T21:00:00Z",
		location: "Medina, Marrakech",
		timezone: "Africa/Casablanca",
		passengers: 4,
		status: "sourcing",
		costCents: 42000,
		sellCents: 58000,
		availability: "Chef checking vegetarian menu.",
		clientNotes: "A private courtyard dinner with a vegetarian menu.",
		supplierNotes: "No shellfish in shared preparation.",
	},
	{
		id: "service-milan-arrival",
		caseId: "case-milan",
		title: "Linate arrival · executive sedan",
		category: "transfer",
		supplierId: "supplier-milan",
		startsAt: "2026-10-06T08:30:00Z",
		endsAt: "2026-10-06T09:15:00Z",
		location: "Linate → Brera",
		timezone: "Europe/Rome",
		passengers: 2,
		status: "confirmed",
		costCents: 24000,
		sellCents: 32000,
		availability: "Vehicle and driver confirmed.",
		confirmationReference: "MIL-604",
		clientNotes: "Your driver waits outside the private terminal.",
	},
	{
		id: "service-milan-dining",
		caseId: "case-milan",
		title: "Private dining room · six guests",
		category: "dining",
		supplierId: "supplier-milan",
		startsAt: "2026-10-06T18:30:00Z",
		endsAt: "2026-10-06T21:00:00Z",
		location: "Brera, Milan",
		timezone: "Europe/Rome",
		passengers: 6,
		status: "confirmed",
		costCents: 90000,
		sellCents: 112000,
		availability: "Private room reserved.",
		confirmationReference: "MIL-D621",
		clientNotes: "A quiet room for your group.",
	},
	{
		id: "service-milan-departure",
		caseId: "case-milan",
		title: "Departure · hotel to Linate",
		category: "transfer",
		supplierId: "supplier-milan",
		startsAt: "2026-10-08T14:00:00Z",
		endsAt: "2026-10-08T14:45:00Z",
		location: "Brera → Linate",
		timezone: "Europe/Rome",
		passengers: 2,
		status: "confirmed",
		costCents: 24000,
		sellCents: 32000,
		availability: "Confirmed.",
		confirmationReference: "MIL-608",
	},
	{
		id: "service-riviera-villa",
		caseId: "case-riviera",
		title: "Cap d’Antibes villa · five nights",
		category: "villa",
		supplierId: "supplier-riviera",
		startsAt: "2026-10-07T13:00:00Z",
		endsAt: "2026-10-12T09:00:00Z",
		location: "Cap d’Antibes",
		timezone: "Europe/Paris",
		passengers: 4,
		status: "confirmed",
		costCents: 1250000,
		sellCents: 1562500,
		availability: "Villa reserved.",
		confirmationReference: "RQS-77",
		clientNotes: "Sea-view villa with a private garden.",
		supplierNotes:
			"Two adults and two children. Written chef acknowledgement of nut allergy required.",
	},
	{
		id: "service-riviera-yacht",
		caseId: "case-riviera",
		title: "A day at sea · Îles de Lérins",
		category: "yacht",
		supplierId: "supplier-yacht",
		startsAt: "2026-10-09T08:00:00Z",
		endsAt: "2026-10-09T16:00:00Z",
		location: "Port Vauban, Antibes",
		timezone: "Europe/Paris",
		passengers: 4,
		status: "offered",
		costCents: 460000,
		sellCents: 575000,
		availability:
			"Vessel available; captain reviews forecast 24 hours before departure.",
		supplierTerms: "Weather cancellation permits rebooking, not a refund.",
		clientTerms: "Full refund for weather cancellation.",
		clientNotes: "Route depends on the captain's weather assessment.",
	},
	{
		id: "service-riviera-arrival",
		caseId: "case-riviera",
		title: "Nice arrival · family transfer",
		category: "transfer",
		supplierId: "supplier-yacht",
		startsAt: "2026-10-07T11:30:00Z",
		endsAt: "2026-10-07T12:30:00Z",
		location: "Nice Airport → Cap d’Antibes",
		timezone: "Europe/Paris",
		passengers: 4,
		status: "awaiting_confirmation",
		costCents: 32000,
		sellCents: 42000,
		availability: "Child-seat sizes await client response.",
	},
	{
		id: "service-riviera-chef",
		caseId: "case-riviera",
		title: "Villa chef · arrival dinner",
		category: "dining",
		supplierId: "supplier-riviera",
		startsAt: "2026-10-07T17:00:00Z",
		endsAt: "2026-10-07T20:00:00Z",
		location: "Cap d’Antibes villa",
		timezone: "Europe/Paris",
		passengers: 4,
		status: "sourcing",
		costCents: 65000,
		sellCents: 82000,
		availability: "Chef acknowledgement of nut allergy outstanding.",
	},
	{
		id: "service-paris-hotel",
		caseId: "case-paris",
		title: "Left Bank suite · three nights",
		category: "hotel",
		supplierId: "supplier-atelier",
		startsAt: "2026-10-08T13:00:00Z",
		endsAt: "2026-10-11T10:00:00Z",
		location: "Saint-Germain-des-Prés, Paris",
		timezone: "Europe/Paris",
		passengers: 2,
		status: "offered",
		costCents: 285000,
		sellCents: 342000,
		availability: "Suite on option until 6 October.",
	},
	{
		id: "service-paris-gallery",
		caseId: "case-paris",
		title: "Before opening · a private gallery visit",
		category: "experience",
		supplierId: "supplier-atelier",
		startsAt: "2026-10-09T07:30:00Z",
		endsAt: "2026-10-09T09:00:00Z",
		location: "Le Marais, Paris",
		timezone: "Europe/Paris",
		passengers: 2,
		status: "sourcing",
		costCents: 55000,
		sellCents: 74000,
		availability: "Curator checking access.",
	},
	{
		id: "service-paris-dining",
		caseId: "case-paris",
		title: "Chef's table · seasonal tasting menu",
		category: "dining",
		supplierId: "supplier-atelier",
		startsAt: "2026-10-09T18:00:00Z",
		endsAt: "2026-10-09T21:00:00Z",
		location: "Paris 6e",
		timezone: "Europe/Paris",
		passengers: 2,
		status: "requested",
		costCents: 48000,
		sellCents: 62000,
		availability: "Pescatarian menu requested.",
	},
	{
		id: "service-anniversary-villa",
		caseId: "case-anniversary",
		title: "Atlas retreat · two nights",
		category: "villa",
		supplierId: "supplier-villa",
		startsAt: "2026-10-10T13:00:00Z",
		endsAt: "2026-10-12T10:00:00Z",
		location: "Ourika Valley",
		timezone: "Africa/Casablanca",
		passengers: 2,
		status: "sourcing",
		costCents: 180000,
		sellCents: 223200,
		availability: "Two properties under review.",
	},
	{
		id: "service-anniversary-transfer",
		caseId: "case-anniversary",
		title: "Airport to Atlas · scenic transfer",
		category: "transfer",
		supplierId: "supplier-atlas",
		startsAt: "2026-10-10T10:30:00Z",
		endsAt: "2026-10-10T12:00:00Z",
		location: "Marrakech Menara → Ourika Valley",
		timezone: "Africa/Casablanca",
		passengers: 2,
		status: "requested",
		costCents: 25000,
		sellCents: 35000,
		availability: "Vehicle requested.",
	},
	{
		id: "service-anniversary-dinner",
		caseId: "case-anniversary",
		title: "Anniversary dinner · mountain terrace",
		category: "dining",
		supplierId: "supplier-atelier",
		startsAt: "2026-10-11T18:00:00Z",
		endsAt: "2026-10-11T21:00:00Z",
		location: "Ourika Valley",
		timezone: "Africa/Casablanca",
		passengers: 2,
		status: "requested",
		costCents: 45000,
		sellCents: 65000,
		availability: "Terrace and gluten-free menu requested.",
		supplierNotes:
			"Surprise anniversary. Never mention the dinner in shared client messages before 11 October.",
	},
];

await db.$transaction(
	async (tx) => {
		await tx.organization.upsert({
			where: { id: "workspace" },
			create: {
				id: "workspace",
				name: "Maison",
				slug: "maison",
				website: "maison.example",
				createdAt: new Date(),
				metadata: JSON.stringify({ onboardedAt: new Date().toISOString() }),
			},
			update: {},
		});
		for (const { role, ...user } of users) {
			await tx.user.upsert({
				where: { id: user.id },
				create: { ...user, emailVerified: true },
				update: {},
			});
			await tx.member.upsert({
				where: {
					organizationId_userId: {
						organizationId: "workspace",
						userId: user.id,
					},
				},
				create: {
					id: `member-${user.id}`,
					userId: user.id,
					organizationId: "workspace",
					role,
					createdAt: new Date(),
				},
				update: {},
			});
		}
		for (const { firstName, lastName, ...client } of clients) {
			const contactId = `contact-${client.id}`;
			await tx.contact.upsert({
				where: { id: contactId },
				create: {
					id: contactId,
					firstName,
					lastName,
					email: `${firstName.toLowerCase()}@fictional.example`,
					phone: "+33 0 00 00 00 00",
					enrichmentStatus: "COMPLETE",
				},
				update: {},
			});
			await tx.clientProfile.upsert({
				where: { id: client.id },
				create: { ...client, contactId },
				update: {},
			});
		}
		for (const { name, ...supplier } of suppliers) {
			const companyId = `company-${supplier.id}`;
			await tx.company.upsert({
				where: { id: companyId },
				create: {
					id: companyId,
					name,
					description: "Fictional supplier for the Maison pilot.",
					enrichmentStatus: "COMPLETE",
				},
				update: {},
			});
			await tx.supplierProfile.upsert({
				where: { id: supplier.id },
				create: {
					...supplier,
					companyId,
					email: `${supplier.id}@fictional.example`,
					phone: "+33 0 00 00 00 00",
				},
				update: {},
			});
		}
		for (const row of cases)
			await tx.conciergeCase.upsert({
				where: { id: row.id },
				create: row,
				update: {},
			});
		for (const row of segments) {
			const supplier = suppliers.find((item) => item.id === row.supplierId);
			await tx.serviceSegment.upsert({
				where: { id: row.id },
				create: {
					clientNotes: "",
					supplierNotes: "",
					confirmationReference: "",
					currency: "EUR",
					supplierTerms: supplier?.cancellationTerms ?? "",
					clientTerms: supplier?.cancellationTerms ?? "",
					...row,
					confirmationBy: row.status === "confirmed" ? "Camille Laurent" : null,
					confirmedAt:
						row.status === "confirmed"
							? new Date("2026-10-03T11:00:00Z")
							: null,
				},
				update: {},
			});
		}
		const tasks = [
			{
				id: "task-flight",
				caseId: "case-marrakech",
				title: "Confirm revised arrival slot with the flight operator",
				dueAt: "2026-10-05T08:00:00Z",
				assigneeId: "maison-owner",
				priority: "urgent",
			},
			{
				id: "task-terms",
				caseId: "case-marrakech",
				title: "Resolve villa cancellation terms before client acceptance",
				dueAt: "2026-10-05T11:00:00Z",
				assigneeId: "maison-owner",
				priority: "urgent",
			},
			{
				id: "task-driver",
				caseId: "case-marrakech",
				title: "Send revised arrival time to Nadia",
				dueAt: "2026-10-05T10:00:00Z",
				assigneeId: "maison-alex",
				priority: "high",
			},
			{
				id: "task-milan",
				caseId: "case-milan",
				title: "Issue the client travel brief",
				dueAt: "2026-10-05T16:00:00Z",
				assigneeId: "maison-alex",
				priority: "normal",
			},
			{
				id: "task-allergy",
				caseId: "case-riviera",
				title: "Obtain written chef acknowledgement of nut allergy",
				dueAt: "2026-10-06T10:00:00Z",
				assigneeId: "maison-sam",
				priority: "urgent",
			},
			{
				id: "task-yacht",
				caseId: "case-riviera",
				title: "Agree the weather cancellation policy with the client",
				dueAt: "2026-10-06T14:00:00Z",
				assigneeId: "maison-sam",
				priority: "high",
			},
			{
				id: "task-gallery",
				caseId: "case-paris",
				title: "Follow up with the gallery curator",
				dueAt: "2026-10-06T09:00:00Z",
				assigneeId: "maison-alex",
				priority: "normal",
			},
			{
				id: "task-anniversary",
				caseId: "case-anniversary",
				title: "Shortlist two Atlas retreats and check terrace availability",
				dueAt: "2026-10-07T12:00:00Z",
				assigneeId: "maison-owner",
				priority: "normal",
			},
		];
		for (const row of tasks)
			await tx.conciergeTask.upsert({
				where: { id: row.id },
				create: row,
				update: {},
			});
		const inbox = [
			{
				id: "intake-flight",
				channel: "email",
				sender: "Thomas · Aero Maison",
				caseId: "case-marrakech",
				rawText:
					"For the Moreau party on 5 October 2026, the revised Marrakech arrival is 14:10 local, subject to slot confirmation. Four guests. Please hold the ground transfer until we send the written slot confirmation. Cancellation is 50% after confirmation and 100% inside 48 hours.",
			},
			{
				id: "intake-villa",
				channel: "whatsapp",
				sender: "Salma · Dar Serein",
				caseId: "case-marrakech",
				rawText:
					"Dar Serein is available 5–9 October 2026 for four guests. Pool heating is available with 48 hours notice. Early access remains unconfirmed. The deposit is non-refundable. Please confirm by 16:00 Marrakech time today.",
			},
			{
				id: "intake-dining",
				channel: "phone",
				sender: "Sofia Bennett",
				caseId: "case-riviera",
				rawText:
					"Call note, 5 October 2026: please tell the villa chef that our youngest has a nut allergy. We need written acknowledgement before the arrival dinner on 7 October. Two adults, two children. The yacht remains optional until we see the weather.",
			},
			{
				id: "intake-new-trip",
				channel: "email",
				sender: "Oscar Winter's assistant",
				caseId: null,
				rawText:
					"We are considering a private flight for six guests from London to Nice next week. Dates and return routing are still open. Please suggest the information you need before sourcing aircraft. No booking is authorised.",
			},
		];
		for (const row of inbox)
			await tx.conciergeIntake.upsert({
				where: { id: row.id },
				create: row,
				update: {},
			});
		for (const row of cases)
			await tx.conciergeActivity.upsert({
				where: { id: `activity-${row.id}` },
				create: {
					id: `activity-${row.id}`,
					caseId: row.id,
					actorId: "maison-owner",
					actorName: "Camille Laurent",
					kind: "created",
					body: "Fictional pilot case created. Client preferences and supplier commitments require human review.",
					createdAt: new Date("2026-10-04T10:00:00Z"),
				},
				update: {},
			});
	},
	{ timeout: 30000 },
);
process.stdout.write(
	"Maison fixtures ready: 6 clients, 7 suppliers, 5 cases, 17 services, 8 tasks, 4 intake items.\n",
);
await db.$disconnect();
