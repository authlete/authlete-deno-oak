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


import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { internalServerErrorOnApiCallFailure, noContent, okJson } from '../web/response_util.ts';
import { BaseReqHandler } from './base_req_handler.ts';


/**
 * Handler for requests to an endpoint that exposes JSON Web Key Set
 * ([RFC 7517](https://tools.ietf.org/html/rfc7517)) document.
 *
 * An OpenID Provider (OP) is required to expose its JSON Web Key Set
 * document (JWK Set) so that client applications can (1) verify signatures
 * by the OP and (2) encrypt their requests to the OP. The URI of a JWK
 * Set endpoint can be found as the value of `jwks_uri` in [OpenID Provider
 * Metadata](http://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata),
 * if the OP supports [OpenID Connect Discovery 1.0](
 * http://openid.net/specs/openid-connect-discovery-1_0.html).
 */
export class JwksRequestHandler extends BaseReqHandler
{
    /**
     * Handle a request to the JWK Set document endpoint.
     *
     * @param ctx
     *         A context object.
     *
     * @param pretty
     *         `true` to format the output JSON in a more human-readable
     *         way.
     */
    public async handle(ctx: Context, pretty: boolean): Promise<void>
    {
        let json;

        try
        {
            // Call Authlete '/service/jwks' API.
            json = await this.api.getServiceJwks(pretty);
        }
        catch(e)
        {
            // Calling '/service/jwks' API failed. Return a response of
            // '500 Internal Server Error'.
            internalServerErrorOnApiCallFailure(ctx, e);
            return;
        }

        if (json === null)
        {
            // If the API response is null, return a response of '204 No Content'.
            noContent(ctx);
            return;
        }

        // Send a JSON response with '200 OK'.
        okJson(ctx, json);
    }
}