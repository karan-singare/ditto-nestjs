import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DittoModule } from './ditto/ditto.module';

@Module({
  imports: [DittoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
