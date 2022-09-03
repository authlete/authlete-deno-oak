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


import { AuthleteApi } from 'https://deno.land/x/authlete_deno@v1.2.10/mod.ts';
import { Context } from 'https://deno.land/x/oak@v10.2.0/mod.ts';
import { internalServerError } from '../web/response_util.ts';


/**
 * Send a response that indicates the value of `action` parameter contained
 * in an Authlete API response is unknown.
 */
export function unknownAction(ctx: Context, path: string): void
{
    // 500 Internal Server Error.
    internalServerError(ctx, `Authlete ${path} API returned an unknown action`);
}


/**
 * Send a response that indicates the value of `action` parameter contained
 * in an Authlete API response is invalid.
 */
export function invalidAction(ctx: Context, action: string): void
{
    // 500 Internal Server Error.
    internalServerError(ctx, `${action} is an invalid action.`);
}


/**
 * The base class for a handler class.
 */
export abstract class BaseReqHandler
{
     /**
      * The implementation of `AuthleteApi` interface.
      */
     protected api: AuthleteApi;


     /**
      * @param api
      *         An implementation of `AuthleteApi` interface.
      */
     public constructor(api: AuthleteApi)
     {
         this.api = api;
     }
}