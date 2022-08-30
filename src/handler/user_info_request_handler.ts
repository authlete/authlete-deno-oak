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
    AuthleteApi, isEmpty, isNotEmpty, stringfyJson, UserInfoIssueRequest,
    UserInfoIssueResponse, UserInfoRequest, UserInfoResponse
} from 'https://deno.land/x/authlete_deno@v1.2.9/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import {
    internalServerErrorOnApiCallFailure, okJson, okJwt, Status, wwwAuthenticate
} from '../web/response_util.ts';
import { BaseReqHandler, unknownAction } from './base_req_handler.ts';
import { ClaimCollector } from './claim_collector.ts';
import { UserInfoRequestHandlerSpi } from "./spi/user_info_request_handler_spi.ts";
import UirAction  = UserInfoResponse.Action;
import UiirAction = UserInfoIssueResponse.Action;
import Params = UserInfoRequestHandler.Params;


/**
 * The value for `WWW-Authenticate` header of a response for when an access
 * token is not available.
 */
const CHALLENGE_ON_MISSING_ACCESS_TOKEN =
    'Bearer error="invalid_token",error_description="' +
    'An access token must be sent as a Bearer Token. ' +
    'See OpenID Connect Core 1.0, 5.3.1. UserInfo Request for details."';


async function callUserInfo(
    api: AuthleteApi, ctx: Context, params: Params): Promise<UserInfoResponse | void>
{
    try
    {
        // Call Authlete '/auth/userinfo' API.
        return await api.userInfo(createUserInfoRequest(params));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


function createUserInfoRequest(params: Params): UserInfoIssueRequest
{
    // A request to Authlete /auth/userinfo API.
    const request = new UserInfoRequest();

    // The access token.
    request.token = params.accessToken;

    // The client certificate.
    const clientCertificate = params.clientCertificate;
    if (clientCertificate) request.clientCertificate = clientCertificate;

    return request;
}


async function getUserInfo(
    api: AuthleteApi, spi: UserInfoRequestHandlerSpi, ctx: Context,
    uir: UserInfoResponse): Promise<void>
{
    // Call Authlete '/auth/userinfo/issue' API.
    const response = await callUserInfoIssue(api, spi, ctx, uir);

    if (!response)
    {
        // If a response is not obtained, it means calling Authlete
        // '/auth/userinfo/issue' API failed.
        return;
    }

    // Dispatch according to the action.
    switch (response.action)
    {
        case UiirAction.INTERNAL_SERVER_ERROR:
            // 500 Internal Server Error.
            wwwAuthenticate(ctx, Status.INTERNAL_SERVER_ERROR, response.responseContent);
            break;

        case UiirAction.BAD_REQUEST:
            // 400 Bad Request.
            wwwAuthenticate(ctx, Status.BAD_REQUEST, response.responseContent);
            break;

        case UiirAction.UNAUTHORIZED:
            // 401 Unauthorized.
            wwwAuthenticate(ctx, Status.UNAUTHORIZED, response.responseContent);
            break;

        case UiirAction.FORBIDDEN:
            // 403 Forbidden.
            wwwAuthenticate(ctx, Status.FORBIDDEN, response.responseContent);
            break;

        case UiirAction.JSON:
            // 200 OK.
            okJson(ctx, response.responseContent);
            break;

        case UiirAction.JWT:
            // 200 OK.
            okJwt(ctx, response.responseContent);
            break;

        default:
            // This never happens.
            unknownAction(ctx, '/auth/authorization/issue');
            break;
    }
}


async function callUserInfoIssue(
    api: AuthleteApi, spi: UserInfoRequestHandlerSpi, ctx: Context, uir: UserInfoResponse
): Promise<UserInfoIssueResponse | void>
{
    try
    {
        // Call Authlete '/auth/userinfo/issue' API.
        return await api.userInfoIssue(
            await createUserInfoIssueRequest(spi, uir));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


async function createUserInfoIssueRequest(
    spi: UserInfoRequestHandlerSpi,  uir: UserInfoResponse): Promise<UserInfoIssueRequest>
{
    // Create a request for Authlete '/auth/userinfo/issue' API.
    const request = new UserInfoIssueRequest();

    // The access token.
    request.token = uir.token;

    // The value of the 'sub' claim (optional).
    const sub = spi.getSub();
    if (isNotEmpty(sub)) request.sub = sub;

    // The claims of the end-user.
    const claims = new ClaimCollector(spi, uir.subject!, uir.claims).collect();
    const stringClaims = stringfyJson(claims);
    if (isNotEmpty(stringClaims)) request.claims = stringClaims;

    return request;
}


export class UserInfoRequestHandler extends BaseReqHandler
{
    /**
     * The SPI class for this handler.
     */
    private spi: UserInfoRequestHandlerSpi;


    /**
     * The constructor.
     *
     * @param api
     *         An implementation of `AuthleteApi` interface.
     *
     * @param spi
     *         An implementation of `UserInfoRequestHandlerSpi` interface.
     */
    public constructor(api: AuthleteApi, spi: UserInfoRequestHandlerSpi)
    {
        super(api);

        this.spi = spi;
    }


    /**
     * Handle a user info request.
     *
     * @param ctx
     *         A context object.
     *
     * @param params
     *         Parameters for this handler.
     */
    public async handle(ctx: Context, params: Params): Promise<void>
    {
        // Return a response of '400 Bad Request' if an access token is
        // not available.
        if (isEmpty(params.accessToken))
        {
            wwwAuthenticate(ctx, Status.BAD_REQUEST, CHALLENGE_ON_MISSING_ACCESS_TOKEN);
            return;
        }

        // Call Authlete '/auth/userinfo' API.
        const response = await callUserInfo(this.api, ctx, params);

        if (!response)
        {
            // If a response is not obtained, it means calling Authlete
            // '/auth/userinfo' API failed.
            return;
        }

        // Dispatch according to the action.
        switch (response.action)
        {
            case UirAction.INTERNAL_SERVER_ERROR:
                // 500 Internal Server Error.
                wwwAuthenticate(ctx, Status.INTERNAL_SERVER_ERROR, response.responseContent!);
                break;

            case UirAction.BAD_REQUEST:
                // 400 Bad Request.
                wwwAuthenticate(ctx, Status.BAD_REQUEST, response.responseContent!);
                break;

            case UirAction.UNAUTHORIZED:
                // 401 Unauthorized.
                wwwAuthenticate(ctx, Status.UNAUTHORIZED, response.responseContent!);
                break;

            case UirAction.FORBIDDEN:
                // 403 Forbidden.
                wwwAuthenticate(ctx, Status.FORBIDDEN, response.responseContent!);
                break;

            case UirAction.OK:
                // Return the user information.
                await getUserInfo(this.api, this.spi, ctx, response);
                break;

            default:
                // This never happens.
                unknownAction(ctx, '/auth/userinfo');
                break;
        }
    }
}


export namespace UserInfoRequestHandler
{
    /**
     * Input parameters for the `handle()` method of `UserInfoRequestHandler`
     * class.
     */
    export interface Params
    {
        /**
         * The access token included in the userinfo request.
         */
        accessToken?: string;


        /**
         * The client certificate included in the userinfo request.
         *
         * For more details, see [RFC 8705 : OAuth 2.0 Mutual-TLS Client
         * Authentication and Certificate-Bound Access Tokens](
         * https://www.rfc-editor.org/rfc/rfc8705.html).
         */
        clientCertificate?: string;


        /**
         * The DPoP proof JWT (the value of the `DPoP` HTTP header).
         *
         * See [OAuth 2.0 Demonstration of Proof-of-Possession at the
         * Application Layer (DPoP)](https://datatracker.ietf.org/doc/draft-ietf-oauth-dpop/)
         * for details.
         */
        dpop?: string;


        /**
         * HTTP method of the user info request. This field is used to
         * validate the DPoP header. In normal cases, the value is either
         * `GET` or `POST`.
         */
        htm?: string;


        /**
         * URL of the user info endpoint. This field is used to validate
         * the DPoP header. If this parameter is omitted, the `userInfoEndpoint`
         * property of the service is used as the default value. See [OAuth
         * 2.0 Demonstration of Proof-of-Possession](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-dpop)
         * at the Application Layer (DPoP) for details.
         */
        htu?: string;
    }
}