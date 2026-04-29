import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetProjectMembersQuery } from "../services/projectApi";
import {
  useCreateSubtaskMutation,
  useDeleteSubtaskMutation,
  useDeleteTaskMutation,
  useGetSubtasksByTaskIdQuery,
  useGetTaskByIdQuery,
  useUpdateSubtaskDetailsMutation,
  useUpdateTaskDetailsMutation,
  useUpdateSubtaskStatusMutation,
} from "../services/taskApi";
import {
  CloseIcon,
  DeleteIcon,
  EditIcon,
  FilterIcon,
  SearchIcon,
} from "../icons/icons";

const taskStatusOptions = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "testing", label: "Testing" },
  { value: "done", label: "Done" },
];

const subtaskFilterOptions = [
  { value: "all", label: "All Status" },
  ...taskStatusOptions,
];

const formatStatusLabel = (status) =>
  (status || "todo")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getTaskStatusPillClass = (status) => {
  switch (status) {
    case "done":
      return "status-pill status-pill-done";
    case "on_hold":
      return "status-pill status-pill-on-hold";
    case "in_progress":
      return "status-pill status-pill-in-progress";
    case "testing":
      return "status-pill status-pill-testing";
    case "todo":
    default:
      return "status-pill status-pill-todo";
  }
};

const subtaskStatusSummaryClassMap = {
  todo: "project-task-summary-pill project-task-summary-pill-todo",
  in_progress: "project-task-summary-pill project-task-summary-pill-in-progress",
  on_hold: "project-task-summary-pill project-task-summary-pill-on-hold",
  testing: "project-task-summary-pill project-task-summary-pill-testing",
  done: "project-task-summary-pill project-task-summary-pill-done",
};

