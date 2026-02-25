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
        <div className="login-header">
          <span className="login-logo-wrap">
            <img src="branding/logo.svg" alt="THW Logo" className="login-logo" />
          </span>
          <h1 className="login-title">S1-Control Login</h1>
        </div>
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
