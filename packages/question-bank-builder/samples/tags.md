# Architecting on AWS Chapter Map

This reference consolidates the module `README.md` files into chapter-level study notes. The `Topics` subsections align each chapter to certification-style architecture domains and core concepts. The `Tags` subsections list the AWS services and notable service capabilities referred to in each chapter.

## Chapter 00. Course introduction and capstone architecture overview

### Topics

- course-structure: Course structure, labs, and capstone context for a multi-tier AWS architecture.
- architecture-foundations: Foundational architecture concepts: Regions, Availability Zones, VPC boundaries, public and private tiers.
- certification-alignment: Early certification alignment: resilient multi-AZ design, tier separation, and internet versus private connectivity.

### Tags

- builder-labs: AWS Builder Labs.
- skill-builder: AWS Skill Builder and AWS Cloud Practitioner Essentials.
- vpc-network-stack: Amazon VPC, internet gateway, NAT gateway, public subnet, app subnet, and database subnet.
- application-load-balancer: Application Load Balancer.
- auto-scaling-group: Auto Scaling group.
- efs-mount-targets: Amazon EFS mount targets and file system access.
- aurora-replica-deployment: Amazon Aurora primary and replica deployment.

## Chapter 01. Architecting fundamentals: global infrastructure and Well-Architected thinking

### Topics

- aws-value-prop: AWS value proposition, cloud agility, elasticity, and shared responsibility fundamentals.
- global-infrastructure: Global infrastructure design: Regions, Availability Zones, edge locations, and Local Zones.
- workload-placement: Certification alignment: workload placement for latency, governance, service availability, and cost.
- well-architected-pillars: AWS Well-Architected Framework pillars, workload reviews, and architectural tradeoff analysis.

### Tags

- management-tools: AWS Management Console, AWS CLI, AWS SDKs, and AWS CDK.
- well-architected-tooling: AWS Well-Architected Framework and AWS Well-Architected Tool.
- local-zones: AWS Local Zones.
- cloudfront-edge-caches: Amazon CloudFront edge locations and Regional edge caches.
- s3-origin-example: Amazon S3 as an origin example for globally distributed content.

## Chapter 02. Account security, identity, and least-privilege access design

### Topics

- account-security: Secure account setup, root user protection, and MFA enforcement.
- least-privilege-design: Identity design with least privilege for users, groups, and roles.
- policy-evaluation: Policy evaluation concepts: identity-based policies, resource-based policies, SCPs, and permissions boundaries.
- multi-account-governance: Certification alignment: secure multi-account governance, temporary credentials, federation, and auditability.

### Tags

- iam: AWS Identity and Access Management (IAM).
- sts-assume-role: AWS STS and temporary credentials through `AssumeRole`.
- organizations-scps: AWS Organizations and service control policies (SCPs).
- access-control-basics: MFA, password policies, access keys, IAM roles, IAM users, and IAM groups.
- s3-bucket-policies: Amazon S3 bucket policies and resource-based access control examples.
- ec2-iam-roles: IAM roles for Amazon EC2 and service-to-service access.
- federation-saml: Federation examples with external identity providers and SAML.

## Chapter 03. Networking foundations: IP planning and VPC design

### Topics

- ip-addressing: IPv4, IPv6, subnetting, and CIDR planning for cloud networks.
- multi-az-vpc-design: VPC design across Availability Zones with public and private subnet patterns.
- routing-fundamentals: Routing fundamentals: route tables, internet access, and private egress design.
- network-segmentation: Certification alignment: secure network segmentation, address planning, and resilient multi-AZ network layouts.

### Tags

- amazon-vpc: Amazon VPC.
- cidr-subnet-sizing: VPC CIDR blocks, IPv4/IPv6 support, and subnet sizing.
- route-tables: Route tables and local routes.
- internet-gateway: Internet gateway.
- nat-gateway-eip: NAT gateway and Elastic IP for private-subnet outbound access.
- ec2-vpc-networking: Amazon EC2 networking within VPCs.
- tiered-architecture-services: References to Elastic Load Balancing, Amazon EFS, and Amazon Aurora in the tiered architecture examples.

## Chapter 04. Compute selection and Amazon EC2 design decisions

### Topics

- compute-model-selection: Choosing among VMs, containers, and serverless compute models.
- ec2-launch-planning: EC2 launch planning: AMIs, instance families, storage attachment, networking, tags, and access.
- compute-optimization: Compute optimization concepts: right sizing, processor selection, placement, and image standardization.
- workload-fit: Certification alignment: matching workload characteristics to compute options for performance, resilience, and cost.

