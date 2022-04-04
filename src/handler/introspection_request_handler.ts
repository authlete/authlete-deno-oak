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
    AuthleteApi, StandardIntrospectionRequest, StandardIntrospectionResponse
} from 'https://deno.land/x/authlete_deno@v1.2.6/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { getFormParametersAsString } from '../web/request_util.ts';
import {
    badRequest, internalServerError, internalServerErrorOnApiCallFailure,
    okJson
} from '../web/response_util.ts';
import { BaseReqHandler, unknownAction } from './base_req_handler.ts';


import Action = StandardIntrospectionResponse.Action;


async function callStandardIntrospection(
    api: AuthleteApi, ctx: Context): Promise<StandardIntrospectionResponse | undefined>
{
    try
    {
        // Call Authlete '/auth/introspection/standard' API.
        return await api.standardIntrospection(
            await createStandardIntrospectionRequest(ctx));
    }
    catch(e)
    {
        // Return a response of 500 internal server error.
        internalServerErrorOnApiCallFailure(ctx, e);
    }
}


async function createStandardIntrospectionRequest(
    ctx: Context): Promise<StandardIntrospectionRequest>
{
    // A request to Authlete '/auth/token' API.
    const request = new StandardIntrospectionRequest();

    // Extract from parameters.
    request.parameters = await getFormParametersAsString(ctx);

    return request;
}


/**
 * Handler for token introspection requests ([RFC 7662](https://tools.ietf.org/html/rfc7662)).
 */
export class IntrospectionRequestHandler extends BaseReqHandler
{
    /**
     * Handle an introspection request. This method calls Authlete
     * `/auth/introspection/standard` API.
     *
     * @param ctx
     *         A context object.
     */
    public async handle(ctx: Context): Promise<void>
    {
        // Call Authlete '/auth/introspection/standard' API.
        const response = await callStandardIntrospection(this.api, ctx);

        if (!response)
        {
            // If a response is not obtained, it means calling Authlete
            // '/auth/introspection/standard' API failed.
            return;
        }

        // Dispatch according to the action.
        switch (response.action)
        {
            case Action.INTERNAL_SERVER_ERROR:
                // 500 Internal Server Error.
                internalServerError(ctx, response.responseContent);
                break;

            case Action.BAD_REQUEST:
                // 400 Bad Request.
                badRequest(ctx, response.responseContent);
                break;

            case Action.OK:
                // 200 OK.
                okJson(ctx, response.responseContent);
                break;

            default:
                // This never happens.
                unknownAction(ctx, '/auth/introspection/standard');
                break;
        }
    }
}