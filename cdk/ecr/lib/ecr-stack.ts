import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class EcrStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Create ECR Repository
		const ecrRepository = new ecr.Repository(this, 'EcrRepo', {
			repositoryName: 'go-lang-ecr-repo',
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteImages: true,
		});
	}
}
