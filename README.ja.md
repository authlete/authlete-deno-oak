oak (Deno) 用 Authlete ライブラリ
================================

概要
----

このライブラリは、[OAuth 2.0][RFC6749] および [OpenID Connect][OIDC]
をサポートする認可サーバーと、リソースサーバーを実装するためのユーティリティー部品群を提供します。

このライブラリは、oak API と authlete-go ライブラリを用いて書かれています。
[oak][Oak] は Deno で書かれた Web フレームワークの一つです。
一方、[authlete-deno][AuthleteDeno] は Authlete が提供するもう一つのオープンソースライブラリで、
[Authlete Web API][AuthleteAPI] とやりとりするための基本部品群を含んでいます。

[Authlete][Authlete] は OAuth 2.0 と OpenID Connect の実装を提供するクラウドサービスです
([overview][AuthleteOverview])。 認可データ (アクセストークン等) や認可サーバー自体の設定、
クライアントアプリケーション群の設定はクラウド上の Authlete サーバーに保存されるため、
Authlete を使うことで「DB レス」の認可サーバーを構築することができます。

[deno-oak-oauth-server][DenoOakOauthServer] はこのライブラリを使用している認可サーバーの実装で、
認可エンドポイントやトークンエンドポイントに加え、JWK Set エンドポイント、
ディスカバリーエンドポイント、取り消しエンドポイントの実装を含んでいます。
また、[deno-oak-resource-server][DenoOakResourceServer]
はこのライブラリを使用しているリソースサーバーの実装です。 [OpenID Connect Core 1.0][OIDCCore]
で定義されている[ユーザー情報エンドポイント][UserInfoEndpoint]
をサポートし、また、保護リソースエンドポイントの例を含んでいます。
あなたの認可サーバーおよびリソースサーバーの実装の開始点として、これらのサンプル実装を活用してください。

ライセンス
---------

  Apache License, Version 2.0

ソースコード
-----------

  `https://github.com/authlete/authlete-deno-oak`

Deno Land
---------

  `https://deno.land/x/authlete_deno_oak`

サンプル
-------

- [deno-oak-oauth-server][DenoOakOauthServer] - Authorization server
- [deno-oak-resource-server][DenoOakResourceServer] - Resource server

コンタクト
---------

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