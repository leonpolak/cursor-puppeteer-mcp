#!/usr/bin/env node

import {
  startServer,
  stopServer,
  takeScreenshot,
  deleteScreenshot,
} from "./cursor-client.js";

/**
 * Main function to handle Cursor integration
 *
 * This script is designed to be called by Cursor with arguments:
 * - url: The local development server URL
 * - [options]: JSON string of options
 */
async function main() {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.error("Usage: node cursor-integration.js <url> [options]");
      process.exit(1);
    }

    const url = args[0];
    const options = args[1] ? JSON.parse(args[1]) : {};

    // Start the server
    startServer();

    // Allow time for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Take screenshot
    const result = await takeScreenshot(url, options);

    // Output the result in a format Cursor can parse
    console.log(JSON.stringify(result));

    // Stop server
    stopServer();

    // Success
    process.exit(0);
  } catch (error) {
    // Output error in a format Cursor can parse
    console.error(JSON.stringify({ error: error.message }));

    // Stop server if it's running
    stopServer();

    // Error
    process.exit(1);
  }
}

// Run the main function
main();
