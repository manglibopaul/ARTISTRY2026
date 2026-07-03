import dotenv from 'dotenv';
import { del, list } from '@vercel/blob';
import { connectDB, sequelize } from '../config/database.js';
import Product from '../models/Product.js';
import { isVercelBlobUrl } from '../utils/media.js';

dotenv.config();

const MODELS_PREFIX = 'artistry/models/';
const APPLY_CHANGES = process.argv.includes('--apply');

const collectReferencedModelUrls = async () => {
  const products = await Product.findAll({
    attributes: ['modelUrl', 'iosModel'],
    raw: true,
  });

  const referenced = new Set();
  for (const product of products) {
    if (isVercelBlobUrl(product.modelUrl)) {
      referenced.add(product.modelUrl);
    }
    if (isVercelBlobUrl(product.iosModel)) {
      referenced.add(product.iosModel);
    }
  }

  return referenced;
};

const listAllModelBlobs = async () => {
  const blobs = [];
  let cursor;

  while (true) {
    const page = await list({
      prefix: MODELS_PREFIX,
      cursor,
      limit: 1000,
    });

    if (Array.isArray(page?.blobs) && page.blobs.length > 0) {
      blobs.push(...page.blobs);
    }

    const nextCursor = page?.cursor;
    if (!nextCursor || nextCursor === cursor) {
      break;
    }

    cursor = nextCursor;
  }

  return blobs;
};

const cleanupOrphanedModelBlobs = async () => {
  try {
    await connectDB();

    const referencedUrls = await collectReferencedModelUrls();
    const blobs = await listAllModelBlobs();
    const orphaned = blobs.filter((blob) => !referencedUrls.has(blob.url));

    console.log(`Referenced model URLs in DB: ${referencedUrls.size}`);
    console.log(`Model blobs found in store: ${blobs.length}`);
    console.log(`Orphaned model blobs: ${orphaned.length}`);

    if (orphaned.length === 0) {
      console.log('No orphaned model blobs found.');
      return;
    }

    if (!APPLY_CHANGES) {
      console.log('Dry run mode. No files were deleted.');
      console.log('Use --apply to delete orphaned blobs.');
      orphaned.slice(0, 30).forEach((blob) => {
        console.log(`- ${blob.url}`);
      });
      if (orphaned.length > 30) {
        console.log(`...and ${orphaned.length - 30} more`);
      }
      return;
    }

    let deleted = 0;
    let failed = 0;

    for (const blob of orphaned) {
      try {
        await del(blob.url);
        deleted += 1;
      } catch (err) {
        failed += 1;
        console.error(`Failed to delete ${blob.url}:`, err.message);
      }
    }

    console.log(`Deleted: ${deleted}`);
    console.log(`Failed: ${failed}`);
  } catch (err) {
    console.error('Blob cleanup failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

cleanupOrphanedModelBlobs();
