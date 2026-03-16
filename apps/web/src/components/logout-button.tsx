"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full justify-start"
      onClick={() => {
        startTransition(async () => {
          await logout();
        });
      }}
      disabled={isPending}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isPending ? "Saindo..." : "Sair"}
    </Button>
  );
}
