"use client";

import { useEffect, useState, ReactElement } from "react";
import { createClient } from "@/lib/client/supabase/client";

export default function Page(): ReactElement {
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // run when page loads
  useEffect((): (() => void) => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  //when user clicks update
  const update = async (): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) setMsg(error.message);
    else setMsg("Password updated.");
  };

  // if not in recovery, wait
  if (!ready) return <p>Waiting for recovery session</p>;

  return (
    <div>
      <h1>Set new password</h1>

      <input
        type="password"
        placeholder="new password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={update}>Update</button>

      <p>{msg}</p>
    </div>
  );
}
