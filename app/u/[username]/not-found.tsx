import { NotFoundState } from "@/components/ui/NotFoundState";

export default function ProfileNotFound() {
  return (
    <NotFoundState
      heading="Profile not found."
      body="This user doesn't exist or may have deleted their account."
      href="/trails"
      linkLabel="Browse trails"
    />
  );
}
