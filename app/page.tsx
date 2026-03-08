import { redirect } from "next/navigation";

// Root redirects to admin — this app has no public landing page.
export default function Home() {
  redirect("/admin");
}
