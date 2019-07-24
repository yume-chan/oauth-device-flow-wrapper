# OAuth device flow wrapper

Use OAuth 2.0 Device Authorization [(draft-ietf-oauth-device-flow-15)](https://tools.ietf.org/html/draft-ietf-oauth-device-flow-15) to log into a third-party OAuth 2.0 authorization code [(Section 4.1. of [RTC6749])](https://tools.ietf.org/html/rfc6749#section-4.1) authorization server.

- [OAuth device flow wrapper](#oauth-device-flow-wrapper)
  - [Example](#example)
  - [Development](#development)
    - [Install dependencies](#install-dependencies)
    - [Testing](#testing)
    - [Coverage](#coverage)
  - [License](#license)

## Example

See [example/index.ts](example/index.ts).

## Development

This project uses [pnpm](https://pnpm.js.org/) ([GitHub](https://github.com/pnpm/pnpm)) to manage dependency packages.

### Install dependencies

``` shell
pnpm i
```

You may also use `npm`, but the lockfile may become out of sync.

### Testing

``` shell
npm test
```

### Coverage

``` shell
npm run coverage
```

## License

MIT
