import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { AUTH_COOKIE_PREFIX } from "@crm/auth/cookies";
import { getCookies } from "better-auth/cookies";
import { CONCIERGE_UI } from "./concierge-config";

type PreviewEnvironment = {
	NODE_ENV?: string;
	CONCIERGE_LOCAL_DEMO?: string;
	CONCIERGE_PREVIEW_SECRET?: string;
	APP_URL?: string;
};

type PreviewRequest = {
	url: string;
	host: string | null;
	origin: string | null;
};

export type ConciergePreviewMode = "hosted" | "local" | "disabled";

function hostedOrigin(environment: PreviewEnvironment) {
	const secret = environment.CONCIERGE_PREVIEW_SECRET;
	if (
		!secret ||
		secret.trim().length < CONCIERGE_UI.previewSecretMinLength ||
		secret.length > CONCIERGE_UI.previewSecretMaxLength ||
		!environment.APP_URL
	)
		return null;
	try {
		const url = new URL(environment.APP_URL);
		if (
			url.protocol !== "https:" ||
			url.pathname !== "/" ||
			url.search ||
			url.hash ||
			url.username ||
			url.password ||
			isLocalHostname(url.hostname)
		)
			return null;
		return url.origin;
	} catch {
		return null;
	}
}

function isLocalHostname(hostname: string) {
	return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function conciergePreviewMode(
	environment: PreviewEnvironment = process.env,
): ConciergePreviewMode {
	if (environment.NODE_ENV === "production")
		return hostedOrigin(environment) ? "hosted" : "disabled";
	return environment.CONCIERGE_LOCAL_DEMO === "true" ? "local" : "disabled";
}

export function authorizeConciergePreview(
	request: PreviewRequest,
	accessKey: string | undefined,
	environment: PreviewEnvironment = process.env,
): Exclude<ConciergePreviewMode, "disabled"> | null {
	const mode = conciergePreviewMode(environment);
	if (mode === "disabled") return null;
	let url: URL;
	try {
		url = new URL(request.url);
	} catch {
		return null;
	}
	if (request.origin !== url.origin || request.host !== url.host) return null;
	if (mode === "local") return isLocalHostname(url.hostname) ? "local" : null;
	if (
		url.origin !== hostedOrigin(environment) ||
		!accessKey ||
		accessKey.length > CONCIERGE_UI.previewSecretMaxLength
	)
		return null;
	const secret = environment.CONCIERGE_PREVIEW_SECRET;
	if (!secret) return null;
	const expected = createHash("sha256").update(secret).digest();
	const supplied = createHash("sha256").update(accessKey).digest();
	return timingSafeEqual(expected, supplied) ? "hosted" : null;
}

export function conciergePreviewCookies(
	mode: Exclude<ConciergePreviewMode, "disabled">,
) {
	return getCookies({
		advanced: {
			cookiePrefix: AUTH_COOKIE_PREFIX,
			useSecureCookies: mode === "hosted",
		},
		session: { expiresIn: CONCIERGE_UI.localSessionMs / 1000 },
	});
}
