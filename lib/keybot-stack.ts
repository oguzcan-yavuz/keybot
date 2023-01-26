import * as dotenv from 'dotenv'
dotenv.config()
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { IRole } from 'aws-cdk-lib/aws-iam';
import * as path from 'path';


export class KeybotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new NodejsFunction(this, 'KeybotHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/index.ts'),
      handler: 'handler',
      bundling: {
        externalModules: ['aws-sdk', '@aws-sdk'],
        minify: true,
        sourceMap: true,
        target: 'es2020'
      },
      environment: {
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
        spotifyClientId: process.env.SPOTIFY_CLIENT_ID ?? '',
        spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
        spotifyRedirectUrl: process.env.SPOTIFY_REDIRECT_URL ?? '',
        region: 'eu-central-1',
      },
    })

    const logGroup = new logs.LogGroup(this, 'ApiGatewayAccessLogs_Keybot');
    const accessLogFormat = JSON.stringify({
      requestId: '$context.requestId',
      userAgent: '$context.identity.userAgent',
      sourceIp: '$context.identity.sourceIp',
      requestTime: '$context.requestTime',
      httpMethod: '$context.httpMethod',
      path: '$context.path',
      status: '$context.status',
      responseLength: '$context.responseLength',
    })
    const api = new apigateway.RestApi(this, 'keybot-api', {
      restApiName: 'Keybot API',
      description: 'Keybot API',
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.custom(accessLogFormat),
      }
    });

    const integration = new apigateway.LambdaIntegration(handler);

    const v1 = api.root.addResource('v1')
    const keys = v1.addResource('keys')

    keys.addMethod('POST', integration)

    const spotifyAccessTokenSecret = new secretsmanager.Secret(this, 'SpotifyAccessTokenSecret');
    spotifyAccessTokenSecret.grantRead(handler.role as IRole)
    spotifyAccessTokenSecret.grantWrite(handler.role as IRole)
    handler.addEnvironment('spotifySecretArn', spotifyAccessTokenSecret.secretArn)
  }
}