### Tags

- amazon-ec2: Amazon EC2.
- amis: Amazon Machine Images (AMIs) and custom AMIs.
- ec2-image-builder: Amazon EC2 Image Builder.
- ebs-optimized: Amazon EBS and EBS-optimized instances.
- lambda: AWS Lambda.
- container-compute-options: AWS Fargate, Amazon ECS, and Amazon EKS as alternative compute models.
- workload-compute-services: AWS Batch and Amazon EMR as workload-specific compute references.
- aws-processors: AWS Graviton, AWS Inferentia, and AWS Trainium processors.
- marketplace-dedicated-hosts: AWS Marketplace AMIs and EC2 Dedicated Hosts.
- compute-optimizer: AWS Compute Optimizer.

## Chapter 05. Storage design across object, file, and block services

### Topics

- storage-selection: Storage selection across block, file, and object models based on access pattern and workload behavior.
- object-storage-design: Object storage architecture for durability, lifecycle, replication, encryption, and access control.
- file-storage-design: File storage design for shared access patterns and managed file systems.
- storage-lifecycle-design: Certification alignment: storage class selection, data protection, scalable access, and cost-aware data lifecycle design.

### Tags

- amazon-s3: Amazon S3.
- s3-object-model: S3 buckets, object keys, prefixes, and version-aware object identity.
- s3-access-controls: S3 Block Public Access, bucket policies, ACL deactivation, and object ownership.
- s3-access-points: S3 Access Points.
- s3-event-notifications: S3 Event Notifications.
- s3-lifecycle-replication: S3 Lifecycle, S3 Replication, Cross-Region Replication (CRR), and Transfer Acceleration.
- s3-storage-tiers: S3 Intelligent-Tiering, S3 Glacier, and archival tiers.
- s3-encryption-options: Server-side encryption options: SSE-S3, SSE-KMS, DSSE-KMS, and SSE-C.
- efs-storage-classes: Amazon EFS with Standard, One Zone, and infrequent access classes.
- amazon-fsx: Amazon FSx.
- ebs-multi-attach: Amazon EBS and EBS Multi-Attach.
- storage-transfer-services: AWS DataSync, AWS Storage Gateway, AWS Snow Family, and AWS Transfer Family.
- cloudfront-s3-delivery: Amazon CloudFront as an S3 content delivery companion.

## Chapter 06. Database service selection, scaling, and managed database resilience

### Topics

- database-selection: Relational versus NoSQL database selection for workload requirements.
- managed-db-tradeoffs: Managed database tradeoffs versus self-managed databases on EC2.
- relational-db-resilience: High availability, read scaling, and encryption for relational databases.
- purpose-built-datastores: Certification alignment: selecting purpose-built data stores, designing for failover, and optimizing read/write patterns.

### Tags

- amazon-rds: Amazon RDS.
- rds-multi-az: RDS Multi-AZ deployments.
- rds-read-replicas: RDS read replicas.
- aurora-storage-backups: Amazon Aurora, including multi-AZ distributed storage and continuous backup to Amazon S3.
- amazon-dynamodb: Amazon DynamoDB.
- dynamodb-global-tables: DynamoDB global tables and DynamoDB Accelerator (DAX).
- elasticache-options: Amazon ElastiCache and ElastiCache Serverless.
- dms: AWS Database Migration Service (AWS DMS).
- sct: AWS Schema Conversion Tool (AWS SCT).
- kms-database-encryption: AWS KMS encryption for database storage.
- ec2-self-managed-db: Amazon EC2 as the self-managed database comparison point.

## Chapter 07. Observability, logging, and scaling with metrics-driven operations

### Topics

- observability-design: Monitoring architecture with metrics, logs, alarms, and operational dashboards.
- audit-forensics: Audit and forensics through API activity logging and network flow visibility.
- telemetry-driven-scaling: Scaling decisions driven by telemetry, utilization trends, and event signals.
- operational-excellence: Certification alignment: operational excellence, resilience through automation, and cost control through elastic scaling.

### Tags

