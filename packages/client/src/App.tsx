import HomePage from '@client/pages/HomePage';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<HomePage />} />
            </Routes>
        </BrowserRouter>
    );
}
