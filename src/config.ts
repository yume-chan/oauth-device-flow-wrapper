export interface OauthDeviceFlowEndpoints {
    deviceCode?: string;

    verification?: string;

    redirect?: string;

    token?: string;
}

export interface OauthDeviceFlowServerConfig {
    endpoints?: OauthDeviceFlowEndpoints;

    deviceCodeExpireIn?: number;

    pollingInterval?: number;

    webScriptPath: string;
}
