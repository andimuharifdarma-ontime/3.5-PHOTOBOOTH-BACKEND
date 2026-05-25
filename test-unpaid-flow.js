const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function testUnpaidFlow() {
    console.log('1. Fetching first adminUser to assign...');
    const admin = await prisma.adminUser.findFirst();
    if (!admin) {
        console.log('No admin user found!');
        return;
    }
    
    // Create checkout session on Doku first
    const clientId = 'BRN-0217-1766629097371';
    const secretKey = 'SK-M88Vq4INioEbf2CEmB7F';
    const config = { clientId, secretKey };
    
    const orderId = crypto.randomUUID();
    const invoiceNumber = orderId;
    
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

    const reqIdCreate = crypto.randomUUID();
    const timestampCreate = new Date().toISOString().split('.')[0] + 'Z';
    const pathCreate = '/checkout/v1/payment';
    const sigCreate = generateDokuSignature(config, reqIdCreate, timestampCreate, pathCreate, dokuBody);
    
    console.log('2. Creating session in DOKU with orderId:', orderId);
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
    
    if (!resCreate.ok) {
        console.log('Failed to create DOKU session:', resCreate.status, await resCreate.text());
        return;
    }
    const createData = await resCreate.json();
    const paymentUrl = createData.response?.payment?.url;
    console.log('Payment URL:', paymentUrl);

    console.log('3. Inserting order into DB with status pending...');
    const newOrder = await prisma.printOrder.create({
        data: {
            id: orderId,
            userName: 'Test Poll User',
            adminUserId: admin.id,
            frameId: '1649ec39-5d95-400a-9ff0-8aca474e3f69',
            frameName: 'Boarding PASS 1',
            quantity: 1,
            pricePerFrame: 16000,
            totalPrice: 16000,
            imageUrl: '',
            paymentUrl: paymentUrl,
            paymentStatus: 'pending'
        }
    });
    console.log('Inserted order ID:', newOrder.id);
    
    console.log('4. Calling status API on localhost:3003...');
    const resStatus = await fetch(`http://localhost:3003/api/payment/status/${orderId}`);
    const statusData = await resStatus.json();
    console.log('Status API Response:', JSON.stringify(statusData, null, 2));
    
    console.log('5. Querying database row directly...');
    const dbOrder = await prisma.printOrder.findUnique({ where: { id: orderId } });
    console.log('DB Order paymentStatus:', dbOrder.paymentStatus);
    
    await prisma.$disconnect();
}

testUnpaidFlow();
