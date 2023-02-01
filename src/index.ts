import { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'
import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import TelegramBot, { Message } from 'node-telegram-bot-api'
import SpotifyWebApi from 'spotify-web-api-node'

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.spotifyClientId,
    clientSecret: process.env.spotifyClientSecret,
    redirectUri: process.env.spotifyRedirectUrl,
})

const generateSpotifyAuthUrl = (state: string): string => {
    const scopes = ['user-read-currently-playing']
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state)

    return authorizeURL
}

interface SpotifyCallbackRequest {
    code: string;
    state: string;
}

const formatFeatures = (track: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObject, features: SpotifyApi.AudioFeaturesObject): string => {
    const trackObject = track as SpotifyApi.TrackObjectFull
    const trackName = `${track?.name} - ${trackObject.artists ? trackObject.artists[0].name : ''}`

    const { key, mode, tempo, time_signature: timeSignature, instrumentalness, valence } = features;
    const pitchClassNotation = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const modeMap = new Map<number, string>()
    modeMap.set(0, 'minor')
    modeMap.set(1, 'major')

    const message = `Name: ${trackName}\nKey: ${pitchClassNotation[key]} ${modeMap.get(mode)}\nTempo: ${tempo}\nTime Signature: ${timeSignature}/4\nInstrumentalness: ${instrumentalness}\nValence: ${valence}`

    return message
}

const getTelegramMessage = async (chatId: number): Promise<string> => {
    try {
        const { body: { item: currentTrack } } = await spotifyApi.getMyCurrentPlayingTrack()
        console.log({ currentTrack })
        const trackId = currentTrack?.id

        if (!trackId) {
            return 'Track is null!'
        }

        const { body: features } = await spotifyApi.getAudioFeaturesForTrack(trackId)
        console.log({ features })
        const formattedFeatures = formatFeatures(currentTrack, features)

        return formattedFeatures
    } catch (error: any) {
        console.log('spotify api error:', error)
        if (error.statusCode === 401) {
            return generateSpotifyAuthUrl(chatId.toString())
        }

        return error.message
    }
}

const sendTelegramMessage = (chatId: number, message: string): Promise<Message> => {
    const token = process.env.telegramBotToken as string
    const bot = new TelegramBot(token)

    return bot.sendMessage(chatId, message)
}

interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export const spotifyOAuthHandler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log({ event })
        const { code, state } = event.queryStringParameters as unknown as SpotifyCallbackRequest

        const { body: { access_token: accessToken, refresh_token: refreshToken } } = await spotifyApi.authorizationCodeGrant(code)
        const tokens: Tokens = { accessToken, refreshToken };
        const secretsClient = new SecretsManagerClient({ region: process.env.region })
        await secretsClient.send(new PutSecretValueCommand({
            SecretId: process.env.spotifyAccessTokenSecretArn,
            SecretString: JSON.stringify(tokens),
        }))
        spotifyApi.setAccessToken(accessToken)
        spotifyApi.setRefreshToken(refreshToken)
        const chatId = parseInt(state, 10)

        const telegramMessage = await getTelegramMessage(chatId)
        await sendTelegramMessage(chatId, telegramMessage)

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'success' })
        }
    } catch (err) {
        console.log(err)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'failure' })
        }
    }
}

export const keybotHandler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log({ event })
        const body = JSON.parse(event.body ?? '')
        const message = body.message as Message

        const secretsClient = new SecretsManagerClient({ region: process.env.region })
        const { SecretString: tokens } = await secretsClient.send(new GetSecretValueCommand({
            SecretId: process.env.spotifyAccessTokenSecretArn,
        }))
        const { accessToken, refreshToken } = JSON.parse(tokens ?? '')
        spotifyApi.setAccessToken(accessToken ?? '')
        spotifyApi.setRefreshToken(refreshToken ?? '')
        const chatId = message.chat.id

        const telegramMessage = await getTelegramMessage(chatId)
        await sendTelegramMessage(chatId, telegramMessage)

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'success' })
        }
    } catch (err) {
        console.log(err)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'failure' })
        }
    }
}
