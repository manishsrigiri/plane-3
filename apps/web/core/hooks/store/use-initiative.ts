import { useContext } from "react";
import { StoreContext } from "@/lib/store-context";
import type { IInitiativeStore } from "@/store/initiative.store";

export const useInitiative = (): IInitiativeStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useInitiative must be used within StoreProvider");
  return context.initiative;
};
