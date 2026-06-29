import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CameraModule } from './camera/camera.module';
import { PhotoboothGateway } from './photobooth/photobooth.gateway';
import { PrismaModule } from './prisma/prisma.module';
import { KioskModule } from './kiosk/kiosk.module';

@Module({
  imports: [CameraModule, PrismaModule, KioskModule],
  controllers: [AppController],
  providers: [AppService, PhotoboothGateway],
})
export class AppModule {}
