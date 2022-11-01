import { Construct } from "constructs";
import { TerraformStack, TerraformOutput } from "cdktf";
import { Vpc } from './.gen/modules/vpc'
import { SecurityGroup} from "./.gen/modules/security-group";
import {Dynamodb} from "./.gen/modules/dynamodb";
import {AwsProvider} from "@cdktf/provider-aws/lib/provider";

export class BaseStack extends TerraformStack {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        new AwsProvider(this, "aws", {
            region:  "us-east-1"
        });

        const vpc = new Vpc(this, 'nshipmanio-dev-ue1-main', {
            name: id,
            cidr: '10.1.0.0/16',
            azs: ["us-east-1a", "us-east-1b", "us-east-1c"],
            publicSubnets: ['10.1.0.0/24', "10.1.1.0/24", "10.1.2.0/24"],
            privateSubnets: ['10.1.4.0/24', "10.1.5.0/24", "10.1.6.0/24"],
            databaseSubnets: ['10.1.8.0/24', "10.1.9.0/24", "10.1.10.0/24"],
            enableNatGateway: true,
            oneNatGatewayPerAz: true,
            tags: {
                Environment: "development",
                Team: "DevOps"
            }
        });

        const securityGroups: {[Key: string]: SecurityGroup} = {};
        securityGroups.public = new SecurityGroup(this, "public-sg", {
            name: "public",
            vpcId: vpc.vpcIdOutput,
            ingressWithSelf: [{rule: "all-all"}],
            egressWithSelf: [{rule: "all-all"}],
            egressCidrBlocks: ["0.0.0.0/0"],
            egressRules: ["all-all"],
            ingressWithCidrBlocks: [
                {
                    "rule": "http-80-tcp",
                    "cidr_blocks": "0.0.0.0/0",
                },
                {
                    "rule": "https-443-tcp",
                    "cidr_blocks": "0.0.0.0/0",
                }],

        });

        securityGroups.app = new SecurityGroup(this, "app-sg", {
            name: "app",
            vpcId: vpc.vpcIdOutput,
            ingressWithSelf: [{ rule: "all-all" }],
            egressWithSelf: [{ rule: "all-all" }],
            egressCidrBlocks: ["0.0.0.0/0"],
            egressRules: ["all-all"],
            computedIngressWithSourceSecurityGroupId: [{
                "rule": "all-all",
                "source_security_group_id": securityGroups.public.securityGroupIdOutput,
            }]
        });

        securityGroups.database = new SecurityGroup(this, "database-sg", {
            name: "database",
            vpcId: vpc.vpcIdOutput,
            ingressWithSelf: [{ rule: "all-all" }],
            egressWithSelf: [{ rule: "all-all" }],
            egressCidrBlocks: ["0.0.0.0/0"],
            egressRules: ["all-all"],
            computedIngressWithSourceSecurityGroupId: [{
                "rule": "all-all",
                "source_security_group_id": securityGroups.app.securityGroupIdOutput,
            }]
        });
        const dynamoTable = new Dynamodb(this, 'nshimanio-dev-ue1-dynamodb', {
            name: `${id}-app-table`,
            hashKey: "id",
            attributes: [
                {
                    "name": "id",
                    "type": "S"
                }
            ]
        });
        new TerraformOutput(this, "vpc-id", {
            value: vpc.vpcIdOutput
        });

        new TerraformOutput(this, "dynamo-arn", {
            value: dynamoTable.dynamodbTableArnOutput
        });
    }

}