import {
	type ConciergeCommand,
	conciergeCommand,
	conciergeCommandResult,
	conciergeSnapshot,
} from "@crm/validation/concierge";
import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { ConciergeService } from "./concierge.service";

@Router({ alias: "concierge" })
@UseMiddlewares(AuthMiddleware)
export class ConciergeRouter {
	constructor(
		@Inject(ConciergeService) private readonly concierge: ConciergeService,
	) {}

	@Query({ output: conciergeSnapshot })
	async snapshot(@Ctx() ctx: AuthedTrpcContext) {
		return this.concierge.snapshot(ctx.user.id);
	}

	@Mutation({ input: conciergeCommand, output: conciergeCommandResult })
	async command(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: ConciergeCommand,
	) {
		return this.concierge.command(ctx.user.id, input);
	}
}
