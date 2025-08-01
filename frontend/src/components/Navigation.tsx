"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import StreakModal from "./StreakModal";
import { 
  IconFlame, 
  IconDashboard, 
  IconLogout, 
  IconLogin, 
  IconUserPlus, 
  IconMenu2, 
  IconX,
  IconHome,
  IconSchool
} from "@tabler/icons-react";
import { useStreak } from "@/lib/streakContext";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { streakData, loadingStreak } = useStreak();
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setIsMobileMenuOpen(false);
  };

  const handleStreakClick = () => {
    setShowStreakModal(true);
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const baseButton = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border";
  const activeButton = "bg-purple-700/90 hover:bg-purple-800/90 text-white border-purple-600/50";
  const inactiveButton = "bg-gray-800/80 hover:bg-gray-700/80 text-white border-gray-700/50";

  const NavButton = ({ href, icon: Icon, label, isActive, onClick }: {
    href?: string;
    icon: any;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
  }) => {
    const className = `${baseButton} ${isActive ? activeButton : inactiveButton}`;
    
    if (onClick) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className={className}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </motion.button>
      );
    }

    return (
      <Link href={href!} className={className}>
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  const MobileNavButton = ({ href, icon: Icon, label, isActive, onClick }: {
    href?: string;
    icon: any;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
  }) => {
    const className = `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive ? "bg-purple-700/90 text-white" : "text-gray-300 hover:bg-gray-800/80"
    }`;
    
    if (onClick) {
      return (
        <button onClick={onClick} className={className}>
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </button>
      );
    }

    return (
      <Link href={href!} className={className}>
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Floating Navigation Bar */}
      <div className="relative top-6 left-1/2 transform -translate-x-1/2 z-50 w-[100%] max-w-7xl p-[2px] rounded-lg bg-gradient-to-r from-black via-purple-700 to-black shadow-2xl">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-lg bg-black px-4 sm:px-6 py-1 w-full"
        >
          {/* Inner Content */}
          <div className="relative px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <Link href="/" className="flex items-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                >
                  Analogous
                </motion.div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <>
                    {/* Streak Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStreakClick}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-white transition-all duration-200 backdrop-blur-sm border border-gray-700/50"
                      disabled={loadingStreak}
                    >
                      <IconFlame
                        className={`w-4 h-4 ${
                          streakData?.current_streak_count &&
                          streakData.current_streak_count > 0
                            ? "text-orange-400 fill-current"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {loadingStreak ? "..." : streakData?.current_streak_count || 0}
                      </span>
                    </motion.button>

                    <NavButton
                      href="/dashboard"
                      icon={IconDashboard}
                      label="Dashboard"
                      isActive={pathname === "/dashboard"}
                    />

                    <NavButton
                      href="/dashboard/pricing"
                      icon={IconSchool}
                      label="Plan"
                      isActive={pathname === "/dashboard/pricing"}
                    />

                    <NavButton
                      icon={IconLogout}
                      label="Sign Out"
                      onClick={handleSignOut}
                    />
                  </>
                ) : (
                  <>
                    
                    <NavButton
                      href="/login"
                      icon={IconLogin}
                      label="Sign In"
                      isActive={pathname === "/login"}
                    />
                    
                    <NavButton
                      href="/signup"
                      icon={IconUserPlus}
                      label="Sign Up"
                      isActive={pathname === "/signup"}
                    />
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-white transition-all duration-200 backdrop-blur-sm border border-gray-700/50"
                >
                  {isMobileMenuOpen ? (
                    <IconX className="w-5 h-5" />
                  ) : (
                    <IconMenu2 className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
                         <motion.div
               initial={{ x: "100%" }}
               animate={{ x: 0 }}
               exit={{ x: "100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="absolute right-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-l border-gray-700/50 p-6"
               onClick={(e) => e.stopPropagation()}
             >
               {/* Close Button */}
               <div className="flex justify-end mb-6">
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-white transition-all duration-200 backdrop-blur-sm border border-gray-700/50"
                 >
                   <IconX className="w-5 h-5" />
                 </motion.button>
               </div>
               
               <div className="flex flex-col gap-4">
                {user ? (
                  <>
                    {/* Streak Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStreakClick}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-white transition-all duration-200"
                      disabled={loadingStreak}
                    >
                      <IconFlame
                        className={`w-5 h-5 ${
                          streakData?.current_streak_count &&
                          streakData.current_streak_count > 0
                            ? "text-orange-400 fill-current"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        Streak: {loadingStreak ? "..." : streakData?.current_streak_count || 0}
                      </span>
                    </motion.button>

                    <MobileNavButton
                      href="/dashboard"
                      icon={IconDashboard}
                      label="Dashboard"
                      isActive={pathname === "/dashboard"}
                    />

                                         <MobileNavButton
                       href="/dashboard/pricing"
                       icon={IconSchool}
                       label="My Plan"
                       isActive={pathname === "/dashboard/pricing"}
                     />

                    <MobileNavButton
                      icon={IconLogout}
                      label="Sign Out"
                      onClick={handleSignOut}
                    />
                  </>
                ) : (
                  <>
                    
                    <MobileNavButton
                      href="/login"
                      icon={IconLogin}
                      label="Sign In"
                      isActive={pathname === "/login"}
                    />
                    
                    <MobileNavButton
                      href="/signup"
                      icon={IconUserPlus}
                      label="Sign Up"
                      isActive={pathname === "/signup"}
                    />
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak Modal */}
      <StreakModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        isNewStreak={false}
      />
    </>
  );
}
