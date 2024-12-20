import * as vscode from 'vscode';

const CONFIG_SECTION = 'sidebarResizer';
const DEFAULT_EDITOR_WIDTH = 1280;
const INITIAL_RESET_WIDTH = 3840;
const MAX_DIFFERENCE_THRESHOLD = 60;
const MAX_RESIZE_ATTEMPTS = 50;

/**
 * Activates the VS Code extension.
 * Registers a command that adjusts the editor layout to a configured target width.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Sidebar Resizer is now active!');

    const disposable = vscode.commands.registerCommand('sidebarResizer.resize', async () => {
        try {
            const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
            const targetEditorWidth = config.get<number>('editorWidth') ?? DEFAULT_EDITOR_WIDTH;
            
            // Focus the UI elements to ensure resizing commands affect the correct parts.
            await focusLayoutElements();

            // First, reset the layout to a known large width, then adjust to the target width.
            await resizeEditor(INITIAL_RESET_WIDTH);
            await resizeEditor(targetEditorWidth);

            console.log(`Editor resized to approximately ${targetEditorWidth}px.`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to resize editor: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Deactivate the extension. Currently no cleanup is needed.
 */
export function deactivate() {}

/**
 * Attempts to resize the editor to the given target width by repeatedly adjusting the view size.
 * This function uses a loop with a maximum number of attempts to prevent infinite loops.
 */
async function resizeEditor(targetWidth: number) {
    for (let attempt = 0; attempt < MAX_RESIZE_ATTEMPTS; attempt++) {
        const currentLayout = await getEditorLayout();
        if (!currentLayout) return;
        
        const currentWidth = currentLayout.groups[0].size;
        const difference = targetWidth - currentWidth;
        const isCloseEnough = Math.abs(difference) <= MAX_DIFFERENCE_THRESHOLD;

        console.log(`Current width: ${currentWidth}px, Target width: ${targetWidth}px, Difference: ${difference}px`);

        if (isCloseEnough) {
            break;
        }

        const command = difference > 0 
            ? 'workbench.action.decreaseViewSize' 
            : 'workbench.action.increaseViewSize';

        // To apply changes properly, focus the relevant UI elements before resizing.
        await focusLayoutElements();
        await vscode.commands.executeCommand(command);
    }
}

/**
 * Focuses the sidebar and auxiliary bar so that size commands know which panels to resize.
 * Then focuses back to the last editor group to ensure the resizing commands are applied correctly.
 */
async function focusLayoutElements() {
    await vscode.commands.executeCommand('workbench.action.focusSideBar');
    await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
    await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');
}

/**
 * Retrieves the current editor layout and validates that it has at least one group.
 * Returns `null` if the layout is not available.
 */
async function getEditorLayout() {
    const layout = await vscode.commands.executeCommand('vscode.getEditorLayout') as any;
    if (!layout || !layout.groups || layout.groups.length === 0) {
        vscode.window.showErrorMessage('Unable to retrieve the current editor layout.');
        return null;
    }
    return layout;
}