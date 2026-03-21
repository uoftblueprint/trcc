"use client";

import { useState } from "react";
import styles from "./page.module.css";
import EditIcon from "../../../components/icons/editIcon";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

type AccountForm = {
  name: string;
  email: string;
  password: string;
};

export default function Page(): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: "Jane Doe",
    email: "administratoremail@trcc.admin",
    password: "password",
  });

  const [savedData, setSavedData] = useState({
    name: "Jane Doe",
    email: "administratoremail@trcc.admin",
    password: "password",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  return (
    <div className={styles["container"]}>
      <div className={styles["wrapper"]}>
        <div className={styles["titleRow"]}>
          <h1 className={styles["title"]}>Account information</h1>
          {!isEditing && (
            <button
              className={styles["editButton"]}
              onClick={() => {
                setFormData(savedData);
                setIsEditing(true);
              }}
            >
              <EditIcon />
              Edit
            </button>
          )}
        </div>

        {isEditing && (
          <div className={styles["cancelSave"]}>
            <button
              className={styles["cancelButton"]}
              onClick={() => {
                setErrors({});
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              className={styles["saveButton"]}
              onClick={() => {
                const validationErrors = validateForm(formData);
                if (Object.keys(validationErrors).length > 0) {
                  setErrors(validationErrors);
                  return;
                }
                setErrors({});
                setSavedData(formData);
                setIsEditing(false);
              }}
            >
              Save
            </button>
          </div>
        )}

        <div className={styles["card"]}>
          {isEditing ? (
            <EditView
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />
          ) : (
            <ReadOnlyView savedData={savedData} />
          )}
        </div>
      </div>
    </div>
  );
}

function validateForm(formData: AccountForm): FormErrors {
  const errors: FormErrors = {};
  if (formData.name == "") {
    errors.name = "Name is required";
  }
  if (formData.email == "") {
    errors.email = "Email is required";
  } else if (!formData.email.includes("@") || !formData.email.includes(".")) {
    errors.email = "Invalid email format";
  }
  if (formData.password == "") {
    errors.password = "Password is required";
  } else if (formData.password.length < 12) {
    errors.password = "Password must have at least 12 characters";
  }
  return errors;
}

function ReadOnlyView({
  savedData,
}: {
  savedData: {
    name: string;
    email: string;
    password: string;
  };
}): React.JSX.Element {
  return (
    <>
      <div className={styles["field"]}>
        <div className={styles["label"]}>Name</div>
        <div className={styles["value"]}>{savedData.name}</div>
      </div>

      <div className={styles["field"]}>
        <div className={styles["label"]}>Email</div>
        <a className={styles["link"]} href={`mailto:${savedData.email}`}>
          {savedData.email}
        </a>
      </div>

      <div className={styles["field"]}>
        <div className={styles["label"]}>Password</div>
        <div className={styles["value"]}>{savedData.password}</div>
      </div>
    </>
  );
}

function EditView({
  formData,
  setFormData,
  errors,
}: {
  formData: {
    name: string;
    email: string;
    password: string;
  };
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
            className={styles["valueInput"]}
            value={formData.password}
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
