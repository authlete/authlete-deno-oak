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


import { UserClaimProvider } from './user_claim_provider.ts';


/**
 * Service Provider Interface to work with `UserInfoRequestHandler`.
 *
 * An implementation of this interface must be given to the constructor
 * of `UserInfoRequestHandler` class.
 */
export interface UserInfoRequestHandlerSpi extends UserClaimProvider
{
    /**
     * Get the value of the `"sub"` claim that will be embedded in the
     * response from the userinfo endpoint.
     *
     * @returns The value of the `"sub"` claim.
     */
    getSub(): string | null;
}