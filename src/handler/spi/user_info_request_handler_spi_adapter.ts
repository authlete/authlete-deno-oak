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


import { UserClaimProviderAdapter } from './user_claim_provider_adapter.ts';
import { UserInfoRequestHandlerSpi } from './user_info_request_handler_spi.ts';


/**
 * Empty implementation of `UserInfoRequestHandlerSpi` interface.
 */
export class UserInfoRequestHandlerSpiAdapter
    extends UserClaimProviderAdapter implements UserInfoRequestHandlerSpi
{
    public getSub(): string | null
    {
        return null;
    }
}