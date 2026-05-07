import { useContext } from "react";
import { StoreContext } from "@/lib/store-context";
import type { RootStore } from "@/plane-web/store/root.store";

export const useStore = (): RootStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useStore must be used within StoreProvider");
  return context;
};
