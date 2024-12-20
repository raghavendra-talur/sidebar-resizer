import * as vscode from 'vscode';

const CONFIG_SECTION = 'sidebarResizer';
const DEFAULT_EDITOR_WIDTH = 1280;
const MAX_DIFFERENCE_THRESHOLD = 60;
const MAX_RESIZE_ATTEMPTS = 50;
const PROBE_MAX_WIDTH = 10000; // A large number to probe maximum possible width

export async function activate(context: vscode.ExtensionContext) {
    console.log('Sidebar Resizer is now active!');

    const disposable = vscode.commands.registerCommand('sidebarResizer.resize', async () => {
        try {
            const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
            const targetEditorWidth = config.get<number>('editorWidth') ?? DEFAULT_EDITOR_WIDTH;

            // First, determine the maximum possible width by probing.
            const initialWidth = await determineInitialWidth();

            console.log(`Determined initial maximum width: ${initialWidth}px`);

            // Now resize from that maximum down (or up) to the target width.
            await resizeEditor(targetEditorWidth);

            console.log(`Editor resized to approximately ${targetEditorWidth}px.`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to resize editor: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

/**
 * Attempts to resize the editor to a given target width. This is done by repeatedly issuing
 * increase/decrease commands until the desired width (within a threshold) is reached or
 * we hit the maximum number of attempts.
 */
async function resizeEditor(targetWidth: number) {
    for (let attempt = 0; attempt < MAX_RESIZE_ATTEMPTS; attempt++) {
        const currentLayout = await getEditorLayout();
        if (!currentLayout) return;

        const currentWidth = currentLayout.groups[0].size;
        const difference = targetWidth - currentWidth;

        console.log(`Attempt ${attempt+1}: Current width: ${currentWidth}px, Target: ${targetWidth}px, Diff: ${difference}px`);

        if (Math.abs(difference) <= MAX_DIFFERENCE_THRESHOLD) {
            // Close enough to the target width
            break;
        }

        const command = difference > 0 
            ? 'workbench.action.decreaseViewSize' 
            : 'workbench.action.increaseViewSize';

        await focusLayoutElements();
        await vscode.commands.executeCommand(command);
    }
}

/**
 * Determines a baseline "maximum" width by attempting to set the editor width to a very large value.
 * After we try to stretch the layout, we record the resulting width. This gives us a dynamic starting point
 * instead of relying on a hard-coded reset width.
 */
async function determineInitialWidth(): Promise<number> {
    // Try resizing to an extremely large width, effectively "maxing out" what is possible.
    await resizeEditor(PROBE_MAX_WIDTH);

    const layout = await getEditorLayout();
    if (!layout) {
        throw new Error('Unable to determine the initial width.');
    }

    // The current editor size after attempting to set a large width can be considered our baseline max width.
    return layout.groups[0].size;
}

/**
 * Focuses the sidebar, auxiliary bar, and returns focus to the editor so that sizing commands target
 * the correct elements.
 */
async function focusLayoutElements() {
    await vscode.commands.executeCommand('workbench.action.focusSideBar');
    await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
    await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');
}

/**
 * Retrieves the current editor layout. Returns null if we can't get a valid layout.
 */
async function getEditorLayout() {
    const layout = await vscode.commands.executeCommand('vscode.getEditorLayout') as any;
    if (!layout || !layout.groups || layout.groups.length === 0) {
        vscode.window.showErrorMessage('Unable to retrieve the current editor layout.');
        return null;
    }
    return layout;
}