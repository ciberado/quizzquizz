You are classifying an AWS certification exam question.

## Topic Categories (high level)
{{CATEGORIES}}

## Available Topics (choose ONLY from these)
{{TOPICS}}

## Question
{{QUESTION}}

## Answers
{{ANSWERS}}

Return a JSON object with:
```json
{
  "topics": ["<topic1>", "<topic2>", ...],
  "tags": ["<aws-service-1>", "<aws-service-2>", ...],
  "difficulty": "easy" | "medium" | "hard",
  "quality": { "score": 1-5, "rationale": "<one sentence>" }
}
```

---

## Field rules

### topics
Select 1–5 relevant topics from the Available Topics list above. Be thorough — if a question touches multiple areas (e.g. both storage and security), include topics from each relevant area. Only use topics from the list; do not invent new ones.

### tags
List the specific AWS services mentioned or tested (e.g. "s3", "ec2", "lambda", "rds", "vpc", "iam", "cloudfront"). Use lowercase kebab-case. Include services from both the question and the answer options.

### difficulty
Assess the depth of knowledge required:
- **easy**: single-service recall or direct best-practice recognition.
- **medium**: requires understanding interactions between 2–3 services or comparing trade-offs.
- **hard**: multi-step reasoning, subtle edge cases, or deep understanding of service internals.

### quality
Rate the question from 1 (poor) to 5 (excellent). Be critical — most exam-prep questions are 3/5. Reserve 4 for well-crafted scenarios with strong distractors. Reserve 5 for questions requiring genuine multi-step architectural reasoning with no flaws. Give 1–2 for questions with contradictions, missing context, or trivially eliminable distractors.

**Evaluation criteria** (each can lower or raise the score):
1. **Scenario justification**: Does the scenario provide enough context (users, regions, traffic patterns, constraints) to make the correct answer the only logical choice? Or could multiple answers be defensible?
2. **Distractor quality**: Are the wrong answers plausible and meaningfully different? Or can 2+ distractors be instantly eliminated by anyone with basic knowledge?
3. **Internal consistency**: Is the question free of contradictions? (e.g. saying "transitioning to DynamoDB" then saying "current architecture includes DynamoDB tables")
4. **Logical follow-through**: Does the correct answer directly follow from the stated requirements? Or does the question smuggle in unstated assumptions?
5. **Reasoning depth**: Does the question test real architectural reasoning (trade-offs, constraints, cost vs. performance) — or is it just service-name recall?

---

## Calibrated examples

### Example 1 — Score 2/5 (weak scenario, weak distractors)

**Question**: An online gaming company is transitioning user data storage to Amazon DynamoDB to support the company's growing user base. The current architecture includes DynamoDB tables that contain user profiles, achievements, and in-game transactions. The company needs to design a robust, continuously available, and resilient DynamoDB architecture to maintain a seamless gaming experience for users. Which solution will meet these requirements MOST cost-effectively?

**Answers**:
  [CORRECT] Use DynamoDB global tables for automatic multi-Region replication. Deploy tables in multiple AWS Regions. Use provisioned capacity mode. Enable auto scaling.
  [ ] Create DynamoDB tables in a single AWS Region. Use on-demand capacity mode. Use global tables to replicate data across multiple Regions.
  [ ] Use DynamoDB Accelerator (DAX) to cache frequently accessed data. Deploy tables in a single AWS Region and enable auto scaling. Configure Cross-Region Replication manually to additional Regions.
  [ ] Create DynamoDB tables in multiple AWS Regions. Use on-demand capacity mode. Use DynamoDB Streams for Cross-Region Replication between Regions.

**Expected output**:
```json
{
  "topics": ["database:nosql:global-tables-replication", "database:cost:on-demand-vs-provisioned", "database:performance:read-write-capacity-planning", "architecture:ha:multi-region-design"],
  "tags": ["dynamodb", "dynamodb-global-tables"],
  "difficulty": "medium",
  "quality": { "score": 2, "rationale": "The scenario contradicts itself (says 'transitioning to DynamoDB' but 'current architecture includes DynamoDB tables'), provides no multi-region justification for global tables, gives no traffic pattern data to reason about provisioned vs on-demand, and two distractors (manual replication, DynamoDB Streams) are trivially eliminable." }
}
```

### Example 2 — Score 3/5 (tests recall more than reasoning)

**Question**: A telemarketing company is designing its customer call center functionality on AWS. The company needs a solution that provides multiple speaker recognition and generates transcript files. The company wants to query the transcript files to analyze the business patterns. The transcript files must be stored for 7 years for auditing purposes. Which solution will meet these requirements?

