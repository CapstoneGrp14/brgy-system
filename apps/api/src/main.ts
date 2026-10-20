import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { assertSecrets } from './common/assert-secrets';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';

async function bootstrap() {
  // Before anything else: a production boot with default signing secrets would
  // issue forgeable tokens, so refuse to start rather than fail silently.
  assertSecrets();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // deploy/nginx sets X-Forwarded-For. Without trusting it, every request looks
  // like it came from the proxy and the whole barangay shares one rate-limit
  // bucket — one busy resident would lock everyone out. 1 = trust a single hop.
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });
  app.use(cookieParser());

  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  app.useWebSocketAdapter(redisAdapter);

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port}/api/v1`);
}

bootstrap();
