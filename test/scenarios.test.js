import { test } from "node:test";
import assert from "node:assert/strict";
import { compute, DEFAULTS } from "../src/scenarios.js";
import { PRICES } from "../src/prices.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("s3-nat: every GB pays NAT data processing, the gateway endpoint is free", () => {
  const r = compute("s3-nat", { gb: 100000 }, "eu-west-3");
  close(r.before, 5000);
  close(r.after, 0);
  close(r.savedYear, 60000);
});

test("cross-az: (N-1)/N of traffic crosses, billed both ways", () => {
  const r = compute("cross-az", { gb: 300000, zones: 3, local: 80 }, "us-east-1");
  close(r.before, 300000 * (2 / 3) * 0.01 * 2); // $4,000
  close(r.after, r.before * 0.2);
});

test("cross-az: a single zone never crosses", () => {
  close(compute("cross-az", { zones: 1 }).before, 0);
});

test("spot-ebs: blended price for the Spot share", () => {
  const p = PRICES["eu-central-1"];
  const r = compute("spot-ebs", { instances: 10, hours: 100, spot: 50 }, "eu-central-1");
  close(r.before, 10 * 100 * p.m5OnDemand);
  close(r.after, 10 * 100 * (0.5 * p.m5Spot + 0.5 * p.m5OnDemand));
});

test("dynamodb: item size rounds up to whole write units, shards = WCU / 1000", () => {
  const r = compute("dynamodb", { writes: 2500, size: 1.2, factor: 3, hours: 730 }, "eu-west-3");
  const wcu = 2500 * 2;
  close(r.after, wcu * PRICES["eu-west-3"].wcuHour * 730);
  close(r.before, r.after * 3);
  assert.equal(r.shards, 5);
});

test("percentages are clamped to 0-100", () => {
  close(compute("cross-az", { local: 150 }).after, 0);
  close(compute("spot-ebs", { spot: -20 }).saved, 0);
});

test("defaults exist for every scenario and every region has every price", () => {
  for (const id of Object.keys(DEFAULTS)) for (const region of Object.keys(PRICES)) compute(id, {}, region);
  for (const p of Object.values(PRICES)) assert.deepEqual(Object.keys(p).sort(), ["interAz", "m5OnDemand", "m5Spot", "natGb", "wcuHour"]);
});

test("unknown scenario or region throws", () => {
  assert.throws(() => compute("nope"));
  assert.throws(() => compute("s3-nat", {}, "mars-1"));
});
