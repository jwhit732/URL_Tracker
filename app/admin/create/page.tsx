import CreateForm from "./CreateForm";

export const metadata = {
  title: "Generate Links — RTO Link Tracker",
  robots: "noindex, nofollow",
};

export default function CreatePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return <CreateForm appUrl={appUrl} />;
}
