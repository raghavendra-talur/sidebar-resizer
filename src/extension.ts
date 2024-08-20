import { isAbsolute } from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Sidebar Resizer is now active!');

    let disposable = vscode.commands.registerCommand('sidebarResizer.resize', async () => {
        const config = vscode.workspace.getConfiguration('sidebarResizer');
        const targetEditorWidth = config.get<number>('editorWidth') || 1280; // Default to 1280px (1/3 of 3840px)
        const windowWidth = config.get<number>('windowWidth') || 3840; // Default to 3840px
        await vscode.commands.executeCommand('workbench.action.focusSideBar');
        await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
        await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');

        await resizeEditor(windowWidth * .9, "editor");
        await resizeEditor(targetEditorWidth, "sidebar");
        await resizeEditor(targetEditorWidth, "auxiliaryBar");

        vscode.window.showInformationMessage(`Editor resized to ${targetEditorWidth}px, sidebars adjusted accordingly`);
    });

    context.subscriptions.push(disposable);
}

async function resizeEditor(targetWidth: number, sidebar?: "sidebar" | "auxiliaryBar" | "editor") {
    const initialLayout = await vscode.commands.executeCommand('vscode.getEditorLayout') as any;
    if (!initialLayout || !initialLayout.groups || initialLayout.groups.length === 0) {
        vscode.window.showErrorMessage('Unable to get current editor layout');
        return;
    }

    const currentWidth = initialLayout.groups[0].size;
    const difference = targetWidth - currentWidth;

    vscode.window.showInformationMessage(`Editor is ${currentWidth}px`);

    if (Math.abs(difference) <= 60) {
        return;
    }

    let editorIsSmaller = false;

    if (difference > 0) {
        editorIsSmaller = true;
    }

    let command;
    if (sidebar === "editor") {
        if (editorIsSmaller) {
            command = 'workbench.action.increaseViewSize';
        } else {
            command = 'workbench.action.decreaseViewSize';
        }
    } else {
        if (editorIsSmaller) {
            command = 'workbench.action.decreaseViewSize';
        } else {
            command = 'workbench.action.increaseViewSize';
        }
    }


    if (sidebar === "editor") {
        await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');
        await vscode.commands.executeCommand(command);

        const newLayout = await vscode.commands.executeCommand('vscode.getEditorLayout') as any;
        if (!newLayout || !newLayout.groups || newLayout.groups.length === 0) {
            return;
        }

        if (newLayout.groups[0].size === currentWidth) {
            return;
        }

        await resizeEditor(targetWidth, "editor");
    }

    if (sidebar === "sidebar") {
        await vscode.commands.executeCommand('workbench.action.focusSideBar');
        await vscode.commands.executeCommand(command);
        await resizeEditor(targetWidth, "auxiliaryBar");
    }
    if (sidebar === "auxiliaryBar") {
        await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
        await vscode.commands.executeCommand(command);
        await resizeEditor(targetWidth, "sidebar");
    }
}

export function deactivate() {}