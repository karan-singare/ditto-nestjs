import { Module } from '@nestjs/common';
import { DittoService } from './ditto.service';

@Module({
  providers: [DittoService],
  exports: [DittoService],
})
export class DittoModule {} 