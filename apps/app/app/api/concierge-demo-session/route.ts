import { createHmac, randomUUID } from "node:crypto";
import { db } from "@crm/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CONCIERGE_UI } from "@/lib/concierge-config";
import {
	authorizeConciergePreview,
	conciergePreviewCookies,
} from "@/lib/concierge-preview-auth";

const input = z
	.object({
		persona: z.enum(["owner", "member", "admin"]),
		accessKey: z.string().max(CONCIERGE_UI.previewSecretMaxLength).optional(),
	})
	.strict();
const emails = {
	owner: "concierge@maison.example",
	member: "alex@maison.example",
	admin: "sam@maison.example",
};

export async function POST(request: NextRequest) {
	try {
		return await createPreviewSession(request);
	} catch (error) {
		console.error("Concierge preview session failed", {
			error: error instanceof Error ? error.name : "UnknownError",
		});
		return NextResponse.json(
			{
				error: "Sign-in is temporarily unavailable. Please try again shortly.",
			},
			{
				status: 503,
				headers: { "Cache-Control": "no-store", "Retry-After": "5" },
			},
		);
	}
}

async function createPreviewSession(request: NextRequest) {
	const parsed = input.safeParse(await request.json().catch(() => null));
	if (!parsed.success)
		return NextResponse.json(
			{ error: "Choose a demonstration user and enter a valid access key." },
			{ status: 400, headers: { "Cache-Control": "no-store" } },
		);
	const mode = authorizeConciergePreview(
		{
			url: request.url,
			host: request.headers.get("host"),
			origin: request.headers.get("origin"),
		},
		parsed.data.accessKey,
	);
	if (!mode)
		return NextResponse.json(
			{
				error: "Preview access is unavailable or the access key is incorrect.",
			},
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret || secret.length < CONCIERGE_UI.previewSecretMinLength)
		return NextResponse.json(
			{ error: "Preview sign-in is not configured." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	const user = await db.user.findUnique({
		where: { email: emails[parsed.data.persona] },
	});
	if (!user)
		return NextResponse.json(
			{ error: "The pilot database needs to be initialized." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	const token = randomUUID();
	const expiresAt = new Date(Date.now() + CONCIERGE_UI.localSessionMs);
	await db.session.create({
		data: {
			id: randomUUID(),
			token,
			userId: user.id,
			expiresAt,
			updatedAt: new Date(),
		},
	});
	const signed = `${token}.${createHmac("sha256", secret).update(token).digest("base64")}`;
	const response = NextResponse.json(
		{ ok: true },
		{ headers: { "Cache-Control": "no-store" } },
	);
	const cookies = conciergePreviewCookies(mode);
	for (const cached of [
		cookies.sessionData,
		cookies.accountData,
		cookies.dontRememberToken,
	]) {
		response.cookies.set(cached.name, "", {
			...cached.attributes,
			sameSite: "lax",
			maxAge: 0,
		});
		for (const existing of request.cookies.getAll()) {
			if (existing.name.startsWith(`${cached.name}.`))
				response.cookies.set(existing.name, "", {
					...cached.attributes,
					sameSite: "lax",
					maxAge: 0,
				});
		}
	}
	response.cookies.set(cookies.sessionToken.name, signed, {
		...cookies.sessionToken.attributes,
		sameSite: "lax",
		expires: expiresAt,
	});
	return response;
}
