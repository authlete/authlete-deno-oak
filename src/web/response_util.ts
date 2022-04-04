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


/**
 * HTTP status code.
 */
export class Status
{
    public static readonly OK                    = 200;
    public static readonly CREATED               = 201;
    public static readonly NO_CONTENT            = 204;
    public static readonly FOUND                 = 302;
    public static readonly BAD_REQUEST           = 400;
    public static readonly UNAUTHORIZED          = 401;
    public static readonly FORBIDDEN             = 403;
    public static readonly NOT_FOUND             = 404;
    public static readonly INTERNAL_SERVER_ERROR = 500;
}


/**
 * Header properties.
 */
export class Header
{
    public static readonly CONTENT_TYPE     = 'Content-Type';
    public static readonly CACHE_CONTROL    = 'Cache-Control';
    public static readonly PRAGMA           = 'Pragma';
    public static readonly LOCATION         = 'Location';
    public static readonly WWW_AUTHENTICATE = 'WWW-Authenticate';
}


/**
 * `'Content-Type'` header values.
 */
export class ContentType
{
    public static readonly APPLICATION_FORM_URLENCODED = 'application/x-www-form-urlencoded';
    public static readonly APPLICATION_JAVASCRIPT_UTF8 = 'application/javascript; charset=utf-8';
    public static readonly APPLICATION_JSON_UTF8       = 'application/json; charset=utf-8';
    public static readonly APPLICATION_JWT             = 'application/jwt';
    public static readonly TEXT_HTML_UTF8              = 'text/html; charset=utf-8';
}


/**
 * `'Cache-Control'` header values.
 */
export class CacheControl
{
    public static readonly NO_STORE = 'no-store';
}


/**
 * `'Pragma'` header values.
 */
export class Pragma
{
    public static readonly NO_CACHE = 'no-cache';
}


/**
 * Create a response of `'200 OK'` with the given content and the given
 * content type.
 */
export function ok(ctx: Context, type: string, content: string)
{
    buildResponse(ctx, Status.OK, type, content);
}


/**
 * Create a response of `'200 OK'` with the given content. The `Content-Type`
 * of the response is `'application/json; charset=utf-8'`.
 */
export function okJson(ctx: Context, content: string)
{
    ok(ctx, ContentType.APPLICATION_JSON_UTF8, content);
}


/**
 * Create a response of `'200 OK'` with the HTML content specified by
 * the given path. The `Content-Type` of the response is `'text/html; charset=utf-8'`.
 */
export function okHtml(ctx: any, view: string, data: object)
{
    buildResponse(ctx);
    ctx.render(view, data);
}


/**
 * Create a response of `'200 OK'` with the given HTML content. The
 * `Content-Type` of the response is set to `'text/html; charset=utf-8'`.
 */
export function okHtmlContent(ctx: Context, content: string)
{
    ok(ctx, ContentType.TEXT_HTML_UTF8, content);
}


/**
 * Create a response of `'200 OK'` with the given Javascript content.
 * The `Content-Type` of the response is set to `'application/javascript; charset=utf-8'`.
 */
export function okJavascript(ctx: Context, content: string)
{
    ok(ctx, ContentType.APPLICATION_JAVASCRIPT_UTF8, content);
}


/**
 * Create a response of `'200 OK'` with the given JWT content. The
 * `Content-Type` of the response is set to `'application/jwt'`.
 */
export function okJwt(ctx: Context, content: string)
{
    ok(ctx, ContentType.APPLICATION_JWT, content);
}


/**
 * Create a response of `'201 Created'` with the given `JSON` content.
 * The `Content-Type` of the response is set to `'application/json; charset=utf-8'`.
 */
export function created(ctx: Context, content: string)
{
    buildResponse(ctx, Status.CREATED, ContentType.APPLICATION_JSON_UTF8, content);
}


/**
 * Create a response of `'204 No Content'`.
 */
export function noContent(ctx: Context)
{
    buildResponse(ctx, Status.OK);
}


/**
 * Create a response of `'302 Found'` with the given location.
 */
export function location(ctx: Context, location: string)
{
    buildResponse(ctx);
    ctx.response.redirect(location);
}


/**
 * Create a response of `'400 Bad Request'`. The The `Content-Type` of
 * the response is set to `'application/json; charset=utf-8'`.
 */
export function badRequest(ctx: Context, content: string)
{
    return buildResponse(ctx, Status.BAD_REQUEST, ContentType.APPLICATION_JSON_UTF8, content);
}


/**
 * Create a response of `'401 Unauthorized'`. The `Content-Type` of the
 * response is set to `'application/json; charset=utf-8'`.
 */
export function unauthorized(ctx: Context, challenge: string, content?: string)
{
    buildResponse(ctx, Status.UNAUTHORIZED, ContentType.APPLICATION_JSON_UTF8, content);
    ctx.response.headers.set(Header.WWW_AUTHENTICATE, challenge);
}


/**
 * Create a response of `'403 Forbidden'`. The `Content-Type` of the
 * response is set to `'application/json; charset=utf-8'`.
 */
export function forbidden(ctx: Context, content: string)
{
    buildResponse(ctx, Status.FORBIDDEN, ContentType.APPLICATION_JSON_UTF8, content);
}


/**
 * Create a response of `'404 Not Found'`. The `Content-Type` of the
 * response is set to `'application/json; charset=utf-8'`.
 */
export function notFound(ctx: Context, content: string)
{
    buildResponse(ctx, Status.NOT_FOUND, ContentType.APPLICATION_JSON_UTF8, content);
}


/**
 * Create a response of `'500 Internal Server Error'` formatted in the
 * given type. The `type` parameter defaults to `ContentType.APPLICATION_JSON_UTF8`
 * (= `application/javascript; charset=utf-8`).
 */
export function internalServerError(ctx: Context,
    content: string, type: string = ContentType.APPLICATION_JSON_UTF8)
{
    buildResponse(ctx, Status.INTERNAL_SERVER_ERROR, type, content);
}


/**
 * Create a response of `'500 Internal Server Error'` for cases where
 * calling an Authlete API failed. The `Content-Type` of the response
 * is set to `application/javascript; charset=utf-8`.
 */
export function internalServerErrorOnApiCallFailure(ctx: Context, e: any)
{
    internalServerError(
        ctx, `{"error_code":"server_error","error_message":"${e.responseBody || e.message}"}`);
}


/**
 * Create a response with the given status and `WWW-Authenticate` header
 * having the given challenge as its value.
 */
export function wwwAuthenticate(ctx: Context, status: number, challenge: string)
{
    buildResponse(ctx, status);
    ctx.response.headers.set(Header.WWW_AUTHENTICATE, challenge);
}


/**
 * Build a `Response` object.
 */
export function buildResponse(ctx: Context, status?: number, type?: string, body?: string)
{
    // Set headers.
    setHeaders(ctx, type);

    // Set the status code if necessary.
    if (status) ctx.response.status = status;

    // Set the response body if necessary.
    if (body) ctx.response.body = body;
}


function setHeaders(ctx: Context, type?: string)
{
    // The response headers.
    const headers = ctx.response.headers;

    // Set 'Cache-Control: no-store'.
    headers.set(Header.CACHE_CONTROL, CacheControl.NO_STORE);

    // Set 'Pragma: no-cache'.
    headers.set(Header.PRAGMA, Pragma.NO_CACHE);

    // Set 'Content-Type: xxx'.
    if (type) headers.set(Header.CONTENT_TYPE, type);
}