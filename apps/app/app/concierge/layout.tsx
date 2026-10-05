import type { Metadata } from "next";
export const metadata: Metadata = {
	title: { absolute: "Maison | Private concierge" },
	description: "A considered workspace for exceptional journeys.",
	icons: { icon: "/concierge/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
