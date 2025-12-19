import { useState } from "react";
import { supabase } from "./lib/supabase";

/* ---------- PICKUP FORMATS ---------- */
const pickupFormats = {
  "Tate & Lyle": {
    regex: /^(2\d{6}|8\d{7}|44\d{8})$/,
    hint:
      "• 7 digits starting with 2\n• 8 digits starting with 8\n• OR 10 digits starting with 44",
  },
  Primient: {
    regex: /^(4\d{6}|8\d{7})$/,
    hint: "• 7 digits starting with 4\n• OR 8 digits starting with 8",
  },
  ADM: {
    regex: /^\d{6}$/,
    hint: "• 6 digits",
  },
  "Solutions Direct": {
    regex: /^TLNA-SO-00\d{6}$/,
    hint: "• Format: TLNA-SO-00XXXXXX",
  },
};

export default function DriverCheckIn() {
  const [customer, setCustomer] = useState("");
  const [pickup, setPickup] = useState("");
  const [trailer, setTrailer] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidPickup =
    customer &&
    pickupFormats[customer] &&
    pickupFormats[customer].regex.test(pickup);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!customer || !pickup || !phone || !city || !state) {
      setMsg("❌ Please fill out all required fields.");
      return;
    }

    if (!isValidPickup) {
      setMsg("❌ Pickup number format is invalid.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("driver_checkins").insert({
      customer,
      pickup_number: pickup,
      trailer_length: Number(trailer),
      phone,
      city,
      state,
      status: "waiting",
    });

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("✅ Check-in successful. Please wait for assignment.");
      setCustomer("");
      setPickup("");
      setTrailer("");
      setPhone("");
      setCity("");
      setState("");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: "0 auto" }}>
      <h1>Driver Check-In</h1>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        {/* CUSTOMER */}
        <select
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          required
        >
          <option value="">Select Customer</option>
          {Object.keys(pickupFormats).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        {/* PICKUP */}
        <div>
          <input
            placeholder="Pickup Number *"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            required
          />
          {customer && (
            <pre
              style={{
                fontSize: 12,
                color: isValidPickup ? "#555" : "#dc2626",
                whiteSpace: "pre-wrap",
                marginTop: 4,
              }}
            >
              {pickupFormats[customer].hint}
            </pre>
          )}
        </div>

        {/* TRAILER */}
        <select
          value={trailer}
          onChange={(e) => setTrailer(e.target.value)}
          required
        >
          <option value="">Trailer Length *</option>
          <option value="20">20'</option>
          <option value="40">40'</option>
        </select>

        {/* PHONE */}
        <input
          placeholder="Phone Number *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        {/* CITY / STATE */}
        <input
          placeholder="Delivery City *"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
        <input
          placeholder="Delivery State *"
          value={state}
          onChange={(e) => setState(e.target.value)}
          required
        />

        <button disabled={loading}>
          {loading ? "Submitting…" : "Check In"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
