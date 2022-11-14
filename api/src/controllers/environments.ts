import express from "express";
import {validationResult} from "express-validator";
import {ConditionalCheckFailedException, DynamoDBClient} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";


export class EnvironmentsController {

    constructor() {
        this.getAllEnvironments = this.getAllEnvironments.bind(this);
        this.createEnvironment = this.createEnvironment.bind(this);
    }


    createEnvironment(req: express.Request, res: express.Response) {

        var body = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const client = new DynamoDBClient({
            region: "us-east-1",
        });


        const dbClient = DynamoDBDocumentClient.from(client);

        const params = {
            TableName: "idp-api-table",
            Item: {
                environment: body.environment,
                stack: body.stack,
                config: body.config,
                },
            ConditionExpression: "attribute_not_exists(environment)"
        };


        const addItem = async () => {
            try {
                console.log(`Scheduling ${body.environment} for creation.`)
                await dbClient.send(new PutCommand(params));

            } catch (err) {
                if (err instanceof Error)
                {
                    if (err.name === 'ConditionalCheckFailedException') {
                        console.log(`${body.environment} already exists`)
                        return res.status(404).json(
                            {
                                Error: `${body.environment} already exists`
                            }
                        )
                    }
                }
            }
        };

        addItem();
    }

    deleteEnvironment(req: express.Request, res: express.Response) {
        var params = req.params

        res.status(202).json(
            {
                status: `${params.name}`
            });
    }

    getAllEnvironments(req: express.Request, res: express.Response) {

        const client = new DynamoDBClient({
            region: "us-east-1",
        });

        const params = {
            TableName: "idp-api-table",
        };

        const dbClient = DynamoDBDocumentClient.from(client)

        const scanTable = async () => {
            try {
                const data = await dbClient.send(new ScanCommand(params));
                console.log("Success: ", data);
                return res.status(200).json(data.Items);
            } catch (err) {
                if (err instanceof Error)
                {
                        console.log("Error", err.stack)
                        return res.status(404).json(
                            {
                                Error: "Failure"
                            }
                        )
                    }
                }
            }
        scanTable();
        };

}