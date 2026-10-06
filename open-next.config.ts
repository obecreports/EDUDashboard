import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Minimal OpenNext config (no R2 incremental cache required to deploy)
export default defineCloudflareConfig({});
