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
import { BasicCredentials } from '../../../authlete-deno/mod.ts';


/**
 * Get query parameters in the request.
 */
export function getQueryParameters(ctx: Context): URLSearchParams
{
    return ctx.request.url.searchParams;
}


/**
 * Get query parameters in the request as string.
 */
export function getQueryParametersAsString(ctx: Context): string
{
    const params = getQueryParameters(ctx);

    return params ? params.toString() : '';
}


/**
 * Get form parameters in the request.
 */
export async function getFormParameters(ctx: Context): Promise<URLSearchParams>
{
    return ctx.request.body({ type: 'form' }).value;
}


/**
 * Get form parameters in the request as string.
 */
export async function getFormParametersAsString(ctx: Context): Promise<string>
{
    const params = await getFormParameters(ctx);

    return params ? params.toString() : '';
}


/**
 * Get a request header value.
 */
export function getHeader(ctx: Context, name: string): string | null
{
    return ctx.request.headers.get(name);
}


/**
 * Get the value of 'Authorization' request header.
 */
export function getAuthorizationHeader(ctx: Context): string | null
{
    return getHeader(ctx, 'Authorization');
}


/**
 * Parse the value of 'Authorization' request header as basic credentials.
 */
export function parseAuthorizationHeaderAsBasicCredentials(ctx: Context):
    BasicCredentials | null
{
    // The value of 'Authorization' request header.
    const authorization = getAuthorizationHeader(ctx);

    // Parse the value of 'Authorization' request header.
    return BasicCredentials.parse(authorization);
}