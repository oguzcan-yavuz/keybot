import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from 'path';


export class KeybotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new NodejsFunction(this, "KeybotHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../src/index.ts"),
      handler: 'handler',
      bundling: {
        externalModules: ['aws-sdk'],
        minify: true,
        sourceMap: true,
        target: 'es2020'
      },
      // TODO: add spotify and telegram tokens
      environment: {},
    })

    const api = new apigateway.RestApi(this, "keybot-api", {
      restApiName: "Keybot API",
      description: "Keybot API"
    });

    const integration = new apigateway.LambdaIntegration(handler);

    const v1 = api.root.addResource("v1")
    const keys = v1.addResource("keys")

    keys.addMethod('POST', integration)
  }
}
