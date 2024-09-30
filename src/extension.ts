import * as vscode from "vscode";
import { exec } from "child_process";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "Auto Git Fetch" is now active!');

  // Get folder path and interval from settings
  const getFolderPath = () => {
    return vscode.workspace
      .getConfiguration()
      .get<string>("autoGitFetch.folderPath");
  };

  const getInterval = () => {
    return (
      vscode.workspace
        .getConfiguration()
        .get<number>("autoGitFetch.interval") || 600
    ); // Default to 600 seconds
  };

  // Function to run git fetch in the selected folder
  const runGitFetch = () => {
    const folderPath = getFolderPath();

    if (!folderPath) {
      vscode.window.showErrorMessage(
        "No folder path set. Please configure the folder path in settings."
      );
      return;
    }

    // Run git fetch in the selected folder
    const command = `git -C "${folderPath}" fetch`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(
          `Error running git fetch: ${error.message}`
        );
        return;
      }
      if (stderr) {
        vscode.window.showErrorMessage(`Git fetch error output: ${stderr}`);
      } else {
        vscode.window.showInformationMessage(
          "Git fetch executed successfully."
        );
      }
    });
  };

  // Run git fetch on startup
  runGitFetch();

  // Run git fetch based on user-defined interval
  let intervalInSeconds = getInterval();
  let intervalId = setInterval(runGitFetch, intervalInSeconds * 1000); // Convert seconds to milliseconds

  // Toggle Git Fetch command
  let isAutoFetchEnabled =
    vscode.workspace.getConfiguration().get<boolean>("autoGitFetch.enabled") ||
    false;

  const toggleGitFetch = vscode.commands.registerCommand(
    "extension.toggleGitFetch",
    () => {
      isAutoFetchEnabled = !isAutoFetchEnabled;
      vscode.workspace
        .getConfiguration()
        .update(
          "autoGitFetch.enabled",
          isAutoFetchEnabled,
          vscode.ConfigurationTarget.Global
        );

      if (isAutoFetchEnabled) {
        intervalInSeconds = getInterval();
        intervalId = setInterval(runGitFetch, intervalInSeconds * 1000); // Restart interval
        vscode.window.showInformationMessage("Auto Git Fetch is now enabled.");
      } else {
        clearInterval(intervalId); // Stop auto-fetch when disabled
        vscode.window.showInformationMessage("Auto Git Fetch is now disabled.");
      }
    }
  );

  // Command to edit the interval setting
  const editInterval = vscode.commands.registerCommand(
    "extension.editInterval",
    async () => {
      const input = await vscode.window.showInputBox({
        placeHolder: "Enter the interval in seconds",
        value: getInterval().toString(),
      });

      if (input) {
        const newInterval = parseInt(input, 10);
        if (!isNaN(newInterval)) {
          vscode.workspace
            .getConfiguration()
            .update(
              "autoGitFetch.interval",
              newInterval,
              vscode.ConfigurationTarget.Global
            );
          intervalInSeconds = newInterval;
          clearInterval(intervalId);
          intervalId = setInterval(runGitFetch, intervalInSeconds * 1000);
          vscode.window.showInformationMessage(
            `Interval updated to ${newInterval} seconds.`
          );
        } else {
          vscode.window.showErrorMessage("Invalid interval entered.");
        }
      }
    }
  );

  // Command to edit the folder path setting
  const editFolderPath = vscode.commands.registerCommand(
    "extension.editFolderPath",
    async () => {
      const input = await vscode.window.showInputBox({
        placeHolder: "Enter the folder path",
        value: getFolderPath(),
      });

      if (input) {
        vscode.workspace
          .getConfiguration()
          .update(
            "autoGitFetch.folderPath",
            input,
            vscode.ConfigurationTarget.Global
          );
        vscode.window.showInformationMessage(
          `Folder path updated to ${input}.`
        );
      }
    }
  );

  // Register the view provider for the side panel
  vscode.window.registerTreeDataProvider(
    "autoGitFetchView",
    new AutoGitFetchViewProvider()
  );

  // Clean up the interval when the extension is deactivated
  context.subscriptions.push({
    dispose() {
      clearInterval(intervalId);
    },
  });

  context.subscriptions.push(toggleGitFetch, editInterval, editFolderPath);
}

// Tree Data Provider for the side menu view
class AutoGitFetchViewProvider
  implements vscode.TreeDataProvider<AutoGitFetchItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    AutoGitFetchItem | undefined | null | void
  > = new vscode.EventEmitter<AutoGitFetchItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    AutoGitFetchItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AutoGitFetchItem): vscode.TreeItem {
    return element;
  }

  getChildren(): AutoGitFetchItem[] {
    return [
      new AutoGitFetchItem("Toggle Git Fetch", "extension.toggleGitFetch"),
      new AutoGitFetchItem(
        `Auto Git Fetch Enabled: ${vscode.workspace
          .getConfiguration()
          .get<boolean>("autoGitFetch.enabled")}`,
        ""
      ),
      new AutoGitFetchItem(
        `Interval: ${vscode.workspace
          .getConfiguration()
          .get<number>("autoGitFetch.interval")} seconds`,
        "extension.editInterval"
      ),
      new AutoGitFetchItem(
        `Folder Path: ${
          vscode.workspace
            .getConfiguration()
            .get<string>("autoGitFetch.folderPath") || "Not set"
        }`,
        "extension.editFolderPath"
      ),
    ];
  }
}

class AutoGitFetchItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly commandId: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    if (commandId) {
      this.command = {
        command: commandId,
        title: label,
        tooltip: label,
      };
    }

    // Add icons based on the label
    this.iconPath = this.getIconForLabel(label);
  }

  // Function to return appropriate icon for each label
  private getIconForLabel(
    label: string
  ): { light: string; dark: string } | vscode.ThemeIcon {
    if (label.includes("Toggle Git Fetch")) {
      return new vscode.ThemeIcon("sync"); // Built-in icon for toggle
    } else if (label.includes("Interval")) {
      return new vscode.ThemeIcon("clock"); // Built-in icon for interval
    } else if (label.includes("Folder Path")) {
      return new vscode.ThemeIcon("file-directory"); // Built-in icon for folder
    } else {
      return new vscode.ThemeIcon("gear"); // Default icon (settings)
    }
  }
}

export function deactivate() {
  // Cleanup code when the extension is deactivated
}
