import { PRICES } from "./prices.js";

// Default inputs for each scenario (the same defaults as the calculator page).
export const DEFAULTS = {
  "s3-nat": { gb: 100000 },
  "cross-az": { gb: 500000, zones: 3, local: 80 },
  "spot-ebs": { instances: 100, hours: 730, spot: 90 },
  dynamodb: { writes: 20000, size: 1, factor: 2, hours: 730 },
};

export const SCENARIOS = {
  "s3-nat": "S3 traffic going through a NAT Gateway (fix: S3 gateway VPC endpoint)",
  "cross-az": "Microservices talking across Availability Zones (fix: same-zone routing)",
  "spot-ebs": "Stateful batch jobs kept on On-Demand (fix: Spot with EBS or S3 checkpoints)",
  dynamodb: "A DynamoDB table with a hot partition key (fix: write sharding)",
};

const pct = (n) => Math.min(100, Math.max(0, n)) / 100;

/**
 * Monthly cost of one scenario before and after the fix, in USD.
 * @param {string} id scenario id: "s3-nat" | "cross-az" | "spot-ebs" | "dynamodb"
 * @param {object} input scenario inputs (missing fields fall back to DEFAULTS)
 * @param {string} region AWS Region id, one of the keys of PRICES
 * @returns {{ before: number, after: number, saved: number, savedYear: number, shards?: number }}
 */
export function compute(id, input = {}, region = "eu-west-3") {
  const p = PRICES[region];
  if (!p) throw new Error(`Unknown region "${region}". Known: ${Object.keys(PRICES).join(", ")}`);
  if (!DEFAULTS[id]) throw new Error(`Unknown scenario "${id}". Known: ${Object.keys(DEFAULTS).join(", ")}`);
  const v = { ...DEFAULTS[id], ...input };
  let before;
  let after;
  let shards;

  if (id === "s3-nat") {
    // every GB through the NAT Gateway pays data processing; a gateway endpoint costs nothing
    before = v.gb * p.natGb;
    after = 0;
  } else if (id === "cross-az") {
    // with pods spread evenly over N zones, about (N-1)/N of calls cross a zone,
    // and a crossing call is billed in both directions
    const zones = Math.max(1, v.zones);
    const crossing = v.gb * ((zones - 1) / zones);
    before = crossing * p.interAz * 2;
    after = before * (1 - pct(v.local));
  } else if (id === "spot-ebs") {
    const share = pct(v.spot);
    before = v.instances * v.hours * p.m5OnDemand;
    after = v.instances * v.hours * (share * p.m5Spot + (1 - share) * p.m5OnDemand);
  } else {
    // one write unit per KB (rounded up) per second; one partition takes at most 1,000 WCU/s
    const wcu = v.writes * Math.max(1, Math.ceil(v.size));
    before = wcu * Math.max(1, v.factor) * p.wcuHour * v.hours;
    after = wcu * p.wcuHour * v.hours;
    shards = Math.ceil(wcu / 1000);
  }

  const saved = Math.max(0, before - after);
  const out = { before, after, saved, savedYear: saved * 12 };
  if (shards !== undefined) out.shards = shards;
  return out;
}
