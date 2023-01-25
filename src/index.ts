import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import TelegramBot, { Message } from 'node-telegram-bot-api';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body ?? '');
        const message = body.message as Message;
        console.log({ message, chat: message.chat })

        const token = '';
        console.log('here')
        const bot = new TelegramBot(token);
        console.log('here2')

        await bot.sendMessage(message.chat.id, 'pong')

        console.log('here3')
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'success' })
        }
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'failure' })
        }
    }
}
