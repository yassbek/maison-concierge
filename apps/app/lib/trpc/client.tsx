"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createTRPCClient, httpBatchLink, type TRPCClient } from "@trpc/client";
import {
	createTRPCContext,
	type TRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import type { AppRouter } from "api/app-router";
import { usePathname } from "next/navigation";
import type { FC, ReactNode } from "react";
import { Suspense, useState } from "react";
import { getQueryClient } from "./query-client";

const { TRPCProvider: ContextProvider, useTRPC: useTRPCContext } =
	createTRPCContext<AppRouter>();

const TRPCProvider: FC<{
	children: ReactNode;
	queryClient: QueryClient;
	trpcClient: TRPCClient<AppRouter>;
	keyPrefix?: never;
}> = ContextProvider;

export const useTRPC: () => TRPCOptionsProxy<AppRouter> = useTRPCContext;

export function TRPCReactProvider({ children }: { children: ReactNode }) {
	const queryClient = getQueryClient();
	const [trpcClient] = useState(() =>
		createTRPCClient<AppRouter>({
			links: [httpBatchLink({ url: "/api/trpc" })],
		}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				{children}
				{process.env.NODE_ENV === "development" ? (
					<Suspense fallback={null}>
						<DevelopmentTools />
					</Suspense>
				) : null}
			</TRPCProvider>
		</QueryClientProvider>
	);
}

function DevelopmentTools() {
	const pathname = usePathname();
	return pathname.startsWith("/concierge") ||
		pathname.startsWith("/brief") ? null : (
		<ReactQueryDevtools initialIsOpen={false} />
	);
}
