'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  const baseButton =
    'px-4 py-2 rounded-md text-sm font-medium transition-colors';

  const primaryButton =
    `${baseButton} bg-purple-700 hover:bg-purple-800 text-white`;

  const secondaryButton =
    `${baseButton} bg-gray-800 hover:bg-gray-700 text-white`;

  return (
    <nav className="relative bg-black/60 backdrop-blur-md">
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-purple-600/20 via-purple-600 to-purple-600/20 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-5">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-3xl font-bold tracking-tight text-white"
            >
              Analogous
            </motion.div>
          </Link>

          {/* Right-side content */}
          <div className="flex flex-col items-end">
            {user ? (
              <>
                <div className="flex items-center gap-4 py-2">
                  <Link
                    href="/dashboard"
                    className={pathname === '/dashboard' ? primaryButton : secondaryButton}
                  >
                    Dashboard
                  </Link>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSignOut}
                    className={secondaryButton}
                  >
                    Sign Out
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 py-2">
                <Link
                  href="/login"
                  className={pathname === '/login' ? primaryButton : secondaryButton}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className={pathname === '/signup' ? primaryButton : secondaryButton}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

{/* <div className="mt-1 text-right">
  <span className="text-xs text-gray-400 block">Logged in as</span>
  <span className="text-sm text-white">{user.email}</span>
</div> */}
