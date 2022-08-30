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


import { AuthorizationResponse } from 'https://deno.land/x/authlete_deno@v1.2.9/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { badRequest, internalServerError, location, okHtmlContent } from '../web/response_util.ts';
import { BaseReqHandler, invalidAction, unknownAction } from './base_req_handler.ts';


import Action = AuthorizationResponse.Action;


/**
 * Handler for error cases of authorization requests.
 *
 * A response from Authlete `/auth/authorization` API contains an `action`
 * response parameter. When the value of the response parameter is neither
 * `NO_INTERACTION` nor `INTERACTION`, the authorization request should
 * be handled as an error case. This class is a handler for such error
 * cases.
 */
export class AuthorizationRequestErrorHandler extends BaseReqHandler
{
    /**
     * Handle an error case of an authorization request.
     *
     * NOTE: Don't call this method when the value of the `action`
     * parameter of the `response` is neither `NO_INTERACTION` nor
     * `INTERACTION`.
     *
     * @param ctx
     *         A context object.
     *
     * @param response
     *         A response from Authlete `/auth/authorization` API.
     */
    public handle(ctx: Context, response: AuthorizationResponse): void
    {
        // Dispatch according to the action.
        switch (response.action)
        {
            case Action.INTERNAL_SERVER_ERROR:
                // 500 Internal Server Error.
                internalServerError(ctx, response.responseContent!);
                break;

            case Action.BAD_REQUEST:
                // 400 Bad Request.
                badRequest(ctx, response.responseContent!);
                break;

            case Action.LOCATION:
                // 302 Found.
                location(ctx, response.responseContent!);
                break;

            case Action.FORM:
                // 200 OK.
                okHtmlContent(ctx, response.responseContent!);
                break;

            case Action.INTERACTION:
                // This is not an error case. The implementation
                // of the authorization endpoint should show an
                // authorization page to the end-user.
                invalidAction(ctx, Action[Action.INTERACTION]);
                break;

            case Action.NO_INTERACTION:
                // This is not an error case. The implementation
                // of the authorization endpoint should handle the
                // authorization request without user interaction.
                invalidAction(ctx, Action[Action.NO_INTERACTION]);
                break;

            default:
                // This never happens.
                unknownAction(ctx, '/auth/authorization');
                break;
        }
    }
}