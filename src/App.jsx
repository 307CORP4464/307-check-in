import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

/* ---------------- DOCK LIST ---------------- */
const docks = [
  ...Array.from({ length: 7 }, (_, i) => i + 1),
  ...Array.from({ length: 21 }, (_, i) => i + 15),
  ...Array.from({ length: 11 }, (_, i) => i + 49),
  ...Array.from({ length: 7 }, (_, i) => i + 64),
];

export default function App() {
  /* ---------------- AUTH ---------------- */
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- LOGIN ---------------- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /* ---------------- CSR DATA ---------------- */
  const [dockStatus, setDockStatus] = useState({});
  const [queue, setQueue] = useState([]);

  /* ---------------- INIT AUTH ---------------- */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .single();

        setRole(profile?.role ?? null);
      }
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setRole(null);

        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          setRole(profile?.role ?? null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---------------- LOAD DOCKS (REALTIME) ---------------- */
  useEffect(() => {
    if (role !== "csr") return;

    const loadDocks = async () => {
      const { data } = await supabase
        .from("docks")
        .select("dock_number, status");

      const mapped = {};
      data?.forEach((d) => (mapped[d.dock_number] = d.status));
      setDockStatus(mapped);
    };

    loadDocks();

    const channel = supabase
      .channel("dock-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docks" },
        loadDocks
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [role]);

  /* ---------------- LOAD DRIVER QUEUE (REALTIME) ---------------- */
  useEffect(() => {
    if (role !== "csr") return;

    const loadQueue = async () => {
      const { data } = await supabase
        .from("driver_checkins")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: true });

      setQueue(data || []);
    };

    loadQueue();

    const channel = supabase
      .channel("driver-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_checkins" },
        loadQueue
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [role]);

  /* ---------------- LOGIN ---------------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  };

  /* ---------------- DOCK STATUS ---------------- */
  const cycleStatus = async (dock) => {
    const order = ["available", "assigned", "loading"];
    const current = dockStatus[dock] || "available";
    const next = order[(order.indexOf(current) + 1) % order.length];

    setDockStatus((prev) => ({ ...prev, [dock]: next }));

    await supabase.from("docks").upsert({
      dock_number: dock,
      status: next,
    });
  };

  const colorFor = (status) => {
    if (status === "available") return "#22c55e";
    if (status === "assigned") return "#eab308";
    return "#ef4444";
  };

  /* ---------------- UI ---------------- */
  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  /* ---------------- LOGIN PAGE ---------------- */
  if (!session) {
    return (
      <div style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
        <h1>307 Check-In</h1>
        <h2>CSR Login</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />

          {error && <p style={{ color: "red" }}>{error}</p>}
          <button style={{ width: "100%", padding: 10 }}>Login</button>
        </form>
      </div>
    );
  }

  /* ---------------- CSR DASHBOARD ---------------- */
  if (role === "csr") {
    return (
      <div style={{ padding: 40 }}>
        <h1>CSR Dashboard</h1>
        <button onClick={handleLogout}>Log out</button>

        {/* DRIVER QUEUE */}
        <h2 style={{ marginTop: 20 }}>Waiting Drivers</h2>
        {queue.length === 0 && <p>No drivers waiting</p>}

        {queue.map((d) => (
          <div
            key={d.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <strong>{d.driver_name}</strong> — {d.phone}
            <div>
              {d.customer} | Pickup #{d.pickup_number}
            </div>
            <div>
              Trailer {d.trailer_length} → {d.delivery_city},{" "}
              {d.delivery_state}
            </div>
          </div>
        ))}

        {/* DOCK BOARD */}
        <h2 style={{ marginTop: 30 }}>Dock Board</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 12,
            marginTop: 10,
          }}
        >
          {docks.map((dock) => (
            <div
              key={dock}
              onClick={() => cycleStatus(dock)}
              style={{
                padding: 16,
                borderRadius: 8,
                textAlign: "center",
                cursor: "pointer",
                background: colorFor(dockStatus[dock]),
                color: "white",
                fontWeight: "bold",
              }}
            >
              Dock {dock}
              <div style={{ fontSize: 12 }}>{dockStatus[dock] || "available"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p>Access denied</p>;
}
