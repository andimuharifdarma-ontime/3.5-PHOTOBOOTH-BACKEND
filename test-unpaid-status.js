const crypto = require('crypto');

function generateDokuSignature(config, requestId, timestamp, targetPath, body = null) {
    let signaturePayload =
        `Client-Id:${config.clientId}\n` +
        `Request-Id:${requestId}\n` +
        `Request-Timestamp:${timestamp}\n` +
        `Request-Target:${targetPath}`;

    if (body) {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
        signaturePayload += `\nDigest:${digest}`;
    }

    const signature = crypto
        .createHmac('sha256', config.secretKey)
        .update(signaturePayload)
        .digest('base64');

    return `HMACSHA256=${signature}`;
}

async function runTest() {
    const clientId = 'BRN-0217-1766629097371';
    const secretKey = 'SK-M88Vq4INioEbf2CEmB7F';
    const config = { clientId, secretKey };
    
    // 1. Create a checkout session
    const invoiceNumber = 'test-inv-' + crypto.randomBytes(4).toString('hex');
    const dokuBody = {
        order: {
            amount: 16000,
            invoice_number: invoiceNumber,
            currency: 'IDR',
            callback_url: 'http://localhost:3000/payment-success',
            failed_url: 'http://localhost:3000/failed',
            line_items: [{ name: 'Test Print', price: 16000, quantity: 1 }]
        },
        payment: {
            payment_due_date: 60,
            payment_method_types: ['QRIS']
        },
        customer: {
            id: 'test-cust',
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '081234567890'
        }
    };
    
    const reqIdCreate = crypto.randomUUID();
    const timestampCreate = new Date().toISOString().split('.')[0] + 'Z';
    const pathCreate = '/checkout/v1/payment';
    
    const sigCreate = generateDokuSignature(config, reqIdCreate, timestampCreate, pathCreate, dokuBody);
    
    console.log('1. Creating checkout session with invoice:', invoiceNumber);
    const resCreate = await fetch('https://api-sandbox.doku.com' + pathCreate, {
        method: 'POST',
        headers: {
            'Client-Id': clientId,
            'Request-Id': reqIdCreate,
            'Request-Timestamp': timestampCreate,
            'Signature': sigCreate,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dokuBody)
    });
    
    const dataCreate = await resCreate.json();
    console.log('Session creation response:', JSON.stringify(dataCreate));
    
    if (!resCreate.ok) {
        console.log('Session creation failed!');
        return;
    }
    
    // 2. Query status immediately (before user scans/pays)
    const reqIdQuery = crypto.randomUUID();
    const timestampQuery = new Date().toISOString().split('.')[0] + 'Z';
    const pathQuery = `/orders/v1/status/${invoiceNumber}`;
    
    const sigQuery = generateDokuSignature(config, reqIdQuery, timestampQuery, pathQuery);
    
    console.log('\n2. Querying status immediately for invoice:', invoiceNumber);
    const resQuery = await fetch('https://api-sandbox.doku.com' + pathQuery, {
        headers: {
            'Client-Id': clientId,
            'Request-Id': reqIdQuery,
            'Request-Timestamp': timestampQuery,
            'Signature': sigQuery
        }
    });
    
    console.log('HTTP Status code:', resQuery.status);
    const dataQuery = await resQuery.json();
    console.log('Query response:', JSON.stringify(dataQuery));
}

runTest();
