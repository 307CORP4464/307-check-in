import { useState } from "react";
import { supabase } from "./lib/supabase";

export default function DriverCheckIn() {
  const [form, setForm] = useState({
    driver_name: "",
    company: "",
    trailer: "",
    phone: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const { error } = await supabase
      .from("driver_checkins")
      .insert(form);

    if (error) {
      setError(error.message);
    } else {
      setSubmitted(true);
      setForm({
        driver_name: "",
        company: "",
        trailer: "",
        phone: "",
      });
    }
  };

  if (submitted) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>✅ Checked In</h1>
        <p>Please wait for dock assignment.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
      <h1>Driver Check-In</h1>

      <form onSubmit={submit}>
        <input
          placeholder="Driver Name"
          value={form.driver_name}
          onChange={(e) =>
            setForm({ ...form, driver_name: e.target.value })
          }
          required
        />

        <input
          placeholder="Company"
          value={form.company}
          onChange={(e) =>
            setForm({ ...form, company: e.target.value })
          }
          required
        />

        <input
          placeholder="Trailer #"
          value={form.trailer}
          onChange={(e) =>
            setForm({ ...form, trailer: e.target.value })
          }
          required
        />

        <input
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button style={{ marginTop: 10, width: "100%" }}>
          Check In
        </button>
      </form>
    </div>
  );
}
