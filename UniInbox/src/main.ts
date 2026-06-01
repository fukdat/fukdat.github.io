import { createApp } from './composition';
import { buildServer } from './http/server';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = buildServer(app.service);

  // Background CRM-sync worker (replaced by a BullMQ worker in production).
  const worker = setInterval(() => {
    void app.drainQueue();
  }, 1000);

  const close = async (): Promise<void> => {
    clearInterval(worker);
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void close());
  process.on('SIGTERM', () => void close());

  const port = Number(process.env.PORT ?? 3000);
  await server.listen({ port, host: '0.0.0.0' });
}

void bootstrap();
