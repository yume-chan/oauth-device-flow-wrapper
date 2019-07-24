export interface OauthDeviceFlowState {
    deviceCode: string;

    userCode: string;

    clientId: string;

    scope: string | undefined;

    expireAt: number;

    responseStatus?: number;

    responseStatusText?: string;

    responseText?: string;
}

export interface OauthDeviceFlowWrapperState extends OauthDeviceFlowState {
    clientName: string;

    serviceName: string;

    authroizeUrl: string;

    authroizeParameters: string;

    tokenUrl: string;

    tokenParameters: string;
}
