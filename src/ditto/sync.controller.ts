import { Controller, Post, Body, Logger } from '@nestjs/common';
import { DittoService } from './services/ditto.service';

interface SyncQueryRequest {
  query: string;
}

interface SyncQueryResponse {
  success: boolean;
  data?: any;
  error?: string;
  query: string;
}

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly dittoService: DittoService) {}

  @Post('execute-query')
  async executeQuery(@Body() request: SyncQueryRequest): Promise<SyncQueryResponse> {
    try {
      this.logger.log(`Executing query: ${request.query}`);
      
      // Execute the query using Ditto store
      const result = await this.dittoService.getDitto().store.execute(request.query);
      
      this.logger.log(`Query executed successfully`);
      
      return {
        success: true,
        data: result.items.map(item => item.value),
        query: request.query
      };
    } catch (error) {
      this.logger.error(`Failed to execute query:`, error);
      
      return {
        success: false,
        error: error.message,
        query: request.query
      };
    }
  }
} 