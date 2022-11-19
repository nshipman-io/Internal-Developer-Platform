import { Construct} from "constructs";
import {S3Backend, TerraformStack, Fn} from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Ecs } from "../../.gen/modules/ecs";
import {EcsTaskDefinition} from "@cdktf/provider-aws/lib/ecs-task-definition";
import {Alb} from "@cdktf/provider-aws/lib/alb";
import {AlbListener} from "@cdktf/provider-aws/lib/alb-listener";
import {AlbTargetGroup} from "@cdktf/provider-aws/lib/alb-target-group";
import {EcsService} from "@cdktf/provider-aws/lib/ecs-service";
import {AlbListenerRule} from "@cdktf/provider-aws/lib/alb-listener-rule";
import {Vpc} from "../../.gen/modules/vpc";
import {IamRole} from "@cdktf/provider-aws/lib/iam-role";
import {CloudwatchLogGroup} from "@cdktf/provider-aws/lib/cloudwatch-log-group";
import {CodebuildProject} from "@cdktf/provider-aws/lib/codebuild-project";
import {CodebuildWebhook} from "@cdktf/provider-aws/lib/codebuild-webhook";

export interface PetAppConfig {
    gitBranch?: string
}

export interface BaseConfig {
    vpc: Vpc,
    privateSecurityGroup: string,
    publicSecurityGroup: string,
}

class PetAppCodeBuild extends Construct {
    constructor(scope: Construct, id: string, gitBranch?: string) {
        super(scope, id);

        const codebuildRole = new IamRole(this, `${id}-codebuild-role`, {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: "sts:AssumeRole",
                        Effect: "Allow",
                        Sid: "",
                        Principal: {
                            Service: "codebuild.amazonaws.com"
                        },
                    },
                ],
            }),
            //TODO: Rollback the excess permissions.
            name: `${id}-codebuild-role`,
            inlinePolicy: [
                {
                    name: `${id}-codebuild-role`,
                    policy: JSON.stringify({
                        Version: "2012-10-17",
                        Statement: [
                            {
                                Effect: "Allow",
                                Action: [
                                    "ec2:*",
                                    "s3:*",
                                    "logs:*",
                                    "ecr:*"
                                ],
                                Resource: "*",
                            },
                        ],
                    }),
                },
            ]
        });

        const project = new CodebuildProject(this, `${id}-codebuild-pipeline`, {
           name: id,
            artifacts: {
               type: "NO_ARTIFACTS"
            },
            environment: {
                computeType: "BUILD_GENERAL1_SMALL",
                image: "aws/codebuild/standard:4.0",
                type: "LINUX_CONTAINER",
                privilegedMode: true,
                imagePullCredentialsType: "CODEBUILD",

                environmentVariable: [
                    {
                        name: "AWS_DEFAULT_REGION",
                        value: "us-east-1"
                    },
                    {
                        name: "AWS_ACCOUNT_ID",
                        value: "678862804793"
                    },
                    {
                        name: "IMAGE_REPO_NAME",
                        value: "pet-app"
                    },
                    {
                        "name": "IMAGE_TAG",
                        value: "latest"
                    }
                ],

            },
            serviceRole: codebuildRole.arn,
            source: {
               type: "GITHUB",
               location: "https://github.com/nshipman-io/pet-app.git",
            }

        });

        new CodebuildWebhook(this, "pet-app-codebuild-webhook", {
            projectName: project.name,
            buildType: "BUILD",
            filterGroup: [
                {
                    filter: [
                        {
                            type: "EVENT",
                            pattern: "PUSH"
                        },
                        {
                            type: "HEAD_REF",
                            pattern: `${gitBranch}`
                        }
                    ],
                },
            ]
        });

    }
}

export class PetAppStack extends TerraformStack {

