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


import { Property, TokenResponse } from 'https://deno.land/x/authlete_deno@v1.2.10/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';


/**
 * Service Provider Interface to work with `TokenRequestHandler`.
 *
 * An implementation of this interface must be given to the constructor
 * of `TokenRequestHandler` class.
 */
export interface TokenRequestHandlerSpi
{
    /**
     * Authenticate an end-user.
     *
     * This method is called only when [Resource Owner Password Credentials
     * Grant](https://tools.ietf.org/html/rfc6749#section-4.3) was used.
     * Therefore, if you have no mind to support Resource Owner Password
     * Credentials, always return `null`. In typical cases, you don't
     * have to support Resource Owner Password Credentials Grant.
     *
     * FYI: RFC 6749 says _"The authorization server should take special
     * care when enabling this grant type and only allow it when other
     * flows are not viable."_
     *
     * @param username
     *         The value of `username` parameter in the token request.
     *
     * @param password
     *         The value of `password` parameter in the token request.
     *
     * @returns The subject (= unique identifier) of the authenticated
     *          end-user. If the pair of `username` and `password` is
     *          invalid, `null` should be returned from the promise.
     */
    authenticateUser(
        username: string | null, password: string | null): string | null;


    /**
     * Get extra properties to associate with an access token.
     *
     * This method is expected to return an array of extra properties.
     * The following is an example that returns an array containing one
     * extra property.
     *
     * ```ts
     * public getProperties(): Property[] | null
     * {
     *     return [
     *         new Property('example_parameter', 'example_value')
     *     ];
     * }
     * ```
     *
     * Extra properties returned from this method will appear as top-level
     * entries in a JSON response from an authorization server as shown
     * in [5.1. Successful Response](https://tools.ietf.org/html/rfc6749#section-5.1)
     * in RFC 6749.
     *
     * Keys listed below should not be used and they would be ignored
     * on the server side even if they were used. It's because they are
     * reserved in [RFC 6749](https://tools.ietf.org/html/rfc6749) and
     * [OpenID Connect Core 1.0](http://openid.net/specs/openid-connect-core-1_0.html).
     *
     * - `access_token`
     * - `token_type`
     * - `expires_in`
     * - `refresh_token`
     * - `scope`
     * - `error`
     * - `error_description`
     * - `error_uri`
     * - `id_token`
     *
     * Note that there is an upper limit on the total size of extra
     * properties. On the server side, the properties will be (1) converted
     * to a multidimensional string array, (2) converted to JSON, (3)
     * encrypted by AES/CBC/PKCS5Padding, (4) encoded by base64url, and
     * then stored into the database. The length of the resultant string
     * must not exceed 65,535 in bytes. This is the upper limit, but
     * we think it is big enough.
     *
     * When the value of `grant_type` parameter contained in the token
     * request from the client application is `authorization_code` or
     * `refresh_token`, extra properties are merged. Rules are as described
     * below.
     *
     * **Rules for `grant_type=authorization_code`**
     *
     * If the authorization code presented by the client application
     * already has extra properties (this happens if
     * `AuthorizationDecisionHandlerSpi.getProperties()` returned extra
     * properties when the authorization code was issued), extra properties
     * returned by this method will be merged into the existing extra
     * properties. Note that the existing extra properties will be
     * overwritten if extra properties returned by this method have the
     * same keys. For example, if an authorization code has two extra
     * properties, `a=1` and `b=2`, and if this method returns two extra
     * properties, `a=A` and `c=3`, the resultant access token will have
     * three extra properties, `a=A`, `b=2` and `c=3`.
     *
     * **Rules for `grant_type=refresh_token`**
     *
     * If the access token associated with the refresh token presented
     * by the client application already has extra properties, extra
     * properties returned by this method will be merged into the existing
     * extra properties. Note that the existing extra properties will
     * be overwritten if extra properties returned by this method have
     * the same keys.
     *
     * @returns Extra properties. If `null` is returned, any extra property
     *          will not be associated.
     */
    getProperties(): Property[] | null;


    /**
     * Handle a token exchange request.
     *
     * This method is called when the grant type of the token request
     * is `urn:ietf:params:oauth:grant-type:token-exchange`. The grant
     * type is defined in [RFC 8693: OAuth 2.0 Token Exchange](https://www.rfc-editor.org/rfc/rfc8693.html).
     *
     * RFC 8693 is very flexible. In other words, the specification does
     * not define details that are necessary for secure token exchange.
     * Therefore, implementations have to complement the specification
     * with their own rules.
     *
     * The second argument passed to this method is an instance of `TokenResponse`
     * that represents a response from Authlete `/auth/token` API. The
     * instance contains information about the token exchange request
     * such as the value of the `subject_token` request parameter. Implementations
     * of this `tokenExchange` method are supposed to (1) validate the
     * information based on their own rules, (2) generate a token (e.g.
     * an access token) using the information, and (3) prepare a token
     * response in the JSON format that conforms to [Section 2.2](https://www.rfc-editor.org/rfc/rfc8693.html#section-2.2)
     * of RFC 8693.
     *
     * Authlete `/auth/token` API performs validation of token exchange
     * requests to some extent. Therefore, authorization server implementations
     * don't have to repeat the same validation steps. See the [JavaDoc](https://authlete.github.io/authlete-java-common/)
     * of the `TokenResponse` class for details about the validation steps.
     *
     * NOTE: Token Exchange is supported by Authlete 2.3 and newer versions.
     * If the Authlete server of your system is older than version 2.3,
     * the grant type (`urn:ietf:params:oauth:grant-type:token-exchange`)
     * is not supported and so this method is never called.
     *
     * @param ctx
     *         A context object.
     *
     * @param response
     *         A response from Authlete `/auth/token` API.
     *
     * @return `true` to indicate that the implementation of this method
     *         has prepared a token response. `false` to indicate that
     *         the implementation of this method has done nothing. When
     *         `false` is returned, `TokenReqHandler` will generate 400
     *         Bad Request with `"error":"unsupported_grant_type"`.
     */
    tokenExchange(ctx: Context, response: TokenResponse): Promise<boolean>;
}