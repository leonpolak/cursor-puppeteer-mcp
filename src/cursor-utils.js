import fs from "fs-extra";
import path from "path";

/**
 * Get project information from the current directory
 */
export function getProjectInfo() {
  const cwd = process.cwd();
  const projectName = path.basename(cwd);

  return {
    projectName,
    projectPath: cwd,
    screenshotsDir: path.join(cwd, "screenshots"),
  };
}

/**
 * Ensure necessary directories exist
 */
export function ensureDirectories(projectInfo) {
  fs.ensureDirSync(projectInfo.screenshotsDir);
}

/**
 * Format comparison result for Cursor
 */
export function formatComparisonResult(matched, screenshotPath) {
  if (matched) {
    return {
      matched: true,
      message: "Screenshot matches the expected result",
      screenshotPath,
    };
  } else {
    return {
      matched: false,
      message: "Screenshot does not match the expected result",
      screenshotPath,
    };
  }
}

/**
 * Log a message to stderr (for debugging without interfering with stdout communication)
 */
export function log(message, type = "info") {
  const prefix =
    {
      info: "[INFO] ",
      warn: "[WARN] ",
      error: "[ERROR] ",
      success: "[SUCCESS] ",
    }[type] || "[INFO] ";

  console.error(`${prefix}${message}`);
}

/**
 * Parse action specification
 * Example: { element: { id: 'submitButton' }, action: 'click' }
 */
export function parseActionSpec(actionSpec) {
  if (!actionSpec || !actionSpec.element || !actionSpec.action) {
    throw new Error(
      "Invalid action specification. Requires element and action properties."
    );
  }

  const { element, action } = actionSpec;

  // Validate element selector
  if (!element.id && !element.class && !element.selector) {
    throw new Error("Element must be specified with id, class, or selector");
  }

  // Validate action type
  const validActions = ["click", "hover", "focus", "type"];
  if (!validActions.includes(action)) {
    throw new Error(
      `Unsupported action: ${action}. Valid actions are: ${validActions.join(
        ", "
      )}`
    );
  }

  // Additional validation for type action
  if (action === "type" && !element.text) {
    throw new Error("Text property is required for type action");
  }

  return { element, action };
}
