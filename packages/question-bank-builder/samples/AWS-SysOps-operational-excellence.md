# Question Bank: AWS SysOps - Well-Architected Operational Excellence

## Metadata
- **Topics**: well-architected-framework, operational-excellence, cloudwatch, cloudformation, autoscaling
- **Default Time Limit**: 45s
- **Description**: Operational Excellence-focused SysOps questions covering monitoring, automated operations, deployment safety, and governance.

---

## Questions

### Q471
**Difficulty**: medium
**Topics**: operational-excellence, cloudwatch
**Tags**: dashboards, multi-region, observability

A SysOps Administrator is running Amazon EC2 instances in multiple AWS Regions. The Administrator wants to aggregate the CPU utilization for all instances onto an Amazon CloudWatch dashboard. Each region should be present on the dashboard and represented by a single graph that contains the CPU utilization for all instances in that region.

How can the Administrator meet these requirements?

- [x] Create a custom CloudWatch dashboard and add a widget for each region in the AWS Management Console
- [ ] Create a cross-region dashboard using AWS Lambda and distribute it to all regions
- [ ] Enable cross-region dashboards under the CloudWatch section of the AWS Management Console
- [ ] Switch from basic monitoring to detailed monitoring on all instances

---

### Q473
**Difficulty**: hard
**Topics**: operational-excellence, deployment
**Tags**: golden-ami, blue-green, rollback

A Development team has an application stack consisting of many OS dependencies and language runtime dependencies. When deploying the application to production, the most important factor is how quickly the instance is operational.

What deployment methodology should be used to update the running environments to meet the requirement?

- [x] Use fully baked AMIs ("golden images") created after each successful build, creating a new Auto Scaling group, and blue/green deployments with rollbacks.
- [ ] Use user-data scripts to configure the instance correctly on boot by installing all dependencies when needed.
- [ ] Use an AWS Lambda function to only update the application locally on each instance, then re-attach it to the load balancer when the process complete.
- [ ] Use AWS OpsWorks scripts to execute on reboot of each instance to install all known dependencies, then re-attach the instances to the load balancer.

---

### Q476
**Difficulty**: medium
**Topics**: operational-excellence, autoscaling
**Tags**: sqs, cloudwatch, elasticity

A Content Processing team has notified a SysOps Administrator that their content is sometimes taking a long time to process, whereas other times it processes quickly. The Content Processing submits messages to an Amazon Simple Queue Service (Amazon SQS) queue, which details the files that need to be processed.

An Amazon EC2 instance polls the queue to determine which file to process next.

How could the Administrator maintain a fast but cost-effective processing time?

- [x] Create an Auto Scaling policy to increase the number of EC2 instances polling the queue and a CloudWatch alarm to scale based on ApproximateNumberOfMessagesVisible
- [ ] Attach an Auto Scaling policy to the Amazon SQS queue to increase the number of EC2 instances based on the depth of the SQS queue
- [ ] Create an Auto Scaling policy to increase the number of EC2 instances polling the queue and a CloudWatch alarm to scale based on MaxVisibility Timeout
- [ ] Attach an Auto Scaling policy to the SQS queue to scale instances based on the depth of the dead-letter queue

---

### Q477
**Difficulty**: medium
**Topics**: operational-excellence, cloudwatch
**Tags**: custom-metrics, memory, autoscaling

A SysOps Administrator receives reports of an Auto Scaling group failing to scale when the nodes running Amazon Linux in the cluster are constrained by high memory utilization.

What should the Administrator do to enable scaling to better adapt to the high memory utilization?

- [x] Install the Amazon CloudWatch memory monitoring scripts, and create a custom metric based on the script's results
- [ ] Create a custom script that pipes memory utilization to Amazon S3, then, scale with an AWS Lambda-powered event
- [ ] Increase the minimum size of the cluster to meet memory and application load demands
- [ ] Deploy an Application Load Balancer to more evenly distribute traffic among nodes

---

### Q479
**Difficulty**: medium
**Topics**: operational-excellence, incident-response
**Tags**: alarm-actions, self-healing, ec2

An errant process is known to use an entire processor and run at 100%. A SysOps Administrator wants to automate restarting the instance once the problem occurs for more than 2 minutes.

How can this be accomplished?

- [x] Create a CloudWatch alarm for the EC2 instance with detailed monitoring. Enable an action to restart the instance.
- [ ] Create an Amazon CloudWatch alarm for the EC2 instance with basic monitoring. Enable an action to restart the instance.
- [ ] Create an AWS Lambda function to restart the EC2 instance, triggered on a scheduled basis every 2 minutes.
- [ ] Create a Lambda function to restart the EC2 instance, triggered by EC2 health checks.

---

### Q490
**Difficulty**: easy
**Topics**: operational-excellence, observability
**Tags**: bottleneck-analysis, cloudwatch, troubleshooting

Website users report that an application's pages are loading slowly at the beginning of the workday. The application runs on Amazon EC2 instances, and data is stored in an Amazon RDS database. The SysOps Administrator suspects the issue is related to high CPU usage on a component of this application.

How can the Administrator find out which component is causing the performance bottleneck?

- [x] Use Amazon CloudWatch metrics to examine the resource usage of each component.
- [ ] Use AWS CloudTrail to review the resource usage history for each component.
- [ ] Use Amazon Inspector to view the resource usage details for each component.
- [ ] Use Amazon CloudWatch Events to examine the high usage events for each component.

---

### Q494
**Difficulty**: hard
**Topics**: operational-excellence, cloudformation
**Tags**: troubleshooting, waitcondition, cfn-signal

While creating the wait condition resource in AWS CloudFormation, a SysOps Administrator receives the error `received 0 signals out of the 1 expected from the EC2 instance`.

What steps should be taken to troubleshoot this issue? (Choose two.)

- [x] Confirm from the cfn logs that the cfn-signal command was successfully run on the instance.
- [x] Check that the instance has a route to the Internet through a NAT device.
- [ ] Try to re-create the stack with a different IAM user.
- [ ] Update the AWS CloudFormation stack service role to have iam:PassRole permission.
- [ ] Delete the existing stack and attempt to create a new once.

---

### Q502
**Difficulty**: easy
**Topics**: operational-excellence, governance
**Tags**: cloudformation, config, change-tracking

A SysOps Administrator must ensure that AWS CloudFormation deployment changes are properly tracked for governance.

Which AWS service should be used to accomplish this?

- [x] AWS Config
- [ ] AWS Artifact
- [ ] Amazon Inspector
- [ ] AWS Trusted Advisor

---

### Q506
**Difficulty**: easy
**Topics**: operational-excellence, resource-management
**Tags**: tagging, automation, lambda

A SysOps Administrator has an AWS Lambda function that stops all Amazon EC2 instances in a test environment at night and on the weekend. Stopping instances causes some servers to become corrupt due to the nature of the applications running on them.

What can the SysOps Administrator use to identify these EC2 instances?

- [x] Resource tagging
- [ ] AWS Config
- [ ] Amazon EC2 termination protection
- [ ] Amazon CloudWatch

---

### Q531
**Difficulty**: medium
**Topics**: operational-excellence, cloudformation
**Tags**: deployment-control, failure-handling

A SysOps Administrator is using AWS CloudFormation to deploy resources but would like to manually address any issues that the template encounters.

What should the Administrator add to the template to support the requirement?

- [x] Set the OnFailure parameter to "DO_NOTHING"
- [ ] Enable Termination Protection on the stack
- [ ] Restrict the IAM permissions for CloudFormation to delete resources
- [ ] Set the DeleteStack API action to "No"
