import { Module } from '@nestjs/common';
import { DittoService, SubscriptionsService } from './services';
import { SyncController } from './sync.controller';

@Module({
  controllers: [SyncController],
  providers: [DittoService, SubscriptionsService],
  exports: [DittoService, SubscriptionsService],
})
export class DittoModule {} 