    constructor(scope: Construct, id: string, baseConfig: BaseConfig, config: PetAppConfig) {
        super(scope, id);

        new AwsProvider(this, "aws", {
            region: "us-east-1",
            profile: "dev"
        });

        if (!config.gitBranch)
        {
            console.log("No branch declared: Using main branch.")
            config.gitBranch = "main"
        }

        new  PetAppCodeBuild(this, `${id}-codebuild-pipeline`, config.gitBranch);

        new S3Backend(this,{
            key: `petapp/${id}.tfstate`,
            bucket: "nshipman-io-dev-terraform-state",
            encrypt: true,
            region: "us-east-1",
            profile: "dev",
            dynamodbTable: "nshipman-io-dev-terraform-state-lock"
        });



        const lb = new Alb(this, `${id}-lb`, {
            name: `${id}-lb`,
            internal: false,
            loadBalancerType: "application",
            securityGroups: [baseConfig.publicSecurityGroup],
            subnets: Fn.tolist(baseConfig.vpc.privateSubnetsOutput),
            tags: {
                Environment: "Development",
                Team: "Engineering"
            }

        });

        const lbl = new AlbListener(this, `${id}-lb-listener`, {
            defaultAction: [
                {
                    type: "fixed-response",
                    fixedResponse: {
                        contentType: "text/plain",
                        statusCode: "404",
                        messageBody: "Could not find the resource you are looking for",
                    }
                }
            ],
            loadBalancerArn: lb.arn,
            port: 80,
            protocol: "HTTP"
        });

        const lbTargetGroup = new AlbTargetGroup(this, `${id}-lb-target-group`, {
            name: `${id}-lb-target-group`,
            port: 80,
            protocol: "HTTP",
            targetType: "ip",
            vpcId: baseConfig.vpc.vpcIdOutput,
            healthCheck: {
                enabled: true,
                path: "/"
            },
            tags: {
              Environment: "Development",
              Team: "Engineering"
            }
        });

        new AlbListenerRule(this, `${id}-lb-listener-rule`, {
            listenerArn: lbl.arn,
            priority: 100,
            action: [
                {
                    type: "forward",
                    targetGroupArn: lbTargetGroup.arn
                },
            ],
            condition: [
                {
                    pathPattern: { values: [`/`] },
                },
            ]
        });

        const cluster = new Ecs(this, `${id}-cluster`, {
            clusterName: `${id}-cluster`,
        });

        const executionRole = new IamRole(this, `${id}-execution-role`, {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: "sts:AssumeRole",
                        Effect: "Allow",
                        Sid: "",
                        Principal: {
                            Service: "ecs-tasks.amazonaws.com",
                        },
                    },
                ],
            }),

            name: `${id}-execution-role`,
            inlinePolicy: [
                {
                    name: "allow-ecr-pull",
                    policy: JSON.stringify({
                        Version: "2012-10-17",
                        Statement: [
                            {
                                Effect: "Allow",
                                Action: [
                                    "ecr:*",
                                    "logs:CreateLogStream",
                                    "logs:PutLogEvents",
                                ],
                                Resource: "*",
                            },
                        ],
                    }),
                },
            ]
        });

        const logGroup = new CloudwatchLogGroup(this, `${id}-log-group`, {
            name: `${id}-log-group`,
            retentionInDays: 30,
            tags: {
                Environment: "Development",
                Team: "Engineering"
            }
        });

        const task = new EcsTaskDefinition(this, `${id}-task`,
            {
                cpu: "256",
                memory: "512",
                requiresCompatibilities: ["FARGATE"],
                networkMode: "awsvpc",
                executionRoleArn: executionRole.arn,
                containerDefinitions: JSON.stringify([
                    {
                        name: "pet-app",
                        image: "678862804793.dkr.ecr.us-east-1.amazonaws.com/pet-app:latest",
                        cpu: 256,
                        memory: 512,
                        portMappings: [
                            {
                                containerPort: 80,
                                hostPort: 80,
                            },
                        ],
                        logConfiguration: {
                            logDriver: "awslogs",
                            options: {
                                "awslogs-group": logGroup.name,
                                "awslogs-region": "us-east-1",
                                "awslogs-stream-prefix": "pet-app-task",
                            }
                        }
                        }
                    ]),
                family: "service",
            });

        new EcsService(this, `${id}-service`, {
            name: `${id}-service`,
            launchType: "FARGATE",
            cluster: cluster.clusterIdOutput,
            desiredCount: 1,
            taskDefinition: task.arn,
            networkConfiguration: {
                subnets: Fn.tolist(baseConfig.vpc.privateSubnetsOutput),
                assignPublicIp: false,
                securityGroups: [baseConfig.privateSecurityGroup]
            },
            loadBalancer: [
                {
                    containerPort: 80,
                    containerName: "pet-app",
                    targetGroupArn: lbTargetGroup.arn,
                }
            ]
        });


    }
}