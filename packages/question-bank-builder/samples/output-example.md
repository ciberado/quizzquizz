# Question Bank: AWS Architecting Fundamentals – Module 1

## Metadata
- **Topics**: aws-benefits, global-infrastructure, well-architected-framework, solutions-architect, aws-tools
- **Default Time Limit**: 30s
- **Description**: Questions covering AWS value proposition, global infrastructure components, region selection, the Well-Architected Framework pillars, and AWS interaction tools.

---

## Questions

### Q001
**Difficulty**: easy
**Topics**: aws-benefits
**Tags**: agility, cloud-adoption, business-value

A company is currently spending most of its engineering time on procuring and managing physical servers, leaving little bandwidth for new features. Which AWS benefit most directly addresses this problem?

- [x] Accelerating time to market by reducing infrastructure management overhead
- [x] Enabling teams to focus on developing customer-facing value instead of hardware
- [ ] Eliminating the need for software engineers entirely
- [ ] Automatically generating application code on behalf of the team
- [ ] Reduced cost without any architectural changes

---

### Q002
**Difficulty**: easy
**Topics**: aws-benefits
**Tags**: cost-optimization, pay-as-you-go

A startup wants to run a workload that experiences heavy traffic on weekdays but almost none on weekends. Which aspect of the AWS cost model makes this scenario more economical than traditional on-premises infrastructure?

- [x] Paying only for compute resources while they are actively used
- [ ] Receiving a fixed monthly bill regardless of usage
- [ ] Having AWS absorb all costs during low-traffic periods
- [ ] Purchasing a perpetual hardware license that covers all future usage
- [ ] Automatically shutting down all services during off-peak hours without configuration

---

### Q003
**Difficulty**: easy
**Topics**: aws-benefits
**Tags**: risk-reduction, security, compliance

Your organization handles sensitive customer data and is evaluating moving workloads to AWS. Which statements accurately describe how AWS helps reduce security risk? (Select all that apply)

- [x] Applications and data are placed behind the physical security of AWS data centers
- [x] AWS provides tools to manage and control access to resources
- [ ] AWS automatically assumes full legal liability for any data breaches
- [ ] Moving to AWS removes the need for any internal security policies
- [ ] AWS encrypts all customer data by default with no additional configuration required

---

### Q004
**Difficulty**: easy
**Topics**: global-infrastructure
**Tags**: availability-zones, data-centers, redundancy

An engineer describes a deployment unit as "one or more discrete data centers with redundant power, networking, and connectivity, located within a single geographic area." Which AWS infrastructure component is being described?

- [x] Availability Zone
- [ ] AWS Region
- [ ] Edge location
- [ ] AWS Local Zone
- [ ] AWS Direct Connect location

---

### Q005
**Difficulty**: medium
**Topics**: global-infrastructure
**Tags**: regions, fault-tolerance, isolation

A solutions architect is designing a highly available application and considers spreading instances across multiple Availability Zones within a Region. Which benefit does this multi-AZ configuration directly provide?

- [x] High availability, so that if one zone's instance fails another can handle requests
- [ ] Automatic replication of data to a different AWS Region
- [ ] Lower costs because unused capacity is shared between zones
- [ ] Direct physical proximity to all global end users
- [ ] Guaranteed sub-millisecond latency for all database queries

---

### Q007
**Difficulty**: medium
**Topics**: global-infrastructure
**Tags**: region-selection, compliance, latency, cost
**Time Limit**: 40s

A multinational retail company is selecting an AWS Region to host a new customer application. Their priorities are: complying with local data residency laws, keeping response times low for users in that country, and staying within budget. Which factors should guide their Region selection? (Select all that apply)

- [x] Governance and legal requirements around data sovereignty
- [x] Proximity to end users to reduce latency
- [x] Service availability within the candidate Regions
- [x] Comparative pricing for the services they plan to use
- [ ] The total number of edge locations globally

---

### Q008
**Difficulty**: medium
**Topics**: global-infrastructure
**Tags**: local-zones, low-latency, use-cases

A media production studio needs to run graphics-intensive virtual workstations for video editors located in a city that is far from the nearest AWS Region. Which AWS infrastructure option best meets this single-digit millisecond latency requirement?

