#!/usr/bin/env node
// Usage:
//   aws-cost-scenarios                          all scenarios, all Regions, default inputs
//   aws-cost-scenarios s3-nat --region eu-west-3 --gb 250000
//   aws-cost-scenarios cross-az --zones 3 --local 90 --json
import { compute, DEFAULTS, SCENARIOS } from "../src/scenarios.js";
import { PRICES, PRICES_CHECKED, REGIONS } from "../src/prices.js";

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith("--")) flags[key] = true;
    else flags[key] = args[++i];
  } else positional.push(a);
}

if (flags.help || flags.h) {
  const list = Object.entries(SCENARIOS)
    .map(([id, t]) => {
      const inputs = Object.entries(DEFAULTS[id]).map(([k, d]) => `--${k} (default ${d})`).join(", ");
      return `  ${id.padEnd(9)} ${t}\n            inputs: ${inputs}`;
    })
    .join("\n");
  console.log(`aws-cost-scenarios [scenario...] [--region <id>] [--<input> <number>] [--json]

Scenarios:
${list}

Regions: ${Object.keys(PRICES).join(", ")}
Prices: AWS public list prices in USD, checked ${PRICES_CHECKED}.`);
  process.exit(0);
}

const ids = positional.length ? positional : Object.keys(DEFAULTS);
const regions = flags.region ? [flags.region] : REGIONS.map((r) => r.id);
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const rows = [];
try {
  for (const id of ids) {
    const input = {};
    for (const k of Object.keys(DEFAULTS[id] ?? {})) if (flags[k] !== undefined) input[k] = Number(flags[k]);
    for (const region of regions) rows.push({ scenario: id, region, ...compute(id, input, region) });
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

if (flags.json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const head = ["scenario".padEnd(10), "region".padEnd(13), "before".padStart(10), "after".padStart(10), "saved/mo".padStart(10), "saved/yr".padStart(11)];
  console.log(`Monthly cost, AWS list prices checked ${PRICES_CHECKED} (USD, excl. tax and discounts)\n`);
  console.log(head.join(" "));
  for (const r of rows) {
    const cells = [r.scenario.padEnd(10), r.region.padEnd(13), usd.format(r.before).padStart(10), usd.format(r.after).padStart(10), usd.format(r.saved).padStart(10), usd.format(r.savedYear).padStart(11)];
    console.log(cells.join(" ") + (r.shards ? `  (min. ${r.shards} shards)` : ""));
  }
  console.log("\nInteractive calculator: https://www.koyotec.digital/engineering/en/cloud-costs/");
}