export function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const [successMessage, setSuccessMessage] = useState("");
  const [subtaskSearchValue, setSubtaskSearchValue] = useState("");
  const [subtaskStatusFilter, setSubtaskStatusFilter] = useState("all");
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [isAddSubtaskModalOpen, setIsAddSubtaskModalOpen] = useState(false);
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
  const [isEditSubtaskModalOpen, setIsEditSubtaskModalOpen] = useState(false);
  const [isDeleteSubtaskModalOpen, setIsDeleteSubtaskModalOpen] = useState(false);
  const [activeSubtask, setActiveSubtask] = useState(null);
  const { data: taskData, isLoading: taskLoading } = useGetTaskByIdQuery({
    projectId,
    taskId,
  });
  const { data: membersData } = useGetProjectMembersQuery(projectId);
  const { data: subtasksData, isLoading: subtasksLoading } =
    useGetSubtasksByTaskIdQuery({
      projectId,
      taskId,
    });
  const [updateTaskDetails, { isLoading: isSavingTask, error: updateTaskError }] =
    useUpdateTaskDetailsMutation();
  const [createSubtask, { isLoading: isCreatingSubtask, error: createSubtaskError }] =
    useCreateSubtaskMutation();
  const [updateSubtaskDetails, { isLoading: isUpdatingSubtask, error: updateSubtaskError }] =
    useUpdateSubtaskDetailsMutation();
  const [updateSubtaskStatus] = useUpdateSubtaskStatusMutation();
  const [deleteTask, { isLoading: isDeletingTask, error: deleteTaskError }] =
    useDeleteTaskMutation();
  const [deleteSubtask, { isLoading: isDeletingSubtask, error: deleteSubtaskError }] =
    useDeleteSubtaskMutation();
  const [pendingSubtaskStatusId, setPendingSubtaskStatusId] = useState(null);

  const task = taskData?.data;
  const members = membersData?.data ?? [];
  const subtasks = subtasksData?.data ?? [];

  const taskForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
    },
  });

  const subtaskForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
    },
  });
  const editSubtaskForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
    },
  });

  const currentMembership = useMemo(
    () => members.find((member) => member.user?._id === currentUser?._id),
    [members, currentUser?._id],
  );
  const isAdmin = currentMembership?.role === "admin";
  const subtaskStatusCounts = useMemo(() => {
    return taskStatusOptions.map((statusOption) => ({
      ...statusOption,
      count: subtasks.filter(
        (subtask) => (subtask.status || "todo") === statusOption.value,
      ).length,
    }));
  }, [subtasks]);
  const filteredSubtasks = useMemo(() => {
    return subtasks.filter((subtask) => {
      const matchesSearch = subtask.title
        ?.toLowerCase()
        .includes(subtaskSearchValue.trim().toLowerCase());
      const matchesStatus =
        subtaskStatusFilter === "all"
          ? true
          : subtask.status === subtaskStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subtaskSearchValue, subtaskStatusFilter, subtasks]);

  useEffect(() => {
    if (!task) {
      return;
    }

    taskForm.reset({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo?._id || "",
      status: task.status || "todo",
    });
  }, [task, taskForm]);

  useEffect(() => {
    if (!activeSubtask) {
      return;
    }

    editSubtaskForm.reset({
      title: activeSubtask.title || "",
      description: activeSubtask.description || "",
      assignedTo: activeSubtask.assignedTo?._id || "",
      status: activeSubtask.status || "todo",
    });
  }, [activeSubtask, editSubtaskForm]);

  const closeEditTaskModal = () => {
    setIsEditTaskModalOpen(false);
    setSuccessMessage("");
    taskForm.reset({
      title: task?.title || "",
      description: task?.description || "",
      assignedTo: task?.assignedTo?._id || "",
      status: task?.status || "todo",
    });
  };

  const closeAddSubtaskModal = () => {
    setIsAddSubtaskModalOpen(false);
    setSuccessMessage("");
    subtaskForm.reset({
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
    });
  };

  const openEditSubtaskModal = (subtask) => {
    setSuccessMessage("");
    setActiveSubtask(subtask);
    setIsEditSubtaskModalOpen(true);
  };

  const closeEditSubtaskModal = () => {
    setIsEditSubtaskModalOpen(false);
    setActiveSubtask(null);
    editSubtaskForm.reset({
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
    });
  };

  const onSaveTask = async (values) => {
    setSuccessMessage("");

    const normalizedIncomingDetails = {
      title: values.title?.trim() || "",
      description: values.description?.trim() || "",
      assignedTo: values.assignedTo || "",
      status: values.status || "todo",
    };
    const normalizedCurrentDetails = {
      title: task?.title?.trim() || "",
      description: task?.description?.trim() || "",
      assignedTo: task?.assignedTo?._id || "",
      status: task?.status || "todo",
    };

    const hasTaskDetailsChanged =
      normalizedIncomingDetails.title !== normalizedCurrentDetails.title ||
      normalizedIncomingDetails.description !== normalizedCurrentDetails.description ||
      normalizedIncomingDetails.assignedTo !== normalizedCurrentDetails.assignedTo ||
      normalizedIncomingDetails.status !== normalizedCurrentDetails.status;

    if (!hasTaskDetailsChanged) {
      setSuccessMessage("No task changes to save.");
      return;
    }

    const response = await updateTaskDetails({
      projectId,
      taskId,
      ...normalizedIncomingDetails,
    }).unwrap();

    closeEditTaskModal();
    setSuccessMessage(
      response?.data?.title
        ? `${response.data.title} has been updated.`
        : "Task updated successfully.",
    );
  };

  const onCreateSubtask = async (values) => {
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("title", values.title.trim());

    if (values.description?.trim()) {
      formData.append("description", values.description.trim());
    }

    if (values.assignedTo) {
      formData.append("assignedTo", values.assignedTo);
    }

    if (values.status) {
      formData.append("status", values.status);
    }

    const response = await createSubtask({
      projectId,
      taskId,
      formData,
    }).unwrap();

    closeAddSubtaskModal();
    setSuccessMessage(
      response?.data?.title
        ? `${response.data.title} has been added as a subtask.`
        : "Subtask created successfully.",
    );
  };

  const onSaveSubtask = async (values) => {
    if (!activeSubtask) {
      return;
    }

    setSuccessMessage("");

    const normalizedValues = {
      title: values.title?.trim() || "",
      description: values.description?.trim() || "",
      assignedTo: values.assignedTo || "",
      status: values.status || "todo",
    };
    const normalizedCurrentSubtask = {
      title: activeSubtask.title?.trim() || "",
      description: activeSubtask.description?.trim() || "",
      assignedTo: activeSubtask.assignedTo?._id || "",
      status: activeSubtask.status || "todo",
    };

    const hasDetailsChanged =
      normalizedValues.title !== normalizedCurrentSubtask.title ||
      normalizedValues.description !== normalizedCurrentSubtask.description ||
      normalizedValues.assignedTo !== normalizedCurrentSubtask.assignedTo;
    const hasStatusChanged = normalizedValues.status !== normalizedCurrentSubtask.status;

    if (!hasDetailsChanged && !hasStatusChanged) {
      setSuccessMessage("No subtask changes to save.");
      return;
    }

    if (hasDetailsChanged) {
      await updateSubtaskDetails({
        projectId,
        subTaskId: activeSubtask._id,
        title: normalizedValues.title,
        description: normalizedValues.description,
        assignedTo: normalizedValues.assignedTo,
      }).unwrap();
    }

    if (hasStatusChanged) {
      await updateSubtaskStatus({
        projectId,
        subTaskId: activeSubtask._id,
        status: normalizedValues.status,
      }).unwrap();
    }

    closeEditSubtaskModal();
    setSuccessMessage(
      normalizedValues.title
        ? `${normalizedValues.title} has been updated.`
        : "Subtask updated successfully.",
    );
  };

  const handleDeleteTask = async () => {
    const deletedTaskTitle = task?.title;

    await deleteTask({
      projectId,
      taskId,
    }).unwrap();

    navigate(`/projects/${projectId}`, {
      state: {
        successMessage: deletedTaskTitle
          ? `${deletedTaskTitle} has been deleted.`
          : "Task deleted successfully.",
      },
    });
  };

  const handleDeleteSubtask = async () => {
    if (!activeSubtask) {
      return;
    }

    const deletedSubtaskTitle = activeSubtask.title;

    await deleteSubtask({
      projectId,
      subTaskId: activeSubtask._id,
    }).unwrap();

    setIsDeleteSubtaskModalOpen(false);
    setActiveSubtask(null);
    setSuccessMessage(
      deletedSubtaskTitle
        ? `${deletedSubtaskTitle} has been deleted.`
        : "Subtask deleted successfully.",
    );
  };

  const handleSubtaskStatusChange = async (subTaskId, status) => {
    setSuccessMessage("");
    setPendingSubtaskStatusId(subTaskId);

    try {
      await updateSubtaskStatus({
        projectId,
        subTaskId,
        status,
      }).unwrap();
    } finally {
      setPendingSubtaskStatusId(null);
    }
  };

  if (taskLoading) {
    return <p className="panel">Loading task...</p>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-actions">
          <div className="project-hero-text">
            <h1>{task?.title}</h1>
            <p>{task?.description || "No description added yet."}</p>
          </div>

          <div className="task-detail-actions">
            {isAdmin ? (
              <>
                <button
                  className="action-icon-button action-icon-button-edit"
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setIsEditTaskModalOpen(true);
                  }}
                  aria-label="Edit task"
                  title="Edit task"
                >
                  <EditIcon />
                </button>
                <button
                  className="action-icon-button action-icon-button-delete"
                  type="button"
                  onClick={() => setIsDeleteTaskModalOpen(true)}
                  aria-label="Delete task"
                  title="Delete task"
                >
                  <DeleteIcon />
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="project-hero-insights task-hero-insights">
          <div className="project-hero-insights-block task-hero-meta-block">
            <div className="task-hero-meta-grid">
              <div className="task-hero-meta-item">
                <span>Assigned to</span>
                <strong>
                  {task?.assignedTo?.fullName ||
                    task?.assignedTo?.username ||
                    "Unassigned"}
                </strong>
              </div>

              <div className="task-hero-meta-item">
                <span>Current status</span>
                <strong>{formatStatusLabel(task?.status)}</strong>
              </div>

              <div className="task-hero-meta-item">
                <span>Total subtasks</span>
                <strong>{subtasksLoading ? "..." : subtasks.length}</strong>
              </div>
            </div>
          </div>

          <div className="project-hero-insights-divider" aria-hidden="true" />

          <div className="project-hero-insights-block task-hero-summary-block">
            <div className="project-hero-insights-head">
              <span>Subtask breakdown</span>
              <strong>{subtasksLoading ? "..." : `${subtasks.length} total`}</strong>
            </div>

            <div className="project-task-summary-grid">
              {subtaskStatusCounts.map((statusItem) => (
                <div
                  key={statusItem.value}
                  className={
                    subtaskStatusSummaryClassMap[statusItem.value] ||
                    "project-task-summary-pill project-task-summary-pill-todo"
                  }
                >
                  <span>{statusItem.label}</span>
                  <strong>{subtasksLoading ? "..." : statusItem.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <section className="panel">
        <div className="section-heading">
          <p className="subHeading">Subtasks</p>
          {isAdmin ? (
            <button
              className="primary-button projects-add-button"
              type="button"
              onClick={() => {
                setSuccessMessage("");
                setIsAddSubtaskModalOpen(true);
              }}
              title="Add subtask"
            >
              Add subtask
            </button>
          ) : null}
        </div>
        <div className="project-task-toolbar">
          <label className="projects-search project-task-search">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search subtasks..."
              value={subtaskSearchValue}
              onChange={(event) => setSubtaskSearchValue(event.target.value)}
            />
          </label>

          <label className="projects-status-filter project-task-filter">
            <span className="projects-filter-icon">
              <FilterIcon />
            </span>
            <select
              value={subtaskStatusFilter}
              onChange={(event) => setSubtaskStatusFilter(event.target.value)}
            >
              {subtaskFilterOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="list-stack">
          {filteredSubtasks.map((subtask) => (
            <div className="list-row task-list-row" key={subtask._id}>
              <div className="task-row-link">
                <div>
                  <strong>{subtask.title}</strong>
                  <p className="task-meta">
                    Assigned to{" "}
                    {subtask.assignedTo?.fullName ||
                      subtask.assignedTo?.username ||
                      "nobody yet"}
                  </p>
                </div>
              </div>
              <div className="task-row-actions">
                <label className={getTaskStatusPillClass(subtask.status)}>
                  <span className="sr-only">Update subtask status</span>
                  <select
                    value={subtask.status || "todo"}
                    onChange={(event) =>
                      handleSubtaskStatusChange(subtask._id, event.target.value)
                    }
                    disabled={pendingSubtaskStatusId === subtask._id}
                  >
                    {taskStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <span className="status-pill-label">
                    {pendingSubtaskStatusId === subtask._id
                      ? "Saving..."
                      : formatStatusLabel(subtask.status)}
                  </span>
                </label>
                {isAdmin ? (
                  <>
                    <button
                      className="action-icon-button action-icon-button-edit task-action-button"
                      type="button"
                      onClick={() => openEditSubtaskModal(subtask)}
                      aria-label={`Edit ${subtask.title}`}
                      title="Edit subtask"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="action-icon-button action-icon-button-delete task-action-button"
                      type="button"
                      onClick={() => {
                        setSuccessMessage("");
                        setActiveSubtask(subtask);
                        setIsDeleteSubtaskModalOpen(true);
                      }}
                      aria-label={`Delete ${subtask.title}`}
                      title="Delete subtask"
                    >
                      <DeleteIcon />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {!subtasksLoading && !filteredSubtasks.length ? (
            <p>
              {subtaskSearchValue || subtaskStatusFilter !== "all"
                ? "No subtasks match your current search or filter."
                : "No subtasks created yet."}
            </p>
          ) : null}
        </div>
      </section>

      {isAdmin && isEditTaskModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeEditTaskModal}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="edit-task-modal-title">Update task details</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeEditTaskModal}
                aria-label="Close edit task popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={taskForm.handleSubmit(onSaveTask)}
            >
              <label className="field">
                <span>Title</span>
                <input
                  type="text"
                  placeholder="Improve task details"
                  {...taskForm.register("title", {
                    required: "Task title is required",
                  })}
                />
                {taskForm.formState.errors.title ? (
                  <small>{taskForm.formState.errors.title.message}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows={4}
                  placeholder="Refine what needs to be done on this task."
                  {...taskForm.register("description")}
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Assign to</span>
                  <select {...taskForm.register("assignedTo")}>
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.user?._id} value={member.user?._id}>
                        {member.user?.fullName || member.user?.username}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Status</span>
                  <select {...taskForm.register("status")}>
                    {taskStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {updateTaskError?.data?.message ? (
                <p className="form-error">{updateTaskError.data.message}</p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeEditTaskModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isSavingTask}
                >
                  {isSavingTask ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isAdmin && isAddSubtaskModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeAddSubtaskModal}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subtask-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="add-subtask-modal-title">Create a subtask</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeAddSubtaskModal}
                aria-label="Close add subtask popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={subtaskForm.handleSubmit(onCreateSubtask)}
            >
              <label className="field">
                <span>Subtask title</span>
                <input
                  type="text"
                  placeholder="Write test cases"
                  {...subtaskForm.register("title", {
                    required: "Subtask title is required",
                  })}
                />
                {subtaskForm.formState.errors.title ? (
                  <small>{subtaskForm.formState.errors.title.message}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows={3}
                  placeholder="Add the smaller piece of work that belongs under this task."
                  {...subtaskForm.register("description")}
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Assign to</span>
                  <select {...subtaskForm.register("assignedTo")}>
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.user?._id} value={member.user?._id}>
                        {member.user?.fullName || member.user?.username}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Status</span>
                  <select {...subtaskForm.register("status")}>
                    {taskStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {createSubtaskError?.data?.message ? (
                <p className="form-error">{createSubtaskError.data.message}</p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeAddSubtaskModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isCreatingSubtask}
                >
                  {isCreatingSubtask ? "Adding..." : "Add subtask"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isAdmin && isEditSubtaskModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeEditSubtaskModal}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-subtask-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="edit-subtask-modal-title">Update subtask details</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeEditSubtaskModal}
                aria-label="Close edit subtask popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={editSubtaskForm.handleSubmit(onSaveSubtask)}
            >
              <label className="field">
                <span>Subtask title</span>
                <input
                  type="text"
                  placeholder="Write test cases"
                  {...editSubtaskForm.register("title", {
                    required: "Subtask title is required",
                  })}
                />
                {editSubtaskForm.formState.errors.title ? (
                  <small>
                    {editSubtaskForm.formState.errors.title.message}
                  </small>
                ) : null}
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows={3}
                  placeholder="Add the smaller piece of work that belongs under this task."
                  {...editSubtaskForm.register("description")}
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Assign to</span>
                  <select {...editSubtaskForm.register("assignedTo")}>
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.user?._id} value={member.user?._id}>
                        {member.user?.fullName || member.user?.username}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Status</span>
                  <select {...editSubtaskForm.register("status")}>
                    {taskStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {updateSubtaskError?.data?.message ? (
                <p className="form-error">{updateSubtaskError.data.message}</p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeEditSubtaskModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isUpdatingSubtask}
                >
                  {isUpdatingSubtask ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isAdmin && isDeleteSubtaskModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setIsDeleteSubtaskModalOpen(false)}
        >
          <section
            className="modal-card modal-card-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subtask-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="delete-subtask-modal-title">Delete this subtask?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsDeleteSubtaskModalOpen(false)}
                aria-label="Close delete subtask popup"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="muted-text">
              This will permanently remove{" "}
              <strong>{activeSubtask?.title}</strong>.
            </p>

            {deleteSubtaskError?.data?.message ? (
              <p className="form-error">{deleteSubtaskError.data.message}</p>
            ) : null}

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsDeleteSubtaskModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleDeleteSubtask}
                disabled={isDeletingSubtask}
              >
                {isDeletingSubtask ? "Deleting..." : "Delete subtask"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAdmin && isDeleteTaskModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setIsDeleteTaskModalOpen(false)}
        >
          <section
            className="modal-card modal-card-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="delete-task-modal-title">Remove this task?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsDeleteTaskModalOpen(false)}
                aria-label="Close delete task popup"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="muted-text">
              This will delete the task and all subtasks attached to it.
            </p>

            {deleteTaskError?.data?.message ? (
              <p className="form-error">{deleteTaskError.data.message}</p>
            ) : null}

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsDeleteTaskModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleDeleteTask}
                disabled={isDeletingTask}
              >
                {isDeletingTask ? "Deleting..." : "Delete task"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