- [x] AWS Local Zones, which extend compute and storage services closer to end users
- [ ] Additional Availability Zones within the nearest Region
- [ ] Amazon CloudFront edge locations configured for compute tasks
- [ ] A dedicated AWS Region built exclusively for that city
- [ ] AWS Outposts installed inside the studio's office building

---

### Q009
**Difficulty**: medium
**Topics**: global-infrastructure
**Tags**: edge-locations, cloudfront, caching, content-delivery

A global streaming platform stores its video library in Amazon S3 in one Region but serves viewers worldwide. Playback is slow for users in distant continents. Which AWS capability should the architect use to cache content closer to viewers?

- [x] Amazon CloudFront edge locations, which cache content at points of presence near end users
- [ ] Copying S3 buckets to every AWS Region
- [ ] Deploying additional EC2 instances in every Region to host the video files
- [ ] Using AWS Local Zones to run the S3 service in each city
- [ ] Enabling S3 Transfer Acceleration for all objects

---

### Q010
**Difficulty**: easy
**Topics**: global-infrastructure
**Tags**: edge-locations, local-zones, comparison

A team needs to decide between AWS Local Zones and edge locations for two separate requirements: (1) running a low-latency multiplayer game backend, and (2) delivering cached static assets to users worldwide. Which pairing is correct?

- [x] Local Zones for the game backend; edge locations for the cached assets
- [ ] Edge locations for the game backend; Local Zones for the cached assets
- [ ] Both requirements are best served by edge locations alone
- [ ] Both requirements are best served by Local Zones alone
- [ ] Neither option applies; both require a dedicated new AWS Region

---

### Q011
**Difficulty**: medium
**Topics**: well-architected-framework
**Tags**: pillars, framework-overview
**Time Limit**: 40s

Your team is preparing an architectural review using the AWS Well-Architected Framework. Which of the following are recognized pillars of that framework? (Select all that apply)

- [x] Security
- [x] Reliability
- [x] Cost optimization
- [x] Operational excellence
- [x] Sustainability
- [ ] Vendor neutrality
- [ ] Sovereignty

---

### Q012
**Difficulty**: medium
**Topics**: well-architected-framework
**Tags**: security-pillar, least-privilege, access-control

A security audit finds that several IAM users have been granted administrator access simply because it was convenient during initial setup. According to the Security pillar of the AWS Well-Architected Framework, what corrective approach should be taken?

- [x] Apply the principle of least privilege by granting only the permissions required for each user's role
- [ ] Delete all IAM users and rely solely on the root account for management tasks
- [ ] Move all workloads to a private data center to avoid cloud IAM limitations
- [ ] Rotate access keys weekly but keep administrator-level permissions unchanged
- [ ] Disable multi-factor authentication to simplify access management

---

### Q013
**Difficulty**: medium
**Topics**: well-architected-framework
**Tags**: reliability-pillar, fault-tolerance, recovery

An e-commerce platform experiences complete downtime every time a single component fails. According to the Reliability pillar of the AWS Well-Architected Framework, which design approach would best address this?

- [x] Designing the system to recover automatically from failures and distribute load across redundant components
- [ ] Purchasing a support plan that guarantees AWS will fix failures within one hour
- [ ] Running all components on the largest available instance type to minimize failure probability
- [ ] Storing full system backups once per month on a separate hard drive
- [ ] Disabling auto-scaling to maintain a predictable resource footprint

---

### Q014
**Difficulty**: medium
**Topics**: well-architected-framework
**Tags**: sustainability-pillar, cost-optimization, environmental-impact

A cloud team is asked to reduce the carbon footprint of their workloads without compromising functionality. Which pillar of the AWS Well-Architected Framework is most directly relevant to this goal?

- [x] Sustainability, which focuses on minimizing and understanding the environmental impact of cloud workloads
- [ ] Operational excellence, which focuses on monitoring and improving operational processes
- [ ] Performance efficiency, which focuses on delivering efficient performance for a given set of resources
- [ ] Cost optimization, which focuses on achieving cost efficiency
- [ ] Reliability, which focuses on meeting operational thresholds and recovering from failures

---

