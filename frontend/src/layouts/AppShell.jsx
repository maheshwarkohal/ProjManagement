import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useMatch, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useLogoutMutation } from "../services/authApi";
import { clearCredentials } from "../features/auth/authSlice";
import { useGetProjectByIdQuery } from "../services/projectApi";
import { useGetTaskByIdQuery } from "../services/taskApi";
import { resolveAssetUrl } from "../utils/assets";
import { ProjectsIcon, SidebarIcon } from "../icons/icons";

function getSidebarLabel(value, fallback) {
  if (!value) {
    return fallback;
  }

  return value.length > 24 ? `${value.slice(0, 24)}...` : value;
}

export function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("syncora-sidebar-collapsed") === "true";
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const projectMatch = useMatch("/projects/:projectId");
  const taskMatch = useMatch("/projects/:projectId/tasks/:taskId");
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const projectId = taskMatch?.params?.projectId || projectMatch?.params?.projectId;
  const taskId = taskMatch?.params?.taskId;
  const { data: projectData } = useGetProjectByIdQuery(projectId, {
    skip: !projectId,
  });
  const { data: taskData } = useGetTaskByIdQuery(
    { projectId, taskId },
    {
      skip: !projectId || !taskId,
    },
  );
  const projectName = projectData?.data?.name;
  const taskName = taskData?.data?.title;

  useEffect(() => {
    window.localStorage.setItem("syncora-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Clear local auth state even if the backend session is already missing.
    } finally {
      dispatch(clearCredentials());
      navigate("/login", { replace: true });
    }
  };

  return (
    <div
      className={`app-shell${isSidebarCollapsed ? " is-sidebar-collapsed" : ""}`}
    >
      <aside className={`sidebar${isSidebarCollapsed ? " is-collapsed" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-brand-block">
            <div>
              <p className="sidebar-brand">Syncora</p>
            </div>
            <button
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <SidebarIcon />
            </button>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/projects" end title="Projects">
              {isSidebarCollapsed ? (
                  <ProjectsIcon />
              ) : null}
              <span className="sidebar-link-label">Projects</span>
            </NavLink>

            {projectId ? (
              <div className="sidebar-route-tree">
                <NavLink
                  className="sidebar-context-link"
                  to={`/projects/${projectId}`}
                  end
                  title={projectName || "Current project"}
                >
                  <span className="sidebar-link-icon">R</span>
                  <span className="sidebar-link-label">
                    {getSidebarLabel(projectName, "Current project")}
                  </span>
                </NavLink>

                {taskId ? (
                  <NavLink
                    className="sidebar-context-link sidebar-context-link-child"
                    to={`/projects/${projectId}/tasks/${taskId}`}
                    end
                    title={taskName || "Current task"}
                  >
                    <span className="sidebar-link-icon">T</span>
                    <span className="sidebar-link-label">
                      {getSidebarLabel(taskName, "Current task")}
                    </span>
                  </NavLink>
                ) : null}
              </div>
            ) : null}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="profile-menu-shell" ref={profileMenuRef}>
            <button
              className="profile-trigger"
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              title={user?.fullName || user?.username || "Team member"}
            >
              <img
                className="profile-trigger-avatar"
                src={resolveAssetUrl(
                  user?.avatar?.url || "https://placehold.co/200x200",
                )}
                alt={user?.username || "Profile avatar"}
              />
              <div className="profile-trigger-copy">
                <strong>
                  {user?.fullName || user?.username || "Team member"}
                </strong>
              </div>
              <span
                className={`profile-trigger-caret${isProfileMenuOpen ? " is-open" : ""}`}
              >
                ▾
              </span>
            </button>

            {isProfileMenuOpen ? (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-actions">
                  <button
                    className="profile-menu-item"
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate("/settings");
                    }}
                  >
                    <span className="profile-menu-icon">⚙</span>
                    <span>Settings</span>
                  </button>
                  <button
                    className="profile-menu-item"
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsLogoutConfirmOpen(true);
                    }}
                    disabled={isLoggingOut}
                  >
                    <span className="profile-menu-icon">↪</span>
                    <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="app-main">
        <section className="page-content">
          <Outlet />
        </section>
      </div>

      {isLogoutConfirmOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <section
            className="modal-card modal-card-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Sign out</p>
                <h2 id="logout-confirm-title">Sign out of Syncora?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                aria-label="Close sign out popup"
              >
                ×
              </button>
            </div>

            <p className="muted-text">
              You will be signed out from this device and returned to the login
              page.
            </p>

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
