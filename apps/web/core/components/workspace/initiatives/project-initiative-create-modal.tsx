"use client";

import { useState } from "react";
import { observer } from "mobx-react";
import type { TInitiative, TInitiativeStatus } from "@plane/types";
import { Button, Input, TextArea } from "@plane/ui";
import { useStore } from "@/hooks/use-store";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  projectId: string;
};

const STATUS_OPTIONS: { value: TInitiativeStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const ProjectInitiativeCreateModal = observer(({ isOpen, onClose, workspaceSlug, projectId }: Props) => {
  const { initiative: initiativeStore } = useStore();

  const [form, setForm] = useState<Partial<TInitiative>>({
    name: "",
    description: "",
    status: "planned",
    start_date: null,
    end_date: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await initiativeStore.createProjectInitiative(workspaceSlug, projectId, form);
      onClose();
      setForm({ name: "", description: "", status: "planned", start_date: null, end_date: null });
    } catch {
      setError("Failed to create initiative. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-custom-backdrop/50">
      <div className="w-full max-w-lg rounded-lg bg-custom-background-100 p-6 shadow-xl border border-custom-border-200">
        <h2 className="text-lg font-semibold text-custom-text-100 mb-4">Create Initiative</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-custom-text-200 mb-1 block">Name *</label>
            <Input
              className="w-full"
              placeholder="Initiative name"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-custom-text-200 mb-1 block">Description</label>
            <TextArea
              className="w-full min-h-[80px]"
              placeholder="What is this initiative about?"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-custom-text-200 mb-1 block">Status</label>
            <select
              className="w-full rounded border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-sm text-custom-text-100"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TInitiativeStatus }))}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-custom-text-200 mb-1 block">Start date</label>
              <input
                type="date"
                className="w-full rounded border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-sm text-custom-text-100"
                value={form.start_date ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-custom-text-200 mb-1 block">End date</label>
              <input
                type="date"
                className="w-full rounded border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-sm text-custom-text-100"
                value={form.end_date ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value || null }))}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="neutral-primary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting}>
            Create initiative
          </Button>
        </div>
      </div>
    </div>
  );
});
