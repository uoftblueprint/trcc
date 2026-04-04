import { redirect } from "next/navigation";

const VOLUNTEERS_PATH = "/volunteers";

export default function SettingsTagsRedirectPage(): never {
  redirect(VOLUNTEERS_PATH);
}
