import { NotFoundState } from "@/components/ui/NotFoundState";

export default function HikeNotFound() {
  return (
    <NotFoundState
      heading="Hike not found."
      body="This hike log doesn't exist, is private, or has been deleted."
      href="/"
      linkLabel="Go home"
    />
  );
}
