#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google, webmasters_v3 } from 'googleapis';
// @ts-ignore
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchAnalyticsSchema } from './schemas.js';
import { z } from 'zod';

const server = new Server(
  {
    name: 'gsc-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  },
);

const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS environment variable is required');
  process.exit(1);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_analytics',
        description: 'Get search performance data from Google Search Console',
        inputSchema: zodToJsonSchema(SearchAnalyticsSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const authClient = await auth.getClient();
    const webmasters = google.webmasters({
      version: 'v3',
      auth: authClient,
    } as webmasters_v3.Options);

    if (!request.params.arguments) {
      throw new Error('Arguments are required');
    }

    switch (request.params.name) {
      case 'search_analytics': {
        const args = SearchAnalyticsSchema.parse(request.params.arguments);
        const response = await webmasters.searchanalytics.query({
          siteUrl: args.siteUrl,
          requestBody: {
            startDate: args.startDate,
            endDate: args.endDate,
            dimensions: args.dimensions,
            searchType: args.type,
            aggregationType: args.aggregationType,
            rowLimit: args.rowLimit,
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Search Console MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
