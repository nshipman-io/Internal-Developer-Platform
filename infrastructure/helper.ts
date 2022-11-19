import {BaseStack} from "./base";

export function updateSubnetCidr(vpcCidr = "10.0.0.1/16", octectVal: number )
{
    let ipArr  = vpcCidr.split(".");
    ipArr[2] = octectVal.toString(10);
    let subnetCidr = ipArr.join(".");
    let subnetCidrBlock = subnetCidr.replace("/16", "/22");

    return subnetCidrBlock;
}

export function getBaseConfig(baseStack: BaseStack) {
    console.log("Generating Base Stack configuration...")
    const baseConfig = {

        vpc: baseStack.vpc,
        privateSecurityGroup: baseStack.securityGroups.app.securityGroupIdOutput,
        publicSecurityGroup: baseStack.securityGroups.public.securityGroupIdOutput,

    }
    return baseConfig
}