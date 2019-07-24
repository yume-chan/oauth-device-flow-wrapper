import { createServer } from 'http';
import { URL, URLSearchParams } from 'url';
import { createReadStream } from 'fs';
import path from 'path';

import fetch from 'node-fetch';

import OauthDeviceFlowWrapper, {
    OauthDeviceFlowMemoryStorage,
    OauthDeviceFlowWrapperState,
    OauthDeviceFlowServerConfig,
} from '..';

const storage = new OauthDeviceFlowMemoryStorage<OauthDeviceFlowWrapperState>();
const config: OauthDeviceFlowServerConfig = {
    webScriptPath: '/bundle.js',
};
const wrapper = new OauthDeviceFlowWrapper(config, storage);
const server = createServer((request, response) => {
    if (!request.url!.startsWith('/')) {
        response.writeHead(400, 'Bad Request').end();
        return;
    }

    const url = new URL(`http://${request.headers.host}${request.url!}`);

    if (url.pathname === '/bundle.js') {
        response.writeHead(200, 'OK', { 'Content-Type': 'text/javascript' });
        createReadStream(path.resolve(__dirname, '..', 'lib', 'page-bundle.js')).pipe(response);
    } else {
        wrapper.processRequest(request, response);
    }
});
server.listen(3000, async () => {
    let response = await fetch('http://localhost:3000/devicecode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'client_id': process.env.MICROSOFT_APP_CLIENT_ID,
            'scope': ['offline_access', 'openid', 'profile', 'Calendars.ReadWrite'].join(' '),
            'client_name': process.env.MICROSOFT_APP_NAME,
            'service_name': 'Microsoft',
            'authroize_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            'authroize_parameters': JSON.stringify({}),
            'token_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            'token_parameters': JSON.stringify({
                'client_secret': process.env.MICROSOFT_APP_CLIENT_SECRET,
            }),
        }).toString(),
    });
    const {
        device_code: deviceCode,
        verification_uri_complete: verificationUriComplete,
        interval,
    } = await response.json();

    console.log(`please open in browser: ${verificationUriComplete}`);

    while (true) {
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));

        response = await fetch('http://localhost:3000/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:device_code',
                'device_code': deviceCode,
            }).toString(),
        });

        if (response.status === 200) {
            const result = await response.text();

            console.log(`success, response: ${result}`);
            break;
        } else {
            const result = await response.json();
            console.log(`error: ${JSON.stringify(result)}`);

            if (result.error !== 'authorization_pending') {
                break;
            }
        }
    }
});
