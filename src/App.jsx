import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

/* ---------- DOCK LIST ---------- */
const docks = [
  ...Array.from({ length: 7 }, (_, i) => i + 1),
  ...Array.from({ length: 21 }, (_, i) => i + 15),
  ...Array.from({ length: 11 }, (_, i) => i + 49),
  ...Array.from({ length: 7 }, (_, i) => i + 64),
];

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------- LOGIN ---------- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /* ---------- DOCKS ---------- */
  const [dockStatus, setDockStatus] = useState({});

  /* ---------- CSR QUEUE ---------- */
  const [queue, setQueue] = useState([]);

  /* ---------- AUTH LOAD ---------- */
  useEffect(() => {
    const load = async () => {
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

    load();

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

  /* ---------- LOAD DOCKS (CSR) ---------- */
  useEffect(() => {
    if (role !== "csr" && role !== "admin") return;

    const loadDocks = async () => {
      const { data } = await supabase
        .from("docks")
        .select("dock_number, status");

      const mapped = {};
      data?.forEach((d) => {
        mapped[d.dock_number] = d.status;
      });

      setDockStatus(mapped);
    };

    loadDocks();
  }, [role]);

  /* ---------- LOAD CSR QUEUE ---------- */
  useEffect(() => {
    if (role !== "csr" && role !== "admin") return;

    const loadQueue = async () => {
      const { data } = await supabase
        .from("driver_checkins")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: true });

      setQueue(data || []);
    };

    loadQueue();

    const interval = setInterval(loadQueue, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [role]);

  /* ---------- AUTH ---------- */
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

  /* ---------- UI ---------- */
  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  /* ---------- LOGIN SCREEN ---------- */
  if (!session) {
    return (
      <div style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
        <h1>307 Check-In</h1>
        <form onSubmit={handleLogin}>
          <input
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

  /* ---------- CSR / ADMIN DASHBOARD ---------- */
  if (role === "csr" || role === "admin") {
    return (
      <div style={{ padding: 30 }}>
        <h1>CSR Dashboard</h1>
        <button onClick={handleLogout}>Log out</button>

        {/* QUEUE */}
        <h2 style={{ marginTop: 30 }}>Waiting Drivers</h2>

        {queue.length === 0 && <p>No drivers waiting</p>}

        <div style={{ display: "grid", gap: 12 }}>
          {queue.map((d) => (
            <div
              key={d.id}
              style={{
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <strong>Pickup:</strong> {d.pickup_number} <br />
              <strong>Carrier:</strong> {d.carrier_name} <br />
              <strong>Trailer:</strong> {d.trailer_number} ({d.trailer_length}'){" "}
              <br />
              <strong>Delivery:</strong> {d.delivery_city},{" "}
              {d.delivery_state} <br />
              <strong>Driver:</strong> {d.driver_name} — {d.driver_phone}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p>Access denied</p>;
}
