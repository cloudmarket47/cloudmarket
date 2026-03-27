
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
  });
}

const splashElement = document.getElementById('app-splash');

const hideSplash = () => {
  if (!splashElement) {
    return;
  }

  splashElement.classList.add('app-splash--hidden');
  window.setTimeout(() => {
    splashElement.remove();
  }, 360);
};

createRoot(document.getElementById('root')!).render(<App />);

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(hideSplash);
});
