import { z } from 'zod';

export const GSCBaseSchema = z.object({
  siteUrl: z
    .string()
    .describe(
      'The site URL as defined in Search Console. Example: http://www.example.com/ (for site prefix resources) or sc-domain:example.com (for domain resources)',
    ),
});

export const SearchAnalyticsSchema = GSCBaseSchema.extend({
  startDate: z.string().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().describe('End date in YYYY-MM-DD format'),
  dimensions: z
    .string()
    .transform((val) => val.split(','))
    .refine((val) =>
      val.every((d) => ['query', 'page', 'country', 'device', 'searchAppearance'].includes(d)),
    )
    .optional()
    .describe(
      'Comma-separated list of dimensions to break down results by, such as query, page, country, device, searchAppearance',
    ),
  type: z
    .enum(['web', 'image', 'video', 'news'])
    .optional()
    .describe('Type of search to filter by, such as web, image, video, news'),
  aggregationType: z
    .enum(['auto', 'byNewsShowcasePanel', 'byProperty', 'byPage'])
    .optional()
    .describe('Type of aggregation, such as auto, byNewsShowcasePanel, byProperty, byPage'),
  rowLimit: z.number().default(1000).describe('Maximum number of rows to return'),
});

export type SearchAnalytics = z.infer<typeof SearchAnalyticsSchema>;
