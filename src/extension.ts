import * as vscode from "vscode";
import { exec } from "child_process";

let intervalId: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "Auto Git Fetch" is now active!');

  const autoGitFetchViewProvider = new AutoGitFetchViewProvider();

  vscode.window.registerTreeDataProvider(
    "autoGitFetchView",
    autoGitFetchViewProvider
  );

  // Set up event listener for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("autoGitFetch.enabled")) {
        autoGitFetchViewProvider.updateTreeItems(); // Update the view when enabled state changes
      }
    })
  );

  // Commands
  const toggleGitFetch = vscode.commands.registerCommand(
    "extension.toggleGitFetch",
    () => {
      const currentEnabled = autoGitFetchViewProvider.getEnabled();
      vscode.workspace
        .getConfiguration()
        .update(
          "autoGitFetch.enabled",
          !currentEnabled,
          vscode.ConfigurationTarget.Global
        );
      autoGitFetchViewProvider.updateTreeItems();
      vscode.window.showInformationMessage(
        `Auto Git Fetch is now ${!currentEnabled ? "enabled" : "disabled"}.`
      );

      // Start/stop the interval based on the new enabled state
      if (currentEnabled) {
        clearInterval(intervalId!);
      } else {
        const newInterval = autoGitFetchViewProvider.getInterval();
        intervalId = setInterval(runGitFetch, newInterval * 1000);
      }
    }
  );

  const editInterval = vscode.commands.registerCommand(
    "extension.editInterval",
    async () => {
      const newInterval = await vscode.window.showInputBox({
        prompt: "Enter the interval in seconds",
        value: String(autoGitFetchViewProvider.getInterval()),
      });
      if (newInterval) {
        vscode.workspace
          .getConfiguration()
          .update(
            "autoGitFetch.interval",
            parseInt(newInterval),
            vscode.ConfigurationTarget.Global
          );
        autoGitFetchViewProvider.updateTreeItems();
        vscode.window.showInformationMessage(
          `Interval set to ${newInterval} seconds.`
        );
      }
    }
  );

  const editFolderPath = vscode.commands.registerCommand(
    "extension.editFolderPath",
    async () => {
      const newFolderPath = await vscode.window.showInputBox({
        prompt: "Enter the folder path to run git fetch",
        value: autoGitFetchViewProvider.getFolderPath() || "",
      });
      if (newFolderPath) {
        vscode.workspace
          .getConfiguration()
          .update(
            "autoGitFetch.folderPath",
            newFolderPath,
            vscode.ConfigurationTarget.Global
          );
        autoGitFetchViewProvider.updateTreeItems();
        vscode.window.showInformationMessage(
          `Folder path set to ${newFolderPath}.`
        );
      }
    }
  );

  context.subscriptions.push(toggleGitFetch, editInterval, editFolderPath);

  // Initial run and interval setup
  if (autoGitFetchViewProvider.getEnabled()) {
    runGitFetch();
    const intervalInSeconds = autoGitFetchViewProvider.getInterval();
    intervalId = setInterval(runGitFetch, intervalInSeconds * 1000);
  }
}

export function deactivate() {
  if (intervalId) {
    clearInterval(intervalId);
  }
}

const runGitFetch = () => {
  const folderPath = vscode.workspace
    .getConfiguration()
    .get<string>("autoGitFetch.folderPath");

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
      vscode.window.showInformationMessage("Git fetch executed successfully.");
    }
  });
};

class AutoGitFetchViewProvider
  implements vscode.TreeDataProvider<AutoGitFetchItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    AutoGitFetchItem | undefined | null | void
  > = new vscode.EventEmitter<AutoGitFetchItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    AutoGitFetchItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private treeItems: AutoGitFetchItem[] = [];

  constructor() {
    this.updateTreeItems();
  }

  // Function to update all TreeItem values
  updateTreeItems(): void {
    const enabled = this.getEnabled();
    const interval = this.getInterval();
    const folderPath = this.getFolderPath();

    this.treeItems = [
      new AutoGitFetchItem("Toggle Auto Git Fetch", "extension.toggleGitFetch"),
      new AutoGitFetchItem(
        `Auto Git Fetch Enabled: ${enabled ? "Enabled" : "Disabled"}`,
        ""
      ),
      new AutoGitFetchItem(
        `Interval: ${interval} seconds`,
        "extension.editInterval"
      ),
      new AutoGitFetchItem(
        `Folder Path: ${folderPath || "Not set"}`,
        "extension.editFolderPath"
      ),
    ];

    // Trigger a refresh of the tree view
    this._onDidChangeTreeData.fire(); // Trigger refresh in UI
  }

  getTreeItem(element: AutoGitFetchItem): vscode.TreeItem {
    return element;
  }

  getChildren(): AutoGitFetchItem[] {
    return this.treeItems;
  }

  // Getters for configuration values
  getEnabled(): boolean {
    return (
      vscode.workspace
        .getConfiguration()
        .get<boolean>("autoGitFetch.enabled") || false
    );
  }

  getInterval(): number {
    return (
      vscode.workspace
        .getConfiguration()
        .get<number>("autoGitFetch.interval") || 600
    ); // Default to 600 seconds
  }

  getFolderPath(): string {
    return (
      vscode.workspace
        .getConfiguration()
        .get<string>("autoGitFetch.folderPath") || ""
    );
  }
}

class AutoGitFetchItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly commandId?: string
  ) {
    super(label);
    if (commandId) {
      this.command = {
        command: commandId,
        title: label,
      };
    }
    this.command = this.command || undefined; // Explicitly set command to undefined if there's no commandId
  }
}
