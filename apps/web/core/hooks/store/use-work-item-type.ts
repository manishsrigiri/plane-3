import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
// types
import type { IWorkItemTypeStore } from "@/store/work-item-type.store";

export const useWorkItemType = (): IWorkItemTypeStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useWorkItemType must be used within StoreProvider");
  return context.workItemType;
};
