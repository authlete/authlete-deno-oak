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
    AuthleteApi, AuthorizationFailRequest, AuthorizationFailResponse,
    AuthorizationIssueRequest, AuthorizationIssueResponse, isNotEmpty,
    Property, stringfyJson
} from 'https://deno.land/x/authlete_deno@v1.2.9/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import {
    badRequest, internalServerError, internalServerErrorOnApiCallFailure,
    location, okHtmlContent
} from '../web/response_util.ts';
import { unknownAction } from './base_req_handler.ts';
import AfrAction = AuthorizationFailResponse.Action;
import AirAction = AuthorizationIssueResponse.Action;
import Reason = AuthorizationFailRequest.Reason;


/**
 * Call Authlete `/authorization/issue` API and send a response to the
 * client according to the value of the `action` parameter in the response
 * from the API.
 *
 * @param api
 *         An implementation of `AuthleteApi` interface.
 *
 * @param ctx
 *         A context object.
 *
 * @param ticket
 *         An ticket issued by Authlete `/auth/authorization` API.
 *
 * @param subject
 *         The subject (= unique identifier) of the end-user.
 *
 * @param authTime
 *         The time at which the end-user was authenticated.
 *         The value should be seconds since the Unix epoch (1970-Jan-1).
 *
 * @param acr
 *         The Authentication Context Class Reference performed
 *         for the end-user authentication.
 *
 * @param sub
 *         The value of the `"sub"` claim which is embedded in an ID
 *         token. If this argument is `null`, the value of `subject`
 *         will be used instead.
 *
 * @param claims
 *         The claims about the end-user.
 *
 * @param properties
 *         Arbitrary properties to be associated with an access
 *         token and/or an authorization code.
 *
 * @param scopes
 *         Scopes to be associated with an access token and/or an
 *         authorization code.
 */
export async function authorizationIssue(
    api: AuthleteApi, ctx: Context, ticket: string, subject: string,
    authTime: number, acr: string | null, sub: string | null,
    claims: { [key: string]: any } | null, properties: Property[] | null,
    scopes: string[] | null): Promise<void>
{
    // Call Authlete '/auth/authorization/issue' API.
    const response = await callAuthorizationIssue(
        api, ctx, ticket, subject, authTime, acr, sub, claims, properties, scopes);

    if (!response)
    {
        // If a response is not obtained, it means calling Authlete
        // '/auth/authorization/issue' API failed.
        return;
    }

    // Dispatch according to the action.
    switch (response.action)
    {
        case AirAction.INTERNAL_SERVER_ERROR:
            // 500 Internal Server Error.
            internalServerError(ctx, response.responseContent);
            break;

        case AirAction.BAD_REQUEST:
            // 400 Bad Request.
            badRequest(ctx, response.responseContent);
            break;

        case AirAction.LOCATION:
            // 302 Found.
            location(ctx, response.responseContent);
            break;

        case AirAction.FORM:
            // 200 OK.
            okHtmlContent(ctx, response.responseContent);
            break;

        default:
            // This never happens.
            unknownAction(ctx, '/auth/authorization/issue');
            break;
    }
}


async function callAuthorizationIssue(
    api: AuthleteApi, ctx: Context, ticket: string, subject: string,
    authTime: number, acr: string | null, sub: string | null,
    claims: { [key: string]: any } | null, properties: Property[] | null,
    scopes: string[] | null): Promise<AuthorizationIssueResponse | void>
{
    try
    {
        // Call Authlete '/auth/authorization/issue' API.
        return await api.authorizationIssue(createAuthorizationIssueRequest(
            ticket, subject, authTime, acr, sub, claims, properties, scopes));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


function createAuthorizationIssueRequest(
    ticket: string, subject: string, authTime: number, sub: string | null,
    acr: string | null, claims: { [key: string]: any } | null,
    properties: Property[] | null, scopes: string[] | null): AuthorizationIssueRequest
{
    // A request for Authlete '/auth/authorization/issue' API.
    const request = new AuthorizationIssueRequest();

    // The ticket issued by Authlete '/auth/authorization' API.
    request.ticket = ticket;

    // The end-user's subject.
    request.subject  = subject;

    // The time when the end-user was authenticated.
    request.authTime = authTime;

    // The potentially pairwise subject of the end user.
    if (isNotEmpty(sub)) request.sub = sub;

    // The ACR (Authentication Context Class Reference) of the
    // end-user authentication.
    if (isNotEmpty(acr)) request.acr = acr;

    // The claims of the end-user.
    const stringClaims = stringfyJson(claims);
    if (isNotEmpty(stringClaims)) request.claims = stringClaims;

    // Extra properties to associate with an access token and/or an
    // authorization code.
    if (isNotEmpty(properties)) request.properties = properties;

    // Scopes to associate with an access token and/or an authorization
    // code. If a non-null value is given, the scope set replaces the
    // scopes that have been specified in the original authorization
    // request.
    if (isNotEmpty(scopes)) request.scopes = scopes;

    return request;
}


/**
 * Call Authlete `/auth/authorization/fail` API and send a response to
 * the client according to the value of the `action` parameter in the
 * response from the API.
 *
 * @param api
 *         An implementation of `AuthleteApi` interface.
 *
 * @param ctx
 *         A context object.
 *
 * @param ticket
 *         An ticket issued by Authlete `/auth/authorization` API.
 *
 * @param reason
 *         The reason of the failure of the authorization request.
 */
export async function authorizationFail(
    api: AuthleteApi, ctx: Context, ticket: string, reason: Reason): Promise<void>
{
    // Call Authlete '/auth/authorization/fail' API.
    const response = await callAuthorizationFail(api, ctx, ticket, reason);

    if (!response)
    {
        // If a response is not obtained, it means calling Authlete
        // '/auth/authorization/fail' API failed.
        return;
    }

    // Dispatch according to the action.
    switch (response.action)
    {
        case AfrAction.INTERNAL_SERVER_ERROR:
            // 500 Internal Server Error.
            internalServerError(ctx, response.responseContent);
            break;

        case AfrAction.BAD_REQUEST:
            // 400 Bad Request.
            badRequest(ctx, response.responseContent);
            break;

        case AfrAction.LOCATION:
            // 302 Found.
            location(ctx, response.responseContent);
            break;

        case AfrAction.FORM:
            // 200 OK.
            okHtmlContent(ctx, response.responseContent);
            break;

        default:
            // This never happens.
            unknownAction(ctx, '/auth/authorization/fail');
            break;
    }
}


async function callAuthorizationFail(
    api: AuthleteApi, ctx: Context, ticket: string, reason: Reason):
    Promise<AuthorizationFailResponse | undefined>
{
    try
    {
        // Call Authlete '/auth/authorization/fail' API.
        return await api.authorizationFail(
            createAuthorizationFailRequest(ticket, reason));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


function createAuthorizationFailRequest(
    ticket: string, reason: Reason): AuthorizationFailRequest
{
    // A request for Authlete '/auth/authorization/issue' API.
    const request = new AuthorizationFailRequest();

    // The ticket issued by Authlete '/auth/authorization' API.
    request.ticket = ticket;

    // The failure reason.
    request.reason = reason;

    return request;
}