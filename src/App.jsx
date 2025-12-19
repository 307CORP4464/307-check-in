import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]); // List of drivers
  const [dockStatus, setDockStatus] = useState({}); // Track dock statuses
  const [selectedDriver, setSelectedDriver] = useState(null); // Currently selected driver
  const [error, setError] = useState(""); // For error handling

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      
      if (sessionData.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", sessionData.session.user.id)
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

  // Load drivers who are in 'waiting' status
  useEffect(() => {
    const loadDrivers = async () => {
      const { data, error } = await supabase
        .from("driver_checkins")
        .select("id, pick_up_number, driver_name, status")
        .eq("status", "waiting");

      if (error) {
        setError(error.message);
      } else {
        setDrivers(data);
      }
    };

    if (role === "csr") {
      loadDrivers();
    }
  }, [role]);

  const handleAssignDriverToDock = async (dockNumber) => {
    if (!selectedDriver) {
      setError("Please select a driver first.");
      return;
    }

    // Update the dock status to 'assigned' and associate the driver
    const { error } = await supabase
      .from("docks")
      .update({
        status: "assigned",
        assigned_to: selectedDriver.id, // Link to the selected driver
      })
      .eq("dock_number", dockNumber);

    if (error) {
      setError(error.message);
    } else {
      setDockStatus((prevStatus) => ({
        ...prevStatus,
        [dockNumber]: "assigned",
      }));
      setSelectedDriver(null); // Reset selected driver after assignment
    }
  };

  // Color mapping for dock status
  const colorFor = (status) => {
    if (status === "available") return "#22c55e";
    if (status === "assigned") return "#eab308";
    return "#ef4444"; // Loading color
  };

  if (loading) return <p>Loading...</p>;

  if (!session) {
    return (
      <div>
        <h2>Please log in first.</h2>
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div>
        <h1>Admin Dashboard</h1>
        <p>Welcome, Admin!</p>
        {/* Add admin-related content here */}
      </div>
    );
  }

  if (role === "csr") {
    return (
      <div>
        <h1>CSR Dashboard</h1>
        <button onClick={() => supabase.auth.signOut()}>Log out</button>

        <h2>Assign Driver to Dock</h2>

        {/* Display available drivers */}
        <select
          onChange={(e) => setSelectedDriver(JSON.parse(e.target.value))}
          value={selectedDriver ? JSON.stringify(selectedDriver) : ""}
        >
          <option value="">Select a driver</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={JSON.stringify(driver)}>
              {driver.driver_name} - {driver.pick_up_number}
            </option>
          ))}
        </select>

        {/* Display docks */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 12,
            marginTop: 20,
          }}
        >
          {Object.keys(dockStatus).map((dockNumber) => (
            <div
              key={dockNumber}
              onClick={() => handleAssignDriverToDock(dockNumber)}
              style={{
                padding: 16,
                borderRadius: 8,
                textAlign: "center",
                cursor: "pointer",
                background: colorFor(dockStatus[dockNumber]),
                color: "white",
                fontWeight: "bold",
              }}
            >
              Dock {dockNumber}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div>No access</div>;
}
