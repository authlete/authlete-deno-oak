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


import { AuthorizationDecisionHandlerSpi } from './authorization_decision_handler_spi.ts';
import { AuthorizationRequestHandlerSpiAdapter } from './authorization_request_handler_spi_adapter.ts';


/**
 * Empty implementation of `AuthorizationDecisionHandlerSpi` interface.
 */
export class AuthorizationDecisionHandlerSpiAdapter
    extends AuthorizationRequestHandlerSpiAdapter implements AuthorizationDecisionHandlerSpi
{
    public isClientAuthorized(): boolean
    {
        return false;
    }
}