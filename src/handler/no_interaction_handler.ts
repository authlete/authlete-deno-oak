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
} from 'https://deno.land/x/authlete_deno@v1.2.9/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { authorizationFail, authorizationIssue } from './auth_req_base_handler.ts';
import { BaseReqHandler, invalidAction } from './base_req_handler.ts';
import { ClaimCollector } from './claim_collector.ts';
import { NoInteractionHandlerSpi } from "./spi/no_interaction_handler_spi.ts";
import Action = AuthorizationResponse.Action;
import Reason = AuthorizationFailRequest.Reason;


function checkAuthentication(spi: NoInteractionHandlerSpi): boolean
{
    return spi.isUserAuthenticated();
}


function checkMaxAge(
    response: AuthorizationResponse, authTime: number): boolean
{
    // Get the requested maximum authentication age (in seconds).
    const maxAge = response.maxAge;

    // No check is needed if no maximum authentication age is requested.
    if (maxAge === 0) return true;

    // The time at which the authentication expires.
    const expiresAtMillis = (authTime + maxAge) * 1000;

    // Ensure that the authentication has not expired yet.
    if (Date.now() < expiresAtMillis) return true;

    // Expired.
    return false;
}


function checkSubject(
    response: AuthorizationResponse, subject: string | null): boolean
{
    // Get the requested subject.
    const requestedSubject = response.subject;

    if (!requestedSubject)
    {
        // No check is needed if no subject is requested.
        return true;
    }

    // Check if the requested subject matches the current user.
    return requestedSubject === subject;
}


function checkAcr(response: AuthorizationResponse, acr: string | null): boolean
{
    // Get the list of requested ACRs.
    const requestedAcrs = response.acrs;

    if (isEmpty(requestedAcrs))
    {
        // No check is needed if no ACR is requested.
        return true;
    }

    for (const requestedAcr of requestedAcrs)
    {
        // Check if the ACR satisfied when the current user was
        // authenticated matches one of the requested ACRs.
        if (requestedAcr === acr) return true;
    }

    // If one of the requested ACRs must be satisfied.
    if (response.acrEssential)
    {
        // None of the requested ACRs is satisfied.
        return false;
    }

    // The ACR satisfied when the current user was authenticated does
    // not match any one of the requested ACRs, but the authorization
    // request from the client application did not request ACR as essential.
    // Then, it is OK to return true here.
    return true;
}


async function issue(
    api: AuthleteApi, spi: NoInteractionHandlerSpi, ctx: Context,
    response: AuthorizationResponse, subject: string, authTime: number,
    acr: string | null): Promise<void>
{
    // The ticket issued by Authlete '/auth/authorization' API.
    const ticket = response.ticket;

    // Get the value of the "sub" claim. This is optional. When 'sub'
    // is null, the value of 'subject' will be used as the value of
    // the "sub" claim.
    const sub = spi.getSub();

    // Collect claim values.
    const claims = new ClaimCollector(
        spi, subject, response.claims, response.claimsLocales).collect();

    // Extra properties to associate with an access token and/or
    // an authorization code.
    const properties = spi.getProperties();

    // Scopes to associate with an access token and/or an authorization
    // code. If a non-null value is returned from this.spi.getScopes(),
    // the scope set replaces the scopes that have been specified
    // in the original authorization request.
    const scopes = spi.getScopes();

    // Call Authlete '/auth/authorization/issue' API.
    await authorizationIssue(
        api, ctx, ticket, subject, authTime, sub, acr, claims, properties, scopes);
}


/**
 * Handler for the case where an authorization request should be processed
 * without user interaction.
 */
export class NoInteractionHandler extends BaseReqHandler
{
    /**
     * The SPI class for this handler.
     */
    private spi: NoInteractionHandlerSpi;


    /**
     * The constructor.
     *
     * @param api
     *         An implementation of `AuthleteApi` interface.
     *
     * @param spi
     *         An implementation of `NoInteractionHandlerSpi` interface.
     */
    public constructor(api: AuthleteApi, spi: NoInteractionHandlerSpi)
    {
        super(api);

        this.spi = spi;
    }


    /**
     * Handle an authorization request without user interaction. This
     * method calls Authlete `/auth/authorization/issue` API or
     * `/auth/authorization/fail` API.
     *
     * @param ctx
     *         A context object.
     *
     * @param response
     *         A response from Authlete `/auth/authorization` API.
     */
    public async handle(ctx: Context, response: AuthorizationResponse): Promise<void>
    {
        // If the value of the "action" parameter in the response from
        // Authlete '/auth/authorization' API is not NO_INTERACTION.
        if (response.action !== Action.NO_INTERACTION)
        {
            // This handler does not handle other cases than NO_INTERACTION.
            invalidAction(ctx, Action[response.action]);
            return;
        }

        // Check 1. End-User Authentication
        if (!checkAuthentication(this.spi))
        {
            // A user must have logged in.
            await authorizationFail(this.api, ctx, response.ticket, Reason.NOT_LOGGED_IN);
            return;
        }

        // Get the time (in seconds) when the user was authenticated.
        const authTime = this.spi.getUserAuthenticatedAt();

        // Check 2. Max Age
        if(!checkMaxAge(response, authTime))
        {
            // The maximum authentication age has elapsed.
            await authorizationFail(this.api, ctx, response.ticket, Reason.EXCEEDS_MAX_AGE);
            return;
        }

        // The current subject, i.e. the unique ID assigned by the service
        // to the current user.
        const subject = this.spi.getUserSubject();

        // Check 3. Subject
        if(!checkSubject(response, subject))
        {
            // The current user is different from the requested subject.
            await authorizationFail(this.api, ctx, response.ticket, Reason.DIFFERENT_SUBJECT);
            return;
        }

        // Get the ACR that was satisfied when the current user was
        // authenticated.
        const acr = this.spi.getAcr();

        // Check 4. ACR
        if(!checkAcr(response, acr))
        {
            // None of the requested ACRs is satisfied.
            await authorizationFail(this.api, ctx, response.ticket, Reason.ACR_NOT_SATISFIED);
            return;
        }

        // Issue tokens without user interaction.
        await issue(this.api, this.spi, ctx, response, subject!, authTime, acr);
    }
}