- cloudwatch: Amazon CloudWatch.
- cloudwatch-metrics: CloudWatch metrics, namespaces, dimensions, alarms, dashboards, and Metrics Insights.
- cloudwatch-logs: Amazon CloudWatch Logs, log groups, log streams, and metric filters.
- cloudtrail-audit-logs: AWS CloudTrail and multi-Region audit log delivery to Amazon S3.
- vpc-flow-logs: VPC Flow Logs.
- eventbridge: Amazon EventBridge.
- auto-scaling-services: AWS Auto Scaling and Amazon EC2 Auto Scaling.
- sns-sqs-workflows: Amazon SNS and Amazon SQS for notifications and action workflows.
- data-firehose: Amazon Data Firehose as a log delivery target.

## Chapter 08. Infrastructure as code and deployment automation

### Topics

- infrastructure-as-code: Infrastructure as code for repeatable, reviewable, version-controlled deployments.
- stack-lifecycle: Stack-based lifecycle management: create, update, delete, rollback, and change validation.
- template-design: Template design using parameters, conditions, outputs, and layered stacks.
- automation-governance: Certification alignment: operational excellence through automation, consistent environments, and safer change management.

### Tags

- cloudformation: AWS CloudFormation.
- cloudformation-core: CloudFormation stacks, templates, change sets, parameters, conditions, outputs, and cross-stack references.
- cloudformation-import: Resource import into CloudFormation.
- cdk: AWS CDK.
- ssm-parameter-types: AWS Systems Manager parameter types in CloudFormation.
- cicd-services: AWS CodeCommit, AWS CodeBuild, AWS CodeDeploy, and AWS CodePipeline.
- elastic-beanstalk: AWS Elastic Beanstalk.
- infrastructure-composer: AWS Infrastructure Composer / AWS Application Composer references.
- ec2-ami-iac: Amazon EC2 and AMI references in IaC examples.

## Chapter 09. Microservices and container platform design

### Topics

- microservices-decomposition: Monolith-to-microservices decomposition and loose coupling.
- container-benefits: Containerization benefits for portability, deployment speed, isolation, and service independence.
- orchestration-models: Container orchestration decisions and hosting models.
- application-tier-design: Certification alignment: designing scalable application tiers, service decoupling, and platform choice between managed orchestration options.

### Tags

- amazon-ecr: Amazon ECR.
- amazon-ecs: Amazon ECS, including clusters, services, tasks, service discovery, and CI/CD integrations.
- amazon-eks: Amazon EKS and EKS-based Kubernetes management.
- fargate-container-hosting: AWS Fargate as serverless container hosting.
- ec2-container-hosts: Amazon EC2 as container host capacity.
- elastic-load-balancing: Elastic Load Balancing for decoupled front-end and service routing.
- container-observability: Amazon CloudWatch Logs and Container Insights.
- lambda-microservice-example: AWS Lambda as a microservice compute example.
- container-edge-variants: ECS Anywhere, EKS Anywhere, and EKS Distro references.

## Chapter 10. Advanced networking and hybrid connectivity patterns

### Topics

- private-connectivity: Private connectivity from VPCs to AWS services without internet traversal.
- multi-vpc-patterns: Multi-VPC connectivity patterns and peering tradeoffs as environments scale.
- hybrid-networking: Hybrid connectivity design for on-premises integration.
- private-network-architecture: Certification alignment: private service access, multi-account network architecture, and hybrid resilience/cost tradeoffs.

### Tags

- vpc-endpoints: VPC endpoints.
- interface-endpoints: Interface VPC endpoints powered by AWS PrivateLink.
- gateway-endpoints: Gateway VPC endpoints for Amazon S3 and DynamoDB.
- vpc-peering: VPC peering, including inter-Region peering and nontransitive behavior.
- transit-gateway: AWS Transit Gateway.
- resource-access-manager: AWS Resource Access Manager.
- site-to-site-vpn: AWS Site-to-Site VPN, customer gateway, and virtual private gateway.
- direct-connect: AWS Direct Connect and virtual interfaces.
- private-route-design: Amazon VPC route design for private connectivity.
- private-access-examples: AWS Systems Manager and Amazon S3 as private-access examples.

## Chapter 11. Serverless integration, messaging, and event-driven application design

### Topics

- serverless-patterns: Serverless application patterns for lower operational overhead and pay-for-value scaling.
- api-integration: API exposure and backend integration with managed request handling and security controls.
- async-workflows: Asynchronous messaging, event fan-out, and workflow orchestration.
- decoupled-app-design: Certification alignment: decoupled architectures, burst handling, managed integration services, and cost-efficient application design.

### Tags

