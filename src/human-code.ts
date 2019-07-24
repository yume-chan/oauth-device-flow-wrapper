function generateHumanReadableCharacterSet(): string[] {
    // take from https://ux.stackexchange.com/questions/21076/are-there-numbers-and-letters-to-avoid-for-activation-codes-via-sms
    const blacklist = 'B8G6I1l0OQDS5Z2';

    const ranges = [
        ['a', 'z'],
        ['A', 'Z'],
        ['0', '9'],
    ];

    let result: string[] = [];

    for (const pair of ranges) {
        const [start, end] = pair.map(x => x.charCodeAt(0));
        for (let i = start; i < end; i++) {
            const char = String.fromCharCode(i);
            if (!blacklist.includes(char)) {
                result.push(char);
            }
        }
    }

    return result;
}

const characterSet = generateHumanReadableCharacterSet();

export function humanCode(length: number): string {
    let result: string = '';
    for (let i = 0; i < length; i++) {
        result += characterSet[Math.floor(Math.random() * characterSet.length)];
    }
    return result;
}
