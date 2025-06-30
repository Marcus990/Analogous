// import { createServerClient } from '@supabase/ssr';
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export async function middleware(req: NextRequest) {
//   const res = NextResponse.next();

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get: (name) => req.cookies.get(name)?.value,
//         set: (name, value, options) => {
//           res.cookies.set({
//             name,
//             value,
//             ...options,
//           });
//         },
//         remove: (name, options) => {
//           res.cookies.set({
//             name,
//             value: '',
//             ...options,
//           });
//         },
//       },
//     }
//   );

//   const {
//     data: { session },
//   } = await supabase.auth.getSession();

//   // Protected routes
//   if (req.nextUrl.pathname.startsWith('/dashboard')) {
//     if (!session) {
//       return NextResponse.redirect(new URL('/login', req.url));
//     }
//   }

//   // Auth routes (login/signup) - redirect to dashboard if already logged in
//   if (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup')) {
//     if (session) {
//       return NextResponse.redirect(new URL('/dashboard', req.url));
//     }
//   }

//   return res;
// }

// export const config = {
//   matcher: ['/dashboard/:path*', '/login', '/signup'],
// }; 