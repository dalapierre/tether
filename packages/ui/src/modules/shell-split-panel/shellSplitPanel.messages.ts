import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    loadFailed: NoMessageValues;
    terminalView: NoMessageValues;
    enterFullscreenTerminal: NoMessageValues;
    exitFullscreenTerminal: NoMessageValues;
    closeTerminal: NoMessageValues;
    splitTerminal: NoMessageValues;
    killTerminalInstance: { name: string };
    explainSelection: NoMessageValues;
};

export const messages = defineMessages<Messages>({
    loadFailed: {
        id: 'shellSplitPanel.loadFailed',
        defaultMessage: 'Failed to load session',
    },
    terminalView: {
        id: 'shellSplitPanel.terminalView',
        defaultMessage: 'Terminal',
    },
    enterFullscreenTerminal: {
        id: 'shellSplitPanel.enterFullscreenTerminal',
        defaultMessage: 'Fullscreen terminal',
    },
    exitFullscreenTerminal: {
        id: 'shellSplitPanel.exitFullscreenTerminal',
        defaultMessage: 'Exit fullscreen terminal',
    },
    closeTerminal: {
        id: 'shellSplitPanel.closeTerminal',
        defaultMessage: 'Close terminal',
    },
    splitTerminal: {
        id: 'shellSplitPanel.splitTerminal',
        defaultMessage: 'Split terminal',
    },
    killTerminalInstance: {
        id: 'shellSplitPanel.killTerminalInstance',
        defaultMessage: 'Kill {name}',
    },
    explainSelection: {
        id: 'shellSplitPanel.explainSelection',
        defaultMessage: 'Explain',
    },
});
