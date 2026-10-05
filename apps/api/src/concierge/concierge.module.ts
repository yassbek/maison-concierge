import { Module } from "@nestjs/common";
import { ConciergeRouter } from "./concierge.router";
import { ConciergeService } from "./concierge.service";
import { ConciergePublicRouter } from "./concierge-public.router";

@Module({
	providers: [ConciergeRouter, ConciergePublicRouter, ConciergeService],
})
export class ConciergeModule {}
