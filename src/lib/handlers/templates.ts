export const notFoundPageHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Inter', sans-serif; background-color: #f8fafc; /* slate-50 */ }
      
      @keyframes panel-in {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes fade-left {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fade-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .animate-panel-in {
        animation: panel-in 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animate-fade-left {
        animation: fade-left 420ms ease-out forwards;
      }
      .animate-fade-up {
        animation: fade-up 420ms ease-out forwards;
      }
      
      .delay-120 { animation-delay: 120ms; }
      .delay-160 { animation-delay: 160ms; }
      .delay-240 { animation-delay: 240ms; }
      
      .opacity-0-start { opacity: 0; }
    </style>
  </head>
  <body class="flex items-center justify-center min-h-screen p-4 text-slate-900">
    <div class="w-full max-w-md">
      
      <div class="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg animate-panel-in will-change-transform">
        
        <div class="flex items-center justify-between gap-4">
          <div class="opacity-0-start animate-fade-left delay-120 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            <span class="h-1 w-8 rounded-full bg-slate-900"></span>
            i0c.cc
          </div>

          <div class="opacity-0-start animate-fade-left delay-120 text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </div>
        </div>

        <h1 class="opacity-0-start animate-fade-up delay-160 mt-8 text-3xl font-semibold text-slate-900">
          404 Not Found
        </h1>
        
        <p class="opacity-0-start animate-fade-up delay-160 mt-3 text-sm text-slate-500 leading-relaxed">
          The link you are trying to access does not exist or has been moved.
        </p>

        <a href="/" class="opacity-0-start animate-fade-up delay-240 mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 hover:shadow-md active:scale-95 duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Return Home
        </a>

      </div>

    </div>
  </body>
</html>
`;