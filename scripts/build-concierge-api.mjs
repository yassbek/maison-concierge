import { readFileSync, writeFileSync } from "node:fs";
import "../apps/api/scripts/build-func.mjs";

const output = new URL("../.vercel/output/", import.meta.url);
const configPath = new URL("config.json", output);
const config = JSON.parse(readFileSync(configPath, "utf8"));
delete config.crons;
writeFileSync(configPath, JSON.stringify(config));
const functionPath = new URL(
	"functions/api/index.func/.vc-config.json",
	output,
);
const functionConfig = JSON.parse(readFileSync(functionPath, "utf8"));
functionConfig.regions = ["fra1"];
writeFileSync(functionPath, JSON.stringify(functionConfig));
