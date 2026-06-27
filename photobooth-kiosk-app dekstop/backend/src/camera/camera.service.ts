import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);
  private readonly pythonApiUrl = 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  async getStatus() {
    try {
      const response = await lastValueFrom(this.httpService.get(`${this.pythonApiUrl}/status`));
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get camera status: ' + error.message);
      throw error;
    }
  }

  async capturePhoto(duration?: number) {
    try {
      const url = duration 
        ? `${this.pythonApiUrl}/capture?duration=${duration}`
        : `${this.pythonApiUrl}/capture`;
      const response = await lastValueFrom(this.httpService.post(url));
      return response.data;
    } catch (error) {
      this.logger.error('Failed to capture photo: ' + error.message);
      throw error;
    }
  }

  async printPhoto(filePath: string) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.pythonApiUrl}/print`, null, { params: { file_path: filePath } })
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to print photo: ' + error.message);
      throw error;
    }
  }
}
