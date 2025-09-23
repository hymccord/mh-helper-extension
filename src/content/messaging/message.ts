import { RequestBody } from "@scripts/services/interceptor.service";
import { HgResponse } from "@scripts/types/hg";


export const MessageType = {
    BeforeFetchRequest: 0,
    BeforeFetchResponse: 1,
    AfterFetchRequest: 2,
    AfterFetchResponse: 3,
    AbortRequest: 4,
    DisconnectRequest: 5,
    ReconnectRequest: 6,
    AbortResponse: 7,
    ErrorResponse: 8,
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface AjaxRequestParams {
    url: URL;
    request: RequestBody;
    requestId: string;
}

export interface AjaxResponseParams extends AjaxRequestParams {
    response?: HgResponse;
}

export type BeforeFetchRequest = {
    type: typeof MessageType.BeforeFetchRequest;
    data: AjaxRequestParams;
}

export interface BeforeFetchResponse {
    type: typeof MessageType.BeforeFetchResponse;
}

export interface AfterFetchRequest {
    type: typeof MessageType.AfterFetchRequest;
    data: AjaxResponseParams;
}

export interface AfterFetchResponse {
    type: typeof MessageType.AfterFetchResponse;
}

export interface AbortRequest {
    type: typeof MessageType.AbortRequest;
    abortedRequestId: string;
}

export interface DisconnectRequest {
    type: typeof MessageType.DisconnectRequest;
}

export interface ReconnectRequest {
    type: typeof MessageType.ReconnectRequest;
}

export interface ErrorResponse {
    type: typeof MessageType.ErrorResponse;
    error: string;
}

export interface AbortResponse {
    type: typeof MessageType.AbortResponse;
    abortedRequestId: string;
}

export type Message =
    | BeforeFetchRequest
    | BeforeFetchResponse
    | AfterFetchRequest
    | AfterFetchResponse
    | AbortRequest
    | DisconnectRequest
    | ReconnectRequest
    | AbortResponse
    | ErrorResponse;
