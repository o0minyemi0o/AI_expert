"use client";

import { useEffect, useState } from "react";
import { useProgressStore } from "@/stores/progress-store";

export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useProgressStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  return hydrated;
}
