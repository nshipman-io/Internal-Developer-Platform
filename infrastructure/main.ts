// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { App } from "cdktf";
import { BaseStack } from "./base"

const app = new App();

new BaseStack(app, "nshipmanio-dev-base");

app.synth();
