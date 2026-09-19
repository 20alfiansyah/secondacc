import { join } from 'path';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

/**
 * Menyajikan folder backend/uploads secara statis pada path /uploads
 * (kontrak imageUrl: /uploads/products/<uuid>.<ext> — docs/6 §6.2).
 * Modul terpisah agar Wave 2 cukup mendaftarkan UploadsModule di app.module.ts.
 */
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
})
export class UploadsModule {}
