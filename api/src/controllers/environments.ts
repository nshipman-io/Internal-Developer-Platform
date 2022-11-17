import express from "express";
import {validationResult} from "express-validator";
import {ConditionalCheckFailedException, DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DeleteCommand, DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import { PutCommand, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import {Github} from "../utils/github";
import { readCDKFile } from "../utils/helper";

export class EnvironmentsController {
    private client: DynamoDBClient;
    private github: Github;

    constructor() {
        this.getAllEnvironments = this.getAllEnvironments.bind(this);
        this.createEnvironment = this.createEnvironment.bind(this);
        this.client =  new DynamoDBClient({
            region: "us-east-1"
        });
        this.github = new Github();
    }

    createEnvironment(req: express.Request, res: express.Response) {

        var body = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const dbClient = DynamoDBDocumentClient.from(this.client);

        const params = {
            TableName: "idp-api-table",
            Item: {
                environment: body.environment,
                stack: body.stack,
                config: body.config,
                status: "REGISTERED",
                },
            ConditionExpression: "attribute_not_exists(environment)"
        };


        const addItem = async () => {
            try {
                console.log(`Scheduling ${body.environment} for creation.`)
                await dbClient.send(new PutCommand(params));
                return res.status(200).json({
                    Status: `${body.environment} scheduled`
                })

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
    };

    deleteEnvironment(req: express.Request, res: express.Response) {
        const envName = req.params.name;

        const dbClient = DynamoDBDocumentClient.from(this.client)

        const updateParams = {
            TableName: "idp-api-table",
            Key: {
              'environment': envName
            },

            UpdateExpression: 'set #s = :s',
            ConditionExpression: 'attribute_exists(environment)',
            ExpressionAttributeValues: {
                ':s' : 'MARKED'
            },
            ExpressionAttributeNames: {
                '#s': 'status',
            },
            ReturnValues: 'ALL_NEW'
        };

        const updateStatus = async () => {
            try {
                await dbClient.send(new UpdateCommand(updateParams));
                res.status(200).json({
                    Status: "Marked"
                });
            } catch(err) {
                if (err instanceof Error)
                {
                    if(err.name === 'ConditionalCheckFailedException'){
                        return res.status(404).json({
                                Error: `${envName} not found`
                            }
                        )
                    }
                    console.log(err.stack)
                    return res.status(400).json({
                        Error: "Request failed"
                    });

                }
            }
        };

        this.github.resetCdkRepo();

        const deleteParam = {
            TableName: "idp-api-table",
            Key: {
               'environment': envName
            },
            ConditionExpression: 'attribute_exists(environment)',

        }

        const deleteEnv = async () => {
            try {
                await dbClient.send(new DeleteCommand(deleteParam))
                console.log(`Success - ${envName} removed from database.`)
            } catch(err) {
                if (err instanceof Error)
                {
                    if(err.name === 'ConditionalCheckFailedException'){
                        console.log(`${envName} was not found. Skipping...`)
                        return;
                    }
                    console.log(err.stack)
                }
            }
        }
        updateStatus();

        deleteEnv();
    };

    getAllEnvironments(req: express.Request, res: express.Response) {

        const params = {
            TableName: "idp-api-table",
        };

        const dbClient = DynamoDBDocumentClient.from(this.client)

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