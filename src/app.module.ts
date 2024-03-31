import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeployController } from './deploy/deploy.controller';
import { DeployService } from './deploy/deploy.service';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './exception/exception.http';

@Module({
  imports: [],
  controllers: [AppController, DeployController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
    DeployService,
  ],
})
export class AppModule {}
