import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CameraService } from '../camera/camera.service';
import { KioskService } from '../kiosk/kiosk.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', process.env.KIOSK_FRONTEND_URL].filter(Boolean),
    credentials: true,
  },
})
export class PhotoboothGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PhotoboothGateway.name);

  constructor(
    private readonly cameraService: CameraService,
    private readonly kioskService: KioskService,
  ) {}

  async handleConnection(client: Socket) {
    const apiKey =
      (client.handshake.auth?.apiKey as string) ||
      (client.handshake.query?.apiKey as string);

    const valid = await this.kioskService.validateApiKey(apiKey);
    if (!valid) {
      this.logger.warn(`Rejected WebSocket connection: invalid API key (${client.id})`);
      client.disconnect(true);
      return;
    }

    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('trigger_capture')
  async handleTriggerCapture(client: Socket, data?: { duration?: number }) {
    try {
      const duration = data?.duration;
      this.logger.log(`Capture triggered by client: ${client.id} (duration: ${duration}s)`);
      client.emit('capture_status', { status: 'capturing' });

      const result = await this.cameraService.capturePhoto(duration);

      client.emit('capture_status', { status: 'success', data: result });
    } catch (error) {
      client.emit('capture_status', { status: 'error', message: error.message });
    }
  }
}
