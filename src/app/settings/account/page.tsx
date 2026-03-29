"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./page.module.css";
import EditIcon from "../../../components/icons/editIcon";
import { useUser } from "@/lib/client/userContext";
import { getCurrentUser } from "@/lib/api/getCurrentUser";
import { updateAccountSettingsAction } from "@/lib/api/actions";

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
      <div className={styles["container"]}>
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
      toast.error(msg);
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
    <div className={styles["container"]}>
      <div className={styles["wrapper"]}>
        <div className={styles["titleRow"]}>
          <h1 className={styles["title"]}>Account Info</h1>
          {!isEditing && (
            <button
              type="button"
              className={styles["editButton"]}
              onClick={() => {
                setFormData({ ...savedProfile, password: "" });
                setErrors({});
                setIsEditing(true);
              }}
            >
              <EditIcon />
              Edit
            </button>
          )}
        </div>

        <div className={styles["card"]}>
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
          <div className={styles["cancelSave"]}>
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
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
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
