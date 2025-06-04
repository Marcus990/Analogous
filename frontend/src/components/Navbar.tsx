'use client';

import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useStore } from '@/lib/store';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface DisclosureProps {
  open: boolean;
}

interface MenuItemProps {
  active: boolean;
}

export default function Navbar() {
  const { user, setUser } = useStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <Disclosure as="nav" className="bg-black/50 backdrop-blur-sm border-b border-purple-500/20">
      {({ open }: DisclosureProps) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Analogous
                  </Link>
                </div>
              </div>

              <div className="flex items-center">
                {user ? (
                  <Menu as="div" className="relative ml-3">
                    <Menu.Button className="flex rounded-full bg-purple-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black">
                      <UserCircleIcon className="h-8 w-8 text-purple-300" />
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-black/90 backdrop-blur-sm py-1 shadow-lg ring-1 ring-purple-500/20 focus:outline-none">
                        <Menu.Item>
                          {({ active }: MenuItemProps) => (
                            <Link
                              href="/dashboard"
                              className={classNames(
                                active ? 'bg-purple-900/50' : '',
                                'block px-4 py-2 text-sm text-purple-200'
                              )}
                            >
                              Dashboard
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }: MenuItemProps) => (
                            <button
                              onClick={handleSignOut}
                              className={classNames(
                                active ? 'bg-purple-900/50' : '',
                                'block w-full px-4 py-2 text-left text-sm text-purple-200'
                              )}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <div className="flex space-x-4">
                    <Link
                      href="/login"
                      className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      className="rounded-md bg-black/50 px-3 py-2 text-sm font-medium text-purple-200 hover:bg-purple-900/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>

              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-purple-200 hover:bg-purple-900/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {user ? (
                <>
                  <Disclosure.Button
                    as={Link}
                    href="/dashboard"
                    className="block rounded-md px-3 py-2 text-base font-medium text-purple-200 hover:bg-purple-900/50 hover:text-white"
                  >
                    Dashboard
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="button"
                    onClick={handleSignOut}
                    className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-purple-200 hover:bg-purple-900/50 hover:text-white"
                  >
                    Sign out
                  </Disclosure.Button>
                </>
              ) : (
                <>
                  <Disclosure.Button
                    as={Link}
                    href="/login"
                    className="block rounded-md px-3 py-2 text-base font-medium text-purple-200 hover:bg-purple-900/50 hover:text-white"
                  >
                    Login
                  </Disclosure.Button>
                  <Disclosure.Button
                    as={Link}
                    href="/signup"
                    className="block rounded-md px-3 py-2 text-base font-medium text-purple-200 hover:bg-purple-900/50 hover:text-white"
                  >
                    Sign up
                  </Disclosure.Button>
                </>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
} 