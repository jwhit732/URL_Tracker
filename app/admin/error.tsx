"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-20 px-4 text-center">
      <p className="text-lg font-semibold text-gray-800 mb-2">Something went wrong</p>
      <p className="text-sm text-gray-500 mb-6">
        {error.message ?? "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="text-sm bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        Try again
      </button>
    </div>
  );
}
