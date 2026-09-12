import { z } from 'zod';

/**
 * Skema environment backend. Divalidasi saat bootstrap (ConfigModule.validate)
 * supaya app gagal cepat dengan pesan jelas, bukan error samar di tengah jalan.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'wajib diisi'),
  // Minimal 16 karakter agar brute-force signature/JWT tidak trivial.
  JWT_SECRET: z.string().min(16, 'minimal 16 karakter'),
  // Origin frontend yang boleh memanggil API (dipisah koma untuk beberapa).
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variabel environment tidak valid:\n${details}`);
  }
  return result.data;
}
