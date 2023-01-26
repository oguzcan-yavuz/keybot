import { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import TelegramBot, { Message } from 'node-telegram-bot-api';
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.spotifyClientId,
    clientSecret: process.env.spotifyClientSecret,
    redirectUri: process.env.spotifyRedirectUrl,
});

const generateSpotifyAuthUrl = (chatId: number): string => {
    const scopes = ['user-read-currently-playing']

    // TODO: return the auth url only if the token is expired or it is non existent
    // Create the authorization URL
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, chatId.toString());

    console.log({ authorizeURL })

    return authorizeURL
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body ?? '')
        const message = body.message as Message
        console.log({ message })

        const token = process.env.telegramBotToken as string;
        const bot = new TelegramBot(token);
        const secretsClient = new SecretsManagerClient({ region: process.env.region });

        const spotifySecret = await secretsClient.send(new GetSecretValueCommand({
            SecretId: process.env.spotifySecretArn,
        }))
        console.log({ spotifySecret })

        // const currentTrack = await spotifyApi.getMyCurrentPlayingTrack()
        // console.log({ currentTrack })
        // const trackId = currentTrack.body.item?.id
        // console.log({ trackId })
        const chatId = message.chat.id
        const authUrl = generateSpotifyAuthUrl(chatId)

        const telegramMessage = `${authUrl} secret: ${spotifySecret.SecretString}`
        await bot.sendMessage(chatId, telegramMessage)

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'success' })
        }
    } catch (err) {
        console.error(err)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'failure' })
        }
    }
}
