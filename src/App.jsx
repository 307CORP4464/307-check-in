export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>307 Check-In</h1>
      <p>Deployment successful 🎉</p>
    </div>
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
  });

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
    }
  );

  return () => listener.subscription.unsubscribe();
}, []);
  );
}
