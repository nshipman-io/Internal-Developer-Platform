import express from "express";

export class EnvironmentsController {

    constructor() {
        this.getAllEnvironments = this.getAllEnvironments.bind(this);
        this.createEnvironment = this.createEnvironment.bind(this);
    }

    createEnvironment(req: express.Request, res: express.Response) {

        var envConfig = {};
        var body = req.body;
        if (!body.environment || !body.stack) {
            res.status(400).json(
                {
                    error: "Environment or stack name cannot be empty."
                });
        }

       envConfig = {
            environment: body.environment,
            stack: body.stack,
            config: body.config,
       }
        console.log("Adding environment to dynamodb...")
        //TODO: Send request to DynamoDB
        console.log("Deployment completed!")

        res.status(200).json(envConfig);
    }

    deleteEnvironment(req: express.Request, res: express.Response) {
        var params = req.params

        res.status(202).json(
            {
                status: `${params.name}`
            });
    }

    getAllEnvironments(req: express.Request, res: express.Response) {
        var environments = [
            {
                environment: "development",
                stack: "petAppStack",
                config: {
                    region: "us-east-1",
                    acountId: "AWS-DEV",
                },
                status: "REGISTERED",
                note: "Testing the Pet App"
            },
            {
                environment: "production",
                stack: "IDPStack",
                config: {
                    region: "us-east-2",
                    acountId: "AWS-PROD",
                },
                status: "REGISTERED",
                note: "Production IDP API"
            },
        ]
        res.status(200).json(environments);
    }

}