import HomePage from '@client/pages/home_page';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<HomePage />} />
            </Routes>
        </BrowserRouter>
    );
}
