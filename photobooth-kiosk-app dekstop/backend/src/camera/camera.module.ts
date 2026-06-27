import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CameraService } from './camera.service';

@Module({
  imports: [HttpModule],
  providers: [CameraService],
  exports: [CameraService],
})
export class CameraModule {}
