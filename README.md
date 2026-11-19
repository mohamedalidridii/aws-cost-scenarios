# aws-cost-scenarios

Four AWS architecture defaults that quietly inflate the bill, priced with **public AWS list prices** for Paris, Frankfurt, the UAE, Bahrain and N. Virginia, and the cost of the optimised design next to each one.

This repo holds the price data and the formulas behind the [interactive AWS cost scenarios calculator](https://www.koyotec.digital/engineering/en/cloud-costs/) (also in [French](https://www.koyotec.digital/engineering/cloud-costs/)), so you can check the maths, reuse it in your own tooling or run it from the command line.

| # | Default that costs money | Optimised design |
|---|---|---|
| `s3-nat` | Private subnets read S3 through a **NAT Gateway**, which bills every GB it processes | **S3 gateway VPC endpoint** plus one route: no extra charge |
| `cross-az` | Microservices call each other **across Availability Zones**, $0.01/GB each way | Same-zone routing: Kubernetes `trafficDistribution: PreferSameZone` or Istio locality load balancing |
| `spot-ebs` | Stateful batch jobs and CI runners kept on **On-Demand** around the clock | **Spot**, with state on EBS or S3 checkpoints and an EventBridge rule on the two-minute interruption notice |
| `dynamodb` | A **hot partition key** plus over-provisioned capacity that doesn't fix the throttling | **Write sharding** over at least peak ÷ 1,000 partitions, provision only what is needed |

## Results with the default inputs (USD per month)

| Scenario (default inputs) | Paris `eu-west-3` | Frankfurt `eu-central-1` | UAE `me-central-1` | Bahrain `me-south-1` | N. Virginia `us-east-1` |
|---|---:|---:|---:|---:|---:|
| S3 through NAT: 100 TB/month | $5,000 → $0 | $5,200 → $0 | $5,280 → $0 | $5,280 → $0 | $4,500 → $0 |
| Cross-AZ: 500 TB/month, 3 AZs, 80% kept local | $6,667 → $1,333 | $6,667 → $1,333 | $6,667 → $1,333 | $6,667 → $1,333 | $6,667 → $1,333 |
| Spot: 100 × m5.2xlarge, 730 h, 90% on Spot | $32,704 → $13,033 | $33,580 → $15,204 | $34,383 → $16,559 | $34,383 → $14,555 | $28,032 → $13,394 |
| DynamoDB: 20,000 writes/s, 1 KB, 2× over-provisioned | $22,542 → $11,271 | $23,156 → $11,578 | $23,608 → $11,804 | $23,608 → $11,804 | $18,980 → $9,490 |

The same workload costs **more in Paris, Frankfurt and the Gulf than in N. Virginia**: NAT data processing is $0.045/GB in `us-east-1` but $0.05 to $0.0528/GB elsewhere, and m5.2xlarge On-Demand is $0.384/h against $0.448 to $0.471/h.

## Formulas

All results are monthly, in USD. `p` is the price set of the chosen Region in [`src/prices.js`](src/prices.js).

```text
s3-nat    before = GB × p.natGb
          after  = 0                                   (gateway endpoints have no charge)

cross-az  crossing = GB × (zones − 1) / zones          (pods spread evenly over the zones)
          before   = crossing × p.interAz × 2          (billed out and in)
          after    = before × (1 − local%)

spot-ebs  before = instances × hours × p.m5OnDemand
          after  = instances × hours × (spot% × p.m5Spot + (1 − spot%) × p.m5OnDemand)

dynamodb  WCU    = writes/s × ceil(item KB)            (1 write unit = 1 KB per second)
          before = WCU × factor × p.wcuHour × hours
          after  = WCU × p.wcuHour × hours
          shards = ceil(WCU / 1000)                    (1,000 WCU/s max per partition)
```

## Use it

Requires Node.js 18 or later. No dependencies.

```bash
git clone https://github.com/mohamedalidridii/aws-cost-scenarios.git
cd aws-cost-scenarios

node bin/aws-cost-scenarios.js                              # every scenario, every Region
node bin/aws-cost-scenarios.js s3-nat --region eu-west-3 --gb 250000
node bin/aws-cost-scenarios.js cross-az --zones 3 --local 90 --json
node bin/aws-cost-scenarios.js --help                       # inputs and defaults
npm test
```

As a library:

```js
import { compute } from "./src/scenarios.js";

compute("dynamodb", { writes: 5000, size: 2, factor: 3 }, "me-central-1");
// { before: …, after: …, saved: …, savedYear: …, shards: 10 }
```

## Prices and sources

AWS public list prices in USD, excluding tax, Free Tier and negotiated discounts (Savings Plans, EDP), **checked on 18 November 2026** in the AWS Price List API and pricing pages. Spot is the lowest m5.2xlarge Linux price published in the Region that day; it changes by Availability Zone and over time. These are illustrative scenarios, not a client system.

- [Amazon VPC pricing (NAT Gateway)](https://aws.amazon.com/vpc/pricing/)
- [Gateway endpoints: no additional charge](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html)
- [EC2 On-Demand pricing and data transfer within a Region](https://aws.amazon.com/ec2/pricing/on-demand/)
- [EC2 Spot pricing](https://aws.amazon.com/ec2/spot/pricing/)
- [DynamoDB provisioned capacity pricing](https://aws.amazon.com/dynamodb/pricing/provisioned/)
- [DynamoDB partition key design (1,000 WCU/s per partition)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [Kubernetes traffic distribution (PreferSameZone)](https://kubernetes.io/docs/reference/networking/virtual-ips/)

Found a price that changed? Open an issue or a pull request that updates `src/prices.js` and `PRICES_CHECKED` together.

## Trade-offs worth knowing

- Gateway endpoints exist only for **S3 and DynamoDB**, in the same Region. Interface endpoints (PrivateLink) are a different, billed product.
- Same-zone routing needs **enough replicas in every zone**, otherwise load becomes uneven; keep a cluster-wide fallback.
- An EBS volume lives in **one Availability Zone**: the replacement Spot instance must be in the same zone, or use S3 checkpoints.
- Write sharding turns one read into **N queries**, or a rollup to maintain.

## About

Maintained by [KOYOTEC Engineering](https://www.koyotec.digital/engineering/en/), a cloud, DevOps and industrial engineering team in Tunis working with companies in Europe, the Gulf and North America. Want these checked on your own AWS account? See the [cloud cost audit](https://www.koyotec.digital/engineering/en/contact/).

## Licence

[MIT](LICENSE)
