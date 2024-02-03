// src/hooks/useChatService.js
import {incrementalJSONtoCSV} from "@/utils/app/incrementalCsvParser";
import {useContext} from 'react';
import HomeContext from '@/pages/api/home/home.context';
import {killRequest as killReq, MetaHandler, sendChatRequest as send, sendChatRequestWithDocuments} from '../services/chatService';
import {ChatBody, CustomFunction, JsonSchema, newMessage} from "@/types/chat";
import {ColumnsSpec, generateCSVSchema} from "@/utils/app/csv";
import {Plugin} from '@/types/plugin';
import {wrapResponse, stringChunkCallback} from "@/utils/app/responseWrapper";

import {getSession} from "next-auth/react"
import json5 from "json5";
import {OpenAIModels} from "@/types/openai";
import {newStatus} from "@/types/workflow";

export function useChatService() {
    const {
        state: {apiKey, statsService, chatEndpoint, defaultAccount, defaultModelId},
        preProcessingCallbacks,
        postProcessingCallbacks,
        dispatch,
    } = useContext(HomeContext);

    const killRequest = async (requestId:string) => {
        const session = await getSession();

        // @ts-ignore
        if(!session || !session.accessToken || !chatEndpoint){
            return false;
        }

        // @ts-ignore
        const result = await killReq(chatEndpoint, session.accessToken, requestId);

        return result;
    }

    const sendCSVChatRequest = async (chatBody: ChatBody, columns: ColumnsSpec, plugin?: Plugin | null, abortSignal?: AbortSignal, metaHandler?: MetaHandler) => {
        const schema = generateCSVSchema(columns);
        const resp = await sendJsonChatRequestWithSchema(chatBody, schema, plugin, abortSignal, metaHandler);

        const keys = Object.keys(columns).join(',');

        const parser = incrementalJSONtoCSV();
        let first = true;

        const callback = stringChunkCallback((chunk) => {
            const result = (first ? "```csv\n" + keys + "\n" : "") + parser(chunk);
            first = false;
            return result;
        });

        return wrapResponse(resp, callback);
    }

    const sendJsonChatRequest = async (chatBody: ChatBody, plugin?: Plugin | null, abortSignal?: AbortSignal, metaHandler?: MetaHandler) => {
        const message = `
        Please generate JSON for the output.
        `
        const updatedChatBody = {
            ...chatBody,
            response_format: {type: 'json_object'},
            messages: [...chatBody.messages, newMessage({role: 'user', content: message})]
        };

        return await sendChatRequest(updatedChatBody, null, abortSignal, metaHandler);
    }

    const sendJsonChatRequestWithSchemaLoose = async (chatBody: ChatBody, jsonSchema: JsonSchema, plugin?: Plugin | null, abortSignal?: AbortSignal, metaHandler?: MetaHandler) => {
        const message = `
        Please generate JSON for the output using the following schema:
        ${JSON.stringify(jsonSchema, null, 2)}

        My response with this schema is (do your best to fit your output into it):
        `
        const updatedChatBody = {
            ...chatBody,
            response_format: {type: 'json_object'},
            messages: [...chatBody.messages, newMessage({role: 'user', content: message})]
        };

        return await sendChatRequest(updatedChatBody, null, abortSignal, metaHandler);
    }


    const sendJsonChatRequestWithSchema = async (chatBody: ChatBody, jsonSchema: JsonSchema, plugin?: Plugin | null, abortSignal?: AbortSignal, metaHandler?: MetaHandler) => {
        const functions = [
            {
                name: 'answer',
                description: 'Answer the question',
                parameters: jsonSchema,
            }
        ];

        return sendFunctionChatRequest(chatBody, functions, 'answer', plugin, abortSignal, metaHandler);
    }

    const sendFunctionChatRequest = async (chatBody: ChatBody, functions: CustomFunction[], functionToInvoke?: string, plugin?: Plugin | null, abortSignal?: AbortSignal, metaHandler?: MetaHandler) => {
        const updatedChatBody = {
            ...chatBody,
            functions: functions,
        };

        if (functionToInvoke) {
            updatedChatBody.function_call = functionToInvoke;
        }

        return await sendChatRequest(updatedChatBody, null, abortSignal, metaHandler);
    }

    const sendChatRequest = (chatBody: ChatBody, plugin?: Plugin | null, abortSignal?: AbortSignal, metaHandler?: MetaHandler) => {

        statsService.sendChatEvent(chatBody);

        preProcessingCallbacks.forEach(callback => callback({plugin: plugin, chatBody: chatBody}));
        //let response = send(apiKey, chatBody, plugin, abortSignal);

        let response = null;

        if (!chatBody.dataSources) {
            chatBody.dataSources = [];
        }

        if (!chatEndpoint) {
            throw new Error("Chat endpoint not set. Please tell the system administrator to set the CHAT_ENDPOINT environment variable.");
        }

        if (defaultAccount && defaultAccount.id) {
            chatBody.accountId = defaultAccount.id;
        }

        metaHandler = metaHandler || {
            status: (meta: any) => {
                console.log("Status: ", meta);
                dispatch({type: "append", field: "status", value: newStatus(meta)})
            },
            mode: (modeName: string) => {
                console.log("Mode: " + modeName);
            }
        }

        chatBody.requestId = Math.random().toString(36).substring(7);
        dispatch({field: "currentRequestId", value: chatBody.requestId});

        const targetEndpoint = chatBody.endpoint || chatEndpoint;

        response = getSession().then((session) => {
            // @ts-ignore
            return sendChatRequestWithDocuments(targetEndpoint, session.accessToken, chatBody, plugin, abortSignal, metaHandler);
        }).catch((e) => {
            alert("The chat service is currently unavailable. Please try again in a minute.");
            console.error(e);
            return Promise.reject(e);
        });

        return response;
    };

    const parseMessageType = (message: string): {
        prefix: "chat" | "json" | "json!" | "csv" | "fn";
        body: string;
        options: any | null
    } => {
        // This regular expression will match 'someXYZ' as a prefix and capture
        // the contents inside the parentheses.
        const regex = /^(\w+[\!]?)\(([^)]*)\).*/;

        const match = message.trim().match(regex);

        if (match &&
            match.length === 3 &&
            match[1] &&
            (match[1] === "json"
                || match[1] === "json!"
                || match[1] === "csv"
                || match[1] === "fn") &&
            match[2]) {
            try {
                return {
                    prefix: match[1],
                    body: message.trim().slice(match[1].length),
                    options: match[2].length > 0 ? json5.parse(match[2]) : {}
                };
            } catch (e) {

            }
        }

        return {prefix: "chat", body: message, options: {}}; // Return null if the message does not match the expected format
    }

    const routeChatRequest = async (chatBody: ChatBody, plugin?: Plugin | null, abortSignal?: AbortSignal) => {
        const message = chatBody.messages.slice(-1)[0];

        chatBody.key = apiKey;
        if (!chatBody.model && defaultModelId) {
            chatBody.model = OpenAIModels[defaultModelId];
        }

        const {prefix, body, options} = parseMessageType(message.content || "");

        let updated = {...message, content: body};
        chatBody.messages = [...chatBody.messages.slice(0, -1), updated];

        console.log(`Prompt:`, {prefix: prefix, options, message});

        const generateJsonLoose = (): Promise<Response> => {
            if (options.length === 0) {
                return sendJsonChatRequest(chatBody, plugin, abortSignal);
            } else {
                return sendJsonChatRequestWithSchemaLoose(chatBody, options as JsonSchema, plugin, abortSignal)
            }
        }

        const invokers = {
            "fn": () => sendFunctionChatRequest(chatBody, options.functions as CustomFunction[], options.call, plugin, abortSignal),
            "chat": () => sendChatRequest(chatBody, plugin, abortSignal),
            "csv": () => sendCSVChatRequest(chatBody, options as ColumnsSpec, plugin, abortSignal),
            "json": () => generateJsonLoose(),
            "json!": () => sendJsonChatRequestWithSchema(chatBody, options as JsonSchema, plugin, abortSignal)
        }

        return await invokers[prefix]();
    }

    return {
        killRequest,
        routeChatRequest,
        sendChatRequest,
        sendFunctionChatRequest,
        sendCSVChatRequest,
        sendJsonChatRequest,
        sendJsonChatRequestWithSchemaLoose,
        sendJsonChatRequestWithSchema
    };
}