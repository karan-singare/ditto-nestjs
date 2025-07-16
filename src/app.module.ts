import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DittoModule } from './ditto/ditto.module';
import { HttpApiModule } from './http-api/http-api.module';
import { SyncModule } from './ditto/sync.module';

@Module({
  imports: [DittoModule, HttpApiModule, SyncModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
