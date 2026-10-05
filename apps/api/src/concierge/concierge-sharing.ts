import { createHash, randomBytes } from "node:crypto";
import type { Db, Prisma } from "@crm/db";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { CONCIERGE } from "./concierge-config";

function hashToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

export async function createBriefShare(
	tx: Prisma.TransactionClient,
	documentId: string,
	expiresInDays: number,
	userId: string,
	financials: boolean,
) {
	if (!financials)
		throw new ForbiddenException(
			"Only an owner or admin can share client briefs.",
		);
	const document = await tx.conciergeDocument.findUnique({
		where: { id: documentId },
	});
	if (document?.audience !== "client")
		throw new NotFoundException("A client brief is required.");
	const now = new Date();
	await tx.conciergeBriefShare.updateMany({
		where: { documentId, revokedAt: null },
		data: { revokedAt: now },
	});
	const token = randomBytes(CONCIERGE.share.tokenBytes).toString("base64url");
	const expiresAt = new Date(
		now.getTime() + expiresInDays * CONCIERGE.share.dayMs,
	);
	await tx.conciergeBriefShare.create({
		data: {
			id: crypto.randomUUID(),
			documentId,
			tokenHash: hashToken(token),
			expiresAt,
			createdBy: userId,
		},
	});
	return {
		result: {
			id: documentId,
			caseId: document.caseId,
			shareToken: token,
			expiresAt: expiresAt.toISOString(),
		},
		body: "Created a private client brief link. Previous links for this brief are revoked.",
	};
}

export async function revokeBriefShare(
	tx: Prisma.TransactionClient,
	documentId: string,
	financials: boolean,
) {
	if (!financials)
		throw new ForbiddenException(
			"Only an owner or admin can revoke client brief links.",
		);
	const document = await tx.conciergeDocument.findUnique({
		where: { id: documentId },
	});
	if (document?.audience !== "client")
		throw new NotFoundException("A client brief is required.");
	await tx.conciergeBriefShare.updateMany({
		where: { documentId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
	return {
		result: { id: documentId, caseId: document.caseId },
		body: "Revoked all private links for this client brief.",
	};
}

export async function readClientBrief(db: Db, token: string) {
	const share = await db.conciergeBriefShare.findFirst({
		where: {
			tokenHash: hashToken(token),
			revokedAt: null,
			expiresAt: { gt: new Date() },
			document: { audience: "client" },
		},
		select: {
			expiresAt: true,
			document: { select: { title: true, content: true } },
		},
	});
	if (!share)
		throw new NotFoundException("This brief link is unavailable or expired.");
	return {
		title: share.document.title,
		content: share.document.content,
		expiresAt: share.expiresAt.toISOString(),
	};
}
