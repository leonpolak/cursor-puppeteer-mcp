#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a line buffer for reading from stdin
let lineBuffer = "";
let currentMessage = null;

// Store process information
const processInfo = {
  projectName: path.basename(process.cwd()),
  screenshotsDir: path.join(process.cwd(), "screenshots"),
};

// Ensure screenshots directory exists
fs.ensureDirSync(processInfo.screenshotsDir);

/**
 * Parse an incoming message from stdin
 */
function parseMessage(data) {
  lineBuffer += data;

  // Process complete messages
  while (true) {
    if (currentMessage === null) {
      // Looking for the start of a message
      const match = lineBuffer.match(/^Content-Length: (\d+)\r\n\r\n/);
      if (match) {
        const contentLength = parseInt(match[1], 10);
        const headerLength = match[0].length;

        if (lineBuffer.length >= headerLength + contentLength) {
          // We have a complete message
          const content = lineBuffer.substring(
            headerLength,
            headerLength + contentLength
          );
          lineBuffer = lineBuffer.substring(headerLength + contentLength);
          currentMessage = JSON.parse(content);

          // Process the message
          handleMessage(currentMessage);
          currentMessage = null;
        } else {
          // Wait for more data
          break;
        }
      } else {
        // Wait for more data
        break;
      }
    }
  }
}

/**
 * Send a response back to Cursor
 */
function sendResponse(id, result, error = null) {
  const response = {
    id,
    result: result || null,
    error: error || null,
  };

  const content = JSON.stringify(response);
  const message = `Content-Length: ${Buffer.byteLength(
    content,
    "utf8"
  )}\r\n\r\n${content}`;

  process.stdout.write(message);
}

/**
 * Take a screenshot with Puppeteer
 */
async function takeScreenshot(url, options = {}) {
  console.error(chalk.blue(`Starting Puppeteer to visit: ${url}`));

  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // Create a new page
    const page = await browser.newPage();

    // Setup error handling before navigation
    let pageError = null;
    page.on("pageerror", (err) => {
      pageError = err.message;
      console.error(chalk.red(`Page error: ${err.message}`));
    });

    // Navigate to URL
    await page.goto(url, {
      waitUntil: ["load", "domcontentloaded", "networkidle0"],
    });

    // If there was an error during page load, return it
    if (pageError) {
      await browser.close();
      throw new Error(`Page error: ${pageError}`);
    }

    // Wait for any additional time if specified
    if (options.waitTime) {
      await page.waitForTimeout(options.waitTime);
    }

    // Perform action if specified
    if (options.action) {
      const { element, action } = options.action;

      let selector;
      if (element.id) {
        selector = `#${element.id}`;
      } else if (element.class) {
        selector = `.${element.class}`;
      } else if (element.selector) {
        selector = element.selector;
      } else {
        throw new Error("Invalid element specification");
      }

      // Wait for the element to be available
      await page.waitForSelector(selector);

      // Perform the specified action
      switch (action) {
        case "click":
          await page.click(selector);
          break;
        case "hover":
          await page.hover(selector);
          break;
        case "focus":
          await page.focus(selector);
          break;
        case "type":
          if (!element.text) {
            throw new Error("Text required for type action");
          }
          await page.type(selector, element.text);
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // Wait for a moment after the action
      await page.waitForTimeout(1000);
    }

    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotFilename = `${processInfo.projectName}_${timestamp}.png`;
    const screenshotPath = path.join(
      processInfo.screenshotsDir,
      screenshotFilename
    );

    if (options.elementToCapture) {
      let captureSelector;
      const elemToCapture = options.elementToCapture;

      if (elemToCapture.id) {
        captureSelector = `#${elemToCapture.id}`;
      } else if (elemToCapture.class) {
        captureSelector = `.${elemToCapture.class}`;
      } else if (elemToCapture.selector) {
        captureSelector = elemToCapture.selector;
      } else {
        throw new Error("Invalid element specification for capture");
      }

      const element = await page.$(captureSelector);
      if (!element) {
        throw new Error(`Element not found: ${captureSelector}`);
      }

      await element.screenshot({
        path: screenshotPath,
      });
    } else {
      // Full page screenshot
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
    }

    // Close the browser
    await browser.close();

    console.error(chalk.green(`Screenshot saved to: ${screenshotPath}`));
    return { screenshotPath };
  } catch (error) {
    console.error(chalk.red(`Error taking screenshot: ${error.message}`));
    throw error;
  }
}

/**
 * Delete a screenshot
 */
async function deleteScreenshot(screenshotPath) {
  try {
    if (await fs.pathExists(screenshotPath)) {
      await fs.remove(screenshotPath);
      return {
        success: true,
        message: `Screenshot deleted: ${screenshotPath}`,
      };
    } else {
      return {
        success: false,
        message: `Screenshot not found: ${screenshotPath}`,
      };
    }
  } catch (error) {
    console.error(chalk.red(`Error deleting screenshot: ${error.message}`));
    throw error;
  }
}

/**
 * Handle incoming messages
 */
async function handleMessage(message) {
  const { id, method, params } = message;

  try {
    switch (method) {
      case "takeScreenshot":
        const { url, action, elementToCapture, waitTime } = params;
        if (!url) {
          throw new Error("URL is required");
        }

        const result = await takeScreenshot(url, {
          action,
          elementToCapture,
          waitTime,
        });
        sendResponse(id, result);
        break;

      case "deleteScreenshot":
        const { screenshotPath } = params;
        if (!screenshotPath) {
          throw new Error("Screenshot path is required");
        }

        const deleteResult = await deleteScreenshot(screenshotPath);
        sendResponse(id, deleteResult);
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    console.error(chalk.red(`Error handling message: ${error.message}`));
    sendResponse(id, null, { message: error.message });
  }
}

// Set up stdin to receive messages
process.stdin.setEncoding("utf8");
process.stdin.on("data", parseMessage);

// Log startup information
console.error(chalk.green(`Cursor Puppeteer MCP server started`));
console.error(chalk.blue(`Project: ${processInfo.projectName}`));
console.error(
  chalk.blue(`Screenshots directory: ${processInfo.screenshotsDir}`)
);

// Handle process exit
process.on("SIGINT", () => {
  console.error(chalk.yellow("MCP server shutting down..."));
  process.exit(0);
});
