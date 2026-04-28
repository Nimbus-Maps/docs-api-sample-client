#!/usr/bin/env node
/**
 * Session cleanup script
 * Removes expired session files from .sessions directory
 * Run this periodically via cron or similar scheduler
 */

import { cleanupExpiredSessions } from '../lib/session-store';

async function main() {
  console.log('Starting session cleanup...');
  try {
    await cleanupExpiredSessions();
    console.log('✓ Session cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Session cleanup failed:', error);
    process.exit(1);
  }
}

main();
