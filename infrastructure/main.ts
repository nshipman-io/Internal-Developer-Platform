// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { App } from "cdktf";
import { BaseStack } from "./base"
import { PetAppStack } from "./contrib/PetApp/Index";

const app = new App();

const base =  new BaseStack(app, "nshipmanio-dev-base");

new PetAppStack(app, "petapp-dev-stack", base.vpc, base.securityGroups.app.securityGroupIdOutput, base.securityGroups.public.securityGroupIdOutput);

app.synth();
