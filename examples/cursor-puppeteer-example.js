#!/usr/bin/env node

import {
  startServer,
  stopServer,
  takeScreenshot,
  deleteScreenshot,
} from "../src/cursor-client.js";

/**
 * Example usage of the Puppeteer MCP for Cursor
 */
async function runExample() {
  try {
    console.log("Starting Puppeteer MCP server...");
    startServer();

    // Allow time for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Example 1: Take a full page screenshot
    console.log("Taking a full page screenshot...");
    const result1 = await takeScreenshot("http://localhost:3000", {
      waitTime: 1000,
    });
    console.log("Screenshot saved:", result1.screenshotPath);

    // Example 2: Take a screenshot after clicking a button
    console.log("Taking a screenshot after clicking a button...");
    const result2 = await takeScreenshot("http://localhost:3000", {
      action: {
        element: { id: "exampleButton" },
        action: "click",
      },
    });
    console.log("Screenshot saved:", result2.screenshotPath);

    // Example 3: Take a screenshot of a specific element
    console.log("Taking a screenshot of a specific element...");
    const result3 = await takeScreenshot("http://localhost:3000", {
      elementToCapture: { id: "content" },
    });
    console.log("Screenshot saved:", result3.screenshotPath);

    // Example 4: Delete a screenshot
    console.log("Deleting a screenshot...");
    const deleteResult = await deleteScreenshot(result1.screenshotPath);
    console.log("Delete result:", deleteResult);

    console.log("Done! Stopping server...");
    stopServer();
  } catch (error) {
    console.error("Error:", error.message);
    stopServer();
  }
}

// Run the example
runExample();
