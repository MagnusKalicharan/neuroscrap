"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex h-screen w-screen flex-col items-center justify-center bg-[#020a04] p-4 text-[#4BFF7B] font-mono">
        <div className="max-w-md rounded border border-[var(--term-outline-green)] bg-[#031106] p-6 shadow-xl text-center">
          <h2 className="mb-2 text-lg font-bold text-[#ffb700]">CRITICAL RECOVERY</h2>
          <p className="mb-4 text-xs text-gray-300">
            {error.message || "A critical error occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="rounded border border-[#2EE85C] bg-[#020e05] px-4 py-1.5 text-xs font-bold text-[#4BFF7B] hover:bg-[#07240f]"
          >
            RETRY
          </button>
        </div>
      </body>
    </html>
  );
}
