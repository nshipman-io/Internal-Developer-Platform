import express from "express";
import {validationResult} from "express-validator";
import {ConditionalCheckFailedException, DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DeleteCommand, DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import { PutCommand, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import {Github} from "../utils/github";
import {deleteStackDeclaration, generateStackConfig, readCDKFile} from "../utils/helper";
import {deployStack, destroyStack} from "../utils/cdktf";

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
        this.github.options.baseDir = process.env.CDK_MAIN_TS_DIR;
    }

    //TODO Add a helper function that builds update dynamodb params
    async createEnvironment(req: express.Request, res: express.Response) {

        const body = req.body;
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

        const petStackConfig = {
            environment: body.environment,
            stack: body.stack,
            config: body.config,
        }

        const addItem = async () => {
            try {
                console.log(`Scheduling ${body.environment} for creation.`)
                await dbClient.send(new PutCommand(params));
                res.status(200).json({
                    Status: `${body.environment} scheduled`
                });

            } catch (err) {
                if (err instanceof Error)
                {
                    if (err.name === 'ConditionalCheckFailedException') {
                        console.log(`${body.environment} already exists`)
                        res.status(404).json(
                            {
                                Error: `${body.environment} already exists`
                            });
                    }

                    else {
                        console.log(err.message)
                        res.status(500).json({
                            Error: err.message
                        });
                    }
                }
            }
        };

        const updateStatus = async (deployed: boolean, deployNotes: string) => {
            console.log(deployed)
            try {
                if (!deployed) {

                    var updateParamsFailed = {
                        TableName: "idp-api-table",
                        Key: {
                            'environment': body.environment
                        },

                        UpdateExpression: 'set #s = :s, #n = :n',
                        ConditionExpression: 'attribute_exists(environment)',
                        ExpressionAttributeValues: {
                            ':s' : 'FAILED',
                            ':n' : deployNotes,
                        },
                        ExpressionAttributeNames: {
                            '#s': 'status',
                            '#n': 'notes',
                        },
                        ReturnValues: 'ALL_NEW'
                    };

                    await dbClient.send(new UpdateCommand(updateParamsFailed));
                    console.log(`ERROR: ${body.environment} failed to deploy`)
                    return;
                }

                var updateParams = {
                    TableName: "idp-api-table",
                    Key: {
                        'environment': body.environment
                    },

                    UpdateExpression: 'set #s = :s, #n = :n',
                    ConditionExpression: 'attribute_exists(environment)',
                    ExpressionAttributeValues: {
                        ':s' : 'COMMITTED',
                        ':n' : deployNotes
                    },
                    ExpressionAttributeNames: {
                        '#s': 'status',
                        '#n': 'notes',
                    },
                    ReturnValues: 'ALL_NEW'
                };

                await dbClient.send(new UpdateCommand(updateParams));
                console.log(`${body.environment} committed`)
            } catch(err) {
                if (err instanceof Error)
                {
                    if(err.name === 'ConditionalCheckFailedException'){
                        console.log(`${body.environment} not found`);
                        return;
                    }
                    console.log(err.stack)
                    return;
                }
            }
        };

        await addItem();

        //this.github.resetCdkRepo();
        if(!generateStackConfig(petStackConfig)){
            console.log("No changes to commit. Skipping...")
            return;
        }

        if(!this.github.publishChanges())
        {
            console.log("createEnvironment: Commit failed.");
            return;
        }

        const deployResults = deployStack(body.environment);

        const deployed = deployResults[0];
        const deployNotes = deployResults[1]


        updateStatus(deployed, deployNotes);
    };

    async deleteEnvironment(req: express.Request, res: express.Response) {
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

        const deleteParam = {
            TableName: "idp-api-table",
            Key: {
               'environment': envName
            },
            ConditionExpression: 'attribute_exists(environment)',

        }

        const deleteEnv = async (destroyed: boolean, destroyNotes: string) => {

            if(!destroyed) {
                var updateParams = {
                    TableName: "idp-api-table",
                    Key: {
                        'environment': envName
                    },

                    UpdateExpression: 'set #s = :s, #n = :n',
                    ConditionExpression: 'attribute_exists(environment)',
                    ExpressionAttributeValues: {
                        ':s': 'DESTROYFAILED',
                        ':n': destroyNotes
                    },
                    ExpressionAttributeNames: {
                        '#s': 'status',
                        '#n': 'notes',
                    },
                    ReturnValues: 'ALL_NEW'
                };
                try {
                    await dbClient.send(new UpdateCommand(updateParams));
                    console.log(`Error - ${envName} was not destroyed.`)
                } catch (err) {
                    if (err instanceof Error)
                    {
                        console.log(err.stack)
                        return;
                    }
                }
            }   else {
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
        }

        //this.github.resetCdkRepo();

        await updateStatus()

        const destroyResults = destroyStack(envName);

        const destroyed = destroyResults[0];
        const destroyNotes = destroyResults[1];

        await deleteEnv(destroyed, destroyNotes);

        if(destroyed)
        {
            if(!deleteStackDeclaration(envName)){
                console.log(`${envName} was not found`);
            }

            if(!this.github.publishChanges()) {
                console.log("deleteEnvironment: Commit failed")
                return;
            }
        }

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