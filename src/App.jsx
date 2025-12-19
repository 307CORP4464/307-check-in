import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // create CSR state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const [creating, setCreating] = useState(false);

  // Load session + role
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

  // Login
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

  // Create CSR user (ADMIN ONLY)
  const handleCreateCSR = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");

    const sessionData = await supabase.auth.getSession();
    const token = sessionData.data.session.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-service`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: "csr",
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setCreateMsg(data.error || "Failed to create user");
    } else {
      setCreateMsg("✅ CSR user created successfully");
      setNewEmail("");
      setNewPassword("");
    }

    setCreating(false);
  };

  if (loading) {
    return <p style={{ padding: 40 }}>Loading...</p>;
  }

  // NOT LOGGED IN
  if (!session) {
    return (
      <div style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
        <h1>307 Check-In</h1>
        <h2>Login</h2>

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

          <button type="submit" style={{ width: "100%", padding: 10 }}>
            Login
          </button>
        </form>
      </div>
    );
  }

  // ADMIN DASHBOARD
  if (role === "admin") {
    return (
      <div style={{ padding: 40, maxWidth: 500 }}>
        <h1>CSR Dashboard (Admin)</h1>
        <p>
          Logged in as <strong>{session.user.email}</strong>
        </p>

        <button onClick={handleLogout}>Log out</button>

        <hr style={{ margin: "20px 0" }} />

        <h2>Create CSR User</h2>

        <form onSubmit={handleCreateCSR}>
          <input
            type="email"
            placeholder="CSR Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />

          <input
            type="password"
            placeholder="Temporary Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />

          <button
            type="submit"
            disabled={creating}
            style={{ width: "100%", padding: 10 }}
          >
            {creating ? "Creating..." : "Create CSR"}
          </button>
        </form>

        {createMsg && <p style={{ marginTop: 10 }}>{createMsg}</p>}
      </div>
    );
  }

  // CSR VIEW
  if (role === "csr") {
    return (
      <div style={{ padding: 40 }}>
        <h1>CSR Dashboard</h1>
        <p>
          Logged in as <strong>{session.user.email}</strong>
        </p>

        <button onClick={handleLogout}>Log out</button>

        <hr style={{ margin: "20px 0" }} />

        <p>🚚 Dock dashboard coming next…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <p>Access denied.</p>
      <button onClick={handleLogout}>Log out</button>
    </div>
  );
}
