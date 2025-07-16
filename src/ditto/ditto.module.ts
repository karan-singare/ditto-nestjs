import { Module } from '@nestjs/common';
import { DittoService } from './ditto.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  providers: [DittoService, SubscriptionsService],
  exports: [DittoService, SubscriptionsService],
})
export class DittoModule {} 