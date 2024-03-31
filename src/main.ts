import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { port } from '../adp.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
}
bootstrap();
