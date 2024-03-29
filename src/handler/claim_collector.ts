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


import { isEmpty, isNotEmpty } from 'https://deno.land/x/authlete_deno@v1.2.10/mod.ts';
import { UserClaimProvider } from './spi/user_claim_provider.ts';


/**
 * Separator between a claim name and a language tag.
 */
export const CLAIM_SEPARATOR = '#';


/**
 * Drop empty and duplicate claim locales from the given array.
 */
function normalizeClaimLocales(claimLocales?: string[]): string[] | undefined
{
    // If no claim locale is specified.
    if (isEmpty(claimLocales)) return undefined;

    // From 5.2. Claims Languages and Scripts in OpenID Connect Core 1.0
    //
    //     However, since BCP47 language tag values are case insensitive,
    //     implementations SHOULD interpret the language tag values
    //     supplied in a case insensitive manner.

    // A set for duplicate check.
    const set = new Set<string>();

    // The resultant list.
    const list: string[] = [];

    // Loop to drop empty and duplicate claim locales.
    for (const claimLocale of claimLocales)
    {
        // Skip if the claim locale is empty.
        if (claimLocale.length === 0) continue;

        // Skip if the claim locale is a duplicate.
        if (set.has(claimLocale.toLowerCase())) continue;

        // Add the claim locale as a known one.
        set.add(claimLocale.toLowerCase());

        // Add the claim locale to the resultant list.
        list.push(claimLocale);
    };

    // Return the collected claim locales or null.
    return list.length > 0 ? list : undefined;
}


function getClaimValue(
    claimProvider: UserClaimProvider, subject: string, name: string,
    tag?: string, claimLocales?: string[]): any
{
    // If a language tag is explicitly appended, get the claim value
    // of the claim with the specific language tag.
    if (isNotEmpty(tag))
    {
        return claimProvider.getUserClaimValue(subject, name, tag);
    }

    // If claim locales are not specified by 'claims_locales' request
    // parameter, get the claim value of the claim without any language
    // tag.
    if (isEmpty(claimLocales))
    {
        return claimProvider.getUserClaimValue(subject, name);
    }

    // For each claim locale. They are ordered by preference.
    for(const claimLocale of claimLocales)
    {
        // Try to get the claim value with the claim locale.
        const value = claimProvider.getUserClaimValue(subject, name, claimLocale);

        // If the claim value was obtained.
        if (value) return value;
    }

    // The last resort. Try to get the claim value without any language
    // tag.
    return claimProvider.getUserClaimValue(subject, name);
}


/**
 * Collector of claim values.
 */
export class ClaimCollector
{
    private claimProvider: UserClaimProvider;
    private subject: string;
    private claimNames?: string[];
    private claimLocales?: string[];


    /**
     * @param claimProvider
     *         An implementation of the `IUserClaimProvider` which
     *         provides actual claim values.
     *
     * @param subject
     *         The subject (= unique identifier) of a user.
     *
     * @param claimNames
     *         Claim names.
     *
     * @param claimLocales
     *         Claim locales. This should be the value of the `claims_locales`
     *         request parameter.
     */
    public constructor(
        claimProvider: UserClaimProvider, subject: string, claimNames?: string[],
        claimLocales?: string[])
    {
        this.claimProvider = claimProvider;
        this.subject       = subject;
        this.claimNames    = claimNames;
        this.claimLocales  = normalizeClaimLocales(claimLocales);
    }


    /**
     * Collect claim values.
     */
    public collect(): { [key: string]: any } | null
    {
        // If no claim is required.
        if (isEmpty(this.claimNames)) return null;

        // Claim values.
        const claims: { [key: string]: any } = {};

        // For each requested claim.
        for (const claimName of this.claimNames)
        {
            // Skip if the claim name is empty.
            if (claimName.length === 0) continue;

            // Split the claim name into the name part and the tag part.
            const [ name, tag ] = claimName.split(CLAIM_SEPARATOR, 2);

            // Skip if the name part is empty.
            if (name.length === 0) continue;

            // Get the claim value of the claim.
            const value = getClaimValue(
                this.claimProvider, this.subject, name, tag, this.claimLocales);

            // Skip if the claim value was not obtained.
            if (value === null) continue;

            // Just for an edge case where 'claimName' ends with '#'.
            const key = claimName.endsWith(CLAIM_SEPARATOR) ? name : claimName;

            // Add the pair of the claim name and the claim value.
            claims[key] = value;
        }

        // Return the collected claims or null.
        return Object.keys(claims).length > 0 ? claims : null;
    }
}