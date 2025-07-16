import { Module } from '@nestjs/common';
import { HttpApiService } from './http-api.service';
import { HttpApiController } from './http-api.controller';
import { DittoModule } from '../ditto/ditto.module';

@Module({
  imports: [DittoModule],
  controllers: [HttpApiController],
  providers: [HttpApiService],
  exports: [HttpApiService],
})
export class HttpApiModule {} 