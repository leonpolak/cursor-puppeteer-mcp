# Cursor Puppeteer MCP

A Puppeteer-based MCP (Model-Control-Protocol) server for generating visual feedback to Cursor. This tool allows Cursor to:

1. Visit a local development server URL
2. Check for errors
3. Take screenshots of the page or specific elements
4. Perform actions like clicking on elements
5. Compare screenshots with expected results

## Installation

```bash
npm install
```

## How It Works

The MCP server communicates with Cursor using a specific protocol:

1. Cursor sends a URL and optional parameters to the MCP server
2. The server launches Puppeteer to visit the URL
3. Puppeteer performs any specified actions and takes screenshots
4. The server returns results to Cursor, including screenshot paths
5. Cursor can analyze the screenshots and delete them when they match the expected output

## Usage

### From Cursor

In your Cursor prompt, you can ask to use this tool at the end of code generation:

```
Generate a React counter component. After generating the code, use the Puppeteer tool to take a screenshot of the component.
```

### From Command Line

You can also use the tool directly from the command line:

```bash
node src/cursor-integration.js http://localhost:3000 '{"waitTime": 1000}'
```

Options:

```javascript
{
  // Wait time in milliseconds before taking screenshot
  "waitTime": 1000,

  // Perform an action before taking screenshot
  "action": {
    "element": { "id": "buttonId" }, // Can also use "class" or "selector"
    "action": "click" // click, hover, focus, type
  },

  // Take screenshot of specific element instead of full page
  "elementToCapture": { "id": "elementId" }
}
```

## API

### Taking Screenshots

```javascript
import { takeScreenshot } from "./src/cursor-client.js";

// Take a full page screenshot
const result = await takeScreenshot("http://localhost:3000", {
  waitTime: 1000,
});

// Take a screenshot after clicking a button
const result = await takeScreenshot("http://localhost:3000", {
  action: {
    element: { id: "exampleButton" },
    action: "click",
  },
});

// Take a screenshot of a specific element
const result = await takeScreenshot("http://localhost:3000", {
  elementToCapture: { id: "content" },
});
```

### Deleting Screenshots

```javascript
import { deleteScreenshot } from "./src/cursor-client.js";

const deleteResult = await deleteScreenshot("/path/to/screenshot.png");
```

## Integration with Cursor

This tool is designed to seamlessly integrate with Cursor:

1. Cursor generates code for a project
2. Cursor starts a local development server
3. Cursor invokes this tool with the local server URL
4. The tool visits the URL, performs actions, and takes screenshots
5. Cursor analyzes the screenshots to check if they match the prompt
6. Cursor can iteratively improve the code based on visual feedback

## Examples

See the `examples` directory for usage examples.
