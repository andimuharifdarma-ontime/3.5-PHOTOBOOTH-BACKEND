import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KioskService } from './kiosk.service';

@Controller('kiosk')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Get('settings')
  async getSettings(@Query('apiKey') apiKey: string) {
    return this.kioskService.getSettings(apiKey);
  }

  @Post('verify-password')
  async verifyPassword(
    @Body() body: { apiKey: string; password?: string }
  ) {
    const isValid = await this.kioskService.verifyPassword(body.apiKey, body.password);
    return { isValid };
  }

  @Get('themes')
  async getThemes(@Query('apiKey') apiKey: string) {
    return this.kioskService.getThemes(apiKey);
  }

  @Post('orders')
  async createOrder(
    @Body()
    body: {
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
    },
  ) {
    return this.kioskService.createOrder(body);
  }

  @Post('payment/checkout')
  async createPaymentCheckout(
    @Body()
    body: {
      apiKey?: string;
      userName: string;
      customerEmail: string;
      customerPhone: string;
      frameId: string;
      frameName?: string;
      quantity: number;
    },
  ) {
    return this.kioskService.createPaymentCheckout(body);
  }

  @Get('payment/status/:orderId')
  async getPaymentStatus(
    @Param('orderId') orderId: string,
    @Query('apiKey') apiKey: string,
  ) {
    return this.kioskService.getPaymentStatus(apiKey, orderId);
  }

  @Post('upload-final')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFinalAsset(
    @Query('id') id: string,
    @Query('apiKey') apiKey: string,
    @UploadedFile() file: any,
  ) {
    if (!id) {
      throw new BadRequestException('Query parameter "id" is required.');
    }
    if (!apiKey) {
      throw new BadRequestException('Query parameter "apiKey" is required.');
    }
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    return this.kioskService.uploadFinalAsset(apiKey, id, file.buffer, file.mimetype);
  }
}
