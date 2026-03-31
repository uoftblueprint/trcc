"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { HelpVariant } from "./volunteersHelpContent";
import { getHelpStorageKey } from "./volunteersHelpContent";

export function VolunteersInstructionsControls({
  variant,
}: {
  variant: HelpVariant;
}): React.JSX.Element {
  const key = useMemo(() => getHelpStorageKey(variant), [variant]);
  const [silenced, setSilenced] = useState(false);

  useEffect(() => {
    try {
      setSilenced(localStorage.getItem(key) === "1");
    } catch {
      setSilenced(false);
    }
  }, [key]);

  const enablePopup = (): void => {
    try {
      localStorage.removeItem(key);
      setSilenced(false);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="p-4 border border-purple-200 rounded-lg bg-purple-50">
      <h2 className="text-sm font-semibold text-purple-900 mb-1">
        Help pop-up preference
      </h2>
      <p className="text-sm text-purple-800">
        {silenced
          ? "The volunteers help pop-up is currently silenced for your role."
          : "The volunteers help pop-up is currently enabled for your role."}
      </p>
      <button
        type="button"
        onClick={enablePopup}
        disabled={!silenced}
        className="mt-3 px-3 py-2 text-sm font-medium rounded-lg bg-white border border-purple-300 text-purple-800 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-default"
      >
        Show help pop-up next time I open the volunteers page
      </button>
    </section>
  );
}
