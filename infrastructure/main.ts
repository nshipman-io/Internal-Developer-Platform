// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { App } from "cdktf";
import { BaseStack } from "./base"
import { PetAppStack } from "./contrib/PetApp/Index";
import {getBaseConfig} from "./helper";

const app = new App();

const base =  new BaseStack(app, "nshipmanio-dev-base");

new PetAppStack(app, "petapp-dev-stack", getBaseConfig(base), {
    gitBranch: "main"
});



new PetAppStack(app, "nshipman-dev", getBaseConfig(base), {"branch":"feature/newPets"})


app.synth();
