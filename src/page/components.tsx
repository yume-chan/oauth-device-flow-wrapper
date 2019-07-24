import React from 'react';

export interface PageProps {
    clientName: string;

    userCode: string;

    serviceName: string;

    serviceDomain: string;

    authroizeUrl: string;
}

function HaveCode(props: PageProps) {
    const handleOkClick = React.useCallback(() => {
        location.href = props.authroizeUrl;
    }, []);

    return (
        <div>
            <div>{props.clientName} is requesting access to your {props.serviceName} account.</div>
            <div>Please double check the code below matchs what {props.clientName} provided you:</div>
            <div>{props.userCode}</div>
            <div>If not, close the page now.</div>

            <div>By clicking 'Yes', you will be redirected to {props.serviceName}'s website to login.</div>
            <div>Please make sure the next page's url starts with "{props.serviceDomain}".</div>
            <div><button onClick={handleOkClick}>Yes</button></div>
        </div>
    );
}

function InvalidCode() {
    return (
        <div>
            This code is invalid, eithor wrong or has expired.
        </div>
    );
}

function NoCode() {
    const [code, setCode] = React.useState<string>('');
    const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCode(e.target.value);
    }, []);

    const handleOkClick = React.useCallback(() => {
        window.location.search = `code=${code}`;
    }, [code]);

    return (
        <div>
            <div>Some device/program is requesting access to your account.</div>
            <div>Enter the code the device/program provided you below and click "OK" to continue.</div>
            <div><input value={code} onChange={handleInputChange} /></div>

            <div><button onClick={handleOkClick}>OK</button></div>
        </div>
    );
}

export function Page(props: Partial<PageProps>) {
    if (props.userCode) {
        if (props.clientName) {
            return <HaveCode {...props as PageProps} />;
        } else {
            return <InvalidCode />;
        }
    } else {
        return <NoCode />;
    }
}
