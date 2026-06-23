import type { UniBlockDoc } from '@/lib/universinid/content-types';
declare global {
  namespace PrismaJson {
    type BlockDoc = UniBlockDoc;
  }
}
export {};
