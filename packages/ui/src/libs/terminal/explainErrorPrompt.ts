/** Build the explain-error prompt for a highlighted terminal selection. */
export function formatExplainErrorPrompt(errorMessage: string, command: string): string {
    return ['[Explain this error]', `errorMessage: ${errorMessage}`, `command: ${command}`].join('\n');
}
