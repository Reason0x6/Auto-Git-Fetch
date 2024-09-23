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
    const intervalInSeconds = getInterval();
    const intervalId = setInterval(runGitFetch, intervalInSeconds * 1000); // Convert seconds to milliseconds

    // Clean up the interval when the extension is deactivated
    context.subscriptions.push({
        dispose() {
            clearInterval(intervalId);
        }
    });
}

export function deactivate() {
    // Cleanup code when the extension is deactivated
}
