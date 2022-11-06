import { Construct} from "constructs";
import {S3Backend, TerraformOutput, TerraformStack, Fn} from "cdktf";
import { EcrRepository } from "@cdktf/provider-aws/lib/ecr-repository";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Ecs } from "../../.gen/modules/ecs";
import {EcsTaskDefinition} from "@cdktf/provider-aws/lib/ecs-task-definition";
import {Alb} from "@cdktf/provider-aws/lib/alb";
import {AlbListener} from "@cdktf/provider-aws/lib/alb-listener";
import {AlbTargetGroup} from "@cdktf/provider-aws/lib/alb-target-group";
import {EcsService} from "@cdktf/provider-aws/lib/ecs-service";
import {AlbListenerRule} from "@cdktf/provider-aws/lib/alb-listener-rule";
import {Vpc} from "../../.gen/modules/vpc";

export class PetAppStack extends TerraformStack {

    constructor(scope: Construct, id: string, baseVpc: Vpc, securityGroup: string) {
        super(scope, id);

        new AwsProvider(this, "aws", {
            region: "us-east-1",
            profile: "dev"
        });


        new S3Backend(this,{
            key: "petapp/PetAppStack.tfstate",
            bucket: "nshipman-io-dev-terraform-state",
            encrypt: true,
            region: "us-east-1",
            profile: "dev",
            dynamodbTable: "nshipman-io-dev-terraform-state-lock"
        });

        const repo = new EcrRepository(this, "pet-app", {
            name: "pet-app",
            imageTagMutability: "MUTABLE",
            tags: {
                Environment: "development",
                Team: "Engineering"
            }
        });

        const lb = new Alb(this, "pet-app-lb", {
            name: "pet-app-lb",
            internal: false,
            loadBalancerType: "application",
            securityGroups: [securityGroup],
            subnets: Fn.tolist(baseVpc.privateSubnetsOutput),
            tags: {
                Environment: "Development",
                Team: "Engineering"
            }

        });

        const lbl = new AlbListener(this, "pet-app-lb-listener", {
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

        const lbTargetGroup = new AlbTargetGroup(this, "pet-app-lb-target-group", {
            name: "pet-app-lb-target-group",
            port: 80,
            protocol: "HTTP",
            targetType: "ip",
            vpcId: baseVpc.vpcIdOutput,
            healthCheck: {
                enabled: true,
                path: "/"
            },
            tags: {
              Environment: "Development",
              Team: "Engineering"
            }
        });

        new AlbListenerRule(this, "pet-app-lb-listener-rule", {
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

        const cluster = new Ecs(this, "pet-app-cluster", {
            clusterName: "pet-app-cluster",
        });

        const task = new EcsTaskDefinition(this, "pet-app-task",
            {
                cpu: "256",
                memory: "512",
                requiresCompatibilities: ["FARGATE"],
                networkMode: "awsvpc",
                containerDefinitions: JSON.stringify([
                    {
                        name: "pet-app",
                        image: "latest",
                        cpu: 256,
                        memory: 512,
                        portMappings: [
                            {
                                containerPort: 80,
                                hostPort: 80,
                            },
                        ],
                        }
                    ]),
                family: "service",
            });

        new EcsService(this, "pet-app-service", {
            name: "pet-app-service",
            launchType: "FARGATE",
            cluster: cluster.clusterIdOutput,
            desiredCount: 1,
            taskDefinition: task.arn,
            networkConfiguration: {
                subnets: Fn.tolist(baseVpc.privateSubnetsOutput),
                assignPublicIp: false,
                securityGroups: [securityGroup]
            },
            loadBalancer: [
                {
                    containerPort: 80,
                    containerName: "pet-app",
                    targetGroupArn: lbTargetGroup.arn,
                }
            ]
        });

        new TerraformOutput(this, "ecr-repo-arn", {
            value: repo.arn
        });

    }
}