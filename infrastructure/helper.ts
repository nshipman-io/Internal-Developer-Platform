export function updateSubnetCidr(vpcCidr = "10.0.0.1/16", octectVal: number )
{
    let ipArr  = vpcCidr.split(".");
    ipArr[2] = octectVal.toString(10);
    let subnetCidr = ipArr.join(".");
    let subnetCidrBlock = subnetCidr.replace("/16", "/22");

    return subnetCidrBlock;
}