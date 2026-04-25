import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import {
  useCreateProjectMutation,
  useGetProjectsQuery,
  useToggleProjectStarMutation,
} from "../services/projectApi";
import { resolveAssetUrl } from "../utils/assets";
import { AddIcon, DownArrow, SearchIcon } from "../icons/icons";

const projectStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

const statusLabelMap = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
};

const statusClassMap = {
  planning: "project-status-badge project-status-planning",
  active: "project-status-badge project-status-active",
  on_hold: "project-status-badge project-status-on-hold",
  completed: "project-status-badge project-status-completed",
};

const formatMemberCount = (count) =>
  `${count} ${count === 1 ? "member" : "members"}`;

export function DashboardPage() {
  const location = useLocation();
  const currentUser = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || "",
  );
  const { data, isLoading, isFetching, isError, error } = useGetProjectsQuery();
  const [createProject, { isLoading: isCreating, error: createError }] =
    useCreateProjectMutation();
  const [toggleProjectStar] = useToggleProjectStarMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      coverImage: null,
    },
  });

  const projects = data?.data ?? [];

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesTab =
        activeTab === "starred" ? Boolean(project.starred) : true;
      const matchesSearch = project.name
        ?.toLowerCase()
        .includes(searchValue.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "all" ? true : project.status === statusFilter;

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [activeTab, projects, searchValue, statusFilter]);

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    reset({
      name: "",
      description: "",
      coverImage: null,
    });
  };

  const onCreateProject = async (values) => {
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("name", values.name?.trim() || "");
    formData.append("description", values.description?.trim() || "");

    if (values.coverImage?.[0]) {
      formData.append("coverImage", values.coverImage[0]);
    }

    const response = await createProject(formData).unwrap();
    const createdProject = response?.data;

    closeCreateModal();
    setSuccessMessage(
      createdProject?.name
        ? `${createdProject.name} is ready in Syncora.`
        : "Project created successfully.",
    );
  };

  const handleToggleStar = async (event, project) => {
    event.preventDefault();
    event.stopPropagation();

    await toggleProjectStar({
      projectId: project._id,
      starred: !project.starred,
    }).unwrap();
  };

  return (
    <div className="page-stack">
      <section className="projects-toolbar">
        <div className="projects-search-group">
          <h2>Projects</h2>
          <div
            type="button"
            onClick={() => {
              setSuccessMessage("");
              reset({
                name: "",
                description: "",
                coverImage: null,
              });
              setIsCreateModalOpen(true);
            }}
          >
            <AddIcon />
          </div>
        </div>

        <label className="projects-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </label>
      </section>

      <section className="projects-controls">
        <div className="projects-tabs">
          <button
            className={`projects-tab-button${activeTab === "all" ? " is-active" : ""}`}
            type="button"
            onClick={() => setActiveTab("all")}
          >
            All Projects
          </button>
          <button
            className={`projects-tab-button${activeTab === "starred" ? " is-active" : ""}`}
            type="button"
            onClick={() => setActiveTab("starred")}
          >
            Starred
          </button>
        </div>

        <div className="projects-filter-group">
          <label className="projects-status-filter">
            <span className="projects-filter-icon">
              <DownArrow />
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {projectStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!projects.length && (isLoading || isFetching) ? (
        <p className="panel">Loading projects...</p>
      ) : null}
      {isError ? (
        <p className="panel">
          {error?.data?.message || "Failed to load projects."}
        </p>
      ) : null}

      <section className="project-grid project-grid-dashboard">
        {filteredProjects.map((project) => (
          <article key={project._id} className="project-dashboard-card">
            <Link
              className="project-dashboard-link"
              to={`/projects/${project._id}`}
            >
              <div className="project-dashboard-card-top">
                <div className="project-dashboard-card-header">
                  {project.coverImage?.url ? (
                    <img
                      className="project-dashboard-image"
                      src={resolveAssetUrl(project.coverImage.url)}
                      alt={`${project.name} cover`}
                    />
                  ) : (
                    <div className="project-card-mark" aria-hidden="true">
                      <span className="project-card-mark-a" />
                      <span className="project-card-mark-b" />
                      <span className="project-card-mark-c" />
                    </div>
                  )}
                  <div>
                    <h3>{project.name}</h3>
                  </div>
                </div>

                <div className="project-dashboard-actions">
                  <button
                    className={`project-star-button${project.starred ? " is-active" : ""}`}
                    type="button"
                    onClick={(event) => handleToggleStar(event, project)}
                    aria-label={
                      project.starred ? "Unstar project" : "Star project"
                    }
                    title={project.starred ? "Unstar project" : "Star project"}
                  >
                    ☆
                  </button>
                </div>
              </div>

              <div className="project-status">
                <div className="project-dashboard-members">
                  <div className="project-member-stack" aria-hidden="true">
                    {(project.memberPreview || []).map((member) => (
                      <img
                        key={member._id || member.username}
                        className="project-member-avatar"
                        src={
                          member.avatarUrl
                            ? resolveAssetUrl(member.avatarUrl)
                            : "https://placehold.co/200x200"
                        }
                        alt=""
                      />
                    ))}
                  </div>
                  <span>{formatMemberCount(project.members)}</span>
                </div>
                <span
                  className={
                    statusClassMap[project.status] || statusClassMap.planning
                  }
                >
                  {statusLabelMap[project.status] || "Planning"}
                </span>
              </div>

              <div className="project-dashboard-progress">
                <div className="project-dashboard-progress-header">
                  <span>Project Progress</span>
                  <strong>{project.progressPercentage || 0}%</strong>
                </div>

                <div
                  className="project-progress-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={project.progressPercentage || 0}
                  aria-label={`${project.name} progress`}
                >
                  <span
                    className="project-progress-fill"
                    style={{ width: `${project.progressPercentage || 0}%` }}
                  />
                </div>
              </div>
            </Link>
          </article>
        ))}

        {!isLoading && !filteredProjects.length ? (
          <div className="project-dashboard-card empty-state">
            <h3>No matching projects</h3>
            <p>Try another search, switch tabs, or change the status filter.</p>
          </div>
        ) : null}
      </section>

      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      {isCreateModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeCreateModal}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Create project</p>
                <h2 id="create-project-title">Start a new workspace</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeCreateModal}
                aria-label="Close create project popup"
              >
                ×
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={handleSubmit(onCreateProject)}
            >
              <label className="field">
                <span>Project name</span>
                <input
                  type="text"
                  placeholder="Website redesign"
                  {...register("name", {
                    required: "Project name is required",
                  })}
                />
                {errors.name ? <small>{errors.name.message}</small> : null}
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  placeholder="Write a short summary of what this project is about."
                  rows={5}
                  {...register("description")}
                />
              </label>

              <label className="field">
                <span>Project image</span>
                <input
                  type="file"
                  accept="image/*"
                  {...register("coverImage")}
                />
              </label>

              {createError?.data?.message ? (
                <p className="form-error">{createError.data.message}</p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeCreateModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isCreating}
                >
                  {isCreating ? "Creating project..." : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
