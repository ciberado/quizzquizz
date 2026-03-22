# Question Bank: Architecture — Ha

## Metadata
- **Topics**: architecture:ha:multi-region-design, architecture:ha:multi-az-design, architecture:ha:regional-failover, architecture:ha:active-active-failover, architecture:ha:availability-zone-strategy, architecture:ha:service-quotas-throttling, architecture:ha:workload-visibility-tracing, architecture:ha:cross-region-replication, architecture:ha:global-load-distribution
- **Default Time Limit**: 30s
- **Description**: Questions covering Architecture — Ha

---

## Questions

### Question-3
**Difficulty**: medium
**Topics**: security:data:encryption-at-rest, security:data:encryption-key-management, security:iam:iam-roles-policies, storage:object:storage-access-patterns, architecture:ha:multi-az-design
**Tags**: kms, ec2, s3, iam
**Quality**: 3/5 — Tests service selection and encryption patterns but scenario lacks specificity on certificate lifecycle, update frequency, or availability constraints that would clearly differentiate between highly available storage options (S3 vs EBS) and justify KMS over Secrets Manager for operational overhead.

A company's containerized application runs on an Amazon EC2 instance. The application needs to download security certificates before it can communicate with other business applications. The company wants a highly secure solution to encrypt and decrypt the certificates in near real time. The solution also needs to store data in highly available storage after the data is encrypted.

Which solution will meet these requirements with the LEAST operational overhead?

- [x] Create an AWS Key Management Service (AWS KMS) customer managed key. Allow the EC2 role to use the KMS key for encryption operations. Store the encrypted data on Amazon S3.
- [ ] Create AWS Secrets Manager secrets for encrypted certificates. Manually update the certificates as needed. Control access to the data by using fine-grained IAM access.
- [ ] Create an AWS Lambda function that uses the Python cryptography library to receive and perform encryption operations. Store the function in an Amazon S3 bucket.
- [ ] Create an AWS Key Management Service (AWS KMS) customer managed key. Allow the EC2 role to use the KMS key for encryption operations. Store the encrypted data on Amazon Elastic Block Store (Amazon EBS) volumes.

---

### Question-6
**Difficulty**: medium
**Topics**: database:nosql:global-tables-replication, database:cost:on-demand-vs-provisioned, database:performance:read-write-capacity-planning, architecture:ha:multi-region-design
**Tags**: dynamodb, dynamodb-global-tables, auto-scaling
**Quality**: 2/5 — Scenario contains internal contradiction ('transitioning to DynamoDB' vs 'current architecture includes DynamoDB tables'), lacks traffic patterns or regional distribution data needed to justify multi-region deployment, provides no cost comparison between options, and distractors are trivially eliminable (manual replication, DynamoDB Streams, DAX caching) by anyone with basic DynamoDB knowledge.

An online gaming company is transitioning user data storage to Amazon DynamoDB to support the company's growing user base. The current architecture includes DynamoDB tables that contain user profiles, achievements, and in-game transactions.



The company needs to design a robust, continuously available, and resilient DynamoDB architecture to maintain a seamless gaming experience for users.



Which solution will meet these requirements MOST cost-effectively?

- [x] Use DynamoDB global tables for automatic multi-Region replication. Deploy tables in multiple AWS Regions. Use provisioned capacity mode. Enable auto scaling.
- [ ] Create DynamoDB tables in a single AWS Region. Use on-demand capacity mode. Use global tables to replicate data across multiple Regions.
- [ ] Use DynamoDB Accelerator (DAX) to cache frequently accessed data. Deploy tables in a single AWS Region and enable auto scaling. Configure Cross-Region Replication manually to additional Regions.
- [ ] Create DynamoDB tables in multiple AWS Regions. Use on-demand capacity mode. Use DynamoDB Streams for Cross-Region Replication between Regions.

---

### Question-8
**Difficulty**: medium
**Topics**: network:performance:latency-optimization, network:performance:global-anycast-routing, architecture:ha:multi-region-design, cost:optimization:data-transfer-cost-reduction
**Tags**: global-accelerator, ec2, cloudfront, direct-connect, site-to-site-vpn
**Quality**: 3/5 — Tests Global Accelerator knowledge but distractors are inconsistent — Direct Connect and VPN are connectivity tools (not latency optimizers for existing APIs), CloudFront alone lacks multi-region endpoint distribution, making the correct answer somewhat obvious rather than requiring deep architectural reasoning.

A company hosts its enterprise resource planning (ERP) system in the us-east-1 Region. The system runs on Amazon EC2 instances. Customers use a public API that is hosted on the EC2 instances to exchange information with the ERP system. International customers report slow API response times from their data centers.



Which solution will improve response times for the international customers MOST cost-effectively?

- [x] Set up AWS Global Accelerator. Configure listeners for the necessary ports. Configure endpoint groups for the appropriate Regions to distribute traffic. Create an endpoint in the group for the API.
- [ ] Create an AWS Direct Connect connection that has a public virtual interface (VIF) to provide connectivity from each customer's data center to us-east-1. Route customer API requests by using a Direct Connect gateway to the ERP system API.
- [ ] Set up an Amazon CloudFront distribution in front of the API. Configure the CachingOptimized managed cache policy to provide improved cache efficiency.
- [ ] Use AWS Site-to-Site VPN to establish dedicated VPN tunnels between Regions and customer networks. Route traffic to the API over the VPN connections.

---

### Question-10
**Difficulty**: medium
**Topics**: governance:automation:infrastructure-as-code, compute:instances:user-data-bootstrapping, network:load-balancing:health-check-configuration, architecture:ha:multi-az-design
**Tags**: systems-manager, ec2, application-load-balancer, automation-document, maintenance-windows
**Quality**: 3/5 — Tests knowledge of Systems Manager automation documents and maintenance windows for patch management, but the scenario lacks depth about why IP-address target groups specifically cause issues, and the distractors are relatively weak — changing target type or relying on State Manager are easily eliminated by anyone familiar with Systems Manager capabilities.

A company uses AWS Systems Manager for routine management and patching of Amazon EC2 instances. The EC2 instances are in an IP address type target group behind an Application Load Balancer (ALB).



New security protocols require the company to remove EC2 instances from service during a patch. When the company attempts to follow the security protocol during the next patch, the company receives errors during the patching window.



Which combination of solutions will resolve the errors? (Choose two.)

- [x] Implement the AWSEC2-PatchLoadBalanacerInstance Systems Manager Automation document to manage the patching process.
- [x] Use Systems Manager Maintenance Windows to automatically remove the instances from service to patch the instances.
- [ ] Change the target type of the target group from IP address type to instance type.
- [ ] Continue to use the existing Systems Manager document without changes because it is already optimized to handle instances that are in an IP address type target group behind an ALB.
- [ ] Configure Systems Manager State Manager to remove the instances from service and manage the patching schedule. Use ALB health checks to re-route traffic.

---

### Question-12
**Difficulty**: medium
**Topics**: compute:scaling:auto-scaling-groups, compute:cost:spot-instances, network:load-balancing:load-balancing-strategy, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, spot-instances, application-load-balancer, launch-template
**Quality**: 3/5 — Tests knowledge of scaling solutions and cost optimization through Spot Instances, but the scenario lacks specific constraints (traffic patterns, budget limits, acceptable error rates) that would justify why Spot Fleet is definitively superior to other scaling approaches; distractors are easily eliminated (vertical scaling, manual scaling, Route 53 for load balancing) without deep reasoning.

A company hosts a website analytics application on a single Amazon EC2 On-Demand Instance. The analytics application is highly resilient and is designed to run in stateless mode.



The company notices that the application is showing signs of performance degradation during busy times and is presenting 5xx errors. The company needs to make the application scale seamlessly.



Which solution will meet these requirements MOST cost-effectively?

- [x] Create an Amazon Machine Image (AMI) of the web application. Apply the AMI to a launch template. Create an Auto Scaling group that includes the launch template. Configure the launch template to use a Spot Fleet. Attach an Application Load Balancer to the Auto Scaling group.
- [ ] Create an Amazon Machine Image (AMI) of the web application. Use the AMI to launch a second EC2 On-Demand Instance. Use an Application Load Balancer to distribute the load across the two EC2 instances.
- [ ] Create an Amazon Machine Image (AMI) of the web application. Use the AMI to launch a second EC2 On-Demand Instance. Use Amazon Route 53 weighted routing to distribute the load across the two EC2 instances.
- [ ] Create an AWS Lambda function to stop the EC2 instance and change the instance type. Create an Amazon CloudWatch alarm to invoke the Lambda function when CPU utilization is more than 75%.

---

### Question-14
**Difficulty**: easy
**Topics**: network:architecture:vpc-design, network:architecture:multi-tier-network-design, network:connectivity:nat-gateway-design, architecture:ha:multi-az-design, security:network:public-private-subnets
**Tags**: vpc, nat-gateway, ec2, internet-gateway
**Quality**: 3/5 — Tests NAT gateway deployment for private subnet internet access, but distractors are trivially eliminable — NAT instances are obsolete, internet gateways cannot attach to private subnets, and egress-only internet gateways are IPv6-only — requiring only basic VPC knowledge rather than architectural reasoning.

A solutions architect is designing a VPC with public and private subnets. The VPC and subnets use IPv4 CIDR blocks. There is one public subnet and one private subnet in each of three Availability Zones (AZs) for high availability. An internet gateway is used to provide internet access for the public subnets. The private subnets require access to the internet to allow Amazon EC2 instances to download software updates.

What should the solutions architect do to enable Internet access for the private subnets?

- [x] Create three NAT gateways, one for each public subnet in each AZ. Create a private route table for each AZ that forwards non-VPC traffic to the NAT gateway in its AZ.
- [ ] Create three NAT instances, one for each private subnet in each AZ. Create a private route table for each AZ that forwards non-VPC traffic to the NAT instance in its AZ.
- [ ] Create a second internet gateway on one of the private subnets. Update the route table for the private subnets that forward non-VPC traffic to the private internet gateway.
- [ ] Create an egress-only internet gateway on one of the public subnets. Update the route table for the private subnets that forward non-VPC traffic to the egress-only Internet gateway.

---

### Question-27
**Difficulty**: medium
**Topics**: security:network:ddos-protection, network:performance:edge-acceleration-cdn, architecture:ha:multi-az-design, network:load-balancing:load-balancing-strategy
**Tags**: shield, cloudfront, ec2, ddos, aws-waf
**Quality**: 3/5 — Tests recall of AWS DDoS mitigation services but distractors are weak — GuardDuty monitors threats rather than mitigating attacks, Lambda-based ACL blocking is too slow for large-scale DDoS, and Spot Instances are irrelevant to DDoS protection — making the correct answers identifiable through basic AWS service knowledge rather than genuine architectural reasoning.

A solutions architect must design a highly available infrastructure for a website. The website is powered by Windows web servers that run on Amazon EC2 instances. The solutions architect must implement a solution that can mitigate a large-scale DDoS attack that originates from thousands of IP addresses. Downtime is not acceptable for the website.

Which actions should the solutions architect take to protect the website from such an attack? (Choose two.)

- [x] Use AWS Shield Advanced to stop the DDoS attack.
- [x] Configure the website to use Amazon CloudFront for both static and dynamic content.
- [ ] Configure Amazon GuardDuty to automatically block the attackers.
- [ ] Use an AWS Lambda function to automatically add attacker IP addresses to VPC network ACLs.
- [ ] Use EC2 Spot Instances in an Auto Scaling group with a target tracking scaling policy that is set to 80% CPU utilization.

---

### Question-35
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, architecture:resilience:redundancy-patterns, compute:scaling:auto-scaling-groups, integration:messaging:queuing-concepts
**Tags**: amazon-mq, ec2, rds, auto-scaling, activemq
**Quality**: 3/5 — Tests understanding of HA patterns across multiple services (messaging, compute, database), but the correct answer is largely deterministic — Auto Scaling groups and Multi-AZ are standard best practices, and distractors differ only marginally in whether they include managed services vs. manual replication, making weak distractors that don't require deep architectural reasoning.

A company recently migrated a message processing system to AWS. The system receives messages into an ActiveMQ queue running on an Amazon EC2 instance. Messages are processed by a consumer application running on Amazon EC2. The consumer application processes the messages and writes results to a MySQL database running on Amazon EC2. The company wants this application to be highly available with low operational complexity.

Which architecture offers the HIGHEST availability?

- [x] Use Amazon MQ with active/standby brokers configured across two Availability Zones. Add an Auto Scaling group for the consumer EC2 instances across two Availability Zones. Use Amazon RDS for MySQL with Multi-AZ enabled.
- [ ] Add a second ActiveMQ server to another Availability Zone. Add an additional consumer EC2 instance in another Availability Zone. Replicate the MySQL database to another Availability Zone.
- [ ] Use Amazon MQ with active/standby brokers configured across two Availability Zones. Add an additional consumer EC2 instance in another Availability Zone. Replicate the MySQL database to another Availability Zone.
- [ ] Use Amazon MQ with active/standby brokers configured across two Availability Zones. Add an additional consumer EC2 instance in another Availability Zone. Use Amazon RDS for MySQL with Multi-AZ enabled.

---

### Question-36
**Difficulty**: medium
**Topics**: compute:containers:container-orchestration, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, architecture:ha:multi-az-design, compute:cost:compute-purchasing-options
**Tags**: fargate, ecs, application-load-balancer, auto-scaling
**Quality**: 3/5 — Tests understanding of containerized workload migration and operational overhead trade-offs, but distractors are somewhat weak — Lambda requires code rewrite (explicitly ruled out), EC2 lacks auto-scaling detail, and HPC is obviously wrong for web requests — making the correct answer too obvious for strong candidates.

A company hosts a containerized web application on a fleet of on-premises servers that process incoming requests. The number of requests is growing quickly. The on-premises servers cannot handle the increased number of requests. The company wants to move the application to AWS with minimum code changes and minimum development effort.

Which solution will meet these requirements with the LEAST operational overhead?

- [x] Use AWS Fargate on Amazon Elastic Container Service (Amazon ECS) to run the containerized web application with Service Auto Scaling. Use an Application Load Balancer to distribute the incoming requests.
- [ ] Use two Amazon EC2 instances to host the containerized web application. Use an Application Load Balancer to distribute the incoming requests.
- [ ] Use AWS Lambda with a new code that uses one of the supported languages. Create multiple Lambda functions to support the load. Use Amazon API Gateway as an entry point to the Lambda functions.
- [ ] Use a high performance computing (HPC) solution such as AWS ParallelCluster to establish an HPC cluster that can process the incoming requests at the appropriate scale.

---

### Question-42
**Difficulty**: easy
**Topics**: storage:object:storage-access-patterns, storage:object:storage-tiering, cost:optimization:storage-size-optimization, architecture:ha:multi-az-design
**Tags**: s3, ebs, efs, ec2, opensearch
**Quality**: 3/5 — Tests basic storage service selection for large-scale document repository with cost sensitivity, but distractors are too easily eliminated — EBS for 900 TB across instances is impractical, EFS is more expensive than S3 for this use case, and OpenSearch is a search/analytics service, not primary storage — requiring minimal architectural reasoning.

A company is building a web-based application running on Amazon EC2 instances in multiple Availability Zones. The web application will provide access to a repository of text documents totaling about 900 TB in size. The company anticipates that the web application will experience periods of high demand. A solutions architect must ensure that the storage component for the text documents can scale to meet the demand of the application at all times. The company is concerned about the overall cost of the solution.

Which storage solution meets these requirements MOST cost-effectively?

- [x] Amazon S3
- [ ] Amazon Elastic Block Store (Amazon EBS)
- [ ] Amazon Elastic File System (Amazon EFS)
- [ ] Amazon OpenSearch Service (Amazon Elasticsearch Service)

---

### Question-43
**Difficulty**: medium
**Topics**: security:application:web-application-firewall, security:network:ingress-egress-filtering, governance:automation:infrastructure-as-code, architecture:ha:multi-region-design
**Tags**: api-gateway, waf, firewall-manager, shield
**Quality**: 4/5 — Well-constructed scenario testing multi-account, multi-region WAF deployment; the key architectural insight is that Firewall Manager centralizes rule management across accounts and regions, eliminating redundant per-region setup, while distractors present individually correct services but miss the centralization requirement.

A global company is using Amazon API Gateway to design REST APIs for its loyalty club users in the us-east-1 Region and the ap-southeast-2 Region. A solutions architect must design a solution to protect these API Gateway managed REST APIs across multiple accounts from SQL injection and cross-site scripting attacks.

Which solution will meet these requirements with the LEAST amount of administrative effort?

- [x] Set up AWS Firewall Manager in both Regions. Centrally configure AWS WAF rules.
- [ ] Set up AWS WAF in both Regions. Associate Regional web ACLs with an API stage.
- [ ] Set up AWS Shield in bath Regions. Associate Regional web ACLs with an API stage.
- [ ] Set up AWS Shield in one of the Regions. Associate Regional web ACLs with an API stage.

---

### Question-45
**Difficulty**: medium
**Topics**: network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, network:load-balancing:load-balancing-strategy
**Tags**: global-accelerator, nlb, route-53, ec2, cloudfront
**Quality**: 4/5 — Well-structured multi-region scenario with clear requirements (US/EU users, performance, availability) where Global Accelerator is the only correct choice; distractors involving Route 53 geolocation/latency with CloudFront are plausible but fundamentally flawed because CloudFront doesn't work with DNS routing policies as origins, making them meaningfully weaker than the correct answer.

A company has implemented a self-managed DNS solution on three Amazon EC2 instances behind a Network Load Balancer (NLB) in the us-west-2 Region. Most of the company's users are located in the United States and Europe. The company wants to improve the performance and availability of the solution. The company launches and configures three EC2 instances in the eu-west-1 Region and adds the EC2 instances as targets for a new NLB.

Which solution can the company use to route traffic to all the EC2 instances?

- [x] Create a standard accelerator in AWS Global Accelerator. Create endpoint groups in us-west-2 and eu-west-1. Add the two NLBs as endpoints for the endpoint groups.
- [ ] Create an Amazon Route 53 geolocation routing policy to route requests to one of the two NLBs. Create an Amazon CloudFront distribution. Use the Route 53 record as the distribution’s origin.
- [ ] Attach Elastic IP addresses to the six EC2 instances. Create an Amazon Route 53 geolocation routing policy to route requests to one of the six EC2 instances. Create an Amazon CloudFront distribution. Use the Route 53 record as the distribution's origin.
- [ ] Replace the two NLBs with two Application Load Balancers (ALBs). Create an Amazon Route 53 latency routing policy to route requests to one of the two ALBs. Create an Amazon CloudFront distribution. Use the Route 53 record as the distribution’s origin.

---

### Question-48
**Difficulty**: easy
**Topics**: network:load-balancing:ssl-offloading, security:application:tls-termination-strategy, compute:instances:compute-utilization-optimization, architecture:ha:multi-az-design
**Tags**: ec2, acm, application-load-balancer, ssl-tls
**Quality**: 3/5 — Tests basic SSL offloading best practice but distractors are weak — installing ACM certificates on instances is not standard practice, S3 cannot perform SSL termination, and a proxy instance defeats the purpose of offloading; scenario lacks specificity on traffic volume, regions, or cost constraints that would deepen reasoning.

A company has a dynamic web application hosted on two Amazon EC2 instances. The company has its own SSL certificate, which is on each instance to perform SSL termination.

There has been an increase in traffic recently, and the operations team determined that SSL encryption and decryption is causing the compute capacity of the web servers to reach their maximum limit.

What should a solutions architect do to increase the application's performance?

- [x] Import the SSL certificate into AWS Certificate Manager (ACM). Create an Application Load Balancer with an HTTPS listener that uses the SSL certificate from ACM.
- [ ] Create a new SSL certificate using AWS Certificate Manager (ACM). Install the ACM certificate on each instance.
- [ ] Create an Amazon S3 bucket Migrate the SSL certificate to the S3 bucket. Configure the EC2 instances to reference the bucket for SSL termination.
- [ ] Create another EC2 instance as a proxy server. Migrate the SSL certificate to the new instance and configure it to direct connections to the existing EC2 instances.

---

### Question-50
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, network:architecture:multi-tier-network-design, network:architecture:subnet-tiers-routing, network:connectivity:nat-gateway-design, architecture:ha:multi-az-design, security:network:public-private-subnets
**Tags**: vpc, ec2, rds, nat-gateway, application-load-balancer, auto-scaling
**Quality**: 4/5 — Clear multi-constraint scenario (private instances, outbound internet access, HA) requires understanding VPC topology, subnet placement, NAT design, and load balancer positioning; distractors are plausible and each violates exactly one requirement, forcing careful analysis.

A company runs its two-tier ecommerce website on AWS. The web tier consists of a load balancer that sends traffic to Amazon EC2 instances. The database tier uses an Amazon RDS DB instance. The EC2 instances and the RDS DB instance should not be exposed to the public internet. The EC2 instances require internet access to complete payment processing of orders through a third-party web service. The application must be highly available.

Which combination of configuration options will meet these requirements? (Choose two.)

- [x] Use an Auto Scaling group to launch the EC2 instances in private subnets. Deploy an RDS Multi-AZ DB instance in private subnets.
- [x] Configure a VPC with one public subnet, one private subnet, and two NAT gateways across two Availability Zones. Deploy an Application Load Balancer in the public subnet.
D. Configure a VPC with two public subnets, two private subnets, and two NAT gateways across two Availability Zones. Deploy an Application Load Balancer in the public subnets.
- [ ] Configure a VPC with two private subnets and two NAT gateways across two Availability Zones. Deploy an Application Load Balancer in the private subnets.
- [ ] Use an Auto Scaling group to launch the EC2 instances in public subnets across two Availability Zones. Deploy an RDS Multi-AZ DB instance in private subnets.

---

### Question-55
**Difficulty**: medium
**Topics**: security:data:secrets-rotation-management, security:data:encryption-key-management, database:migration:zero-downtime-migration, architecture:ha:multi-region-design
**Tags**: secrets-manager, rds, kms, systems-manager, s3, eventbridge, lambda, dynamodb
**Quality**: 4/5 — Clear multi-region credential rotation scenario with meaningful trade-offs between purpose-built services (Secrets Manager) and custom solutions; distractors are plausible but each introduces unnecessary operational overhead (manual Lambda orchestration, DynamoDB management, or Systems Manager's lack of built-in RDS rotation integration).

A company performs monthly maintenance on its AWS infrastructure. During these maintenance activities, the company needs to rotate the credentials for its Amazon RDS for MySQL databases across multiple AWS Regions.

Which solution will meet these requirements with the LEAST operational overhead?

- [x] Store the credentials as secrets in AWS Secrets Manager. Use multi-Region secret replication for the required Regions. Configure Secrets Manager to rotate the secrets on a schedule.
- [ ] Store the credentials as secrets in AWS Systems Manager by creating a secure string parameter. Use multi-Region secret replication for the required Regions. Configure Systems Manager to rotate the secrets on a schedule.
- [ ] Store the credentials in an Amazon S3 bucket that has server-side encryption (SSE) enabled. Use Amazon EventBridge (Amazon CloudWatch Events) to invoke an AWS Lambda function to rotate the credentials.
- [ ] Encrypt the credentials as secrets by using AWS Key Management Service (AWS KMS) multi-Region customer managed keys. Store the secrets in an Amazon DynamoDB global table. Use an AWS Lambda function to retrieve the secrets from DynamoDB. Use the RDS API to rotate the secrets.

---

### Question-56
**Difficulty**: easy
**Topics**: compute:scaling:target-tracking-scaling, compute:scaling:scaling-policies, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, application-load-balancer
**Quality**: 3/5 — Tests basic Auto Scaling policy selection but lacks scenario depth — no traffic patterns, cost constraints, or performance trade-offs justify why target tracking is superior; distractors are easily eliminable (Lambda for capacity updates is non-standard, scheduled scaling requires predictable patterns) without architectural reasoning.

An application runs on Amazon EC2 instances across multiple Availability Zonas. The instances run in an Amazon EC2 Auto Scaling group behind an Application Load Balancer. The application performs best when the CPU utilization of the EC2 instances is at or near 40%.

What should a solutions architect do to maintain the desired performance across all instances in the group?

- [x] Use a target tracking policy to dynamically scale the Auto Scaling group.
- [ ] Use a simple scaling policy to dynamically scale the Auto Scaling group.
- [ ] Use an AWS Lambda function ta update the desired Auto Scaling group capacity.
- [ ] Use scheduled scaling actions to scale up and scale down the Auto Scaling group.

---

### Question-58
**Difficulty**: easy
**Topics**: network:performance:content-delivery-strategy, network:performance:edge-acceleration-cdn, storage:object:storage-access-patterns, cost:optimization:data-transfer-cost-reduction, architecture:ha:global-load-distribution
**Tags**: cloudfront, s3
**Quality**: 3/5 — Tests basic service selection for global content delivery and cost-effectiveness, but distractors are weak — Lambda/DynamoDB is inappropriate for static file serving, EC2 Auto Scaling is resource-intensive, and Route 53 alone doesn't deliver content — any AWS practitioner can eliminate these without deep architectural reasoning.

A company’s website provides users with downloadable historical performance reports. The website needs a solution that will scale to meet the company’s website demands globally. The solution should be cost-effective, limit the provisioning of infrastructure resources, and provide the fastest possible response time.

Which combination should a solutions architect recommend to meet these requirements?

- [x] Amazon CloudFront and Amazon S3
- [ ] AWS Lambda and Amazon DynamoDB
- [ ] Application Load Balancer with Amazon EC2 Auto Scaling
- [ ] Amazon Route 53 with internal Application Load Balancers

---

### Question-59
**Difficulty**: medium
**Topics**: database:migration:heterogeneous-db-migration, database:migration:zero-downtime-migration, architecture:dr:disaster-recovery-strategies, architecture:ha:multi-region-design, database:relational:database-replication-strategies
**Tags**: rds-custom, rds, oracle, ec2
**Quality**: 4/5 — Clear scenario with specific constraints (upgrade Oracle, minimize operational overhead, maintain OS access, enable DR) that directly favors RDS Custom over standard RDS (OS access) and EC2 (operational overhead); distractors are meaningfully different and each violates at least one requirement, requiring understanding of managed vs. self-managed database trade-offs.

A company runs an Oracle database on premises. As part of the company’s migration to AWS, the company wants to upgrade the database to the most recent available version. The company also wants to set up disaster recovery (DR) for the database. The company needs to minimize the operational overhead for normal operations and DR setup. The company also needs to maintain access to the database's underlying operating system.

Which solution will meet these requirements?

- [x] Migrate the Oracle database to Amazon RDS Custom for Oracle. Create a read replica for the database in another AWS Region.
- [ ] Migrate the Oracle database to an Amazon EC2 instance. Set up database replication to a different AWS Region.
- [ ] Migrate the Oracle database to Amazon RDS for Oracle. Activate Cross-Region automated backups to replicate the snapshots to another AWS Region.
- [ ] Migrate the Oracle database to Amazon RDS for Oracle. Create a standby database in another Availability Zone.

---

### Question-64
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:multi-region-design, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment, integration:messaging:queuing-concepts
**Tags**: amazon-mq, rabbitmq, ec2, auto-scaling, rds, postgresql
**Quality**: 4/5 — Clear requirement (highest availability, least operational overhead) with a realistic single-AZ bottleneck scenario; correct answer requires understanding managed services vs self-managed EC2, Multi-AZ benefits, and Auto Scaling for resilience; distractors are plausible but each introduces unnecessary operational complexity (self-managed RabbitMQ or PostgreSQL Auto Scaling groups) that contradicts the 'least operational overhead' constraint.

A company runs its ecommerce application on AWS. Every new order is published as a massage in a RabbitMQ queue that runs on an Amazon EC2 instance in a single Availability Zone. These messages are processed by a different application that runs on a separate EC2 instance. This application stores the details in a PostgreSQL database on another EC2 instance. All the EC2 instances are in the same Availability Zone.

The company needs to redesign its architecture to provide the highest availability with the least operational overhead.

What should a solutions architect do to meet these requirements?

- [x] Migrate the queue to a redundant pair (active/standby) of RabbitMQ instances on Amazon MQ. Create a Multi-AZ Auto Scaling group for EC2 instances that host the application. Migrate the database to run on a Multi-AZ deployment of Amazon RDS for PostgreSQL.
- [ ] Migrate the queue to a redundant pair (active/standby) of RabbitMQ instances on Amazon MQ. Create a Multi-AZ Auto Scaling group for EC2 instances that host the application. Create another Multi-AZ Auto Scaling group for EC2 instances that host the PostgreSQL database.
- [ ] Create a Multi-AZ Auto Scaling group for EC2 instances that host the RabbitMQ queue. Create another Multi-AZ Auto Scaling group for EC2 instances that host the application. Migrate the database to run on a Multi-AZ deployment of Amazon RDS for PostgreSQL.
- [ ] Create a Multi-AZ Auto Scaling group for EC2 instances that host the RabbitMQ queue. Create another Multi-AZ Auto Scaling group for EC2 instances that host the application. Create a third Multi-AZ Auto Scaling group for EC2 instances that host the PostgreSQL database

---

### Question-66
**Difficulty**: medium
**Topics**: database:relational:database-replication-strategies, database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: aurora, rds, ec2, auto-scaling, alb, mysql
**Quality**: 4/5 — Clear scenario with specific constraints (read-heavy, unpredictable load, high availability, performance degradation) that directly maps to Aurora Auto Scaling; plausible distractors (Redshift for analytics, single-AZ RDS, ElastiCache) each fail one requirement, requiring careful analysis of database scaling patterns.

A company runs an ecommerce application on Amazon EC2 instances behind an Application Load Balancer. The instances run in an Amazon EC2 Auto Scaling group across multiple Availability Zones. The Auto Scaling group scales based on CPU utilization metrics. The ecommerce application stores the transaction data in a MySQL 8.0 database that is hosted on a large EC2 instance.

The database's performance degrades quickly as application load increases. The application handles more read requests than write transactions. The company wants a solution that will automatically scale the database to meet the demand of unpredictable read workloads while maintaining high availability.

Which solution will meet these requirements?

- [x] Use Amazon Aurora with a Multi-AZ deployment. Configure Aurora Auto Scaling with Aurora Replicas.
- [ ] Use Amazon Redshift with a single node for leader and compute functionality.
- [ ] Use Amazon RDS with a Single-AZ deployment Configure Amazon RDS to add reader instances in a different Availability Zone.
- [ ] Use Amazon ElastiCache for Memcached with EC2 Spot Instances.

---

### Question-68
**Difficulty**: medium
**Topics**: network:performance:latency-optimization, network:performance:edge-acceleration-cdn, network:performance:global-anycast-routing, architecture:ha:global-load-distribution
**Tags**: cloudfront, alb, ec2, route-53
**Quality**: 3/5 — Tests CloudFront caching benefits but lacks traffic pattern specificity (why is single region + CDN better than multi-region?); distractors are eliminable with basic CDN knowledge, though Route 53 latency/geolocation routing are plausible alternatives that require understanding CloudFront's superiority for mixed static/dynamic content.

A company runs a web-based portal that provides users with global breaking news, local alerts, and weather updates. The portal delivers each user a personalized view by using mixture of static and dynamic content. Content is served over HTTPS through an API server running on an Amazon EC2 instance behind an Application Load Balancer (ALB). The company wants the portal to provide this content to its users across the world as quickly as possible.

How should a solutions architect design the application to ensure the LEAST amount of latency for all users?

- [x] Deploy the application stack in a single AWS Region. Use Amazon CloudFront to serve all static and dynamic content by specifying the ALB as an origin.
- [ ] Deploy the application stack in two AWS Regions. Use an Amazon Route 53 latency routing policy to serve all content from the ALB in the closest Region.
- [ ] Deploy the application stack in a single AWS Region. Use Amazon CloudFront to serve the static content. Serve the dynamic content directly from the ALB.
- [ ] Deploy the application stack in two AWS Regions. Use an Amazon Route 53 geolocation routing policy to serve all content from the ALB in the closest Region.

---

### Question-69
**Difficulty**: hard
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, compute:scaling:auto-scaling-groups
**Tags**: global-accelerator, nlb, ec2, auto-scaling, route-53, cloudfront, lambda, alb, api-gateway
**Quality**: 5/5 — Multi-constraint scenario (UDP protocol, low latency, edge routing, static IPs, HA) requires reasoning through protocol support (Global Accelerator and NLB for UDP vs CloudFront/ALB for HTTP), Global Accelerator's anycast static IPs for edge routing, and EC2 requirement for modified kernel — each distractor fails on exactly one or more critical constraints.

A gaming company is designing a highly available architecture. The application runs on a modified Linux kernel and supports only UDP-based traffic. The company needs the front-end tier to provide the best possible user experience. That tier must have low latency, route traffic to the nearest edge location, and provide static IP addresses for entry into the application endpoints.

What should a solutions architect do to meet these requirements?

- [x] Configure AWS Global Accelerator to forward requests to a Network Load Balancer. Use Amazon EC2 instances for the application in an EC2 Auto Scaling group.
- [ ] Configure Amazon Route 53 to forward requests to an Application Load Balancer. Use AWS Lambda for the application in AWS Application Auto Scaling.
- [ ] Configure Amazon CloudFront to forward requests to a Network Load Balancer. Use AWS Lambda for the application in an AWS Application Auto Scaling group.
- [ ] Configure Amazon API Gateway to forward requests to an Application Load Balancer. Use Amazon EC2 instances for the application in an EC2 Auto Scaling group.

---

### Question-72
**Difficulty**: medium
**Topics**: compute:scaling:auto-scaling-groups, compute:cost:spot-instances, database:relational:database-engine-selection, architecture:ha:multi-az-design, network:load-balancing:load-balancing-strategy
**Tags**: ec2, aurora, rds, auto-scaling, spot-fleet, application-load-balancer, launch-template
**Quality**: 4/5 — Well-structured scenario with clear requirements (scaling, cost-effectiveness, performance) where the correct answer intelligently combines database migration (Aurora over RDS for cost/performance), horizontal scaling via ASG, and Spot instances for cost optimization; distractors are plausible but each makes a suboptimal trade-off (static scaling, On-Demand only, or reactive vertical scaling).

A company hosts a website analytics application on a single Amazon EC2 On-Demand Instance. The analytics software is written in PHP and uses a MySQL database. The analytics software, the web server that provides PHP, and the database server are all hosted on the EC2 instance. The application is showing signs of performance degradation during busy times and is presenting 5xx errors. The company needs to make the application scale seamlessly.

Which solution will meet these requirements MOST cost-effectively?

- [x] Migrate the database to an Amazon Aurora MySQL DB instance. Create an AMI of the web application. Apply the AMI to a launch template. Create an Auto Scaling group with the launch template Configure the launch template to use a Spot Fleet. Attach an Application Load Balancer to the Auto Scaling group.
- [ ] Migrate the database to an Amazon RDS for MySQL DB instance. Create an AMI of the web application. Use the AMI to launch a second EC2 On-Demand Instance. Use an Application Load Balancer to distribute the load to each EC2 instance.
- [ ] Migrate the database to an Amazon RDS for MySQL DB instance. Create an AMI of the web application. Use the AMI to launch a second EC2 On-Demand Instance. Use Amazon Route 53 weighted routing to distribute the load across the two EC2 instances.
- [ ] Migrate the database to an Amazon Aurora MySQL DB instance. Create an AWS Lambda function to stop the EC2 instance and change the instance type. Create an Amazon CloudWatch alarm to invoke the Lambda function when CPU utilization surpasses 75%.

---

### Question-83
**Difficulty**: easy
**Topics**: network:performance:edge-acceleration-cdn, network:performance:content-delivery-strategy, storage:object:storage-access-patterns, architecture:ha:global-load-distribution
**Tags**: cloudfront, s3, datasync, global-accelerator, sqs
**Quality**: 3/5 — Tests basic CloudFront service recognition for global content delivery, but distractors are weak — DataSync is for on-premises data transfer, Global Accelerator for UDP/non-HTTP traffic, and SQS for messaging — making the correct answer trivially obvious without requiring architectural reasoning.

A large media company hosts a web application on AWS. The company wants to start caching confidential media files so that users around the world will have reliable access to the files. The content is stored in Amazon S3 buckets. The company must deliver the content quickly, regardless of where the requests originate geographically.

Which solution will meet these requirements?

- [x] Deploy Amazon CloudFront to connect the S3 buckets to CloudFront edge servers.
- [ ] Use AWS DataSync to connect the S3 buckets to the web application.
- [ ] Deploy AWS Global Accelerator to connect the S3 buckets to the web application.
- [ ] Use Amazon Simple Queue Service (Amazon SQS) to connect the S3 buckets to the web application.

---

### Question-86
**Difficulty**: easy
**Topics**: network:performance:edge-acceleration-cdn, network:performance:latency-optimization, network:performance:content-delivery-strategy, architecture:ha:global-load-distribution
**Tags**: cloudfront, global-accelerator, route-53, s3-transfer-acceleration
**Quality**: 2/5 — Tests basic service-name recall without architectural reasoning; CloudFront is obviously correct for streaming (both real-time and on-demand), and the other distractors are trivially eliminable — Global Accelerator is for non-streaming TCP/UDP traffic, Route 53 is DNS-only, and S3 Transfer Acceleration doesn't apply to streaming use cases.

A solutions architect is optimizing a website for an upcoming musical event. Videos of the performances will be streamed in real time and then will be available on demand. The event is expected to attract a global online audience.



Which service will improve the performance of both the real-time and on-demand streaming?

- [x] Amazon CloudFront
- [ ] AWS Global Accelerator
- [ ] Amazon Route 53
- [ ] Amazon S3 Transfer Acceleration

---

### Question-90
**Difficulty**: medium
**Topics**: compute:serverless:event-driven-architectures, compute:serverless:serverless-cost-optimization, architecture:ha:multi-az-design, database:relational:multi-az-deployment, storage:object:event-notification-triggers
**Tags**: s3, lambda, aurora, ec2, ebs, sqs, ecs, rds
**Quality**: 3/5 — Tests serverless vs managed compute trade-offs and HA database design, but distractors are easily eliminated — EBS Multi-Attach is not designed for this use case, SQS/ECS adds unnecessary complexity, and EC2-only lacks scalability — reducing reasoning depth required.

A company has a small Python application that processes JSON documents and outputs the results to an on-premises SQL database. The application runs thousands of times each day. The company wants to move the application to the AWS Cloud. The company needs a highly available solution that maximizes scalability and minimizes operational overhead.



Which solution will meet these requirements?

- [x] Place the JSON documents in an Amazon S3 bucket. Create an AWS Lambda function that runs the Python code to process the documents as they arrive in the S3 bucket. Store the results in an Amazon Aurora DB cluster.
- [ ] Place the JSON documents in an Amazon S3 bucket. Run the Python code on multiple Amazon EC2 instances to process the documents. Store the results in an Amazon Aurora DB cluster.
- [ ] Place the JSON documents in an Amazon Elastic Block Store (Amazon EBS) volume. Use the EBS Multi-Attach feature to attach the volume to multiple Amazon EC2 instances. Run the Python code on the EC2 instances to process the documents. Store the results on an Amazon RDS DB instance.
- [ ] Place the JSON documents in an Amazon Simple Queue Service (Amazon SQS) queue as messages. Deploy the Python code as a container on an Amazon Elastic Container Service (Amazon ECS) cluster that is configured with the Amazon EC2 launch type. Use the container to process the SQS messages. Store the results on an Amazon RDS DB instance.

---

### Question-91
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:object:storage-access-patterns, storage:performance:storage-performance-optimization, architecture:ha:multi-az-design, compute:cost:spot-instances
**Tags**: fsx-for-lustre, s3, ec2, spot-instances
**Quality**: 4/5 — Clear HPC scenario with specific requirements (Linux, high-performance file system, persistent storage, on-premises data transfer) where FSx for Lustre is the only correct choice; distractors effectively eliminate through protocol incompatibility (Windows File Server), archive mismatch (S3 Glacier), and insufficient performance (EBS), requiring understanding of workload-storage integration trade-offs.

A company wants to use high performance computing (HPC) infrastructure on AWS for financial risk modeling. The company’s HPC workloads run on Linux. Each HPC workflow runs on hundreds of Amazon EC2 Spot Instances, is short-lived, and generates thousands of output files that are ultimately stored in persistent storage for analytics and long-term future use.



The company seeks a cloud storage solution that permits the copying of on-premises data to long-term persistent storage to make data available for processing by all EC2 instances. The solution should also be a high performance file system that is integrated with persistent storage to read and write datasets and output files.



Which combination of AWS services meets these requirements?

- [x] Amazon FSx for Lustre integrated with Amazon S3
- [ ] Amazon FSx for Windows File Server integrated with Amazon S3
- [ ] Amazon S3 Glacier integrated with Amazon Elastic Block Store (Amazon EBS)
- [ ] Amazon S3 bucket with a VPC endpoint integrated with an Amazon Elastic Block Store (Amazon EBS) General Purpose SSD (gp2) volume

---

### Question-92
**Difficulty**: medium
**Topics**: compute:containers:container-orchestration, compute:containers:when-to-containerize, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design, compute:serverless:serverless-patterns
**Tags**: ecr, ecs, fargate, ec2, auto-scaling, cloudwatch
**Quality**: 4/5 — Clear scenario with meaningful trade-offs between Fargate (minimal ops overhead) vs EC2 launch type (requires infrastructure management), and between managed scaling (target tracking) vs manual monitoring; distractors meaningfully differ in operational burden and scalability approach.

A company is building a containerized application on premises and decides to move the application to AWS. The application will have thousands of users soon after it is deployed. The company is unsure how to manage the deployment of containers at scale. The company needs to deploy the containerized application in a highly available architecture that minimizes operational overhead.



Which solution will meet these requirements?

- [x] Store container images in an Amazon Elastic Container Registry (Amazon ECR) repository. Use an Amazon Elastic Container Service (Amazon ECS) cluster with the AWS Fargate launch type to run the containers. Use target tracking to scale automatically based on demand.
- [ ] Store container images in an Amazon Elastic Container Registry (Amazon ECR) repository. Use an Amazon Elastic Container Service (Amazon ECS) cluster with the Amazon EC2 launch type to run the containers. Use target tracking to scale automatically based on demand.
- [ ] Store container images in a repository that runs on an Amazon EC2 instance. Run the containers on EC2 instances that are spread across multiple Availability Zones. Monitor the average CPU utilization in Amazon CloudWatch. Launch new EC2 instances as needed.
- [ ] Create an Amazon EC2 Amazon Machine Image (AMI) that contains the container image. Launch EC2 instances in an Auto Scaling group across multiple Availability Zones. Use an Amazon CloudWatch alarm to scale out EC2 instances when the average CPU utilization threshold is breached.

---

### Question-104
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy
**Tags**: ec2, auto-scaling, application-load-balancer, availability-zone
**Quality**: 3/5 — Tests basic HA principle (multi-AZ vs single-AZ) but distractors are weak — multi-Region is overkill, a template offers no HA guarantee, and ALB round-robin configuration doesn't address AZ failures — making the correct answer obvious to anyone familiar with HA fundamentals.

A company has a multi-tier application that runs six front-end web servers in an Amazon EC2 Auto Scaling group in a single Availability Zone behind an Application Load Balancer (ALB). A solutions architect needs to modify the infrastructure to be highly available without modifying the application.



Which architecture should the solutions architect choose that provides high availability?

- [x] Modify the Auto Scaling group to use three instances across each of two Availability Zones.
- [ ] Create an Auto Scaling group that uses three instances across each of two Regions.
- [ ] Create an Auto Scaling template that can be used to quickly create more instances in another Region.
- [ ] Change the ALB in front of the Amazon EC2 instances in a round-robin configuration to balance traffic to the web tier.

---

### Question-108
**Difficulty**: medium
**Topics**: storage:archival:backup-and-restore, storage:archival:backup-retention-policies, architecture:dr:disaster-recovery-strategies, architecture:ha:cross-region-replication, cost:optimization:idle-resource-elimination
**Tags**: aws-backup, ec2, rds, dlm, ami, ebs, s3, cross-region-replication
**Quality**: 3/5 — Tests service selection for backup strategy but lacks multi-region justification context; distractors are plausible (DLM for snapshots, manual AMI/snapshot copying) but operational overhead comparison requires only basic AWS knowledge rather than deep architectural reasoning.

A company’s infrastructure consists of Amazon EC2 instances and an Amazon RDS DB instance in a single AWS Region. The company wants to back up its data in a separate Region.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Use AWS Backup to copy EC2 backups and RDS backups to the separate Region.
- [ ] Use Amazon Data Lifecycle Manager (Amazon DLM) to copy EC2 backups and RDS backups to the separate Region.
- [ ] Create Amazon Machine Images (AMIs) of the EC2 instances. Copy the AMIs to the separate Region. Create a read replica for the RDS DB instance in the separate Region.
- [ ] Create Amazon Elastic Block Store (Amazon EBS) snapshots. Copy the EBS snapshots to the separate Region. Create RDS snapshots. Export the RDS snapshots to Amazon S3. Configure S3 Cross-Region Replication (CRR) to the separate Region.

---

### Question-113
**Difficulty**: easy
**Topics**: database:relational:multi-az-deployment, database:relational:automated-backups, architecture:ha:multi-az-design, security:data:data-backup-replication
**Tags**: rds, mysql
**Quality**: 3/5 — Tests basic RDS Multi-AZ knowledge and minimizes data loss, but distractors are weak — read replicas are asynchronous by default, EC2 with Lambda is an anti-pattern, and three-node RDS Multi-AZ doesn't exist — making the correct answer obvious to anyone with basic RDS familiarity.

A company wants to migrate its MySQL database from on premises to AWS. The company recently experienced a database outage that significantly impacted the business. To ensure this does not happen again, the company wants a reliable database solution on AWS that minimizes data loss and stores every transaction on at least two nodes.



Which solution meets these requirements?

- [x] Create an Amazon RDS MySQL DB instance with Multi-AZ functionality enabled to synchronously replicate the data.
- [ ] Create an Amazon RDS DB instance with synchronous replication to three nodes in three Availability Zones.
- [ ] Create an Amazon RDS MySQL DB instance and then create a read replica in a separate AWS Region that synchronously replicates the data.
- [ ] Create an Amazon EC2 instance with a MySQL engine installed that triggers an AWS Lambda function to synchronously replicate the data to an Amazon RDS MySQL DB instance.

---

### Question-114
**Difficulty**: medium
**Topics**: compute:serverless:event-driven-architectures, compute:serverless:serverless-cost-optimization, database:cost:on-demand-vs-provisioned, database:nosql:consistency-models, network:performance:content-delivery-strategy, architecture:ha:multi-az-design
**Tags**: s3, api-gateway, lambda, dynamodb, cloudfront, ec2, aurora, auto-scaling, application-load-balancer
**Quality**: 4/5 — Clear scenario with multiple explicit constraints (minimal maintenance, high availability, rapid scaling) that directly favor serverless + on-demand DynamoDB; distractors plausibly combine some correct components (S3+CloudFront, multi-tier) but each violates a core requirement (EC2 maintenance, Aurora provisioned capacity scaling latency).

A company is building a new dynamic ordering website. The company wants to minimize server maintenance and patching. The website must be highly available and must scale read and write capacity as quickly as possible to meet changes in user demand.



Which solution will meet these requirements?

- [x] Host static content in Amazon S3. Host dynamic content by using Amazon API Gateway and AWS Lambda. Use Amazon DynamoDB with on-demand capacity for the database. Configure Amazon CloudFront to deliver the website content.
- [ ] Host static content in Amazon S3. Host dynamic content by using Amazon API Gateway and AWS Lambda. Use Amazon Aurora with Aurora Auto Scaling for the database. Configure Amazon CloudFront to deliver the website content.
- [ ] Host all the website content on Amazon EC2 instances. Create an Auto Scaling group to scale the EC2 instances. Use an Application Load Balancer to distribute traffic. Use Amazon DynamoDB with provisioned write capacity for the database.
- [ ] Host all the website content on Amazon EC2 instances. Create an Auto Scaling group to scale the EC2 instances. Use an Application Load Balancer to distribute traffic. Use Amazon Aurora with Aurora Auto Scaling for the database.

---

### Question-117
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:file:windows-vs-linux-file-systems, architecture:ha:multi-az-design, compute:instances:workload-classification
**Tags**: fsx, ec2, windows, storage-gateway, efs, ebs
**Quality**: 3/5 — Tests basic AWS service selection for Windows shared file systems, but distractors are trivially eliminable — EFS is Linux-only, Storage Gateway volume gateway is for on-premises, and EBS cannot be attached to multiple instances simultaneously — requiring only surface-level knowledge rather than architectural reasoning.

A company has a Windows-based application that must be migrated to AWS. The application requires the use of a shared Windows file system attached to multiple Amazon EC2 Windows instances that are deployed across multiple Availability Zone:



What should a solutions architect do to meet this requirement?

- [x] Configure Amazon FSx for Windows File Server. Mount the Amazon FSx file system to each Windows instance.
- [ ] Configure AWS Storage Gateway in volume gateway mode. Mount the volume to each Windows instance.
- [ ] Configure a file system by using Amazon Elastic File System (Amazon EFS). Mount the EFS file system to each Windows instance.
- [ ] Configure an Amazon Elastic Block Store (Amazon EBS) volume with the required size. Attach each EC2 instance to the volume. Mount the file system within the volume to each Windows instance.

---

### Question-118
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:containers:container-orchestration, database:relational:multi-az-deployment, compute:serverless:event-driven-architectures
**Tags**: rds, ecs, fargate, ec2, load-balancer
**Quality**: 3/5 — Tests basic HA concepts and service selection (Multi-AZ RDS, Fargate for automation) but lacks scenario depth — no details on traffic patterns, regional requirements, or cost constraints that would make trade-offs meaningful; distractors are somewhat weak (EC2-based Docker cluster is clearly less automated than Fargate).

A company is developing an ecommerce application that will consist of a load-balanced front end, a container-based application, and a relational database. A solutions architect needs to create a highly available solution that operates with as little manual intervention as possible.



Which solutions meet these requirements? (Choose two.)

- [x] Create an Amazon RDS DB instance in Multi-AZ mode.
- [x] Create an Amazon Elastic Container Service (Amazon ECS) cluster with a Fargate launch type to handle the dynamic application load.
- [ ] Create an Amazon RDS DB instance and one or more replicas in another Availability Zone.
- [ ] Create an Amazon EC2 instance-based Docker cluster to handle the dynamic application load.
- [ ] Create an Amazon Elastic Container Service (Amazon ECS) cluster with an Amazon EC2 launch type to handle the dynamic application load.

---

### Question-119
**Difficulty**: medium
**Topics**: storage:hybrid:hybrid-storage-solutions, network:connectivity:hybrid-network-connectivity, architecture:ha:multi-az-design, integration:api:api-authentication-patterns
**Tags**: aws-transfer-family, s3, sftp, ec2, nlb, vpn
**Quality**: 4/5 — Clear scenario with well-defined constraints (SFTP access, S3 integration, high availability, minimal operational overhead) and strong distractors — options 2-4 each fail on key requirements (S3 File Gateway lacks true SFTP, EC2 solutions require manual scaling/cron jobs, NLB solution requires custom SFTP implementation), making architectural reasoning necessary to distinguish the managed service advantage of AWS Transfer Family.

A company uses Amazon S3 as its data lake. The company has a new partner that must use SFTP to upload data files. A solutions architect needs to implement a highly available SFTP solution that minimizes operational overhead.



Which solution will meet these requirements?

- [x] Use AWS Transfer Family to configure an SFTP-enabled server with a publicly accessible endpoint. Choose the S3 data lake as the destination.
- [ ] Use Amazon S3 File Gateway as an SFTP server. Expose the S3 File Gateway endpoint URL to the new partner. Share the S3 File Gateway endpoint with the new partner.
- [ ] Launch an Amazon EC2 instance in a private subnet in a VPInstruct the new partner to upload files to the EC2 instance by using a VPN. Run a cron job script, on the EC2 instance to upload files to the S3 data lake.
- [ ] Launch Amazon EC2 instances in a private subnet in a VPC. Place a Network Load Balancer (NLB) in front of the EC2 instances. Create an SFTP listener port for the NLB. Share the NLB hostname with the new partner. Run a cron job script on the EC2 instances to upload files to the S3 data lake.

---

### Question-121
**Difficulty**: medium
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:architecture:multi-tier-network-design, security:network:network-segmentation-strategies, architecture:ha:multi-az-design
**Tags**: gateway-load-balancer, vpc, network-load-balancer, application-load-balancer, transit-gateway
**Quality**: 4/5 — Well-structured scenario with clear constraint (inspect all traffic before reaching web servers with least operational overhead) that requires understanding Gateway Load Balancer's unique role in traffic inspection; distractors are plausible but each has operational limitations (NLB/ALB not designed for transparent inspection, transit gateway requires more routing complexity).

A company has a three-tier web application that is deployed on AWS. The web servers are deployed in a public subnet in a VPC. The application servers and database servers are deployed in private subnets in the same VPC. The company has deployed a third-party virtual firewall appliance from AWS Marketplace in an inspection VPC. The appliance is configured with an IP interface that can accept IP packets.

A solutions architect needs to integrate the web application with the appliance to inspect all traffic to the application before the traffic reaches the web server.

Which solution will meet these requirements with the LEAST operational overhead?

- [x] Deploy a Gateway Load Balancer in the inspection VPC. Create a Gateway Load Balancer endpoint to receive the incoming packets and forward the packets to the appliance.
- [ ] Create a Network Load Balancer in the public subnet of the application's VPC to route the traffic to the appliance for packet inspection.
- [ ] Create an Application Load Balancer in the public subnet of the application's VPC to route the traffic to the appliance for packet inspection.
- [ ] Deploy a transit gateway in the inspection VPConfigure route tables to route the incoming packets through the transit gateway.

---

### Question-122
**Difficulty**: easy
**Topics**: architecture:patterns:infrastructure-automation, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design, governance:automation:golden-ami-strategy
**Tags**: elastic-beanstalk, url-swapping, auto-scaling, load-balancing
**Quality**: 3/5 — Tests basic Elastic Beanstalk knowledge and blue-green deployment patterns, but distractors are trivially eliminable — S3 static hosting cannot run Java/PHP, raw EC2 lacks managed HA benefits, and containerization on EC2 adds unnecessary complexity — making this primarily service-recall rather than architectural reasoning.

A company has a web application that is based on Java and PHP. The company plans to move the application from on premises to AWS. The company needs the ability to test new site features frequently. The company also needs a highly available and managed solution that requires minimum operational overhead.



Which solution will meet these requirements?

- [x] Deploy the web application to an AWS Elastic Beanstalk environment. Use URL swapping to switch between multiple Elastic Beanstalk environments for feature testing.
- [ ] Create an Amazon S3 bucket. Enable static web hosting on the S3 bucket. Upload the static content to the S3 bucket. Use AWS Lambda to process all dynamic content.
- [ ] Deploy the web application to Amazon EC2 instances that are configured with Java and PHP. Use Auto Scaling groups and an Application Load Balancer to manage the website’s availability.
- [ ] Containerize the web application. Deploy the web application to Amazon EC2 instances. Use the AWS Load Balancer Controller to dynamically route traffic between containers that contain the new site features for testing.

---

### Question-123
**Difficulty**: easy
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design
**Tags**: rds, mysql
**Quality**: 3/5 — Tests basic read replica concept but scenario lacks depth — no traffic patterns, no cost considerations, and distractors are trivially eliminable (DynamoDB migration unrelated to timeout issue, scheduling queries only masks problem).

A company has an ordering application that stores customer information in Amazon RDS for MySQL. During regular business hours, employees run one-time queries for reporting purposes. Timeouts are occurring during order processing because the reporting queries are taking a long time to run. The company needs to eliminate the timeouts without preventing employees from performing queries.



What should a solutions architect do to meet these requirements?

- [x] Create a read replica. Move reporting queries to the read replica.
- [ ] Create a read replica. Distribute the ordering application to the primary DB instance and the read replica.
- [ ] Migrate the ordering application to Amazon DynamoDB with on-demand capacity.
- [ ] Schedule the reporting queries for non-peak hours.

---

### Question-125
**Difficulty**: easy
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design
**Tags**: rds, ec2
**Quality**: 2/5 — Tests basic RDS read replica recall but lacks scenario depth — no mention of batch patterns, read/write split strategy, or why read replicas are superior to caching solutions; distractors (ElastiCache, Route 53 caching) are trivially eliminable by anyone who knows RDS read replicas exist.

A company is running a batch application on Amazon EC2 instances. The application consists of a backend with multiple Amazon RDS databases. The application is causing a high number of reads on the databases. A solutions architect must reduce the number of database reads while ensuring high availability.



What should the solutions architect do to meet this requirement?

- [x] Add Amazon RDS read replicas.
- [ ] Use Amazon ElastiCache for Redis.
- [ ] Use Amazon Route 53 DNS caching
- [ ] Use Amazon ElastiCache for Memcached.

---

### Question-126
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, database:relational:database-replication-strategies, architecture:resilience:redundancy-patterns
**Tags**: ec2, database
**Quality**: 3/5 — Tests basic HA concepts (multi-AZ, clustering, replication) but distractors are weak — AMI backups without automation, CloudFormation without failover speed, and single-AZ recovery are trivially eliminable; no trade-off reasoning required.

A company needs to run a critical application on AWS. The company needs to use Amazon EC2 for the application’s database. The database must be highly available and must fail over automatically if a disruptive event occurs.



Which solution will meet these requirements?

- [x] Launch two EC2 instances, each in a different Availability Zone in the same AWS Region. Install the database on both EC2 instances. Configure the EC2 instances as a cluster. Set up database replication.
- [ ] Launch an EC2 instance in an Availability Zone. Install the database on the EC2 instance. Use an Amazon Machine Image (AMI) to back up the data. Use AWS CloudFormation to automate provisioning of the EC2 instance if a disruptive event occurs.
- [ ] Launch two EC2 instances, each in a different AWS Region. Install the database on both EC2 instances. Set up database replication. Fail over the database to a second Region.
- [ ] Launch an EC2 instance in an Availability Zone. Install the database on the EC2 instance. Use an Amazon Machine Image (AMI) to back up the data. Use EC2 automatic recovery to recover the instance if a disruptive event occurs.

---

### Question-129
**Difficulty**: medium
**Topics**: architecture:migration:lift-and-shift, architecture:ha:multi-az-design, database:migration:homogeneous-db-migration, database:relational:multi-az-deployment, compute:instances:workload-classification
**Tags**: elastic-beanstalk, dms, rds, oracle, .net
**Quality**: 3/5 — Tests basic service selection for lift-and-shift migration with HA requirements, but distractors are easily eliminated — Lambda serverless refactoring contradicts 'minimize development changes,' Amazon Linux contradicts Windows/.NET requirement, and DynamoDB migration contradicts Oracle-to-Oracle requirement — without requiring deeper architectural reasoning.

A company has a Microsoft .NET application that runs on an on-premises Windows Server. The application stores data by using an Oracle Database Standard Edition server. The company is planning a migration to AWS and wants to minimize development changes while moving the application. The AWS application environment should be highly available.



Which combination of actions should the company take to meet these requirements? (Choose two.)

- [x] Rehost the application in AWS Elastic Beanstalk with the .NET platform in a Multi-AZ deployment.
- [x] Use AWS Database Migration Service (AWS DMS) to migrate from the Oracle database to Oracle on Amazon RDS in a Multi-AZ deployment.
- [ ] Refactor the application as serverless with AWS Lambda functions running .NET Core.
- [ ] Replatform the application to run on Amazon EC2 with the Amazon Linux Amazon Machine Image (AMI).
- [ ] Use AWS Database Migration Service (AWS DMS) to migrate from the Oracle database to Amazon DynamoDB in a Multi-AZ deployment.

---

### Question-133
**Difficulty**: medium
**Topics**: storage:block:snapshot-strategy, storage:block:volume-type-selection, storage:performance:storage-performance-optimization, architecture:ha:multi-az-design
**Tags**: ebs, ec2, snapshot
**Quality**: 4/5 — Well-constructed scenario with clear constraints (minimize clone time, maintain isolation, high I/O performance) that requires understanding EBS snapshots, fast snapshot restore feature, and data independence; distractors are plausible and test knowledge of snapshot mechanics, instance store limitations, and Multi-Attach misuse.

A company wants to improve its ability to clone large amounts of production data into a test environment in the same AWS Region. The data is stored in Amazon EC2 instances on Amazon Elastic Block Store (Amazon EBS) volumes. Modifications to the cloned data must not affect the production environment. The software that accesses this data requires consistently high I/O performance.

A solutions architect needs to minimize the time that is required to clone the production data into the test environment.

Which solution will meet these requirements?

- [x] Take EBS snapshots of the production EBS volumes. Turn on the EBS fast snapshot restore feature on the EBS snapshots. Restore the snapshots into new EBS volumes. Attach the new EBS volumes to EC2 instances in the test environment.
- [ ] Take EBS snapshots of the production EBS volumes. Restore the snapshots onto EC2 instance store volumes in the test environment.
- [ ] Configure the production EBS volumes to use the EBS Multi-Attach feature. Take EBS snapshots of the production EBS volumes. Attach the production EBS volumes to the EC2 instances in the test environment.
- [ ] Take EBS snapshots of the production EBS volumes. Create and initialize new EBS volumes. Attach the new EBS volumes to EC2 instances in the test environment before restoring the volumes from the production EBS snapshots.

---

### Question-139
**Difficulty**: medium
**Topics**: storage:object:storage-access-patterns, network:performance:content-delivery-strategy, architecture:ha:multi-az-design, cost:optimization:storage-size-optimization, security:data:encryption-at-rest
**Tags**: s3, cloudfront, origin-access-identity, aws-cli
**Quality**: 4/5 — Clear scenario with two primary constraints (cost-effectiveness and resilience) that meaningfully differentiate the correct answer from plausible distractors; requires understanding S3 as a cost-effective, resilient origin, OAI for security, and why compute-based solutions (Lightsail, EC2 ASG) are suboptimal for static content.

A company hosts a marketing website in an on-premises data center. The website consists of static documents and runs on a single server. An administrator updates the website content infrequently and uses an SFTP client to upload new documents.



The company decides to host its website on AWS and to use Amazon CloudFront. The company’s solutions architect creates a CloudFront distribution. The solutions architect must design the most cost-effective and resilient architecture for website hosting to serve as the CloudFront origin.



Which solution will meet these requirements?

- [x] Create a private Amazon S3 bucket. Use an S3 bucket policy to allow access from a CloudFront origin access identity (OAI). Upload website content by using the AWS CLI.
- [ ] Create a virtual server by using Amazon Lightsail. Configure the web server in the Lightsail instance. Upload website content by using an SFTP client.
- [ ] Create an AWS Auto Scaling group for Amazon EC2 instances. Use an Application Load Balancer. Upload website content by using an SFTP client.
- [ ] Create a public Amazon S3 bucket. Configure AWS Transfer for SFTP. Configure the S3 bucket for website hosting. Upload website content by using the SFTP client.

---

### Question-143
**Difficulty**: easy
**Topics**: database:caching:session-state-caching, compute:scaling:horizontal-scaling, architecture:ha:multi-az-design
**Tags**: ec2, elasticache, application-load-balancer, auto-scaling
**Quality**: 3/5 — Tests basic recall of session management patterns but distractors are weak — sticky sessions contradicts the requirement for distributed session data, Session Manager is for OS-level sessions, and STS tokens are for temporary credentials — eliminating incorrect answers requires minimal architectural reasoning.

A solutions architect is designing the architecture of a new application being deployed to the AWS Cloud. The application will run on Amazon EC2 On-Demand Instances and will automatically scale across multiple Availability Zones. The EC2 instances will scale up and down frequently throughout the day. An Application Load Balancer (ALB) will handle the load distribution. The architecture needs to support distributed session data management. The company is willing to make changes to code if needed.



What should the solutions architect do to ensure that the architecture supports distributed session data management?

- [x] Use Amazon ElastiCache to manage and store session data.
- [ ] Use session affinity (sticky sessions) of the ALB to manage session data.
- [ ] Use Session Manager from AWS Systems Manager to manage the session.
- [ ] Use the GetSessionToken API operation in AWS Security Token Service (AWS STS) to manage the session.

---

### Question-152
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, architecture:dr:recovery-point-objective, architecture:dr:recovery-time-objective, architecture:ha:multi-region-design, database:relational:database-replication-strategies
**Tags**: ec2, alb, aurora, route-53, rds
**Quality**: 4/5 — Well-structured DR scenario with clear RPO/RTO constraints (30 min downtime, data loss acceptable) that correctly eliminates active-active solutions; distractors test understanding of passive failover vs. continuous replication, though the distinction between 'replica in place' vs 'scaled-down deployment' could be slightly sharper.

A company runs a global web application on Amazon EC2 instances behind an Application Load Balancer. The application stores data in Amazon Aurora. The company needs to create a disaster recovery solution and can tolerate up to 30 minutes of downtime and potential data loss. The solution does not need to handle the load when the primary infrastructure is healthy.



What should a solutions architect do to meet these requirements?

- [x] Deploy the application with the required infrastructure elements in place. Use Amazon Route 53 to configure active-passive failover. Create an Aurora Replica in a second AWS Region.
- [ ] Host a scaled-down deployment of the application in a second AWS Region. Use Amazon Route 53 to configure active-active failover. Create an Aurora Replica in the second Region.
- [ ] Replicate the primary infrastructure in a second AWS Region. Use Amazon Route 53 to configure active-active failover. Create an Aurora database that is restored from the latest snapshot.
- [ ] Back up data with AWS Backup. Use the backup to create the required infrastructure in a second AWS Region. Use Amazon Route 53 to configure active-passive failover. Create an Aurora second primary instance in the second Region.

---

### Question-154
**Difficulty**: medium
**Topics**: compute:instances:instance-family-sizing, compute:instances:rightsizing-compute, compute:scaling:horizontal-scaling, monitoring:observability:custom-metrics-design, architecture:ha:multi-az-design
**Tags**: ec2, cloudformation, cloudwatch, auto-scaling
**Quality**: 3/5 — Tests instance family selection (M5 vs R5 for memory-intensive workloads) but the scenario lacks specifics on traffic patterns, current memory utilization, or cost constraints; distractors conflate multiple concepts (T3 burstable instances, manual scaling, built-in metrics), making it partially about service recall rather than architectural reasoning.

A company’s application is having performance issues. The application is stateful and needs to complete in-memory tasks on Amazon EC2 instances. The company used AWS CloudFormation to deploy infrastructure and used the M5 EC2 instance family. As traffic increased, the application performance degraded. Users are reporting delays when the users attempt to access the application.



Which solution will resolve these issues in the MOST operationally efficient way?

- [x] Modify the CloudFormation templates. Replace the EC2 instances with R5 EC2 instances. Deploy the Amazon CloudWatch agent on the EC2 instances to generate custom application latency metrics for future capacity planning.
- [ ] Replace the EC2 instances with T3 EC2 instances that run in an Auto Scaling group. Make the changes by using the AWS Management Console.
- [ ] Modify the CloudFormation templates to run the EC2 instances in an Auto Scaling group. Increase the desired capacity and the maximum capacity of the Auto Scaling group manually when an increase is necessary.
- [ ] Modify the CloudFormation templates. Replace the EC2 instances with R5 EC2 instances. Use Amazon CloudWatch built-in EC2 memory metrics to track the application performance for future capacity planning.

---

### Question-155
**Difficulty**: easy
**Topics**: storage:object:storage-tiering, storage:object:object-lifecycle-management, cost:optimization:storage-size-optimization, architecture:ha:availability-zone-strategy
**Tags**: s3, s3-intelligent-tiering
**Quality**: 3/5 — Tests basic S3 storage class selection but distractors are weak — S3 One Zone-IA is instantly eliminable due to AZ resilience requirement, and S3 Standard-IA lacks automatic tiering for unpredictable access patterns; the correct answer follows directly from stated requirements without deep architectural reasoning.

A solutions architect is using Amazon S3 to design the storage architecture of a new digital media application. The media files must be resilient to the loss of an Availability Zone. Some files are accessed frequently while other files are rarely accessed in an unpredictable pattern. The solutions architect must minimize the costs of storing and retrieving the media files.

Which storage option meets these requirements?

- [x] S3 Intelligent-Tiering
- [ ] S3 Standard
- [ ] S3 Standard-Infrequent Access (S3 Standard-IA)
- [ ] S3 One Zone-Infrequent Access (S3 One Zone-IA)

---

### Question-160
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy
**Tags**: route-53, ec2
**Quality**: 3/5 — Tests basic multi-AZ and Route 53 routing recall; distractors are weak — failover and weighted policies are easily eliminated by 'traffic must reach all instances randomly,' and instance count differences are trivially compared without architectural reasoning.

A company recently migrated its web application to AWS by rehosting the application on Amazon EC2 instances in a single AWS Region. The company wants to redesign its application architecture to be highly available and fault tolerant. Traffic must reach all running EC2 instances randomly.



Which combination of steps should the company take to meet these requirements? (Choose two.)

- [x] Create an Amazon Route 53 multivalue answer routing policy.
- [x] Launch four EC2 instances: two instances in one Availability Zone and two instances in another Availability Zone.
- [ ] Create an Amazon Route 53 failover routing policy.
- [ ] Create an Amazon Route 53 weighted routing policy.
- [ ] Launch three EC2 instances: two instances in one Availability Zone and one instance in another Availability Zone.

---

### Question-161
**Difficulty**: medium
**Topics**: data:ingestion:streaming-data-ingestion, data:analytics:data-warehouse-design, architecture:ha:multi-az-design, storage:object:storage-access-patterns
**Tags**: kinesis-data-firehose, redshift, kinesis, s3, lambda, ec2, rds
**Quality**: 4/5 — Clear scenario with well-defined constraints (petabyte scale, high availability, on-demand SQL analytics, minimal operational overhead) and plausible distractors that each fail on key requirements: manual S3 ingestion lacks HA, Lambda requires operational management, and EC2+RDS lacks serverless automation and scalability.

A media company collects and analyzes user activity data on premises. The company wants to migrate this capability to AWS. The user activity data store will continue to grow and will be petabytes in size. The company needs to build a highly available data ingestion solution that facilitates on-demand analytics of existing data and new data with SQL.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Send activity data to an Amazon Kinesis Data Firehose delivery stream. Configure the stream to deliver the data to an Amazon Redshift cluster.
- [ ] Send activity data to an Amazon Kinesis data stream. Configure the stream to deliver the data to an Amazon S3 bucket.
- [ ] Place activity data in an Amazon S3 bucket. Configure Amazon S3 to run an AWS Lambda function on the data as the data arrives in the S3 bucket.
- [ ] Create an ingestion service on Amazon EC2 instances that are spread across multiple Availability Zones. Configure the service to forward data to an Amazon RDS Multi-AZ database.

---

### Question-167
**Difficulty**: easy
**Topics**: network:connectivity:nat-gateway-design, architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, compute:scaling:auto-scaling-groups
**Tags**: nat-gateway, ec2, auto-scaling, vpc
**Quality**: 3/5 — Tests direct recall that NAT gateways are superior to NAT instances for HA/fault tolerance, but provides minimal scenario context (no traffic volumes, regions, or constraints) and weak distractors — same-AZ placement and Spot Instances for NAT are trivially eliminable.

A company is concerned that two NAT instances in use will no longer be able to support the traffic needed for the company’s application. A solutions architect wants to implement a solution that is highly available, fault tolerant, and automatically scalable.



What should the solutions architect recommend?

- [x] Remove the two NAT instances and replace them with two NAT gateways in different Availability Zones.
- [ ] Remove the two NAT instances and replace them with two NAT gateways in the same Availability Zone.
- [ ] Use Auto Scaling groups with Network Load Balancers for the NAT instances in different Availability Zones.
- [ ] Replace the two NAT instances with Spot Instances in different Availability Zones and deploy a Network Load Balancer.

---

### Question-168
**Difficulty**: easy
**Topics**: security:network:network-segmentation-strategies, architecture:ha:multi-az-design
**Tags**: vpc, ec2, rds, vpc-peering
**Quality**: 3/5 — Tests basic VPC peering knowledge and security best practices, but distractors are too weak — allowing public IPs, making databases publicly accessible, and adding proxy instances are obviously insecure, making this a service-name recall exercise rather than genuine architectural reasoning.

An application runs on an Amazon EC2 instance that has an Elastic IP address in VPC A. The application requires access to a database in VPC B. Both VPCs are in the same AWS account.



Which solution will provide the required access MOST securely?

- [x] Configure a VPC peering connection between VPC A and VPC B.
- [ ] Create a DB instance security group that allows all traffic from the public IP address of the application server in VPC A.
- [ ] Make the DB instance publicly accessible. Assign a public IP address to the DB instance.
- [ ] Launch an EC2 instance with an Elastic IP address into VPC B. Proxy all requests through the new EC2 instance.

---

### Question-173
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:multi-region-design, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment, storage:object:storage-access-patterns
**Tags**: ec2, elastic-beanstalk, rds, s3, load-balancer
**Quality**: 3/5 — Tests basic HA and scalability patterns but lacks specificity — no traffic patterns, cost constraints, or architectural trade-offs are mentioned; the constraint 'least amount of change' eliminates options 2 and 4 too easily, making distractors weak.

A company has a three-tier application for image sharing. The application uses an Amazon EC2 instance for the front-end layer, another EC2 instance for the application layer, and a third EC2 instance for a MySQL database. A solutions architect must design a scalable and highly available solution that requires the least amount of change to the application.



Which solution meets these requirements?

- [x] Use load-balanced Multi-AZ AWS Elastic Beanstalk environments for the front-end layer and the application layer. Move the database to an Amazon RDS Multi-AZ DB instance. Use Amazon S3 to store and serve users’ images.
- [ ] Use Amazon S3 to host the front-end layer. Use AWS Lambda functions for the application layer. Move the database to an Amazon DynamoDB table. Use Amazon S3 to store and serve users’ images.
- [ ] Use load-balanced Multi-AZ AWS Elastic Beanstalk environments for the front-end layer and the application layer. Move the database to an Amazon RDS DB instance with multiple read replicas to serve users’ images.
- [ ] Use Amazon S3 to host the front-end layer. Use a fleet of EC2 instances in an Auto Scaling group for the application layer. Move the database to a memory optimized instance type to store and serve users’ images.

---

### Question-174
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, architecture:ha:multi-az-design, security:network:network-segmentation-strategies
**Tags**: vpc, vpc-peering, ec2
**Quality**: 3/5 — Tests VPC peering knowledge and cross-account connectivity but lacks specific constraints (traffic volume, latency requirements, failure scenarios) that would force genuine architectural reasoning; distractors reference services that are either inapplicable (gateway endpoints for EC2 access) or partially relevant but incomplete (virtual private gateway without full context).

An application running on an Amazon EC2 instance in VPC-A needs to access files in another EC2 instance in VPC-B. Both VPCs are in separate AWS accounts. The network administrator needs to design a solution to configure secure access to EC2 instance in VPC-B from VPC-A. The connectivity should not have a single point of failure or bandwidth concerns.



Which solution will meet these requirements?

- [x] Set up a VPC peering connection between VPC-A and VPC-B.
- [ ] Set up VPC gateway endpoints for the EC2 instance running in VPC-B.
- [ ] Attach a virtual private gateway to VPC-B and set up routing from VPC-A.
- [ ] Create a private virtual interface (VIF) for the EC2 instance running in VPC-B and add appropriate routes from VPC-A.

---

### Question-178
**Difficulty**: medium
**Topics**: network:performance:network-transfer-costs, cost:optimization:data-transfer-cost-reduction, network:connectivity:direct-connect-hybrid, architecture:ha:multi-region-design
**Tags**: direct-connect, data-transfer, visualization-tool, data-warehouse
**Quality**: 3/5 — Tests understanding of data transfer cost mechanics and Direct Connect pricing, but the scenario lacks depth — no information about current costs, regional setup, or why on-premises hosting is even an option, making the correct answer somewhat obvious once you recall that Direct Connect within the same region is cheaper than internet egress.

A company previously migrated its data warehouse solution to AWS. The company also has an AWS Direct Connect connection. Corporate office users query the data warehouse using a visualization tool. The average size of a query returned by the data warehouse is 50 MB and each webpage sent by the visualization tool is approximately 500 KB. Result sets returned by the data warehouse are not cached.



Which solution provides the LOWEST data transfer egress cost for the company?

- [x] Host the visualization tool in the same AWS Region as the data warehouse and access it over a Direct Connect connection at a location in the same Region.
- [ ] Host the visualization tool on premises and query the data warehouse directly over the internet.
- [ ] Host the visualization tool in the same AWS Region as the data warehouse. Access it over the internet.
- [ ] Host the visualization tool on premises and query the data warehouse directly over a Direct Connect connection at a location in the same AWS Region.

---

### Question-179
**Difficulty**: easy
**Topics**: database:relational:database-replication-strategies, database:relational:read-replicas-usage, architecture:ha:multi-region-design, architecture:ha:cross-region-replication
**Tags**: rds, postgresql
**Quality**: 3/5 — Tests basic RDS read replica knowledge and multi-region availability, but distractors are weak — EC2 self-management and snapshots are obviously higher overhead, and Multi-AZ only covers single-region HA, making the correct answer trivially identifiable without deep architectural reasoning.

An online learning company is migrating to the AWS Cloud. The company maintains its student records in a PostgreSQL database. The company needs a solution in which its data is available and online across multiple AWS Regions at all times.



Which solution will meet these requirements with the LEAST amount of operational overhead?

- [x] Migrate the PostgreSQL database to an Amazon RDS for PostgreSQL DB instance. Create a read replica in another Region.
- [ ] Migrate the PostgreSQL database to a PostgreSQL cluster on Amazon EC2 instances.
- [ ] Migrate the PostgreSQL database to an Amazon RDS for PostgreSQL DB instance with the Multi-AZ feature turned on.
- [ ] Migrate the PostgreSQL database to an Amazon RDS for PostgreSQL DB instance. Set up DB snapshots to be copied to another Region.

---

### Question-180
**Difficulty**: easy
**Topics**: network:dns:dns-routing-policies, network:dns:health-check-routing, architecture:ha:multi-az-design
**Tags**: route-53, ec2, dns
**Quality**: 3/5 — Tests basic Route 53 routing policy recall; the scenario is straightforward (return IPs of healthy instances), but distractors are too easily eliminable — anyone familiar with Route 53 knows multivalue is for multiple IPs and simple/latency/geolocation don't filter by health without explicit reasoning.

A company hosts its web application on AWS using seven Amazon EC2 instances. The company requires that the IP addresses of all healthy EC2 instances be returned in response to DNS queries.



Which policy should be used to meet this requirement?

- [x] Multivalue routing policy
- [ ] Simple routing policy
- [ ] Latency routing policy
- [ ] Geolocation routing policy

---

### Question-182
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:multi-region-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, database:relational:multi-az-deployment
**Tags**: ec2, aurora, rds, application-load-balancer, auto-scaling, ami
**Quality**: 4/5 — Well-structured scenario with clear requirements (HA, scaling) that tests understanding of decoupling database from compute, multi-AZ deployment patterns, and auto-scaling architecture; distractors are plausible but each violates at least one requirement (same AZ limits HA, manual scaling doesn't meet demand, EC2 database lacks managed benefits).

A company is using a content management system that runs on a single Amazon EC2 instance. The EC2 instance contains both the web server and the database software. The company must make its website platform highly available and must enable the website to scale to meet user demand.



What should a solutions architect recommend to meet these requirements?

- [x] Move the database to Amazon Aurora with a read replica in another Availability Zone. Create an Amazon Machine Image (AMI) from the EC2 instance. Configure an Application Load Balancer in two Availability Zones. Attach an Auto Scaling group that uses the AMI across two Availability Zones.
- [ ] Move the database to Amazon RDS, and enable automatic backups. Manually launch another EC2 instance in the same Availability Zone. Configure an Application Load Balancer in the Availability Zone, and set the two instances as targets.
- [ ] Migrate the database to an Amazon Aurora instance with a read replica in the same Availability Zone as the existing EC2 instance. Manually launch another EC2 instance in the same Availability Zone. Configure an Application Load Balancer, and set the two EC2 instances as targets.
- [ ] Move the database to a separate EC2 instance, and schedule backups to Amazon S3. Create an Amazon Machine Image (AMI) from the original EC2 instance. Configure an Application Load Balancer in two Availability Zones. Attach an Auto Scaling group that uses the AMI across two Availability Zones.

---

### Question-183
**Difficulty**: easy
**Topics**: compute:cost:compute-purchasing-options, compute:scaling:auto-scaling-groups, cost:optimization:idle-resource-elimination, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, alb, target-group
**Quality**: 3/5 — Tests basic cost optimization for non-production environments but lacks scenario depth — the correct answer is obvious (reduce max instances), and the second distractor (one instance) violates the stated requirement of 'at least two instances,' making it trivially eliminable rather than a meaningful trade-off.

A company is launching an application on AWS. The application uses an Application Load Balancer (ALB) to direct traffic to at least two Amazon EC2 instances in a single target group. The instances are in an Auto Scaling group for each environment. The company requires a development environment and a production environment. The production environment will have periods of high traffic.



Which solution will configure the development environment MOST cost-effectively?

- [x] Reduce the maximum number of EC2 instances in the development environment’s Auto Scaling group.
- [ ] Reconfigure the target group in the development environment to have only one EC2 instance as a target.
- [ ] Change the ALB balancing algorithm to least outstanding requests.
- [ ] Reduce the size of the EC2 instances in both environments.

---

### Question-191
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:performance:storage-durability-replication, architecture:ha:multi-az-design
**Tags**: efs, ebs, s3-glacier, ec2, aws-backup
**Quality**: 3/5 — Tests basic storage service selection for multi-instance file sharing, but distractors are trivially eliminable — EBS is block-only and single-instance, Glacier is archival not concurrent access, AWS Backup is a backup service — without requiring genuine architectural reasoning.

A solutions architect needs to design a system to store client case files. The files are core company assets and are important. The number of files will grow over time.



The files must be simultaneously accessible from multiple application servers that run on Amazon EC2 instances. The solution must have built-in redundancy.



Which solution meets these requirements?

- [x] Amazon Elastic File System (Amazon EFS)
- [ ] Amazon Elastic Block Store (Amazon EBS)
- [ ] Amazon S3 Glacier Deep Archive
- [ ] AWS Backup

---

### Question-203
**Difficulty**: medium
**Topics**: compute:containers:container-orchestration, compute:containers:when-to-containerize, architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, cost:optimization:container-cost-optimization
**Tags**: ecs, fargate, ec2, kubernetes
**Quality**: 4/5 — Clear scenario with well-defined constraints (minimize maintenance, no infrastructure management, microservices), strong distractors that test understanding of Fargate vs EC2 launch types and managed vs self-managed Kubernetes, and correct answers directly follow from the 'no additional infrastructure' requirement.

A company is building an application that consists of several microservices. The company has decided to use container technologies to deploy its software on AWS. The company needs a solution that minimizes the amount of ongoing effort for maintenance and scaling. The company cannot manage additional infrastructure.



Which combination of actions should a solutions architect take to meet these requirements? (Choose two.)

- [x] Deploy an Amazon Elastic Container Service (Amazon ECS) cluster.
- [x] Deploy an Amazon Elastic Container Service (Amazon ECS) service with a Fargate launch type. Specify a desired task number level of greater than or equal to 2.
- [ ] Deploy the Kubernetes control plane on Amazon EC2 instances that span multiple Availability Zones.
- [ ] Deploy an Amazon Elastic Container Service (Amazon ECS) service with an Amazon EC2 launch type. Specify a desired task number level of greater than or equal to 2.
- [ ] Deploy Kubernetes worker nodes on Amazon EC2 instances that span multiple Availability Zones. Create a deployment that specifies two or more replicas for each microservice.

---

### Question-204
**Difficulty**: easy
**Topics**: network:load-balancing:health-check-configuration, network:load-balancing:load-balancing-strategy, network:dns:health-check-routing, architecture:ha:multi-az-design
**Tags**: route-53, ec2, application-load-balancer, health-checks
**Quality**: 3/5 — Tests basic understanding of ALB health checks and Route 53 limitations, but the distractors are weak — simple routing has no health checks, failover routing requires active/passive setup, and CloudFront doesn't solve DNS-level health checking — making the correct answer obvious without deep architectural reasoning.

A company has a web application hosted over 10 Amazon EC2 instances with traffic directed by Amazon Route 53. The company occasionally experiences a timeout error when attempting to browse the application. The networking team finds that some DNS queries return IP addresses of unhealthy instances, resulting in the timeout error.



What should a solutions architect implement to overcome these timeout errors?

- [x] Create an Application Load Balancer (ALB) with a health check in front of the EC2 instances. Route to the ALB from Route 53.
- [ ] Create a Route 53 simple routing policy record for each EC2 instance. Associate a health check with each record.
- [ ] Create a Route 53 failover routing policy record for each EC2 instance. Associate a health check with each record.
- [ ] Create an Amazon CloudFront distribution with EC2 instances as its origin. Associate a health check with the EC2 instances.

---

### Question-205
**Difficulty**: medium
**Topics**: network:performance:edge-acceleration-cdn, network:load-balancing:layer4-vs-layer7-balancing, security:network:public-private-subnets, architecture:ha:multi-az-design, security:application:tls-termination-strategy
**Tags**: cloudfront, alb, ec2, vpc
**Quality**: 4/5 — Well-structured scenario testing edge delivery (CloudFront), security (private subnets), HA (multi-tier), and SSL/HTTPS; distractors meaningfully differ on subnet placement (public vs private) and origin selection (ALB vs EC2), forcing reasoning about security best practices and CloudFront origin requirements.

A solutions architect needs to design a highly available application consisting of web, application, and database tiers. HTTPS content delivery should be as close to the edge as possible, with the least delivery time.



Which solution meets these requirements and is MOST secure?

- [x] Configure a public Application Load Balancer (ALB) with multiple redundant Amazon EC2 instances in private subnets. Configure Amazon CloudFront to deliver HTTPS content using the public ALB as the origin.
- [ ] Configure a public Application Load Balancer (ALB) with multiple redundant Amazon EC2 instances in public subnets. Configure Amazon CloudFront to deliver HTTPS content using the public ALB as the origin.
- [ ] Configure a public Application Load Balancer with multiple redundant Amazon EC2 instances in private subnets. Configure Amazon CloudFront to deliver HTTPS content using the EC2 instances as the origin.
- [ ] Configure a public Application Load Balancer with multiple redundant Amazon EC2 instances in public subnets. Configure Amazon CloudFront to deliver HTTPS content using the EC2 instances as the origin.

---

### Question-206
**Difficulty**: medium
**Topics**: network:performance:latency-optimization, network:performance:global-anycast-routing, architecture:ha:multi-region-design, network:load-balancing:health-check-configuration
**Tags**: global-accelerator, alb, ec2, auto-scaling, cloudfront
**Quality**: 3/5 — Tests service selection for multi-region latency-sensitive applications but distractors are weak — CloudFront with S3 origin and DynamoDB/DAX are clearly irrelevant to the stated requirements, allowing elimination without deep architectural reasoning about Global Accelerator's health checking and traffic acceleration capabilities.

A company has a popular gaming platform running on AWS. The application is sensitive to latency because latency can impact the user experience and introduce unfair advantages to some players. The application is deployed in every AWS Region. It runs on Amazon EC2 instances that are part of Auto Scaling groups configured behind Application Load Balancers (ALBs). A solutions architect needs to implement a mechanism to monitor the health of the application and redirect traffic to healthy endpoints.



Which solution meets these requirements?

- [x] Configure an accelerator in AWS Global Accelerator. Add a listener for the port that the application listens on, and attach it to a Regional endpoint in each Region. Add the ALB as the endpoint.
- [ ] Create an Amazon CloudFront distribution and specify the ALB as the origin server. Configure the cache behavior to use origin cache headers. Use AWS Lambda functions to optimize the traffic.
- [ ] Create an Amazon CloudFront distribution and specify Amazon S3 as the origin server. Configure the cache behavior to use origin cache headers. Use AWS Lambda functions to optimize the traffic.
- [ ] Configure an Amazon DynamoDB database to serve as the data store for the application. Create a DynamoDB Accelerator (DAX) cluster to act as the in-memory cache for DynamoDB hosting the application data.

---

### Question-209
**Difficulty**: easy
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design
**Tags**: rds, dynamodb, elasticache, redshift
**Quality**: 3/5 — Tests basic RDS read replica recall but lacks architectural depth — the scenario provides no constraints (budget, latency, data volume) and the distractors (DynamoDB, ElastiCache, Redshift) are trivially eliminable because they represent major architecture changes rather than 'minimal changes to the existing web application.'

An ecommerce company has noticed performance degradation of its Amazon RDS based web application. The performance degradation is attributed to an increase in the number of read-only SQL queries triggered by business analysts. A solutions architect needs to solve the problem with minimal changes to the existing web application.



What should the solutions architect recommend?

- [x] Create a read replica of the primary database and have the business analysts run their queries.
- [ ] Export the data to Amazon DynamoDB and have the business analysts run their queries.
- [ ] Load the data into Amazon ElastiCache and have the business analysts run their queries.
- [ ] Copy the data into an Amazon Redshift cluster and have the business analysts run their queries.

---

### Question-212
**Difficulty**: easy
**Topics**: compute:scaling:scheduled-scaling, compute:cost:compute-purchasing-options, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, cloudwatch
**Quality**: 3/5 — Tests basic knowledge of scheduled scaling but lacks scenario depth — no cost comparison, traffic variability, or multi-region constraints; distractors are trivially eliminable (increasing min/max capacity doesn't solve the 1-hour delay, changing scaling policy is reactive not proactive).

A solutions architect observes that a nightly batch processing job is automatically scaled up for 1 hour before the desired Amazon EC2 capacity is reached. The peak capacity is the ‘same every night and the batch jobs always start at 1 AM. The solutions architect needs to find a cost-effective solution that will allow for the desired EC2 capacity to be reached quickly and allow the Auto Scaling group to scale down after the batch jobs are complete.



What should the solutions architect do to meet these requirements?

- [x] Configure scheduled scaling to scale up to the desired compute level.
- [ ] Increase the minimum capacity for the Auto Scaling group.
- [ ] Increase the maximum capacity for the Auto Scaling group.
- [ ] Change the scaling policy to add more EC2 instances during each scaling operation.

---

### Question-214
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, architecture:dr:recovery-time-objective, architecture:ha:multi-region-design, database:relational:database-replication-strategies
**Tags**: aurora, rds, disaster-recovery
**Quality**: 4/5 — Clear multi-constraint scenario (low latency database sync, reduced capacity DR, lowest RTO) that requires understanding Aurora Global Database replication, warm standby vs pilot light trade-offs, and RTO implications — distractors meaningfully differ on database technology and DR strategy, though the question could specify RTO/RPO targets explicitly.

A rapidly growing ecommerce company is running its workloads in a single AWS Region. A solutions architect must create a disaster recovery (DR) strategy that includes a different AWS Region. The company wants its database to be up to date in the DR Region with the least possible latency. The remaining infrastructure in the DR Region needs to run at reduced capacity and must be able to scale up if necessary.



Which solution will meet these requirements with the LOWEST recovery time objective (RTO)?

- [x] Use an Amazon Aurora global database with a warm standby deployment.
- [ ] Use an Amazon Aurora global database with a pilot light deployment.
- [ ] Use an Amazon RDS Multi-AZ DB instance with a pilot light deployment.
- [ ] Use an Amazon RDS Multi-AZ DB instance with a warm standby deployment.

---

### Question-217
**Difficulty**: medium
**Topics**: compute:scaling:scaling-metrics-conditions, compute:scaling:auto-scaling-groups, storage:performance:storage-auto-scaling, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, rds, oracle
**Quality**: 3/5 — Tests basic Auto Scaling configuration and RDS storage scaling, but the scenario lacks specificity about traffic patterns, current bottlenecks, or why CPU is the appropriate metric versus other options like request count or ALB target tracking.

A company has a multi-tier application deployed on several Amazon EC2 instances in an Auto Scaling group. An Amazon RDS for Oracle instance is the application’ s data layer that uses Oracle-specific PL/SQL functions. Traffic to the application has been steadily increasing. This is causing the EC2 instances to become overloaded and the RDS instance to run out of storage. The Auto Scaling group does not have any scaling metrics and defines the minimum healthy instance count only. The company predicts that traffic will continue to increase at a steady but unpredictable rate before leveling off.



What should a solutions architect do to ensure the system can automatically scale for the increased traffic? (Choose two.)

- [x] Configure storage Auto Scaling on the RDS for Oracle instance.
- [x] Configure the Auto Scaling group to use the average CPU as the scaling metric.
- [ ] Migrate the database to Amazon Aurora to use Auto Scaling storage.
- [ ] Configure an alarm on the RDS for Oracle instance for low free storage space.
- [ ] Configure the Auto Scaling group to use the average free memory as the scaling metric.

---

### Question-223
**Difficulty**: easy
**Topics**: architecture:dr:recovery-point-objective, database:relational:multi-az-deployment, architecture:ha:multi-az-design
**Tags**: rds, postgresql
**Quality**: 3/5 — Tests direct recall that Multi-AZ RDS provides synchronous replication with near-zero RPO, but distractors are weak — auto scaling doesn't affect RPO, read replicas use asynchronous replication with lag, and DMS CDC is overkill — any RDS baseline knowledge eliminates 3 of 4 answers instantly.

A company runs a fleet of web servers using an Amazon RDS for PostgreSQL DB instance. After a routine compliance check, the company sets a standard that requires a recovery point objective (RPO) of less than 1 second for all its production databases.



Which solution meets these requirements?

- [x] Enable a Multi-AZ deployment for the DB instance.
- [ ] Enable auto scaling for the DB instance in one Availability Zone.
- [ ] Configure the DB instance in one Availability Zone, and create multiple read replicas in a separate Availability Zone.
- [ ] Configure the DB instance in one Availability Zone, and configure AWS Database Migration Service (AWS DMS) change data capture (CDC) tasks.

---

### Question-230
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:file:nfs-vs-smb-protocols, compute:instances:workload-classification, architecture:ha:multi-az-design
**Tags**: efs, ec2, s3, cloudfront, ebs
**Quality**: 3/5 — Tests basic AWS service selection for shared file storage, but distractors are trivially eliminable — S3 and CloudFront are object storage not file systems, EBS cannot be mounted to multiple instances — lacking scenario depth on traffic patterns, region requirements, or performance needs to justify EFS over alternatives.

A company is migrating a Linux-based web server group to AWS. The web servers must access files in a shared file store for some content. The company must not make any changes to the application.



What should a solutions architect do to meet these requirements?

- [x] Create an Amazon Elastic File System (Amazon EFS) file system. Mount the EFS file system on all web servers.
- [ ] Create an Amazon S3 Standard bucket with access to the web servers.
- [ ] Configure an Amazon CloudFront distribution with an Amazon S3 bucket as the origin.
- [ ] Configure a General Purpose SSD (gp3) Amazon Elastic Block Store (Amazon EBS) volume. Mount the EBS volume to all web servers.

---

### Question-232
**Difficulty**: hard
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, architecture:ha:regional-failover
**Tags**: nlb, global-accelerator, ec2, auto-scaling, route-53, alb, cloudfront
**Quality**: 5/5 — Multi-constraint scenario (UDP protocol, multi-region, low latency, automated failover) requires reasoning through protocol support (NLB for UDP, not ALB), Global Accelerator for failover vs Route 53 limitations, and CloudFront's HTTP-only constraint — each distractor fails on exactly one critical requirement.

A company provides a Voice over Internet Protocol (VoIP) service that uses UDP connections. The service consists of Amazon EC2 instances that run in an Auto Scaling group. The company has deployments across multiple AWS Regions.

The company needs to route users to the Region with the lowest latency. The company also needs automated failover between Regions.

Which solution will meet these requirements?

- [x] Deploy a Network Load Balancer (NLB) and an associated target group. Associate the target group with the Auto Scaling group. Use the NLB as an AWS Global Accelerator endpoint in each Region.
- [ ] Deploy an Application Load Balancer (ALB) and an associated target group. Associate the target group with the Auto Scaling group. Use the ALB as an AWS Global Accelerator endpoint in each Region.
- [ ] Deploy a Network Load Balancer (NLB) and an associated target group. Associate the target group with the Auto Scaling group. Create an Amazon Route 53 latency record that points to aliases for each NLB. Create an Amazon CloudFront distribution that uses the latency record as an origin.
- [ ] Deploy an Application Load Balancer (ALB) and an associated target group. Associate the target group with the Auto Scaling group. Create an Amazon Route 53 weighted record that points to aliases for each ALB. Deploy an Amazon CloudFront distribution that uses the weighted record as an origin.

---

### Question-240
**Difficulty**: medium
**Topics**: compute:scaling:auto-scaling-groups, compute:scaling:target-tracking-scaling, compute:cost:compute-purchasing-options, network:load-balancing:load-balancing-strategy, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, alb, cloudwatch
**Quality**: 3/5 — Tests Auto Scaling configuration and target tracking policy selection, but distractors are weak — manual Lambda-based termination and manual email-based scaling are obviously inefficient, and the third option omits the scaling policy entirely, making all wrong answers trivially eliminable without deep architectural reasoning.

A company deploys an application on five Amazon EC2 instances. An Application Load Balancer (ALB) distributes traffic to the instances by using a target group. The average CPU usage on each of the instances is below 10% most of the time, with occasional surges to 65%.



A solutions architect needs to implement a solution to automate the scalability of the application. The solution must optimize the cost of the architecture and must ensure that the application has enough CPU resources when surges occur.



Which solution will meet these requirements?

- [x] Create an EC2 Auto Scaling group. Select the existing ALB as the load balancer and the existing target group as the target group. Set a target tracking scaling policy that is based on the ASGAverageCPUUtilization metric. Set the minimum instances to 2, the desired capacity to 3, the maximum instances to 6, and the target value to 50%. Add the EC2 instances to the Auto Scaling group.
- [ ] Create an Amazon CloudWatch alarm that enters the ALARM state when the CPUUtilization metric is less than 20%. Create an AWS Lambda function that the CloudWatch alarm invokes to terminate one of the EC2 instances in the ALB target group.
- [ ] Create an EC2 Auto Scaling group. Select the existing ALB as the load balancer and the existing target group as the target group. Set the minimum instances to 2, the desired capacity to 3, and the maximum instances to 6. Add the EC2 instances to the Auto Scaling group.
- [ ] Create two Amazon CloudWatch alarms. Configure the first CloudWatch alarm to enter the ALARM state when the average CPUUtilization metric is below 20%. Configure the second CloudWatch alarm to enter the ALARM state when the average CPUUtilization matric is above 50%. Configure the alarms to publish to an Amazon Simple Notification Service (Amazon SNS) topic to send an email message. After receiving the message, log in to decrease or increase the number of EC2 instances that are running.

---

### Question-241
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, network:architecture:vpc-design, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment
**Tags**: ec2, alb, auto-scaling, rds, vpc
**Quality**: 3/5 — Tests basic HA best practices (Multi-AZ, subnet per AZ, ASG distribution) but distractors are trivially eliminable — subnets cannot extend across AZs, and Multi-AZ is the standard RDS configuration — making this more service-recall than architectural reasoning.

A company is running a critical business application on Amazon EC2 instances behind an Application Load Balancer. The EC2 instances run in an Auto Scaling group and access an Amazon RDS DB instance.



The design did not pass an operational review because the EC2 instances and the DB instance are all located in a single Availability Zone. A solutions architect must update the design to use a second Availability Zone.



Which solution will make the application highly available?

- [x] Provision a subnet in each Availability Zone. Configure the Auto Scaling group to distribute the EC2 instances across both Availability Zones. Configure the DB instance for Multi-AZ deployment.
- [ ] Provision a subnet in each Availability Zone. Configure the Auto Scaling group to distribute the EC2 instances across both Availability Zones. Configure the DB instance with connections to each network.
- [ ] Provision two subnets that extend across both Availability Zones. Configure the Auto Scaling group to distribute the EC2 instances across both Availability Zones. Configure the DB instance with connections to each network.
- [ ] Provision a subnet that extends across both Availability Zones. Configure the Auto Scaling group to distribute the EC2 instances across both Availability Zones. Configure the DB instance for Multi-AZ deployment.

---

### Question-242
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:performance:storage-performance-optimization, storage:object:storage-access-patterns, architecture:ha:multi-az-design, compute:instances:workload-classification
**Tags**: s3, fsx, fsx-lustre, ec2, amazon-linux
**Quality**: 4/5 — Well-structured scenario with clear performance constraints (sub-millisecond latency, 6 GBps throughput, 8 TB data) that requires understanding storage trade-offs between HDD/SSD, FSx for Lustre vs NetApp ONTAP, and S3 integration patterns; distractors meaningfully differ on storage type (HDD vs SSD) and file system choice, forcing reasoning about throughput and latency requirements.

A research laboratory needs to process approximately 8 TB of data. The laboratory requires sub-millisecond latencies and a minimum throughput of 6 GBps for the storage subsystem. Hundreds of Amazon EC2 instances that run Amazon Linux will distribute and process the data.



Which solution will meet the performance requirements?

- [x] Create an Amazon S3 bucket to store the raw data. Create an Amazon FSx for Lustre file system that uses persistent SSD storage. Select the option to import data from and export data to Amazon S3. Mount the file system on the EC2 instances.
- [ ] Create an Amazon FSx for NetApp ONTAP file system. Sat each volume’ tiering policy to ALL. Import the raw data into the file system. Mount the fila system on the EC2 instances.
- [ ] Create an Amazon S3 bucket to store the raw data. Create an Amazon FSx for Lustre file system that uses persistent HDD storage. Select the option to import data from and export data to Amazon S3. Mount the file system on the EC2 instances.
- [ ] Create an Amazon FSx for NetApp ONTAP file system. Set each volume’s tiering policy to NONE. Import the raw data into the file system. Mount the file system on the EC2 instances.

---

### Question-251
**Difficulty**: medium
**Topics**: compute:instances:placement-group-strategy, network:performance:latency-optimization, cost:optimization:network-transfer-minimization, architecture:ha:availability-zone-strategy
**Tags**: ec2, placement-group
**Quality**: 4/5 — Clear scenario with specific constraints (100k+ transactions/min, high throughput, latency-sensitive, cost-effective) that requires understanding placement group strategies and their network performance trade-offs; distractors test knowledge of partition vs cluster placement groups and misunderstanding of scaling strategies for this use case.

A company wants to run an in-memory database for a latency-sensitive application that runs on Amazon EC2 instances. The application processes more than 100,000 transactions each minute and requires high network throughput. A solutions architect needs to provide a cost-effective network design that minimizes data transfer charges.



Which solution meets these requirements?

- [x] Launch all EC2 instances in the same Availability Zone within the same AWS Region. Specify a placement group with cluster strategy when launching EC2 instances.
- [ ] Launch all EC2 instances in different Availability Zones within the same AWS Region. Specify a placement group with partition strategy when launching EC2 instances.
- [ ] Deploy an Auto Scaling group to launch EC2 instances in different Availability Zones based on a network utilization target.
- [ ] Deploy an Auto Scaling group with a step scaling policy to launch EC2 instances in different Availability Zones.

---

### Question-258
**Difficulty**: medium
**Topics**: storage:archival:backup-and-restore, storage:archival:backup-retention-policies, architecture:dr:disaster-recovery-strategies, architecture:ha:multi-region-design, compute:instances:ami-management
**Tags**: aws-backup, ec2, ebs, backup
**Quality**: 4/5 — Clear scenario with meaningful trade-offs between AWS Backup (manages both instance config and volumes automatically) versus Lambda-based snapshots (requires custom orchestration); distractors require understanding that backing up EC2 instances captures configuration while EBS-only backups miss AMI/instance metadata, and distinguishing cross-region vs cross-AZ recovery requirements.

A company has an application that runs on several Amazon EC2 instances. Each EC2 instance has multiple Amazon Elastic Block Store (Amazon EBS) data volumes attached to it. The application’s EC2 instance configuration and data need to be backed up nightly. The application also needs to be recoverable in a different AWS Region.



Which solution will meet these requirements in the MOST operationally efficient way?

- [x] Create a backup plan by using AWS Backup to perform nightly backups. Copy the backups to another Region. Add the application’s EC2 instances as resources.
- [ ] Write an AWS Lambda function that schedules nightly snapshots of the application’s EBS volumes and copies the snapshots to a different Region.
- [ ] Create a backup plan by using AWS Backup to perform nightly backups. Copy the backups to another Region. Add the application’s EBS volumes as resources.
- [ ] Write an AWS Lambda function that schedules nightly snapshots of the application's EBS volumes and copies the snapshots to a different Availability Zone.

---

### Question-259
**Difficulty**: easy
**Topics**: network:performance:content-delivery-strategy, security:application:secure-application-access, storage:object:presigned-urls, architecture:ha:global-load-distribution
**Tags**: cloudfront, s3, kms, vpn, client-vpn
**Quality**: 2/5 — Tests basic service selection but distractors are trivially eliminable — public S3 bucket violates authorization requirements, VPN/Client VPN are unnecessary for mobile streaming and don't scale to millions of users — anyone with foundational AWS knowledge can eliminate them instantly.

A company is building a mobile app on AWS. The company wants to expand its reach to millions of users. The company needs to build a platform so that authorized users can watch the company’s content on their mobile devices.



What should a solutions architect recommend to meet these requirements?

- [x] Use Amazon CloudFront. Provide signed URLs to stream content.
- [ ] Publish content to a public Amazon S3 bucket. Use AWS Key Management Service (AWS KMS) keys to stream content.
- [ ] Set up IPsec VPN between the mobile app and the AWS environment to stream content.
- [ ] Set up AWS Client VPN between the mobile app and the AWS environment to stream content.

---

### Question-260
**Difficulty**: easy
**Topics**: database:cost:serverless-database, database:migration:heterogeneous-db-migration, compute:serverless:serverless-cost-optimization, architecture:ha:multi-az-design
**Tags**: aurora-serverless, aurora-mysql, rds-mysql, redshift-spectrum
**Quality**: 3/5 — Tests basic service selection for serverless database migration but lacks depth — the requirement for 'not selecting a particular instance type' and 'infrequent access patterns' directly point to Aurora Serverless, making other options trivially eliminable without reasoning about trade-offs or architectural constraints.

A company has an on-premises MySQL database used by the global sales team with infrequent access patterns. The sales team requires the database to have minimal downtime. A database administrator wants to migrate this database to AWS without selecting a particular instance type in anticipation of more users in the future.



Which service should a solutions architect recommend?

- [x] Amazon Aurora Serverless for MySQL
- [ ] Amazon Aurora MySQL
- [ ] Amazon Redshift Spectrum
- [ ] Amazon RDS for MySQL

---

### Question-270
**Difficulty**: easy
**Topics**: integration:api:api-creation-management, compute:serverless:event-driven-architectures, database:nosql:partition-key-design, architecture:ha:multi-az-design, monitoring:observability:centralized-logging
**Tags**: api-gateway, lambda, dynamodb, https
**Quality**: 3/5 — Tests basic serverless architecture pattern selection but distractors are weak — EC2 as an HTTPS endpoint is outdated, Route 53 doesn't route to Lambda, and VPC endpoints with VPN for S3 misses the ingestion requirement — minimal reasoning about trade-offs required.

A company’s facility has badge readers at every entrance throughout the building. When badges are scanned, the readers send a message over HTTPS to indicate who attempted to access that particular entrance.



A solutions architect must design a system to process these messages from the sensors. The solution must be highly available, and the results must be made available for the company’s security team to analyze.



Which system architecture should the solutions architect recommend?

- [x] Create an HTTPS endpoint in Amazon API Gateway. Configure the API Gateway endpoint to invoke an AWS Lambda function to process the messages and save the results to an Amazon DynamoDB table.
- [ ] Launch an Amazon EC2 instance to serve as the HTTPS endpoint and to process the messages. Configure the EC2 instance to save the results to an Amazon S3 bucket.
- [ ] Use Amazon Route 53 to direct incoming sensor messages to an AWS Lambda function. Configure the Lambda function to process the messages and save the results to an Amazon DynamoDB table.
- [ ] Create a gateway VPC endpoint for Amazon S3. Configure a Site-to-Site VPN connection from the facility network to the VPC so that sensor data can be written directly to an S3 bucket by way of the VPC endpoint.

---

### Question-281
**Difficulty**: easy
**Topics**: compute:scaling:scheduled-scaling, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, alb
**Quality**: 3/5 — Tests basic understanding of scheduled scaling for predictable workload spikes, but distractors are weak — CloudFront doesn't solve compute bottlenecks, simple scaling policies react too slowly to the predictable spike, and ElastiCache doesn't address CPU-intensive batch processing — allowing easy elimination without deep architectural reasoning.

A company’s application runs on Amazon EC2 instances behind an Application Load Balancer (ALB). The instances run in an Amazon EC2 Auto Scaling group across multiple Availability Zones. On the first day of every month at midnight, the application becomes much slower when the month-end financial calculation batch runs. This causes the CPU utilization of the EC2 instances to immediately peak to 100%, which disrupts the application.



What should a solutions architect recommend to ensure the application is able to handle the workload and avoid downtime?

- [x] Configure an EC2 Auto Scaling scheduled scaling policy based on the monthly schedule.
- [ ] Configure an Amazon CloudFront distribution in front of the ALB.
- [ ] Configure an EC2 Auto Scaling simple scaling policy based on CPU utilization.
- [ ] Configure Amazon ElastiCache to remove some of the workload from the EC2 instances.

---

### Question-283
**Difficulty**: medium
**Topics**: compute:scaling:auto-scaling-groups, compute:instances:ami-management, storage:block:snapshot-strategy, architecture:ha:multi-az-design
**Tags**: ec2, ami, auto-scaling, ebs
**Quality**: 3/5 — Tests knowledge of EBS fast snapshot restore and AMI provisioning but lacks scenario depth — no context on current initialization latency, demand patterns, or why snapshot restore solves the problem better than other approaches; distractors are weak (Step Functions, Data Lifecycle Manager, and EventBridge solutions are implausibly complex and don't directly address initialization speed).

A company is experiencing sudden increases in demand. The company needs to provision large Amazon EC2 instances from an Amazon Machine Image (AMI). The instances will run in an Auto Scaling group. The company needs a solution that provides minimum initialization latency to meet the demand.



Which solution meets these requirements?

- [x] Enable Amazon Elastic Block Store (Amazon EBS) fast snapshot restore on a snapshot. Provision an AMI by using the snapshot. Replace the AMI in the Auto Scaling group with the new AMI.
- [ ] Use the aws ec2 register-image command to create an AMI from a snapshot. Use AWS Step Functions to replace the AMI in the Auto Scaling group.
- [ ] Enable AMI creation and define lifecycle rules in Amazon Data Lifecycle Manager (Amazon DLM). Create an AWS Lambda function that modifies the AMI in the Auto Scaling group.
- [ ] Use Amazon EventBridge to invoke AWS Backup lifecycle policies that provision AMIs. Configure Auto Scaling group capacity limits as an event source in EventBridge.

---

### Question-285
**Difficulty**: medium
**Topics**: database:relational:database-replication-strategies, database:migration:replication-lag-management, database:performance:database-capacity-planning, architecture:ha:multi-az-design, database:performance:read-vs-write-intensive
**Tags**: rds, aurora, mysql
**Quality**: 4/5 — Well-structured scenario with clear constraints (sub-1-second replication lag, minimal code changes, low operational overhead) and strong distractors; the correct answer requires understanding Aurora's architectural advantages over RDS read replicas, while each distractor introduces a significant trade-off (caching adds complexity, EC2 increases overhead, DynamoDB requires schema redesign) that meaningfully tests architectural reasoning.

A company has deployed a web application on AWS. The company hosts the backend database on Amazon RDS for MySQL with a primary DB instance and five read replicas to support scaling needs. The read replicas must lag no more than 1 second behind the primary DB instance. The database routinely runs scheduled stored procedures.



As traffic on the website increases, the replicas experience additional lag during periods of peak load. A solutions architect must reduce the replication lag as much as possible. The solutions architect must minimize changes to the application code and must minimize ongoing operational overhead.



Which solution will meet these requirements?

- [x] Migrate the database to Amazon Aurora MySQL. Replace the read replicas with Aurora Replicas, and configure Aurora Auto Scaling. Replace the stored procedures with Aurora MySQL native functions.
- [ ] Deploy an Amazon ElastiCache for Redis cluster in front of the database. Modify the application to check the cache before the application queries the database. Replace the stored procedures with AWS Lambda functions.
- [ ] Migrate the database to a MySQL database that runs on Amazon EC2 instances. Choose large, compute optimized EC2 instances for all replica nodes. Maintain the stored procedures on the EC2 instances.
- [ ] Migrate the database to Amazon DynamoDB. Provision a large number of read capacity units (RCUs) to support the required throughput, and configure on-demand capacity scaling. Replace the stored procedures with DynamoDB streams.

---

### Question-286
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, database:relational:database-replication-strategies, architecture:ha:multi-region-design, cost:optimization:reserved-capacity-planning
**Tags**: aurora, rds, aws-database-migration-service, multi-region
**Quality**: 3/5 — Tests Aurora global database knowledge and cost optimization trade-offs, but the key insight (removing secondary DB instance to save costs) is somewhat counterintuitive without deeper reasoning about RTO/RPO implications, and distractors don't present equally defensible alternatives.

A solutions architect must create a disaster recovery (DR) plan for a high-volume software as a service (SaaS) platform. All data for the platform is stored in an Amazon Aurora MySQL DB cluster.



The DR plan must replicate data to a secondary AWS Region.



Which solution will meet these requirements MOST cost-effectively?

- [x] Set up an Aurora global database for the DB cluster. When setup is complete, remove the DB instance from the secondary Region.
- [ ] Use MySQL binary log replication to an Aurora cluster in the secondary Region. Provision one DB instance for the Aurora cluster in the secondary Region.
- [ ] Use AWS Database Migration Service (AWS DMS) to continuously replicate data to an Aurora cluster in the secondary Region. Remove the DB instance from the secondary Region.
- [ ] Set up an Aurora global database for the DB cluster. Specify a minimum of one DB instance in the secondary Region.

---

### Question-292
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, architecture:ha:multi-region-design, database:relational:database-replication-strategies, database:migration:zero-downtime-migration
**Tags**: aurora, rds, ec2, mysql, s3
**Quality**: 4/5 — Well-structured scenario with clear operational overhead constraint; the correct answer (Aurora global database) directly addresses multi-region DR with minimal overhead, while distractors are plausible but involve more operational complexity (manual replication, backup/restore, or multi-AZ-only solutions that don't meet cross-region requirement).

A solutions architect is designing a company’s disaster recovery (DR) architecture. The company has a MySQL database that runs on an Amazon EC2 instance in a private subnet with scheduled backup. The DR design needs to include multiple AWS Regions.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Migrate the MySQL database to an Amazon Aurora global database. Host the primary DB cluster in the primary Region. Host the secondary DB cluster in the DR Region.
- [ ] Migrate the MySQL database to multiple EC2 instances. Configure a standby EC2 instance in the DR Region. Turn on replication.
- [ ] Migrate the MySQL database to Amazon RDS. Use a Multi-AZ deployment. Turn on read replication for the primary DB instance in the different Availability Zones.
- [ ] Store the scheduled backup of the MySQL database in an Amazon S3 bucket that is configured for S3 Cross-Region Replication (CRR). Use the data backup to restore the database in the DR Region.

---

### Question-300
**Difficulty**: medium
**Topics**: database:relational:multi-az-deployment, database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design
**Tags**: rds, sql-server
**Quality**: 4/5 — Clear two-part requirement (HA + reporting performance) that tests understanding of Multi-AZ for failover and read replicas for workload separation; distractors are plausible but meaningfully different (snapshots don't solve HA, RDS Custom adds complexity, RDS Proxy doesn't reduce contention).

A company uses a 100 GB Amazon RDS for Microsoft SQL Server Single-AZ DB instance in the us-east-1 Region to store customer transactions. The company needs high availability and automatic recovery for the DB instance.



The company must also run reports on the RDS database several times a year. The report process causes transactions to take longer than usual to post to the customers’ accounts. The company needs a solution that will improve the performance of the report process.



Which combination of steps will meet these requirements? (Choose two.)

- [x] Modify the DB instance from a Single-AZ DB instance to a Multi-AZ deployment.
- [x] Create a read replica of the DB instance in a different Availability Zone. Point all requests for reports to the read replica.
- [ ] Take a snapshot of the current DB instance. Restore the snapshot to a new RDS deployment in another Availability Zone.
- [ ] Migrate the database to RDS Custom.
- [ ] Use RDS Proxy to limit reporting requests to the maintenance window.

---

### Question-302
**Difficulty**: medium
**Topics**: network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, network:load-balancing:layer4-vs-layer7-balancing
**Tags**: global-accelerator, vpc, transit-gateway, cloudfront
**Quality**: 4/5 — Strong multi-region UDP gaming scenario with clear latency/packet-loss requirements; correct answer (Global Accelerator with UDP) is the only service purpose-built for this use case, and distractors are plausible but each fails on a key constraint (transit gateway for intra-region routing, CloudFront HTTP-only, VPC peering no UDP support).

A company is designing the network for an online multi-player game. The game uses the UDP networking protocol and will be deployed in eight AWS Regions. The network architecture needs to minimize latency and packet loss to give end users a high-quality gaming experience.



Which solution will meet these requirements?

- [x] Set up AWS Global Accelerator with UDP listeners and endpoint groups in each Region.
- [ ] Setup a transit gateway in each Region. Create inter-Region peering attachments between each transit gateway.
- [ ] Set up Amazon CloudFront with UDP turned on. Configure an origin in each Region.
- [ ] Set up a VPC peering mesh between each Region. Turn on UDP for each VPC.

---

### Question-303
**Difficulty**: medium
**Topics**: database:relational:multi-az-deployment, database:cost:on-demand-vs-provisioned, storage:block:volume-type-selection, architecture:ha:multi-az-design, architecture:migration:lift-and-shift
**Tags**: rds, mysql, ebs, ec2
**Quality**: 4/5 — Strong scenario with clear trade-offs between self-managed EC2/EBS and managed RDS; requires understanding cost implications of gp2 vs io2, HA benefits of Multi-AZ, and capacity planning — distractors are plausible (Block Express for higher IOPS, S3 as red herring, EC2 active-passive as partial solution) but correct answer directly follows from stated requirements.

A company hosts a three-tier web application on Amazon EC2 instances in a single Availability Zone. The web application uses a self-managed MySQL database that is hosted on an EC2 instance to store data in an Amazon Elastic Block Store (Amazon EBS) volume. The MySQL database currently uses a 1 TB Provisioned IOPS SSD (io2) EBS volume. The company expects traffic of 1,000 IOPS for both reads and writes at peak traffic.



The company wants to minimize any disruptions, stabilize performance, and reduce costs while retaining the capacity for double the IOPS. The company wants to move the database tier to a fully managed solution that is highly available and fault tolerant.



Which solution will meet these requirements MOST cost-effectively?

- [x] Use a Multi-AZ deployment of an Amazon RDS for MySQL DB instance with a General Purpose SSD (gp2) EBS volume.
- [ ] Use a Multi-AZ deployment of an Amazon RDS for MySQL DB instance with an io2 Block Express EBS volume.
- [ ] Use Amazon S3 Intelligent-Tiering access tiers.
- [ ] Use two large EC2 instances to host the database in active-passive mode.

---

### Question-305
**Difficulty**: medium
**Topics**: compute:cost:compute-purchasing-options, compute:instances:instance-type-selection, compute:scaling:horizontal-scaling, architecture:ha:multi-az-design
**Tags**: batch, ec2, lambda, ecs, fargate, lightsail
**Quality**: 3/5 — Tests service selection for batch workloads but lacks specificity — Lambda's 15-minute timeout limit and container cold-start concerns are not explicitly stated, making the reasoning implicit rather than based on stated constraints; distractors are plausible but not strongly differentiated by the scenario.

A company is migrating an old application to AWS. The application runs a batch job every hour and is CPU intensive. The batch job takes 15 minutes on average with an on-premises server. The server has 64 virtual CPU (vCPU) and 512 GiB of memory.



Which solution will run the batch job within 15 minutes with the LEAST operational overhead?

- [x] Use AWS Batch on Amazon EC2.
- [ ] Use AWS Lambda with functional scaling.
- [ ] Use Amazon Elastic Container Service (Amazon ECS) with AWS Fargate.
- [ ] Use Amazon Lightsail with AWS Auto Scaling.

---

### Question-307
**Difficulty**: medium
**Topics**: storage:object:storage-access-patterns, storage:object:storage-tiering, network:performance:edge-acceleration-cdn, storage:file:shared-file-system-design, architecture:ha:multi-az-design
**Tags**: s3, cloudfront, fsx, ec2, alb
**Quality**: 3/5 — Tests basic AWS service selection for HA storage scenarios, but distractors are weak — ElastiCache is for caching databases not static files, EFS doesn't work with Windows, and EBS cannot be shared across instances — eliminating these requires only surface-level AWS knowledge rather than genuine architectural reasoning about the trade-offs between shared file systems and object storage.

A gaming company is moving its public scoreboard from a data center to the AWS Cloud. The company uses Amazon EC2 Windows Server instances behind an Application Load Balancer to host its dynamic application. The company needs a highly available storage solution for the application. The application consists of static files and dynamic server-side code.



Which combination of steps should a solutions architect take to meet these requirements? (Choose two.)

- [x] Store the static files on Amazon S3. Use Amazon CloudFront to cache objects at the edge.
- [x] Store the server-side code on Amazon FSx for Windows File Server. Mount the FSx for Windows File Server volume on each EC2 instance to share the files.
- [ ] Store the static files on Amazon S3. Use Amazon ElastiCache to cache objects at the edge.
- [ ] Store the server-side code on Amazon Elastic File System (Amazon EFS). Mount the EFS volume on each EC2 instance to share the files.
- [ ] Store the server-side code on a General Purpose SSD (gp2) Amazon Elastic Block Store (Amazon EBS) volume. Mount the EBS volume on each EC2 instance to share the files.

---

### Question-310
**Difficulty**: medium
**Topics**: security:data:encryption-key-management, security:data:encryption-at-rest, storage:object:cross-region-replication, architecture:ha:multi-region-design
**Tags**: s3, kms
**Quality**: 4/5 — Tests understanding of multi-Region KMS key replication vs single-key management, S3 replication patterns, and encryption strategy trade-offs; distractors are plausible (SSE-S3, separate regional keys, per-region KMS) but each violates a stated requirement, forcing careful analysis of operational overhead.

A company is building an application in the AWS Cloud. The application will store data in Amazon S3 buckets in two AWS Regions. The company must use an AWS Key Management Service (AWS KMS) customer managed key to encrypt all data that is stored in the S3 buckets. The data in both S3 buckets must be encrypted and decrypted with the same KMS key. The data and the key must be stored in each of the two Regions.

Which solution will meet these requirements with the LEAST operational overhead?

- [x] Create a customer managed multi-Region KMS key. Create an S3 bucket in each Region. Configure replication between the S3 buckets. Configure the application to use the KMS key with client-side encryption.
- [ ] Create an S3 bucket in each Region. Configure the S3 buckets to use server-side encryption with Amazon S3 managed encryption keys (SSE-S3). Configure replication between the S3 buckets.
- [ ] Create a customer managed KMS key and an S3 bucket in each Region. Configure the S3 buckets to use server-side encryption with Amazon S3 managed encryption keys (SSE-S3). Configure replication between the S3 buckets.
- [ ] Create a customer managed KMS key and an S3 bucket in each Region. Configure the S3 buckets to use server-side encryption with AWS KMS keys (SSE-KMS). Configure replication between the S3 buckets.

---

### Question-318
**Difficulty**: hard
**Topics**: network:performance:global-anycast-routing, network:performance:latency-optimization, network:load-balancing:layer4-vs-layer7-balancing, architecture:ha:multi-region-design, network:connectivity:on-premises-cloud-bridge
**Tags**: route-53, nlb, alb, global-accelerator, cloudfront
**Quality**: 4/5 — Strong multi-constraint scenario (UDP protocol, on-premises compliance, multi-region latency optimization, improved availability) requires reasoning through protocol support (NLB for UDP, not ALB), Global Accelerator's superiority over Route 53+CloudFront for UDP/performance, and on-premises bridging patterns; distractors are plausible but each violates a key requirement (ALB doesn't support UDP, CloudFront only works with HTTP/HTTPS).

A company is using Amazon Route 53 latency-based routing to route requests to its UDP-based application for users around the world. The application is hosted on redundant servers in the company's on-premises data centers in the United States, Asia, and Europe. The company’s compliance requirements state that the application must be hosted on premises. The company wants to improve the performance and availability of the application.



What should a solutions architect do to meet these requirements?

- [x] Configure three Network Load Balancers (NLBs) in the three AWS Regions to address the on-premises endpoints. Create an accelerator by using AWS Global Accelerator, and register the NLBs as its endpoints. Provide access to the application by using a CNAME that points to the accelerator DNS.
- [ ] Configure three Application Load Balancers (ALBs) in the three AWS Regions to address the on-premises endpoints. Create an accelerator by using AWS Global Accelerator, and register the ALBs as its endpoints. Provide access to the application by using a CNAME that points to the accelerator DNS.
- [ ] Configure three Network Load Balancers (NLBs) in the three AWS Regions to address the on-premises endpoints. In Route 53, create a latency-based record that points to the three NLBs, and use it as an origin for an Amazon CloudFront distribution. Provide access to the application by using a CNAME that points to the CloudFront DNS.
- [ ] Configure three Application Load Balancers (ALBs) in the three AWS Regions to address the on-premises endpoints. In Route 53, create a latency-based record that points to the three ALBs, and use it as an origin for an Amazon CloudFront distribution. Provide access to the application by using a CNAME that points to the CloudFront DNS.

---

### Question-324
**Difficulty**: medium
**Topics**: database:migration:heterogeneous-db-migration, storage:object:storage-access-patterns, database:nosql:key-value-vs-document, cost:optimization:storage-size-optimization, architecture:ha:multi-az-design
**Tags**: s3, dynamodb, oracle, rds
**Quality**: 4/5 — Strong scenario with clear constraints (high-resolution images, frequent updates, burst traffic, cost-effectiveness, HA) that logically eliminates weaker options; distractors each represent defensible but suboptimal trade-offs (storing in RDS adds cost, DAX doesn't solve storage scalability, hybrid approach duplicates data), requiring understanding of when to decouple blob storage from metadata indexing.

A company wants to migrate an Oracle database to AWS. The database consists of a single table that contains millions of geographic information systems (GIS) images that are high resolution and are identified by a geographic code.



When a natural disaster occurs, tens of thousands of images get updated every few minutes. Each geographic code has a single image or row that is associated with it. The company wants a solution that is highly available and scalable during such events.



Which solution meets these requirements MOST cost-effectively?

- [x] Store the images in Amazon S3 buckets. Use Amazon DynamoDB with the geographic code as the key and the image S3 URL as the value.
- [ ] Store the images and geographic codes in a database table. Use Oracle running on an Amazon RDS Multi-AZ DB instance.
- [ ] Store the images and geographic codes in an Amazon DynamoDB table. Configure DynamoDB Accelerator (DAX) during times of high load.
- [ ] Store the images in Amazon S3 buckets. Store geographic codes and image S3 URLs in a database table. Use Oracle running on an Amazon RDS Multi-AZ DB instance.

---

### Question-330
**Difficulty**: medium
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, compute:scaling:auto-scaling-groups, database:nosql:relational-vs-nonrelational, database:cost:on-demand-vs-provisioned, architecture:ha:multi-az-design
**Tags**: nlb, dynamodb, route-53, alb, aurora, auto-scaling
**Quality**: 4/5 — Well-structured scenario with multiple clear constraints (UDP protocol, auto-scaling spikes, non-relational data, no manual scaling) that logically eliminate most distractors; NLB is necessary for UDP support, DynamoDB on-demand for auto-scaling without intervention, making the correct answer the only defensible choice with meaningful trade-off reasoning.

A company is developing a real-time multiplayer game that uses UDP for communications between the client and servers in an Auto Scaling group. Spikes in demand are anticipated during the day, so the game server platform must adapt accordingly. Developers want to store gamer scores and other non-relational data in a database solution that will scale without intervention.



Which solution should a solutions architect recommend?

- [x] Use a Network Load Balancer for traffic distribution and Amazon DynamoDB on-demand for data storage.
- [ ] Use Amazon Route 53 for traffic distribution and Amazon Aurora Serverless for data storage.
- [ ] Use a Network Load Balancer for traffic distribution and Amazon Aurora Global Database for data storage.
- [ ] Use an Application Load Balancer for traffic distribution and Amazon DynamoDB global tables for data storage.

---

### Question-334
**Difficulty**: medium
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design, architecture:patterns:loose-coupling-design
**Tags**: rds, aurora, postgresql, s3
**Quality**: 4/5 — Strong scenario with clear constraints (read-heavy reporting must not block writes, minimal code changes) that directly justifies Aurora read replicas over alternatives; distractors are plausible (DocumentDB, Multi-AZ, DynamoDB) but each violates a key requirement—DocumentDB requires schema changes, Multi-AZ doesn't provide read scaling, DynamoDB requires major refactoring—forcing genuine architectural reasoning.

A company hosts a three-tier web application that includes a PostgreSQL database. The database stores the metadata from documents. The company searches the metadata for key terms to retrieve documents that the company reviews in a report each month. The documents are stored in Amazon S3. The documents are usually written only once, but they are updated frequently.



The reporting process takes a few hours with the use of relational queries. The reporting process must not prevent any document modifications or the addition of new documents. A solutions architect needs to implement a solution to speed up the reporting process.



Which solution will meet these requirements with the LEAST amount of change to the application code?

- [x] Set up a new Amazon Aurora PostgreSQL DB cluster that includes an Aurora Replica. Issue queries to the Aurora Replica to generate the reports.
- [ ] Set up a new Amazon DocumentDB (with MongoDB compatibility) cluster that includes a read replica. Scale the read replica to generate the reports.
- [ ] Set up a new Amazon RDS for PostgreSQL Multi-AZ DB instance. Configure the reporting module to query the secondary RDS node so that the reporting module does not affect the primary node.
- [ ] Set up a new Amazon DynamoDB table to store the documents. Use a fixed write capacity to support new document entries. Automatically scale the read capacity to support the reports.

---

### Question-337
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:performance:storage-performance-optimization, storage:object:object-lifecycle-management, cost:optimization:tiered-storage-cost-tradeoffs, architecture:ha:multi-az-design
**Tags**: efs, ec2, s3
**Quality**: 4/5 — Strong scenario with clear requirements (POSIX compliance, shareability, durability, cost-effectiveness, tiered access patterns); correct answer requires understanding that EFS with lifecycle policies is the only POSIX-compliant shared storage option, while distractors fail on either POSIX compliance (S3) or durability/availability (EFS One Zone), creating meaningful trade-off reasoning.

A company runs an application on Amazon EC2 Linux instances across multiple Availability Zones. The application needs a storage layer that is highly available and Portable Operating System Interface (POSIX)-compliant. The storage layer must provide maximum data durability and must be shareable across the EC2 instances. The data in the storage layer will be accessed frequently for the first 30 days and will be accessed infrequently after that time.



Which solution will meet these requirements MOST cost-effectively?

- [x] Use the Amazon Elastic File System (Amazon EFS) Standard storage class. Create a lifecycle management policy to move infrequently accessed data to EFS Standard-Infrequent Access (EFS Standard-IA).
- [ ] Use the Amazon S3 Standard storage class. Create an S3 Lifecycle policy to move infrequently accessed data to S3 Glacier.
- [ ] Use the Amazon S3 Standard storage class. Create an S3 Lifecycle policy to move infrequently accessed data to S3 Standard-Infrequent Access (S3 Standard-IA).
- [ ] Use the Amazon Elastic File System (Amazon EFS) One Zone storage class. Create a lifecycle management policy to move infrequently accessed data to EFS One Zone-Infrequent Access (EFS One Zone-IA).

---

### Question-342
**Difficulty**: easy
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, database:performance:data-access-patterns, architecture:ha:multi-az-design
**Tags**: rds, mysql
**Quality**: 3/5 — Tests basic RDS read replica recall but lacks scenario depth — no mention of query volume, latency requirements, or cost considerations; distractors are weak (ELB cannot handle DB scaling, vertical scaling defeats read separation purpose, Multi-AZ addresses HA not read/write separation).

A company has a large dataset for its online advertising business stored in an Amazon RDS for MySQL DB instance in a single Availability Zone. The company wants business reporting queries to run without impacting the write operations to the production DB instance.



Which solution meets these requirements?

- [x] Deploy RDS read replicas to process the business reporting queries.
- [ ] Scale out the DB instance horizontally by placing it behind an Elastic Load Balancer.
- [ ] Scale up the DB instance to a larger instance type to handle write operations and queries.
- [ ] Deploy the DB instance in multiple Availability Zones to process the business reporting queries.

---

### Question-344
**Difficulty**: medium
**Topics**: network:load-balancing:sticky-sessions, database:caching:session-state-caching, database:caching:in-memory-caching, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, application-load-balancer, rds, elasticache, redis
**Quality**: 3/5 — Tests session management strategies but requires choosing between two distinct approaches (load balancer affinity vs external cache); distractors are weak — DynamoDB lacks durability guarantees for sessions, Cognito manages authentication not session storage, and Systems Manager is irrelevant — making it more service-recall than architectural reasoning.

A company hosts a three-tier ecommerce application on a fleet of Amazon EC2 instances. The instances run in an Auto Scaling group behind an Application Load Balancer (ALB). All ecommerce data is stored in an Amazon RDS for MariaDB Multi-AZ DB instance.



The company wants to optimize customer session management during transactions. The application must store session data durably.



Which solutions will meet these requirements? (Choose two.)

- [x] Turn on the sticky sessions feature (session affinity) on the ALB.
- [x] Deploy an Amazon ElastiCache for Redis cluster to store customer session information.
- [ ] Use an Amazon DynamoDB table to store customer session information.
- [ ] Deploy an Amazon Cognito user pool to manage user session information.
- [ ] Use AWS Systems Manager Application Manager in the application to manage user session information.

---

### Question-350
**Difficulty**: medium
**Topics**: security:network:ddos-protection, network:performance:global-anycast-routing, architecture:ha:multi-region-design
**Tags**: shield, global-accelerator, ec2, dns, waf
**Quality**: 3/5 — Tests basic AWS Shield Advanced service selection for DDoS protection but lacks scenario depth — no traffic patterns, attack vectors, or cost context to justify why Global Accelerator endpoints (not EC2 instances) are the correct protection scope; distractors involving WAF are partially plausible but don't directly address Layer 3/4 DDoS threats.

A company has implemented a self-managed DNS service on AWS. The solution consists of the following:



• Amazon EC2 instances in different AWS Regions

• Endpoints of a standard accelerator in AWS Global Accelerator



The company wants to protect the solution against DDoS attacks.



What should a solutions architect do to meet this requirement?

- [x] Subscribe to AWS Shield Advanced. Add the accelerator as a resource to protect.
- [ ] Subscribe to AWS Shield Advanced. Add the EC2 instances as resources to protect.
- [ ] Create an AWS WAF web ACL that includes a rate-based rule. Associate the web ACL with the accelerator.
- [ ] Create an AWS WAF web ACL that includes a rate-based rule. Associate the web ACL with the EC2 instances.

---

### Question-354
**Difficulty**: easy
**Topics**: network:connectivity:vpc-endpoints, security:network:network-segmentation-strategies, architecture:ha:multi-az-design
**Tags**: vpc, s3, ec2, vpc-endpoint
**Quality**: 3/5 — Tests direct service recall (gateway VPC endpoint for S3) but distractors are trivially eliminable — CloudWatch Logs export is irrelevant, instance profile addresses permissions not connectivity, and API Gateway with PrivateLink is overly complex for S3 access — minimal architectural reasoning required.

An application runs on an Amazon EC2 instance in a VPC. The application processes logs that are stored in an Amazon S3 bucket. The EC2 instance needs to access the S3 bucket without connectivity to the internet.

Which solution will provide private network connectivity to Amazon S3?

- [x] Create a gateway VPC endpoint to the S3 bucket.
- [ ] Stream the logs to Amazon CloudWatch Logs. Export the logs to the S3 bucket.
- [ ] Create an instance profile on Amazon EC2 to allow S3 access.
- [ ] Create an Amazon API Gateway API with a private link to access the S3 endpoint.

---

### Question-355
**Difficulty**: medium
**Topics**: data:ingestion:streaming-data-ingestion, storage:object:object-lifecycle-management, storage:archival:cold-archival-storage, architecture:ha:multi-az-design, cost:optimization:data-transfer-cost-reduction
**Tags**: kinesis-data-firehose, s3, s3-glacier, kinesis
**Quality**: 4/5 — Clear multi-constraint scenario (high volume ingestion, HA, cost minimization, no infrastructure management, 14-day hot/cold tiering) that requires understanding Kinesis Firehose's managed nature, S3 lifecycle policies, and archival trade-offs; distractors are plausible (EC2 adds ops burden, OpenSearch requires manual snapshots, SQS misuses message retention) and each violates one or more requirements.

A company has thousands of edge devices that collectively generate 1 TB of status alerts each day. Each alert is approximately 2 KB in size. A solutions architect needs to implement a solution to ingest and store the alerts for future analysis.

The company wants a highly available solution. However, the company needs to minimize costs and does not want to manage additional infrastructure. Additionally, the company wants to keep 14 days of data available for immediate analysis and archive any data older than 14 days.

What is the MOST operationally efficient solution that meets these requirements?

- [x] Create an Amazon Kinesis Data Firehose delivery stream to ingest the alerts. Configure the Kinesis Data Firehose stream to deliver the alerts to an Amazon S3 bucket. Set up an S3 Lifecycle configuration to transition data to Amazon S3 Glacier after 14 days.
- [ ] Launch Amazon EC2 instances across two Availability Zones and place them behind an Elastic Load Balancer to ingest the alerts. Create a script on the EC2 instances that will store the alerts in an Amazon S3 bucket. Set up an S3 Lifecycle configuration to transition data to Amazon S3 Glacier after 14 days.
- [ ] Create an Amazon Kinesis Data Firehose delivery stream to ingest the alerts. Configure the Kinesis Data Firehose stream to deliver the alerts to an Amazon OpenSearch Service (Amazon Elasticsearch Service) cluster. Set up the Amazon OpenSearch Service (Amazon Elasticsearch Service) cluster to take manual snapshots every day and delete data from the cluster that is older than 14 days.
- [ ] Create an Amazon Simple Queue Service (Amazon SQS) standard queue to ingest the alerts, and set the message retention period to 14 days. Configure consumers to poll the SQS queue, check the age of the message, and analyze the message data as needed. If the message is 14 days old, the consumer should copy the message to an Amazon S3 bucket and delete the message from the SQS queue.

---

### Question-357
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, architecture:resilience:single-point-of-failure, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment
**Tags**: ec2, auto-scaling, rds, availability-zones
**Quality**: 3/5 — Tests basic HA/resilience best practices but distractors are weak — single AZ, EC2-based database, and EBS Multi-Attach are all trivially eliminable by anyone familiar with AWS HA patterns, requiring minimal architectural reasoning.

A company wants to use the AWS Cloud to make an existing application highly available and resilient. The current version of the application resides in the company's data center. The application recently experienced data loss after a database server crashed because of an unexpected power outage.



The company needs a solution that avoids any single points of failure. The solution must give the application the ability to scale to meet user demand.



Which solution will meet these requirements?

- [x] Deploy the application servers by using Amazon EC2 instances in an Auto Scaling group across multiple Availability Zones. Use an Amazon RDS DB instance in a Multi-AZ configuration.
- [ ] Deploy the application servers by using Amazon EC2 instances in an Auto Scaling group in a single Availability Zone. Deploy the database on an EC2 instance. Enable EC2 Auto Recovery.
- [ ] Deploy the application servers by using Amazon EC2 instances in an Auto Scaling group across multiple Availability Zones. Use an Amazon RDS DB instance with a read replica in a single Availability Zone. Promote the read replica to replace the primary DB instance if the primary DB instance fails.
- [ ] Deploy the application servers by using Amazon EC2 instances in an Auto Scaling group across multiple Availability Zones. Deploy the primary and secondary database servers on EC2 instances across multiple Availability Zones. Use Amazon Elastic Block Store (Amazon EBS) Multi-Attach to create shared storage between the instances.

---

### Question-364
**Difficulty**: hard
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:performance:global-anycast-routing, architecture:ha:multi-region-design, architecture:ha:regional-failover, compute:containers:container-orchestration
**Tags**: global-accelerator, nlb, alb, ecs, fargate, route-53
**Quality**: 4/5 — Strong multi-constraint scenario (UDP protocol, low latency, rapid failover) requires understanding that NLB supports UDP while ALB does not, and that Global Accelerator provides better latency optimization than Route 53 failover; distractors are plausible but each violates a key requirement through protocol mismatch or suboptimal failover strategy.

A company runs an application that receives data from thousands of geographically dispersed remote devices that use UDP. The application processes the data immediately and sends a message back to the device if necessary. No data is stored.



The company needs a solution that minimizes latency for the data transmission from the devices. The solution also must provide rapid failover to another AWS Region.



Which solution will meet these requirements?

- [x] Use AWS Global Accelerator. Create a Network Load Balancer (NLB) in each of the two Regions as an endpoint. Create an Amazon Elastic Container Service (Amazon ECS) cluster with the Fargate launch type. Create an ECS service on the cluster. Set the ECS service as the target for the NLProcess the data in Amazon ECS.
- [ ] Configure an Amazon Route 53 failover routing policy. Create a Network Load Balancer (NLB) in each of the two Regions. Configure the NLB to invoke an AWS Lambda function to process the data.
- [ ] Use AWS Global Accelerator. Create an Application Load Balancer (ALB) in each of the two Regions as an endpoint. Create an Amazon Elastic Container Service (Amazon ECS) cluster with the Fargate launch type. Create an ECS service on the cluster. Set the ECS service as the target for the ALB. Process the data in Amazon ECS.
- [ ] Configure an Amazon Route 53 failover routing policy. Create an Application Load Balancer (ALB) in each of the two Regions. Create an Amazon Elastic Container Service (Amazon ECS) cluster with the Fargate launch type. Create an ECS service on the cluster. Set the ECS service as the target for the ALB. Process the data in Amazon ECS.

---

### Question-365
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:file:windows-vs-linux-file-systems, storage:performance:storage-durability-replication, architecture:ha:multi-az-design, architecture:migration:lift-and-shift
**Tags**: fsx, fsx-windows, ec2, elastic-load-balancer, rds, storage-gateway, efs
**Quality**: 4/5 — Tests understanding of Windows file share migration options with meaningful trade-offs between FSx for Windows (native SMB, HA across AZs), Storage Gateway (hybrid, not purely resilient), EFS (Linux-only), and RDS (wrong service type); scenario is clear and distractors are plausible but each fails on a specific requirement.

A solutions architect must migrate a Windows Internet Information Services (IIS) web application to AWS. The application currently relies on a file share hosted in the user's on-premises network-attached storage (NAS). The solutions architect has proposed migrating the IIS web servers to Amazon EC2 instances in multiple Availability Zones that are connected to the storage solution, and configuring an Elastic Load Balancer attached to the instances.



Which replacement to the on-premises file share is MOST resilient and durable?

- [x] Migrate the file share to Amazon FSx for Windows File Server.
- [ ] Migrate the file share to Amazon RDS.
- [ ] Migrate the file share to AWS Storage Gateway.
- [ ] Migrate the file share to Amazon Elastic File System (Amazon EFS).

---

### Question-368
**Difficulty**: medium
**Topics**: database:cost:on-demand-vs-provisioned, database:cost:serverless-database, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: aurora, aurora-serverless, rds, mysql, ec2, dynamodb
**Quality**: 4/5 — Well-crafted scenario with clear constraints (sporadic usage patterns, no database modifications, cost-effectiveness) that logically eliminates distractors: DynamoDB requires schema changes, RDS doesn't scale cost-effectively for sporadic workloads, EC2 requires manual management — Aurora Serverless uniquely combines MySQL compatibility with automatic scaling and pay-per-use pricing.

A company has a web application with sporadic usage patterns. There is heavy usage at the beginning of each month, moderate usage at the start of each week, and unpredictable usage during the week. The application consists of a web server and a MySQL database server running inside the data center. The company would like to move the application to the AWS Cloud, and needs to select a cost-effective database platform that will not require database modifications.



Which solution will meet these requirements?

- [x] MySQL-compatible Amazon Aurora Serverless
- [ ] Amazon DynamoDB
- [ ] Amazon RDS for MySQL
- [ ] MySQL deployed on Amazon EC2 in an Auto Scaling group

---

### Question-373
**Difficulty**: medium
**Topics**: network:performance:edge-acceleration-cdn, database:performance:read-vs-write-intensive, database:relational:read-replicas-usage, architecture:ha:multi-az-design
**Tags**: cloudfront, rds, s3
**Quality**: 3/5 — Tests basic AWS service selection for performance optimization, but the scenario lacks specificity (no traffic patterns, geographic distribution, or query mix details), and two distractors (Redshift for OLTP, S3 for dynamic content) are trivially eliminable by anyone with fundamental AWS knowledge.

A rapidly growing global ecommerce company is hosting its web application on AWS. The web application includes static content and dynamic content. The website stores online transaction processing (OLTP) data in an Amazon RDS database The website’s users are experiencing slow page loads.



Which combination of actions should a solutions architect take to resolve this issue? (Choose two.)

- [x] Set up an Amazon CloudFront distribution.
- [x] Create a read replica for the RDS DB instance.
- [ ] Configure an Amazon Redshift cluster.
- [ ] Host the dynamic web content in Amazon S3.
- [ ] Configure a Multi-AZ deployment for the RDS DB instance.

---

### Question-374
**Difficulty**: medium
**Topics**: compute:cost:compute-purchasing-options, compute:serverless:serverless-cost-optimization, network:connectivity:vpc-endpoints, network:architecture:vpc-design, architecture:ha:multi-az-design
**Tags**: ec2, lambda, vpc, compute-savings-plan, eni
**Quality**: 3/5 — Tests savings plan selection and Lambda-to-EC2 networking but lacks specificity on why Compute Savings Plan beats EC2 Instance Savings Plan (Lambda is included), and distractors are somewhat weak — public subnet option is instantly eliminable for private EC2 access, and service VPC option eliminates network access entirely.

A company uses Amazon EC2 instances and AWS Lambda functions to run its application. The company has VPCs with public subnets and private subnets in its AWS account. The EC2 instances run in a private subnet in one of the VPCs. The Lambda functions need direct network access to the EC2 instances for the application to work.



The application will run for at least 1 year. The company expects the number of Lambda functions that the application uses to increase during that time. The company wants to maximize its savings on all application resources and to keep network latency between the services low.



Which solution will meet these requirements?

- [x] Purchase a Compute Savings Plan. Optimize the Lambda functions’ duration and memory usage, the number of invocations, and the amount of data that is transferred. Connect the Lambda functions to the private subnet that contains the EC2 instances.
- [ ] Purchase an EC2 Instance Savings Plan Optimize the Lambda functions’ duration and memory usage and the number of invocations. Connect the Lambda functions to the private subnet that contains the EC2 instances.
- [ ] Purchase an EC2 Instance Savings Plan Optimize the Lambda functions' duration and memory usage, the number of invocations, and the amount of data that is transferred. Connect the Lambda functions to a public subnet in the same VPC where the EC2 instances run.
- [ ] Purchase a Compute Savings Plan. Optimize the Lambda functions’ duration and memory usage, the number of invocations, and the amount of data that is transferred. Keep the Lambda functions in the Lambda service VPC.

---

### Question-377
**Difficulty**: easy
**Topics**: cost:optimization:data-transfer-cost-reduction, network:connectivity:vpc-endpoints, storage:object:storage-access-patterns, architecture:ha:multi-az-design
**Tags**: s3, ec2, nat-gateway, vpc, vpc-endpoint
**Quality**: 3/5 — Tests basic AWS service recall (gateway VPC endpoint for S3) rather than architectural reasoning; distractors are trivially eliminable because NAT gateways don't reduce data transfer charges, NAT instances are costlier than gateways, and Dedicated Hosts are irrelevant to S3 access patterns.

A company runs a highly available image-processing application on Amazon EC2 instances in a single VPC. The EC2 instances run inside several subnets across multiple Availability Zones. The EC2 instances do not communicate with each other. However, the EC2 instances download images from Amazon S3 and upload images to Amazon S3 through a single NAT gateway. The company is concerned about data transfer charges.

What is the MOST cost-effective way for the company to avoid Regional data transfer charges?

- [x] Deploy a gateway VPC endpoint for Amazon S3.
- [ ] Launch the NAT gateway in each Availability Zone.
- [ ] Replace the NAT gateway with a NAT instance.
- [ ] Provision an EC2 Dedicated Host to run the EC2 instances.

---

### Question-378
**Difficulty**: medium
**Topics**: database:relational:multi-az-deployment, database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design, database:cost:on-demand-vs-provisioned
**Tags**: rds, postgresql
**Quality**: 4/5 — Clear scenario with specific constraints (HA, <40s failover, read offloading, cost optimization) that requires understanding RDS Multi-AZ DB cluster vs instance architecture; distractors are plausible and each fails on either failover timing, cost, or architectural fit, forcing careful evaluation of RDS deployment modes.

A company wants to use an Amazon RDS for PostgreSQL DB cluster to simplify time-consuming database administrative tasks for production database workloads. The company wants to ensure that its database is highly available and will provide automatic failover support in most scenarios in less than 40 seconds. The company wants to offload reads off of the primary instance and keep costs as low as possible.



Which solution will meet these requirements?

- [x] Use an Amazon RDS Multi-AZ DB cluster deployment Point the read workload to the reader endpoint.
- [ ] Use an Amazon RDS Multi-AZ DB instance deployment. Create one read replica and point the read workload to the read replica.
- [ ] Use an Amazon RDS Multi-AZ DB duster deployment Create two read replicas and point the read workload to the read replicas.
- [ ] Use an Amazon RDS Multi-AZ DB instance deployment. Point the read workload to the secondary instances in the Multi-AZ pair.

---

### Question-385
**Difficulty**: medium
**Topics**: compute:containers:when-to-containerize, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design, network:load-balancing:load-balancing-strategy, governance:automation:infrastructure-as-code
**Tags**: elastic-beanstalk, tomcat, mysql, rds, ec2, auto-scaling, load-balancer, lambda, elasticache
**Quality**: 3/5 — Tests basic AWS service selection for HA web applications but distractors are weak — Lambda doesn't support Tomcat applications, ElastiCache replaces caching not databases, and manual EC2+AMI approach works but ignores Beanstalk's automation — requiring more recall than multi-constraint reasoning.

A solutions architect is implementing a complex Java application with a MySQL database. The Java application must be deployed on Apache Tomcat and must be highly available.



What should the solutions architect do to meet these requirements?

- [x] Deploy the application by using AWS Elastic Beanstalk. Configure a load-balanced environment and a rolling deployment policy.
- [ ] Deploy the application in AWS Lambda. Configure an Amazon API Gateway API to connect with the Lambda functions.
- [ ] Migrate the database to Amazon ElastiCache. Configure the ElastiCache security group to allow access from the application.
- [ ] Launch an Amazon EC2 instance. Install a MySQL server on the EC2 instance. Configure the application on the server. Create an AMI. Use the AMI to create a launch template with an Auto Scaling group.

---

### Question-388
**Difficulty**: medium
**Topics**: network:connectivity:hybrid-network-connectivity, network:connectivity:direct-connect-hybrid, network:performance:bandwidth-allocation, cost:optimization:network-transfer-minimization, architecture:ha:multi-az-design
**Tags**: direct-connect, s3, vpn, snowball
**Quality**: 4/5 — Well-constructed scenario with clear constraints (time-sensitive backups, internet bandwidth limitations, minimal user impact) that logically favor Direct Connect; distractors are plausible but each fails a key requirement — VPN doesn't solve bandwidth, Snowball is asynchronous/daily, and support tickets cannot remove hard limits — requiring genuine understanding of connectivity trade-offs.

A company has an on-premises application that generates a large amount of time-sensitive data that is backed up to Amazon S3. The application has grown and there are user complaints about internet bandwidth limitations. A solutions architect needs to design a long-term solution that allows for both timely backups to Amazon S3 and with minimal impact on internet connectivity for internal users.

Which solution meets these requirements?

- [x] Establish a new AWS Direct Connect connection and direct backup traffic through this new connection.
- [ ] Establish AWS VPN connections and proxy all traffic through a VPC gateway endpoint.
- [ ] Order daily AWS Snowball devices. Load the data onto the Snowball devices and return the devices to AWS each day.
- [ ] Submit a support ticket through the AWS Management Console. Request the removal of S3 service limits from the account.

---

### Question-393
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, architecture:ha:multi-region-design, database:nosql:global-tables-replication, network:dns:failover-routing-policy, compute:scaling:auto-scaling-groups
**Tags**: ec2, auto-scaling, elastic-load-balancer, dynamodb, route-53, cloudwatch, lambda
**Quality**: 3/5 — Tests basic DR architecture patterns but distractors are weak — CloudFormation templates alone without pre-deployed infrastructure cause unacceptable downtime, and the CloudWatch/Lambda approach is overly complex compared to DNS failover, making the correct answer too obvious without requiring deep trade-off reasoning.

A company hosts its application in the AWS Cloud. The application runs on Amazon EC2 instances behind an Elastic Load Balancer in an Auto Scaling group and with an Amazon DynamoDB table. The company wants to ensure the application can be made available in anotherAWS Region with minimal downtime.



What should a solutions architect do to meet these requirements with the LEAST amount of downtime?

- [x] Create an Auto Scaling group and a load balancer in the disaster recovery Region. Configure the DynamoDB table as a global table. Configure DNS failover to point to the new disaster recovery Region's load balancer.
- [ ] Create an AWS CloudFormation template to create EC2 instances, load balancers, and DynamoDB tables to be launched when needed Configure DNS failover to point to the new disaster recovery Region's load balancer.
- [ ] Create an AWS CloudFormation template to create EC2 instances and a load balancer to be launched when needed. Configure the DynamoDB table as a global table. Configure DNS failover to point to the new disaster recovery Region's load balancer.
- [ ] Create an Auto Scaling group and load balancer in the disaster recovery Region. Configure the DynamoDB table as a global table. Create an Amazon CloudWatch alarm to trigger an AWS Lambda function that updates Amazon Route 53 pointing to the disaster recovery load balancer.

---

### Question-398
**Difficulty**: easy
**Topics**: network:architecture:vpc-design, network:architecture:cidr-block-planning, network:architecture:subnet-tiers-routing, architecture:ha:multi-az-design
**Tags**: vpc, ec2, cidr
**Quality**: 3/5 — Tests basic VPC expansion knowledge but lacks operational complexity — adding a CIDR block is a straightforward, well-documented procedure; the three distractors (VPC peering, Transit Gateway, Site-to-Site VPN) are plausible but instantly eliminable as they introduce unnecessary complexity for a simple IP shortage problem.

A solutions architect configured a VPC that has a small range of IP addresses. The number of Amazon EC2 instances that are in the VPC is increasing, and there is an insufficient number of IP addresses for future workloads.



Which solution resolves this issue with the LEAST operational overhead?

- [x] Add an additional IPv4 CIDR block to increase the number of IP addresses and create additional subnets in the VPC. Create new resources in the new subnets by using the new CIDR.
- [ ] Create a second VPC with additional subnets. Use a peering connection to connect the second VPC with the first VPC Update the routes and create new resources in the subnets of the second VPC.
- [ ] Use AWS Transit Gateway to add a transit gateway and connect a second VPC with the first VPUpdate the routes of the transit gateway and VPCs. Create new resources in the subnets of the second VPC.
- [ ] Create a second VPC. Create a Site-to-Site VPN connection between the first VPC and the second VPC by using a VPN-hosted solution on Amazon EC2 and a virtual private gateway. Update the route between VPCs to the traffic through the VPN. Create new resources in the subnets of the second VPC.

---

### Question-404
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment, architecture:resilience:redundancy-patterns
**Tags**: rds, ec2, auto-scaling, application-load-balancer
**Quality**: 3/5 — Tests basic HA patterns (Multi-AZ RDS, ASG across AZs) but the scenario lacks depth — no traffic patterns, cost constraints, or trade-offs to reason through; distractors are mostly weak (termination protection alone, Spot Instances with CloudWatch alarms, unnecessary Lambda/API Gateway complexity), making this more service-selection recall than architectural reasoning.

A company has hired a solutions architect to design a reliable architecture for its application. The application consists of one Amazon RDS DB instance and two manually provisioned Amazon EC2 instances that run web servers. The EC2 instances are located in a single Availability Zone.



An employee recently deleted the DB instance, and the application was unavailable for 24 hours as a result. The company is concerned with the overall reliability of its environment.



What should the solutions architect do to maximize reliability of the application's infrastructure?

- [x] Update the DB instance to be Multi-AZ, and enable deletion protection. Place the EC2 instances behind an Application Load Balancer, and run them in an EC2 Auto Scaling group across multiple Availability Zones.
- [ ] Delete one EC2 instance and enable termination protection on the other EC2 instance. Update the DB instance to be Multi-AZ, and enable deletion protection.
- [ ] Create an additional DB instance along with an Amazon API Gateway and an AWS Lambda function. Configure the application to invoke the Lambda function through API Gateway. Have the Lambda function write the data to the two DB instances.
- [ ] Place the EC2 instances in an EC2 Auto Scaling group that has multiple subnets located in multiple Availability Zones. Use Spot Instances instead of On-Demand Instances. Set up Amazon CloudWatch alarms to monitor the health of the instances Update the DB instance to be Multi-AZ, and enable deletion protection.

---

### Question-407
**Difficulty**: medium
**Topics**: architecture:ha:multi-region-design, architecture:ha:regional-failover, network:dns:health-check-routing, network:dns:failover-routing-policy, network:performance:latency-optimization
**Tags**: route-53, api-gateway, lambda, cloudfront
**Quality**: 3/5 — Tests Route 53 failover routing and multi-region design concepts, but the scenario lacks specifics about traffic patterns, failover requirements, or SLA targets; distractors are weak (CloudFront for APIs is suboptimal but not obviously wrong, transit gateway is clearly irrelevant, ALB cannot reach API Gateway endpoints cross-region effectively), and the active-active configuration is a standard pattern that doesn't require deep reasoning.

A company has a stateless web application that runs on AWS Lambda functions that are invoked by Amazon API Gateway. The company wants to deploy the application across multiple AWS Regions to provide Regional failover capabilities.



What should a solutions architect do to route traffic to multiple Regions?

- [x] Create Amazon Route 53 health checks for each Region. Use an active-active failover configuration.
- [ ] Create an Amazon CloudFront distribution with an origin for each Region. Use CloudFront health checks to route traffic.
- [ ] Create a transit gateway. Attach the transit gateway to the API Gateway endpoint in each Region. Configure the transit gateway to route requests.
- [ ] Create an Application Load Balancer in the primary Region. Set the target group to point to the API Gateway endpoint hostnames in each Region.

---

### Question-411
**Difficulty**: medium
**Topics**: network:architecture:multi-tier-network-design, architecture:ha:multi-az-design, security:network:security-group-design, database:relational:multi-az-deployment, compute:scaling:auto-scaling-groups
**Tags**: vpc, ec2, rds, elb, auto-scaling, security-groups
**Quality**: 4/5 — Well-structured scenario with clear multi-tier refactoring requirements; tests understanding of VPC topology, tier separation, load balancing, HA design, and security group isolation; distractors meaningfully violate specific requirements (wrong architecture preservation, single-AZ, improper access control).

A company has a three-tier web application that is in a single server. The company wants to migrate the application to the AWS Cloud. The company also wants the application to align with the AWS Well-Architected Framework and to be consistent with AWS recommended best practices for security, scalability, and resiliency.



Which combination of solutions will meet these requirements? (Choose three.)

- [x] Create a VPC across two Availability Zones. Refactor the application to host the web tier, application tier, and database tier. Host each tier on its own private subnet with Auto Scaling groups for the web tier and application tier.
- [x] Use Elastic Load Balancers in front of the web tier. Control access by using security groups containing references to each layer's security groups.
- [x] Use an Amazon RDS database Multi-AZ cluster deployment in private subnets. Allow database access only from application tier security groups.
- [ ] Create a VPC across two Availability Zones with the application's existing architecture. Host the application with existing architecture on an Amazon EC2 instance in a private subnet in each Availability Zone with EC2 Auto Scaling groups. Secure the EC2 instance with security groups and network access control lists (network ACLs).
- [ ] Set up security groups and network access control lists (network ACLs) to control access to the database layer. Set up a single Amazon RDS database in a private subnet.
- [ ] Use a single Amazon RDS database. Allow database access only from the application tier security group.

---

### Question-417
**Difficulty**: medium
**Topics**: storage:archival:backup-and-restore, storage:archival:backup-retention-policies, architecture:dr:disaster-recovery-strategies, architecture:ha:cross-region-replication, cost:optimization:storage-size-optimization
**Tags**: aws-backup, ec2, ebs, s3
**Quality**: 3/5 — Tests understanding of backup strategies and cost-effectiveness across regions, but distractors are weak — provisioning full EC2 instances as backup is obviously expensive, DataSync is for ongoing sync not backups, and manual snapshots require more operational work than AWS Backup; the scenario lacks traffic patterns or RTO/RPO requirements to justify the decision more rigorously.

A company runs applications on Amazon EC2 instances in one AWS Region. The company wants to back up the EC2 instances to a second Region. The company also wants to provision EC2 resources in the second Region and manage the EC2 instances centrally from one AWS account.



Which solution will meet these requirements MOST cost-effectively?

- [x] Create a backup plan by using AWS Backup. Configure cross-Region backup to the second Region for the EC2 instances.
- [ ] Create a disaster recovery (DR) plan that has a similar number of EC2 instances in the second Region. Configure data replication.
- [ ] Create point-in-time Amazon Elastic Block Store (Amazon EBS) snapshots of the EC2 instances. Copy the snapshots to the second Region periodically.
- [ ] Deploy a similar number of EC2 instances in the second Region. Use AWS DataSync to transfer the data from the source Region to the second Region.

---

### Question-423
**Difficulty**: hard
**Topics**: network:performance:latency-optimization, network:performance:global-anycast-routing, network:load-balancing:layer4-vs-layer7-balancing, architecture:ha:multi-region-design
**Tags**: global-accelerator, nlb, alb, ec2, auto-scaling, dynamodb, cloudfront
**Quality**: 4/5 — Strong multi-constraint scenario (global users, TCP+UDP traffic, lowest latency) requires understanding that NLB supports UDP while ALB does not, and that Global Accelerator with NLB (not CloudFront) provides the required protocol support and latency optimization; distractors are plausible but each fails on protocol or failover capability.

A company is developing a mobile gaming app in a single AWS Region. The app runs on multiple Amazon EC2 instances in an Auto Scaling group. The company stores the app data in Amazon DynamoDB. The app communicates by using TCP traffic and UDP traffic between the users and the servers. The application will be used globally. The company wants to ensure the lowest possible latency for all users.



Which solution will meet these requirements?

- [x] Use AWS Global Accelerator to create an accelerator. Create a Network Load Balancer (NLB) behind an accelerator endpoint that uses Global Accelerator integration and listening on the TCP and UDP ports. Update the Auto Scaling group to register instances on the NLB.
- [ ] Use AWS Global Accelerator to create an accelerator. Create an Application Load Balancer (ALB) behind an accelerator endpoint that uses Global Accelerator integration and listening on the TCP and UDP ports. Update the Auto Scaling group to register instances on the ALB.
- [ ] Create an Amazon CloudFront content delivery network (CDN) endpoint. Create a Network Load Balancer (NLB) behind the endpoint and listening on the TCP and UDP ports. Update the Auto Scaling group to register instances on the NLB. Update CloudFront to use the NLB as the origin.
- [ ] Create an Amazon CloudFront content delivery network (CDN) endpoint. Create an Application Load Balancer (ALB) behind the endpoint and listening on the TCP and UDP ports. Update the Auto Scaling group to register instances on the ALB. Update CloudFront to use the ALB as the origin.

---

### Question-426
**Difficulty**: easy
**Topics**: database:relational:multi-az-deployment, architecture:ha:multi-az-design, architecture:resilience:single-point-of-failure
**Tags**: rds, postgresql
**Quality**: 3/5 — Tests basic RDS Multi-AZ knowledge but lacks scenario depth — no traffic patterns, failover time requirements, or cost context provided; distractors are weak and easily eliminated by anyone familiar with RDS capabilities.

A company hosts an online shopping application that stores all orders in an Amazon RDS for PostgreSQL Single-AZ DB instance. Management wants to eliminate single points of failure and has asked a solutions architect to recommend an approach to minimize database downtime without requiring any changes to the application code.



Which solution meets these requirements?

- [x] Convert the existing database instance to a Multi-AZ deployment by modifying the database instance and specifying the Multi-AZ option.
- [ ] Create a new RDS Multi-AZ deployment. Take a snapshot of the current RDS instance and restore the new Multi-AZ deployment with the snapshot.
- [ ] Create a read-only replica of the PostgreSQL database in another Availability Zone. Use Amazon Route 53 weighted record sets to distribute requests across the databases.
- [ ] Place the RDS for PostgreSQL database in an Amazon EC2 Auto Scaling group with a minimum group size of two. Use Amazon Route 53 weighted record sets to distribute requests across instances.

---

### Question-427
**Difficulty**: medium
**Topics**: storage:block:multi-attach-volumes, storage:block:volume-type-selection, storage:block:iops-throughput-tuning, architecture:ha:multi-az-design
**Tags**: ebs, ec2, nitro
**Quality**: 3/5 — Tests understanding of EBS Multi-Attach capability and volume type selection, but distractors are weak — gp3, st1, and gp2 volumes do not support Multi-Attach at all, making them trivially eliminable without reasoning about the io2 volume's IOPS characteristics or Nitro instance compatibility.

A company is developing an application to support customer demands. The company wants to deploy the application on multiple Amazon EC2 Nitro-based instances within the same Availability Zone. The company also wants to give the application the ability to write to multiple block storage volumes in multiple EC2 Nitro-based instances simultaneously to achieve higher application availability.



Which solution will meet these requirements?

- [x] Use Provisioned IOPS SSD (io2) EBS volumes with Amazon Elastic Block Store (Amazon EBS) Multi-Attach
- [ ] Use General Purpose SSD (gp3) EBS volumes with Amazon Elastic Block Store (Amazon EBS) Multi-Attach
- [ ] Use Throughput Optimized HDD (st1) EBS volumes with Amazon Elastic Block Store (Amazon EBS) Multi-Attach
- [ ] Use General Purpose SSD (gp2) EBS volumes with Amazon Elastic Block Store (Amazon EBS) Multi-Attach

---

### Question-428
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy
**Tags**: ec2, rds, auto-scaling, application-load-balancer
**Quality**: 3/5 — Tests basic HA best practice (Multi-AZ + ALB + ASG) but scenario lacks detail (traffic patterns, regions, constraints), and distractors are weak — snapshots for HA, Route 53 latency without load balancing, and Route 53 as entry point without load balancer are trivially eliminable by anyone familiar with HA architecture.

A company designed a stateless two-tier application that uses Amazon EC2 in a single Availability Zone and an Amazon RDS Multi-AZ DB instance. New company management wants to ensure the application is highly available.



What should a solutions architect do to meet this requirement?

- [x] Configure the application to use Multi-AZ EC2 Auto Scaling and create an Application Load Balancer
- [ ] Configure the application to take snapshots of the EC2 instances and send them to a different AWS Region
- [ ] Configure the application to use Amazon Route 53 latency-based routing to feed requests to the application
- [ ] Configure Amazon Route 53 rules to handle incoming requests and create a Multi-AZ Application Load Balancer

---

### Question-432
**Difficulty**: easy
**Topics**: compute:cost:compute-purchasing-options, compute:cost:reserved-capacity-planning, architecture:ha:availability-zone-strategy
**Tags**: ec2, capacity-reservation, reserved-instances
**Quality**: 3/5 — Tests service-specific recall of On-Demand Capacity Reservation vs Reserved Instances, but distractors are weak — anyone knowing that Capacity Reservations (not Reserved Instances) guarantee availability in specific AZs can eliminate 2 of 4 options immediately without reasoning about the trade-offs or constraints.

A company needs guaranteed Amazon EC2 capacity in three specific Availability Zones in a specific AWS Region for an upcoming event that will last 1 week.

What should the company do to guarantee the EC2 capacity?

- [x] Create an On-Demand Capacity Reservation that specifies the Region and three Availability Zones needed.
- [ ] Purchase Reserved Instances that specify the Region needed.
- [ ] Create an On-Demand Capacity Reservation that specifies the Region needed.
- [ ] Purchase Reserved Instances that specify the Region and three Availability Zones needed.

---

### Question-437
**Difficulty**: medium
**Topics**: network:routing:transit-gateway-routing, network:architecture:hub-and-spoke-topology, architecture:ha:multi-region-design, network:connectivity:hybrid-network-connectivity
**Tags**: transit-gateway, vpc, vpc-peering
**Quality**: 4/5 — Clear multi-region connectivity scenario with explicit 'least administrative effort' constraint that strongly favors Transit Gateway over point-to-point VPC peering; distractors introduce plausible but suboptimal alternatives (Direct Connect for regional comms, PrivateLink for app-level access), requiring understanding of transit vs. access layer networking.

A company has multiple VPCs across AWS Regions to support and run workloads that are isolated from workloads in other Regions. Because of a recent application launch requirement, the company’s VPCs must communicate with all other VPCs across all Regions.



Which solution will meet these requirements with the LEAST amount of administrative effort?

- [x] Use AWS Transit Gateway to manage VPC communication in a single Region and Transit Gateway peering across Regions to manage VPC communications.
- [ ] Use VPC peering to manage VPC communication in a single Region. Use VPC peering across Regions to manage VPC communications.
- [ ] Use AWS Direct Connect gateways across all Regions to connect VPCs across regions and manage VPC communications.
- [ ] Use AWS PrivateLink across all Regions to connect VPCs across Regions and manage VPC communications

---

### Question-438
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:performance:storage-durability-replication, architecture:dr:recovery-point-objective, architecture:ha:multi-az-design, storage:file:cross-az-file-access
**Tags**: efs, fsx, aws-backup, ecs, disaster-recovery
**Quality**: 3/5 — Tests basic knowledge of file system options and their availability characteristics, but the scenario lacks depth—no guidance on workload patterns, performance requirements, or why AWS Backup is specifically mentioned; distractors are plausible (all are shared file systems) but elimination relies mainly on service-specific recall rather than architectural reasoning.

A company is designing a containerized application that will use Amazon Elastic Container Service (Amazon ECS). The application needs to access a shared file system that is highly durable and can recover data to another AWS Region with a recovery point objective (RPO) of 8 hours. The file system needs to provide a mount target m each Availability Zone within a Region.



A solutions architect wants to use AWS Backup to manage the replication to another Region.



Which solution will meet these requirements?

- [x] Amazon Elastic File System (Amazon EFS) with the Standard storage class
- [ ] Amazon FSx for Windows File Server with a Multi-AZ deployment
- [ ] Amazon FSx for NetApp ONTAP with a Multi-AZ deployment
- [ ] Amazon FSx for OpenZFS

---

### Question-443
**Difficulty**: easy
**Topics**: storage:performance:storage-performance-optimization, storage:file:shared-file-system-design, architecture:ha:multi-az-design, storage:performance:storage-durability-replication
**Tags**: ec2, instance-store, efs, elasticache, s3, glacier
**Quality**: 2/5 — Tests basic service characteristics but distractors are trivially eliminable — ElastiCache is for caching (not durability), larger instance store worsens the problem, and Glacier Deep Archive lacks high availability — requiring minimal architectural reasoning beyond service-name recall.

A company's website uses an Amazon EC2 instance store for its catalog of items. The company wants to make sure that the catalog is highly available and that the catalog is stored in a durable location.

What should a solutions architect do to meet these requirements?

- [x] Move the catalog to an Amazon Elastic File System (Amazon EFS) file system.
- [ ] Move the catalog to Amazon ElastiCache for Redis.
- [ ] Deploy a larger EC2 instance with a larger instance store.
- [ ] Move the catalog from the instance store to Amazon S3 Glacier Deep Archive.

---

### Question-451
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:file:nfs-vs-smb-protocols, architecture:ha:multi-az-design, network:connectivity:hybrid-network-connectivity
**Tags**: efs, ebs, fsx, ec2, vpn
**Quality**: 4/5 — Clear multi-constraint scenario (HA, scalable, file system, multiple Linux instances, on-premises access, no minimum size) with plausible distractors that each violate exactly one requirement—EBS Multi-Attach lacks native protocol/on-premises access, FSx requires minimum size, single mount target lacks HA—forcing candidates to reason through EFS's unique combination of mount targets for HA and protocol compatibility.

A company seeks a storage solution for its application. The solution must be highly available and scalable. The solution also must function as a file system be mountable by multiple Linux instances in AWS and on premises through native protocols, and have no minimum size requirements. The company has set up a Site-to-Site VPN for access from its on-premises network to its VPC.



Which storage solution meets these requirements?

- [x] Amazon Elastic File System (Amazon EFS) with multiple mount targets
- [ ] Amazon FSx Multi-AZ deployments
- [ ] Amazon Elastic Block Store (Amazon EBS) Multi-Attach volumes
- [ ] Amazon Elastic File System (Amazon EFS) with a single mount target and multiple access points

---

### Question-465
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:performance:storage-durability-replication, architecture:ha:multi-az-design, architecture:patterns:loose-coupling-design
**Tags**: ec2, ebs, efs, alb
**Quality**: 4/5 — Clear scenario with a well-defined problem (data inconsistency across AZs) that requires understanding the difference between EBS (instance-local) and EFS (shared filesystem); distractors are plausible but each fails to address the root cause of seeing different document subsets on different instances.

A company is hosting a web application on AWS using a single Amazon EC2 instance that stores user-uploaded documents in an Amazon EBS volume. For better scalability and availability, the company duplicated the architecture and created a second EC2 instance and EBS volume in another Availability Zone, placing both behind an Application Load Balancer. After completing this change, users reported that, each time they refreshed the website, they could see one subset of their documents or the other, but never all of the documents at the same time.

What should a solutions architect propose to ensure users see all of their documents at once?

- [x] Copy the data from both EBS volumes to Amazon EFS. Modify the application to save new documents to Amazon EFS
- [ ] Copy the data so both EBS volumes contain all the documents
- [ ] Configure the Application Load Balancer to direct a user to the server with the documents
- [ ] Configure the Application Load Balancer to send the request to both servers. Return each document from the correct server

---

### Question-469
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:multi-region-design, compute:scaling:auto-scaling-groups, storage:file:shared-file-system-design, network:load-balancing:load-balancing-strategy, network:performance:content-delivery-strategy
**Tags**: ec2, aurora, ebs, efs, elb, auto-scaling, ami, cloudfront
**Quality**: 3/5 — Tests multi-service architectural pattern (EFS for shared storage, Auto Scaling + ALB + AMI for HA) but distractors are weak — S3 as mounted filesystem and NFS from primary instance are trivially eliminable; Global Accelerator distractor is somewhat plausible but question provides insufficient regional context to make the distinction clear.

A company runs a website that uses a content management system (CMS) on Amazon EC2. The CMS runs on a single EC2 instance and uses an Amazon Aurora MySQL Multi-AZ DB instance for the data tier. Website images are stored on an Amazon Elastic Block Store (Amazon EBS) volume that is mounted inside the EC2 instance.



Which combination of actions should a solutions architect take to improve the performance and resilience of the website? (Choose two.)

- [x] Move the website images onto an Amazon Elastic File System (Amazon EFS) file system that is mounted on every EC2 instance.
- [x] Create an Amazon Machine Image (AMI) from the existing EC2 instance. Use the AMI to provision new instances behind an Application Load Balancer as part of an Auto Scaling group. Configure the Auto Scaling group to maintain a minimum of two instances. Configure an Amazon CloudFront distribution for the website.
- [ ] Move the website images into an Amazon S3 bucket that is mounted on every EC2 instance
- [ ] Share the website images by using an NFS share from the primary EC2 instance. Mount this share on the other EC2 instances.
- [ ] Create an Amazon Machine Image (AMI) from the existing EC2 instance. Use the AMI to provision new instances behind an Application Load Balancer as part of an Auto Scaling group. Configure the Auto Scaling group to maintain a minimum of two instances. Configure an accelerator in AWS Global Accelerator for the website

---

### Question-471
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, network:routing:transit-gateway-routing, architecture:ha:multi-region-design, network:architecture:hub-and-spoke-topology
**Tags**: transit-gateway, vpc, aws-account
**Quality**: 4/5 — Clear multi-account VPC connectivity scenario with operational efficiency constraint; correct answer (Transit Gateway) is the only scalable hub-and-spoke solution for hundreds of accounts, while distractors are eliminable (VPC peering doesn't scale, NAT gateways through internet is insecure, VPN gateways with transit VPC is outdated and operationally complex).

A company needs to connect several VPCs in the us-east-1 Region that span hundreds of AWS accounts. The company's networking team has its own AWS account to manage the cloud network.



What is the MOST operationally efficient solution to connect the VPCs?

- [x] Create an AWS Transit Gateway in the networking team’s AWS account. Configure static routes from each VPC.
- [ ] Set up VPC peering connections between each VPC. Update each associated subnet’s route table
- [ ] Configure a NAT gateway and an internet gateway in each VPC to connect each VPC through the internet
- [ ] Deploy VPN gateways in each VPC. Create a transit VPC in the networking team’s AWS account to connect to each VPC.

---

### Question-474
**Difficulty**: medium
**Topics**: database:nosql:global-tables-replication, database:nosql:consistency-models, architecture:ha:multi-region-design, architecture:ha:global-load-distribution
**Tags**: dynamodb, dynamodb-global-tables, aurora, rds, aurora-serverless
**Quality**: 4/5 — Strong scenario with clear multi-region, consistency, and latency constraints that eliminates three distractors logically: Aurora Read Replicas have replication lag exceeding 1 second, RDS read replicas cannot meet sub-1-second update consistency, and Aurora Serverless with manual Lambda synchronization violates the 'single primary' and consistency requirement—only DynamoDB global tables meet all constraints.

A company has a web application for travel ticketing. The application is based on a database that runs in a single data center in North America. The company wants to expand the application to serve a global user base. The company needs to deploy the application to multiple AWS Regions. Average latency must be less than 1 second on updates to the reservation database.



The company wants to have separate deployments of its web platform across multiple Regions. However, the company must maintain a single primary reservation database that is globally consistent.



Which solution should a solutions architect recommend to meet these requirements?

- [x] Convert the application to use Amazon DynamoDB. Use a global table for the center reservation table. Use the correct Regional endpoint in each Regional deployment.
- [ ] Migrate the database to an Amazon Aurora MySQL database. Deploy Aurora Read Replicas in each Region. Use the correct Regional endpoint in each Regional deployment for access to the database.
- [ ] Migrate the database to an Amazon RDS for MySQL database. Deploy MySQL read replicas in each Region. Use the correct Regional endpoint in each Regional deployment for access to the database.
- [ ] Migrate the application to an Amazon Aurora Serverless database. Deploy instances of the database to each Region. Use the correct Regional endpoint in each Regional deployment to access the database. Use AWS Lambda functions to process event streams in each Region to synchronize the databases.

---

### Question-478
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, network:routing:vpc-peering, security:network:security-group-design, architecture:ha:multi-region-design
**Tags**: vpc, vpc-peering, security-group, route-table
**Quality**: 3/5 — Tests understanding of cross-region VPC connectivity and security group configuration, but distractors are somewhat weak — options 2 and 4 are easily eliminable (wrong security group placement, transit gateway unnecessary for two VPCs), and the scenario lacks traffic volume or latency constraints that might justify alternative designs.

A global marketing company has applications that run in the ap-southeast-2 Region and the eu-west-1 Region. Applications that run in a VPC in eu-west-1 need to communicate securely with databases that run in a VPC in ap-southeast-2.



Which network design will meet these requirements?

- [x] Configure a VPC peering connection between the ap-southeast-2 VPC and the eu-west-1 VPUpdate the subnet route tables. Create an inbound rule in the ap-southeast-2 database security group that allows traffic from the eu-west-1 application server IP addresses.
- [ ] Create a VPC peering connection between the eu-west-1 VPC and the ap-southeast-2 VPC. Create an inbound rule in the eu-west-1 application security group that allows traffic from the database server IP addresses in the ap-southeast-2 security group.
- [ ] Configure a VPC peering connection between the ap-southeast-2 VPC and the eu-west-1 VPC. Update the subnet route tables. Create an inbound rule in the ap-southeast-2 database security group that references the security group ID of the application servers in eu-west-1.
- [ ] Create a transit gateway with a peering attachment between the eu-west-1 VPC and the ap-southeast-2 VPC. After the transit gateways are properly peered and routing is configured, create an inbound rule in the database security group that references the security group ID of the application servers in eu-west-1.

---

### Question-481
**Difficulty**: medium
**Topics**: compute:serverless:event-driven-architectures, compute:serverless:serverless-cost-optimization, storage:object:event-notification-triggers, architecture:ha:multi-az-design, architecture:patterns:loose-coupling-design
**Tags**: s3, lambda, cloudfront, step-functions, rds, ecs, sqs, ec2
**Quality**: 3/5 — Tests basic service selection for image processing and storage, but distractors are weak — RDS for image storage is obviously incorrect, EC2-based resizing contradicts scalability/unpredictable traffic requirements, and SQS+EC2 requires manual scaling — limiting the reasoning depth required.

A social media company wants to allow its users to upload images in an application that is hosted in the AWS Cloud. The company needs a solution that automatically resizes the images so that the images can be displayed on multiple device types. The application experiences unpredictable traffic patterns throughout the day. The company is seeking a highly available solution that maximizes scalability.



What should a solutions architect do to meet these requirements?

- [x] Create a static website hosted in Amazon S3 that invokes AWS Lambda functions to resize the images and store the images in an Amazon S3 bucket.
- [ ] Create a static website hosted in Amazon CloudFront that invokes AWS Step Functions to resize the images and store the images in an Amazon RDS database.
- [ ] Create a dynamic website hosted on a web server that runs on an Amazon EC2 instance. Configure a process that runs on the EC2 instance to resize the images and store the images in an Amazon S3 bucket.
- [ ] Create a dynamic website hosted on an automatically scaling Amazon Elastic Container Service (Amazon ECS) cluster that creates a resize job in Amazon Simple Queue Service (Amazon SQS). Set up an image-resizing program that runs on an Amazon EC2 instance to process the resize jobs.

---

### Question-482
**Difficulty**: medium
**Topics**: compute:containers:container-orchestration, network:connectivity:vpc-endpoints, security:network:network-segmentation-strategies, architecture:ha:multi-az-design
**Tags**: eks, ec2, vpc, vpc-endpoints, kubernetes
**Quality**: 4/5 — Well-structured scenario with clear constraints (private control plane, private data plane) that directly leads to the correct answer (VPC endpoints for private connectivity); distractors are plausible but each misses a key requirement — IAM is secondary, public subnets violate compliance, and security groups alone don't solve private access.

A company is running a microservices application on Amazon EC2 instances. The company wants to migrate the application to an Amazon Elastic Kubernetes Service (Amazon EKS) cluster for scalability. The company must configure the Amazon EKS control plane with endpoint private access set to true and endpoint public access set to false to maintain security compliance. The company must also put the data plane in private subnets. However, the company has received error notifications because the node cannot join the cluster.



Which solution will allow the node to join the cluster?

- [x] Create interface VPC endpoints to allow nodes to access the control plane.
- [ ] Grant the required permission in AWS Identity and Access Management (IAM) to the AmazonEKSNodeRole IAM role.
- [ ] Recreate nodes in the public subnet. Restrict security groups for EC2 nodes.
- [ ] Allow outbound traffic in the security group of the nodes.

---

### Question-484
**Difficulty**: medium
**Topics**: compute:serverless:cold-start-optimization, compute:serverless:function-concurrency-limits, integration:api:api-throttling-rate-limiting, architecture:ha:multi-az-design
**Tags**: api-gateway, lambda, provisioned-concurrency
**Quality**: 3/5 — Tests understanding of serverless scaling and concurrency options, but the scenario lacks specificity about traffic volume, regional requirements, or cost constraints, and the distinction between provisioned vs reserved concurrency is somewhat narrow and could be stronger as a differentiator.

A company provides an API interface to customers so the customers can retrieve their financial information. Еhe company expects a larger number of requests during peak usage times of the year.



The company requires the API to respond consistently with low latency to ensure customer satisfaction. The company needs to provide a compute host for the API.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Use Amazon API Gateway and AWS Lambda functions with provisioned concurrency.
- [ ] Use an Application Load Balancer and Amazon Elastic Container Service (Amazon ECS).
- [ ] Use an Application Load Balancer and an Amazon Elastic Kubernetes Service (Amazon EKS) cluster.
- [ ] Use Amazon API Gateway and AWS Lambda functions with reserved concurrency.

---

### Question-488
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, storage:file:shared-file-system-design, architecture:migration:lift-and-shift
**Tags**: ec2, efs, auto-scaling, s3, ecs, ebs, eks
**Quality**: 3/5 — Tests understanding of file system vs object storage and HA compute patterns, but distractors are weak — EBS doesn't scale across instances without custom setup, ECS/EKS with S3 lacks native file system semantics, making the correct answer obvious without deep architectural reasoning.

A company wants to migrate its on-premises application to AWS. The application produces output files that vary in size from tens of gigabytes to hundreds of terabytes. The application data must be stored in a standard file system structure. The company wants a solution that scales automatically. is highly available, and requires minimum operational overhead.

Which solution will meet these requirements?

- [x] Migrate the application to Amazon EC2 instances in a Multi-AZ Auto Scaling group. Use Amazon Elastic File System (Amazon EFS) for storage.
- [ ] Migrate the application to run as containers on Amazon Elastic Container Service (Amazon ECS). Use Amazon S3 for storage.
- [ ] Migrate the application to run as containers on Amazon Elastic Kubernetes Service (Amazon EKS). Use Amazon Elastic Block Store (Amazon EBS) for storage.
- [ ] Migrate the application to Amazon EC2 instances in a Multi-AZ Auto Scaling group. Use Amazon Elastic Block Store (Amazon EBS) for storage.

---

### Question-491
**Difficulty**: easy
**Topics**: compute:scaling:horizontal-scaling, compute:containers:container-orchestration, architecture:ha:multi-az-design
**Tags**: eks, kubernetes, kubernetes-metrics-server, kubernetes-cluster-autoscaler
**Quality**: 3/5 — Tests basic EKS autoscaling service selection with weak distractors — Lambda, API Gateway, and App Mesh are obviously irrelevant to pod/node scaling; the question requires only recalling the two standard Kubernetes scaling components without reasoning about trade-offs or constraints.

A company runs container applications by using Amazon Elastic Kubernetes Service (Amazon EKS). The company's workload is not consistent throughout the day. The company wants Amazon EKS to scale in and out according to the workload.



Which combination of steps will meet these requirements with the LEAST operational overhead? (Choose two.)

- [x] Use the Kubernetes Metrics Server to activate horizontal pod autoscaling.
- [x] Use the Kubernetes Cluster Autoscaler to manage the number of nodes in the cluster.
- [ ] Use an AWS Lambda function to resize the EKS cluster.
- [ ] Use Amazon API Gateway and connect it to Amazon EKS.
- [ ] Use AWS App Mesh to observe network activity.

---

### Question-495
**Difficulty**: medium
**Topics**: database:relational:connection-pooling-proxies, database:relational:database-connections-proxies, architecture:resilience:fault-tolerance-design, architecture:ha:multi-az-design
**Tags**: rds-proxy, aurora, rds
**Quality**: 4/5 — Well-structured scenario with a clear operational constraint (3 minutes downtime during failover) and a specific goal (least operational overhead); the correct answer leverages RDS Proxy's connection pooling to mask failover events, while distractors offer suboptimal trade-offs (read replicas don't help writers, secondary clusters add complexity, ElastiCache doesn't solve the core problem) — requires understanding how connection pooling mitigates failover impact.

A solutions architect is reviewing the resilience of an application. The solutions architect notices that a database administrator recently failed over the application's Amazon Aurora PostgreSQL database writer instance as part of a scaling exercise. The failover resulted in 3 minutes of downtime for the application.



Which solution will reduce the downtime for scaling exercises with the LEAST operational overhead?

- [x] Set up an Amazon RDS proxy for the database. Update the application to use the proxy endpoint.
- [ ] Create more Aurora PostgreSQL read replicas in the cluster to handle the load during failover.
- [ ] Set up a secondary Aurora PostgreSQL cluster in the same AWS Region. During failover, update the application to use the secondary cluster's writer endpoint.
- [ ] Create an Amazon ElastiCache for Memcached cluster to handle the load during failover.

---

### Question-496
**Difficulty**: medium
**Topics**: architecture:ha:multi-region-design, architecture:ha:regional-failover, architecture:dr:disaster-recovery-strategies, database:relational:database-replication-strategies, network:dns:failover-routing-policy
**Tags**: ec2, auto-scaling, elb, aurora, route-53, rds
**Quality**: 3/5 — Tests multi-region HA design and database replication strategies, but the correct answer is too obvious — Aurora global database is explicitly mentioned in the scenario, and promoting secondary to primary is standard, making the other options trivially eliminable; limited reasoning depth required.

A company has a regional subscription-based streaming service that runs in a single AWS Region. The architecture consists of web servers and application servers on Amazon EC2 instances. The EC2 instances are in Auto Scaling groups behind Elastic Load Balancers. The architecture includes an Amazon Aurora global database cluster that extends across multiple Availability Zones.



The company wants to expand globally and to ensure that its application has minimal downtime.



Which solution will provide the MOST fault tolerance?

- [x] Deploy the web tier and the application tier to a second Region. Use an Amazon Aurora global database to deploy the database in the primary Region and the second Region. Use Amazon Route 53 health checks with a failover routing policy to the second Region. Promote the secondary to primary as needed.
- [ ] Extend the Auto Scaling groups for the web tier and the application tier to deploy instances in Availability Zones in a second Region. Use an Aurora global database to deploy the database in the primary Region and the second Region. Use Amazon Route 53 health checks with a failover routing policy to the second Region.
- [ ] Deploy the web tier and the application tier to a second Region. Add an Aurora PostgreSQL cross-Region Aurora Replica in the second Region. Use Amazon Route 53 health checks with a failover routing policy to the second Region. Promote the secondary to primary as needed.
- [ ] Deploy the web tier and the application tier to a second Region. Create an Aurora PostgreSQL database in the second Region. Use AWS Database Migration Service (AWS DMS) to replicate the primary database to the second Region. Use Amazon Route 53 health checks with a failover routing policy to the second Region.

---

### Question-500
**Difficulty**: medium
**Topics**: network:performance:global-anycast-routing, network:performance:latency-optimization, network:load-balancing:layer4-vs-layer7-balancing, architecture:ha:multi-region-design
**Tags**: global-accelerator, nlb, route-53, cloudfront
**Quality**: 4/5 — Well-constructed scenario with clear multi-region latency requirement and TCP/UDP protocol constraint; Global Accelerator is the correct choice for both protocols and automated failover, while CloudFront (HTTP/HTTPS only) and ALBs (TCP/HTTP only) are plausible but correctly eliminable distractors; Route 53 latency routing alone lacks automated failover capability.

A company has an online gaming application that has TCP and UDP multiplayer gaming capabilities. The company uses Amazon Route 53 to point the application traffic to multiple Network Load Balancers (NLBs) in different AWS Regions. The company needs to improve application performance and decrease latency for the online game in preparation for user growth.



Which solution will meet these requirements?

- [x] Add AWS Global Accelerator in front of the NLBs. Configure a Global Accelerator endpoint to use the correct listener ports.
- [ ] Add an Amazon CloudFront distribution in front of the NLBs. Increase the Cache-Control max-age parameter.
- [ ] Replace the NLBs with Application Load Balancers (ALBs). Configure Route 53 to use latency-based routing.
- [ ] Add an Amazon API Gateway endpoint behind the NLBs. Enable API caching. Override method caching for the different stages.

---

### Question-506
**Difficulty**: medium
**Topics**: database:relational:multi-az-deployment, database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design, cost:optimization:reserved-capacity-planning
**Tags**: rds, postgresql, multi-az
**Quality**: 3/5 — Tests understanding of RDS Multi-AZ cluster deployments with readable standbys and cost-effective HA design, but the distractors lack strong plausibility — scaling the production DB is clearly wrong, a larger secondary is not cost-effective, and two additional read replicas on top of Multi-AZ is wasteful — allowing quick elimination without deep reasoning about architecture trade-offs.

A company wants to provide data scientists with near real-time read-only access to the company's production Amazon RDS for PostgreSQL database. The database is currently configured as a Single-AZ database. The data scientists use complex queries that will not affect the production database. The company needs a solution that is highly available.



Which solution will meet these requirements MOST cost-effectively?

- [x] Change the setup from a Single-AZ to a Multi-AZ cluster deployment with two readable standby instances. Provide read endpoints to the data scientists.
- [ ] Scale the existing production database in a maintenance window to provide enough power for the data scientists.
- [ ] Change the setup from a Single-AZ to a Multi-AZ instance deployment with a larger secondary standby instance. Provide the data scientists access to the secondary instance.
- [ ] Change the setup from a Single-AZ to a Multi-AZ instance deployment. Provide two additional read replicas for the data scientists.

---

### Question-507
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment, database:caching:in-memory-caching, architecture:patterns:stateless-vs-stateful-workloads
**Tags**: rds, elasticache, ec2, auto-scaling, alb, redis, memcached
**Quality**: 3/5 — Tests multi-service architecture selection but distractors are weak — the Memcached vs Redis distinction is the only meaningful trade-off, DynamoDB answer is easily eliminated for being a schema mismatch, and single-AZ RDS is trivially wrong given explicit HA requirement; lacks depth on session state persistence and caching strategy reasoning.

A company runs a three-tier web application in the AWS Cloud that operates across three Availability Zones. The application architecture has an Application Load Balancer, an Amazon EC2 web server that hosts user session states, and a MySQL database that runs on an EC2 instance. The company expects sudden increases in application traffic. The company wants to be able to scale to meet future application capacity demands and to ensure high availability across all three Availability Zones.



Which solution will meet these requirements?

- [x] Migrate the MySQL database to Amazon RDS for MySQL with a Multi-AZ DB cluster deployment. Use Amazon ElastiCache for Redis with high availability to store session data and to cache reads. Migrate the web server to an Auto Scaling group that is in three Availability Zones.
- [ ] Migrate the MySQL database to Amazon RDS for MySQL with a Multi-AZ DB cluster deployment. Use Amazon ElastiCache for Memcached with high availability to store session data and to cache reads. Migrate the web server to an Auto Scaling group that is in three Availability Zones.
- [ ] Migrate the MySQL database to Amazon DynamoDB Use DynamoDB Accelerator (DAX) to cache reads. Store the session data in DynamoDB. Migrate the web server to an Auto Scaling group that is in three Availability Zones.
- [ ] Migrate the MySQL database to Amazon RDS for MySQL in a single Availability Zone. Use Amazon ElastiCache for Redis with high availability to store session data and to cache reads. Migrate the web server to an Auto Scaling group that is in three Availability Zones.

---

### Question-510
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:file:windows-vs-linux-file-systems, architecture:ha:multi-az-design, storage:performance:storage-durability-replication
**Tags**: fsx, ec2, windows, file-server
**Quality**: 3/5 — Tests basic AWS service selection for Windows file shares, but distractors are weak — S3 fundamentally changes access patterns, EFS is for Linux/NFS, and S3 File Gateway is unnecessarily complex; scenario lacks details on scale, performance requirements, or cost sensitivity that would deepen reasoning.

A company runs multiple Windows workloads on AWS. The company's employees use Windows file shares that are hosted on two Amazon EC2 instances. The file shares synchronize data between themselves and maintain duplicate copies. The company wants a highly available and durable storage solution that preserves how users currently access the files.

What should a solutions architect do to meet these requirements?

- [x] Extend the file share environment to Amazon FSx for Windows File Server with a Multi-AZ configuration. Migrate all the data to FSx for Windows File Server.
- [ ] Migrate all the data to Amazon S3. Set up IAM authentication for users to access files.
- [ ] Set up an Amazon S3 File Gateway. Mount the S3 File Gateway on the existing EC2 instances.
- [ ] Extend the file share environment to Amazon Elastic File System (Amazon EFS) with a Multi-AZ configuration. Migrate all the data to Amazon EFS.

---

### Question-511
**Difficulty**: medium
**Topics**: database:relational:multi-az-deployment, database:relational:read-replicas-usage, architecture:ha:multi-az-design
**Tags**: rds, aurora, oracle, dms
**Quality**: 3/5 — Tests understanding of RDS deployment options and read replica patterns, but the scenario lacks specificity on traffic patterns, reporting volume, and Oracle-to-Aurora migration complexity; distractors are somewhat weak (Single-AZ is immediately eliminable, DMS multi-region is overcomplicated for stated requirements), and the question doesn't fully justify why Aurora Multi-AZ is superior to Oracle Multi-AZ beyond service recall.

A company has an on-premises server that uses an Oracle database to process and store customer information. The company wants to use an AWS database service to achieve higher availability and to improve application performance. The company also wants to offload reporting from its primary database system.



Which solution will meet these requirements in the MOST operationally efficient way?

- [x] Use Amazon RDS deployed in a Multi-AZ instance deployment to create an Amazon Aurora database. Direct the reporting functions to the reader instances.
- [ ] Use AWS Database Migration Service (AWS DMS) to create an Amazon RDS DB instance in multiple AWS Regions. Point the reporting functions toward a separate DB instance from the primary DB instance.
- [ ] Use Amazon RDS in a Single-AZ deployment to create an Oracle database. Create a read replica in the same zone as the primary DB instance. Direct the reporting functions to the read replica.
- [ ] Use Amazon RDS deployed in a Multi-AZ cluster deployment to create an Oracle database. Direct the reporting functions to use the reader instance in the cluster deployment.

---

### Question-516
**Difficulty**: easy
**Topics**: network:dns:failover-routing-policy, architecture:ha:regional-failover, network:load-balancing:health-check-configuration
**Tags**: route-53, alb, s3, health-check
**Quality**: 3/5 — Tests basic Route 53 failover configuration but distractors are weak — latency routing and multivalue answer routing are trivially eliminable for a failover scenario, and active-active configuration is contradictory to the failover requirement, making the question more about service-name recall than architectural reasoning.

A company wants to direct its users to a backup static error page if the company's primary website is unavailable. The primary website's DNS records are hosted in Amazon Route 53. The domain is pointing to an Application Load Balancer (ALB). The company needs a solution that minimizes changes and infrastructure overhead.



Which solution will meet these requirements?

- [x] Set up a Route 53 active-passive failover configuration. Direct traffic to a static error page that is hosted in an Amazon S3 bucket when Route 53 health checks determine that the ALB endpoint is unhealthy.
- [ ] Update the Route 53 records to use a latency routing policy. Add a static error page that is hosted in an Amazon S3 bucket to the records so that the traffic is sent to the most responsive endpoints.
- [ ] Set up a Route 53 active-active configuration with the ALB and an Amazon EC2 instance that hosts a static error page as endpoints. Configure Route 53 to send requests to the instance only if the health checks fail for the ALB.
- [ ] Update the Route 53 records to use a multivalue answer routing policy. Create a health check. Direct traffic to the website if the health check passes. Direct traffic to a static error page that is hosted in Amazon S3 if the health check does not pass.

---

### Question-520
**Difficulty**: easy
**Topics**: network:connectivity:nat-gateway-design, network:architecture:multi-tier-network-design, security:network:public-private-subnets, architecture:ha:multi-az-design
**Tags**: vpc, nat-gateway, ec2, rds, application-load-balancer
**Quality**: 3/5 — Tests basic NAT gateway knowledge for private subnet internet access, but distractors are weak — NAT instances are outdated, internet gateways expose private resources, and virtual private gateways are for on-premises connectivity — any AWS fundamentals knowledge eliminates them trivially without architectural reasoning.

A company has created a multi-tier application for its ecommerce website. The website uses an Application Load Balancer that resides in the public subnets, a web tier in the public subnets, and a MySQL cluster hosted on Amazon EC2 instances in the private subnets. The MySQL database needs to retrieve product catalog and pricing information that is hosted on the internet by a third-party provider. A solutions architect must devise a strategy that maximizes security without increasing operational overhead.



What should the solutions architect do to meet these requirements?

- [x] Deploy a NAT gateway in the public subnets. Modify the private subnet route table to direct all internet-bound traffic to the NAT gateway.
- [ ] Deploy a NAT instance in the VPC. Route all the internet-based traffic through the NAT instance.
- [ ] Configure an internet gateway and attach it to the VPModify the private subnet route table to direct internet-bound traffic to the internet gateway.
- [ ] Configure a virtual private gateway and attach it to the VPC. Modify the private subnet route table to direct internet-bound traffic to the virtual private gateway.

---

### Question-539
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:file:nfs-vs-smb-protocols, storage:performance:storage-performance-optimization, architecture:ha:multi-az-design
**Tags**: efs, ec2, vpc
**Quality**: 3/5 — Tests basic AWS service selection for shared file storage; the correct answer (EFS) is the only option supporting concurrent read/write access across multiple instances, but distractors are trivially eliminable — S3 is object storage, EBS cannot be attached to multiple instances (except io2 multi-attach, which is rarely used), and manual synchronization is impractical.

A company runs multiple Amazon EC2 Linux instances in a VPC across two Availability Zones. The instances host applications that use a hierarchical directory structure. The applications need to read and write rapidly and concurrently to shared storage.



What should a solutions architect do to meet these requirements?

- [x] Create an Amazon Elastic File System (Amazon EFS) file system. Mount the EFS file system from each EC2 instance.
- [ ] Create an Amazon S3 bucket. Allow access from all the EC2 instances in the VPC.
- [ ] Create a file system on a Provisioned IOPS SSD (io2) Amazon Elastic Block Store (Amazon EBS) volume. Attach the EBS volume to all the EC2 instances.
- [ ] Create file systems on Amazon Elastic Block Store (Amazon EBS) volumes that are attached to each EC2 instance. Synchronize the EBS volumes across the different EC2 instances.

---

### Question-549
**Difficulty**: medium
**Topics**: database:relational:multi-az-deployment, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design, database:performance:database-capacity-planning
**Tags**: rds, eks, alb, postgresql
**Quality**: 3/5 — Tests knowledge of RDS Multi-AZ DB clusters versus other HA options, but distractors are weak — DynamoDB is non-relational (eliminable immediately), standard Multi-AZ lacks read scaling, and cross-Region replicas add operational complexity; the scenario provides insufficient context on read/write ratios, traffic patterns, or cost constraints to deeply reason about trade-offs.

A company deploys its applications on Amazon Elastic Kubernetes Service (Amazon EKS) behind an Application Load Balancer in an AWS Region. The application needs to store data in a PostgreSQL database engine. The company wants the data in the database to be highly available. The company also needs increased capacity for read workloads.



Which solution will meet these requirements with the MOST operational efficiency?

- [x] Create an Amazon RDS database with Multi-AZ DB cluster deployment.
- [ ] Create an Amazon DynamoDB database table configured with global tables.
- [ ] Create an Amazon RDS database with Multi-AZ deployments.
- [ ] Create an Amazon RDS database configured with cross-Region read replicas.

---

### Question-556
**Difficulty**: medium
**Topics**: compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, compute:cost:compute-purchasing-options
**Tags**: ec2, auto-scaling, on-demand-instances, spot-instances
**Quality**: 4/5 — Clear HA requirement (stateful application, minimum 2 instances always running) with meaningful trade-offs between capacity, AZ distribution, and instance type selection; distractors meaningfully fail on either fault tolerance (single AZ), capacity math (min=2 insufficient for 1 AZ failure), or reliability (Spot instances for stateful production workload).

A company runs a stateful production application on Amazon EC2 instances. The application requires at least two EC2 instances to always be running.



A solutions architect needs to design a highly available and fault-tolerant architecture for the application. The solutions architect creates an Auto Scaling group of EC2 instances.



Which set of additional steps should the solutions architect take to meet these requirements?

- [x] Set the Auto Scaling group's minimum capacity to four. Deploy two On-Demand Instances in one Availability Zone and two On-Demand Instances in a second Availability Zone.
- [ ] Set the Auto Scaling group's minimum capacity to two. Deploy one On-Demand Instance in one Availability Zone and one On-Demand Instance in a second Availability Zone.
- [ ] Set the Auto Scaling group's minimum capacity to two. Deploy four Spot Instances in one Availability Zone.
- [ ] Set the Auto Scaling group's minimum capacity to four. Deploy two On-Demand Instances in one Availability Zone and two Spot Instances in a second Availability Zone.

---

### Question-557
**Difficulty**: easy
**Topics**: network:dns:geolocation-routing, network:dns:latency-based-routing, network:performance:latency-optimization, architecture:ha:global-load-distribution
**Tags**: route-53
**Quality**: 2/5 — Tests basic Route 53 routing policy selection but lacks scenario depth — the correct answer (geolocation routing) is the only defensible choice, making distractors trivially eliminable; simple routing doesn't support policy logic, latency policy only uses one region, and weighted routing ignores geography entirely.

An ecommerce company uses Amazon Route 53 as its DNS provider. The company hosts its website on premises and in the AWS Cloud. The company's on-premises data center is near the us-west-1 Region. The company uses the eu-central-1 Region to host the website. The company wants to minimize load time for the website as much as possible.



Which solution will meet these requirements?

- [x] Set up a geolocation routing policy. Send the traffic that is near us-west-1 to the on-premises data center. Send the traffic that is near eu-central-1 to eu-central-1.
- [ ] Set up a simple routing policy that routes all traffic that is near eu-central-1 to eu-central-1 and routes all traffic that is near the on-premises datacenter to the on-premises data center.
- [ ] Set up a latency routing policy. Associate the policy with us-west-1.
- [ ] Set up a weighted routing policy. Split the traffic evenly between eu-central-1 and the on-premises data center.

---

### Question-559
**Difficulty**: easy
**Topics**: compute:instances:placement-group-strategy, network:architecture:network-architecture-design, architecture:ha:multi-az-design
**Tags**: ec2
**Quality**: 3/5 — Tests direct recall of EC2 placement group types but lacks scenario depth — no detail on workload characteristics, failure modes, or trade-offs; distractors (separate accounts, dedicated/shared tenancy) are instantly eliminable by anyone familiar with basic EC2 concepts.

A company is deploying an application that processes large quantities of data in parallel. The company plans to use Amazon EC2 instances for the workload. The network architecture must be configurable to prevent groups of nodes from sharing the same underlying hardware.



Which networking solution meets these requirements?

- [x] Run the EC2 instances in a spread placement group.
- [ ] Group the EC2 instances in separate accounts.
- [ ] Configure the EC2 instances with dedicated tenancy.
- [ ] Configure the EC2 instances with shared tenancy.

---

### Question-564
**Difficulty**: medium
**Topics**: database:caching:session-state-caching, database:caching:caching-strategies, architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, architecture:resilience:single-point-of-failure
**Tags**: ec2, elasticache, elasticache-redis, elasticache-memcached, application-load-balancer, auto-scaling, rds, aws-storage-gateway
**Quality**: 3/5 — Tests service selection for session management but distractors are weak — Memcached lacks persistence for HA, Storage Gateway is for hybrid storage not sessions, and RDS works but Redis is superior for session caching; requires understanding session state externalization but lacks specific constraints (latency SLA, session size, data retention policy) that would strengthen reasoning.

A company runs a web application on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer that has sticky sessions enabled. The web server currently hosts the user session state. The company wants to ensure high availability and avoid user session state loss in the event of a web server outage.



Which solution will meet these requirements?

- [x] Use Amazon ElastiCache for Redis to store the session state. Update the application to use ElastiCache for Redis to store the session state.
- [ ] Use an Amazon ElastiCache for Memcached instance to store the session data. Update the application to use ElastiCache for Memcached to store the session state.
- [ ] Use an AWS Storage Gateway cached volume to store session data. Update the application to use AWS Storage Gateway cached volume to store the session state.
- [ ] Use Amazon RDS to store the session state. Update the application to use Amazon RDS to store the session state.

---

### Question-566
**Difficulty**: easy
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design, cost:optimization:rightsizing-compute
**Tags**: rds, mysql
**Quality**: 3/5 — Tests basic RDS read replica concept but lacks architectural depth — the scenario provides minimal context (no query volume, duration, or resource constraints), and distractors are trivially eliminable (backup restore is temporary, Athena requires data export, resizing ignores the root cause of periodic overload).

A company migrated a MySQL database from the company's on-premises data center to an Amazon RDS for MySQL DB instance. The company sized the RDS DB instance to meet the company's average daily workload. Once a month, the database performs slowly when the company runs queries for a report. The company wants to have the ability to run reports and maintain the performance of the daily workloads.



Which solution will meet these requirements?

- [x] Create a read replica of the database. Direct the queries to the read replica.
- [ ] Create a backup of the database. Restore the backup to another DB instance. Direct the queries to the new database.
- [ ] Export the data to Amazon S3. Use Amazon Athena to query the S3 bucket.
- [ ] Resize the DB instance to accommodate the additional workload.

---

### Question-569
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, database:caching:in-memory-caching, architecture:ha:regional-failover, database:performance:read-write-capacity-planning
**Tags**: elasticache, redis
**Quality**: 3/5 — Tests knowledge of ElastiCache Redis Multi-AZ replication groups but distractors are somewhat weak — AOF and Auto Scaling are tangentially related to HA/durability but don't directly address node-level and region-level requirements; the question could better specify what 'region level' means (single region or multi-region).

A solutions architect is designing a highly available Amazon ElastiCache for Redis based solution. The solutions architect needs to ensure that failures do not result in performance degradation or loss of data locally and within an AWS Region. The solution needs to provide high availability at the node level and at the Region level.



Which solution will meet these requirements?

- [x] Use Multi-AZ Redis replication groups with shards that contain multiple nodes.
- [ ] Use Redis shards that contain multiple nodes with Redis append only files (AOF) turned on.
- [ ] Use a Multi-AZ Redis cluster with more than one read replica in the replication group.
- [ ] Use Redis shards that contain multiple nodes with Auto Scaling turned on.

---

### Question-570
**Difficulty**: medium
**Topics**: compute:instances:ec2-hibernation, compute:scaling:auto-scaling-groups, compute:cost:compute-purchasing-options, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, hibernation
**Quality**: 3/5 — Tests understanding of EC2 hibernation and warm pools as launch-time optimizations, but distractors are weak — Spot Instances don't address slow application startup, additional instances don't solve launch time, and Capacity Reservations are purely for availability, making elimination straightforward without deep architectural reasoning.

A company plans to migrate to AWS and use Amazon EC2 On-Demand Instances for its application. During the migration testing phase, a technical team observes that the application takes a long time to launch and load memory to become fully productive.



Which solution will reduce the launch time of the application during the next testing phase?

- [x] Launch the EC2 On-Demand Instances with hibernation turned on. Configure EC2 Auto Scaling warm pools during the next testing phase.
- [ ] Launch two or more EC2 On-Demand Instances. Turn on auto scaling features and make the EC2 On-Demand Instances available during the next testing phase.
- [ ] Launch EC2 Spot Instances to support the application and to scale the application so it is available during the next testing phase.
- [ ] Launch EC2 On-Demand Instances with Capacity Reservations. Start additional EC2 instances during the next testing phase.

---

### Question-572
**Difficulty**: medium
**Topics**: database:cost:serverless-database, database:performance:database-capacity-planning, compute:scaling:auto-scaling-groups, cost:optimization:rightsizing-compute, architecture:ha:multi-az-design
**Tags**: rds, aurora, ec2, postgresql, aurora-serverless
**Quality**: 4/5 — Clear scenario with unpredictable traffic and connection issues that directly maps to serverless auto-scaling capabilities; distractors are plausible (manual scaling, larger instance, Redshift) but each fails on either cost-effectiveness or applicability, forcing reasoning about serverless capacity vs reserved capacity trade-offs.

An ecommerce application uses a PostgreSQL database that runs on an Amazon EC2 instance. During a monthly sales event, database usage increases and causes database connection issues for the application. The traffic is unpredictable for subsequent monthly sales events, which impacts the sales forecast. The company needs to maintain performance when there is an unpredictable increase in traffic.



Which solution resolves this issue in the MOST cost-effective way?

- [x] Migrate the PostgreSQL database to Amazon Aurora Serverless v2.
- [ ] Enable auto scaling for the PostgreSQL database on the EC2 instance to accommodate increased usage.
- [ ] Migrate the PostgreSQL database to Amazon RDS for PostgreSQL with a larger instance type.
- [ ] Migrate the PostgreSQL database to Amazon Redshift to accommodate increased usage.

---

### Question-575
**Difficulty**: medium
**Topics**: compute:containers:container-orchestration, architecture:ha:multi-az-design, architecture:resilience:redundancy-patterns, compute:scaling:auto-scaling-groups
**Tags**: ecs, rds, outposts, ec2
**Quality**: 3/5 — Tests understanding of AWS Outposts shared responsibility model, but the scenario provides minimal context (no traffic patterns, workload specifics, or compliance details) and the correct answers follow directly from AWS documentation rather than requiring architectural reasoning about trade-offs.

A company wants to use Amazon Elastic Container Service (Amazon ECS) clusters and Amazon RDS DB instances to build and run a payment processing application. The company will run the application in its on-premises data center for compliance purposes.



A solutions architect wants to use AWS Outposts as part of the solution. The solutions architect is working with the company's operational team to build the application.



Which activities are the responsibility of the company's operational team? (Choose three.)

- [x] Providing resilient power and network connectivity to the Outposts racks
- [x] Physical security and access controls of the data center environment
- [x] Providing extra capacity for Amazon ECS clusters to mitigate server failures and maintenance events
- [ ] Managing the virtualization hypervisor, storage systems, and the AWS services that run on Outposts
- [ ] Availability of the Outposts infrastructure including the power supplies, servers, and networking equipment within the Outposts racks
- [ ] Physical maintenance of Outposts components

---

### Question-578
**Difficulty**: medium
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:load-balancing:load-balancing-strategy, network:performance:latency-optimization, architecture:ha:global-load-distribution
**Tags**: nlb, alb, cloudfront, api-gateway, lambda, vpc
**Quality**: 4/5 — Clear scenario with specific performance requirements (3M RPS, low latency, TCP nonstandard port) that eliminates ALB and CloudFront distractors through protocol/throughput reasoning, though the API Gateway distractor is somewhat weaker than ideal for a hard question.

A company is planning to migrate a TCP-based application into the company's VPC. The application is publicly accessible on a nonstandard TCP port through a hardware appliance in the company's data center. This public endpoint can process up to 3 million requests per second with low latency. The company requires the same level of performance for the new public endpoint in AWS.



What should a solutions architect recommend to meet this requirement?

- [x] Deploy a Network Load Balancer (NLB). Configure the NLB to be publicly accessible over the TCP port that the application requires.
- [ ] Deploy an Application Load Balancer (ALB). Configure the ALB to be publicly accessible over the TCP port that the application requires.
- [ ] Deploy an Amazon CloudFront distribution that listens on the TCP port that the application requires. Use an Application Load Balancer as the origin.
- [ ] Deploy an Amazon API Gateway API that is configured with the TCP port that the application requires. Configure AWS Lambda functions with provisioned concurrency to process the requests.

---

### Question-585
**Difficulty**: medium
**Topics**: storage:object:storage-access-patterns, database:performance:database-capacity-planning, cost:optimization:storage-size-optimization, architecture:ha:multi-az-design
**Tags**: s3, rds, ebs
**Quality**: 4/5 — Clear scenario with multiple constraints (performance degradation, cost, HA/resilience) that tests understanding of when to offload BLOBs from databases to object storage; correct answer directly addresses root cause; distractors are plausible but each violates at least one requirement (downsizing hurts HA, DynamoDB unnecessary migration), requiring careful trade-off analysis.

A company has migrated a two-tier application from its on-premises data center to the AWS Cloud. The data tier is a Multi-AZ deployment of Amazon RDS for Oracle with 12 TB of General Purpose SSD Amazon Elastic Block Store (Amazon EBS) storage. The application is designed to process and store documents in the database as binary large objects (blobs) with an average document size of 6 MB.



The database size has grown over time, reducing the performance and increasing the cost of storage. The company must improve the database performance and needs a solution that is highly available and resilient.



Which solution will meet these requirements MOST cost-effectively?

- [x] Create an Amazon S3 bucket. Update the application to store documents in the S3 bucket. Store the object metadata in the existing database.
- [ ] Reduce the RDS DB instance size. Increase the storage capacity to 24 TiB. Change the storage type to Magnetic.
- [ ] Increase the RDS DB instance size. Increase the storage capacity to 24 TiChange the storage type to Provisioned IOPS.
- [ ] Create an Amazon DynamoDB table. Update the application to use DynamoDB. Use AWS Database Migration Service (AWS DMS) to migrate data from the Oracle database to DynamoDB.

---

### Question-593
**Difficulty**: easy
**Topics**: network:architecture:multi-tier-network-design, security:network:security-group-design, network:load-balancing:load-balancing-strategy, architecture:ha:multi-az-design
**Tags**: ec2, rds, auto-scaling, application-load-balancer, security-group
**Quality**: 2/5 — Tests basic security group configuration recall but distractors are trivially eliminable — PrivateLink and VPC endpoints are for service exposure (not inter-tier access), and Network Load Balancers don't solve the security requirement — leaving only the ALB+security-group answer defensible by process of elimination rather than architectural reasoning.

A company is designing a new multi-tier web application that consists of the following components:



• Web and application servers that run on Amazon EC2 instances as part of Auto Scaling groups

• An Amazon RDS DB instance for data storage



A solutions architect needs to limit access to the application servers so that only the web servers can access them.



Which solution will meet these requirements?

- [x] Deploy an Application Load Balancer with a target group that contains the application servers' Auto Scaling group. Configure the security group to allow only the web servers to access the application servers.
- [ ] Deploy AWS PrivateLink in front of the application servers. Configure the network ACL to allow only the web servers to access the application servers.
- [ ] Deploy a VPC endpoint in front of the application servers. Configure the security group to allow only the web servers to access the application servers.
- [ ] Deploy a Network Load Balancer with a target group that contains the application servers' Auto Scaling group. Configure the network ACL to allow only the web servers to access the application servers.

---

### Question-597
**Difficulty**: medium
**Topics**: storage:archival:backup-retention-policies, storage:archival:vault-lock-policies, architecture:dr:recovery-point-objective, architecture:ha:multi-az-design, security:data:data-backup-replication
**Tags**: fsx, aws-backup, ec2
**Quality**: 3/5 — Tests AWS Backup and FSx knowledge with clear requirements (RPO, cross-region replication, retention lock), but distractors are mechanically weak — governance vs compliance mode is the only meaningful distinction; Single-AZ vs Multi-AZ choice is strongly implied by RPO requirement and doesn't require deep reasoning about trade-offs.

A company wants to use Amazon FSx for Windows File Server for its Amazon EC2 instances that have an SMB file share mounted as a volume in the us-east-1 Region. The company has a recovery point objective (RPO) of 5 minutes for planned system maintenance or unplanned service disruptions. The company needs to replicate the file system to the us-west-2 Region. The replicated data must not be deleted by any user for 5 years.



Which solution will meet these requirements?

- [x] Create an FSx for Windows File Server file system in us-east-1 that has a Multi-AZ deployment type. Use AWS Backup to create a daily backup plan that includes a backup rule that copies the backup to us-west-2. Configure AWS Backup Vault Lock in compliance mode for a target vault in us-west-2. Configure a minimum duration of 5 years.
- [ ] Create an FSx for Windows File Server file system in us-east-1 that has a Single-AZ 2 deployment type. Use AWS Backup to create a daily backup plan that includes a backup rule that copies the backup to us-west-2. Configure AWS Backup Vault Lock in compliance mode for a target vault in us-west-2. Configure a minimum duration of 5 years.
- [ ] Create an FSx for Windows File Server file system in us-east-1 that has a Multi-AZ deployment type. Use AWS Backup to create a daily backup plan that includes a backup rule that copies the backup to us-west-2. Configure AWS Backup Vault Lock in governance mode for a target vault in us-west-2. Configure a minimum duration of 5 years.
- [ ] Create an FSx for Windows File Server file system in us-east-1 that has a Single-AZ 2 deployment type. Use AWS Backup to create a daily backup plan that includes a backup rule that copies the backup to us-west-2. Configure AWS Backup Vault Lock in governance mode for a target vault in us-west-2. Configure a minimum duration of 5 years.

---

### Question-601
**Difficulty**: easy
**Topics**: storage:object:cross-region-replication, storage:object:object-lifecycle-management, architecture:ha:multi-region-design
**Tags**: s3, cors
**Quality**: 3/5 — Tests direct recall of S3 Cross-Region Replication as the standard solution, but distractors are weak — CORS is for browser requests, Lifecycle rules don't copy between buckets, and Lambda-based copying is unnecessarily complex — making the correct answer obvious without deep reasoning about trade-offs or constraints.

An online photo-sharing company stores its photos in an Amazon S3 bucket that exists in the us-west-1 Region. The company needs to store a copy of all new photos in the us-east-1 Region.



Which solution will meet this requirement with the LEAST operational effort?

- [x] Create a second S3 bucket in us-east-1. Use S3 Cross-Region Replication to copy photos from the existing S3 bucket to the second S3 bucket.
- [ ] Create a cross-origin resource sharing (CORS) configuration of the existing S3 bucket. Specify us-east-1 in the CORS rule's AllowedOrigin element.
- [ ] Create a second S3 bucket in us-east-1 across multiple Availability Zones. Create an S3 Lifecycle rule to save photos into the second S3 bucket.
- [ ] Create a second S3 bucket in us-east-1. Configure S3 event notifications on object creation and update events to invoke an AWS Lambda function to copy photos from the existing S3 bucket to the second S3 bucket.

---

### Question-607
**Difficulty**: medium
**Topics**: network:dns:dns-routing-policies, architecture:ha:multi-az-design, governance:automation:infrastructure-as-code, cost:optimization:idle-resource-elimination
**Tags**: route-53, ec2, cloudwatch, aws-sms
**Quality**: 3/5 — Tests basic AWS service selection for DNS migration but lacks depth — the scenario provides no multi-region context, traffic distribution details, or failover requirements to justify why Route 53 is superior; distractors are plausible but weakly differentiated (EC2 self-management vs managed service is a known best practice, not a reasoning exercise).

A company wants to migrate two DNS servers to AWS. The servers host a total of approximately 200 zones and receive 1 million requests each day on average. The company wants to maximize availability while minimizing the operational overhead that is related to the management of the two servers.



What should a solutions architect recommend to meet these requirements?

- [x] Create 200 new hosted zones in the Amazon Route 53 console Import zone files.
- [ ] Launch a single large Amazon EC2 instance Import zone tiles. Configure Amazon CloudWatch alarms and notifications to alert the company about any downtime.
- [ ] Migrate the servers to AWS by using AWS Server Migration Service (AWS SMS). Configure Amazon CloudWatch alarms and notifications to alert the company about any downtime.
- [ ] Launch an Amazon EC2 instance in an Auto Scaling group across two Availability Zones. Import zone files. Set the desired capacity to 1 and the maximum capacity to 3 for the Auto Scaling group. Configure scaling alarms to scale based on CPU utilization.

---

### Question-609
**Difficulty**: easy
**Topics**: database:relational:database-replication-strategies, database:migration:zero-downtime-migration, architecture:ha:multi-az-design, governance:automation:infrastructure-as-code
**Tags**: rds, rds-blue-green-deployments, mysql
**Quality**: 3/5 — Tests basic AWS service selection for database version upgrades; the correct answer (Blue/Green Deployments) is directly matched to the stated requirements, but distractors are weak — manual snapshots, native backup/restore, and DMS are clearly more operationally complex and don't specifically address testing requirements.

A company runs a production database on Amazon RDS for MySQL. The company wants to upgrade the database version for security compliance reasons. Because the database contains critical data, the company wants a quick solution to upgrade and test functionality without losing any data.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Use Amazon RDS Blue/Green Deployments to deploy and test production changes.
- [ ] Create an RDS manual snapshot. Upgrade to the new version of Amazon RDS for MySQL.
- [ ] Use native backup and restore. Restore the data to the upgraded new version of Amazon RDS for MySQL.
- [ ] Use AWS Database Migration Service (AWS DMS) to replicate the data to the upgraded new version of Amazon RDS for MySQL.

---

### Question-613
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:file:cross-az-file-access, storage:performance:storage-auto-scaling, architecture:ha:multi-az-design
**Tags**: efs, ec2, ebs, s3-glacier
**Quality**: 3/5 — Tests basic storage service selection for shared, multi-AZ access with growth requirements, but distractors are weakly motivated — S3 Glacier is for archival (not hourly analysis), EBS is single-AZ/single-instance (not multi-AZ shared access), and anyone with entry-level AWS knowledge can eliminate them without deep reasoning.

A company is creating a new application that will store a large amount of data. The data will be analyzed hourly and will be modified by several Amazon EC2 Linux instances that are deployed across multiple Availability Zones. The needed amount of storage space will continue to grow for the next 6 months.



Which storage solution should a solutions architect recommend to meet these requirements?

- [x] Store the data in an Amazon Elastic File System (Amazon EFS) file system. Mount the file system on the application instances.
- [ ] Store the data in Amazon S3 Glacier. Update the S3 Glacier vault policy to allow access to the application instances.
- [ ] Store the data in an Amazon Elastic Block Store (Amazon EBS) volume. Mount the EBS volume on the application instances.
- [ ] Store the data in an Amazon Elastic Block Store (Amazon EBS) Provisioned IOPS volume shared between the application instances.

---

### Question-614
**Difficulty**: easy
**Topics**: database:performance:read-vs-write-intensive, database:relational:read-replicas-usage, database:performance:database-query-optimization, architecture:ha:multi-az-design
**Tags**: rds, postgresql
**Quality**: 3/5 — Tests basic RDS read replica knowledge but distractors are trivially eliminable — Multi-AZ standby is for failover not reads, Transfer Acceleration is for S3, and Kinesis Firehose has no relevance to RDS query performance — and the scenario provides no details about read/write ratio, query complexity, or data size to justify deeper architectural reasoning.

A company manages an application that stores data on an Amazon RDS for PostgreSQL Multi-AZ DB instance. Increases in traffic are causing performance problems. The company determines that database queries are the primary reason for the slow performance.



What should a solutions architect do to improve the application's performance?

- [x] Create a read replica from the source DB instance. Serve read traffic from the read replica.
- [ ] Serve read traffic from the Multi-AZ standby replica.
- [ ] Configure the DB instance to use Transfer Acceleration.
- [ ] Use Amazon Kinesis Data Firehose between the application and Amazon RDS to increase the concurrency of database requests.

---

### Question-616
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, storage:file:shared-file-system-design, architecture:ha:multi-region-design, storage:performance:storage-durability-replication
**Tags**: fsx, ontap, snapmirror, ec2, aws-backup, s3, efs
**Quality**: 4/5 — Clear multi-region DR scenario with protocol preservation requirement; correct answer (SnapMirror) is the native NetApp solution requiring minimal operational overhead; distractors are plausible but each introduces significant operational complexity (Lambda/S3 requires protocol conversion, AWS Backup requires manual failover steps, EFS migration changes protocols) or architectural mismatch.

A company uses Amazon FSx for NetApp ONTAP in its primary AWS Region for CIFS and NFS file shares. Applications that run on Amazon EC2 instances access the file shares. The company needs a storage disaster recovery (DR) solution in a secondary Region. The data that is replicated in the secondary Region needs to be accessed by using the same protocols as the primary Region.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Create an FSx for ONTAP instance in the secondary Region. Use NetApp SnapMirror to replicate data from the primary Region to the secondary Region.
- [ ] Create an AWS Lambda function to copy the data to an Amazon S3 bucket. Replicate the S3 bucket to the secondary Region.
- [ ] Create a backup of the FSx for ONTAP volumes by using AWS Backup. Copy the volumes to the secondary Region. Create a new FSx for ONTAP instance from the backup.
- [ ] Create an Amazon Elastic File System (Amazon EFS) volume. Migrate the current data to the volume. Replicate the volume to the secondary Region.

---

### Question-620
**Difficulty**: easy
**Topics**: network:load-balancing:sticky-sessions, network:load-balancing:load-balancing-strategy, architecture:ha:multi-az-design
**Tags**: alb, ec2, application-load-balancer
**Quality**: 3/5 — Tests basic ALB sticky-sessions knowledge but lacks scenario depth — no traffic pattern data, request characteristics, or business context explaining why traffic favors one instance; the correct answer directly follows from 'uneven traffic' without requiring architectural reasoning about trade-offs.

A company is building a new furniture inventory application. The company has deployed the application on a fleet ofAmazon EC2 instances across multiple Availability Zones. The EC2 instances run behind an Application Load Balancer (ALB) in their VPC.



A solutions architect has observed that incoming traffic seems to favor one EC2 instance, resulting in latency for some requests.



What should the solutions architect do to resolve this issue?

- [x] Disable session affinity (sticky sessions) on the ALB
- [ ] Replace the ALB with a Network Load Balancer
- [ ] Increase the number of EC2 instances in each Availability Zone
- [ ] Adjust the frequency of the health checks on the ALB's target group

---

### Question-624
**Difficulty**: easy
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: nlb, ec2, auto-scaling, alb
**Quality**: 3/5 — Tests basic knowledge that NLB supports UDP while ALB does not, but lacks multi-region complexity or meaningful trade-offs; distractors are weak (Route 53 weighted policy and NAT instance are trivially eliminable for this use case).

A company wants to run a gaming application on Amazon EC2 instances that are part of an Auto Scaling group in the AWS Cloud. The application will transmit data by using UDP packets. The company wants to ensure that the application can scale out and in as traffic increases and decreases.



What should a solutions architect do to meet these requirements?

- [x] Attach a Network Load Balancer to the Auto Scaling group.
- [ ] Attach an Application Load Balancer to the Auto Scaling group.
- [ ] Deploy an Amazon Route 53 record set with a weighted policy to route traffic appropriately.
- [ ] Deploy a NAT instance that is configured with port forwarding to the EC2 instances in the Auto Scaling group.

---

### Question-629
**Difficulty**: hard
**Topics**: network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, architecture:ha:regional-failover, network:load-balancing:layer4-vs-layer7-balancing
**Tags**: global-accelerator, route-53, cloudfront, application-load-balancer
**Quality**: 4/5 — Strong scenario with multiple constraints (VoIP/UDP protocol, global users, low latency, automated failover) that require reasoning through Global Accelerator's capabilities for non-HTTP protocols and health-based failover; Route 53 geolocation routing and CloudFront are plausible but fail on the IP caching constraint and multi-region failover automation respectively.

A gaming company is building an application with Voice over IP capabilities. The application will serve traffic to users across the world. The application needs to be highly available with an automated failover across AWS Regions. The company wants to minimize the latency of users without relying on IP address caching on user devices.



What should a solutions architect do to meet these requirements?

- [x] Use AWS Global Accelerator with health checks.
- [ ] Use Amazon Route 53 with a geolocation routing policy.
- [ ] Create an Amazon CloudFront distribution that includes multiple origins.
- [ ] Create an Application Load Balancer that uses path-based routing.

---

### Question-630
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:file:throughput-mode-selection, storage:performance:storage-performance-optimization, architecture:ha:multi-az-design, compute:instances:workload-classification
**Tags**: fsx-for-lustre, efs, storage, hpc
**Quality**: 4/5 — Strong scenario with clear HPC requirements (sub-millisecond latency, sustained throughput, thousands of concurrent instances); distractors test understanding of FSx Lustre persistent vs scratch filesystems and EFS throughput modes, with plausible but wrong trade-offs that require reasoning about persistence, scalability, and performance characteristics.

A weather forecasting company needs to process hundreds of gigabytes of data with sub-millisecond latency. The company has a high performance computing (HPC) environment in its data center and wants to expand its forecasting capabilities.



A solutions architect must identify a highly available cloud storage solution that can handle large amounts of sustained throughput. Files that are stored in the solution should be accessible to thousands of compute instances that will simultaneously access and process the entire dataset.



What should the solutions architect do to meet these requirements?

- [x] Use Amazon FSx for Lustre persistent file systems.
- [ ] Use Amazon FSx for Lustre scratch file systems.
- [ ] Use Amazon Elastic File System (Amazon EFS) with Bursting Throughput mode.
- [ ] Use Amazon Elastic File System (Amazon EFS) with Provisioned Throughput mode.

---

### Question-637
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:patterns:microservices-design-principles, compute:containers:container-orchestration, database:caching:in-memory-caching, storage:object:storage-access-patterns
**Tags**: cloudfront, s3, application-load-balancer, ecs, fargate, elasticache, redis
**Quality**: 4/5 — Well-structured scenario with clear requirements (HA, managed services) and meaningful distractors that each violate key constraints — Elastic Beanstalk lacks CloudFront separation, Lambda is unsuitable for long-running PHP, and the final option doesn't achieve HA — requiring understanding of service roles in modern architecture.

A company recently migrated its web application to the AWS Cloud. The company uses an Amazon EC2 instance to run multiple processes to host the application. The processes include an Apache web server that serves static content. The Apache web server makes requests to a PHP application that uses a local Redis server for user sessions.



The company wants to redesign the architecture to be highly available and to use AWS managed solutions.



Which solution will meet these requirements?

- [x] Configure an Amazon CloudFront distribution with an Amazon S3 endpoint to an S3 bucket that is configured to host the static content. Configure an Application Load Balancer that targets an Amazon Elastic Container Service (Amazon ECS) service that runs AWS Fargate tasks for the PHP application. Configure the PHP application to use an Amazon ElastiCache for Redis cluster that runs in multiple Availability Zones.
- [ ] Use AWS Elastic Beanstalk to host the static content and the PHP application. Configure Elastic Beanstalk to deploy its EC2 instance into a public subnet. Assign a public IP address.
- [ ] Use AWS Lambda to host the static content and the PHP application. Use an Amazon API Gateway REST API to proxy requests to the Lambda function. Set the API Gateway CORS configuration to respond to the domain name. Configure Amazon ElastiCache for Redis to handle session information.
- [ ] Keep the backend code on the EC2 instance. Create an Amazon ElastiCache for Redis cluster that has Multi-AZ enabled. Configure the ElastiCache for Redis cluster in cluster mode. Copy the frontend resources to Amazon S3. Configure the backend code to reference the EC2 instance.

---

### Question-638
**Difficulty**: easy
**Topics**: network:load-balancing:sticky-sessions, network:load-balancing:layer4-vs-layer7-balancing, security:application:web-application-firewall, architecture:ha:multi-az-design
**Tags**: alb, waf, ec2, auto-scaling, target-group
**Quality**: 3/5 — Tests basic service selection and feature pairing (ALB for sticky sessions, WAF association), but distractors are trivially eliminable — NLB does not support sticky sessions, Gateway Load Balancer is for security appliances, and Elastic IPs are irrelevant to the requirements.

A company runs a web application on Amazon EC2 instances in an Auto Scaling group that has a target group. The company designed the application to work with session affinity (sticky sessions) for a better user experience.



The application must be available publicly over the internet as an endpoint. A WAF must be applied to the endpoint for additional security. Session affinity (sticky sessions) must be configured on the endpoint.



Which combination of steps will meet these requirements? (Choose two.)

- [x] Create a public Application Load Balancer. Specify the application target group.
- [x] Create a web ACL in AWS WAF. Associate the web ACL with the endpoint
- [ ] Create a public Network Load Balancer. Specify the application target group.
- [ ] Create a Gateway Load Balancer. Specify the application target group.
- [ ] Create a second target group. Add Elastic IP addresses to the EC2 instances.

---

### Question-639
**Difficulty**: easy
**Topics**: storage:object:storage-access-patterns, storage:object:storage-tiering, cost:optimization:storage-size-optimization, architecture:ha:multi-az-design
**Tags**: s3, s3-standard-ia, ebs, efs, ec2
**Quality**: 3/5 — Tests basic storage service selection and cost awareness, but distractors are weak — EBS and EFS are completely inappropriate for infrequent image delivery, making this primarily recall-based rather than requiring architectural reasoning about trade-offs.

A company runs a website that stores images of historical events. Website users need the ability to search and view images based on the year that the event in the image occurred. On average, users request each image only once or twice a year. The company wants a highly available solution to store and deliver the images to users.



Which solution will meet these requirements MOST cost-effectively?

- [x] Store images in Amazon S3 Standard-Infrequent Access (S3 Standard-IA). Use S3 Standard-IA to directly deliver images by using a static website.
- [ ] Store images in Amazon Elastic Block Store (Amazon EBS). Use a web server that runs on Amazon EC2.
- [ ] Store images in Amazon Elastic File System (Amazon EFS). Use a web server that runs on Amazon EC2.
- [ ] Store images in Amazon S3 Standard. Use S3 Standard to directly deliver images by using a static website.

---

### Question-641
**Difficulty**: medium
**Topics**: compute:instances:placement-group-strategy, storage:file:shared-file-system-design, storage:file:nfs-vs-smb-protocols, architecture:ha:multi-az-design, network:performance:latency-optimization
**Tags**: ec2, fsx, fsx-netapp-ontap, fsx-lustre, fsx-openzfs
**Quality**: 3/5 — Tests knowledge of placement groups and FSx file system options for HPC workloads, but the scenario lacks specifics on workload characteristics (data size, I/O patterns, budget constraints) that would make the trade-offs between NetApp ONTAP (multi-protocol, lower throughput) and Lustre (single-protocol, higher throughput) more meaningful; distractors are plausible but partition placement groups and alternative FSx options are recognizable as less optimal for latency-sensitive HPC.

A company uses an on-premises network-attached storage (NAS) system to provide file shares to its high performance computing (HPC) workloads. The company wants to migrate its latency-sensitive HPC workloads and its storage to the AWS Cloud. The company must be able to provide NFS and SMB multi-protocol access from the file system.



Which solution will meet these requirements with the LEAST latency? (Choose two.)

- [x] Deploy compute optimized EC2 instances into a cluster placement group.
- [x] Attach the EC2 instances to an Amazon FSx for NetApp ONTAP file system.
- [ ] Deploy compute optimized EC2 instances into a partition placement group.
- [ ] Attach the EC2 instances to an Amazon FSx for Lustre file system.
- [ ] Attach the EC2 instances to an Amazon FSx for OpenZFS file system.

---

### Question-644
**Difficulty**: easy
**Topics**: compute:scaling:scheduled-scaling, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, application-load-balancer
**Quality**: 3/5 — Tests basic understanding of scheduled scaling vs reactive scaling, but distractors are weak — dynamic policies based on CPU/memory are obviously suboptimal when peak hours are predictable, and load balancer selection is irrelevant to the cold-start problem, making the correct answer trivially obvious without deep reasoning.

A company hosts an application on Amazon EC2 On-Demand Instances in an Auto Scaling group. Application peak hours occur at the same time each day. Application users report slow application performance at the start of peak hours. The application performs normally 2-3 hours after peak hours begin. The company wants to ensure that the application works properly at the start of peak hours.



Which solution will meet these requirements?

- [x] Configure a scheduled scaling policy for the Auto Scaling group to launch new instances before peak hours.
- [ ] Configure an Application Load Balancer to distribute traffic properly to the instances.
- [ ] Configure a dynamic scaling policy for the Auto Scaling group to launch new instances based on memory utilization.
- [ ] Configure a dynamic scaling policy for the Auto Scaling group to launch new instances based on CPU utilization.

---

### Question-648
**Difficulty**: medium
**Topics**: compute:instances:instance-type-selection, compute:scaling:scaling-policies, compute:scaling:target-tracking-scaling, architecture:ha:multi-az-design
**Tags**: elastic-beanstalk, ec2, auto-scaling
**Quality**: 3/5 — Tests understanding of burstable instance unlimited mode and scaling policies, but the scenario lacks traffic pattern detail to justify why request-based scaling is correct over predictive metrics, and compute-optimized distractors are easily eliminated by those familiar with burstable instances.

A company has a web application that runs on premises. The application experiences latency issues during peak hours. The latency issues occur twice each month. At the start of a latency issue, the application's CPU utilization immediately increases to 10 times its normal amount.



The company wants to migrate the application to AWS to improve latency. The company also wants to scale the application automatically when application demand increases. The company will use AWS Elastic Beanstalk for application deployment.



Which solution will meet these requirements?

- [x] Configure an Elastic Beanstalk environment to use burstable performance instances in unlimited mode. Configure the environment to scale based on requests.
- [ ] Configure an Elastic Beanstalk environment to use compute optimized instances. Configure the environment to scale based on requests.
- [ ] Configure an Elastic Beanstalk environment to use compute optimized instances. Configure the environment to scale on a schedule.
- [ ] Configure an Elastic Beanstalk environment to use burstable performance instances in unlimited mode. Configure the environment to scale on predictive metrics.

---

### Question-650
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:multi-region-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, database:relational:multi-az-deployment
**Tags**: ec2, rds, application-load-balancer, auto-scaling, mysql
**Quality**: 3/5 — Tests basic HA principles (Multi-AZ RDS, ALB + ASG across AZs) but distractors are weak — internet gateway per AZ, DynamoDB for MySQL, and DataSync for database sync are trivially eliminable; lacks specific constraints (traffic volume, failover time, cost sensitivity) that would force deeper architectural reasoning.

A startup company is hosting a website for its customers on an Amazon EC2 instance. The website consists of a stateless Python application and a MySQL database. The website serves only a small amount of traffic. The company is concerned about the reliability of the instance and needs to migrate to a highly available architecture. The company cannot modify the application code.



Which combination of actions should a solutions architect take to achieve high availability for the website? (Choose two.)

- [x] Migrate the database to an Amazon RDS for MySQL Multi-AZ DB instance.
- [x] Create an Application Load Balancer to distribute traffic to an Auto Scaling group of EC2 instances that are distributed across two Availability Zones.
- [ ] Provision an internet gateway in each Availability Zone in use.
- [ ] Migrate the database to Amazon DynamoDB, and enable DynamoDB auto scaling.
- [ ] Use AWS DataSync to synchronize the database data across multiple EC2 instances.

---

### Question-665
**Difficulty**: medium
**Topics**: network:connectivity:hybrid-network-connectivity, network:connectivity:redundant-connections, network:connectivity:direct-connect-hybrid, network:connectivity:vpn-site-to-site, architecture:ha:regional-failover
**Tags**: direct-connect, vpn, hybrid-connectivity
**Quality**: 4/5 — Well-structured scenario with clear trade-offs between cost and performance; correctly tests understanding of hybrid connectivity options, failover patterns, and cost vs. latency trade-offs; distractors meaningfully differ (dual DX vs DX+VPN, manual CLI failover attribute) and require reasoning about redundancy strategy.

A solutions architect is designing a new hybrid architecture to extend a company's on-premises infrastructure to AWS. The company requires a highly available connection with consistent low latency to an AWS Region. The company needs to minimize costs and is willing to accept slower traffic if the primary connection fails.

What should the solutions architect do to meet these requirements?

- [x] Provision an AWS Direct Connect connection to a Region. Provision a VPN connection as a backup if the primary Direct Connect connection fails.
- [ ] Provision a VPN tunnel connection to a Region for private connectivity. Provision a second VPN tunnel for private connectivity and as a backup if the primary VPN connection fails.
- [ ] Provision an AWS Direct Connect connection to a Region. Provision a second Direct Connect connection to the same Region as a backup if the primary Direct Connect connection fails.
- [ ] Provision an AWS Direct Connect connection to a Region. Use the Direct Connect failover attribute from the AWS CLI to automatically create a backup connection if the primary Direct Connect connection fails.

---

### Question-669
**Difficulty**: medium
**Topics**: architecture:migration:lift-and-shift, architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment, network:load-balancing:load-balancing-strategy
**Tags**: ec2, rds, auto-scaling, application-load-balancer, mysql
**Quality**: 3/5 — Tests basic lift-and-shift migration pattern with HA improvements, but lacks scenario depth (no traffic patterns, no application constraints, no cost considerations) and distractors are trivially eliminable — Lambda for a multi-tier app and DynamoDB for a MySQL workload are obviously wrong without requiring architectural reasoning.

A company is migrating its multi-tier on-premises application to AWS. The application consists of a single-node MySQL database and a multi-node web tier. The company must minimize changes to the application during the migration. The company wants to improve application resiliency after the migration.



Which combination of steps will meet these requirements? (Choose two.)

- [x] Migrate the web tier to Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer.
- [x] Migrate the database to an Amazon RDS Multi-AZ deployment.
- [ ] Migrate the database to Amazon EC2 instances in an Auto Scaling group behind a Network Load Balancer.
- [ ] Migrate the web tier to an AWS Lambda function.
- [ ] Migrate the database to an Amazon DynamoDB table.

---

### Question-670
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, network:connectivity:hybrid-network-connectivity, network:performance:latency-optimization, architecture:ha:multi-region-design
**Tags**: vpc, local-zones, wavelength-zones, cloudfront, edge-locations
**Quality**: 3/5 — Tests knowledge of AWS edge infrastructure types but distractors are weak — CloudFront edge locations and regional edge caches are for content delivery, not application compute; Wavelength is for telecom use cases — requiring only service-name elimination rather than deep architectural reasoning about regulatory constraints and latency.

A company wants to migrate its web applications from on premises to AWS. The company is located close to the eu-central-1 Region. Because of regulations, the company cannot launch some of its applications in eu-central-1. The company wants to achieve single-digit millisecond latency.



Which solution will meet these requirements?

- [x] Deploy the applications in AWS Local Zones by extending the company's VPC from eu-central-1 to the chosen Local Zone.
- [ ] Deploy the applications in eu-central-1. Extend the company’s VPC from eu-central-1 to an edge location in Amazon CloudFront.
- [ ] Deploy the applications in eu-central-1. Extend the company’s VPC from eu-central-1 to the regional edge caches in Amazon CloudFront.
- [ ] Deploy the applications in AWS Wavelength Zones by extending the company’s VPC from eu-central-1 to the chosen Wavelength Zone.

---

### Question-671
**Difficulty**: medium
**Topics**: database:relational:connection-pooling-proxies, database:performance:connection-pool-sizing, architecture:ha:multi-az-design, security:network:public-private-subnets
**Tags**: rds, rds-proxy, lambda, vpc, postgresql
**Quality**: 4/5 — Clear scenario with two distinct requirements (predictable performance via connection pooling, VPC access to private RDS) that directly map to the correct answer; distractors combine service misconceptions (custom endpoints don't manage connections) with VPC deployment errors, forcing understanding of both RDS Proxy's connection management purpose and Lambda VPC networking requirements.

A company’s ecommerce website has unpredictable traffic and uses AWS Lambda functions to directly access a private Amazon RDS for PostgreSQL DB instance. The company wants to maintain predictable database performance and ensure that the Lambda invocations do not overload the database with too many connections.



What should a solutions architect do to meet these requirements?

- [x] Point the client driver at an RDS proxy endpoint. Deploy the Lambda functions inside a VPC.
- [ ] Point the client driver at an RDS custom endpoint. Deploy the Lambda functions inside a VPC.
- [ ] Point the client driver at an RDS custom endpoint. Deploy the Lambda functions outside a VPC.
- [ ] Point the client driver at an RDS proxy endpoint. Deploy the Lambda functions outside a VPC.

---

### Question-672
**Difficulty**: medium
**Topics**: network:architecture:hub-and-spoke-topology, network:routing:transit-gateway-routing, network:connectivity:vpn-site-to-site, architecture:ha:multi-region-design, governance:accounts:multi-account-strategy
**Tags**: transit-gateway, vpc, vpn
**Quality**: 4/5 — Well-crafted scenario with clear scaling and administration requirements that make transit gateway the obvious choice; distractors are plausible (peering, EC2 VPN, Direct Connect) but each fails on scalability or administrative overhead in meaningful ways.

A company is creating an application. The company stores data from tests of the application in multiple on-premises locations.



The company needs to connect the on-premises locations to VPCs in an AWS Region in the AWS Cloud. The number of accounts and VPCs will increase during the next year. The network architecture must simplify the administration of new connections and must provide the ability to scale.



Which solution will meet these requirements with the LEAST administrative overhead?

- [x] Create a transit gateway. Create VPC attachments for the VPC connections. Create VPN attachments for the on-premises connections.
- [ ] Create a peering connection between the VPCs. Create a VPN connection between the VPCs and the on-premises locations.
- [ ] Launch an Amazon EC2 instance. On the instance, include VPN software that uses a VPN connection to connect all VPCs and on-premises locations.
- [ ] Create an AWS Direct Connect connection between the on-premises locations and a central VPC. Connect the central VPC to other VPCs by using peering connections.

---

### Question-676
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, database:relational:multi-az-deployment, database:relational:connection-pooling-proxies, compute:scaling:auto-scaling-groups
**Tags**: ec2, auto-scaling, alb, rds, aurora, rds-proxy
**Quality**: 4/5 — Clear HA requirements with multi-service trade-offs (Multi-AZ vs cross-region, RDS Proxy for connection efficiency); correct answer balances minimal operational effort against full redundancy; distractors are plausible but each violates the 'least operational effort' constraint through unnecessary complexity (cross-region replication, manual snapshots, Lambda architecture).

A company is running a business-critical web application on Amazon EC2 instances behind an Application Load Balancer. The EC2 instances are in an Auto Scaling group. The application uses an Amazon Aurora PostgreSQL database that is deployed in a single Availability Zone. The company wants the application to be highly available with minimum downtime and minimum loss of data.

Which solution will meet these requirements with the LEAST operational effort?

- [x] Configure the Auto Scaling group to use multiple Availability Zones. Configure the database as Multi-AZ. Configure an Amazon RDS Proxy instance for the database.
- [ ] Place the EC2 instances in different AWS Regions. Use Amazon Route 53 health checks to redirect traffic. Use Aurora PostgreSQL Cross-Region Replication.
- [ ] Configure the Auto Scaling group to use one Availability Zone. Generate hourly snapshots of the database. Recover the database from the snapshots in the event of a failure.
- [ ] Configure the Auto Scaling group to use multiple AWS Regions. Write the data from the application to Amazon S3. Use S3 Event Notifications to launch an AWS Lambda function to write the data to the database.

---

### Question-678
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:object:storage-access-patterns, storage:performance:storage-performance-optimization, network:performance:content-delivery-strategy, architecture:ha:multi-az-design
**Tags**: efs, s3, cloudfront, ec2, auto-scaling, ebs, storage-gateway, datasync
**Quality**: 3/5 — Tests understanding of shared storage options and consistency requirements across AZs, but distractors are weakly motivated — EBS multi-attach and Storage Gateway iSCSI have well-known limitations that are instantly recognizable to anyone familiar with these services, and DataSync's batch nature makes it an obvious wrong choice for frequent real-time content changes.

A solutions architect is designing a shared storage solution for a web application that is deployed across multiple Availability Zones. The web application runs on Amazon EC2 instances that are in an Auto Scaling group. The company plans to make frequent changes to the content. The solution must have strong consistency in returning the new content as soon as the changes occur.



Which solutions meet these requirements? (Choose two.)

- [x] Create an Amazon Elastic File System (Amazon EFS) file system. Mount the EFS file system on the individual EC2 instances.
- [x] Create an Amazon S3 bucket to store the web content. Set the metadata for the Cache-Control header to no-cache. Use Amazon CloudFront to deliver the content.
- [ ] Use AWS Storage Gateway Volume Gateway Internet Small Computer Systems Interface (iSCSI) block storage that is mounted to the individual EC2 instances.
- [ ] Create a shared Amazon Elastic Block Store (Amazon EBS) volume. Mount the EBS volume on the individual EC2 instances.
- [ ] Use AWS DataSync to perform continuous synchronization of data between EC2 hosts in the Auto Scaling group.

---

### Question-679
**Difficulty**: easy
**Topics**: network:dns:latency-based-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, network:load-balancing:load-balancing-strategy
**Tags**: route-53, application-load-balancer
**Quality**: 3/5 — Tests basic Route 53 routing policy recall with weak distractors — geolocation/geoproximity are obviously wrong for latency optimization, and CNAME vs A record distinction is trivially eliminable since failover/geoproximity require specific record types; minimal architectural reasoning required.

A company is deploying an application in three AWS Regions using an Application Load Balancer. Amazon Route 53 will be used to distribute traffic between these Regions.



Which Route 53 configuration should a solutions architect use to provide the MOST high-performing experience?

- [x] Create an A record with a latency policy.
- [ ] Create an A record with a geolocation policy.
- [ ] Create a CNAME record with a failover policy.
- [ ] Create a CNAME record with a geoproximity policy.

---

### Question-680
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, database:nosql:consistency-models, cost:optimization:idle-resource-elimination
**Tags**: ec2, auto-scaling, application-load-balancer, dynamodb, aws-dms
**Quality**: 3/5 — Tests basic understanding of HA patterns and managed vs self-managed databases, but distractors are weak — replacing ALB with NLB adds no value for the requirements, and maintaining embedded databases with replication increases operational overhead, making the correct answer obvious without deep architectural reasoning.

A company has a web application that includes an embedded NoSQL database. The application runs on Amazon EC2 instances behind an Application Load Balancer (ALB). The instances run in an Amazon EC2 Auto Scaling group in a single Availability Zone.



A recent increase in traffic requires the application to be highly available and for the database to be eventually consistent.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Modify the Auto Scaling group to use EC2 instances across three Availability Zones. Migrate the embedded NoSQL database to Amazon DynamoDB by using AWS Database Migration Service (AWS DMS).
- [ ] Replace the ALB with a Network Load Balancer. Maintain the embedded NoSQL database with its replication service on the EC2 instances.
- [ ] Replace the ALB with a Network Load Balancer. Migrate the embedded NoSQL database to Amazon DynamoDB by using AWS Database Migration Service (AWS DMS).
- [ ] Modify the Auto Scaling group to use EC2 instances across three Availability Zones. Maintain the embedded NoSQL database with its replication service on the EC2 instances.

---

### Question-681
**Difficulty**: medium
**Topics**: database:caching:in-memory-caching, database:caching:session-state-caching, architecture:ha:multi-az-design, storage:object:storage-access-patterns
**Tags**: elasticache, redis, dynamodb, alb, opensearch, ebs
**Quality**: 3/5 — Tests basic caching and session storage concepts but distractors are weak — sticky sessions don't preserve data across reconnects, OpenSearch is a search engine (not a session store), and EBS snapshots don't provide HA — eliminating incorrect answers requires only service-function recall rather than architectural trade-off reasoning.

A company is building a shopping application on AWS. The application offers a catalog that changes once each month and needs to scale with traffic volume. The company wants the lowest possible latency from the application. Data from each user's shopping cart needs to be highly available. User session data must be available even if the user is disconnected and reconnects.



What should a solutions architect do to ensure that the shopping cart data is preserved at all times?

- [x] Configure Amazon ElastiCache for Redis to cache catalog data from Amazon DynamoDB and shopping cart data from the user's session.
- [ ] Configure an Application Load Balancer to enable the sticky sessions feature (session affinity) for access to the catalog in Amazon Aurora.
- [ ] Configure Amazon OpenSearch Service to cache catalog data from Amazon DynamoDB and shopping cart data from the user's session.
- [ ] Configure an Amazon EC2 instance with Amazon Elastic Block Store (Amazon EBS) storage for the catalog and shopping cart. Configure automated snapshots.

---

### Question-684
**Difficulty**: medium
**Topics**: network:architecture:multi-tier-network-design, network:load-balancing:load-balancing-strategy, security:network:public-private-subnets, architecture:ha:multi-az-design
**Tags**: vpc, ec2, alb, security-group
**Quality**: 4/5 — Clear scenario with a specific constraint (EC2 in private subnets) and a concrete problem (external traffic cannot reach web server); the correct answer requires understanding that an ALB in a public subnet can route traffic to private instances, while distractors either misunderstand NAT gateway purpose (outbound, not inbound), misinterpret Auto Scaling groups as routing entities, or violate the security mandate by requiring public IPs.

A solutions architect creates a VPC that includes two public subnets and two private subnets. A corporate security mandate requires the solutions architect to launch all Amazon EC2 instances in a private subnet. However, when the solutions architect launches an EC2 instance that runs a web server on ports 80 and 443 in a private subnet, no external internet traffic can connect to the server.



What should the solutions architect do to resolve this issue?

- [x] Provision an internet-facing Application Load Balancer (ALB) in a public subnet. Add the EC2 instance to the target group that is associated with the ALEnsure that the DNS record for the website resolves to the ALB.
- [ ] Attach the EC2 instance to an Auto Scaling group in a private subnet. Ensure that the DNS record for the website resolves to the Auto Scaling group identifier.
- [ ] Launch a NAT gateway in a private subnet. Update the route table for the private subnets to add a default route to the NAT gateway. Attach a public Elastic IP address to the NAT gateway.
- [ ] Ensure that the security group that is attached to the EC2 instance allows HTTP traffic on port 80 and HTTPS traffic on port 443. Ensure that the DNS record for the website resolves to the public IP address of the EC2 instance.

---

### Question-685
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:performance:storage-durability-replication, compute:containers:container-orchestration, architecture:ha:multi-az-design
**Tags**: eks, fargate, efs, ebs, kubernetes, storageclass
**Quality**: 4/5 — Clear scenario with well-defined constraints (HA, fault-tolerant, shared, low operational overhead) and meaningful distractors — EBS multi-attach and single-volume options both fail on either fault tolerance or sharing requirements, while the Lambda sync option adds unnecessary operational complexity; EFS is the only solution meeting all requirements with minimal overhead.

A company is deploying a new application to Amazon Elastic Kubernetes Service (Amazon EKS) with an AWS Fargate cluster. The application needs a storage solution for data persistence. The solution must be highly available and fault tolerant. The solution also must be shared between multiple application containers.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Create an Amazon Elastic File System (Amazon EFS) file system. Register the file system in a StorageClass object on an EKS cluster. Use the same file system for all containers.
- [ ] Create Amazon Elastic Block Store (Amazon EBS) volumes in the same Availability Zones where EKS worker nodes are placed. Register the volumes in a StorageClass object on an EKS cluster. Use EBS Multi-Attach to share the data between containers.
- [ ] Create an Amazon Elastic Block Store (Amazon EBS) volume. Register the volume in a StorageClass object on an EKS cluster. Use the same volume for all containers.
- [ ] Create Amazon Elastic File System (Amazon EFS) file systems in the same Availability Zones where EKS worker nodes are placed. Register the file systems in a StorageClass object on an EKS cluster. Create an AWS Lambda function to synchronize the data between file systems.

---

### Question-688
**Difficulty**: medium
**Topics**: network:load-balancing:health-check-configuration, network:load-balancing:layer4-vs-layer7-balancing, compute:scaling:auto-scaling-groups, architecture:resilience:health-endpoint-pattern, architecture:ha:multi-az-design
**Tags**: nlb, alb, ec2, auto-scaling, health-checks
**Quality**: 4/5 — Well-designed scenario with clear constraints (HTTP error detection without custom code, automatic remediation) that requires understanding NLB's Layer 4 limitation, ALB's Layer 7 HTTP health check capability, and Auto Scaling integration; distractors are plausible but each fails on a specific architectural requirement.

A company's HTTP application is behind a Network Load Balancer (NLB). The NLB's target group is configured to use an Amazon EC2 Auto Scaling group with multiple EC2 instances that run the web service.

The company notices that the NLB is not detecting HTTP errors for the application. These errors require a manual restart of the EC2 instances that run the web service. The company needs to improve the application's availability without writing custom scripts or code.

What should a solutions architect do to meet these requirements?

- [x] Replace the NLB with an Application Load Balancer. Enable HTTP health checks by supplying the URL of the company's application. Configure an Auto Scaling action to replace unhealthy instances.
- [ ] Enable HTTP health checks on the NLB, supplying the URL of the company's application.
- [ ] Add a cron job to the EC2 instances to check the local application's logs once each minute. If HTTP errors are detected. the application will restart.
- [ ] Create an Amazon Cloud Watch alarm that monitors the UnhealthyHostCount metric for the NLB. Configure an Auto Scaling action to replace unhealthy instances when the alarm is in the ALARM state.

---

### Question-689
**Difficulty**: hard
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, architecture:ha:regional-failover
**Tags**: nlb, global-accelerator, route-53, ec2
**Quality**: 5/5 — Multi-constraint scenario (TCP/UDP protocols, multi-region, low latency, high availability) requires reasoning through protocol support (NLB for Layer 4, not ALB), Global Accelerator's automated failover and latency-based routing capabilities, and why Route 53 geolocation or CloudFront are insufficient — each distractor fails on exactly one critical requirement.

A gaming company wants to launch a new internet-facing application in multiple AWS Regions. The application will use the TCP and UDP protocols for communication. The company needs to provide high availability and minimum latency for global users.



Which combination of actions should a solutions architect take to meet these requirements? (Choose two.)

- [x] Create internal Network Load Balancers in front of the application in each Region.
- [x] Create an AWS Global Accelerator accelerator to route traffic to the load balancers in each Region.
- [ ] Create external Application Load Balancers in front of the application in each Region.
- [ ] Configure Amazon Route 53 to use a geolocation routing policy to distribute the traffic.
- [ ] Configure Amazon CloudFront to handle the traffic and route requests to the application in each Region

---

### Question-691
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:performance:storage-performance-optimization, storage:object:storage-access-patterns, compute:containers:container-networking-modes, architecture:ha:multi-az-design
**Tags**: snowball, s3, fsx-for-lustre, hpc, storage-gateway, efs
**Quality**: 4/5 — Well-structured scenario with clear performance constraints (sub-millisecond latency, high throughput) that correctly eliminate three distractors: Storage Gateway adds latency, EFS lacks HPC optimization, and direct FSx import skips S3 staging — requires understanding HPC workload patterns and FSx-S3 integration.

A company copies 200 TB of data from a recent ocean survey onto AWS Snowball Edge Storage Optimized devices. The company has a high performance computing (HPC) cluster that is hosted on AWS to look for oil and gas deposits. A solutions architect must provide the cluster with consistent sub-millisecond latency and high-throughput access to the data on the Snowball Edge Storage Optimized devices. The company is sending the devices back to AWS.



Which solution will meet these requirements?

- [x] Create an Amazon S3 bucket. Import the data into the S3 bucket. Configure an Amazon FSx for Lustre file system, and integrate it with the S3 bucket. Access the FSx for Lustre file system from the HPC cluster instances.
- [ ] Create an Amazon S3 bucket. Import the data into the S3 bucket. Configure an AWS Storage Gateway file gateway to use the S3 bucket. Access the file gateway from the HPC cluster instances.
- [ ] Create an Amazon S3 bucket and an Amazon Elastic File System (Amazon EFS) file system. Import the data into the S3 bucket. Copy the data from the S3 bucket to the EFS file system. Access the EFS file system from the HPC cluster instances.
- [ ] Create an Amazon FSx for Lustre file system. Import the data directly into the FSx for Lustre file system. Access the FSx for Lustre file system from the HPC cluster instances.

---

### Question-693
**Difficulty**: medium
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:load-balancing:load-balancing-strategy, compute:cost:compute-purchasing-options, architecture:ha:multi-az-design
**Tags**: nlb, alb, glb, ec2, udp
**Quality**: 4/5 — Clear requirements (UDP protocol, millions of requests/sec, ultra-low latency, cost-effectiveness) with strong distractors that each violate a key constraint: ALB doesn't support UDP, GLB is for appliance traffic, and multi-region adds unnecessary cost without solving the core problem.

An online video game company must maintain ultra-low latency for its game servers. The game servers run on Amazon EC2 instances. The company needs a solution that can handle millions of UDP internet traffic requests each second.



Which solution will meet these requirements MOST cost-effectively?

- [x] Configure a Network Load Balancer with the required protocol and ports for the internet traffic. Specify the EC2 instances as the targets.
- [ ] Configure an Application Load Balancer with the required protocol and ports for the internet traffic. Specify the EC2 instances as the targets.
- [ ] Configure a Gateway Load Balancer for the internet traffic. Specify the EC2 instances as the targets.
- [ ] Launch an identical set of game servers on EC2 instances in separate AWS Regions. Route internet traffic to both sets of EC2 instances.

---

### Question-695
**Difficulty**: easy
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design, cost:optimization:rightsizing-compute
**Tags**: rds, read-replica
**Quality**: 3/5 — Tests basic RDS read replica concept but lacks depth — the scenario provides minimal justification for why read replicas are superior to alternatives, and distractors are weak (manual instance selection is not feasible, manual exports are impractical, ElastiCache adds complexity rather than reducing overhead), making this primarily a service-recall question rather than architectural reasoning.

A company hosts a database that runs on an Amazon RDS instance that is deployed to multiple Availability Zones. The company periodically runs a script against the database to report new entries that are added to the database. The script that runs against the database negatively affects the performance of a critical application. The company needs to improve application performance with minimal costs.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Create a read replica of the database. Configure the script to query only the read replica to report the total new entries.
- [ ] Add functionality to the script to identify the instance that has the fewest active connections. Configure the script to read from that instance to report the total new entries.
- [ ] Instruct the development team to manually export the new entries for the day in the database at the end of each day.
- [ ] Use Amazon ElastiCache to cache the common queries that the script runs against the database.

---

### Question-701
**Difficulty**: medium
**Topics**: database:performance:connection-pool-sizing, database:performance:read-vs-write-intensive, architecture:ha:multi-az-design, compute:scaling:horizontal-scaling
**Tags**: aurora, rds-proxy, rds
**Quality**: 3/5 — Tests understanding of Aurora read scaling and connection pooling but lacks specificity about timeout root cause (connection exhaustion vs resource contention), making the correct answer somewhat obvious through process of elimination rather than deep architectural reasoning.

An ecommerce company runs its application on AWS. The application uses an Amazon Aurora PostgreSQL cluster in Multi-AZ mode for the underlying database. During a recent promotional campaign, the application experienced heavy read load and write load. Users experienced timeout issues when they attempted to access the application.



A solutions architect needs to make the application architecture more scalable and highly available.



Which solution will meet these requirements with the LEAST downtime?

- [x] Add additional reader instances to the Aurora cluster. Create an Amazon RDS Proxy target group for the Aurora cluster.
- [ ] Create an Amazon EventBridge rule that has the Aurora cluster as a source. Create an AWS Lambda function to log the state change events of the Aurora cluster. Add the Lambda function as a target for the EventBridge rule. Add additional reader nodes to fail over to.
- [ ] Modify the Aurora cluster and activate the zero-downtime restart (ZDR) feature. Use Database Activity Streams on the cluster to track the cluster status.
- [ ] Create an Amazon ElastiCache for Redis cache. Replicate data from the Aurora cluster to Redis by using AWS Database Migration Service (AWS DMS) with a write-around approach.

---

### Question-707
**Difficulty**: medium
**Topics**: architecture:migration:lift-and-shift, network:connectivity:hybrid-network-connectivity, architecture:ha:multi-az-design, storage:object:event-notification-triggers, compute:serverless:event-driven-architectures
**Tags**: transfer-family, sftp, s3, lambda, eventbridge
**Quality**: 4/5 — Well-structured scenario with clear requirements (immediate processing, security, resilience, SFTP protocol, on-premises integration) that meaningfully differentiate correct answer from plausible distractors; each wrong answer violates exactly one key requirement (internet-facing exposure, single AZ, EFS incompatibility with Transfer Family, or rejection of Transfer Family workflows).

A company wants to migrate an on-premises legacy application to AWS. The application ingests customer order files from an on-premises enterprise resource planning (ERP) system. The application then uploads the files to an SFTP server. The application uses a scheduled job that checks for order files every hour.



The company already has an AWS account that has connectivity to the on-premises network. The new application on AWS must support integration with the existing ERP system. The new application must be secure and resilient and must use the SFTP protocol to process orders from the ERP system immediately.



Which solution will meet these requirements?

- [x] Create an AWS Transfer Family SFTP internal server in two Availability Zones. Use Amazon S3 storage. Create an AWS Lambda function to process order files. Use a Transfer Family managed workflow to invoke the Lambda function.
- [ ] Create an AWS Transfer Family SFTP internet-facing server in two Availability Zones. Use Amazon S3 storage. Create an AWS Lambda function to process order files. Use S3 Event Notifications to send s3:ObjectCreated:* events to the Lambda function.
- [ ] Create an AWS Transfer Family SFTP internet-facing server in one Availability Zone. Use Amazon Elastic File System (Amazon EFS) storage. Create an AWS Lambda function to process order files. Use a Transfer Family managed workflow to invoke the Lambda function.
- [ ] Create an AWS Transfer Family SFTP internal server in two Availability Zones. Use Amazon Elastic File System (Amazon EFS) storage. Create an AWS Step Functions state machine to process order files. Use Amazon EventBridge Scheduler to invoke the state machine to periodically check Amazon EFS for order files.

---

### Question-713
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, network:routing:transit-gateway-routing, network:connectivity:hybrid-network-connectivity, architecture:ha:multi-region-design, governance:automation:infrastructure-as-code
**Tags**: direct-connect, transit-gateway, vpc, virtual-private-gateway
**Quality**: 4/5 — Clear multi-constraint scenario (30 VPCs, central management, on-premises connectivity, minimal overhead) that requires understanding transit gateway benefits over manual peering or VPN alternatives; distractors are plausible but each introduces operational complexity that the correct answer elegantly avoids through route propagation automation.

A company has an AWS Direct Connect connection from its on-premises location to an AWS account. The AWS account has 30 different VPCs in the same AWS Region. The VPCs use private virtual interfaces (VIFs). Each VPC has a CIDR block that does not overlap with other networks under the company's control.



The company wants to centrally manage the networking architecture while still allowing each VPC to communicate with all other VPCs and on-premises networks.



Which solution will meet these requirements with the LEAST amount of operational overhead?

- [x] Create a transit gateway, and associate the Direct Connect connection with a new transit VIF. Turn on the transit gateway's route propagation feature.
- [ ] Create a Direct Connect gateway. Recreate the private VIFs to use the new gateway. Associate each VPC by creating new virtual private gateways.
- [ ] Create a transit VPConnect the Direct Connect connection to the transit VPCreate a peering connection between all other VPCs in the Region. Update the route tables.
- [ ] Create AWS Site-to-Site VPN connections from on premises to each VPC. Ensure that both VPN tunnels are UP for each connection. Turn on the route propagation feature.

---

### Question-715
**Difficulty**: easy
**Topics**: compute:scaling:horizontal-scaling, compute:containers:container-orchestration, architecture:ha:multi-az-design, architecture:resilience:fault-tolerance-design
**Tags**: eks, kubernetes, ec2, auto-scaling
**Quality**: 3/5 — Tests basic EKS scaling concepts but lacks scenario depth — no traffic patterns, node types, or cost constraints are provided; distractors are weak (Lambda for cluster resizing, tracking memory alone, distributing across ASGs) and easily eliminable without deep architectural reasoning.

A company runs container applications by using Amazon Elastic Kubernetes Service (Amazon EKS) and the Kubernetes Horizontal Pod Autoscaler. The workload is not consistent throughout the day. A solutions architect notices that the number of nodes does not automatically scale out when the existing nodes have reached maximum capacity in the cluster, which causes performance issues.



Which solution will resolve this issue with the LEAST administrative overhead?

- [x] Use the Kubernetes Cluster Autoscaler to manage the number of nodes in the cluster.
- [ ] Scale out the nodes by tracking the memory usage.
- [ ] Use an AWS Lambda function to resize the EKS cluster automatically.
- [ ] Use an Amazon EC2 Auto Scaling group to distribute the workload.

---

### Question-720
**Difficulty**: medium
**Topics**: compute:scaling:predictive-vs-reactive-scaling, compute:scaling:target-tracking-scaling, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, cloudwatch
**Quality**: 4/5 — Tests understanding of scaling strategy trade-offs — predictive scaling for historical trend forecasting vs dynamic scaling for live utilization — with strong distractors that each address partial requirements (step scaling ignores forecasting, scheduled scaling ignores live changes, simple scaling lacks forecasting capability).

A company runs a three-tier web application in a VPC across multiple Availability Zones. Amazon EC2 instances run in an Auto Scaling group for the application tier.



The company needs to make an automated scaling plan that will analyze each resource's daily and weekly historical workload trends. The configuration must scale resources appropriately according to both the forecast and live changes in utilization.



Which scaling strategy should a solutions architect recommend to meet these requirements?

- [x] Enable predictive scaling to forecast and scale. Configure dynamic scaling with target tracking
- [ ] Implement dynamic scaling with step scaling based on average CPU utilization from the EC2 instances.
- [ ] Create an automated scheduled scaling action based on the traffic patterns of the web application.
- [ ] Set up a simple scaling policy. Increase the cooldown period based on the EC2 instance startup time.

---

### Question-726
**Difficulty**: medium
**Topics**: network:connectivity:hybrid-network-connectivity, network:connectivity:direct-connect-hybrid, network:routing:transit-gateway-routing, architecture:ha:multi-region-design, network:architecture:vpc-design
**Tags**: direct-connect, direct-connect-gateway, vpc, vpn, transit-gateway
**Quality**: 4/5 — Well-structured multi-region hybrid connectivity scenario with clear requirements (scalability, low overhead, non-overlapping CIDRs) that correctly directs toward Direct Connect Gateway as the scalable hub for on-premises and multi-region connectivity; distractors are plausible alternatives (VPC peering, private VIFs, VPN mesh) that each fail on scalability or operational overhead grounds.

A company has an AWS Direct Connect connection from its corporate data center to its VPC in the us-east-1 Region. The company recently acquired a corporation that has several VPCs and a Direct Connect connection between its on-premises data center and the eu-west-2 Region. The CIDR blocks for the VPCs of the company and the corporation do not overlap. The company requires connectivity between two Regions and the data centers. The company needs a solution that is scalable while reducing operational overhead.



What should a solutions architect do to meet these requirements?

- [x] Connect the existing Direct Connect connection to a Direct Connect gateway. Route traffic from the virtual private gateways of the VPCs in each Region to the Direct Connect gateway.
- [ ] Set up inter-Region VPC peering between the VPC in us-east-1 and the VPCs in eu-west-2.
- [ ] Create private virtual interfaces from the Direct Connect connection in us-east-1 to the VPCs in eu-west-2.
- [ ] Establish VPN appliances in a fully meshed VPN network hosted by Amazon EC2. Use AWS VPN CloudHub to send and receive data between the data centers and each VPC.

---

### Question-727
**Difficulty**: medium
**Topics**: data:streaming:streaming-data-architectures, data:ingestion:streaming-data-ingestion, compute:serverless:event-driven-architectures, database:nosql:global-tables-replication, architecture:ha:multi-az-design
**Tags**: kinesis, lambda, dynamodb
**Quality**: 4/5 — Clear scenario with multiple constraints (handle spikes, maintain order, minimize management) that requires understanding why Kinesis preserves ordering, Lambda eliminates operational overhead, and DynamoDB provides HA — distractors plausibly fail on specific dimensions (EC2 requires management, SNS loses ordering, SQS with EC2 adds operational burden) but are not trivially eliminable.

A company is developing a mobile game that streams score updates to a backend processor and then posts results on a leaderboard. A solutions architect needs to design a solution that can handle large traffic spikes, process the mobile game updates in order of receipt, and store the processed updates in a highly available database. The company also wants to minimize the management overhead required to maintain the solution.



What should the solutions architect do to meet these requirements?

- [x] Push score updates to Amazon Kinesis Data Streams. Process the updates in Kinesis Data Streams with AWS Lambda. Store the processed updates in Amazon DynamoDB.
- [ ] Push score updates to Amazon Kinesis Data Streams. Process the updates with a fleet of Amazon EC2 instances set up for Auto Scaling. Store the processed updates in Amazon Redshift.
- [ ] Push score updates to an Amazon Simple Notification Service (Amazon SNS) topic. Subscribe an AWS Lambda function to the SNS topic to process the updates. Store the processed updates in a SQL database running on Amazon EC2.
- [ ] Push score updates to an Amazon Simple Queue Service (Amazon SQS) queue. Use a fleet of Amazon EC2 instances with Auto Scaling to process the updates in the SQS queue. Store the processed updates in an Amazon RDS Multi-AZ DB instance.

---

### Question-728
**Difficulty**: medium
**Topics**: storage:object:cross-region-replication, storage:object:storage-access-patterns, cost:optimization:data-transfer-cost-reduction, architecture:ha:multi-az-design
**Tags**: s3, s3-same-region-replication
**Quality**: 3/5 — Tests understanding of S3 replication options and cost-effectiveness, but the scenario lacks multi-account complexity details and distractors are somewhat weak (Lifecycle policies don't copy between buckets, daily scripts are obviously inefficient) — a stronger question would explore cross-account replication mechanisms or clarify why SRR vs other replication types matters.

A company has multiple AWS accounts with applications deployed in the us-west-2 Region. Application logs are stored within Amazon S3 buckets in each account. The company wants to build a centralized log analysis solution that uses a single S3 bucket. Logs must not leave us-west-2, and the company wants to incur minimal operational overhead.



Which solution meets these requirements and is MOST cost-effective?

- [x] Use S3 Same-Region Replication to replicate logs from the S3 buckets to another S3 bucket in us-west-2. Use this S3 bucket for log analysis.
- [ ] Create an S3 Lifecycle policy that copies the objects from one of the application S3 buckets to the centralized S3 bucket.
- [ ] Write a script that uses the PutObject API operation every day to copy the entire contents of the buckets to another S3 bucket in us-west-2. Use this S3 bucket for log analysis.
- [ ] Write AWS Lambda functions in these accounts that are triggered every time logs are delivered to the S3 buckets (s3:ObjectCreated:* event). Copy the logs to another S3 bucket in us-west-2. Use this S3 bucket for log analysis.

---

### Question-729
**Difficulty**: medium
**Topics**: storage:object:cross-region-replication, storage:object:storage-access-patterns, network:performance:latency-optimization, architecture:ha:multi-region-design
**Tags**: s3, s3-multi-region-access-point
**Quality**: 4/5 — Well-structured scenario with clear multi-region latency requirements; correctly identifies that bidirectional replication + Multi-Region Access Point minimize application changes while achieving global low-latency access; distractors meaningfully differ by using one-way replication (inconsistent data across regions) or partial Multi-Region Access Point usage (still requiring app changes for uploads).

A company has an application that delivers on-demand training videos to students around the world. The application also allows authorized content developers to upload videos. The data is stored in an Amazon S3 bucket in the us-east-2 Region.



The company has created an S3 bucket in the eu-west-2 Region and an S3 bucket in the ap-southeast-1 Region. The company wants to replicate the data to the new S3 buckets. The company needs to minimize latency for developers who upload videos and students who stream videos near eu-west-2 and ap-southeast-1.



Which combination of steps will meet these requirements with the FEWEST changes to the application? (Choose two.)

- [x] Configure two-way (bidirectional) replication among the S3 buckets that are in all three Regions.
- [x] Create an S3 Multi-Region Access Point. Modify the application to use the Amazon Resource Name (ARN) of the Multi-Region Access Point for video streaming and uploads.
- [ ] Configure one-way replication from the us-east-2 S3 bucket to the eu-west-2 S3 bucket. Configure one-way replication from the us-east-2 S3 bucket to the ap-southeast-1 S3 bucket.
- [ ] Configure one-way replication from the us-east-2 S3 bucket to the eu-west-2 S3 bucket. Configure one-way replication from the eu-west-2 S3 bucket to the ap-southeast-1 S3 bucket.
- [ ] Create an S3 Multi-Region Access Point. Modify the application to use the Amazon Resource Name (ARN) of the Multi-Region Access Point for video streaming. Do not modify the application for video uploads.

---

### Question-734
**Difficulty**: easy
**Topics**: network:dns:private-vs-public-dns-zones, architecture:ha:multi-region-design, security:compliance:audit-logging-requirements
**Tags**: route-53, dns
**Quality**: 2/5 — Tests basic Route 53 service selection but distractors are trivially eliminable — private hosted zones are for internal DNS, Simple AD is for directory services, and inbound endpoints are for hybrid DNS forwarding — all clearly wrong without requiring architectural reasoning about the migration scenario.

The DNS provider that hosts a company's domain name records is experiencing outages that cause service disruption for a website running on AWS. The company needs to migrate to a more resilient managed DNS service and wants the service to run on AWS.



What should a solutions architect do to rapidly migrate the DNS hosting service?

- [x] Create an Amazon Route 53 public hosted zone for the domain name. Import the zone file containing the domain records hosted by the previous provider.
- [ ] Create an Amazon Route 53 private hosted zone for the domain name. Import the zone file containing the domain records hosted by the previous provider.
- [ ] Create a Simple AD directory in AWS. Enable zone transfer between the DNS provider and AWS Directory Service for Microsoft Active Directory for the domain records.
- [ ] Create an Amazon Route 53 Resolver inbound endpoint in the VPC. Specify the IP addresses that the provider's DNS will forward DNS queries to. Configure the provider's DNS to forward DNS queries for the domain to the IP addresses that are specified in the inbound endpoint.

---

### Question-739
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, compute:instances:placement-group-strategy, network:performance:latency-optimization, architecture:ha:multi-az-design
**Tags**: ec2, vpc, placement-group, enhanced-networking
**Quality**: 3/5 — Tests direct recall of EC2 networking features for low-latency streaming, but scenario lacks detail on traffic patterns, data volumes, or geographic distribution; distractors are weak (separate accounts and EBS optimization are unrelated to latency), making the question more about service name recognition than architectural reasoning.

A company is deploying an application that processes streaming data in near-real time. The company plans to use Amazon EC2 instances for the workload. The network architecture must be configurable to provide the lowest possible latency between nodes.



Which combination of network solutions will meet these requirements? (Choose two.)

- [x] Enable and configure enhanced networking on each EC2 instance.
- [x] Run the EC2 instances in a cluster placement group.
- [ ] Group the EC2 instances in separate accounts.
- [ ] Attach multiple elastic network interfaces to each EC2 instance.
- [ ] Use Amazon Elastic Block Store (Amazon EBS) optimized instance types.

---

### Question-747
**Difficulty**: medium
**Topics**: storage:hybrid:file-gateway-patterns, network:connectivity:hybrid-network-connectivity, compute:scaling:scheduled-scaling, architecture:ha:multi-az-design, storage:performance:storage-performance-optimization
**Tags**: aws-transfer-for-sftp, efs, ec2, auto-scaling, s3
**Quality**: 4/5 — Well-structured scenario with clear HA and operational-effort constraints; correct answer combines managed SFTP (AWS Transfer) with shared storage (EFS) and scheduled scaling, while distractors each introduce operational burden (managing SFTP service, single instance, or S3 fetch logic) — requires understanding service capabilities and trade-offs.

A company has a nightly batch processing routine that analyzes report files that an on-premises file system receives daily through SFTP. The company wants to move the solution to the AWS Cloud. The solution must be highly available and resilient. The solution also must minimize operational effort.



Which solution meets these requirements?

- [x] Deploy AWS Transfer for SFTP and an Amazon Elastic File System (Amazon EFS) file system for storage. Use an Amazon EC2 instance in an Auto Scaling group with a scheduled scaling policy to run the batch operation.
- [ ] Deploy an Amazon EC2 instance that runs Linux and an SFTP service. Use an Amazon Elastic Block Store (Amazon EBS) volume for storage. Use an Auto Scaling group with the minimum number of instances and desired number of instances set to 1.
- [ ] Deploy an Amazon EC2 instance that runs Linux and an SFTP service. Use an Amazon Elastic File System (Amazon EFS) file system for storage. Use an Auto Scaling group with the minimum number of instances and desired number of instances set to 1.
- [ ] Deploy AWS Transfer for SFTP and an Amazon S3 bucket for storage. Modify the application to pull the batch files from Amazon S3 to an Amazon EC2 instance for processing. Use an EC2 instance in an Auto Scaling group with a scheduled scaling policy to run the batch operation.

---

### Question-748
**Difficulty**: medium
**Topics**: network:performance:global-anycast-routing, network:load-balancing:layer4-vs-layer7-balancing, security:application:web-application-firewall, architecture:ha:multi-region-design, network:performance:latency-optimization
**Tags**: alb, nlb, global-accelerator, waf, cloudfront, route-53, ec2
**Quality**: 4/5 — Well-structured scenario with clear constraints (global users, availability, performance, web exploit protection, static IPs) that require multi-step reasoning: ALB for Layer 7 WAF support, Global Accelerator for static IPs and multi-region failover, and careful elimination of CloudFront/Route 53 options that lack static IPs or WAF integration.

A company has users all around the world accessing its HTTP-based application deployed on Amazon EC2 instances in multiple AWS Regions. The company wants to improve the availability and performance of the application. The company also wants to protect the application against common web exploits that may affect availability, compromise security, or consume excessive resources. Static IP addresses are required.



What should a solutions architect recommend to accomplish this?

- [x] Put the EC2 instances behind Application Load Balancers (ALBs) in each Region. Deploy AWS WAF on the ALBs. Create an accelerator using AWS Global Accelerator and register the ALBs as endpoints.
- [ ] Put the EC2 instances behind Network Load Balancers (NLBs) in each Region. Deploy AWS WAF on the NLBs. Create an accelerator using AWS Global Accelerator and register the NLBs as endpoints.
- [ ] Put the EC2 instances behind Network Load Balancers (NLBs) in each Region. Deploy AWS WAF on the NLBs. Create an Amazon CloudFront distribution with an origin that uses Amazon Route 53 latency-based routing to route requests to the NLBs.
- [ ] Put the EC2 instances behind Application Load Balancers (ALBs) in each Region. Create an Amazon CloudFront distribution with an origin that uses Amazon Route 53 latency-based routing to route requests to the ALBs. Deploy AWS WAF on the CloudFront distribution.

---

### Question-749
**Difficulty**: medium
**Topics**: database:relational:connection-pooling-proxies, database:relational:database-connections-proxies, architecture:ha:multi-az-design, architecture:dr:recovery-time-objective
**Tags**: rds, aurora, rds-proxy
**Quality**: 3/5 — Tests knowledge of RDS Proxy's connection pooling benefit but lacks specific context on why connection pooling reduces failover time, and distractors are weakly justified — switching database engines or to DynamoDB/Redshift doesn't directly address the stated 'too many connections' error or failover time reduction.

A company’s data platform uses an Amazon Aurora MySQL database. The database has multiple read replicas and multiple DB instances across different Availability Zones. Users have recently reported errors from the database that indicate that there are too many connections. The company wants to reduce the failover time by 20% when a read replica is promoted to primary writer.



Which solution will meet this requirement?

- [x] Use Amazon RDS Proxy in front of the Aurora database.
- [ ] Switch from Aurora to Amazon RDS with Multi-AZ cluster deployment.
- [ ] Switch to Amazon DynamoDB with DynamoDB Accelerator (DAX) for read connections.
- [ ] Switch to Amazon Redshift with relocation capability.

---

### Question-752
**Difficulty**: medium
**Topics**: compute:containers:container-orchestration, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy
**Tags**: ecs, ec2, eks, lambda, auto-scaling, vpc
**Quality**: 3/5 — Tests basic understanding of container orchestration and HA across AZs, but distractors are somewhat weak — EKS self-managed nodes requires more operational overhead (obvious), Lambda for containerized workloads is a clear mismatch, and EC2 Reserved Instances doesn't address orchestration — limiting the reasoning required to eliminate wrong answers.

A company wants to deploy its containerized application workloads to a VPC across three Availability Zones. The company needs a solution that is highly available across Availability Zones. The solution must require minimal changes to the application.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Use Amazon Elastic Container Service (Amazon ECS). Configure Amazon ECS Service Auto Scaling to use target tracking scaling. Set the minimum capacity to 3. Set the task placement strategy type to spread with an Availability Zone attribute.
- [ ] Use Amazon Elastic Kubernetes Service (Amazon EKS) self-managed nodes. Configure Application Auto Scaling to use target tracking scaling. Set the minimum capacity to 3.
- [ ] Use Amazon EC2 Reserved Instances. Launch three EC2 instances in a spread placement group. Configure an Auto Scaling group to use target tracking scaling. Set the minimum capacity to 3.
- [ ] Use an AWS Lambda function. Configure the Lambda function to connect to a VPC. Configure Application Auto Scaling to use Lambda as a scalable target. Set the minimum capacity to 3.

---

### Question-759
**Difficulty**: medium
**Topics**: architecture:migration:lift-and-shift, network:architecture:multi-tier-network-design, security:network:public-private-subnets, database:relational:point-in-time-recovery, architecture:ha:multi-az-design
**Tags**: ec2, aurora, rds, vpc, mysql
**Quality**: 3/5 — Tests understanding of lift-and-shift migration patterns and database PITR capabilities, but distractors are weak — options with web tier in private subnets or database in public subnets violate basic three-tier architecture principles and are trivially eliminable without deeper reasoning about operational overhead trade-offs.

A company wants to migrate its three-tier application from on premises to AWS. The web tier and the application tier are running on third-party virtual machines (VMs). The database tier is running on MySQL.



The company needs to migrate the application by making the fewest possible changes to the architecture. The company also needs a database solution that can restore data to a specific point in time.



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Migrate the web tier to Amazon EC2 instances in public subnets. Migrate the application tier to EC2 instances in private subnets. Migrate the database tier to Amazon Aurora MySQL in private subnets.
- [ ] Migrate the web tier and the application tier to Amazon EC2 instances in private subnets. Migrate the database tier to Amazon RDS for MySQL in private subnets.
- [ ] Migrate the web tier to Amazon EC2 instances in public subnets. Migrate the application tier to EC2 instances in private subnets. Migrate the database tier to Amazon RDS for MySQL in private subnets.
- [ ] Migrate the web tier and the application tier to Amazon EC2 instances in public subnets. Migrate the database tier to Amazon Aurora MySQL in public subnets.

---

### Question-768
**Difficulty**: easy
**Topics**: compute:containers:container-orchestration, compute:serverless:serverless-patterns, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: ecs, eks, fargate, docker, kubernetes
**Quality**: 3/5 — Tests basic service selection for containerized workloads with managed scaling, but distractors are weak — EC2 worker nodes require infrastructure management (eliminating themselves), Lambda cannot run Docker containers directly, and API Gateway is irrelevant — making this more recall-based than architectural reasoning.

A company built an application with Docker containers and needs to run the application in the AWS Cloud. The company wants to use a managed service to host the application.



The solution must scale in and out appropriately according to demand on the individual container services. The solution also must not result in additional operational overhead or infrastructure to manage.



Which solutions will meet these requirements? (Choose two.)

- [x] Use Amazon Elastic Container Service (Amazon ECS) with AWS Fargate.
- [x] Use Amazon Elastic Kubernetes Service (Amazon EKS) with AWS Fargate.
- [ ] Provision an Amazon API Gateway API. Connect the API to AWS Lambda to run the containers.
- [ ] Use Amazon Elastic Container Service (Amazon ECS) with Amazon EC2 worker nodes.
- [ ] Use Amazon Elastic Kubernetes Service (Amazon EKS) with Amazon EC2 worker nodes.

---

### Question-769
**Difficulty**: easy
**Topics**: compute:scaling:auto-scaling-groups, compute:cost:compute-purchasing-options, compute:instances:ami-management, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, ami
**Quality**: 3/5 — Tests basic Auto Scaling and cost-effectiveness recall, but distractors are trivially weak — pre-provisioning instances and stopping them, oversizing minimum capacity, and caching strategies for peak handling are all obviously inefficient or irrelevant, leaving little meaningful trade-off analysis.

An ecommerce company is running a seasonal online sale. The company hosts its website on Amazon EC2 instances spanning multiple Availability Zones. The company wants its website to manage sudden traffic increases during the sale.



Which solution will meet these requirements MOST cost-effectively?

- [x] Configure an Auto Scaling group to scale out as traffic increases. Create a launch template to start new instances from a preconfigured Amazon Machine Image (AMI).
- [ ] Create an Auto Scaling group that is large enough to handle peak traffic load. Stop half of the Amazon EC2 instances. Configure the Auto Scaling group to use the stopped instances to scale out when traffic increases.
- [ ] Create an Auto Scaling group for the website. Set the minimum size of the Auto Scaling group so that it can handle high traffic volumes without the need to scale out.
- [ ] Use Amazon CloudFront and Amazon ElastiCache to cache dynamic content with an Auto Scaling group set as the origin. Configure the Auto Scaling group with the instances necessary to populate CloudFront and ElastiCache. Scale in after the cache is fully populated.

---

### Question-788
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, architecture:ha:availability-zone-strategy, security:network:public-private-subnets
**Tags**: ec2, auto-scaling, application-load-balancer, vpc
**Quality**: 4/5 — Clear scenario with well-defined requirements (HA, scalability, no rewrite); both correct answers directly address these needs; distractors are plausible but each fails a core requirement (instance upsizing ignores scalability, NAT gateway doesn't provide load balancing), forcing consideration of architectural best practices.

A company's web application that is hosted in the AWS Cloud recently increased in popularity. The web application currently exists on a single Amazon EC2 instance in a single public subnet. The web application has not been able to meet the demand of the increased web traffic.



The company needs a solution that will provide high availability and scalability to meet the increased user demand without rewriting the web application.



Which combination of steps will meet these requirements? (Choose two.)

- [x] Configure Amazon EC2 Auto Scaling with multiple Availability Zones in private subnets.
- [x] Configure an Application Load Balancer in a public subnet to distribute web traffic.
- [ ] Replace the EC2 instance with a larger compute optimized instance.
- [ ] Configure a NAT gateway in a public subnet to handle web requests.
- [ ] Replace the EC2 instance with a larger memory optimized instance.

---

### Question-798
**Difficulty**: medium
**Topics**: compute:scaling:scaling-metrics-conditions, architecture:patterns:loose-coupling-design, integration:messaging:queuing-concepts, architecture:ha:multi-az-design, compute:scaling:horizontal-scaling
**Tags**: sqs, ec2, auto-scaling
**Quality**: 4/5 — Strong scenario with clear requirements (variable workloads, resiliency, scalability) that require understanding queue-based decoupling and metric-driven scaling; distractors meaningfully differ in architectural approach (scheduled vs queue-based, centralized coordinator vs decoupled, wrong event services) and can only be eliminated through proper reasoning about workload variability and loose coupling.

A company is migrating a distributed application to AWS. The application serves variable workloads. The legacy platform consists of a primary server that coordinates jobs across multiple compute nodes. The company wants to modernize the application with a solution that maximizes resiliency and scalability.

How should a solutions architect design the architecture to meet these requirements?

- [x] Configure an Amazon Simple Queue Service (Amazon SQS) queue as a destination for the jobs. Implement the compute nodes with Amazon EC2 instances that are managed in an Auto Scaling group. Configure EC2 Auto Scaling based on the size of the queue.
- [ ] Configure an Amazon Simple Queue Service (Amazon SQS) queue as a destination for the jobs. Implement the compute nodes with Amazon EC2 instances that are managed in an Auto Scaling group. Configure EC2 Auto Scaling to use scheduled scaling.
- [ ] Implement the primary server and the compute nodes with Amazon EC2 instances that are managed in an Auto Scaling group. Configure AWS CloudTrail as a destination for the jobs. Configure EC2 Auto Scaling based on the load on the primary server.
- [ ] Implement the primary server and the compute nodes with Amazon EC2 instances that are managed in an Auto Scaling group. Configure Amazon EventBridge (Amazon CloudWatch Events) as a destination for the jobs. Configure EC2 Auto Scaling based on the load on the compute nodes.

---

### Question-800
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, storage:file:shared-file-system-design, security:iam:cross-account-access, architecture:ha:multi-az-design
**Tags**: lambda, efs, vpc, vpc-peering, aws-account
**Quality**: 3/5 — The scenario clearly identifies the core requirement (Lambda in primary account accessing EFS in secondary account with cost-effectiveness), but the distractors are weak — DataSync involves redundant storage, invoking a Lambda in another account adds latency and cost, and Lambda layers cannot store EFS mounts — making the correct answer obvious without deep architectural reasoning about cross-account connectivity options.

A company needs to create an AWS Lambda function that will run in a VPC in the company's primary AWS account. The Lambda function needs to access files that the company stores in an Amazon Elastic File System (Amazon EFS) file system. The EFS file system is located in a secondary AWS account. As the company adds files to the file system, the solution must scale to meet the demand.



Which solution will meet these requirements MOST cost-effectively?

- [x] Create a VPC peering connection between the VPCs that are in the primary account and the secondary account.
- [ ] Create a new EFS file system in the primary account. Use AWS DataSync to copy the contents of the original EFS file system to the new EFS file system.
- [ ] Create a second Lambda function in the secondary account that has a mount that is configured for the file system. Use the primary account's Lambda function to invoke the secondary account's Lambda function.
- [ ] Move the contents of the file system to a Lambda layer. Configure the Lambda layer's permissions to allow the company's secondary account to use the Lambda layer.

---

### Question-803
**Difficulty**: medium
**Topics**: security:iam:multi-factor-authentication, security:application:api-authentication-authorization, security:iam:federated-identity, architecture:ha:multi-region-design
**Tags**: cognito, iam, iam-identity-center
**Quality**: 4/5 — Clear requirement (risk-based adaptive MFA for millions of users) with meaningful distractors that test understanding of Cognito user pools vs identity pools, IAM user limitations for consumer apps, and IAM Identity Center's use case; requires reasoning about scalability and authentication patterns rather than simple recall.

A solutions architect is designing a user authentication solution for a company. The solution must invoke two-factor authentication for users that log in from inconsistent geographical locations, IP addresses, or devices. The solution must also be able to scale up to accommodate millions of users.



Which solution will meet these requirements?

- [x] Configure Amazon Cognito user pools for user authentication. Enable the risk-based adaptive authentication feature with multifactor authentication (MFA).
- [ ] Configure Amazon Cognito identity pools for user authentication. Enable multi-factor authentication (MFA).
- [ ] Configure AWS Identity and Access Management (IAM) users for user authentication. Attach an IAM policy that allows the AllowManageOwnUserMFA action.
- [ ] Configure AWS IAM Identity Center (AWS Single Sign-On) authentication for user authentication. Configure the permission sets to require multi-factor authentication (MFA).

---

### Question-816
**Difficulty**: medium
**Topics**: network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design, network:load-balancing:load-balancing-strategy
**Tags**: global-accelerator, nlb, ec2, route-53
**Quality**: 3/5 — Tests direct recall of Global Accelerator's purpose for global load distribution and latency reduction, but distractors are weak — replacing NLBs with ALBs and Route 53 weighted routing are trivially eliminable without reasoning about why Global Accelerator specifically improves performance.

An online gaming company hosts its platform on Amazon EC2 instances behind Network Load Balancers (NLBs) across multiple AWS Regions. The NLBs can route requests to targets over the internet. The company wants to improve the customer playing experience by reducing end-to-end load time for its global customer base.



Which solution will meet these requirements?

- [x] Create a standard accelerator in AWS Global Accelerator. Configure the existing NLBs as target endpoints.
- [ ] Create Application Load Balancers (ALBs) in each Region to replace the existing NLBs. Register the existing EC2 instances as targets for the ALBs in each Region.
- [ ] Configure Amazon Route 53 to route equally weighted traffic to the NLBs in each Region.
- [ ] Create additional NLBs and EC2 instances in other Regions where the company has large customer bases.

---

### Question-826
**Difficulty**: medium
**Topics**: compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, database:cost:serverless-database, architecture:ha:multi-az-design, compute:serverless:serverless-cost-optimization
**Tags**: ec2, auto-scaling, application-load-balancer, aurora, mysql, rds
**Quality**: 3/5 — Tests basic AWS service selection for HA and scalability but weak distractors — Redshift is for data warehousing (not transactional), ElastiCache-Redis with MySQL connector is nonsensical, and the third option's RDS cluster vs Serverless trade-off isn't explored, making service recall easier than architectural reasoning.

A company has an application that runs on a single Amazon EC2 instance. The application uses a MySQL database that runs on the same EC2 instance. The company needs a highly available and automatically scalable solution to handle increased traffic.



Which solution will meet these requirements?

- [x] Deploy the application to EC2 instances that run in an Auto Scaling group behind an Application Load Balancer. Create an Amazon Aurora Serverless MySQL cluster for the database layer.
- [ ] Deploy the application to EC2 instances that run in an Auto Scaling group behind an Application Load Balancer. Create an Amazon Redshift cluster that has multiple MySQL-compatible nodes.
- [ ] Deploy the application to EC2 instances that are configured as a target group behind an Application Load Balancer. Create an Amazon RDS for MySQL cluster that has multiple instances.
- [ ] Deploy the application to EC2 instances that are configured as a target group behind an Application Load Balancer. Create an Amazon ElastiCache for Redis cluster that uses the MySQL connector.

---

### Question-832
**Difficulty**: easy
**Topics**: network:performance:edge-acceleration-cdn, network:performance:latency-optimization, network:connectivity:hybrid-network-connectivity, architecture:ha:global-load-distribution
**Tags**: cloudfront, route-53, ec2, on-premises
**Quality**: 3/5 — Tests basic CloudFront knowledge for content delivery acceleration but lacks scenario depth — no traffic volume, user distribution details, or cost constraints; distractors are too easily eliminated (S3 for dynamic site, EC2 migration ignores backend constraint, Route 53 alone won't optimize latency).

A company's dynamic website is hosted using on-premises servers in the United States. The company is launching its product in Europe, and it wants to optimize site loading times for new European users. The site's backend must remain in the United States. The product is being launched in a few days, and an immediate solution is needed.

What should the solutions architect recommend?

- [x] Use Amazon CloudFront with a custom origin pointing to the on-premises servers.
- [ ] Launch an Amazon EC2 instance in us-east-1 and migrate the site to it.
- [ ] Move the website to Amazon S3. Use Cross-Region Replication between Regions.
- [ ] Use an Amazon Route 53 geoproximity routing policy pointing to on-premises servers.

---

### Question-837
**Difficulty**: medium
**Topics**: database:performance:read-vs-write-intensive, database:relational:read-replicas-usage, architecture:ha:multi-az-design, database:relational:multi-az-deployment
**Tags**: aurora, rds, mysql
**Quality**: 3/5 — Tests understanding of read-write separation and read replicas for scaling, but the scenario lacks specificity (no traffic patterns, data volume, or baseline metrics) and distractors are easily eliminated — DynamoDB changes the data model entirely, EC2 deployment ignores modern managed services, and using a backup instance as an endpoint is not a valid AWS pattern.

A company is migrating a three-tier application to AWS. The application requires a MySQL database. In the past, the application users reported poor application performance when creating new entries. These performance issues were caused by users generating different real-time reports from the application during working hours.



Which solution will improve the performance of the application when it is moved to AWS?

- [x] Create an Amazon Aurora MySQL Multi-AZ DB cluster with multiple read replicas. Configure the application to use the reader endpoint for reports.
- [ ] Import the data into an Amazon DynamoDB table with provisioned capacity. Refactor the application to use DynamoDB for reports.
- [ ] Create the database on a compute optimized Amazon EC2 instance. Ensure compute resources exceed the on-premises database.
- [ ] Create an Amazon Aurora MySQL Multi-AZ DB cluster. Configure the application to use the backup instance of the cluster as an endpoint for the reports.

---

### Question-839
**Difficulty**: medium
**Topics**: network:dns:health-check-routing, network:dns:latency-based-routing, architecture:ha:multi-region-design, architecture:ha:regional-failover
**Tags**: route-53, ec2, auto-scaling
**Quality**: 4/5 — Clear multi-region traffic distribution scenario with health-check requirements; multivalue answer routing is the correct choice (returns multiple healthy IPs), but distractors are well-reasoned — simple routing lacks health checks, ALBs cannot span regions without complex setup, and IP-based ALB targets cannot reach cross-region instances, making each wrong answer plausible to candidates unfamiliar with Route 53 routing policies.

A company serves its website by using an Auto Scaling group of Amazon EC2 instances in a single AWS Region. The website does not require a database.



The company is expanding, and the company's engineering team deploys the website to a second Region. The company wants to distribute traffic across both Regions to accommodate growth and for disaster recovery purposes. The solution should not serve traffic from a Region in which the website is unhealthy.



Which policy or resource should the company use to meet these requirements?

- [x] An Amazon Route 53 multivalue answer routing policy
- [ ] An Amazon Route 53 simple routing policy
- [ ] An Application Load Balancer in one Region with a target group that specifies the EC2 instance IDs from both Regions
- [ ] An Application Load Balancer in one Region with a target group that specifies the IP addresses of the EC2 instances from both Regions

---

### Question-840
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:file:cross-az-file-access, architecture:ha:multi-az-design, storage:performance:storage-performance-optimization
**Tags**: efs, ec2, ebs, s3
**Quality**: 3/5 — Tests basic AWS storage service selection for multi-AZ, shared access scenarios, but distractors are weak — EBS snapshots cannot be mounted across instances, S3 requires application refactoring, and instance store volumes are ephemeral — making this primarily a recall question rather than requiring architectural reasoning.

A company runs its applications on Amazon EC2 instances that are backed by Amazon Elastic Block Store (Amazon EBS). The EC2 instances run the most recent Amazon Linux release. The applications are experiencing availability issues when the company's employees store and retrieve files that are 25 GB or larger. The company needs a solution that does not require the company to transfer files between EC2 instances. The files must be available across many EC2 instances and across multiple Availability Zones.



Which solution will meet these requirements?

- [x] Mount an Amazon Elastic File System (Amazon EFS) file system across all the EC2 instances. Instruct the employees to access the files from the EC2 instances.
- [ ] Migrate all the files to an Amazon S3 bucket. Instruct the employees to access the files from the S3 bucket.
- [ ] Take a snapshot of the existing EBS volume. Mount the snapshot as an EBS volume across the EC2 instances. Instruct the employees to access the files from the EC2 instances.
- [ ] Create an Amazon Machine Image (AMI) from the EC2 instances. Configure new EC2 instances from the AMI that use an instance store volume. Instruct the employees to access the files from the EC2 instances.

---

### Question-846
**Difficulty**: medium
**Topics**: storage:archival:backup-and-restore, storage:archival:backup-retention-policies, storage:data-lake:data-lake-design, architecture:ha:multi-region-design, cost:optimization:storage-size-optimization
**Tags**: aws-backup, efs, s3, cross-region-replication
**Quality**: 3/5 — Tests basic AWS service selection for EFS replication but distractors are weak — EFS-to-EFS backup is not a standard AWS managed service, custom rsync requires non-managed infrastructure, and S3 replication via custom scripts is suboptimal — requiring minimal architectural reasoning to eliminate them.

A company runs an application on several Amazon EC2 instances that store persistent data on an Amazon Elastic File System (Amazon EFS) file system. The company needs to replicate the data to another AWS Region by using an AWS managed service solution.



Which solution will meet these requirements MOST cost-effectively?

- [x] Use AWS Backup to create a backup plan with a rule that takes a daily backup and replicates it to another Region. Assign the EFS file system resource to the backup plan.
- [ ] Use the EFS-to-EFS backup solution to replicate the data to an EFS file system in another Region.
- [ ] Run a nightly script to copy data from the EFS file system to an Amazon S3 bucket. Enable S3 Cross-Region Replication on the S3 bucket.
- [ ] Create a VPC in another Region. Establish a cross-Region VPC peer. Run a nightly rsync to copy data from the original Region to the new Region.

---

### Question-847
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, database:relational:multi-az-deployment, architecture:migration:lift-and-shift
**Tags**: ec2, auto-scaling, application-load-balancer, rds, multi-az
**Quality**: 3/5 — Tests basic AWS service selection and HA patterns, but distractors are weak — read replicas for SQL Server (wrong use case), cross-region DB replication (overengineered for HA), and manual EC2 instances (no scaling) are easily eliminable without deep architectural reasoning.

An ecommerce company is migrating its on-premises workload to the AWS Cloud. The workload currently consists of a web application and a backend Microsoft SQL database for storage.



The company expects a high volume of customers during a promotional event. The new infrastructure in the AWS Cloud must be highly available and scalable.



Which solution will meet these requirements with the LEAST administrative overhead?

- [x] Migrate the web application to Amazon EC2 instances that run in an Auto Scaling group across two Availability Zones behind an Application Load Balancer. Migrate the database to Amazon RDS with Multi-AZ deployment.
- [ ] Migrate the web application to two Amazon EC2 instances across two Availability Zones behind an Application Load Balancer. Migrate the database to Amazon RDS for Microsoft SQL Server with read replicas in both Availability Zones.
- [ ] Migrate the web application to an Amazon EC2 instance that runs in an Auto Scaling group across two Availability Zones behind an Application Load Balancer. Migrate the database to two EC2 instances across separate AWS Regions with database replication.
- [ ] Migrate the web application to three Amazon EC2 instances across three Availability Zones behind an Application Load Balancer. Migrate the database to three EC2 instances across three Availability Zones.

---

### Question-850
**Difficulty**: easy
**Topics**: compute:scaling:scheduled-scaling, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design
**Tags**: ec2, auto-scaling, elb, cloudwatch
**Quality**: 3/5 — Tests basic knowledge of scheduled scaling vs reactive scaling, but the scenario is straightforward and distractors are trivially eliminable — CloudWatch alarm scaling is reactive (wrong), SNS notifications don't scale (wrong), and manual capacity changes defeat automation (wrong).

A company’s application is running on Amazon EC2 instances within an Auto Scaling group behind an Elastic Load Balancing (ELB) load balancer. Based on the application's history, the company anticipates a spike in traffic during a holiday each year. A solutions architect must design a strategy to ensure that the Auto Scaling group proactively increases capacity to minimize any performance impact on application users.



Which solution will meet these requirements?

- [x] Create a recurring scheduled action to scale up the Auto Scaling group before the expected period of peak demand.
- [ ] Create an Amazon CloudWatch alarm to scale up the EC2 instances when CPU utilization exceeds 90%.
- [ ] Increase the minimum and maximum number of EC2 instances in the Auto Scaling group during the peak demand period.
- [ ] Configure an Amazon Simple Notification Service (Amazon SNS) notification to send alerts when there are autoscaling:EC2_INSTANCE_LAUNCH events.

---

### Question-857
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:file:cross-az-file-access, architecture:ha:multi-az-design, compute:scaling:horizontal-scaling
**Tags**: efs, ec2, auto-scaling, alb
**Quality**: 4/5 — The scenario clearly establishes the core requirement (shared, up-to-date content across multiple EC2 instances with minimal lag), and the correct answer (EFS) directly satisfies this with its shared filesystem semantics; distractors are plausible but each has a meaningful flaw (user data won't sync updates, S3 sync hourly lag violates 'least possible lag', EBS snapshots don't share across instances), forcing genuine architectural reasoning about storage sharing patterns.

A company is building a web application that serves a content management system. The content management system runs on Amazon EC2 instances behind an Application Load Balancer (ALB). The EC2 instances run in an Auto Scaling group across multiple Availability Zones. Users are constantly adding and updating files, blogs, and other website assets in the content management system.



A solutions architect must implement a solution in which all the EC2 instances share up-to-date website content with the least possible lag time.



Which solution meets these requirements?

- [x] Copy the website assets to an Amazon Elastic File System (Amazon EFS) file system. Configure each EC2 instance to mount the EFS file system locally. Configure the website hosting application to reference the website assets that are stored in the EFS file system.
- [ ] Update the EC2 user data in the Auto Scaling group lifecycle policy to copy the website assets from the EC2 instance that was launched most recently. Configure the ALB to make changes to the website assets only in the newest EC2 instance.
- [ ] Copy the website assets to an Amazon S3 bucket. Ensure that each EC2 instance downloads the website assets from the S3 bucket to the attached Amazon Elastic Block Store (Amazon EBS) volume. Run the S3 sync command once each hour to keep files up to date.
- [ ] Restore an Amazon Elastic Block Store (Amazon EBS) snapshot with the website assets. Attach the EBS snapshot as a secondary EBS volume when a new EC2 instance is launched. Configure the website hosting application to reference the website assets that are stored in the secondary EBS volume.

---

### Question-862
**Difficulty**: easy
**Topics**: compute:instances:placement-group-strategy, network:performance:latency-optimization, architecture:ha:multi-az-design
**Tags**: ec2
**Quality**: 3/5 — Tests direct recall of cluster placement groups for HPC workloads, but distractors are weak — dedicated instances, spot instances, and capacity reservations don't address low-latency node-to-node communication, making them instantly eliminable without architectural reasoning.

A company plans to run a high performance computing (HPC) workload on Amazon EC2 Instances. The workload requires low-latency network performance and high network throughput with tightly coupled node-to-node communication.



Which solution will meet these requirements?

- [x] Configure the EC2 instances to be part of a cluster placement group.
- [ ] Launch the EC2 instances with Dedicated Instance tenancy.
- [ ] Launch the EC2 instances as Spot Instances.
- [ ] Configure an On-Demand Capacity Reservation when the EC2 instances are launched.

---

### Question-863
**Difficulty**: medium
**Topics**: network:connectivity:direct-connect-hybrid, network:connectivity:redundant-connections, architecture:ha:multi-region-design, architecture:resilience:single-point-of-failure
**Tags**: direct-connect, vpc
**Quality**: 4/5 — Well-structured scenario with clear resiliency requirements that demands understanding Direct Connect redundancy patterns (multiple connections, separate devices, separate locations) vs. single points of failure; distractors are plausible and each violates a specific resiliency principle.

A company has primary and secondary data centers that are 500 miles (804.7 km) apart and interconnected with high-speed fiber-optic cable. The company needs a highly available and secure network connection between its data centers and a VPC on AWS for a mission-critical workload. A solutions architect must choose a connection solution that provides maximum resiliency.



Which solution meets these requirements?

- [x] Two AWS Direct Connect connections from each of the primary and secondary data centers terminating at two Direct Connect locations on two separate devices
- [ ] Two AWS Direct Connect connections from the primary data center terminating at two Direct Connect locations on two separate devices
- [ ] A single AWS Direct Connect connection from each of the primary and secondary data centers terminating at one Direct Connect location on the same device
- [ ] A single AWS Direct Connect connection from each of the primary and secondary data centers terminating at one Direct Connect location on two separate devices

---

### Question-878
**Difficulty**: medium
**Topics**: security:application:api-authentication-authorization, security:application:secure-application-access, network:performance:edge-acceleration-cdn, compute:serverless:event-driven-architectures, architecture:ha:global-load-distribution
**Tags**: cognito, lambda-edge, cloudfront, directory-service, lambda, alb, s3, elastic-beanstalk
**Quality**: 3/5 — Tests service selection for auth/authz patterns and global delivery, but distractors are weakly differentiated — Directory Service is enterprise-focused (eliminates options 2 and 4 instantly), S3 Transfer Acceleration doesn't serve web apps (eliminates option 3), and Elastic Beanstalk lacks edge computing (eliminates option 4), leaving minimal reasoning required beyond basic service knowledge.

A company wants to restrict access to the content of its web application. The company needs to protect the content by using authorization techniques that are available on AWS. The company also wants to implement a serverless architecture for authorization and authentication that has low login latency.



The solution must integrate with the web application and serve web content globally. The application currently has a small user base, but the company expects the application's user base to increase.



Which solution will meet these requirements?

- [x] Configure Amazon Cognito for authentication. Implement Lambda@Edge for authorization. Configure Amazon CloudFront to serve the web application globally.
- [ ] Configure AWS Directory Service for Microsoft Active Directory for authentication. Implement AWS Lambda for authorization. Use an Application Load Balancer to serve the web application globally.
- [ ] Configure Amazon Cognito for authentication. Implement AWS Lambda for authorization. Use Amazon S3 Transfer Acceleration to serve the web application globally.
- [ ] Configure AWS Directory Service for Microsoft Active Directory for authentication. Implement Lambda@Edge for authorization. Use AWS Elastic Beanstalk to serve the web application globally.

---

### Question-881
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, architecture:dr:recovery-time-objective, architecture:ha:multi-region-design, database:nosql:global-tables-replication, network:dns:failover-routing-policy
**Tags**: ec2, auto-scaling, elb, dynamodb, route-53, cloudformation, cloudwatch, lambda
**Quality**: 3/5 — Tests basic DR strategy selection (warm standby vs. pilot light) and service integration, but the correct answer is obvious once you recognize that pre-provisioned resources minimize downtime — distractors using CloudFormation templates or manual failover are easily eliminable without deep architectural reasoning.

A company hosts its application in the AWS Cloud. The application runs on Amazon EC2 instances in an Auto Scaling group behind an Elastic Load Balancing (ELB) load balancer. The application connects to an Amazon DynamoDB table.



For disaster recovery (DR) purposes, the company wants to ensure that the application is available from another AWS Region with minimal downtime.



Which solution will meet these requirements with the LEAST downtime?

- [x] Create an Auto Scaling group and an ELB in the DR Region. Configure the DynamoDB table as a global table. Configure DNS failover to point to the new DR Region's ELB.
- [ ] Create an AWS CloudFormation template to create EC2 instances, ELBs, and DynamoDB tables to be launched when necessary. Configure DNS failover to point to the new DR Region's ELB.
- [ ] Create an AWS CloudFormation template to create EC2 instances and an ELB to be launched when necessary. Configure the DynamoDB table as a global table. Configure DNS failover to point to the new DR Region's ELB.
- [ ] Create an Auto Scaling group and an ELB in the DR Region. Configure the DynamoDB table as a global table. Create an Amazon CloudWatch alarm with an evaluation period of 10 minutes to invoke an AWS Lambda function that updates Amazon Route 53 to point to the DR Region's ELB.

---

### Question-883
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, network:load-balancing:layer4-vs-layer7-balancing, architecture:ha:availability-zone-strategy
**Tags**: ec2, network-load-balancer, auto-scaling, route-53
**Quality**: 4/5 — Clear HA requirement with cost constraint that tests understanding of multi-AZ deployment, NLB for transport layer (Layer 4), and Auto Scaling; distractors are plausible but each violates a key requirement (single ALB doesn't span AZs, Route 53 alone lacks auto-failover without health checks, dual LBs add unnecessary cost).

A company hosts an application on Amazon EC2 instances that run in a single Availability Zone. The application is accessible by using the transport layer of the Open Systems Interconnection (OSI) model. The company needs the application architecture to have high availability.



Which combination of steps will meet these requirements MOST cost-effectively? (Choose two.)

- [x] Configure a Network Load Balancer in front of the EC2 instances.
- [x] Create an Auto Scaling group for the EC2 instances. Configure the Auto Scaling group to use multiple Availability Zones. Configure the Auto Scaling group to run application health checks on the instances.
- [ ] Configure new EC2 instances in a different Availability Zone. Use Amazon Route 53 to route traffic to all instances.
- [ ] Configure a Network Load Balancer for TCP traffic to the instances. Configure an Application Load Balancer for HTTP and HTTPS traffic to the instances.
- [ ] Create an Amazon CloudWatch alarm. Configure the alarm to restart EC2 instances that transition to a stopped state.

---

### Question-890
**Difficulty**: medium
**Topics**: compute:cost:compute-purchasing-options, network:connectivity:vpc-endpoints, compute:serverless:serverless-cost-optimization, architecture:ha:multi-az-design
**Tags**: lambda, ec2, vpc, savings-plan
**Quality**: 3/5 — Tests understanding of Compute Savings Plan applicability to both EC2 and Lambda, and Lambda VPC connectivity requirements, but distractors conflate unrelated concepts (public subnets for Lambda networking, EC2-only savings plans) without strong reasoning anchors tied to the 1-year, growing-function-count scenario.

A company runs its application by using Amazon EC2 instances and AWS Lambda functions. The EC2 instances run in private subnets of a VPC. The Lambda functions need direct network access to the EC2 instances for the application to work.



The application will run for 1 year. The number of Lambda functions that the application uses will increase during the 1-year period. The company must minimize costs on all application resources.



Which solution will meet these requirements?

- [x] Purchase a Compute Savings Plan. Connect the Lambda functions to the private subnets that contain the EC2 instances.
- [ ] Purchase an EC2 Instance Savings Plan. Connect the Lambda functions to the private subnets that contain the EC2 instances.
- [ ] Purchase an EC2 Instance Savings Plan. Connect the Lambda functions to new public subnets in the same VPC where the EC2 instances run.
- [ ] Purchase a Compute Savings Plan. Keep the Lambda functions in the Lambda service VPC.

---

### Question-900
**Difficulty**: medium
**Topics**: storage:object:cross-region-replication, architecture:ha:multi-region-design, network:performance:latency-optimization, architecture:ha:active-active-failover
**Tags**: s3, s3-multi-region-access-points, s3-cross-region-replication
**Quality**: 4/5 — Clear multi-constraint scenario (nearest bucket routing, no public congestion, minimal S3 management, failover) that requires understanding S3 Multi-Region Access Points' active-active capability and automatic routing; distractors are plausible but each violates a key requirement (manual endpoint selection, active-passive configuration, cross-account replication complexity).

A company runs its critical storage application in the AWS Cloud. The application uses Amazon S3 in two AWS Regions. The company wants the application to send remote user data to the nearest S3 bucket with no public network congestion. The company also wants the application to fail over with the least amount of management of Amazon S3.



Which solution will meet these requirements?

- [x] Set up Amazon S3 to use Multi-Region Access Points in an active-active configuration with a single global endpoint. Configure S3 Cross-Region Replication.
- [ ] Implement an active-active design between the two Regions. Configure the application to use the regional S3 endpoints closest to the user.
- [ ] Use an active-passive configuration with S3 Multi-Region Access Points. Create a global endpoint for each of the Regions.
- [ ] Send user data to the regional S3 endpoints closest to the user. Configure an S3 cross-account replication rule to keep the S3 buckets synchronized.

---

### Question-901
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, compute:instances:ami-management, architecture:resilience:redundancy-patterns, network:load-balancing:load-balancing-strategy
**Tags**: ec2, auto-scaling, application-load-balancer, ami
**Quality**: 3/5 — Tests basic understanding of Auto Scaling and HA patterns but the correct answer uses min/max=1 (which doesn't provide fault tolerance or redundancy), and multiple distractors can be eliminated without deep reasoning — the scenario lacks traffic patterns, failure modes, or cost constraints that would force meaningful architectural trade-offs.

A company is migrating a data center from its on-premises location to AWS. The company has several legacy applications that are hosted on individual virtual servers. Changes to the application designs cannot be made.



Each individual virtual server currently runs as its own EC2 instance. A solutions architect needs to ensure that the applications are reliable and fault tolerant after migration to AWS. The applications will run on Amazon EC2 instances.



Which solution will meet these requirements?

- [x] Create an Auto Scaling group that has a minimum of one and a maximum of one. Create an Amazon Machine Image (AMI) of each application instance. Use the AMI to create EC2 instances in the Auto Scaling group Configure an Application Load Balancer in front of the Auto Scaling group.
- [ ] Use AWS Backup to create an hourly backup of the EC2 instance that hosts each application. Store the backup in Amazon S3 in a separate Availability Zone. Configure a disaster recovery process to restore the EC2 instance for each application from its most recent backup.
- [ ] Create an Amazon Machine Image (AMI) of each application instance. Launch two new EC2 instances from the AMI. Place each EC2 instance in a separate Availability Zone. Configure a Network Load Balancer that has the EC2 instances as targets.
- [ ] Use AWS Mitigation Hub Refactor Spaces to migrate each application off the EC2 instance. Break down functionality from each application into individual components. Host each application on Amazon Elastic Container Service (Amazon ECS) with an AWS Fargate launch type.

---

### Question-902
**Difficulty**: medium
**Topics**: governance:accounts:multi-account-strategy, governance:automation:infrastructure-as-code, network:architecture:vpc-design, security:iam:cross-account-access, architecture:ha:multi-az-design
**Tags**: control-tower, organizations, vpc, resource-access-manager, transit-gateway
**Quality**: 4/5 — Well-constructed scenario with clear multi-account isolation and security guardrail requirements; Control Tower vs Organizations distinction is meaningful, and the correct answer's combination of automated guardrails + centralized networking via RAM is architecturally superior to manual inspection VPC routing; distractors are plausible but each fails on either automation or operational overhead.

A company wants to isolate its workloads by creating an AWS account for each workload. The company needs a solution that centrally manages networking components for the workloads. The solution also must create accounts with automatic security controls (guardrails).



Which solution will meet these requirements with the LEAST operational overhead?

- [x] Use AWS Control Tower to deploy accounts. Create a networking account that has a VPC with private subnets and public subnets. Use AWS Resource Access Manager (AWS RAM) to share the subnets with the workload accounts.
- [ ] Use AWS Organizations to deploy accounts. Create a networking account that has a VPC with private subnets and public subnets. Use AWS Resource Access Manager (AWS RAM) to share the subnets with the workload accounts.
- [ ] Use AWS Control Tower to deploy accounts. Deploy a VPC in each workload account. Configure each VPC to route through an inspection VPC by using a transit gateway attachment.
- [ ] Use AWS Organizations to deploy accounts. Deploy a VPC in each workload account. Configure each VPC to route through an inspection VPC by using a transit gateway attachment.

---

### Question-905
**Difficulty**: medium
**Topics**: architecture:dr:recovery-point-objective, architecture:dr:recovery-time-objective, architecture:dr:disaster-recovery-strategies, database:relational:database-replication-strategies, architecture:ha:multi-region-design
**Tags**: aurora, rds, database-migration-service
**Quality**: 4/5 — Well-constructed scenario with clear RPO/RTO constraints and multi-region requirement; correct answer (Aurora Global Database with managed failover) directly satisfies all stated requirements; distractors represent progressively worse trade-offs (manual failover, replication lag, operational overhead) that require understanding Aurora replication architectures and failover mechanisms.

A company is designing its production application's disaster recovery (DR) strategy. The application is backed by a MySQL database on an Amazon Aurora cluster in the us-east-1 Region. The company has chosen the us-west-1 Region as its DR Region.



The company's target recovery point objective (RPO) is 5 minutes and the target recovery time objective (RTO) is 20 minutes. The company wants to minimize configuration changes.



Which solution will meet these requirements with the MOST operational efficiency?

- [x] Convert the Aurora cluster to an Aurora global database. Configure managed failover.
- [ ] Create an Aurora read replica in us-west-1 similar in size to the production application's Aurora MySQL cluster writer instance.
- [ ] Create a new Aurora cluster in us-west-1 that has Cross-Region Replication.
- [ ] Create a new Aurora cluster in us-west-1. Use AWS Database Migration Service (AWS DMS) to sync both clusters.

---

### Question-908
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, network:routing:transit-gateway-routing, architecture:ha:multi-region-design, network:architecture:hub-and-spoke-topology
**Tags**: vpc, transit-gateway
**Quality**: 4/5 — Clear scenario requiring hub-and-spoke network design at scale (100+ applications); transit gateway is the only scalable solution for many-to-many VPC connectivity, while VPC peering requires O(n²) connections and the distractors are plausible but fail on administrative overhead or scalability.

A company is migrating five on-premises applications to VPCs in the AWS Cloud. Each application is currently deployed in isolated virtual networks on premises and should be deployed similarly in the AWS Cloud. The applications need to reach a shared services VPC. All the applications must be able to communicate with each other.



If the migration is successful, the company will repeat the migration process for more than 100 applications.



Which solution will meet these requirements with the LEAST administrative overhead?

- [x] Deploy a transit gateway with associations between the transit gateway and the application VPCs and the shared services VPC. Add routes between the application VPCs in their subnets and the application VPCs to the shared services VPC through the transit gateway.
- [ ] Deploy software VPN tunnels between the application VPCs and the shared services VPC. Add routes between the application VPCs in their subnets to the shared services VPC.
- [ ] Deploy VPC peering connections between the application VPCs and the shared services VPC. Add routes between the application VPCs in their subnets to the shared services VPC through the peering connection.
- [ ] Deploy an AWS Direct Connect connection between the application VPCs and the shared services VPAdd routes from the application VPCs in their subnets to the shared services VPC and the applications VPCs. Add routes from the shared services VPC subnets to the applications VPCs.

---

### Question-910
**Difficulty**: easy
**Topics**: database:performance:read-vs-write-intensive, database:relational:read-replicas-usage, architecture:ha:multi-az-design, database:performance:database-capacity-planning
**Tags**: rds, read-replica
**Quality**: 3/5 — Straightforward scenario testing read-replica knowledge, but weak distractors — Multi-AZ doesn't solve read contention, manual export is clearly impractical, and ElastiCache over-engineers a simple separation-of-concerns problem; the correct answer follows directly from the requirement without meaningful trade-off reasoning.

A company is using a SQL database to store movie data that is publicly accessible. The database runs on an Amazon RDS Single-AZ DB instance. A script runs queries at random intervals each day to record the number of new movies that have been added to the database. The script must report a final total during business hours.

The company's development team notices that the database performance is inadequate for development tasks when the script is running. A solutions architect must recommend a solution to resolve this issue.

Which solution will meet this requirement with the LEAST operational overhead?

- [x] Create a read replica of the database. Configure the script to query only the read replica.
- [ ] Modify the DB instance to be a Multi-AZ deployment.
- [ ] Instruct the development team to manually export the entries in the database at the end of each day.
- [ ] Use Amazon ElastiCache to cache the common queries that the script runs against the database.

---

### Question-913
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, security:application:web-application-firewall
**Tags**: ec2, auto-scaling, application-load-balancer, waf
**Quality**: 2/5 — Tests basic service selection but distractors are trivially eliminable — placement groups don't support auto-scaling, WAF cannot attach to ASG or placement group directly (only to ALB/CloudFront), and two static instances lack the scale/availability the question demands.

A company wants to migrate an application to AWS. The company wants to increase the application's current availability. The company wants to use AWS WAF in the application's architecture.



Which solution will meet these requirements?

- [x] Create an Auto Scaling group that contains multiple Amazon EC2 instances that host the application across two Availability Zones. Configure an Application Load Balancer (ALB) and set the Auto Scaling group as the target. Connect a WAF to the ALB.
- [ ] Create a cluster placement group that contains multiple Amazon EC2 instances that hosts the application. Configure an Application Load Balancer and set the EC2 instances as the targets. Connect a WAF to the placement group.
- [ ] Create two Amazon EC2 instances that host the application across two Availability Zones. Configure the EC2 instances as the targets of an Application Load Balancer (ALB). Connect a WAF to the ALB.
- [ ] Create an Auto Scaling group that contains multiple Amazon EC2 instances that host the application across two Availability Zones. Configure an Application Load Balancer (ALB) and set the Auto Scaling group as the target. Connect a WAF to the Auto Scaling group.

---

### Question-916
**Difficulty**: hard
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, network:performance:global-anycast-routing, network:performance:latency-optimization, architecture:ha:multi-region-design
**Tags**: global-accelerator, nlb, ec2, route-53
**Quality**: 4/5 — Strong multi-region hybrid scenario requiring understanding of protocol support (UDP/TCP), load balancer selection, and Global Accelerator's role in cross-region routing; distractors meaningfully test knowledge of layer 4 vs layer 7 and protocol compatibility, though the scenario could specify traffic patterns and failover timing expectations more clearly.

A company wants to improve the availability and performance of its hybrid application. The application consists of a stateful TCP-based workload hosted on Amazon EC2 instances in different AWS Regions and a stateless UDP-based workload hosted on premises.



Which combination of actions should a solutions architect take to improve availability and performance? (Choose two.)

- [x] Create an accelerator using AWS Global Accelerator. Add the load balancers as endpoints.
- [x] Configure a Network Load Balancer in each Region to address the EC2 endpoints. Configure a Network Load Balancer in each Region that routes to the on-premises endpoints.
- [ ] Create an Amazon CloudFront distribution with an origin that uses Amazon Route 53 latency-based routing to route requests to the load balancers.
- [ ] Configure two Application Load Balancers in each Region. The first will route to the EC2 endpoints, and the second will route to the on-premises endpoints.
- [ ] Configure a Network Load Balancer in each Region to address the EC2 endpoints. Configure an Application Load Balancer in each Region that routes to the on-premises endpoints.

---

### Question-929
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, integration:messaging:queuing-concepts, database:relational:multi-az-deployment
**Tags**: alb, ec2, auto-scaling, sqs, rds
**Quality**: 3/5 — Tests correct service selection for a multi-component architecture but distractors are weak — NAT gateway for web traffic, Redshift for order storage, and Gateway Load Balancer for order capture are obviously incorrect for anyone with basic AWS knowledge, requiring only recall rather than architectural reasoning.

A company needs to design a resilient web application to process customer orders. The web application must automatically handle increases in web traffic and application usage without affecting the customer experience or losing customer orders.



Which solution will meet these requirements?

- [x] Use an Application Load Balancer to manage web traffic. Use Amazon EC2 Auto Scaling groups to receive and process customer orders. Use Amazon Simple Queue Service (Amazon SQS) to store unprocessed orders. Use Amazon RDS with a Multi-AZ deployment to store processed customer orders.
- [ ] Use a NAT gateway to manage web traffic. Use Amazon EC2 Auto Scaling groups to receive, process, and store processed customer orders. Use an AWS Lambda function to capture and store unprocessed orders.
- [ ] Use a Network Load Balancer (NLB) to manage web traffic. Use an Application Load Balancer to receive customer orders from the NLUse Amazon Redshift with a Multi-AZ deployment to store unprocessed and processed customer orders.
- [ ] Use a Gateway Load Balancer (GWLB) to manage web traffic. Use Amazon Elastic Container Service (Amazon ECS) to receive and process customer orders. Use the GWLB to capture and store unprocessed orders. Use Amazon DynamoDB to store processed customer orders.

---

### Question-936
**Difficulty**: medium
**Topics**: compute:instances:instance-type-selection, compute:scaling:horizontal-scaling, compute:scaling:vertical-scaling, compute:cost:compute-purchasing-options, architecture:ha:multi-az-design
**Tags**: ec2, compute-optimizer, auto-scaling, application-load-balancer, cloudwatch
**Quality**: 3/5 — Tests understanding of vertical vs. horizontal scaling and cost trade-offs, but the scenario lacks traffic pattern detail, growth projections, or cost constraints that would make the reasoning more compelling; the distractors conflate scaling directions in obvious ways rather than presenting realistic architectural alternatives.

A company hosts a monolithic web application on an Amazon EC2 instance. Application users have recently reported poor performance at specific times. Analysis of Amazon CloudWatch metrics shows that CPU utilization is 100% during the periods of poor performance.



The company wants to resolve this performance issue and improve application availability.



Which combination of steps will meet these requirements MOST cost-effectively? (Choose two.)

- [x] Use AWS Compute Optimizer to obtain a recommendation for an instance type to scale vertically.
- [x] Create an Auto Scaling group and an Application Load Balancer to scale horizontally.
- [ ] Create an Amazon Machine Image (AMI) from the web server. Reference the AMI in a new launch template.
- [ ] Create an Auto Scaling group and an Application Load Balancer to scale vertically.
- [ ] Use AWS Compute Optimizer to obtain a recommendation for an instance type to scale horizontally.

---

### Question-939
**Difficulty**: medium
**Topics**: compute:cost:spot-instances, compute:scaling:auto-scaling-groups, compute:containers:container-cost-optimization, architecture:ha:multi-az-design
**Tags**: ecs, fargate, fargate-spot
**Quality**: 4/5 — Well-constructed scenario with clear trade-off between cost and availability; requires understanding Fargate vs Fargate Spot pricing models, burst traffic patterns, and capacity provider mechanics; distractors test common misconceptions (wrong spot/steady-state split, oversized rightsizing, reactive monitoring) without being trivially eliminable.

A company runs its customer-facing web application on containers. The workload uses Amazon Elastic Container Service (Amazon ECS) on AWS Fargate. The web application is resource intensive.



The web application needs to be available 24 hours a day, 7 days a week for customers. The company expects the application to experience short bursts of high traffic. The workload must be highly available.



Which solution will meet these requirements MOST cost-effectively?

- [x] Configure an ECS capacity provider with Fargate for steady state and Fargate Spot for burst traffic.
- [ ] Configure an ECS capacity provider with Fargate. Conduct load testing by using a third-party tool. Rightsize the Fargate tasks in Amazon CloudWatch.
- [ ] Configure an ECS capacity provider with Fargate Spot for steady state and Fargate for burst traffic.
- [ ] Configure an ECS capacity provider with Fargate. Use AWS Compute Optimizer to rightsize the Fargate task.

---

### Question-940
**Difficulty**: easy
**Topics**: security:network:ddos-protection, security:network:ingress-egress-filtering, network:load-balancing:health-check-configuration, architecture:ha:multi-az-design
**Tags**: shield, route-53, alb, ec2
**Quality**: 3/5 — Tests direct service-to-feature mapping (Shield Advanced for proactive DDoS detection) but distractors are trivially eliminable — AWS Config detects configuration drift not DDoS, WAF is reactive not proactive, and GuardDuty is for threat detection not DDoS protection — requiring only basic AWS service recall rather than architectural reasoning.

A company is building an application in the AWS Cloud. The application is hosted on Amazon EC2 instances behind an Application Load Balancer (ALB). The company uses Amazon Route 53 for the DNS.



The company needs a managed solution with proactive engagement to detect against DDoS attacks.



Which solution will meet these requirements?

- [x] Subscribe to AWS Shield Advanced. Configure hosted zones in Route 53. Add ALB resources as protected resources.
- [ ] Enable AWS Config. Configure an AWS Config managed rule that detects DDoS attacks.
- [ ] Enable AWS WAF on the ALCreate an AWS WAF web ACL with rules to detect and prevent DDoS attacks. Associate the web ACL with the ALB.
- [ ] Store the ALB access logs in an Amazon S3 bucket. Configure Amazon GuardDuty to detect and take automated preventative actions for DDoS attacks.

---

### Question-943
**Difficulty**: medium
**Topics**: database:relational:read-replicas-usage, database:migration:zero-downtime-migration, database:relational:multi-az-deployment, architecture:ha:multi-az-design, cost:optimization:idle-resource-elimination
**Tags**: aurora, rds, mysql, database-cloning
**Quality**: 4/5 — Well-constructed scenario with clear pain points (read latency during exports, staging environment unavailability) that logically lead to the correct answer; distractors meaningfully differ in technology choice (Aurora vs RDS) and staging approach (cloning vs mysqldump/backup), requiring understanding of Aurora's clone efficiency versus traditional export methods.

A company runs an on-premises application that is powered by a MySQL database. The company is migrating the application to AWS to increase the application's elasticity and availability.

The current architecture shows heavy read activity on the database during times of normal operation. Every 4 hours, the company's development team pulls a full export of the production database to populate a database in the staging environment. During this period, users experience unacceptable application latency. The development team is unable to use the staging environment until the procedure completes.

A solutions architect must recommend replacement architecture that alleviates the application latency issue. The replacement architecture also must give the development team the ability to continue using the staging environment without delay.

Which solution meets these requirements?

- [x] Use Amazon Aurora MySQL with Multi-AZ Aurora Replicas for production. Use database cloning to create the staging database on-demand.
- [ ] Use Amazon Aurora MySQL with Multi-AZ Aurora Replicas for production. Populate the staging database by implementing a backup and restore process that uses the mysqldump utility.
- [ ] Use Amazon RDS for MySQL with a Multi-AZ deployment and read replicas for production. Use the standby instance for the staging database.
- [ ] Use Amazon RDS for MySQL with a Multi-AZ deployment and read replicas for production. Populate the staging database by implementing a backup and restore process that uses the mysqldump utility.

---

### Question-947
**Difficulty**: easy
**Topics**: database:relational:multi-az-deployment, architecture:ha:multi-az-design, architecture:resilience:single-point-of-failure
**Tags**: rds, mysql
**Quality**: 3/5 — Tests basic RDS Multi-AZ recall but lacks architectural depth — the correct answer is the obvious best practice with minimal trade-off analysis; distractors are easily eliminated (DynamoDB migration adds complexity, manual restore has downtime, EC2 Auto Scaling for a database is impractical).

A company hosts an ecommerce application that stores all data in a single Amazon RDS for MySQL DB instance that is fully managed by AWS. The company needs to mitigate the risk of a single point of failure.



Which solution will meet these requirements with the LEAST implementation effort?

- [x] Modify the RDS DB instance to use a Multi-AZ deployment. Apply the changes during the next maintenance window.
- [ ] Migrate the current database to a new Amazon DynamoDB Multi-AZ deployment. Use AWS Database Migration Service (AWS DMS) with a heterogeneous migration strategy to migrate the current RDS DB instance to DynamoDB tables.
- [ ] Create a new RDS DB instance in a Multi-AZ deployment. Manually restore the data from the existing RDS DB instance from the most recent snapshot.
- [ ] Configure the DB instance in an Amazon EC2 Auto Scaling group with a minimum group size of three. Use Amazon Route 53 simple routing to distribute requests to all DB instances.

---

### Question-948
**Difficulty**: easy
**Topics**: storage:file:nfs-vs-smb-protocols, storage:file:shared-file-system-design, architecture:ha:availability-zone-strategy, storage:performance:storage-durability-replication
**Tags**: fsx, fsx-netapp-ontap, ec2, s3, fsx-lustre
**Quality**: 3/5 — Tests basic FSx service knowledge and protocol support, but distractors are weak — EC2 file servers lack managed redundancy, FSx for Lustre doesn't support SMB, and S3 File Gateway is not a shared file system — anyone with foundational AWS storage knowledge can eliminate them without deep reasoning.

A company has multiple Microsoft Windows SMB file servers and Linux NFS file servers for file sharing in an on-premises environment. As part of the company's AWS migration plan, the company wants to consolidate the file servers in the AWS Cloud.



The company needs a managed AWS storage service that supports both NFS and SMB access. The solution must be able to share between protocols. The solution must have redundancy at the Availability Zone level.



Which solution will meet these requirements?

- [x] Use Amazon FSx for NetApp ONTAP for storage. Configure multi-protocol access.
- [ ] Create two Amazon EC2 instances. Use one EC2 instance for Windows SMB file server access and one EC2 instance for Linux NFS file server access.
- [ ] Use Amazon FSx for NetApp ONTAP for SMB access. Use Amazon FSx for Lustre for NFS access.
- [ ] Use Amazon S3 storage. Access Amazon S3 through an Amazon S3 File Gateway.

---

### Question-949
**Difficulty**: medium
**Topics**: architecture:ha:multi-az-design, compute:scaling:auto-scaling-groups, network:load-balancing:load-balancing-strategy, database:relational:multi-az-deployment, database:performance:read-vs-write-intensive
**Tags**: ec2, auto-scaling, alb, aurora, rds, route-53
**Quality**: 4/5 — Well-structured scenario with clear requirements (scalability, HA, reduced read latency) and strong distractors; requires understanding of multi-AZ deployment, Auto Scaling groups, Aurora read replicas vs. cross-region replicas, and why single-region failover or multi-region Auto Scaling don't address the stated needs.

A software company needs to upgrade a critical web application. The application currently runs on a single Amazon EC2 instance that the company hosts in a public subnet. The EC2 instance runs a MySQL database. The application's DNS records are published in an Amazon Route 53 zone.



A solutions architect must reconfigure the application to be scalable and highly available. The solutions architect must also reduce MySQL read latency.



Which combination of solutions will meet these requirements? (Choose two.)

- [x] Create and configure an Auto Scaling group to launch private EC2 instances in multiple Availability Zones. Add the instances to a target group behind a new Application Load Balancer.
- [x] Migrate the database to an Amazon Aurora MySQL cluster. Create the primary DB instance and reader DB instance in separate Availability Zones.
- [ ] Launch a second EC2 instance in a second AWS Region. Use a Route 53 failover routing policy to redirect the traffic to the second EC2 instance.
- [ ] Create and configure an Auto Scaling group to launch private EC2 instances in multiple AWS Regions. Add the instances to a target group behind a new Application Load Balancer.
- [ ] Migrate the database to an Amazon Aurora MySQL cluster with cross-Region read replicas.

---

### Question-952
**Difficulty**: easy
**Topics**: storage:file:shared-file-system-design, storage:file:cross-az-file-access, architecture:ha:multi-az-design, storage:performance:storage-performance-optimization
**Tags**: efs, ec2, vpc
**Quality**: 3/5 — Tests basic AWS service selection for shared storage across EC2 instances; distractors are weak (S3 is not a mounted volume, EBS cannot mount across instances), making this primarily service-name recall rather than architectural reasoning.

A company is running a media store across multiple Amazon EC2 instances distributed across multiple Availability Zones in a single VPC. The company wants a high-performing solution to share data between all the EC2 instances, and prefers to keep the data within the VPC only.



What should a solutions architect recommend?

- [x] Configure an Amazon Elastic File System (Amazon EFS) file system and mount it across all instances
- [ ] Create an Amazon S3 bucket and call the service APIs from each instance's application
- [ ] Create an Amazon S3 bucket and configure all instances to access it as a mounted volume
- [ ] Configure an Amazon Elastic Block Store (Amazon EBS) volume and mount it across all instances

---

### Question-959
**Difficulty**: easy
**Topics**: architecture:ha:multi-az-design, architecture:ha:multi-region-design, compute:scaling:auto-scaling-groups, database:relational:multi-az-deployment, network:performance:content-delivery-strategy
**Tags**: ec2, rds, s3, cloudfront, auto-scaling
**Quality**: 3/5 — Tests basic HA best practices across three services but distractors are weak — single-AZ deployments, serving static assets from EC2, and using EFS for CDN are trivially eliminable by anyone with foundational AWS knowledge without requiring architectural reasoning.

An ecommerce company is preparing to deploy a web application on AWS to ensure continuous service for customers. The architecture includes a web application that the company hosts on Amazon EC2 instances, a relational database in Amazon RDS, and static assets that the company stores in Amazon S3.



The company wants to design a robust and resilient architecture for the application.



Which solution will meet these requirements?

- [x] Deploy Amazon EC2 instances in an Auto Scaling group across multiple Availability Zones. Deploy a Multi-AZ RDS DB instance. Use Amazon CloudFront to distribute static assets.
- [ ] Deploy Amazon EC2 instances in a single Availability Zone. Deploy an RDS DB instance in the same Availability Zone. Use Amazon S3 with versioning enabled to store static assets.
- [ ] Deploy Amazon EC2 instances in a single Availability Zone. Deploy an RDS DB instance in a second Availability Zone for cross-AZ redundancy. Serve static assets directly from the EC2 instances.
- [ ] Use AWS Lambda functions to serve the web application. Use Amazon Aurora Serverless v2 for the database. Store static assets in Amazon Elastic File System (Amazon EFS) One Zone-Infrequent Access (One Zone-IA).

---

### Question-960
**Difficulty**: medium
**Topics**: network:architecture:vpc-design, network:connectivity:privatelink-connectivity, security:network:network-segmentation-strategies, architecture:ha:multi-region-design, security:application:network-traffic-control
**Tags**: gwlb, gateway-load-balancer, vpc-endpoint, aws-organizations, security-appliance
**Quality**: 4/5 — Clear multi-account security scenario requiring understanding of GWLB's role in centralizing traffic inspection, VPC endpoint types, and cross-account architecture; distractors are plausible (NLB, ALB, direct VPC endpoint) but each fails to address the core requirement of centralized inspection across accounts via GWLB.

An ecommerce company runs several internal applications in multiple AWS accounts. The company uses AWS Organizations to manage its AWS accounts.



A security appliance in the company's networking account must inspect interactions between applications across AWS accounts.



Which solution will meet these requirements?

- [x] Deploy a Gateway Load Balancer (GWLB) in the networking account to send traffic to the security appliance. Configure the application accounts to send traffic to the GWLB by using an interface GWLB endpoint in the application accounts.
- [ ] Deploy a Network Load Balancer (NLB) in the networking account to send traffic to the security appliance. Configure the application accounts to send traffic to the NLB by using an interface VPC endpoint in the application accounts.
- [ ] Deploy an Application Load Balancer (ALB) in the application accounts to send traffic directly to the security appliance.
- [ ] Deploy an interface VPC endpoint in the application accounts to send traffic directly to the security appliance.

---

### Question-965
**Difficulty**: easy
**Topics**: database:relational:read-replicas-usage, database:performance:read-vs-write-intensive, database:performance:database-capacity-planning, architecture:ha:multi-az-design
**Tags**: rds, mysql
**Quality**: 3/5 — Tests basic RDS read replica knowledge but lacks specificity on traffic patterns, regional deployment, or cost-performance trade-offs; distractors are weak (Multi-AZ doesn't separate read/write traffic, and undersizing replicas is obviously suboptimal), making the correct answer easily identifiable through process of elimination rather than architectural reasoning.

An application allows users at a company's headquarters to access product data. The product data is stored in an Amazon RDS MySQL DB instance. The operations team has isolated an application performance slowdown and wants to separate read traffic from write traffic. A solutions architect needs to optimize the application's performance quickly.

What should the solutions architect recommend?

- [x] Create read replicas for the database. Configure the read replicas with the same compute and storage resources as the source database.
- [ ] Change the existing database to a Multi-AZ deployment. Serve the read requests from the primary Availability Zone.
- [ ] Change the existing database to a Multi-AZ deployment. Serve the read requests from the secondary Availability Zone.
- [ ] Create read replicas for the database. Configure the read replicas with half of the compute and storage resources as the source database.

---

### Question-971
**Difficulty**: medium
**Topics**: architecture:dr:disaster-recovery-strategies, architecture:dr:recovery-time-objective, architecture:ha:multi-region-design, database:nosql:global-tables-replication, network:dns:failover-routing-policy
**Tags**: ec2, auto-scaling, alb, aurora, route-53, rds
**Quality**: 4/5 — Well-structured DR scenario with clear RTO constraint (30 minutes) and explicit passive stance; correct answer requires understanding active-passive failover, Aurora global databases, and minimal standby capacity; distractors are meaningfully different (active-active, manual restore, AWS Backup) but somewhat transparently wrong for a passive DR with 30-min RTO.

A company runs a web application on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer (ALB). The application stores data in an Amazon Aurora MySQL DB cluster.



The company needs to create a disaster recovery (DR) solution. The acceptable recovery time for the DR solution is up to 30 minutes. The DR solution does not need to support customer usage when the primary infrastructure is healthy.



Which solution will meet these requirements?

- [x] Deploy the DR infrastructure in a second AWS Region with an ALB and an Auto Scaling group. Set the desired capacity and maximum capacity of the Auto Scaling group to a minimum value. Convert the Aurora MySQL DB cluster to an Aurora global database. Configure Amazon Route 53 for an active-passive failover with ALB endpoints.
- [ ] Deploy the DR infrastructure in a second AWS Region with an ALUpdate the Auto Scaling group to include EC2 instances from the second Region. Use Amazon Route 53 to configure active-active failover. Convert the Aurora MySQL DB cluster to an Aurora global database.
- [ ] Back up the Aurora MySQL DB cluster data by using AWS Backup. Deploy the DR infrastructure in a second AWS Region with an ALB. Update the Auto Scaling group to include EC2 instances from the second Region. Use Amazon Route 53 to configure active-active failover. Create an Aurora MySQL DB cluster in the second Region Restore the data from the backup.
- [ ] Back up the infrastructure configuration by using AWS Backup. Use the backup to create the required infrastructure in a second AWS Region. Set the Auto Scaling group desired capacity to zero. Use Amazon Route 53 to configure active-passive failover. Convert the Aurora MySQL DB cluster to an Aurora global database.

---

### Question-974
**Difficulty**: medium
**Topics**: database:relational:connection-pooling-proxies, architecture:resilience:fault-tolerance-design, architecture:ha:multi-az-design, database:performance:connection-pool-sizing
**Tags**: rds, rds-proxy, postgresql
**Quality**: 3/5 — Tests RDS Proxy knowledge for failover resilience but lacks depth — the scenario doesn't explain why connection pooling reduces failover time (connection reuse masks failover), other distractors are broadly eliminable without detailed reasoning, and the question assumes familiarity with RDS Proxy's connection management behavior.

A global ecommerce company runs its critical workloads on AWS. The workloads use an Amazon RDS for PostgreSQL DB instance that is configured for a Multi-AZ deployment.



Customers have reported application timeouts when the company undergoes database failovers. The company needs a resilient solution to reduce failover time.



Which solution will meet these requirements?

- [x] Create an Amazon RDS Proxy. Assign the proxy to the DB instance.
- [ ] Create a read replica for the DB instance. Move the read traffic to the read replica.
- [ ] Enable Performance Insights. Monitor the CPU load to identify the timeouts.
- [ ] Take regular automatic snapshots. Copy the automatic snapshots to multiple AWS Regions.

---

### Question-987
**Difficulty**: medium
**Topics**: storage:file:windows-vs-linux-file-systems, storage:file:shared-file-system-design, storage:hybrid:hybrid-storage-solutions, security:iam:directory-federation, architecture:ha:multi-az-design
**Tags**: fsx, fsx-windows, active-directory, efs, storage-gateway, s3
**Quality**: 4/5 — Clear scenario with specific constraints (Windows, SMB, Active Directory, HA) that correctly maps to FSx for Windows File Server; distractors are plausible but each violates a key requirement (EFS is POSIX-only, Storage Gateway SMB lacks native AD, S3 is object storage) — requires understanding file system types and AD integration.

A company has a large Microsoft SharePoint deployment running on-premises that requires Microsoft Windows shared file storage. The company wants to migrate this workload to the AWS Cloud and is considering various storage options. The storage solution must be highly available and integrated with Active Directory for access control.

Which solution will satisfy these requirements?

- [x] Create an Amazon FSx for Windows File Server file system on AWS and set the Active Directory domain for authentication.
- [ ] Configure Amazon EFS storage and set the Active Directory domain for authentication.
- [ ] Create an SMB file share on an AWS Storage Gateway file gateway in two Availability Zones.
- [ ] Create an Amazon S3 bucket and configure Microsoft Windows Server to mount it as a volume.

---

### Question-990
**Difficulty**: medium
**Topics**: storage:block:multi-attach-volumes, architecture:ha:multi-az-design, architecture:ha:active-active-failover, compute:instances:instance-type-selection
**Tags**: ec2, fsx, ebs, ontap, iscsi
**Quality**: 3/5 — Tests service selection for block storage HA across AZs, but the correct answer (FSx for NetApp ONTAP with iSCSI) requires specific knowledge of that service's multi-AZ capabilities; distractors mix plausible but suboptimal approaches (Windows clustering, EBS replication), though none are obviously wrong without deeper understanding of 'least implementation effort.'

A company currently runs an on-premises stock trading application by using Microsoft Windows Server. The company wants to migrate the application to the AWS Cloud.



The company needs to design a highly available solution that provides low-latency access to block storage across multiple Availability Zones.



Which solution will meet these requirements with the LEAST implementation effort?

- [x] Deploy the application on Amazon EC2 instances in two Availability Zones. Configure one EC2 instance as active and the second EC2 instance in standby mode. Use an Amazon FSx for NetApp ONTAP Multi-AZ file system to access the data by using Internet Small Computer Systems Interface (iSCSI) protocol.
- [ ] Configure a Windows Server cluster that spans two Availability Zones on Amazon EC2 instances. Install the application on both cluster nodes. Use Amazon FSx for Windows File Server as shared storage between the two cluster nodes.
- [ ] Configure a Windows Server cluster that spans two Availability Zones on Amazon EC2 instances. Install the application on both cluster nodes. Use Amazon Elastic Block Store (Amazon EBS) General Purpose SSD (gp3) volumes as storage attached to the EC2 instances. Set up application-level replication to sync data from one EBS volume in one Availability Zone to another EBS volume in the second Availability Zone.
- [ ] Deploy the application on Amazon EC2 instances in two Availability Zones. Configure one EC2 instance as active and the second EC2 instance in standby mode. Use Amazon Elastic Block Store (Amazon EBS) Provisioned IOPS SSD (io2) volumes as storage attached to the EC2 instances. Set up Amazon EBS level replication to sync data from one io2 volume in one Availability Zone to another io2 volume in the second Availability Zone.

---

### Question-994
**Difficulty**: medium
**Topics**: network:dns:geolocation-routing, network:load-balancing:load-balancing-strategy, network:performance:latency-optimization, architecture:ha:multi-region-design
**Tags**: route-53, ec2, network-load-balancer, application-load-balancer
**Quality**: 3/5 — Tests service selection for global routing but distractors are weak — geolocation vs geoproximity difference is subtle, multivalue answer is trivially eliminable, and ALB vs NLB choice doesn't materially affect the outcome since both can distribute within a region; the scenario lacks complexity around traffic patterns or specific failure modes.

A company is implementing a new application on AWS. The company will run the application on multiple Amazon EC2 instances across multiple Availability Zones within multiple AWS Regions. The application will be available through the internet. Users will access the application from around the world.



The company wants to ensure that each user who accesses the application is sent to the EC2 instances that are closest to the user’s location.



Which solution will meet these requirements?

- [x] Implement an Amazon Route 53 geoproximity routing policy. Use an internet-facing Network Load Balancer to distribute the traffic across all Availability Zones within the same Region.
- [ ] Implement an Amazon Route 53 geolocation routing policy. Use an internet-facing Application Load Balancer to distribute the traffic across all Availability Zones within the same Region.
- [ ] Implement an Amazon Route 53 multivalue answer routing policy. Use an internet-facing Application Load Balancer to distribute the traffic across all Availability Zones within the same Region.
- [ ] Implement an Amazon Route 53 weighted routing policy. Use an internet-facing Network Load Balancer to distribute the traffic across all Availability Zones within the same Region.

---

### Question-1002
**Difficulty**: medium
**Topics**: network:connectivity:hybrid-network-connectivity, network:routing:transit-gateway-routing, network:architecture:hub-and-spoke-topology, architecture:ha:multi-region-design, cost:optimization:network-transfer-minimization
**Tags**: direct-connect, transit-gateway, vpc, dns
**Quality**: 4/5 — Well-structured scenario with clear constraints (multiple accounts, on-premises services, cost-effective, low overhead) that makes Transit Gateway the obvious hub-and-spoke solution; distractors are plausible (per-account DX, VPC endpoints, VPN) but each fails on cost or operational overhead when compared systematically.

A company hosts its core network services, including directory services and DNS, in its on-premises data center. The data center is connected to the AWS Cloud using AWS Direct Connect (DX). Additional AWS accounts are planned that will require quick, cost-effective, and consistent access to these network services.



What should a solutions architect implement to meet these requirements with the LEAST amount of operational overhead?

- [x] Configure AWS Transit Gateway between the accounts. Assign DX to the transit gateway and route network traffic to the on-premises servers.
- [ ] Create a DX connection in each new account. Route the network traffic to the on-premises servers.
- [ ] Configure VPC endpoints in the DX VPC for all required services. Route the network traffic to the on-premises servers.
- [ ] Create a VPN connection between each new account and the DX VPRoute the network traffic to the on-premises servers.

---

### Question-1003
**Difficulty**: easy
**Topics**: network:performance:content-delivery-strategy, network:performance:edge-acceleration-cdn, cost:optimization:data-transfer-cost-reduction, architecture:ha:global-load-distribution
**Tags**: cloudfront, alb, ec2, auto-scaling, route-53
**Quality**: 3/5 — Tests basic CloudFront knowledge for global content delivery and cost optimization, but distractors are weak — Route 53 alone doesn't improve cost or global performance, S3 hosting contradicts a dynamic web app, and Direct Connect doesn't serve content — making elimination straightforward without deep architectural reasoning.

A company hosts its main public web application in one AWS Region across multiple Availability Zones. The application uses an Amazon EC2 Auto Scaling group and an Application Load Balancer (ALB).



A web development team needs a cost-optimized compute solution to improve the company’s ability to serve dynamic content globally to millions of customers.



Which solution will meet these requirements?

- [x] Create an Amazon CloudFront distribution. Configure the existing ALB as the origin.
- [ ] Use Amazon Route 53 to serve traffic to the ALB and EC2 instances based on the geographic location of each customer.
- [ ] Create an Amazon S3 bucket with public read access enabled. Migrate the web application to the S3 bucket. Configure the S3 bucket for website hosting.
- [ ] Use AWS Direct Connect to directly serve content from the web application to the location of each customer.

---

### Question-1005
**Difficulty**: medium
**Topics**: storage:file:shared-file-system-design, storage:file:cross-az-file-access, architecture:ha:multi-az-design, compute:scaling:horizontal-scaling
**Tags**: ebs, efs, ec2, auto-scaling
**Quality**: 4/5 — Clear scenario with well-defined constraints (multi-instance access, high availability, minimal code changes) where EFS is the obvious choice; distractors are plausible (NFS, FSx, multi-volume approaches) but each violates a key requirement — NFS lacks HA and scalability, FSx is Windows-only or single-AZ, and multi-volume EBS doesn't solve shared access.

A company is testing an application that runs on an Amazon EC2 Linux instance. A single 500 GB Amazon Elastic Block Store (Amazon EBS) General Purpose SSO (gp2) volume is attached to the EC2 instance.



The company will deploy the application on multiple EC2 instances in an Auto Scaling group. All instances require access to the data that is stored in the EBS volume. The company needs a highly available and resilient solution that does not introduce significant changes to the application's code.



Which solution will meet these requirements?

- [x] Provision an Amazon Elastic File System (Amazon EFS) file system. Configure the file system to use General Purpose performance mode.
- [ ] Provision an EC2 instance that uses NFS server software. Attach a single 500 GB gp2 EBS volume to the instance.
- [ ] Provision an Amazon FSx for Windows File Server file system. Configure the file system as an SMB file store within a single Availability Zone.
- [ ] Provision an EC2 instance with two 250 GB Provisioned IOPS SSD EBS volumes.

---

### Question-1006
**Difficulty**: easy
**Topics**: network:load-balancing:layer4-vs-layer7-balancing, compute:scaling:auto-scaling-groups, architecture:ha:multi-az-design, architecture:ha:availability-zone-strategy, cost:optimization:rightsizing-compute
**Tags**: nlb, ec2, auto-scaling
**Quality**: 3/5 — Tests basic recall of load balancer selection and auto-scaling but lacks scenario depth — no traffic patterns, no cost justification for NLB over ALB, and distractors (ALB, Gateway LB, manual scaling) are trivially eliminable by anyone familiar with basic AWS services.

A company recently launched a new application for its customers. The application runs on multiple Amazon EC2 instances across two Availability Zones. End users use TCP to communicate with the application.



The application must be highly available and must automatically scale as the number of users increases.



Which combination of steps will meet these requirements MOST cost-effectively? (Choose two.)

- [x] Add a Network Load Balancer in front of the EC2 instances.
- [x] Configure an Auto Scaling group for the EC2 instances.
- [ ] Add an Application Load Balancer in front of the EC2 instances.
- [ ] Manually add more EC2 instances for the application.
- [ ] Add a Gateway Load Balancer in front of the EC2 instances.

---

### Question-1012
**Difficulty**: medium
**Topics**: network:connectivity:vpn-site-to-site, network:architecture:vpc-design, network:architecture:subnet-tiers-routing, security:network:public-private-subnets, architecture:ha:multi-az-design
**Tags**: rds, vpc, site-to-site-vpn, security-groups
**Quality**: 4/5 — Clear security-focused scenario requiring understanding of VPC topology, subnet placement, and hybrid connectivity trade-offs; distractors progressively violate security principles (public subnets, IP-based rules) making each meaningfully different but plausible for those lacking security depth.

A company's software development team needs an Amazon RDS Multi-AZ cluster. The RDS cluster will serve as a backend for a desktop client that is deployed on premises. The desktop client requires direct connectivity to the RDS cluster.



The company must give the development team the ability to connect to the cluster by using the client when the team is in the office.



Which solution provides the required connectivity MOST securely?

- [x] Create a VPC and two private subnets. Create the RDS cluster in the private subnets. Use AWS Site-to-Site VPN with a customer gateway in the company's office.
- [ ] Create a VPC and two public subnets. Create the RDS cluster in the public subnets. Use AWS Site-to-Site VPN with a customer gateway in the company's office.
- [ ] Create a VPC and two private subnets. Create the RDS cluster in the private subnets. Use RDS security groups to allow the company's office IP ranges to access the cluster.
- [ ] Create a VPC and two public subnets. Create the RDS cluster in the public subnets. Create a cluster user for each developer. Use RDS security groups to allow the users to access the cluster.

---

### Question-1013
**Difficulty**: easy
**Topics**: cost:optimization:data-transfer-cost-reduction, network:performance:network-transfer-costs, architecture:ha:availability-zone-strategy
**Tags**: ec2, s3
**Quality**: 3/5 — Tests basic understanding of data transfer costs within AZs, but the scenario lacks specificity (no mention of data volume, frequency, or regional constraints) and distractors are weak — Auto Scaling addresses scalability not cost, and multi-AZ placement increases costs rather than reducing them.

A solutions architect is creating an application that will handle batch processing of large amounts of data. The input data will be held in Amazon S3 and the output data will be stored in a different S3 bucket. For processing, the application will transfer the data over the network between multiple Amazon EC2 instances.



What should the solutions architect do to reduce the overall data transfer costs?

- [x] Place all the EC2 instances in the same Availability Zone.
- [ ] Place all the EC2 instances in an Auto Scaling group.
- [ ] Place all the EC2 instances in the same AWS Region.
- [ ] Place all the EC2 instances in private subnets in multiple Availability Zones.

---
