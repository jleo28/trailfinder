import { NotFoundState } from "@/components/ui/NotFoundState";

export default function TrailNotFound() {
  return (
    <NotFoundState
      heading="Trail not found."
      body="This trail doesn't exist or may have been removed."
      href="/trails"
      linkLabel="Browse trails"
    />
  );
}
