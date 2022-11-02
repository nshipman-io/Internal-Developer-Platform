import { Construct } from "constructs";
import { TerraformStack, TerraformOutput, S3Backend } from "cdktf";
import { Vpc } from './.gen/modules/vpc'
import { SecurityGroup} from "./.gen/modules/security-group";
import { Dynamodb } from "./.gen/modules/dynamodb";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Ecs } from "./.gen/modules/ecs";

export class BaseStack extends TerraformStack {
    public vpc: Vpc;
    public securityGroups: {[Key: string]: SecurityGroup} = {};
    public dynamoTable: Dynamodb;
    public cluster: Ecs

    constructor(scope: Construct, id: string) {
        super(scope, id);

        new AwsProvider(this, "aws", {
            region:  "us-east-1",
            profile: "dev"
        });

        new S3Backend(this,{
            key: "idp/baseStack.tfstate",
            bucket: "nshipman-io-dev-terraform-state",
            encrypt: true,
            region: "us-east-1",
            profile: "dev",
            dynamodbTable: "nshipman-io-dev-terraform-state-lock"

        });

        this.vpc = new Vpc(this, 'nshipmanio-dev-ue1-main', {
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


        this.securityGroups.public = new SecurityGroup(this, "public-sg", {
            name: "public",
            vpcId: this.vpc.vpcIdOutput,
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

        this.securityGroups.app = new SecurityGroup(this, "app-sg", {
            name: "app",
            vpcId: this.vpc.vpcIdOutput,
            ingressWithSelf: [{ rule: "all-all" }],
            egressWithSelf: [{ rule: "all-all" }],
            egressCidrBlocks: ["0.0.0.0/0"],
            egressRules: ["all-all"],
            computedIngressWithSourceSecurityGroupId: [{
                "rule": "all-all",
                "source_security_group_id": this.securityGroups.public.securityGroupIdOutput,
            }]
        });

        this.securityGroups.database = new SecurityGroup(this, "database-sg", {
            name: "database",
            vpcId: this.vpc.vpcIdOutput,
            ingressWithSelf: [{ rule: "all-all" }],
            egressWithSelf: [{ rule: "all-all" }],
            egressCidrBlocks: ["0.0.0.0/0"],
            egressRules: ["all-all"],
            computedIngressWithSourceSecurityGroupId: [{
                "rule": "all-all",
                "source_security_group_id": this.securityGroups.app.securityGroupIdOutput,
            }]
        });

        this.dynamoTable = new Dynamodb(this, 'nshimanio-dev-ue1-dynamodb', {
            name: `${id}-app-table`,
            hashKey: "environment",
            attributes: [
                {
                    "name": "environment",
                    "type": "S"
                }
            ]
        });

        this.cluster = new Ecs(this, `${id}-app-cluster`, {
            clusterName: `${id}-app-cluster`,
        });

        new TerraformOutput(this, "vpc-id", {
            value: this.vpc.vpcIdOutput
        });

        new TerraformOutput(this, "dynamo-arn", {
            value: this.dynamoTable.dynamodbTableArnOutput
        });

        new TerraformOutput(this, "ecs-cluster-name", {
            value: this.cluster.clusterNameOutput
        });
    }

}