import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useAddProjectMemberMutation,
  useDeleteProjectMutation,
  useGetProjectByIdQuery,
  useGetProjectMembersQuery,
  useUpdateProjectMutation,
} from "../services/projectApi";
import {
  useCreateSubtaskMutation,
  useCreateTaskMutation,
  useDeleteSubtaskMutation,
  useDeleteTaskMutation,
  useGetTaskByIdQuery,
  useGetTasksQuery,
  useUpdateSubtaskDetailsMutation,
  useUpdateSubtaskStatusMutation,
  useUpdateTaskDetailsMutation,
  useUpdateTaskStatusMutation,
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

const projectStatusOptions = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

const taskFilterOptions = [
  { value: "all", label: "All Status" },
  ...taskStatusOptions,
];

const formatStatusLabel = (status) =>
  taskStatusOptions.find((option) => option.value === status)?.label || "To do";

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

const taskStatusSummaryClassMap = {
  todo: "project-task-summary-pill project-task-summary-pill-todo",
  in_progress: "project-task-summary-pill project-task-summary-pill-in-progress",
  on_hold: "project-task-summary-pill project-task-summary-pill-on-hold",
  testing: "project-task-summary-pill project-task-summary-pill-testing",
  done: "project-task-summary-pill project-task-summary-pill-done",
};

export function ProjectDetailPage() {
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] =
    useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [taskSearchValue, setTaskSearchValue] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskModalMode, setTaskModalMode] = useState("create");
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [deletedExistingSubtasks, setDeletedExistingSubtasks] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const { data: projectData, isLoading: projectLoading } =
    useGetProjectByIdQuery(projectId);
  const { data: membersData, isLoading: membersLoading } =
    useGetProjectMembersQuery(projectId);
  const { data: tasksData, isLoading: tasksLoading } =
    useGetTasksQuery(projectId);
  const { data: activeTaskDetailsData } = useGetTaskByIdQuery(
    { projectId, taskId: activeTask?._id },
    {
      skip:
        !activeTask?._id || !isCreateTaskModalOpen || taskModalMode !== "edit",
    },
  );
  const [createTask, { isLoading: isCreatingTask, error: createTaskError }] =
    useCreateTaskMutation();
  const [
    updateProject,
    { isLoading: isUpdatingProject, error: updateProjectError },
  ] = useUpdateProjectMutation();
  const [
    addProjectMember,
    { isLoading: isAddingMember, error: addMemberError },
  ] = useAddProjectMemberMutation();
  const [
    deleteProject,
    { isLoading: isDeletingProject, error: deleteProjectError },
  ] = useDeleteProjectMutation();
  const [
    updateTaskDetails,
    { isLoading: isUpdatingTask, error: updateTaskError },
  ] = useUpdateTaskDetailsMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [updateSubtaskDetails] = useUpdateSubtaskDetailsMutation();
  const [updateSubtaskStatus] = useUpdateSubtaskStatusMutation();
  const [deleteTask, { isLoading: isDeletingTask, error: deleteTaskError }] =
    useDeleteTaskMutation();
  const [deleteSubtask] = useDeleteSubtaskMutation();
  const [createSubtask] = useCreateSubtaskMutation();
  const [pendingTaskStatusId, setPendingTaskStatusId] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
      existingSubtasks: [],
      subtasks: [],
    },
  });
  const {
    register: registerMember,
    handleSubmit: handleSubmitMember,
    reset: resetMemberForm,
    formState: { errors: memberFormErrors },
  } = useForm({
    defaultValues: {
      email: "",
      role: "member",
    },
  });
  const {
    register: registerProject,
    handleSubmit: handleSubmitProject,
    reset: resetProjectForm,
    formState: { errors: projectFormErrors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
      coverImage: null,
    },
  });
  const { fields: existingSubtaskFields, remove: removeExistingSubtask } =
    useFieldArray({
      control,
      name: "existingSubtasks",
    });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "subtasks",
  });

  const project = projectData?.data;
  const members = membersData?.data ?? [];
  const tasks = tasksData?.data ?? [];
  const activeTaskDetails = activeTaskDetailsData?.data;
  const existingSubtasks = activeTaskDetails?.subtasks ?? [];
  const currentMembership = useMemo(
    () => members.find((member) => member.user?._id === currentUser?._id),
    [members, currentUser?._id],
  );
  const isAdmin = currentMembership?.role === "admin";
  const taskStatusCounts = useMemo(() => {
    return taskStatusOptions.map((statusOption) => ({
      ...statusOption,
      count: tasks.filter((task) => (task.status || "todo") === statusOption.value).length,
    }));
  }, [tasks]);
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title
        ?.toLowerCase()
        .includes(taskSearchValue.trim().toLowerCase());
      const matchesStatus =
        taskStatusFilter === "all" ? true : task.status === taskStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [taskSearchValue, taskStatusFilter, tasks]);

  useEffect(() => {
    if (taskModalMode !== "edit" || !activeTask || !activeTaskDetails) {
      return;
    }

    reset({
      title: activeTask.title || "",
      description: activeTask.description || "",
      assignedTo: activeTask.assignedTo?._id || "",
      status: activeTask.status || "todo",
      existingSubtasks: existingSubtasks.map((subtask) => ({
        subTaskId: subtask._id,
        title: subtask.title || "",
        description: subtask.description || "",
        assignedTo: subtask.assignedTo?._id || "",
        status: subtask.status || "todo",
      })),
      subtasks: [],
    });
  }, [activeTask, activeTaskDetails, existingSubtasks, reset, taskModalMode]);

  const closeTaskModal = () => {
    setIsCreateTaskModalOpen(false);
    setTaskModalMode("create");
    setActiveTask(null);
    setDeletedExistingSubtasks([]);
    reset({
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
      existingSubtasks: [],
      subtasks: [],
    });
  };

  const openCreateTaskModal = () => {
    setSuccessMessage("");
    setTaskModalMode("create");
    setActiveTask(null);
    setDeletedExistingSubtasks([]);
    reset({
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
      existingSubtasks: [],
      subtasks: [],
    });
    setIsCreateTaskModalOpen(true);
  };

  const openEditProjectModal = () => {
    setSuccessMessage("");
    resetProjectForm({
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "planning",
      coverImage: null,
    });
    setIsEditProjectModalOpen(true);
  };

  const closeEditProjectModal = () => {
    setIsEditProjectModalOpen(false);
    resetProjectForm({
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "planning",
      coverImage: null,
    });
  };

  const closeAddMemberModal = () => {
    setIsAddMemberModalOpen(false);
    resetMemberForm({
      email: "",
      role: "member",
    });
  };

  const openEditTaskModal = (task) => {
    setSuccessMessage("");
    setTaskModalMode("edit");
    setActiveTask(task);
    setDeletedExistingSubtasks([]);
    reset({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo?._id || "",
      status: task.status || "todo",
      existingSubtasks: [],
      subtasks: [],
    });
    setIsCreateTaskModalOpen(true);
  };

  const onSubmitTaskModal = async (values) => {
    setSuccessMessage("");
    const validSubtasks = (values.subtasks || []).filter((subtask) =>
      subtask?.title?.trim(),
    );

    if (taskModalMode === "edit" && activeTask) {
      const normalizedValues = {
        title: values.title?.trim() || "",
        description: values.description?.trim() || "",
        assignedTo: values.assignedTo || "",
        status: values.status || "todo",
      };
      const normalizedCurrentTask = {
        title: activeTask.title?.trim() || "",
        description: activeTask.description?.trim() || "",
        assignedTo: activeTask.assignedTo?._id || "",
        status: activeTask.status || "todo",
      };

      const hasDetailsChanged =
        normalizedValues.title !== normalizedCurrentTask.title ||
        normalizedValues.description !== normalizedCurrentTask.description ||
        normalizedValues.assignedTo !== normalizedCurrentTask.assignedTo;
      const hasStatusChanged =
        normalizedValues.status !== normalizedCurrentTask.status;

      const changedExistingSubtasks = (values.existingSubtasks || []).filter(
        (subtask) => {
          const originalSubtask = existingSubtasks.find(
            (item) => item._id === subtask.subTaskId,
          );

          if (!originalSubtask) {
            return false;
          }

          return (
            (subtask.title?.trim() || "") !==
              (originalSubtask.title?.trim() || "") ||
            (subtask.description?.trim() || "") !==
              (originalSubtask.description?.trim() || "") ||
            (subtask.assignedTo || "") !==
              (originalSubtask.assignedTo?._id || "") ||
            (subtask.status || "todo") !== (originalSubtask.status || "todo")
          );
        },
      );

      if (
        !hasDetailsChanged &&
        !hasStatusChanged &&
        !validSubtasks.length &&
        !changedExistingSubtasks.length &&
        !deletedExistingSubtasks.length
      ) {
        setSuccessMessage("No task changes to save.");
        return;
      }

      let updatedTaskTitle = activeTask.title;

      if (hasDetailsChanged) {
        const response = await updateTaskDetails({
          projectId,
          taskId: activeTask._id,
          title: normalizedValues.title,
          description: normalizedValues.description,
          assignedTo: normalizedValues.assignedTo,
        }).unwrap();
        updatedTaskTitle = response?.data?.title || updatedTaskTitle;
      }

      if (hasStatusChanged) {
        await updateTaskStatus({
          projectId,
          taskId: activeTask._id,
          status: normalizedValues.status,
        }).unwrap();
      }

      if (validSubtasks.length) {
        await Promise.all(
          validSubtasks.map((subtask) => {
            const subtaskFormData = new FormData();
            subtaskFormData.append("title", subtask.title.trim());

            if (subtask.description?.trim()) {
              subtaskFormData.append("description", subtask.description.trim());
            }

            if (subtask.assignedTo) {
              subtaskFormData.append("assignedTo", subtask.assignedTo);
            }

            if (subtask.status) {
              subtaskFormData.append("status", subtask.status);
            }

            return createSubtask({
              projectId,
              taskId: activeTask._id,
              formData: subtaskFormData,
            }).unwrap();
          }),
        );
      }

      if (changedExistingSubtasks.length) {
        await Promise.all(
          changedExistingSubtasks.map(async (subtask) => {
            const originalSubtask = existingSubtasks.find(
              (item) => item._id === subtask.subTaskId,
            );

            const detailsChanged =
              (subtask.title?.trim() || "") !==
                (originalSubtask?.title?.trim() || "") ||
              (subtask.description?.trim() || "") !==
                (originalSubtask?.description?.trim() || "") ||
              (subtask.assignedTo || "") !==
                (originalSubtask?.assignedTo?._id || "");

            if (detailsChanged) {
              await updateSubtaskDetails({
                projectId,
                subTaskId: subtask.subTaskId,
                title: subtask.title?.trim() || "",
                description: subtask.description?.trim() || "",
                assignedTo: subtask.assignedTo || "",
              }).unwrap();
            }

            if (
              (subtask.status || "todo") !== (originalSubtask?.status || "todo")
            ) {
              await updateSubtaskStatus({
                projectId,
                subTaskId: subtask.subTaskId,
                status: subtask.status || "todo",
              }).unwrap();
            }
          }),
        );
      }

      if (deletedExistingSubtasks.length) {
        await Promise.all(
          deletedExistingSubtasks.map((subtask) =>
            deleteSubtask({
              projectId,
              subTaskId: subtask._id,
            }).unwrap(),
          ),
        );
      }

      closeTaskModal();
      setSuccessMessage(
        validSubtasks.length ||
          changedExistingSubtasks.length ||
          deletedExistingSubtasks.length
          ? hasDetailsChanged || hasStatusChanged
            ? `${updatedTaskTitle} has been updated and subtask changes were saved.`
            : `Subtask changes were saved for ${updatedTaskTitle}.`
          : `${updatedTaskTitle} has been updated.`,
      );
      return;
    }

    const formData = new FormData();
    formData.append("title", values.title);

    if (values.description) {
      formData.append("description", values.description);
    }

    if (values.assignedTo) {
      formData.append("assignedTo", values.assignedTo);
    }

    if (values.status) {
      formData.append("status", values.status);
    }

    const response = await createTask({ projectId, formData }).unwrap();
    const createdTask = response?.data;

    if (createdTask?._id && validSubtasks.length) {
      await Promise.all(
        validSubtasks.map((subtask) => {
          const subtaskFormData = new FormData();
          subtaskFormData.append("title", subtask.title.trim());

          if (subtask.description?.trim()) {
            subtaskFormData.append("description", subtask.description.trim());
          }

          if (subtask.assignedTo) {
            subtaskFormData.append("assignedTo", subtask.assignedTo);
          }

          if (subtask.status) {
            subtaskFormData.append("status", subtask.status);
          }

          return createSubtask({
            projectId,
            taskId: createdTask._id,
            formData: subtaskFormData,
          }).unwrap();
        }),
      );
    }

    reset({
      title: "",
      description: "",
      assignedTo: "",
      status: "todo",
      existingSubtasks: [],
      subtasks: [],
    });
    closeTaskModal();
    setSuccessMessage(
      createdTask?.title
        ? `${createdTask.title} has been added to this project.`
        : "Task created successfully.",
    );
  };

  const handleTaskStatusChange = async (taskId, status) => {
    setSuccessMessage("");
    setPendingTaskStatusId(taskId);

    try {
      await updateTaskStatus({
        projectId,
        taskId,
        status,
      }).unwrap();
    } finally {
      setPendingTaskStatusId(null);
    }
  };

  const stageExistingSubtaskDeletion = (index) => {
    const subtask = existingSubtasks[index];

    if (!subtask) {
      return;
    }

    setDeletedExistingSubtasks((current) => [...current, subtask]);
    removeExistingSubtask(index);
  };

  const onSubmitProjectModal = async (values) => {
    const normalizedValues = {
      name: values.name?.trim() || "",
      description: values.description?.trim() || "",
      status: values.status || "planning",
    };
    const normalizedCurrentProject = {
      name: project?.name?.trim() || "",
      description: project?.description?.trim() || "",
      status: project?.status || "planning",
    };

    if (
      normalizedValues.name === normalizedCurrentProject.name &&
      normalizedValues.description === normalizedCurrentProject.description &&
      normalizedValues.status === normalizedCurrentProject.status &&
      !values.coverImage?.[0]
    ) {
      setSuccessMessage("No project changes to save.");
      return;
    }

    const formData = new FormData();
    formData.append("name", normalizedValues.name);
    formData.append("description", normalizedValues.description);
    formData.append("status", normalizedValues.status);

    if (values.coverImage?.[0]) {
      formData.append("coverImage", values.coverImage[0]);
    }

    const response = await updateProject({
      projectId,
      body: formData,
    }).unwrap();

    closeEditProjectModal();
    setSuccessMessage(
      response?.data?.name
        ? `${response.data.name} has been updated.`
        : "Project updated successfully.",
    );
  };

  const handleDeleteProject = async () => {
    const deletedProjectName = project?.name;
    await deleteProject(projectId).unwrap();

    navigate("/projects", {
      state: {
        successMessage: deletedProjectName
          ? `${deletedProjectName} has been deleted.`
          : "Project deleted successfully.",
      },
    });
  };

  const handleAddMember = async (values) => {
    const response = await addProjectMember({
      projectId,
      email: values.email.trim(),
      role: values.role,
    }).unwrap();

    closeAddMemberModal();
    setSuccessMessage(
      response?.data?.role
        ? `${values.email.trim()} has been added to this project.`
        : "Member added successfully.",
    );
  };

  if (projectLoading) {
    return <p className="panel">Loading project...</p>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-actions">
          <div className="project-hero-text">
            <h1>{project?.name}</h1>
            <p>{project?.description || "No description added yet."}</p>
          </div>
          {isAdmin ? (
            <div className="task-detail-actions">
              <button
                className="action-icon-button action-icon-button-edit"
                type="button"
                onClick={openEditProjectModal}
                aria-label="Edit project"
                title="Edit project"
              >
                <EditIcon />
              </button>
              <button
                className="action-icon-button action-icon-button-delete"
                type="button"
                onClick={() => setIsDeleteProjectModalOpen(true)}
                aria-label="Delete project"
                title="Delete project"
              >
                <DeleteIcon />
              </button>
            </div>
          ) : null}
        </div>
        <div className="project-hero-insights">
          <div className="project-hero-insights-block project-hero-tasks-block">
            <div className="project-hero-insights-head">
              <span>Tasks overview</span>
              <strong>{tasksLoading ? "..." : `${tasks.length} total tasks`}</strong>
            </div>
            <div className="project-task-summary-grid">
              {taskStatusCounts.map((statusItem) => (
                <div
                  key={statusItem.value}
                  className={
                    taskStatusSummaryClassMap[statusItem.value] ||
                    "project-task-summary-pill project-task-summary-pill-todo"
                  }
                >
                  <span>{statusItem.label}</span>
                  <strong>{tasksLoading ? "..." : statusItem.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="project-hero-insights-divider" aria-hidden="true" />

          <div className="project-hero-insights-block project-hero-members-block">
            <div className="members-summary-card">
              <div className="members-summary-copy">
                <span>Members</span>
                <strong>
                  {membersLoading ? "..." : `${members.length} members`}
                </strong>
              </div>

              <div className="members-summary-actions">
                {isAdmin ? (
                  <button
                    className="secondary-button project-member-add-button"
                    type="button"
                    onClick={() => {
                      setSuccessMessage("");
                      setIsAddMemberModalOpen(true);
                    }}
                    title="Add member"
                  >
                    Add member
                  </button>
                ) : null}

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsMembersDrawerOpen(true)}
                >
                  View all members
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2 className="subHeading">Tasks</h2>
          {isAdmin ? (
            <button
              className="primary-button projects-add-button"
              type="button"
              onClick={openCreateTaskModal}
              title="Add task"
            >
              Add task
            </button>
          ) : null}
        </div>
        <div className="project-task-toolbar">
            <label className="projects-search project-task-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search tasks..."
                value={taskSearchValue}
                onChange={(event) => setTaskSearchValue(event.target.value)}
              />
            </label>

            <label className="projects-status-filter project-task-filter">
              <span className="projects-filter-icon">
                <FilterIcon />
              </span>
              <select
                value={taskStatusFilter}
                onChange={(event) => setTaskStatusFilter(event.target.value)}
              >
                {taskFilterOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
        </div>
        <div className="list-stack">
          {filteredTasks.map((task) => (
            <div className="list-row task-list-row" key={task._id}>
              <Link
                className="task-row-link"
                to={`/projects/${projectId}/tasks/${task._id}`}
              >
                <div>
                  <strong>{task.title}</strong>
                  <p className="task-meta">
                    Assigned to{" "}
                    {task.assignedTo?.fullName ||
                      task.assignedTo?.username ||
                      "nobody yet"}
                  </p>
                  <p className="task-meta">
                    {task.subtaskCount
                      ? `${task.subtaskCount} subtasks`
                      : "No subtasks"}
                  </p>
                </div>
              </Link>
              <div className="task-row-actions">
                <label className={getTaskStatusPillClass(task.status)}>
                  <span className="sr-only">Update task status</span>
                  <select
                    value={task.status || "todo"}
                    onChange={(event) =>
                      handleTaskStatusChange(task._id, event.target.value)
                    }
                    disabled={pendingTaskStatusId === task._id}
                  >
                    {taskStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <span className="status-pill-label">
                    {pendingTaskStatusId === task._id
                      ? "Saving..."
                      : formatStatusLabel(task.status)}
                  </span>
                </label>
              </div>
            </div>
          ))}
          {!tasksLoading && !filteredTasks.length ? (
            <p>
              {taskSearchValue || taskStatusFilter !== "all"
                ? "No tasks match your current search or filter."
                : "No tasks found."}
            </p>
          ) : null}
        </div>
      </section>

      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      {isAdmin && isCreateTaskModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeTaskModal}
        >
          <section
            className="modal-card modal-card-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="task-modal-title">
                  {taskModalMode === "edit"
                    ? "Update task details"
                    : "Add task and subtasks"}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeTaskModal}
                aria-label="Close create task popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={handleSubmit(onSubmitTaskModal)}
            >
              <label className="field">
                <span>Task title</span>
                <input
                  type="text"
                  placeholder="Create onboarding checklist"
                  {...register("title", {
                    required: "Task title is required",
                  })}
                />
                {errors.title ? <small>{errors.title.message}</small> : null}
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows={4}
                  placeholder="Add the details members need in order to complete this task."
                  {...register("description")}
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Assign to</span>
                  <select {...register("assignedTo")}>
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
                  <select {...register("status")}>
                    {taskStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {taskModalMode === "edit" && existingSubtasks.length ? (
                <div className="subtask-builder">
                <div className="section-heading">
                  <div>
                      <h3>Current subtasks for this task</h3>
                  </div>
                </div>

                  <div className="existing-subtask-list">
                    {existingSubtaskFields.map((field, index) => (
                      <div className="existing-subtask-card" key={field.id}>
                        <div className="subtask-draft-header">
                          <strong>Existing subtask {index + 1}</strong>
                          <button
                            className="action-icon-button action-icon-button-delete action-icon-button-compact"
                            type="button"
                            onClick={() => stageExistingSubtaskDeletion(index)}
                            aria-label={`Delete existing subtask ${index + 1}`}
                            title="Delete subtask"
                          >
                            <DeleteIcon />
                          </button>
                        </div>

                        <label className="field">
                          <span>Title</span>
                          <input
                            type="text"
                            placeholder="Subtask title"
                            {...register(`existingSubtasks.${index}.title`)}
                          />
                        </label>

                        <label className="field">
                          <span>Description</span>
                          <textarea
                            rows={3}
                            placeholder="Subtask description"
                            {...register(
                              `existingSubtasks.${index}.description`,
                            )}
                          />
                        </label>

                        <div className="form-grid">
                          <label className="field">
                            <span>Assign to</span>
                            <select
                              {...register(
                                `existingSubtasks.${index}.assignedTo`,
                              )}
                            >
                              <option value="">Unassigned</option>
                              {members.map((member) => (
                                <option
                                  key={member.user?._id}
                                  value={member.user?._id}
                                >
                                  {member.user?.fullName ||
                                    member.user?.username}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="field">
                            <span>Status</span>
                            <select
                              {...register(`existingSubtasks.${index}.status`)}
                            >
                              {taskStatusOptions.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="subtask-builder">
                <div className="section-heading">
                  <div>
                    <h3>
                      {taskModalMode === "edit"
                        ? "Add more work items to this task"
                        : "Add smaller work items"}
                    </h3>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      append({
                        title: "",
                        description: "",
                        assignedTo: "",
                        status: "todo",
                      })
                    }
                  >
                    Add subtask row
                  </button>
                </div>

                {fields.length ? (
                  <div className="subtask-list-builder">
                    {fields.map((field, index) => (
                      <div className="subtask-draft-card" key={field.id}>
                        <div className="subtask-draft-header">
                          <strong>Subtask {index + 1}</strong>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => remove(index)}
                          >
                            Remove
                          </button>
                        </div>

                        <label className="field">
                          <span>Title</span>
                          <input
                            type="text"
                            placeholder="Write test cases"
                            {...register(`subtasks.${index}.title`)}
                          />
                        </label>

                        <label className="field">
                          <span>Description</span>
                          <textarea
                            rows={3}
                            placeholder="Optional details for this subtask."
                            {...register(`subtasks.${index}.description`)}
                          />
                        </label>

                        <div className="form-grid">
                          <label className="field">
                            <span>Assign to</span>
                            <select
                              {...register(`subtasks.${index}.assignedTo`)}
                            >
                              <option value="">Unassigned</option>
                              {members.map((member) => (
                                <option
                                  key={member.user?._id}
                                  value={member.user?._id}
                                >
                                  {member.user?.fullName ||
                                    member.user?.username}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="field">
                            <span>Status</span>
                            <select {...register(`subtasks.${index}.status`)}>
                              {taskStatusOptions.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">
                    {taskModalMode === "edit"
                      ? "No new subtask rows added yet. Use the button above if you want to attach more subtasks while editing."
                      : "No subtasks added yet. Use the button above if you want to create the task with child items."}
                  </p>
                )}
              </div>

              {(taskModalMode === "create" ? createTaskError : updateTaskError)
                ?.data?.message ? (
                <p className="form-error">
                  {
                    (taskModalMode === "create"
                      ? createTaskError
                      : updateTaskError
                    ).data.message
                  }
                </p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeTaskModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    taskModalMode === "create" ? isCreatingTask : isUpdatingTask
                  }
                >
                  {taskModalMode === "create"
                    ? isCreatingTask
                      ? "Adding task..."
                      : "Create task"
                    : isUpdatingTask
                      ? "Saving changes..."
                      : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isAdmin && isEditProjectModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeEditProjectModal}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-project-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="edit-project-title">Update project details</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeEditProjectModal}
                aria-label="Close edit project popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={handleSubmitProject(onSubmitProjectModal)}
            >
              <label className="field">
                <span>Project name</span>
                <input
                  type="text"
                  placeholder="Website redesign"
                  {...registerProject("name", {
                    required: "Project name is required",
                  })}
                />
                {projectFormErrors.name ? (
                  <small>{projectFormErrors.name.message}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows={5}
                  placeholder="Write a short summary of what this project is about."
                  {...registerProject("description")}
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select {...registerProject("status")}>
                  {projectStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Project image</span>
                <input
                  type="file"
                  accept="image/*"
                  {...registerProject("coverImage")}
                />
              </label>

              {updateProjectError?.data?.message ? (
                <p className="form-error">{updateProjectError.data.message}</p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeEditProjectModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isUpdatingProject}
                >
                  {isUpdatingProject ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isAdmin && isDeleteProjectModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setIsDeleteProjectModalOpen(false)}
        >
          <section
            className="modal-card modal-card-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="delete-project-title">Delete this project?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsDeleteProjectModalOpen(false)}
                aria-label="Close delete project popup"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="muted-text">
              This will permanently remove the project, its tasks, its subtasks,
              and all related membership links.
            </p>
            {deleteProjectError?.data?.message ? (
              <p className="form-error">{deleteProjectError.data.message}</p>
            ) : null}

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsDeleteProjectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
              >
                {isDeletingProject ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAdmin && isAddMemberModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeAddMemberModal}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="add-member-title">Invite someone to this project</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeAddMemberModal}
                aria-label="Close add member popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              className="project-form"
              onSubmit={handleSubmitMember(handleAddMember)}
            >
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="member@example.com"
                  {...registerMember("email", {
                    required: "Email is required",
                  })}
                />
                {memberFormErrors.email ? (
                  <small>{memberFormErrors.email.message}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Role</span>
                <select {...registerMember("role")}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              {addMemberError?.data?.message ? (
                <p className="form-error">{addMemberError.data.message}</p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeAddMemberModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isAddingMember}
                >
                  {isAddingMember ? "Adding..." : "Add member"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isMembersDrawerOpen ? (
        <div
          className="drawer-overlay"
          role="presentation"
          onClick={() => setIsMembersDrawerOpen(false)}
        >
          <aside
            className="side-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="members-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2 id="members-drawer-title">Project members</h2>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsMembersDrawerOpen(false)}
                aria-label="Close members panel"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="side-drawer-body ">
              {members.map((member) => (
                <div
                  className="member-row"
                  key={member._id || member.user?._id}
                >
                  <div>
                    <strong>
                      {member.user?.fullName || member.user?.username}
                    </strong>
                    <p>@{member.user?.username || "member"}</p>
                  </div>
                  <span className="pill">{member.role}</span>
                </div>
              ))}
              {!membersLoading && !members.length ? (
                <p>No members found.</p>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
