import { URL, URLSearchParams } from 'url';
import { IncomingMessage, ServerResponse } from 'http';

import React from 'react';
import { renderToString } from 'react-dom/server';

import fetch from 'node-fetch';

import { Page, PageProps } from './page/components';
import { OauthDeviceFlowServerConfig } from './config';
import { OauthDeviceFlowWrapperState } from './state';
import { OauthDeviceFlowStorage } from './storage';
import { humanCode } from './human-code';

export default class OauthDeviceFlowWrapper {
    private _config: OauthDeviceFlowServerConfig;
    public get config(): Readonly<OauthDeviceFlowServerConfig> { return this._config; }

    private _storage: OauthDeviceFlowStorage<OauthDeviceFlowWrapperState>;

    public constructor(config: OauthDeviceFlowServerConfig, storage: OauthDeviceFlowStorage<OauthDeviceFlowWrapperState>) {
        this._config = {
            deviceCodeExpireIn: 15 * 60,
            pollingInterval: 5,
            ...config,
            endpoints: {
                deviceCode: '/devicecode',
                verification: '/device',
                redirect: '/redirect',
                token: '/token',
                ...config.endpoints,
            },
        };
        this._storage = storage;
    }

    private async processDeviceCodeRequest(url: URL, request: IncomingMessage, response: ServerResponse) {
        if (request.method === 'OPTION') {
            response.writeHead(200, 'OK').end();
            return;
        }

        if (request.method !== 'POST') {
            response.writeHead(400, 'Bad Request').end();
            return;
        }

        let chunks: Buffer[] = [];
        for await (const chunk of request) {
            chunks.push(chunk);
        }
        const body = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));

        const deviceCode = humanCode(32);
        const userCode = humanCode(8);

        const state: OauthDeviceFlowWrapperState = {
            // draft-ietf-oauth-device-flow-15 3.1. Device Authroization Request
            clientId: body.get('client_id')!,
            scope: body.get('scope')!,

            deviceCode,
            userCode,
            expireAt: Date.now() + this._config.deviceCodeExpireIn! * 1000,

            // extended parameters
            clientName: body.get('client_name')!,
            serviceName: body.get('service_name')!,
            authroizeUrl: body.get('authroize_url')!,
            authroizeParameters: body.get('authroize_parameters') || '{}',
            tokenUrl: body.get('token_url')!,
            tokenParameters: body.get('token_parameters') || '{}',
        };
        this._storage.add(state);

        const verificationUri = `${url.protocol}//${url.host}${this._config.endpoints!.verification}`;
        const verificationUriComplete = `${verificationUri}?code=${userCode}`;

        response
            .writeHead(200, 'OK', {
                'Content-Type': 'application/json',
            })
            .end(JSON.stringify({
                // draft-ietf-oauth-device-flow-15 3.2. Device Authroization Response
                device_code: deviceCode,
                user_code: userCode,
                verification_uri: verificationUri,
                verification_uri_complete: verificationUriComplete,
                expires_in: this._config.deviceCodeExpireIn!,
                interval: this._config.pollingInterval,
            }), 'utf8');
    }

    private processVerificationRequest(url: URL, request: IncomingMessage, response: ServerResponse) {
        const userCode = url.searchParams.get('code');
        let element: React.ReactElement;

        const initialState: Partial<PageProps> = {};

        if (userCode) {
            initialState.userCode = userCode;

            const state = this._storage.getStateByUserCode(userCode);
            if (state) {
                initialState.clientName = state.clientName;
                initialState.serviceName = state.serviceName;
                initialState.serviceDomain = new URL(state.authroizeUrl).host;
                initialState.authroizeUrl = `${
                    state.authroizeUrl
                    }?${
                    new URLSearchParams({
                        // rfc6749 4.1.1. Authroization Request
                        response_type: 'code',
                        ...JSON.parse(state.authroizeParameters),
                        client_id: state.clientId,
                        scope: state.scope,
                        redirect_uri: `${url.protocol}//${url.host}${this._config.endpoints!.redirect}`,
                        state: state.userCode,
                    }).toString()
                    }`;
            }
        }

        const template = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf8" />
            </head>
            <body>
                <div id="app">
                    ${renderToString(<Page {...initialState} />)}
                </div>

                <script>
                    window.initialState = JSON.parse("${JSON.stringify(initialState).replace(/"/g, '\\"')}");
                </script>
                <script src="${this._config.webScriptPath}"></script>
            </body>
        </html>
        `;

        response.writeHead(200, 'OK', {
            'Content-Type': 'text/html',
        }).end(template, 'utf-8');
    }

    private async fetchAccessToken(code: string, redirectUri: string, state: OauthDeviceFlowWrapperState) {
        const response = await fetch(state.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                // rfc6749 4.1.3. Access Token Request
                grant_type: 'authorization_code',
                ...JSON.parse(state.tokenParameters),
                code,
                redirect_uri: redirectUri,
                client_id: state.clientId,
            }).toString(),
        });

        state.responseStatus = response.status;
        state.responseStatusText = response.statusText;
        state.responseText = await response.text();
    }

    private async processRedirectRequest(url: URL, request: IncomingMessage, response: ServerResponse) {
        // rfc6749 4.1.1. Authroization Response
        const userCode = url.searchParams.get('state');
        if (!userCode) {
            return;
        }

        const state = this._storage.getStateByUserCode(userCode);
        if (!state) {
            return;
        }

        const error = url.searchParams.get('error');
        if (error) {
            url.searchParams.delete('state');
            const response: Record<string, string> = {};
            for (const [key, value] of url.searchParams) {
                response[key] = value;
            }

            state.responseStatus = 400;
            state.responseStatusText = 'Bad Request';
            state.responseText = JSON.stringify(response);

            return;
        }

        await this.fetchAccessToken(
            url.searchParams.get('code')!,
            `${url.protocol}//${url.host}${this._config.endpoints!.redirect}`,
            state);

        response.writeHead(200, 'OK').end();
    }

    private async processTokenRequest(url: URL, request: IncomingMessage, response: ServerResponse) {
        if (request.method === 'OPTION') {
            response.writeHead(200, 'OK').end();
            return;
        }

        if (request.method !== 'POST') {
            response.writeHead(400, 'Bad Request').end();
            return;
        }

        let chunks: Buffer[] = [];
        for await (const chunk of request) {
            chunks.push(chunk);
        }
        const body = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));

        response.setHeader('Content-Type', 'application/json');

        const grantType = body.get('grant_type');
        if (!grantType) {
            response
                .writeHead(400, 'Invalid Request')
                .end(JSON.stringify({
                    'error': 'invalid_request',
                }), 'utf8');
            return;
        }

        if (grantType === 'urn:ietf:params:oauth:grant-type:device_code') {
            const deviceCode = body.get('device_code');
            if (!deviceCode) {
                response
                    .writeHead(400, 'Invalid Request')
                    .end(JSON.stringify({
                        'error': 'invalid_request',
                    }), 'utf8');
                return;
            }

            const state = this._storage.getStateByDeviceCode(deviceCode);
            if (!state) {
                response
                    .writeHead(400, 'Invalid Request')
                    .end(JSON.stringify({
                        'error': 'expired_token',
                    }), 'utf8');
                return;
            }

            if (!state.responseStatus) {
                response
                    .writeHead(400, 'Bad Request')
                    .end(JSON.stringify({
                        'error': 'authorization_pending',
                    }), 'utf8');
                return;
            }

            response
                .writeHead(state.responseStatus, state.responseStatusText)
                .end(state.responseText, 'utf8');
            this._storage.remove(state);
        } else {
            const tokenUri = body.get('token_uri')!;
            body.delete('token_uri');

            const { status, statusText, responseText } = await fetch(tokenUri, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            }).then(async response => ({
                status: response.status,
                statusText: response.statusText,
                responseText: await response.text(),
            }));
            response.writeHead(status, statusText).end(responseText);
        }
    }

    public processRequest(request: IncomingMessage, response: ServerResponse) {
        const url = new URL(`http://${request.headers.host}${request.url!}`);

        switch (url.pathname) {
            case this._config.endpoints!.deviceCode:
                this.processDeviceCodeRequest(url, request, response);
                break;
            case this._config.endpoints!.verification:
                this.processVerificationRequest(url, request, response);
                break;
            case this._config.endpoints!.redirect:
                this.processRedirectRequest(url, request, response);
                break;
            case this._config.endpoints!.token:
                this.processTokenRequest(url, request, response);
                break;
        }
    }

    public destory(): void {
        this._storage.destory();
    }
}
