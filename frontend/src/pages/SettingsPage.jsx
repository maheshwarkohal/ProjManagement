import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import {
  useChangeCurrentPasswordMutation,
  useUpdateCurrentUserMutation,
} from "../services/authApi";
import { setUser } from "../features/auth/authSlice";
import { resolveAssetUrl } from "../utils/assets";

export function SettingsPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("");
  const [updateCurrentUser, { isLoading: isUpdatingProfile, error: updateProfileError }] =
    useUpdateCurrentUserMutation();
  const [changeCurrentPassword, { isLoading: isChangingPassword, error: changePasswordError }] =
    useChangeCurrentPasswordMutation();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      username: user?.username || "",
      avatar: null,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  const onSubmitProfile = async (values) => {
    setProfileSuccessMessage("");

    const normalizedUsername = values.username?.trim() || "";
    if (normalizedUsername === (user?.username || "") && !values.avatar?.[0]) {
      setProfileSuccessMessage("No profile changes to save.");
      return;
    }

    const formData = new FormData();
    formData.append("username", normalizedUsername);

    if (values.avatar?.[0]) {
      formData.append("avatar", values.avatar[0]);
    }

    const response = await updateCurrentUser(formData).unwrap();
    const updatedUser = response?.data;

    if (updatedUser) {
      dispatch(setUser(updatedUser));
    }

    setProfileSuccessMessage("Profile updated successfully.");
  };

  const onSubmitPassword = async (values) => {
    setPasswordSuccessMessage("");

    await changeCurrentPassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    }).unwrap();

    resetPasswordForm();
    setPasswordSuccessMessage("Password changed successfully.");
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Profile settings</h1>
          <p>Update your profile photo, username, and login password.</p>
        </div>
      </section>

      <section className="split-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Update profile</h2>
            </div>
          </div>

          <div className="settings-profile-preview">
            <img
              className="settings-avatar"
              src={resolveAssetUrl(user?.avatar?.url || "https://placehold.co/200x200")}
              alt={user?.username || "Profile avatar"}
            />
            <div>
              <strong>{user?.fullName || user?.username}</strong>
              <p>{user?.email}</p>
            </div>
          </div>

          <form className="project-form" onSubmit={handleSubmitProfile(onSubmitProfile)}>
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                placeholder="Enter a username"
                {...registerProfile("username", {
                  required: "Username is required",
                })}
              />
              {profileErrors.username ? <small>{profileErrors.username.message}</small> : null}
            </label>

            <label className="field">
              <span>Profile picture</span>
              <input type="file" accept="image/*" {...registerProfile("avatar")} />
            </label>

            {updateProfileError?.data?.message ? (
              <p className="form-error">{updateProfileError.data.message}</p>
            ) : null}
            {profileSuccessMessage ? <p className="form-success">{profileSuccessMessage}</p> : null}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Security</p>
              <h2>Change password</h2>
            </div>
          </div>

          <form className="project-form" onSubmit={handleSubmitPassword(onSubmitPassword)}>
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                placeholder="Current password"
                {...registerPassword("currentPassword", {
                  required: "Current password is required",
                })}
              />
              {passwordErrors.currentPassword ? (
                <small>{passwordErrors.currentPassword.message}</small>
              ) : null}
            </label>

            <label className="field">
              <span>New password</span>
              <input
                type="password"
                placeholder="New password"
                {...registerPassword("newPassword", {
                  required: "New password is required",
                  minLength: {
                    value: 6,
                    message: "New password must be at least 6 characters long",
                  },
                })}
              />
              {passwordErrors.newPassword ? (
                <small>{passwordErrors.newPassword.message}</small>
              ) : null}
            </label>

            {changePasswordError?.data?.message ? (
              <p className="form-error">{changePasswordError.data.message}</p>
            ) : null}
            {passwordSuccessMessage ? <p className="form-success">{passwordSuccessMessage}</p> : null}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Saving..." : "Change password"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}
