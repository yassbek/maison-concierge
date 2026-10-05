import { connection } from "next/server";
import { Suspense } from "react";
import { ConciergeSignIn } from "@/components/concierge/sign-in";
import { conciergePreviewMode } from "@/lib/concierge-preview-auth";

async function SignInContent() {
	await connection();
	return <ConciergeSignIn previewMode={conciergePreviewMode()} />;
}

export default function Page() {
	return (
		<Suspense
			fallback={
				<div className="maison-app m-loading" role="status">
					Preparing your private preview…
				</div>
			}
		>
			<SignInContent />
		</Suspense>
	);
}
