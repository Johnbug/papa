import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import Home from '../app/page';
import '../app/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(
  <>
    <Home />
    <Analytics />
  </>,
);
