import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let messageId = 0;
let pendingRequests = new Map();
let serverProcess = null;

/**
 * Start the MCP server process
 */
export function startServer() {
  if (serverProcess) {
    console.log("Server already running");
    return;
  }

  const serverPath = path.join(__dirname, "index.js");
  serverProcess = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let buffer = "";

  serverProcess.stdout.on("data", (data) => {
    buffer += data.toString();
    processBuffer();
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`[MCP Server] ${data.toString().trim()}`);
  });

  serverProcess.on("close", (code) => {
    console.log(`MCP server exited with code ${code}`);
    serverProcess = null;
  });

  console.log("MCP server started");
}

/**
 * Process the buffer for complete messages
 */
function processBuffer() {
  // Process complete messages
  while (true) {
    const match = buffer.match(/^Content-Length: (\d+)\r\n\r\n/);
    if (!match) break;

    const contentLength = parseInt(match[1], 10);
    const headerLength = match[0].length;

    if (buffer.length < headerLength + contentLength) break;

    const content = buffer.substring(
      headerLength,
      headerLength + contentLength
    );
    buffer = buffer.substring(headerLength + contentLength);

    try {
      const message = JSON.parse(content);
      handleResponse(message);
    } catch (error) {
      console.error(`Error parsing message: ${error.message}`);
    }
  }
}

/**
 * Handle response from the server
 */
function handleResponse(response) {
  const { id, result, error } = response;

  if (pendingRequests.has(id)) {
    const { resolve, reject } = pendingRequests.get(id);
    pendingRequests.delete(id);

    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  }
}

/**
 * Send a request to the server
 */
function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    if (!serverProcess) {
      reject(new Error("Server not started"));
      return;
    }

    const id = messageId++;

    const request = {
      id,
      method,
      params,
    };

    pendingRequests.set(id, { resolve, reject });

    const content = JSON.stringify(request);
    const message = `Content-Length: ${Buffer.byteLength(
      content,
      "utf8"
    )}\r\n\r\n${content}`;

    serverProcess.stdin.write(message);
  });
}

/**
 * Stop the server
 */
export function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    console.log("MCP server stopped");
  }
}

/**
 * Take a screenshot of a web page
 */
export async function takeScreenshot(url, options = {}) {
  try {
    return await sendRequest("takeScreenshot", {
      url,
      ...options,
    });
  } catch (error) {
    console.error(`Error taking screenshot: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a screenshot
 */
export async function deleteScreenshot(screenshotPath) {
  try {
    return await sendRequest("deleteScreenshot", {
      screenshotPath,
    });
  } catch (error) {
    console.error(`Error deleting screenshot: ${error.message}`);
    throw error;
  }
}

// Auto-cleanup on process exit
process.on("exit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
