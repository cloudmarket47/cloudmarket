import { RouterProvider } from 'react-router-dom';
import { LocaleProvider } from './context/LocaleContext';
import { router } from './routes';

export default function App() {
  return (
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>
  );
}
