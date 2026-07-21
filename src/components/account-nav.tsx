"use client";

export function AccountNav({ email }: { email: string }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <nav className="nav">
        <a href="/">today</a>
        <a href="/archive">archive</a>
        <a href="/progress">progress</a>
        <button className="nav-button" type="button" onClick={() => void logout()}>
          log out
        </button>
      </nav>
      <p className="small account-email">{email}</p>
    </>
  );
}
