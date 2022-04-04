// Copyright (C) 2022 Authlete, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


import {
    AuthleteApi, isNotEmpty, TokenFailRequest, TokenFailResponse,
    TokenIssueRequest, TokenIssueResponse, TokenRequest, TokenResponse
} from 'https://deno.land/x/authlete_deno@v1.2.6/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import {
    getFormParametersAsString, parseAuthorizationHeaderAsBasicCredentials
} from '../web/request_util.ts';
import {
    badRequest, internalServerError, internalServerErrorOnApiCallFailure,
    okJson, unauthorized
} from '../web/response_util.ts';
import { BaseReqHandler, unknownAction } from './base_req_handler.ts';
import { TokenRequestHandlerSpi } from "./spi/token_request_handler_spi.ts";
import TrAction = TokenResponse.Action;
import TirAction = TokenIssueResponse.Action;
import TfrAction = TokenFailResponse.Action;
import Reason = TokenFailRequest.Reason;


/**
 * The value for `WWW-Authenticate` header on `'401 Unauthorized'`.
 */
const CHALLENGE = 'Basic realm="token"';


async function callToken(
    api: AuthleteApi, spi: TokenRequestHandlerSpi, ctx: Context): Promise<TokenResponse | undefined>
{
    try
    {
        // Call Authlete '/auth/token' API.
        return await api.token(await createTokenRequest(spi, ctx));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


async function createTokenRequest(
    spi: TokenRequestHandlerSpi, ctx: Context): Promise<TokenRequest>
{
    // A request to Authlete '/auth/token' API.
    const request = new TokenRequest();

    // Extract form parameters.
    request.parameters = await getFormParametersAsString(ctx);

    // Parse the value of 'Authorization' header.
    const credentials = parseAuthorizationHeaderAsBasicCredentials(ctx);

    if (credentials)
    {
        // The client ID.
        request.clientId = credentials.userId;

        // The client secret.
        request.clientSecret = credentials.password;
    }

    // Extra properties to associate with an access token.
    const properties = spi.getProperties();
    if (isNotEmpty(properties)) request.properties = properties;

    return request;
}


async function handlePassword(
    api: AuthleteApi, spi: TokenRequestHandlerSpi, ctx: Context,
    response: TokenResponse): Promise<void>
{
    // Validate the credentials.
    const subject =
        spi.authenticateUser(response.username || null, response.password || null);

    if (subject)
    {
        // Issue an access token and optionally an ID token.
        await tokenIssue(api, spi, ctx, response.ticket, subject);
    }
    else
    {
        // The credentials are invalid. An access token is not issued.
        await tokenFail(api, ctx, response.ticket, Reason.INVALID_RESOURCE_OWNER_CREDENTIALS);
    }
}


async function tokenIssue(
    api: AuthleteApi, spi: TokenRequestHandlerSpi, ctx: Context, ticket: string,
    subject: string): Promise<void>
{
    // Call Authlete '/auth/token/issue' API.
    const response = await callTokenIssue(api, spi, ctx, ticket, subject);

    if (!response)
    {
        // If a response is not obtained, it means calling Authlete
        // '/auth/token/issue' API failed.
        return;
    }

    // Dispatch according to the action.
    switch (response.action)
    {
        case TirAction.INTERNAL_SERVER_ERROR:
            // 500 Internal Server Error.
            internalServerError(ctx, response.responseContent);
            break;

        case TirAction.OK:
            // 200 OK.
            okJson(ctx, response.responseContent);
            break;

        default:
            // This never happens.
            unknownAction(ctx, '/auth/token/issue');
            break;
    }
}


async function callTokenIssue(
    api: AuthleteApi, spi: TokenRequestHandlerSpi, ctx: Context, ticket: string,
    subject: string): Promise<TokenIssueResponse | undefined>
{
    try
    {
        // Call Authlete '/auth/token/issue' API.
        return await api.tokenIssue(
            await createTokenIssueRequest(spi, ticket, subject));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


async function createTokenIssueRequest(
    spi: TokenRequestHandlerSpi, ticket: string, subject: string
    ): Promise<TokenIssueRequest>
{
    // A request to Authlete '/auth/token/issue' API.
    const request = new TokenIssueRequest();

    // The ticket issued by Authlete '/auth/token' API.
    request.ticket = ticket;

    // The subject of the authenticated user.
    request.subject = subject;

    // Extra properties to associate with an access token.
    const properties = spi.getProperties();
    if (isNotEmpty(properties)) request.properties = properties;

    return request;
}


async function tokenFail(
    api: AuthleteApi, ctx: Context, ticket: string, reason: Reason): Promise<void>
{
    // Call Authlete '/auth/token/fail' API.
    const response = await callTokenFail(api, ctx, ticket, reason);

    if (!response)
    {
        // If a response is not obtained, it means calling Authlete
        // '/auth/token/issue' API failed.
        return;
    }

    // Dispatch according to the action.
    switch (response.action)
    {
        case TfrAction.INTERNAL_SERVER_ERROR:
            // 500 Internal Server Error.
            internalServerError(ctx, response.responseContent);
            break;

        case TfrAction.BAD_REQUEST:
            // 400 Bad Request.
            badRequest(ctx, response.responseContent);
            break;

        default:
            // This never happens.
            unknownAction(ctx, '/auth/token/fail');
            break;
    }
}


async function callTokenFail(
    api: AuthleteApi, ctx: Context, ticket: string, reason: Reason
    ): Promise<TokenFailResponse | undefined>
{
    try
    {
        // Call Authlete '/auth/token/issue' API.
        return await api.tokenFail(createTokenFailRequest(ticket, reason));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


function createTokenFailRequest(ticket: string, reason: Reason)
{
    // Create a request to '/auth/token/fail' API.
    const request = new TokenFailRequest();

    // The ticket issued by Authlete '/auth/token' API.
    request.ticket = ticket;

    // The reason of the failure.
    request.reason = reason;

    return request;
}


/**
 * Handler for token requests to a [token endpoint](
 * https://tools.ietf.org/html/rfc6749#section-3.2) of OAuth 2.0 ([RFC
 * 6749](https://tools.ietf.org/html/rfc6749)).
 */
export class TokenRequestHandler extends BaseReqHandler
{
    /**
     * The SPI class for this handler.
     */
    private spi: TokenRequestHandlerSpi;


    /**
     * The constructor.
     *
     * @param api
     *         An implementation of `AuthleteApi` interface.
     *
     * @param spi
     *         An implementation of `TokenRequestHandlerSpi` interface.
     */
    public constructor(api: AuthleteApi, spi: TokenRequestHandlerSpi)
    {
        super(api);

        this.spi = spi;
    }


    /**
     * Handle a token request. This method calls Authlete `/auth/token`
     * API and conditionally `/auth/token/issue` API or `/token/issue/fail`
     * API.
     *
     * @param ctx
     *         A context object.
     */
    public async handle(ctx: Context): Promise<void>
    {
        // Call Authlete '/auth/token' API.
        const response = await callToken(this.api, this.spi, ctx);

        if (!response)
        {
            // If a response is not obtained, it means calling Authlete
            // '/auth/token' API failed.
            return;
        }

        // Dispatch according to the action.
        switch (response.action)
        {
            case TrAction.INVALID_CLIENT:
                // 401 Unauthorized.
                unauthorized(ctx, CHALLENGE, response.responseContent!);
                break;

            case TrAction.INTERNAL_SERVER_ERROR:
                // 500 Internal Server Error.
                internalServerError(ctx, response.responseContent!);
                break;

            case TrAction.BAD_REQUEST:
                // 400 Bad Request.
                badRequest(ctx, response.responseContent!);
                break;

            case TrAction.PASSWORD:
                // Process the token request whose flow is 'Resource Owner
                // Password Credentials'.
                handlePassword(this.api, this.spi, ctx, response);
                break;

            case TrAction.OK:
                // 200 OK.
                okJson(ctx, response.responseContent!);
                break;

            default:
                // This never happens.
                unknownAction(ctx, '/auth/token');
                break;
        }
    }
}