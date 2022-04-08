Authlete Library for oak (Deno)
================================

Overview
--------

This library provides utility components to make it easy for developers to
implement an authorization server which supports [OAuth 2.0][RFC6749] and
[OpenID Connect][OIDC] and a resource server.

This library is written using [oak][Oak] API and [authlete-deno][AuthleteDeno]
library. oak is a web framework for Deno and authlete-deno is another
Authlete's open source library that provides basic components to communicate
with [Authlete Web APIs][AuthleteAPI].

[Authlete][Authlete] is a cloud service that provides an implementation of
OAuth 2.0 & OpenID Connect ([overview][AuthleteOverview]). You can build a
_DB-less_ authorization server by using Authlete because authorization data
(e.g. access tokens), settings of authorization servers and settings of client
applications are stored in the Authlete server on cloud.

[deno-oak-oauth-server][DenoOakOauthServer] is an authorization server
implementation which uses this library. It implements not only an authorization
endpoint and a token endpoint but also a JWK Set endpoint, a discovery endpoint, an
introspection endpoint and a revocation endpoint.
[deno-oak-resource-server][DenoOakResourceServer] is a resource server implementation
that also uses this library. It supports a [userinfo endpoint][UserInfoEndpoint]
defined in [OpenID Connect Core 1.0][OIDCCore] and includes an example of a
protected resource endpoint, too. Use these sample implementations as a
starting point of your own implementations of an authorization server
and a resource server.

License
-------

  Apache License, Version 2.0

Source Code
-----------

  `https://github.com/authlete/authlete-deno-oak`

Deno Land
---------

  `https://deno.land/x/authlete_deno_oak`

Samples
-------

- [deno-oak-oauth-server][DenoOakOauthServer] - Authorization server
- [deno-oak-resource-server][DenoOakResourceServer] - Resource server

Contact
-------

| Purpose   | Email Address        |
|:----------|:---------------------|
| General   | info@authlete.com    |
| Sales     | sales@authlete.com   |
| PR        | pr@authlete.com      |
| Technical | support@authlete.com |

[Authlete]:               https://www.authlete.com/
[AuthleteAPI]:            https://docs.authlete.com/
[AuthleteDeno]:           https://github.com/authlete/authlete-deno
[AuthleteDenoOak]:        https://github.com/authlete/authlete-deno-oak
[AuthleteOverview]:       https://www.authlete.com/documents/overview
[DenoOakOauthServer]:     https://github.com/authlete/deno-oak-oauth-server
[DenoOakResourceServer]:  https://github.com/authlete/deno-oak-resource-server
[Oak]:                    https://github.com/oakserver/oak
[OIDC]:                   https://openid.net/connect/
[OIDCCore]:               https://openid.net/specs/openid-connect-core-1_0.html
[RFC6749]:                https://tools.ietf.org/html/rfc6749
[UserInfoEndpoint]:       https://openid.net/specs/openid-connect-core-1_0.html#UserInfo