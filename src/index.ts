import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import TelegramBot, { Message } from 'node-telegram-bot-api';

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body ?? '');
        const message = body.message as Message;
        console.log({ message })

        const token = process.env.telegramBotToken as string;
        const bot = new TelegramBot(token);

        await bot.sendMessage(message.chat.id, 'pong')

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
