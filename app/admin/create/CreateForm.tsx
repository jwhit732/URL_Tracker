"use client";

import { useActionState, useState } from "react";
import { createBatch, type CreateBatchState } from "./actions";

const PLACEHOLDER = `30979, Building Trades Australia
1718, Performance Training Pty Limited
670, Australian Institute of Professional Counsellors`;

export default function CreateForm({ appUrl }: { appUrl: string }) {
  const [state, formAction, isPending] = useActionState<CreateBatchState, FormData>(
    createBatch,
    null,
  );
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  function trackedUrl(slug: string) {
    const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/r/${slug}`;
  }

  async function copyToClipboard(slug: string) {
    await navigator.clipboard.writeText(trackedUrl(slug));
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-1">Generate Tracked Links</h1>
      <p className="text-gray-500 text-sm mb-8">
        Paste RTO codes + names and a destination URL to create one tracked link per RTO.
      </p>

      <form action={formAction} className="space-y-6">
        {/* Destination URL */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="destinationUrl">
            Destination URL <span className="text-red-500">*</span>
          </label>
          <input
            id="destinationUrl"
            name="destinationUrl"
            type="url"
            required
            placeholder="https://smartaisolutions.com/demo"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state?.status === "error" && state.fieldErrors?.destinationUrl && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.destinationUrl}</p>
          )}
        </div>

        {/* Optional label */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="label">
            Batch label <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="label"
            name="label"
            type="text"
            placeholder="e.g. March outreach"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* RTO rows */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rows">
            RTO list <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            One row per RTO — format: <code className="bg-gray-100 px-1 rounded">rto_code, rto_name</code>
          </p>
          <textarea
            id="rows"
            name="rows"
            rows={8}
            placeholder={PLACEHOLDER}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state?.status === "error" && state.fieldErrors?.rows && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.rows}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Generating…" : "Generate Links"}
        </button>
      </form>

      {/* Parse errors */}
      {state?.status === "error" && state.parseErrors && state.parseErrors.length > 0 && (
        <div className="mt-6 border border-red-200 bg-red-50 rounded p-4">
          <p className="text-sm font-medium text-red-700 mb-2">Fix these rows and try again:</p>
          <ul className="space-y-1">
            {state.parseErrors.map((e) => (
              <li key={e.line} className="text-xs text-red-600">
                Line {e.line}: <span className="font-mono">{e.raw}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* General error */}
      {state?.status === "error" && state.message && (
        <p className="mt-6 text-sm text-red-600">{state.message}</p>
      )}

      {/* Parse warnings (valid rows generated, some rows skipped) */}
      {state?.status === "success" && state.parseWarnings.length > 0 && (
        <div className="mt-6 border border-yellow-200 bg-yellow-50 rounded p-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            {state.parseWarnings.length} row(s) were skipped due to formatting issues:
          </p>
          <ul className="space-y-1">
            {state.parseWarnings.map((e) => (
              <li key={e.line} className="text-xs text-yellow-700">
                Line {e.line}: <span className="font-mono">{e.raw}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Results table */}
      {state?.status === "success" && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {state.links.length} link{state.links.length !== 1 ? "s" : ""} generated
            </h2>
            <a
              href={`/admin/batch/${state.batchId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              View batch →
            </a>
          </div>

          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">RTO Code</th>
                  <th className="px-4 py-3">RTO Name</th>
                  <th className="px-4 py-3">Tracked URL</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.links.map((link) => (
                  <tr key={link.slug} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{link.rtoCode}</td>
                    <td className="px-4 py-3">{link.rtoName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">
                      {trackedUrl(link.slug)}
                      {!link.isNew && (
                        <span className="ml-2 text-xs text-gray-400 font-sans">(reused)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {link.destinationUrl}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(link.createdAt).toLocaleString("en-AU")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(link.slug)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 whitespace-nowrap"
                      >
                        {copiedSlug === link.slug ? "Copied!" : "Copy"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
