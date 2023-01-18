import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";


export class KeybotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new lambda.Function(this, "KeybotHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("src"),
      handler: "index.handler",
      // TODO: add spotify and telegram tokens
      environment: {}
    })

    const api = new apigateway.RestApi(this, "keybot-api", {
      restApiName: "Keybot API",
      description: "Keybot API"
    });

    const integration = new apigateway.LambdaIntegration(handler);

    const v1 = api.root.addResource("v1")
    const keys = v1.addResource("keys")

    // TODO: require an api key to use it
    keys.addMethod('GET', integration)
  }
}
