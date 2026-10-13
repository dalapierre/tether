import { Spinner } from '@ui/components/spinner';
import { AppShell } from '@ui/modules/app-shell';
import { ToastProvider } from '@ui/modules/toast';
import { Suspense, lazy } from 'react';
import { IntlProvider } from 'react-intl';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const WorkspacePage = lazy(() => import('@ui/pages/workspace-page').then((m) => ({ default: m.WorkspacePage })));
const SessionPage = lazy(() => import('@ui/pages/session-page').then((m) => ({ default: m.SessionPage })));
const SettingsPage = lazy(() => import('@ui/pages/settings-page').then((m) => ({ default: m.SettingsPage })));
const NewSessionPage = lazy(() => import('@ui/pages/new-session-page').then((m) => ({ default: m.NewSessionPage })));
const TerminalPage = lazy(() => import('@ui/pages/terminal-page').then((m) => ({ default: m.TerminalPage })));

export function App() {
    return (
        <IntlProvider locale='en-CA' defaultLocale='en-CA'>
            <BrowserRouter>
                <ToastProvider>
                    <Suspense fallback={<Spinner size='lg' label='Loading' />}>
                        <Routes>
                            <Route element={<AppShell />}>
                                <Route path='/' element={<WorkspacePage />} />
                                <Route path='/sessions/:sessionId' element={<SessionPage />} />
                                <Route path='/settings' element={<SettingsPage />} />
                                <Route path='/new-session' element={<NewSessionPage />} />
                                <Route path='/terminals/:terminalId' element={<TerminalPage />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </ToastProvider>
            </BrowserRouter>
        </IntlProvider>
    );
}
