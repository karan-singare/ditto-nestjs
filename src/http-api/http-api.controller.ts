import { Controller, Get, Param, Query } from '@nestjs/common';
import { HttpApiService } from './http-api.service';

@Controller('api/ditto')
export class HttpApiController {
  constructor(private readonly httpApiService: HttpApiService) {}

  /**
   * Get document count for a collection
   * @param collection - Name of the collection
   * @param query - Query parameters as string
   * @returns Document count
   */
  @Get(':collection/count')
  async getDocumentCounts(
    @Param('collection') collection: string,
  ): Promise<any> {
    const query = 'status == 1';
    return await this.httpApiService.getDocumentCounts(query, collection);
  }
} 