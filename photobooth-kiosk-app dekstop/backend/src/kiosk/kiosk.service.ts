import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { generateDokuSignature, generateDigest } from '../lib/doku';
import { resolveUserByApiKey } from '../lib/api-key';

@Injectable()
export class KioskService {
  private readonly logger = new Logger(KioskService.name);
  private supabase: any;
  private readonly bucketName = 'photobooth-images';

  constructor(private readonly prisma: PrismaService) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      this.logger.warn('Supabase credentials are missing from environment variables!');
    }
  }

  /**
   * Resolve admin user by API key. No fallback — invalid/missing key is rejected.
   */
  private async getAdminUserByApiKey(apiKey?: string) {
    if (!apiKey?.trim()) {
      throw new UnauthorizedException('API key is required');
    }

    const user = await resolveUserByApiKey(this.prisma, apiKey);
    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    return user;
  }

  async verifyPassword(apiKey: string, password?: string): Promise<boolean> {
    if (!password) return false;
    const adminUser = await this.getAdminUserByApiKey(apiKey);
    if (!adminUser.password) return false;
    return bcrypt.compare(password, adminUser.password);
  }

  async getSettings(apiKey?: string) {
    const adminUser = await this.getAdminUserByApiKey(apiKey);

    let settings = await this.prisma.systemSetting.findUnique({
      where: { adminUserId: adminUser.id },
    });

    if (!settings) {
      settings = await this.prisma.systemSetting.create({
        data: {
          adminUserId: adminUser.id,
          isPaymentEnabled: adminUser.isPaymentEnabled,
          isFrameSelectionEnabled: true,
          isPhotoSessionEnabled: true,
          isPhotoSelectionEnabled: true,
          isPhotoFilterEnabled: true,
          isPhotoFilterTimerEnabled: true,
          isResultEnabled: true,
          frameSelectionTimer: 5,
          photoSessionTimer: 3,
          photoSelectionTimer: 3,
          photoFilterTimer: 3,
          captureTimer: 5,
          maxCapturePhotos: 8,
          resultTimer: 60,
          isFrameSelectionTimerEnabled: true,
          isPhotoSessionTimerEnabled: true,
          isPhotoSelectionTimerEnabled: true,
          isResultTimerEnabled: true,
          kioskThemePreset: 'default',
          kioskAccentColor: null,
          kioskBgGradientStart: null,
          kioskBgGradientEnd: null,
          kioskBrandName: null,
          kioskWelcomeMessage: null,
          kioskFontFamily: null,
          kioskLogoUrl: null,
          kioskTextColor: null,
          kioskBgImageUrl: null,
          kioskBgImageOpacity: 1.0,
          kioskShowBgDots: true,
          kioskShowBrandName: true,
          kioskShowBrandSubtitle: false,
          kioskBrandSubtitle: null,
          kioskShowLogo: true,
          kioskShowWelcomeMessage: true,
          kioskShowPaymentHint: true,
        } as any,
      });
    }

    const responseSettings = { ...settings };
    responseSettings.isPaymentEnabled = adminUser.isPaymentEnabled;
    return responseSettings;
  }

  async getThemes(apiKey?: string) {
    const adminUser = await this.getAdminUserByApiKey(apiKey);
    const ownerName = (adminUser.name || adminUser.email || '').toLowerCase();

    return this.prisma.frameTheme.findMany({
      where: {
        isActive: true,
        userName: {
          equals: ownerName,
          mode: 'insensitive',
        },
      },
      orderBy: { order: 'asc' },
      include: {
        frames: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async createOrder(data: {
    apiKey?: string;
    userName: string;
    customerEmail?: string;
    customerPhone?: string;
    frameId: string;
    frameName: string;
    quantity: number;
    pricePerFrame: number;
    totalPrice: number;
    imageUrl: string;
    paymentStatus?: string;
  }) {
    const adminUser = await this.getAdminUserByApiKey(data.apiKey);

    const paymentStatus = data.paymentStatus || 'paid';
    if (adminUser.isPaymentEnabled && paymentStatus === 'paid' && data.totalPrice > 0) {
      throw new BadRequestException('Payment must be verified before creating a paid order');
    }

    return this.prisma.printOrder.create({
      data: {
        userName: data.userName || 'Kiosk Guest',
        adminUserId: adminUser.id,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        frameId: data.frameId,
        frameName: data.frameName,
        quantity: data.quantity || 1,
        pricePerFrame: data.pricePerFrame || 0,
        totalPrice: data.totalPrice || 0,
        costPrice: 2500,
        imageUrl: data.imageUrl || '',
        paymentStatus,
        printedAt: new Date(),
      },
    });
  }

  async uploadFinalAsset(apiKey: string | undefined, id: string, fileBuffer: Buffer, mimeType: string) {
    await this.getAdminUserByApiKey(apiKey);

    if (!this.supabase) {
      throw new BadRequestException('Supabase storage client is not configured.');
    }

    if (!/^[a-zA-Z0-9_-]{4,128}$/.test(id)) {
      throw new BadRequestException('Invalid asset ID');
    }

    const allowedMimes = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm', 'application/json'];
    if (!allowedMimes.includes(mimeType)) {
      throw new BadRequestException('Unsupported file type');
    }

    if (fileBuffer.length > 50 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 50MB limit');
    }

    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('json')) ext = 'json';

    const storagePath = `images/${id}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Supabase Storage upload error for path ${storagePath}: ${error.message}`);
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(storagePath);

    if (mimeType.startsWith('video/') || mimeType === 'image/gif') {
      this.scheduleVideoNormalization(id, apiKey);
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
    };
  }

  private getAdminBaseUrl(): string {
    return (process.env.ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL || '').replace(/\/$/, '');
  }

  private scheduleVideoNormalization(id: string, apiKey?: string) {
    if (!id.endsWith('-bonus') && !id.endsWith('-live')) return;

    const baseUrl = this.getAdminBaseUrl();
    if (!baseUrl || !apiKey?.trim()) {
      this.logger.warn(`Skipping normalize-video for ${id}: ADMIN_URL or apiKey missing`);
      return;
    }

    void fetch(`${baseUrl}/api/normalize-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey.trim(),
      },
      body: JSON.stringify({ id }),
    }).catch((error) => {
      this.logger.warn(`normalize-video request failed for ${id}: ${error}`);
    });
  }

  async validateApiKey(apiKey?: string): Promise<boolean> {
    try {
      await this.getAdminUserByApiKey(apiKey);
      return true;
    } catch {
      return false;
    }
  }

  async createPaymentCheckout(data: {
    apiKey?: string;
    userName: string;
    customerEmail: string;
    customerPhone: string;
    frameId: string;
    frameName?: string;
    quantity: number;
  }) {
    const adminUser = await this.getAdminUserByApiKey(data.apiKey);

    if (!data.userName?.trim()) {
      throw new BadRequestException('Nama pengguna wajib diisi');
    }
    if (!data.customerEmail?.includes('@')) {
      throw new BadRequestException('Format email tidak valid');
    }
    if (!data.customerPhone || data.customerPhone.replace(/\D/g, '').length < 10) {
      throw new BadRequestException('Nomor telepon minimal 10 digit');
    }
    if (!data.frameId) {
      throw new BadRequestException('Frame ID wajib diisi');
    }

    const frame = await this.prisma.frame.findUnique({
      where: { id: data.frameId },
      include: { theme: true },
    });

    if (!frame) {
      throw new BadRequestException('Frame not found');
    }

    const pricePerFrame = (frame.theme as { price?: number } | null)?.price || 5000;
    const frameName = frame.name || data.frameName || 'Photo Print';
    const quantity = Math.min(20, Math.max(1, data.quantity || 1));
    const totalPrice = quantity * pricePerFrame;
    const isPaymentEnabled = adminUser.isPaymentEnabled;

    const newOrder = await this.prisma.printOrder.create({
      data: {
        userName: data.userName.trim(),
        customerEmail: data.customerEmail.trim(),
        customerPhone: data.customerPhone.trim(),
        frameId: data.frameId,
        frameName,
        quantity,
        pricePerFrame,
        totalPrice,
        imageUrl: '',
        paymentStatus: isPaymentEnabled ? 'pending' : 'paid',
        adminUserId: adminUser.id,
      } as any,
    });

    if (!isPaymentEnabled) {
      return {
        url: `/payment-success?orderId=${newOrder.id}&qty=${quantity}&mode=free`,
        orderId: newOrder.id,
        isFree: true,
        totalPrice,
      };
    }

    const clientId = (process.env.DOKU_CLIENT_ID || '').trim();
    const secretKey = (process.env.DOKU_SECRET_KEY || '').trim();

    if (!clientId || !secretKey) {
      this.logger.error('DOKU_CLIENT_ID or DOKU_SECRET_KEY is missing in kiosk backend .env');
      throw new BadRequestException(
        'Konfigurasi DOKU belum lengkap. Salin DOKU_CLIENT_ID dan DOKU_SECRET_KEY dari backend-admin ke backend/.env',
      );
    }

    const kioskBaseUrl =
      process.env.KIOSK_FRONTEND_URL?.trim() || 'http://localhost:3001';
    const invoiceNumber = newOrder.id;

    const dokuBody = {
      order: {
        amount: totalPrice,
        invoice_number: invoiceNumber,
        currency: 'IDR',
        callback_url: `${kioskBaseUrl}/payment-success?orderId=${newOrder.id}&qty=${quantity}`,
        failed_url: `${kioskBaseUrl}/checkout?orderId=${newOrder.id}&qty=${quantity}&status=failed`,
        return_url: `${kioskBaseUrl}/checkout?orderId=${newOrder.id}&qty=${quantity}&status=back`,
        line_items: [
          {
            name: frameName,
            price: pricePerFrame,
            quantity,
          },
        ],
      },
      payment: {
        payment_due_date: 60,
        payment_method_types: ['QRIS'],
      },
      customer: {
        id: data.userName.replace(/\s+/g, '-').toLowerCase(),
        name: data.userName.trim(),
        email: data.customerEmail.trim(),
        phone: data.customerPhone.trim(),
      },
    };

    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString().split('.')[0] + 'Z';
    const targetPath = '/checkout/v1/payment';
    const dokuConfig = { clientId, secretKey };
    const signature = generateDokuSignature(
      dokuConfig,
      requestId,
      timestamp,
      targetPath,
      dokuBody,
    );
    const digest = generateDigest(dokuBody);
    const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
    const baseUrl = isProduction
      ? 'https://api.doku.com'
      : 'https://api-sandbox.doku.com';

    const response = await fetch(`${baseUrl}${targetPath}`, {
      method: 'POST',
      headers: {
        'Client-Id': clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        Signature: signature,
        Digest: `SHA-256=${digest}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dokuBody),
    });

    const responseData = await response.json();
    const paymentUrl = responseData.response?.payment?.url;

    if (!response.ok || !paymentUrl) {
      this.logger.error(`DOKU checkout failed: ${JSON.stringify(responseData)}`);
      throw new BadRequestException(
        responseData?.message || 'Gagal membuat sesi pembayaran DOKU',
      );
    }

    await this.prisma.printOrder.update({
      where: { id: newOrder.id },
      data: { paymentUrl: paymentUrl as string } as any,
    });

    return {
      url: paymentUrl,
      orderId: newOrder.id,
      isFree: false,
      totalPrice,
    };
  }

  async getPaymentStatus(apiKey: string | undefined, orderId: string) {
    const adminUser = await this.getAdminUserByApiKey(apiKey);

    const order = await this.prisma.printOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.adminUserId && order.adminUserId !== adminUser.id) {
      throw new UnauthorizedException('Forbidden');
    }

    if (order.paymentStatus === 'pending' || order.paymentStatus === 'failed') {
      const clientId = (process.env.DOKU_CLIENT_ID || '').trim();
      const secretKey = (process.env.DOKU_SECRET_KEY || '').trim();

      if (clientId && secretKey) {
        try {
          const requestId = crypto.randomUUID();
          const timestamp = new Date().toISOString().split('.')[0] + 'Z';
          const targetPath = `/orders/v1/status/${orderId}`;
          const signature = generateDokuSignature(
            { clientId, secretKey },
            requestId,
            timestamp,
            targetPath,
          );
          const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
          const baseUrl = isProduction
            ? 'https://api.doku.com'
            : 'https://api-sandbox.doku.com';

          const response = await fetch(`${baseUrl}${targetPath}`, {
            method: 'GET',
            headers: {
              'Client-Id': clientId,
              'Request-Id': requestId,
              'Request-Timestamp': timestamp,
              Signature: signature,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const dokuStatus = data.transaction?.status;

            if (dokuStatus === 'SUCCESS') {
              await this.prisma.printOrder.update({
                where: { id: orderId },
                data: { paymentStatus: 'paid' } as any,
              });
              order.paymentStatus = 'paid';
            } else if (dokuStatus === 'FAILED' || dokuStatus === 'EXPIRED') {
              await this.prisma.printOrder.update({
                where: { id: orderId },
                data: { paymentStatus: 'failed' } as any,
              });
              order.paymentStatus = 'failed';
            }
          }
        } catch (err) {
          this.logger.warn(`DOKU status check failed for ${orderId}: ${err}`);
        }
      }
    }

    return {
      id: order.id,
      paymentStatus: order.paymentStatus,
      userName: order.userName,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      frameName: order.frameName,
    };
  }
}
