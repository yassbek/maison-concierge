import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
if (!existsSync(join(root, ".env")))
	throw new Error("Create the root .env first. See docs/concierge-pilot.md.");
const children = [
	Bun.spawn(["bun", "--watch", "src/main.ts"], {
		cwd: join(root, "apps/api"),
		stdout: "inherit",
		stderr: "inherit",
	}),
	Bun.spawn(
		["bun", "run", "dev", "--hostname", "127.0.0.1", "--port", "3107"],
		{ cwd: join(root, "apps/app"), stdout: "inherit", stderr: "inherit" },
	),
];
function stop() {
	for (const child of children) child.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log("Maison: http://127.0.0.1:3107/concierge");
const code = await Promise.race(children.map((child) => child.exited));
stop();
process.exitCode = code;
