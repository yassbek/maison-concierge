import {
	conciergeBriefShareInput,
	conciergePublicBrief,
} from "@crm/validation/concierge";
import { Inject } from "@nestjs/common";
import { Input, Query, Router } from "nestjs-trpc";
import type { z } from "zod";
import { ConciergeService } from "./concierge.service";

@Router({ alias: "conciergePublic" })
export class ConciergePublicRouter {
	constructor(
		@Inject(ConciergeService) private readonly concierge: ConciergeService,
	) {}

	@Query({ input: conciergeBriefShareInput, output: conciergePublicBrief })
	async brief(@Input() input: z.infer<typeof conciergeBriefShareInput>) {
		return this.concierge.publicBrief(input.token);
	}
}
