import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
// import * as TelegramBot from 'node-telegram-bot-api';
const TelegramBot = require('node-telegram-bot-api');
import { format } from 'date-fns'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body ?? '');
    // const message = body.message as TelegramBot.Message;
    const message = body.message;
    console.log({ message, chat: message.chat })

    console.log('datefn');
    const d = format(new Date(), "'Today is a' eeee")
    console.log({ d })


    const token = '';
    console.log('here')
    const bot = new TelegramBot(token, { webHook: true });
    console.log('here2')

    await bot.sendMessage(message.chat.id, 'pong')

    console.log('here3')
    return {
        statusCode: 200,
        body: JSON.stringify({ message: event.body })
    }
}
