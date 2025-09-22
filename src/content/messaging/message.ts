
export enum MessageType {
    BeforeAjaxRequestRequest,
    BeforeAjaxRequestResponse,
    AfterAjaxResponseRequest,
    AfterAjaxResponseResponse,
    AbortRequest,
    DisconnectRequest,
    ReconnectRequest,
    AbortResponse,
    ErrorResponse,
}

export interface AjaxXhrParams {
    requestId: string;
    url: string;
    body: unknown;
}

export interface BeforeAjaxRequestRequest {
    type: MessageType.BeforeAjaxRequestRequest;
    data: AjaxXhrParams;
}

export interface BeforeAjaxRequestResponse {
    type: MessageType.BeforeAjaxRequestResponse;
}

export interface AfterAjaxResponseRequest {
    type: MessageType.AfterAjaxResponseRequest;
    data: AjaxXhrParams;
}

export interface AfterAjaxResponseResponse {
    type: MessageType.AfterAjaxResponseResponse;
}

export interface AbortRequest {
    type: MessageType.AbortRequest;
    abortedRequestId: string;
}

export interface DisconnectRequest {
    type: MessageType.DisconnectRequest;
}

export interface ReconnectRequest {
    type: MessageType.ReconnectRequest;
}

export interface ErrorResponse {
    type: MessageType.ErrorResponse;
    error: string;
}

export interface AbortResponse {
    type: MessageType.AbortResponse;
    abortedRequestId: string;
}

export type Message =
    | BeforeAjaxRequestRequest
    | BeforeAjaxRequestResponse
    | AfterAjaxResponseRequest
    | AfterAjaxResponseResponse
    | AbortRequest
    | DisconnectRequest
    | ReconnectRequest
    | AbortResponse
    | ErrorResponse;
