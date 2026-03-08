import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 mb-6">
          This link doesn&apos;t exist or may have been deactivated.
        </p>
        <Link
          href="/admin"
          className="text-sm text-blue-600 hover:underline"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
