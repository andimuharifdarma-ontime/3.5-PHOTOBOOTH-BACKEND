import * as crypto from 'crypto';

interface DokuConfig {
    clientId: string;
    secretKey: string;
}

export function generateDokuSignature(
    config: DokuConfig,
    requestId: string,
    timestamp: string,
    targetPath: string,
    body?: any
): string {
    let signaturePayload =
        `Client-Id:${config.clientId}\n` +
        `Request-Id:${requestId}\n` +
        `Request-Timestamp:${timestamp}\n` +
        `Request-Target:${targetPath}`;

    if (body) {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        const digest = crypto
            .createHash('sha256')
            .update(bodyString, 'utf8')
            .digest('base64');
        signaturePayload += `\nDigest:${digest}`;
    }

    // 3. Create Signature using HMAC-SHA256
    const signature = crypto
        .createHmac('sha256', config.secretKey)
        .update(signaturePayload)
        .digest('base64');

    return `HMACSHA256=${signature}`;
}

export function generateDigest(body: any): string {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto
        .createHash('sha256')
        .update(bodyString, 'utf8')
        .digest('base64');
}

/** Reject DOKU webhook timestamps outside the allowed skew window. */
export function isDokuTimestampFresh(
    timestamp: string,
    maxSkewSeconds = 300,
): boolean {
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) return false;
    const skewMs = Math.abs(Date.now() - parsed);
    return skewMs <= maxSkewSeconds * 1000;
}
