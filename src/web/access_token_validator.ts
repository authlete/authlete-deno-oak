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
    AuthleteApi, IntrospectionRequest, IntrospectionResponse, isNotEmpty
} from 'https://deno.land/x/authlete_deno@v1.2.9/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { Status, wwwAuthenticate } from './response_util.ts';
import Action = IntrospectionResponse.Action;


/**
 * The value for `WWW-Authenticate` header for the case calling Authlete
 * '/auth/introspection' API failed.
 */
const CHALLENGE =
    'Bearer error="server_error",error_description="Introspection API call failed."';


function createIntrospectionRequest(
    accessToken: string | null, requiredScopes?: string[], requiredSubject?: string
    ): IntrospectionRequest
{
    const request = new IntrospectionRequest();

    if (isNotEmpty(accessToken)) request.token = accessToken;
    if (isNotEmpty(requiredScopes)) request.scopes = requiredScopes;
    if (isNotEmpty(requiredSubject)) request.subject = requiredSubject;

    return request;
}


function denyDueToErr(ctx: Context): void
{
    wwwAuthenticate(ctx, Status.INTERNAL_SERVER_ERROR, CHALLENGE);
}


function buildDenyBasedOnResponse(
    response: IntrospectionResponse): (ctx: Context) => void
{
    // The HTTP status code to be returned to the client application.
    const statusCode = determineStatusCode(response);

    // In error cases, the 'responseContent' parameter in the response
    // from Authlete '/auth/introspection' API contains a value for the
    // WWW-Authenticate header.
    const challenge = response.responseContent;

    // Return a function that generates a  response that complies with
    // RFC 6750.
    return (ctx: Context) => { wwwAuthenticate(ctx, statusCode, challenge); }
}


function determineStatusCode(response: IntrospectionResponse): number
{
    switch (response.action)
    {
        case Action.INTERNAL_SERVER_ERROR:
            // 500 Internal Server Error.
            return Status.INTERNAL_SERVER_ERROR;

        case Action.BAD_REQUEST:
            // 400 Bad Request.
            return Status.BAD_REQUEST;

        case Action.UNAUTHORIZED:
            // 401 Unauthorized.
            return  Status.UNAUTHORIZED;

        case Action.FORBIDDEN:
            // 403 Forbidden.
            return Status.FORBIDDEN;

        default:
            // This should not happen. In this case, this function should
            // not be called.
            return  Status.INTERNAL_SERVER_ERROR;
    }
}


/**
 * Access token validator.
 */
export class AccessTokenValidator
{
    private api: AuthleteApi;


    /**
     * The constructor.
     *
     * @param api
     *         An implementation of the `AuthleteApi` interface. This
     *         is required because `validate()` method internally calls
     *         Authlete `/auth/introspection` API.
     */
    constructor(api: AuthleteApi)
    {
        this.api = api;
    }


    /**
     * Validate the access token by calling Authlete `/auth/introspection`
     * API.
     *
     * @param accessToken
     *         An access token.
     *
     * @param requiredScopes
     *         Scopes that needs be covered by the access token.
     *
     * @param requiredSubject
     *         Subject that needs to be associated with the access token.
     *
     * @returns The validation result.
     */
    public async validate(
        accessToken: string | null, requiredScopes?: string[],
        requiredSubject?: string): Promise<AccessTokenValidator.Result>
    {
        // A response from '/auth/introspection' API.
        let response;

        try
        {
            // Call '/auth/introspection' API.
            response = await this.api.introspection(
                createIntrospectionRequest(accessToken, requiredScopes, requiredSubject));
        }
        catch(e)
        {
            // The API call failed.
            return { isValid: false, introspectionError: e, deny: denyDueToErr };
        }

        // If an unsuccessful action is returned.
        if (response.action !== Action.OK)
        {
            // The access token is not valid, or an unexpected error
            // occurred.
            return { isValid: false, deny: buildDenyBasedOnResponse(response) };
        }

        // OK. The access token is valid.
        return { isValid: true, introspectionResult: response };
    }
}


export namespace AccessTokenValidator
{
    export interface Result
    {
        /**
         * The flag whether the access token given is valid or not.
         */
        readonly isValid: boolean;


        /**
         * A response from Authlete `/auth/introspection` API. `validate()`
         * method internally calls `/auth/introspection` API and sets
         * the response to this property. Note that this property remains
         * `undefined` if the API call threw an exception, and in that
         * case, the `introspectionError` property is set instead.
         */
         readonly introspectionResult?: IntrospectionResponse;


        /**
         * `validate()` method internally calls Authlete `/auth/introspection`
         * API. If the API call threw an exception, this property is set
         * to the exception. Note that this property is set to `undefined`
         * if the API call succeeded, and in that case, `introspectionResult`
         * property is set instead.
         */
         readonly introspectionError?: Error;


         /**
          * A function that generates an error response. `validate()`
          * method internally calls Authlete `/auth/introspection` API.
          * If the API returns an unsuccessful response, this property
          * is set to a function that generates an error response that
          * the resource server should return to the client application
          * according to the contents of the unsuccessful API response.
          */
         readonly deny?: (ctx: Context) => void;
    }
}