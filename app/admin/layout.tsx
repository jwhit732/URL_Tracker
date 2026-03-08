import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-6 h-12">
          <span className="font-semibold text-sm text-gray-800">RTO Tracker</span>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/admin/create" className="text-sm text-gray-600 hover:text-gray-900">
            Generate Links
          </Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
