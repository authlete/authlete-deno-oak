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
    AuthleteApi, AuthorizationFailRequest, AuthorizationResponse, isEmpty
} from 'https://deno.land/x/authlete_deno@v1.2.6/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { authorizationFail, authorizationIssue } from './auth_req_base_handler.ts';
import { BaseReqHandler } from './base_req_handler.ts';
import { ClaimCollector } from './claim_collector.ts';
import { AuthorizationDecisionHandlerSpi } from "./spi/authorization_decision_handler_spi.ts";
import Reason = AuthorizationFailRequest.Reason;


async function authorize(
    api: AuthleteApi, spi: AuthorizationDecisionHandlerSpi, ctx: Context,
    params: AuthorizationDecisionHandler.Params, subject: string): Promise<void>
{
    // The ticket issued by '/auth/authorization' API.
    const ticket = params.ticket;

    // The time when the end-user was authenticated.
    const authTime = spi.getUserAuthenticatedAt();

    // The potentially pairwise subject of the end user.
    const sub = spi.getSub();

    // The ACR (Authentication Context Class Reference) of the end-user
    // authentication.
    const acr = spi.getAcr();

    // The claims of the end-user.
    const claims = await new ClaimCollector(
        spi, subject, params.claimNames, params.claimLocales).collect();

    // Extra properties to associate with an access token and/or an
    // authorization code.
    const properties = spi.getProperties();

    // Scopes to associate with an access token and/or an authorization
    // code. If a non-null value is returned from this.spi.getScopes(),
    // the scope set replaces the scopes that have been specified in the
    // original authorization request.
    const scopes = spi.getScopes();

    // Call Authlete '/auth/authorization/issue' API.
    await authorizationIssue(
        api, ctx, ticket, subject, authTime, sub, acr, claims, properties, scopes);
}


/**
 * Handler for end-user's decision on the authorization request.
 *
 * An authorization endpoint returns an authorization page (HTML) to
 * an end-user, and the end-user will select either 'authorize' or 'deny'
 * the authorization request. This class handles the decision and calls
 * Authlete `/auth/authorization/issue` API or `/auth/authorization/fail`
 * API accordingly.
 */
export class AuthorizationDecisionHandler extends BaseReqHandler
{
    /**
     * The SPI class for this handler.
     */
    private spi: AuthorizationDecisionHandlerSpi;


    /**
     * The constructor.
     *
     * @param api
     *         An implementation of `AuthleteApi` interface.
     *
     * @param spi
     *         An implementation of `AuthorizationDecisionRequestHandlerSpi`
     *         interface.
     */
    public constructor(api: AuthleteApi, spi: AuthorizationDecisionHandlerSpi)
    {
        super(api);

        this.spi = spi;
    }


    /**
     * Handle an end-user's decision on an authorization request.
     *
     * @param ctx
     *         A context object.
     *
     * @param params
     *         Parameters for this handler.
     */
    public async handle(
        ctx: Context, params: AuthorizationDecisionHandler.Params): Promise<void>
    {
        // The authorization result by the end-user.
        const authorized = this.spi.isClientAuthorized();

        // If the end-user did not grant authorization to the client
        // application.
        if (!authorized)
        {
            await authorizationFail(this.api, ctx, params.ticket, Reason.DENIED);
            return;
        }

        // The subject (= unique identifier) of the end-user.
        const subject = this.spi.getUserSubject();

        // If the subject of the end-user is not available (= the end-user
        // is not authenticated).
        if (isEmpty(subject))
        {
            await authorizationFail(this.api, ctx, params.ticket, Reason.NOT_AUTHENTICATED);
            return;
        }

        // Authorize the authorization request.
        // Generate a redirect response containing an authorization code,
        // an access token and/or an ID token. If the original authorization
        // request had response_type=none, no tokens will be contained
        // in the generated response, though.
        await authorize(this.api, this.spi, ctx, params, subject);
    }
}


export namespace AuthorizationDecisionHandler
{
    /**
     * Input parameters for the `handle()` method of `AuthorizationRequestHandler`
     * class.
     */
    export class Params
    {
        /**
         * The ticket issued by Authlete `/auth/authorization` API.
         */
        public ticket!: string;


        /**
         * The names of requested claims.
         */
        public claimNames?: string[];


        /**
         * The requested claim locales.
         */
        public claimLocales?: string[];


        /**
         * The value of the `id_token` property in the `claims` request
         * parameter.
         */
        public idTokenClaims?: string;


        /**
         * Create a `Params` instance from an instance of `AuthorizationResponse`.
         *
         * @param info
         *         A response from Authlete `/auth/authorization` API.
         */
        public static from(info: AuthorizationResponse): Params
        {
            const params = new Params();

            params.ticket        = info.ticket;
            params.claimNames    = info.claims;
            params.claimLocales  = info.claimsLocales;
            params.idTokenClaims = info.idTokenClaims;

            return params;
        }
    }
}