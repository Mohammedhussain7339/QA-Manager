import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/" className="btn mt-4 inline-flex">Back to dashboard</Link>
    </div>
  );
}
