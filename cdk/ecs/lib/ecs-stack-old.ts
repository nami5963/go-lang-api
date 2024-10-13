import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
	aws_ecs as ecs,
	aws_iam as iam,
	aws_ec2 as ec2,
	aws_elasticloadbalancingv2 as elbv2,
} from 'aws-cdk-lib';

export class EcsStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		// IAM role for taskExecution
		const ecsTaskExecutionRole = new iam.CfnRole(this, 'ecsTaskExecutionRole', {
			assumeRolePolicyDocument: {
				Version: '2008-10-17',
				Statement: [
					{
						Sid: '',
						Effect: 'Allow',
						Principal: {
							Service: 'ecs-tasks.amazonaws.com',
						},
						Action: 'sts:AssumeRole',
					},
				],
			},
			policies: [
				{
					policyDocument: {
						Version: '2012-10-17',
						Statement: [
							{
								Effect: 'Allow',
								Action: [
									'ecr:GetAuthorizationToken',
									'ecr:BatchCheckLayerAvailability',
									'ecr:GetDownloadUrlForLayer',
									'ecr:BatchGetImage',
									'logs:CreateLogStream',
									'logs:PutLogEvents',
								],
								Resource: '*',
							},
						],
					},
					policyName: 'ecsTaskExecutionPolicy',
				},
			],
			roleName: 'ecsTaskExecutionRole',
		});

		const taskDefinition = new ecs.CfnTaskDefinition(this, 'taskDefinition', {
			containerDefinitions: [
				{
					image:
						'731215346624.dkr.ecr.ap-northeast-1.amazonaws.com/go-lang-ecr-repo',
					name: 'GoLangAPI',
					portMappings: [
						{
							containerPort: 80,
						},
					],
				},
			],
			networkMode: 'awsvpc',
			executionRoleArn: ecsTaskExecutionRole.ref,
			requiresCompatibilities: ['FARGATE'],
			cpu: '256',
			memory: '512',
		});

		const cluster = new ecs.CfnCluster(this, 'cluster', {
			clusterName: 'cluster',
		});

		// IAM role for Blue/GreenDeployment
		const ecsCodeDeployRole = new iam.CfnRole(this, 'ecsCodeDeployRole', {
			assumeRolePolicyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Sid: '',
						Effect: 'Allow',
						Principal: {
							Service: 'codedeploy.amazonaws.com',
						},
						Action: 'sts:AssumeRole',
					},
				],
			},
			policies: [
				{
					policyDocument: {
						Version: '2012-10-17',
						Statement: [
							{
								Action: [
									'ecs:DescribeServices',
									'ecs:CreateTaskSet',
									'ecs:UpdateServicePrimaryTaskSet',
									'ecs:DeleteTaskSet',
									'elasticloadbalancing:DescribeTargetGroups',
									'elasticloadbalancing:DescribeListeners',
									'elasticloadbalancing:ModifyListener',
									'elasticloadbalancing:DescribeRules',
									'elasticloadbalancing:ModifyRule',
									'lambda:InvokeFunction',
									'cloudwatch:DescribeAlarms',
									'sns:Publish',
									's3:GetObject',
									's3:GetObjectVersion',
								],
								Resource: '*',
								Effect: 'Allow',
							},
							{
								Action: ['iam:PassRole'],
								Effect: 'Allow',
								Resource: '*',
								Condition: {
									StringLike: {
										'iam:PassedToService': ['ecs-tasks.amazonaws.com'],
									},
								},
							},
						],
					},
					policyName: 'ecsCodeDeployPolicy',
				},
			],
			roleName: 'ecsCodeDeployRole',
		});

		const ecsSecurityGroup = new ec2.CfnSecurityGroup(
			this,
			'ecsSecurityGroup',
			{
				groupDescription: 'ecs security group',
				securityGroupIngress: [
					{
						ipProtocol: 'TCP',
						fromPort: 80,
						sourceSecurityGroupId: 'sg-0643a927769a18d39',
						toPort: 80,
					},
				],
				vpcId: 'vpc-0cac539d00de87ad5',
			}
		);

		const ecsTargetGroup = new elbv2.CfnTargetGroup(this, 'ecsTargetGroup', {
			healthCheckEnabled: true,
			targetType: 'ip',
			ipAddressType: 'ipv4',
			port: 80,
			protocol: 'HTTP',
			name: 'ecsTargetGroup',
			vpcId: 'vpc-0cac539d00de87ad5',
		});

		const ecsListerRule = new elbv2.CfnListenerRule(this, 'ecsListerRule', {
			actions: [
				{
					type: 'forward',
					forwardConfig: {
						targetGroups: [
							{
								targetGroupArn: ecsTargetGroup.ref,
							},
						],
					},
				},
			],
			conditions: [
				{
					field: 'path-pattern',
					pathPatternConfig: {
						values: ['/'],
					},
				},
			],
			priority: 1,
			listenerArn:
				'arn:aws:elasticloadbalancing:ap-northeast-1:731215346624:listener/app/elasticLoadBalancer/322c8f2e29c090fe/9db7bc2f992a3f0c',
		});

		const service = new ecs.CfnService(this, 'service', {
			cluster: cluster.ref,
			taskDefinition: taskDefinition.ref,
			loadBalancers: [
				{
					containerName: 'GoLangAPI',
					containerPort: 80,
					// loadBalancerName: 'ELB',
					targetGroupArn: ecsTargetGroup.ref,
				},
			],
			networkConfiguration: {
				awsvpcConfiguration: {
					securityGroups: [ecsSecurityGroup.ref],
					subnets: ['subnet-0271c0e92e2305d80', 'subnet-09787fcb56c1463b9'],
				},
			},
			healthCheckGracePeriodSeconds: 120,
		});
	}
}
