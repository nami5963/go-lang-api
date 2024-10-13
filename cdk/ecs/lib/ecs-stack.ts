import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import {
	Cluster,
	FargateTaskDefinition,
	ContainerImage,
	FargateService,
	AwsLogDriver,
} from 'aws-cdk-lib/aws-ecs';
import { Vpc, Subnet } from 'aws-cdk-lib/aws-ec2';
import {
	ApplicationTargetGroup,
	TargetType,
	ApplicationProtocol,
	Protocol,
	ApplicationListener,
	ListenerCondition,
	ListenerAction,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Repository } from 'aws-cdk-lib/aws-ecr';

export class EcsStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		/**
		 * aws-opsで作成済の既存リソース取得
		 */
		const vpc = Vpc.fromLookup(this, 'vpc', {
			vpcId: 'vpc-0cac539d00de87ad5',
		});
		const privateSubnetA = Subnet.fromSubnetId(
			this,
			'privateSubnetA',
			'subnet-0271c0e92e2305d80'
		);
		const privateSubnetC = Subnet.fromSubnetId(
			this,
			'privateSubnetC',
			'subnet-09787fcb56c1463b9'
		);
		const listener = ApplicationListener.fromLookup(this, 'listener', {
			listenerArn:
				'arn:aws:elasticloadbalancing:ap-northeast-1:731215346624:listener/app/elasticLoadBalancer/322c8f2e29c090fe/9db7bc2f992a3f0c',
		});

		/**
		 * 既存リソース取得終わり
		 * ---------------------------------------
		 * ここから新規リソース
		 */
		/**
		 * targetGroup for FargateService
		 */
		const targetGroup = new ApplicationTargetGroup(this, 'targetGroup', {
			targetGroupName: 'targetGroup',
			vpc: vpc,
			targetType: TargetType.IP,
			protocol: ApplicationProtocol.HTTP,
			port: 80,
			healthCheck: {
				path: '/v1/health',
				port: '80',
				protocol: Protocol.HTTP,
				interval: cdk.Duration.minutes(1),
				healthyThresholdCount: 2,
			},
		});
		listener.addAction('addAction', {
			priority: 1,
			conditions: [ListenerCondition.pathPatterns(['/v1/*'])],
			action: ListenerAction.forward([targetGroup]),
		});

		/**
		 * ECS Cluster
		 */
		const cluster = new Cluster(this, 'cluster', {
			clusterName: 'cluster',
			vpc: vpc,
		});

		/**
		 * Fargate Task Definition
		 */
		const role = new Role(this, 'iam', {
			assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
			roleName: 'myTaskExecutionRole',
		});
		// role.addManagedPolicy(
		// 	ManagedPolicy.fromAwsManagedPolicyName(
		// 		'service-role/AmazonECSTaskExecutionRolePolicy'
		// 	)
		// );
		role.addManagedPolicy(
			ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess') // ここ確認
		);
		const taskDefinition = new FargateTaskDefinition(this, 'taskDefinition', {
			cpu: 256,
			memoryLimitMiB: 512,
			executionRole: role,
		});
		const logDriver = new AwsLogDriver({
			streamPrefix: 'ecs-fargate',
		});
		const repository = Repository.fromRepositoryName(
			this,
			'repository',
			'go-lang-ecr-repo'
		);
		taskDefinition.addContainer('container', {
			image: ContainerImage.fromEcrRepository(repository),
			portMappings: [
				{
					containerPort: 80, // コンテナ内でリッスンするポート
					hostPort: 80, // ホスト側でマッピングするポート
				},
			],
			logging: logDriver,
		});

		/**
		 * ECS Service
		 */
		const service = new FargateService(this, 'service', {
			cluster,
			taskDefinition,
			desiredCount: 2,
			vpcSubnets: {
				subnets: [privateSubnetA, privateSubnetC],
			},
			healthCheckGracePeriod: cdk.Duration.minutes(10),
		});
		service.attachToApplicationTargetGroup(targetGroup);
	}
}
