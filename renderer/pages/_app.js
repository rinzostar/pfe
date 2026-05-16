import '../styles/globals.css';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { AuthProvider } from '../lib/auth';
import { ThemeProvider } from '../lib/theme';
import Toaster from '../components/Toaster';
import { convex } from '../lib/convexClient';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <ConvexAuthProvider client={convex}>
        <AuthProvider>
          <Component {...pageProps} />
          <Toaster />
        </AuthProvider>
      </ConvexAuthProvider>
    </ThemeProvider>
  );
}
