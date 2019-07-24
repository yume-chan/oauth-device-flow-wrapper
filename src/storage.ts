import { OauthDeviceFlowState } from "./state";

export interface OauthDeviceFlowStorage<T extends OauthDeviceFlowState> {
    add(state: T): void;

    remove(state: T): void;

    getStateByDeviceCode(deviceCode: string): T | undefined;

    getStateByUserCode(userCode: string): T | undefined;

    destory(): void;
}

export class OauthDeviceFlowMemoryStorage<T extends OauthDeviceFlowState> implements OauthDeviceFlowStorage<T> {
    private _deviceCodeMap: Map<string, T> = new Map();

    private _userCodeMap: Map<string, T> = new Map();

    private _intervalId: NodeJS.Timer;

    public constructor() {
        this._intervalId = setInterval(this.removeExpiredStates, 60 * 1000);
    }

    public add(state: T): void {
        this._deviceCodeMap.set(state.deviceCode, state);
        this._userCodeMap.set(state.userCode, state);
    }

    public remove(state: T): void {
        this._deviceCodeMap.delete(state.deviceCode);
        this._userCodeMap.delete(state.userCode);
    }

    private removeExpiredStates = () => {
        const now = Date.now();
        for (const state of this._deviceCodeMap.values()) {
            if (state.expireAt < now) {
                this.remove(state);
            }
        }
    }

    public getStateByDeviceCode(deviceCode: string): T | undefined {
        return this._deviceCodeMap.get(deviceCode);
    }

    public getStateByUserCode(userCode: string): T | undefined {
        return this._userCodeMap.get(userCode);
    }

    public destory(): void {
        clearInterval(this._intervalId);
    }
}
