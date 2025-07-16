import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DittoService } from '../ditto/services';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

@Injectable()
export class HttpApiService {
  private readonly dittoHttpApiUrl: string;

  constructor(private readonly dittoService: DittoService) {
    // Get the Ditto HTTP API URL from environment variables
    this.dittoHttpApiUrl = (process.env.DITTO_CLOUD_URL || 'http://localhost:8080') + '/api/v5';
  }

  /**
   * Generic method to forward requests to Ditto HTTP API
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param endpoint - The API endpoint path
   * @param params - Query parameters
   * @param body - Request body (for POST, PUT, PATCH)
   * @param headers - Additional headers
   * @returns Promise with the API response
   */
  async forwardRequest(
    method: string,
    endpoint: string,
    params?: Record<string, any>,
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    try {
      // Ensure Ditto is connected
      if (!this.dittoService.isConnected()) {
        throw new HttpException('Ditto is not connected', HttpStatus.SERVICE_UNAVAILABLE);
      }

      // Build the full URL
      const url = `${this.dittoHttpApiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      // Prepare axios config
      const config: AxiosRequestConfig = {
        method: method.toUpperCase(),
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${process.env.DITTO_API_KEY}`,
          ...headers,
        },
      };

      // Add query parameters
      if (params && Object.keys(params).length > 0) {
        config.params = params;
      }

      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = body;
      }

      const response: AxiosResponse = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Error forwarding request to Ditto HTTP API:', error);

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new HttpException(
          {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            message: `Ditto HTTP API error: ${error.response.status} ${error.response.statusText}`,
          },
          error.response.status
        );
      } else if (error.request) {
        // The request was made but no response was received
        throw new HttpException(
          {
            message: 'No response received from Ditto HTTP API',
            error: error.message,
          },
          HttpStatus.GATEWAY_TIMEOUT
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new HttpException(
          {
            message: 'Error setting up request to Ditto HTTP API',
            error: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Get document count for a collection with optional query parameters
   * @param query - Query string for filtering (e.g., "status=active&type=user")
   * @param collection - Name of the collection
   * @returns Promise with document count
   */
  async getDocumentCounts(query: string, collection: string): Promise<any> {
    const payload = {
      query,
      collection,
    };
    return this.forwardRequest('POST', `/store/count`, {}, payload);
  }
} 