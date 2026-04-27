import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useRegisterMutation } from "../services/authApi";

export function RegisterPage() {
  const navigate = useNavigate();
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    await registerUser(values).unwrap();
    navigate("/login");
  };

  return (
    <div className="form-stack auth-form-shell">
      <div className="auth-form-header">
        <h2>Start your team workspace</h2>
        <p className="muted-text">
          Create your Syncora account and begin organizing work with clarity.
        </p>
      </div>

      <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            placeholder="Maheshwar Kohal"
            {...register("fullName", { required: "Full name is required" })}
          />
          {errors.fullName ? <small>{errors.fullName.message}</small> : null}
        </label>

        <label className="field">
          <span>Username</span>
          <input
            type="text"
            placeholder="maheshwar"
            {...register("username", { required: "Username is required" })}
          />
          {errors.username ? <small>{errors.username.message}</small> : null}
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            placeholder="mahesh@example.com"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email ? <small>{errors.email.message}</small> : null}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Create a password"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password ? <small>{errors.password.message}</small> : null}
        </label>

        {error?.data?.message ? <p className="form-error">{error.data.message}</p> : null}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="muted-text auth-switch-text">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
