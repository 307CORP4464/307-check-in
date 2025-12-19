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

  /* ---------------- DRIVER FORM ---------------- */
  const [driver, setDriver] = useState({
    driver_name: "",
    phone: "",
    customer: "",
    pickup_number: "",
    trailer_length: "",
    delivery_city: "",
    delivery_state: "",
  });
  const [driverMsg, setDriverMsg] = useState("");

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

  /* ---------------- DRIVER SUBMIT ---------------- */
  const submitDriver = async (e) => {
    e.preventDefault();
    setDriverMsg("");

    const { error } = await supabase.from("driver_checkins").insert({
      ...driver,
      status: "waiting",
    });

    if (error) {
      setDriverMsg(error.message);
    } else {
      setDriverMsg("✅ Check-in complete. Please wait.");
      setDriver({
        driver_name: "",
        phone: "",
        customer: "",
        pickup_number: "",
        trailer_length: "",
        delivery_city: "",
        delivery_state: "",
      });
    }
  };

  /* ---------------- LOAD DOCKS ---------------- */
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

  /* ---------------- LOAD QUEUE ---------------- */
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

    setDockStatus((p) => ({ ...p, [dock]: next }));

    await supabase.from("docks").upsert({
      dock_number: dock,
      status: next,
    });
  };

  const colorFor = (status) =>
    status === "assigned"
      ? "#eab308"
      : status === "loading"
      ? "#ef4444"
      : "#22c55e";

  /* ---------------- UI ---------------- */
  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  /* ---------------- DRIVER CHECK-IN (PUBLIC) ---------------- */
  if (!session) {
    return (
      <div style={{ padding: 40, maxWidth: 500, margin: "0 auto" }}>
        <h1>Driver Check-In</h1>

        <form onSubmit={submitDriver}>
          {[
            ["driver_name", "Driver Name"],
            ["phone", "Phone Number"],
            ["customer", "Customer"],
            ["pickup_number", "Pickup Number"],
            ["trailer_length", "Trailer Length (ft)"],
            ["delivery_city", "Delivery City"],
            ["delivery_state", "Delivery State"],
          ].map(([key, label]) => (
            <input
              key={key}
              placeholder={label}
              value={driver[key]}
              onChange={(e) =>
                setDriver({ ...driver, [key]: e.target.value })
              }
              required
              style={{ width: "100%", padding: 8, marginBottom: 10 }}
            />
          ))}

          <button style={{ width: "100%", padding: 10 }}>
            Check In
          </button>
        </form>

        {driverMsg && <p style={{ marginTop: 10 }}>{driverMsg}</p>}

        <hr style={{ margin: "30px 0" }} />

        <h3>CSR Login</h3>
        <form onSubmit={handleLogin}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <h2 style={{ marginTop: 20 }}>Waiting Drivers</h2>
        {queue.map((d) => (
          <div key={d.id} style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
            <strong>{d.driver_name}</strong> — {d.phone}
            <div>
              Pickup #{d.pickup_number} | {d.trailer_length}ft
            </div>
            <div>
              {d.delivery_city}, {d.delivery_state}
            </div>
          </div>
        ))}

        <h2 style={{ marginTop: 30 }}>Dock Board</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 80px)", gap: 10 }}>
          {docks.map((dock) => (
            <div
              key={dock}
              onClick={() => cycleStatus(dock)}
              style={{
                padding: 16,
                textAlign: "center",
                background: colorFor(dockStatus[dock]),
                color: "white",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Dock {dock}
              <div style={{ fontSize: 12 }}>
                {dockStatus[dock] || "available"}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p>Access denied</p>;
}