### Q015
**Difficulty**: medium
**Topics**: well-architected-framework
**Tags**: wa-tool, self-service, review-process

An architect wants to evaluate an existing workload against AWS best practices without scheduling time with an AWS Solutions Architect. Which tool supports this self-service review workflow?

- [x] The AWS Well-Architected Tool, which allows architects to review workloads against best practices directly in the console
- [ ] AWS Trusted Advisor, which automatically remediates all architectural issues
- [ ] AWS Config, which enforces compliance rules on deployed resources
- [ ] AWS CloudFormation, which validates infrastructure templates before deployment
- [ ] AWS Cost Explorer, which identifies underutilized resources

---

### Q016
**Difficulty**: easy
**Topics**: solutions-architect
**Tags**: sa-responsibilities, business-alignment, cloud-strategy

During a project kickoff, the CTO asks which team member is responsible for translating business requirements into a cloud architecture strategy and guiding migration efforts. Which role best fits this description?

- [x] AWS Solutions Architect, who develops technical cloud strategy based on business needs and assists with migration
- [ ] Cloud FinOps Engineer, who focuses on billing and cost attribution
- [ ] AWS Support Engineer, who responds to operational incidents after deployment
- [ ] Data Engineer, who designs data pipelines and ETL processes
- [ ] Cloud Security Analyst, who audits IAM policies and compliance reports

---

### Q017
**Difficulty**: medium
**Topics**: solutions-architect, well-architected-framework
**Tags**: sa-responsibilities, high-risk-issues, workload-review

A solutions architect is reviewing a new workload proposed by a development team. Which activities fall within the core responsibilities of that role? (Select all that apply)

- [x] Reviewing workload requirements against architectural best practices
- [x] Providing guidance on how to address high-risk architectural issues
- [x] Assisting with cloud migration planning and execution
- [ ] Writing application-level unit tests for the development team
- [ ] Managing the company's payroll and HR systems

---

### Q018
**Difficulty**: easy
**Topics**: aws-tools
**Tags**: management-console, cli, sdk, infrastructure-as-code

A new team member asks about the different ways to interact with AWS services. Which of the following are valid AWS interaction methods? (Select all that apply)

- [x] AWS Management Console, a graphical interface for managing AWS accounts
- [x] AWS Command Line Interface (AWS CLI), for managing services via the command line
- [x] AWS SDKs and the AWS CDK, for provisioning infrastructure using programming languages
- [ ] AWS Direct Mail, a proprietary email client for submitting resource requests
- [ ] AWS Visual Studio Online, a browser-based IDE that directly provisions AWS resources through drag-and-drop

---

### Q019
**Difficulty**: medium
**Topics**: aws-tools
**Tags**: aws-cli, sdk, automation, scripting

A DevOps engineer needs to automate the daily creation of snapshots across hundreds of EC2 instances. Which AWS interaction method is most appropriate for this automation task?

- [x] AWS CLI or SDK, which allow scripting and programmatic control of AWS resources
- [ ] AWS Management Console, by clicking through each instance manually each day
- [ ] AWS CloudFront, which caches and delivers content rather than managing resources
- [ ] The AWS Well-Architected Tool, which is used for architectural reviews not automation
- [ ] AWS Local Zones, which extend compute capacity but do not provide scripting capabilities

---

### Q020
**Difficulty**: hard
**Topics**: global-infrastructure, well-architected-framework
**Tags**: architecture-decision, multi-az, region-selection, reliability
**Time Limit**: 45s

A financial services company must deploy a transaction-processing application that meets the following constraints: data must remain within a specific country due to regulatory requirements, end users in that country must experience low latency, and the system must survive the failure of any single data center. Which combination of AWS infrastructure decisions satisfies all three constraints with minimum complexity?

- [x] Deploy in a single AWS Region within the required country, distributed across multiple Availability Zones
- [ ] Deploy across two AWS Regions in different countries to maximize redundancy
- [ ] Use only edge locations within the country to serve both compute and storage workloads
- [ ] Deploy in a single Availability Zone with enhanced instance types for maximum reliability
- [ ] Use AWS Local Zones in the nearest city as the sole deployment target without any redundancy layer

---
