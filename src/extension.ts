import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "Auto Git Fetch" is now active!');

    // Get folder path and interval from settings
    const getFolderPath = () => {
        return vscode.workspace.getConfiguration().get<string>('autoGitFetch.folderPath');
    };

    const getInterval = () => {
        return vscode.workspace.getConfiguration().get<number>('autoGitFetch.interval') || 600; // Default to 600 seconds
    };

    // Function to run git fetch in the selected folder
    const runGitFetch = () => {
        const folderPath = getFolderPath();

        if (!folderPath) {
            vscode.window.showErrorMessage('No folder path set. Please configure the folder path in settings.');
            return;
        }

        // Run git fetch in the selected folder
        const command = `git -C "${folderPath}" fetch`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error running git fetch: ${error.message}`);
                return;
            }
            if (stderr) {
                vscode.window.showErrorMessage(`Git fetch error output: ${stderr}`);
            } else {
                vscode.window.showInformationMessage('Git fetch executed successfully.');
            }
        });
    };

    // Run git fetch on startup
    runGitFetch();

    // Run git fetch based on user-defined interval
    let intervalInSeconds = getInterval();
    let intervalId = setInterval(runGitFetch, intervalInSeconds * 1000); // Convert seconds to milliseconds

    // Toggle Git Fetch command
    let isAutoFetchEnabled = vscode.workspace.getConfiguration().get<boolean>('autoGitFetch.enabled') || false;

    const toggleGitFetch = vscode.commands.registerCommand('extension.toggleGitFetch', () => {
        isAutoFetchEnabled = !isAutoFetchEnabled;
        vscode.workspace.getConfiguration().update('autoGitFetch.enabled', isAutoFetchEnabled, vscode.ConfigurationTarget.Global);

        if (isAutoFetchEnabled) {
            intervalInSeconds = getInterval();
            intervalId = setInterval(runGitFetch, intervalInSeconds * 1000); // Restart interval
            vscode.window.showInformationMessage('Auto Git Fetch is now enabled.');
        } else {
            clearInterval(intervalId); // Stop auto-fetch when disabled
            vscode.window.showInformationMessage('Auto Git Fetch is now disabled.');
        }
    });

    // Show current settings command
    const showSettings = vscode.commands.registerCommand('extension.showSettings', () => {
        const interval = getInterval();
        const folderPath = getFolderPath();
        
        vscode.window.showInformationMessage(
            `Current Settings:\nInterval: ${interval} seconds\nFolder Path: ${folderPath || 'Not set'}`
        );
    });

    // Register the view provider for the side panel
    vscode.window.registerTreeDataProvider('autoGitFetchView', new AutoGitFetchViewProvider());

    // Clean up the interval when the extension is deactivated
    context.subscriptions.push({
        dispose() {
            clearInterval(intervalId);
        }
    });

    context.subscriptions.push(toggleGitFetch, showSettings);
}

// Tree Data Provider for the side menu view
class AutoGitFetchViewProvider implements vscode.TreeDataProvider<string> {
    getTreeItem(element: string): vscode.TreeItem {
        return {
            label: element,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    getChildren(): string[] {
        return [
            'Toggle Git Fetch',
            `Auto Git Fetch Enabled: ${vscode.workspace.getConfiguration().get<boolean>('autoGitFetch.enabled')}`,
            `Interval: ${vscode.workspace.getConfiguration().get<number>('autoGitFetch.interval')} seconds`,
            `Folder Path: ${vscode.workspace.getConfiguration().get<string>('autoGitFetch.folderPath') || 'Not set'}`
        ];
    }
}

export function deactivate() {
    // Cleanup code when the extension is deactivated
}
