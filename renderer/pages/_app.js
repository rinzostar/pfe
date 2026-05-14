import '../styles/globals.css';
import { AuthProvider } from '../lib/auth';
import Toaster from '../components/Toaster';

if (typeof window !== 'undefined' && window.electronAPI) {
  const originalFetch = window.fetch;
  window.fetch = async (url, options) => {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const endpoint = url.replace('/api/', '');
      const body = options?.body ? JSON.parse(options.body) : {};
      
      let result;
      switch (endpoint) {
        case 'start-live': result = await window.electronAPI.startLive(body); break;
        case 'end-live': result = await window.electronAPI.endLive(body); break;
        case 'livekit-token': result = await window.electronAPI.getLivekitToken(body); break;
        case 'create-user': result = await window.electronAPI.createUser(body); break;
        case 'ai-course': result = await window.electronAPI.generateCourse(body); break;
        case 'ai-course-chat': result = await window.electronAPI.chatCourse(body); break;
        default: return originalFetch(url, options);
      }
      
      return new Response(JSON.stringify(result), {
        status: result.error ? 500 : 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch(url, options);
  };
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster />
    </AuthProvider>
  );
}
