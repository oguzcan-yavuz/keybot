import * as dotenv from 'dotenv'
dotenv.config()
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { IRole } from 'aws-cdk-lib/aws-iam'
import * as path from 'path'


export class KeybotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const keybotHandler = new NodejsFunction(this, 'KeybotHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/index.ts'),
      handler: 'keybotHandler',
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

    const spotifyOAuthHandler = new NodejsFunction(this, 'SpotifyOAuthHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/index.ts'),
      handler: 'spotifyOAuthHandler',
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

    const logGroup = new logs.LogGroup(this, 'ApiGatewayAccessLogs_Keybot')
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
    })

    const keybotIntegration = new apigateway.LambdaIntegration(keybotHandler)
    const spotifyOAuthIntegration = new apigateway.LambdaIntegration(spotifyOAuthHandler)

    const v1 = api.root.addResource('v1')
    const keys = v1.addResource('keys')
    const spotifyEndpoint = v1.addResource('spotify')
    const callbackEndpoint = spotifyEndpoint.addResource('callback')

    keys.addMethod('POST', keybotIntegration)
    callbackEndpoint.addMethod('GET', spotifyOAuthIntegration)

    const spotifyAccessTokenSecret = new secretsmanager.Secret(this, 'SpotifyAccessTokenSecret')
    spotifyAccessTokenSecret.grantRead(keybotHandler.role as IRole)
    spotifyAccessTokenSecret.grantWrite(keybotHandler.role as IRole)
    spotifyAccessTokenSecret.grantRead(spotifyOAuthHandler.role as IRole)
    spotifyAccessTokenSecret.grantWrite(spotifyOAuthHandler.role as IRole)

    keybotHandler.addEnvironment('spotifyAccessTokenSecretArn', spotifyAccessTokenSecret.secretArn)
    spotifyOAuthHandler.addEnvironment('spotifyAccessTokenSecretArn', spotifyAccessTokenSecret.secretArn)
  }
}
