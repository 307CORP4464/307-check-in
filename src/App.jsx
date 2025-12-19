import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

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
  const [waitingDrivers, setWaitingDrivers] = useState([]);
  const [appointmentTimes, setAppointmentTimes] = useState({});
  const [driverData, setDriverData] = useState([]);
  const [error, setError] = useState("");

  // Appointment time options
  const appointmentOptions = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

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

  useEffect(() => {
    if (role === "csr") {
      const loadDrivers = async () => {
        const { data, error } = await supabase
          .from("driver_checkins")
          .select("*")
          .eq("status", "waiting");

        if (!error && data) {
          setWaitingDrivers(data);
        }
      };

      loadDrivers();
    }
  }, [role]);

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

  const assignDriver = async (driver, dock) => {
    const appt = appointmentTimes[driver.id];
    if (!appt) {
      alert("Select appointment time first");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 1️⃣ Update driver_checkins status
    await supabase
      .from("driver_checkins")
      .update({
        status: "assigned",
        assigned_dock: dock,
        appointment_time: appt,
      })
      .eq("id", driver.id);

    // 2️⃣ Insert history log (APPEND ONLY)
    await supabase.from("dock_history").insert({
      dock_number: dock,
      pickup_number: driver.pickup_number,
      csr_id: session.user.id,
      appointment_time: appt,
    });

    // 3️⃣ Remove from waiting queue
    setWaitingDrivers(waitingDrivers.filter((d) => d.id !== driver.id));
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

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

          <button style={{ width: "100%", padding: 10 }}>Login</button>
        </form>
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div style={{ padding: 40 }}>
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout}>Log out</button>

        <h2 style={{ marginTop: 20 }}>Create CSR User</h2>

        <form onSubmit={handleCreateCSR}>
          <input
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            style={{ padding: 8, marginBottom: 10 }}
          />
          <input
            placeholder="Temp Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={{ padding: 8, marginBottom: 10 }}
          />
          <button>Create CSR</button>
        </form>

        {createMsg && <p>{createMsg}</p>}
      </div>
    );
  }

  if (role === "csr") {
    return (
      <div style={{ padding: 40 }}>
        <h1>CSR Dashboard</h1>
        <button onClick={handleLogout}>Log out</button>

        <h2 style={{ marginTop: 20 }}>Driver Check-Ins</h2>
        <table>
          <thead>
            <tr>
              <th>Pickup Number</th>
              <th>Carrier Name</th>
              <th>Trailer Number</th>
              <th>Trailer Length</th>
              <th>City/State</th>
              <th>Driver Name</th>
              <th>Driver Phone</th>
              <th>Appt Time</th>
              <th>Assign Dock</th>
            </tr>
          </thead>
          <tbody>
            {waitingDrivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.pickup_number}</td>
                <td>{driver.carrier_name}</td>
                <td>{driver.trailer_number}</td>
                <td>{driver.trailer_length}</td>
                <td>{driver.city}, {driver.state}</td>
                <td>{driver.driver_name}</td>
                <td>{driver.driver_phone}</td>
                <td>
                  <select
                    value={appointmentTimes[driver.id] || ""}
                    onChange={(e) =>
                      setAppointmentTimes({
                        ...appointmentTimes,
                        [driver.id]: e.target.value,
                      })
                    }
                  >
                    <option value="">Time</option>
                    {appointmentOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => assignDriver(driver, docks[0])} // Example dock, replace with proper dock
                  >
                    Assign Dock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p>Access denied</p>;
}
