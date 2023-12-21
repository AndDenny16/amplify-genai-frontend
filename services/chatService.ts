// chatService.js
import { getEndpoint } from '@/utils/app/api';
import {ChatBody, JsonSchema, newMessage} from "@/types/chat";
import { Plugin } from '@/types/plugin';
import {createParser, ParsedEvent, ReconnectInterval} from "eventsource-parser";
import {OpenAIError} from "@/utils/server";

export async function sendChatRequestWithDocuments(accessToken:string, chatBody:ChatBody, plugin?:Plugin|null, abortSignal?:AbortSignal) {

    if(chatBody.response_format && chatBody.response_format.type === 'json_object') {
        if(!chatBody.messages.some(m => m.content.indexOf('json') > -1)) {
            chatBody.messages.push(newMessage({role: 'user', content: 'Please provide a json object as output.'}))
        }
    }

    // chatBody = {
    //     ...chatBody,
    //     // @ts-ignore
    //     messages: [...chatBody.messages.map(m => {
    //         return {role: m.role, content: m.content}
    //     })],
    // }

    chatBody = {
        temperature: chatBody.temperature,
        max_tokens: 1000,
        stream: true,
        messages: [
            {
                // @ts-ignore
                role: 'system',
                content: chatBody.prompt,
            },
            // @ts-ignore
            ...chatBody.messages.map(m => {
                return {role: m.role, content: m.content}
        })],
    }

    console.log('sending chat request with documents', chatBody);

    const body = JSON.stringify(chatBody);
    const endpoint = getEndpoint(plugin);

    const res = await fetch('https://jl3kwdj5shtwqxuqe3nj6qcxdy0wtwuy.lambda-url.us-east-1.on.aws', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken,
        },
        signal: abortSignal,
        body,
    });

    const functions = null;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (res.status !== 200) {
        const result = await res.json();
        if (result.error) {
            throw new OpenAIError(
                result.error.message,
                result.error.type,
                result.error.param,
                result.error.code,
            );
        } else {
            throw new Error(
                `OpenAI API returned an error: ${
                    decoder.decode(result?.value) || result.statusText
                }`,
            );
        }
    }

    let nameDone = false;
    let first = true;

    const fnCallHandler = (controller:any, json:any) => {
        const base = json.choices[0].delta.function_call
        let text = "";

        if(base && base.name){
            if(first){
                text = "{\"name\":\"";
                first = false;
            }
            text += base.name;
        }
        if(base && base.arguments){
            if(!nameDone){
                text += "\", \"arguments\":";
                nameDone = true;
            }
            text += (base.arguments) ? base.arguments : "";
        }
        if (json.choices[0].finish_reason != null) {

            // console.log("------------- Completing------------")
            // console.log(json.choices)
            // console.log("------------------------------------")

            text += "}";

            const queue = encoder.encode(text);
            controller.enqueue(queue);

            console.log("Chat request completed",
                //current time
                new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));

            controller.close();
            return;
        }

        const queue = encoder.encode(text);
        controller.enqueue(queue);

        first = false;
    }

    const stream = new ReadableStream({
        async start(controller) {
            const onParse = (event: ParsedEvent | ReconnectInterval) => {
                if (event.type === 'event') {

                    const data = event.data;

                    try {
                        const json = JSON.parse(data);

                        if(functions){
                            fnCallHandler(controller, json);
                        }
                        else {
                            if (json.choices[0].finish_reason != null) {

                                console.log("Chat request completed",
                                    //current time
                                    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));

                                controller.close();
                                return;
                            }

                            const text = json.choices[0].delta.content;
                            const queue = encoder.encode(text);
                            controller.enqueue(queue);
                        }
                    } catch (e) {
                        // Apparent edge case required for Azure
                        if (data === "[DONE]") {
                            return;
                        } else {
                            controller.error(e);
                        }
                    }
                }
            };

            const parser = createParser(onParse);
            // @ts-ignore
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { value: chunk, done } = await reader.read();
                    if (done) {
                        // Ensure the end of the parser is dealt with
                        //parser.finish();
                        break;
                    }
                    parser.feed(decoder.decode(chunk));
                }
            } catch (e) {
                controller.error(e);
            } finally {
                reader.releaseLock();
            }

            controller.close();
        },
    });


    return new Response(stream, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
    });
}

export async function sendChatRequest(apiKey:string, chatBody:ChatBody, plugin?:Plugin|null, abortSignal?:AbortSignal) {

    if(chatBody.response_format && chatBody.response_format.type === 'json_object') {
        if(!chatBody.messages.some(m => m.content.indexOf('json') > -1)) {
            chatBody.messages.push(newMessage({role: 'user', content: 'Please provide a json object as output.'}))
        }
    }

    chatBody = {
        ...chatBody,
        // @ts-ignore
        messages: [...chatBody.messages.map(m => {
            return {role: m.role, content: m.content}
        })],
    }

    let body;
    if (!plugin) {
        body = JSON.stringify(chatBody);
    } else {
        // body = JSON.stringify({
        //     ...chatBody,
        //     googleAPIKey: pluginKeys
        //         .find((key) => key.pluginId === 'google-search')
        //         ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
        //     googleCSEId: pluginKeys
        //         .find((key) => key.pluginId === 'google-search')
        //         ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
        // });
    }
    const endpoint = getEndpoint(plugin);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        signal: abortSignal,
        body,
    });

    return response;
}