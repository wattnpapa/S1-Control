interface LoginViewProps {
  loginName: string;
  loginPasswort: string;
  busy: boolean;
  error: string | null;
  onChangeName: (value: string) => void;
  onChangePasswort: (value: string) => void;
  onLogin: () => void;
}

export function LoginView(props: LoginViewProps): JSX.Element {
  return (
    <div className="login-page">
      <div className="panel">
        <h1>S1 Control Login</h1>
        <label>
          Benutzer
          <input value={props.loginName} onChange={(e) => props.onChangeName(e.target.value)} />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={props.loginPasswort}
            onChange={(e) => props.onChangePasswort(e.target.value)}
          />
        </label>
        <button disabled={props.busy} onClick={props.onLogin}>
          Anmelden
        </button>
        <p className="hint">Standard: admin / admin</p>
        {props.error && <p className="error">{props.error}</p>}
      </div>
    </div>
  );
}
