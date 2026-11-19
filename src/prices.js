// AWS public list prices (USD, excluding tax, Free Tier and discounts such as Savings Plans or EDP).
// Checked on 2026-11-18 against the AWS Price List API, the AWS pricing pages and the AWS Spot price feed.
// When you update a value, update PRICES_CHECKED too.
export const PRICES_CHECKED = "2026-11-18";

export const REGIONS = [
  { id: "eu-west-3", label: "Europe (Paris)" },
  { id: "eu-central-1", label: "Europe (Frankfurt)" },
  { id: "me-central-1", label: "Middle East (UAE)" },
  { id: "me-south-1", label: "Middle East (Bahrain)" },
  { id: "us-east-1", label: "US East (N. Virginia)" },
];

// natGb:      NAT Gateway data processing, $/GB
// interAz:    EC2 data transfer between Availability Zones, $/GB in each direction
// m5OnDemand: m5.2xlarge Linux On-Demand, $/hour
// m5Spot:     m5.2xlarge Linux Spot, $/hour (lowest price published in the Region that day; changes by AZ and over time)
// wcuHour:    DynamoDB provisioned write capacity unit, $/hour (Standard table class)
export const PRICES = {
  "eu-west-3": { natGb: 0.05, interAz: 0.01, m5OnDemand: 0.448, m5Spot: 0.1486, wcuHour: 0.000772 },
  "eu-central-1": { natGb: 0.052, interAz: 0.01, m5OnDemand: 0.46, m5Spot: 0.1803, wcuHour: 0.000793 },
  "me-central-1": { natGb: 0.0528, interAz: 0.01, m5OnDemand: 0.471, m5Spot: 0.1997, wcuHour: 0.0008085 },
  "me-south-1": { natGb: 0.0528, interAz: 0.01, m5OnDemand: 0.471, m5Spot: 0.1692, wcuHour: 0.0008085 },
  "us-east-1": { natGb: 0.045, interAz: 0.01, m5OnDemand: 0.384, m5Spot: 0.1612, wcuHour: 0.00065 },
};

export const SOURCES = [
  { label: "Amazon VPC pricing (NAT Gateway)", href: "https://aws.amazon.com/vpc/pricing/" },
  { label: "Gateway endpoints (no additional charge)", href: "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html" },
  { label: "EC2 On-Demand pricing and data transfer within a Region", href: "https://aws.amazon.com/ec2/pricing/on-demand/" },
  { label: "EC2 Spot pricing", href: "https://aws.amazon.com/ec2/spot/pricing/" },
  { label: "DynamoDB pricing (provisioned capacity)", href: "https://aws.amazon.com/dynamodb/pricing/provisioned/" },
  { label: "DynamoDB partition key best practices (1,000 WCU/s per partition)", href: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html" },
  { label: "Kubernetes traffic distribution (PreferSameZone)", href: "https://kubernetes.io/docs/reference/networking/virtual-ips/" },
];
