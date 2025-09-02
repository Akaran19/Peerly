import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx: Starting React app...');

const rootElement = document.getElementById("root");
console.log('main.tsx: Root element:', rootElement);

if (!rootElement) {
  console.error('main.tsx: Root element not found!');
} else {
  console.log('main.tsx: Creating React root...');
  const root = createRoot(rootElement);
  console.log('main.tsx: Rendering App component...');
  root.render(<App />);
  console.log('main.tsx: App rendered successfully!');
}
