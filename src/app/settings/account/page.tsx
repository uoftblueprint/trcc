"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./page.module.css";
import EditIcon from "../../../components/icons/editIcon";
import { useUser } from "@/lib/client/userContext";
import { getCurrentUser } from "@/lib/api/getCurrentUser";
import { notifyIfForbidden } from "@/lib/client/forbiddenOperationToast";
import { updateAccountSettingsAction } from "@/lib/api/actions";
import { UserCircle2 } from "lucide-react";

const PASSWORD_MASK = "••••••••";

type ProfileFields = {
  name: string;
  email: string;
};

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

type AccountForm = ProfileFields & { password: string };

export default function Page(): React.JSX.Element {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [savedProfile, setSavedProfile] = useState<ProfileFields>({
    name: "",
    email: "",
  });

  const [formData, setFormData] = useState<AccountForm>({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (userLoading || !user) return;

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    getCurrentUser()
      .then((row) => {
        if (cancelled) return;
        const name = row.name?.trim() ?? "";
        const email = user.email?.trim() ?? "";
        const next: ProfileFields = { name, email };
        setSavedProfile(next);
        setFormData({ ...next, password: "" });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setProfileError(
          e instanceof Error ? e.message : "Could not load profile"
        );
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [user, userLoading]);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  if (userLoading || !user) {
    return <div></div>;
  }

  if (profileLoading) {
    return <div></div>;
  }

  if (profileError) {
    return (
      <div style={{ maxWidth: "36rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#171717",
            marginBottom: "0.75rem",
          }}
        >
          Account Info
        </h1>
        <p className={styles["errorText"]} role="alert">
          {profileError}
        </p>
      </div>
    );
  }

  const handleSave = async (): Promise<void> => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the errors in the form.");
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await updateAccountSettingsAction({
      name: formData.name,
      email: formData.email,
      ...(formData.password.trim() !== ""
        ? { password: formData.password }
        : {}),
    });
    setSaving(false);
    if (!result.ok) {
      const msg =
        result.validationErrors && result.validationErrors.length > 0
          ? result.validationErrors.map((v) => v.message).join(" ")
          : result.error;
      if (!notifyIfForbidden(msg)) {
        toast.error(msg);
      }
      return;
    }
    const next: ProfileFields = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    };
    setSavedProfile(next);
    setFormData({ ...next, password: "" });
    setIsEditing(false);
    router.refresh();
    toast.success("Account information saved.");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              backgroundColor: "var(--trcc-light-purple, #ede9fe)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <UserCircle2
              style={{
                width: 20,
                height: 20,
                color: "var(--trcc-purple, #7c3aed)",
              }}
            />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#171717",
                margin: 0,
              }}
            >
              Account Info
            </h1>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#737373",
                margin: "0.125rem 0 0",
              }}
            >
              Manage your profile details and password.
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            className={styles["editButton"]}
            onClick={() => {
              setFormData({ ...savedProfile, password: "" });
              setErrors({});
              setIsEditing(true);
            }}
            style={{ marginRight: 0 }}
          >
            <EditIcon />
            Edit
          </button>
        )}
      </div>

      <div
        style={{
          width: "100%",
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: "10px",
          padding: "1.25rem 1.25rem 0.5rem",
        }}
      >
        {isEditing ? (
          <EditView
            formData={formData}
            setFormData={setFormData}
            errors={errors}
          />
        ) : (
          <ReadOnlyView profile={savedProfile} />
        )}
      </div>

      {isEditing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
          }}
        >
          <span
            style={{
              marginRight: "auto",
              fontSize: "0.875rem",
              color: "#92400e",
              fontWeight: 500,
            }}
          >
            You have unsaved changes
          </span>
          <button
            type="button"
            className={styles["cancelButton"]}
            onClick={() => {
              setErrors({});
              setFormData({ ...savedProfile, password: "" });
              setIsEditing(false);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles["saveButton"]}
            disabled={saving}
            onClick={() => {
              void handleSave();
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function validateForm(formData: AccountForm): FormErrors {
  const errors: FormErrors = {};
  if (formData.name.trim() === "") {
    errors.name = "Name is required";
  }
  if (formData.email.trim() === "") {
    errors.email = "Email is required";
  } else if (!formData.email.includes("@") || !formData.email.includes(".")) {
    errors.email = "Invalid email format";
  }
  const pwd = formData.password.trim();
  if (pwd !== "" && pwd.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  return errors;
}

function ReadOnlyView({
  profile,
}: {
  profile: ProfileFields;
}): React.JSX.Element {
  return (
    <>
      <div className={styles["field"]}>
        <div className={styles["label"]}>Name</div>
        <div className={styles["value"]}>{profile.name || "—"}</div>
      </div>

      <div className={styles["field"]}>
        <div className={styles["label"]}>Email</div>
        <a className={styles["link"]} href={`mailto:${profile.email}`}>
          {profile.email || "—"}
        </a>
      </div>

      <div className={styles["field"]}>
        <div className={styles["label"]}>Password</div>
        <div className={styles["value"]}>{PASSWORD_MASK}</div>
      </div>
    </>
  );
}

function EditView({
  formData,
  setFormData,
  errors,
}: {
  formData: AccountForm;
  setFormData: React.Dispatch<React.SetStateAction<AccountForm>>;
  errors: FormErrors;
}): React.JSX.Element {
  return (
    <>
      <div className={styles["field"]}>
        <div className={styles["label"]}>Name</div>
        <div className={styles["inputWrapper"]}>
          <input
            className={styles["valueInput"]}
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          {errors.name && <p className={styles["errorText"]}>{errors.name}</p>}
        </div>
      </div>

      <div className={styles["field"]}>
        <div className={styles["label"]}>Email</div>
        <div className={styles["inputWrapper"]}>
          <input
            type="email"
            className={styles["valueInput"]}
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
          />
          {errors.email && (
            <p className={styles["errorText"]}>{errors.email}</p>
          )}
        </div>
      </div>

      <div className={styles["field"]}>
        <div className={styles["label"]}>Password</div>
        <div className={styles["inputWrapper"]}>
          <input
            type="password"
            className={styles["valueInput"]}
            value={formData.password}
            placeholder="Leave blank to keep current password"
            autoComplete="new-password"
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
          />
          {errors.password && (
            <p className={styles["errorText"]}>{errors.password}</p>
          )}
        </div>
      </div>
    </>
  );
}
