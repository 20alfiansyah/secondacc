import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'cafe-pos-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