**Answers**:
  [CORRECT] Use Amazon Transcribe for multiple speaker recognition. Use Amazon Athena for transcript file analysis.
  [ ] Use Amazon Rekognition for multiple speaker recognition. Store the transcript files in Amazon S3. Use machine learning models for transcript file analysis.
  [ ] Use Amazon Translate for multiple speaker recognition. Store the transcript files in Amazon Redshift. Use SQL queries for transcript file analysis.
  [ ] Use Amazon Rekognition for multiple speaker recognition. Store the transcript files in Amazon S3. Use Amazon Textract for transcript file analysis.

**Expected output**:
```json
{
  "topics": ["data:analytics:ad-hoc-vs-scheduled-queries", "data:transformation:data-format-conversion"],
  "tags": ["transcribe", "athena", "s3"],
  "difficulty": "easy",
  "quality": { "score": 3, "rationale": "Tests basic AWS service selection but distractors are weak — Rekognition is for images, Translate for language translation, and Textract for document OCR — anyone with basic AWS knowledge can eliminate them instantly without reasoning about architecture." }
}
```

### Example 3 — Score 4/5 (good scenario, meaningful trade-offs)

**Question**: A company runs its two-tier ecommerce website on AWS. The web tier consists of a load balancer that sends traffic to Amazon EC2 instances. The database tier uses an Amazon RDS DB instance. The EC2 instances and the RDS DB instance should not be exposed to the public internet. The EC2 instances require internet access to complete payment processing of orders through a third-party web service. The application must be highly available. Which combination of configuration options will meet these requirements? (Choose two.)

**Answers**:
  [CORRECT] Use an Auto Scaling group to launch the EC2 instances in private subnets. Deploy an RDS Multi-AZ DB instance in private subnets.
  [CORRECT] Configure a VPC with two public subnets, two private subnets, and two NAT gateways across two Availability Zones. Deploy an Application Load Balancer in the public subnets.
  [ ] Configure a VPC with two private subnets and two NAT gateways across two Availability Zones. Deploy an Application Load Balancer in the private subnets.
  [ ] Use an Auto Scaling group to launch the EC2 instances in public subnets across two Availability Zones. Deploy an RDS Multi-AZ DB instance in private subnets.

**Expected output**:
```json
{
  "topics": ["network:architecture:vpc-design", "network:architecture:multi-tier-network-design", "network:architecture:subnet-tiers-routing", "network:connectivity:nat-gateway-design", "architecture:ha:multi-az-design", "security:network:public-private-subnets"],
  "tags": ["vpc", "ec2", "rds", "nat-gateway", "application-load-balancer", "auto-scaling"],
  "difficulty": "medium",
  "quality": { "score": 4, "rationale": "Clear multi-constraint scenario (private instances, outbound internet, HA) that requires understanding VPC topology, subnet placement, and NAT design; distractors are plausible and each violates exactly one requirement, forcing careful analysis." }
}
```

### Example 4 — Score 5/5 (strong multi-step reasoning)

**Question**: A company provides a Voice over Internet Protocol (VoIP) service that uses UDP connections. The service consists of Amazon EC2 instances that run in an Auto Scaling group. The company has deployments across multiple AWS Regions. The company needs to route users to the Region with the lowest latency. The company also needs automated failover between Regions. Which solution will meet these requirements?

**Answers**:
  [CORRECT] Deploy a Network Load Balancer (NLB) and an associated target group. Associate the target group with the Auto Scaling group. Use the NLB as an AWS Global Accelerator endpoint in each Region.
  [ ] Deploy an Application Load Balancer (ALB) and an associated target group. Associate the target group with the Auto Scaling group. Use the ALB as an AWS Global Accelerator endpoint in each Region.
  [ ] Deploy a Network Load Balancer (NLB) and an associated target group. Associate the target group with the Auto Scaling group. Create an Amazon Route 53 latency record that points to aliases for each NLB. Create an Amazon CloudFront distribution that uses the latency record as an origin.
  [ ] Deploy an Application Load Balancer (ALB) and an associated target group. Associate the target group with the Auto Scaling group. Create an Amazon Route 53 weighted record that points to aliases for each ALB. Deploy an Amazon CloudFront distribution that uses the weighted record as an origin.

**Expected output**:
```json
{
  "topics": ["network:load-balancing:layer4-vs-layer7-balancing", "network:performance:global-anycast-routing", "network:performance:latency-optimization", "architecture:ha:multi-region-design", "architecture:ha:regional-failover"],
  "tags": ["nlb", "global-accelerator", "ec2", "auto-scaling", "route-53"],
  "difficulty": "hard",
  "quality": { "score": 5, "rationale": "Multi-constraint scenario (UDP protocol, multi-region, low latency, automated failover) requires reasoning through protocol support (NLB for UDP, not ALB), Global Accelerator vs Route 53 for failover, and CloudFront's HTTP-only limitation — each distractor fails on exactly one constraint." }
}
```

---

Only output the JSON object. No commentary, no markdown fences.
