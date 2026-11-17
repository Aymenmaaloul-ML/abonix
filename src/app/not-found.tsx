import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/public/logo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-mist px-4">
      <div className="max-w-md text-center">
        <Link href="/" className="inline-block" aria-label="Retour à l'accueil">
          <Logo name="Abonix" />
        </Link>
        <span className="mx-auto mt-10 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <SearchX className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-bold">Cette page n'existe pas</h1>
        <p className="mt-2 text-muted">Le lien est peut-être ancien, ou le produit n'est plus proposé. Le catalogue est toujours à jour.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/produits">Voir le catalogue</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
