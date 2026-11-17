"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Seul l'identifiant technique est conservé côté navigateur ; aucun détail interne n'est affiché.
    console.error("Erreur d'affichage", error.digest);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center bg-mist px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-100 text-danger">
          <TriangleAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-bold">Un problème est survenu</h1>
        <p className="mt-2 text-muted">La page n'a pas pu s'afficher. Réessayez dans un instant ; si cela continue, écrivez-nous sur WhatsApp.</p>
        <Button className="mt-6" onClick={reset}>Réessayer</Button>
      </div>
    </main>
  );
}
