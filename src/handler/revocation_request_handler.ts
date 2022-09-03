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
    AuthleteApi, RevocationRequest, RevocationResponse
} from 'https://deno.land/x/authlete_deno@v1.2.10/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import {
    getFormParametersAsString, parseAuthorizationHeaderAsBasicCredentials
} from '../web/request_util.ts';
import {
    badRequest, internalServerError, internalServerErrorOnApiCallFailure,
    okJavascript, unauthorized
} from '../web/response_util.ts';
import { BaseReqHandler, unknownAction } from './base_req_handler.ts';
import Action = RevocationResponse.Action;


/**
 * The value for `WWW-Authenticate` header on `'401 Unauthorized'`.
 */
const CHALLENGE = 'Basic realm="revocation"';


async function callRevocation(
    api: AuthleteApi, ctx: Context): Promise<RevocationResponse | undefined>
{
    try
    {
        // Call Authlete '/auth/revocation' API.
        return await api.revocation( await createRevocationRequest(ctx) );
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


async function createRevocationRequest(ctx: Context): Promise<RevocationRequest>
{
    // A request to Authlete '/auth/revocation' API.
    const request = new RevocationRequest();

    // Extract from parameters.
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

    return request;
}


/**
 * Handler for token revocation requests ([RFC 7009](https://tools.ietf.org/html/rfc7009)).
 */
export class RevocationRequestHandler extends BaseReqHandler
{
    /**
     * Handle a revocation request ([RFC 7009](https://tools.ietf.org/html/rfc7009)).
     * This method calls Authlete `/auth/revocation` API.
     *
     * @param params
     *         Parameters for this handler.
     */
    public async handle(ctx: Context): Promise<void>
    {
        // Call Authlete '/auth/revocation' API.
        const response = await callRevocation(this.api, ctx);

        if (!response)
        {
            // If a response is not obtained, it means calling Authlete
            // '/auth/revocation' API failed.
            return;
        }

        // Dispatch according to the action.
        switch (response.action)
        {
            case Action.INVALID_CLIENT:
                // 401 Unauthorized.
                unauthorized(ctx, CHALLENGE, response.responseContent!);
                break;

            case Action.INTERNAL_SERVER_ERROR:
                // 500 Internal Server Error.
                internalServerError(ctx, response.responseContent!);
                break;

            case Action.BAD_REQUEST:
                // 400 Bad Request.
                badRequest(ctx, response.responseContent!);
                break;

            case Action.OK:
                // 200 OK.
                okJavascript(ctx, response.responseContent || '');
                break;

            default:
                // This never happens.
                unknownAction(ctx, '/auth/revocation');
                break;
        }
    }
}