- lambda: AWS Lambda.
- api-gateway: Amazon API Gateway with REST APIs, HTTP APIs, API keys, stages, versions, SigV4, caching, access logging, and CloudWatch metrics.
- sqs-queue-features: Amazon SQS with standard queues, FIFO queues, dead-letter queues, visibility timeout, short polling, and long polling.
- sns-topic-features: Amazon SNS with topics, pub/sub delivery, and KMS-encrypted topics.
- step-functions: AWS Step Functions.
- kinesis-streams: Amazon Kinesis and Kinesis Data Streams.
- dynamodb-serverless-store: Amazon DynamoDB as a serverless persistence example.
- fargate-reference-architecture: AWS Fargate as serverless container compute in the reference architecture.
- s3-serverless-static: Amazon S3 for static site hosting and large-message offloading references.

## Chapter 12. Edge services for DNS, content delivery, and DDoS protection

### Topics

- edge-architecture: Edge architecture for global traffic routing, lower latency, and application protection.
- dns-design: DNS design for availability, routing control, and failover.
- cdn-design: CDN design for cached and dynamic delivery at global scale.
- global-traffic-management: Certification alignment: global traffic management, performance optimization, and layered edge security.

### Tags

- route-53: Amazon Route 53.
- route-53-routing: Route 53 hosted zones, health checks, and routing policies: simple, failover, geolocation, geoproximity, latency, multivalue, and weighted.
- cloudfront-edge-caching: Amazon CloudFront and Regional edge caches.
- cloudfront-websockets: CloudFront support for dynamic content and WebSockets.
- waf: AWS WAF.
- shield-protection: AWS Shield Standard and AWS Shield Advanced.
- firewall-manager: AWS Firewall Manager.
- global-accelerator: AWS Global Accelerator.
- edge-location-extensions: AWS Outposts, AWS Local Zones, and AWS Snow Family as edge-location extensions.
- cloudwatch-route53-alarms: Amazon CloudWatch alarms supporting Route 53 health-driven routing.

## Chapter 13. Backup, recovery objectives, and disaster recovery strategy

### Topics

- business-continuity: Business continuity planning with RPO, RTO, testing, and recovery-path validation.
- multi-region-dr: Multi-Region disaster recovery thinking and failover planning.
- backup-governance: Centralized backup governance, retention, lifecycle, and compliance automation.
- recovery-execution: Certification alignment: resilient architectures, backup and restore strategy, DR pattern selection, and automation for recovery execution.

### Tags

- aws-backup: AWS Backup.
- backup-plan-governance: Backup plans, backup vaults, lifecycle policies, tag-based assignment, and cross-account governance through AWS Organizations.
- s3-replication-options: Amazon S3 replication options, including CRR, SRR, bi-directional replication, and on-demand replication.
- efs-replication-models: Amazon EFS Regional and One Zone replication models.
- ebs-snapshots: Amazon EBS snapshots and cross-Region copy.
- rds-dr-features: Amazon RDS Multi-AZ, Multi-AZ clusters, read replicas, and snapshots.
- dynamodb-global-tables: Amazon DynamoDB global tables.
- datasync-snow-family: AWS DataSync and AWS Snow Family for data movement.
- storage-gateway-modes: AWS Storage Gateway: S3 File Gateway, Volume Gateway, and Tape Gateway.
- ec2-recovery-images: Amazon EC2 automatic recovery, AMIs, and EC2 Image Builder.
- recovery-automation-tools: AWS CloudFormation, AWS CLI, and AWS SDK for recovery automation.
- dr-network-components: AWS Direct Connect, Amazon Route 53, Elastic Load Balancing, and Amazon VPC as DR networking components.
- kms-backup-encryption: AWS KMS encryption for protected backups.

## Chapter 14. Course wrap-up and certification preparation path

### Topics

- course-wrap-up: Consolidation of course learning objectives and architecture study areas.
- exam-preparation: Exam preparation workflow: exam guide review, topic reinforcement, practice, and readiness assessment.
- domain-based-study: Certification alignment concepts: domain-based study, hands-on reinforcement, and scenario analysis.

### Tags

- certification-resources: AWS Certification resources.
- skill-builder: AWS Skill Builder.
- cloud-quest: AWS Cloud Quest.
- aws-jams: AWS Jams.
- aws-workshops: AWS Workshops.
- ramp-up-guides: AWS Ramp-Up Guides.
- training-partners: AWS Training and AWS Training Partners resources.
