import { Module } from '@nestjs/common';
import { SyncService } from './services/sync.service';
import { DittoModule } from './ditto.module';
import { HttpApiModule } from '../http-api/http-api.module';

@Module({
  imports: [DittoModule, HttpApiModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {} 