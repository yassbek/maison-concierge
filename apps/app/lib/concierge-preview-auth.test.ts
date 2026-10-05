import { describe, expect, mock, test } from "bun:test";
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

mock.module("server-only", () => ({}));

const {
	authorizeConciergePreview,
	conciergePreviewMode,
	conciergePreviewCookies,
} = await import("./concierge-preview-auth");

const accessKey = "fictional-preview-test-access-key-2026";
const hostedEnvironment = {
	NODE_ENV: "production",
	CONCIERGE_PREVIEW_SECRET: accessKey,
	APP_URL: "https://maison.example.test",
};
const hostedRequest = {
	url: "https://maison.example.test/api/concierge-demo-session",
	host: "maison.example.test",
	origin: "https://maison.example.test",
};
const localEnvironment = {
	NODE_ENV: "development",
	CONCIERGE_LOCAL_DEMO: "true",
};
const localRequest = {
	url: "http://127.0.0.1:3107/api/concierge-demo-session",
	host: "127.0.0.1:3107",
	origin: "http://127.0.0.1:3107",
};

describe("hosted concierge preview authorization", () => {
	test("accepts the configured key on the exact configured HTTPS origin", () => {
		expect(
			authorizeConciergePreview(hostedRequest, accessKey, hostedEnvironment),
		).toBe("hosted");
	});

	test.each([undefined, "", "wrong-key", `${accessKey}x`, "x".repeat(1025)])(
		"rejects an invalid submitted key",
		(key) => {
			expect(
				authorizeConciergePreview(hostedRequest, key, hostedEnvironment),
			).toBeNull();
		},
	);

	test.each([undefined, "", "too-short", " ".repeat(32)])(
		"fails closed without a valid configured secret",
		(secret) => {
			const environment = {
				...hostedEnvironment,
				CONCIERGE_PREVIEW_SECRET: secret,
			};
			expect(conciergePreviewMode(environment)).toBe("disabled");
			expect(
				authorizeConciergePreview(hostedRequest, accessKey, environment),
			).toBeNull();
		},
	);

	test.each([
		undefined,
		"https://other.example.test",
		"null",
		"https://maison.example.test.evil.test",
	])("rejects a missing or cross-origin Origin header", (origin) => {
		expect(
			authorizeConciergePreview(
				{ ...hostedRequest, origin: origin ?? null },
				accessKey,
				hostedEnvironment,
			),
		).toBeNull();
	});

	test("rejects another same-origin deployment even with the correct key", () => {
		expect(
			authorizeConciergePreview(
				{
					url: "https://alias.example.test/api/concierge-demo-session",
					host: "alias.example.test",
					origin: "https://alias.example.test",
				},
				accessKey,
				hostedEnvironment,
			),
		).toBeNull();
	});

	test("rejects mismatched Host headers", () => {
		expect(
			authorizeConciergePreview(
				{ ...hostedRequest, host: "other.example.test" },
				accessKey,
				hostedEnvironment,
			),
		).toBeNull();
	});

	test.each([
		undefined,
		"",
		"http://maison.example.test",
		"https://localhost",
		"https://maison.example.test/path",
		"https://user:password@maison.example.test",
		"https://maison.example.test?key=secret",
		"https://maison.example.test#fragment",
	])("rejects missing or unsafe configured origins", (appUrl) => {
		expect(
			authorizeConciergePreview(hostedRequest, accessKey, {
				...hostedEnvironment,
				APP_URL: appUrl,
			}),
		).toBeNull();
	});

	test("does not accept an access key from the request URL", () => {
		expect(
			authorizeConciergePreview(
				{
					...hostedRequest,
					url: `${hostedRequest.url}?accessKey=${accessKey}`,
				},
				undefined,
				hostedEnvironment,
			),
		).toBeNull();
	});
});

describe("local concierge development authorization", () => {
	test("preserves explicit loopback development access without a key", () => {
		expect(
			authorizeConciergePreview(localRequest, undefined, localEnvironment),
		).toBe("local");
	});

	test("rejects the local-only flag in production", () => {
		expect(
			authorizeConciergePreview(localRequest, undefined, {
				...localEnvironment,
				NODE_ENV: "production",
			}),
		).toBeNull();
	});

	test("rejects passwordless production access even with both modes configured", () => {
		expect(
			authorizeConciergePreview(localRequest, undefined, {
				...hostedEnvironment,
				CONCIERGE_LOCAL_DEMO: "true",
			}),
		).toBeNull();
	});

	test("requires the explicit local development flag", () => {
		expect(
			authorizeConciergePreview(localRequest, undefined, {
				NODE_ENV: "development",
			}),
		).toBeNull();
	});

	test("rejects remote development requests and forged loopback hosts", () => {
		expect(
			authorizeConciergePreview(hostedRequest, undefined, localEnvironment),
		).toBeNull();
		expect(
			authorizeConciergePreview(
				{ ...hostedRequest, host: "localhost" },
				undefined,
				localEnvironment,
			),
		).toBeNull();
	});

	test("rejects cross-origin local requests", () => {
		expect(
			authorizeConciergePreview(
				{ ...localRequest, origin: "https://evil.example.test" },
				undefined,
				localEnvironment,
			),
		).toBeNull();
	});
});

describe("Better Auth preview cookie compatibility", () => {
	test("uses the installed Better Auth secure production cookie contract", () => {
		const cookie = conciergePreviewCookies("hosted").sessionToken;
		expect(cookie.name).toBe("__Secure-crm.session_token");
		expect(cookie.attributes).toMatchObject({
			secure: true,
			httpOnly: true,
			sameSite: "lax",
			path: "/",
		});
		const response = new NextResponse();
		response.cookies.set(cookie.name, "fictional-session-token", {
			...cookie.attributes,
			sameSite: "lax",
		});
		const header = response.headers.get("set-cookie");
		expect(header).toContain("Secure");
		expect(header).toContain("HttpOnly");
		const request = new Request(hostedRequest.url, {
			headers: { cookie: header?.split(";")[0] ?? "" },
		});
		expect(getSessionCookie(request, { cookiePrefix: "crm" })).toBe(
			"fictional-session-token",
		);
	});

	test("retains the installed Better Auth development cookie contract", () => {
		const cookie = conciergePreviewCookies("local").sessionToken;
		expect(cookie.name).toBe("crm.session_token");
		expect(cookie.attributes.secure).toBe(false);
		expect(cookie.attributes.httpOnly).toBe(true);
	});
});

describe("preview sign-in form", () => {
	test("keeps access keys out of URL submissions before hydration", async () => {
		const { createElement } = await import("react");
		const { renderToStaticMarkup } = await import("react-dom/server");
		const { ConciergeSignIn } = await import("../components/concierge/sign-in");
		const html = renderToStaticMarkup(
			createElement(ConciergeSignIn, { previewMode: "hosted" }),
		);
		expect(html).toMatch(/<form[^>]*method="post"/);
		expect(html).toContain('action="/api/concierge-demo-session"');
		expect(html).toContain('type="password"');
		expect(html).toContain("HOSTED PRIVATE PREVIEW");
		expect(html).not.toContain(accessKey);
	});
});
