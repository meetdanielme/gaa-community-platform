import type { Metadata } from "next";
import { AdminPage } from "../../ui";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <AdminPage title="New event" back={{ href: "/admin/events", label: "Events" }}>
      <EventForm />
    </AdminPage>
  );
}
